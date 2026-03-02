/**
 * Flow Service
 *
 * CRUD operations for message flows stored in Supabase.
 */

import { createClient } from '@/lib/supabase/server';
import { type StepResult, success, failure } from '@/lib/shared/result';
import type { Flow, FlowStep, FlowFallback } from '@/types/database';

export interface CreateFlowInput {
  name: string;
  description?: string;
  steps: FlowStep[];
  fallback?: FlowFallback;
}

export interface UpdateFlowInput {
  name?: string;
  description?: string;
  steps?: FlowStep[];
  fallback?: FlowFallback;
}

export async function listFlows(orgId: string): Promise<StepResult<Flow[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('flows')
    .select('*')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false });

  if (error) return failure('INTERNAL_ERROR', error.message);
  return success((data ?? []) as Flow[]);
}

export async function getFlow(flowId: string): Promise<StepResult<Flow>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('flows')
    .select('*')
    .eq('id', flowId)
    .single();

  if (error) return failure('NOT_FOUND', 'Flow not found');
  return success(data as Flow);
}

export async function createFlow(
  orgId: string,
  userId: string,
  input: CreateFlowInput
): Promise<StepResult<Flow>> {
  if (!input.name) {
    return failure('VALIDATION_ERROR', 'Flow name is required');
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('flows')
    .insert({
      org_id: orgId,
      name: input.name,
      description: input.description || null,
      steps: input.steps,
      fallback: input.fallback || null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) return failure('INTERNAL_ERROR', error.message);
  return success(data as Flow);
}

export async function updateFlow(
  flowId: string,
  input: UpdateFlowInput
): Promise<StepResult<Flow>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('flows')
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.steps !== undefined && { steps: input.steps }),
      ...(input.fallback !== undefined && { fallback: input.fallback }),
    })
    .eq('id', flowId)
    .select()
    .single();

  if (error) return failure('INTERNAL_ERROR', error.message);
  return success(data as Flow);
}

export async function deleteFlow(flowId: string): Promise<StepResult<void>> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('flows')
    .delete()
    .eq('id', flowId);

  if (error) return failure('INTERNAL_ERROR', error.message);
  return success(undefined);
}
