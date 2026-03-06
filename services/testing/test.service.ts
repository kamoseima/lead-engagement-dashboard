/**
 * Test Service
 *
 * Manages test scenarios and test runs.
 */

import { createClient } from '@/lib/supabase/server';
import { platformApi } from '@/lib/platform-api';
import { type StepResult, success, failure } from '@/lib/shared/result';
import type { TestScenario, TestRun } from '@/types/database';
import { listTemplates } from '@/services/templates/template.service';

export interface CreateTestScenarioInput {
  name: string;
  description?: string;
  flow_id?: string;
  template_name?: string;
  config?: Record<string, unknown>;
}

export async function listTestScenarios(orgId: string): Promise<StepResult<TestScenario[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('test_scenarios')
    .select('*')
    .or(`is_builtin.eq.true,org_id.eq.${orgId}`)
    .order('is_builtin', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return failure('INTERNAL_ERROR', error.message);
  return success((data ?? []) as TestScenario[]);
}

export async function createTestScenario(
  orgId: string,
  userId: string,
  input: CreateTestScenarioInput
): Promise<StepResult<TestScenario>> {
  if (!input.name) {
    return failure('VALIDATION_ERROR', 'Scenario name is required');
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('test_scenarios')
    .insert({
      org_id: orgId,
      name: input.name,
      description: input.description || null,
      flow_id: input.flow_id || null,
      template_name: input.template_name || null,
      config: input.config || {},
      created_by: userId,
    })
    .select()
    .single();

  if (error) return failure('INTERNAL_ERROR', error.message);
  return success(data as TestScenario);
}

export async function listTestRuns(orgId: string): Promise<StepResult<TestRun[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('test_runs')
    .select('*')
    .eq('org_id', orgId)
    .order('started_at', { ascending: false })
    .limit(50);

  if (error) return failure('INTERNAL_ERROR', error.message);
  return success((data ?? []) as TestRun[]);
}

export async function deleteTestScenario(
  orgId: string,
  scenarioId: string
): Promise<StepResult<void>> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('test_scenarios')
    .delete()
    .eq('id', scenarioId)
    .eq('org_id', orgId);

  if (error) return failure('INTERNAL_ERROR', error.message);
  return success(undefined);
}

export async function launchTest(
  orgId: string,
  userId: string,
  input: {
    scenarioId: string;
    leadName: string;
    leadPhone: string;
    templateName: string;
    variables: Record<string, string>;
  }
): Promise<StepResult<TestRun>> {
  const supabase = await createClient();

  // Resolve content_sid from template name
  let contentSid = '';
  if (input.templateName) {
    const templatesResult = await listTemplates(orgId);
    if (templatesResult.success) {
      const match = templatesResult.data.find(t => t.name === input.templateName);
      if (match?.content_sid) {
        contentSid = match.content_sid;
      }
    }
  }

  if (!contentSid) {
    return failure('VALIDATION_ERROR', `Could not resolve content_sid for template "${input.templateName}"`);
  }

  // Resolve flow_id from the scenario (for multi-step flow tests)
  let flowState: { flowId: string; stepPath: number[]; retryCount: number } | null = null;
  const { data: scenario } = await supabase
    .from('test_scenarios')
    .select('flow_id')
    .eq('id', input.scenarioId)
    .single();

  if (scenario?.flow_id) {
    flowState = {
      flowId: scenario.flow_id,
      stepPath: [0], // Start at first step
      retryCount: 0,
    };
  }

  // Create test run record
  const { data: testRun, error: insertError } = await supabase
    .from('test_runs')
    .insert({
      scenario_id: input.scenarioId,
      org_id: orgId,
      lead_name: input.leadName,
      lead_phone: input.leadPhone,
      status: 'running',
      template_name: input.templateName,
      variables: input.variables,
      messages: [],
      created_by: userId,
      ...(flowState ? { flow_state: flowState } : {}),
    })
    .select()
    .single();

  if (insertError) return failure('INTERNAL_ERROR', insertError.message);

  // Send initial template message via platform API
  const sendResult = await platformApi<{ provider_message_id: string }>(
    '/api/v1/messages/send/whatsapp',
    {
      method: 'POST',
      body: {
        to: input.leadPhone,
        content_sid: contentSid,
        content_variables: input.variables,
        event_type: `test_${testRun.id}`,
      },
      orgId,
    }
  );

  const now = new Date().toISOString();

  if (sendResult.success) {
    await supabase
      .from('test_runs')
      .update({
        status: 'waiting_reply',
        messages: [
          {
            direction: 'outbound',
            body: `Template: ${input.templateName}`,
            template: input.templateName,
            timestamp: now,
            status: 'sent',
          },
        ],
      })
      .eq('id', testRun.id);
  } else {
    await supabase
      .from('test_runs')
      .update({
        status: 'failed',
        error: sendResult.error.message,
        messages: [
          {
            direction: 'outbound',
            body: `Template: ${input.templateName}`,
            template: input.templateName,
            timestamp: now,
            status: 'failed',
          },
        ],
      })
      .eq('id', testRun.id);
  }

  // Return updated record
  const { data: updated } = await supabase
    .from('test_runs')
    .select('*')
    .eq('id', testRun.id)
    .single();

  return success(updated as TestRun);
}
