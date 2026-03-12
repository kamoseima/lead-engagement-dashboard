/**
 * Template Service
 *
 * Manages WhatsApp message templates via the platform API.
 * Templates are stored in the platform, not in Supabase.
 *
 * The platform API key (ck_live_) auto-resolves the org, so orgId
 * is not embedded in the URL path.
 */

import { platformApi } from '@/lib/platform-api';
import { type StepResult, success, failure } from '@/lib/shared/result';

export interface Template {
  name: string;
  content_sid?: string;
  type: string;
  status: string;
  body?: string;
  title?: string;
  variables?: string[];
  buttons?: TemplateButton[];
  media_url?: string;
  media_type?: string;
  created_at?: string;
}

export interface TemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';
  text: string;
  url?: string;
  phone?: string;
}

export interface CreateTemplateInput {
  name: string;
  type: string;
  body?: string;
  title?: string;
  variables?: string[];
  buttons?: TemplateButton[];
  media_url?: string;
  media_type?: string;
  catalog_id?: string;
  carousel_cards?: Array<{
    title: string;
    body: string;
    mediaUrl: string;
    buttons: TemplateButton[];
  }>;
}

/** Shape returned by the platform API */
interface PlatformTemplate {
  id?: string;
  content_sid?: string;
  friendly_name: string;
  type: string;
  approval_status?: string;
  variables?: Record<string, string>;
  /** Content is nested under `template_definition[type]` */
  template_definition?: Record<string, {
    body?: string;
    title?: string;
    subtitle?: string;
    actions?: Array<{ type?: string; id?: string; title: string; url?: string; phone?: string }>;
    media?: string[];
  }>;
  created_at?: string;
}

/** Map platform response to dashboard Template shape */
function mapTemplate(pt: PlatformTemplate): Template {
  // Extract content from template_definition[type] nested structure
  const content = pt.template_definition?.[pt.type];

  // Strip provider prefix from type (e.g. "twilio/quick-reply" → "quick-reply")
  const displayType = pt.type.includes('/')
    ? pt.type.split('/').pop()!
    : pt.type;

  const template: Template = {
    name: pt.friendly_name,
    content_sid: pt.content_sid,
    type: displayType,
    status: pt.approval_status || 'pending',
    body: content?.body,
    title: content?.title,
    media_url: content?.media?.[0],
    created_at: pt.created_at,
  };

  if (pt.variables) {
    template.variables = Object.values(pt.variables);
  }

  if (content?.actions && content.actions.length > 0) {
    template.buttons = content.actions.map(a => ({
      type: (a.type as TemplateButton['type']) || 'QUICK_REPLY',
      text: a.title,
      url: a.url,
      phone: a.phone,
    }));
  }

  return template;
}

export async function listTemplates(_orgId: string): Promise<StepResult<Template[]>> {
  const result = await platformApi<PlatformTemplate[]>('/api/v1/templates/whatsapp?limit=100&offset=0');
  if (!result.success) return result;
  return success(result.data.map(mapTemplate));
}

export async function createTemplate(
  _orgId: string,
  input: CreateTemplateInput
): Promise<StepResult<Template>> {
  if (!input.name || !input.type) {
    return failure('VALIDATION_ERROR', 'Template name and type are required');
  }

  // Map dashboard shape to platform shape
  const platformBody: Record<string, unknown> = {
    friendly_name: input.name,
    type: input.type,
    content: {
      body: input.body,
      ...(input.title ? { title: input.title } : {}),
      ...(input.media_url ? { media: [input.media_url] } : {}),
      ...(input.catalog_id ? { catalog_id: input.catalog_id } : {}),
    },
  };

  if (input.carousel_cards && input.carousel_cards.length > 0) {
    (platformBody.content as Record<string, unknown>).cards = input.carousel_cards.map(card => ({
      title: card.title,
      body: card.body,
      media: card.mediaUrl ? [card.mediaUrl] : [],
      actions: card.buttons.map(b => ({
        type: b.type,
        title: b.text,
        ...(b.type === 'QUICK_REPLY' ? { id: b.text.toLowerCase().replace(/\s+/g, '_') } : {}),
        ...(b.url ? { url: b.url } : {}),
        ...(b.phone ? { phone: b.phone } : {}),
      })),
    }));
  }

  if (input.variables && input.variables.length > 0) {
    const vars: Record<string, string> = {};
    input.variables.forEach((v, i) => { vars[String(i + 1)] = v; });
    platformBody.variables = vars;
  }

  if (input.buttons && input.buttons.length > 0) {
    (platformBody.content as Record<string, unknown>).actions = input.buttons.map(b => ({
      type: b.type,
      title: b.text,
      ...(b.type === 'QUICK_REPLY' ? { id: b.text.toLowerCase().replace(/\s+/g, '_') } : {}),
      ...(b.type === 'COPY_CODE' ? { copy_code_text: b.text } : {}),
      ...(b.url ? { url: b.url } : {}),
      ...(b.phone ? { phone: b.phone } : {}),
    }));
  }

  const result = await platformApi<PlatformTemplate>('/api/v1/templates/whatsapp', {
    method: 'POST',
    body: platformBody,
  });
  if (!result.success) return result;
  return success(mapTemplate(result.data));
}

export async function getTemplate(
  _orgId: string,
  contentSid: string
): Promise<StepResult<Template>> {
  const result = await platformApi<PlatformTemplate>(`/api/v1/templates/whatsapp/${contentSid}`);
  if (!result.success) return result;
  return success(mapTemplate(result.data));
}
