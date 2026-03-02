'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Plus,
  Search,
  ExternalLink,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { PhonePreview } from '@/components/shared/phone-preview';
import { TemplateTypePicker } from '@/components/shared/template-type-picker';
import { ButtonEditor } from '@/components/shared/button-editor';
import { VariableEditor } from '@/components/shared/variable-editor';
import type {
  Template,
  TemplateButton,
  CreateTemplateInput,
} from '@/services/templates/template.service';

type EditorMode = 'create' | 'edit';

/** Per-type configuration for the content editor */
interface TypeConfig {
  hint: string;
  showTitle: boolean;
  showBody: boolean;
  bodyLabel: string;
  bodyPlaceholder: string;
  showMedia: boolean;
  showButtons: boolean;
  /** Restrict which button types are allowed */
  allowedButtonTypes?: Array<'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'>;
  buttonHint?: string;
  maxButtons: number;
  showFooter: boolean;
}

const TYPE_CONFIG: Record<string, TypeConfig> = {
  text: {
    hint: 'Plain text message. No buttons or media.',
    showTitle: false,
    showBody: true,
    bodyLabel: 'Body',
    bodyPlaceholder: 'Hi {{1}}, welcome to our service! We\'re glad to have you.',
    showMedia: false,
    showButtons: false,
    maxButtons: 0,
    showFooter: false,
  },
  'quick-reply': {
    hint: 'Body with up to 3 quick-reply buttons. Buttons appear below the message.',
    showTitle: false,
    showBody: true,
    bodyLabel: 'Body',
    bodyPlaceholder: 'Hi {{1}}, your appointment is on {{2}} at {{3}}. Would you like to confirm?',
    showMedia: false,
    showButtons: true,
    allowedButtonTypes: ['QUICK_REPLY'],
    buttonHint: 'Quick reply buttons only. Max 3.',
    maxButtons: 3,
    showFooter: false,
  },
  'call-to-action': {
    hint: 'Body with URL or phone number action buttons.',
    showTitle: false,
    showBody: true,
    bodyLabel: 'Body',
    bodyPlaceholder: 'Hi {{1}}, click below to view your order or call us for support.',
    showMedia: false,
    showButtons: true,
    allowedButtonTypes: ['URL', 'PHONE_NUMBER'],
    buttonHint: 'URL or phone number buttons. Max 2.',
    maxButtons: 2,
    showFooter: false,
  },
  card: {
    hint: 'Rich card with title, body, media, and action buttons.',
    showTitle: true,
    showBody: true,
    bodyLabel: 'Body',
    bodyPlaceholder: 'Here are the details of your order. Click below to proceed.',
    showMedia: true,
    showButtons: true,
    buttonHint: 'Any button type. Max 3.',
    maxButtons: 3,
    showFooter: true,
  },
  media: {
    hint: 'Image, video, or document with an optional caption.',
    showTitle: false,
    showBody: true,
    bodyLabel: 'Caption',
    bodyPlaceholder: 'Check out our latest offer! {{1}}',
    showMedia: true,
    showButtons: false,
    maxButtons: 0,
    showFooter: false,
  },
  carousel: {
    hint: 'Multiple swipeable cards. Each card can have its own media, body, and buttons.',
    showTitle: false,
    showBody: true,
    bodyLabel: 'Intro Body',
    bodyPlaceholder: 'Hi {{1}}, here are some options for you:',
    showMedia: false,
    showButtons: false,
    maxButtons: 0,
    showFooter: false,
  },
  'list-picker': {
    hint: 'Message with a button that opens a selectable list menu.',
    showTitle: false,
    showBody: true,
    bodyLabel: 'Body',
    bodyPlaceholder: 'Hi {{1}}, please select an option from the menu below.',
    showMedia: false,
    showButtons: false,
    maxButtons: 0,
    showFooter: false,
  },
  authentication: {
    hint: 'OTP / verification code template.',
    showTitle: false,
    showBody: true,
    bodyLabel: 'Body',
    bodyPlaceholder: 'Your verification code is {{1}}. It expires in 10 minutes.',
    showMedia: false,
    showButtons: false,
    maxButtons: 0,
    showFooter: false,
  },
  catalog: {
    hint: 'Product catalog message linking to your product inventory.',
    showTitle: false,
    showBody: true,
    bodyLabel: 'Body',
    bodyPlaceholder: 'Hi {{1}}, browse our latest products below!',
    showMedia: false,
    showButtons: false,
    maxButtons: 0,
    showFooter: false,
  },
};

const DEFAULT_CONFIG: TypeConfig = {
  hint: '',
  showTitle: false,
  showBody: true,
  bodyLabel: 'Body',
  bodyPlaceholder: 'Hi {{1}}, your message here...',
  showMedia: false,
  showButtons: false,
  maxButtons: 0,
  showFooter: false,
};

export default function TemplatesPage() {
  // ── List view state ──────────────────────────────────────
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Editor view state ────────────────────────────────────
  const [showEditor, setShowEditor] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('create');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [type, setType] = useState('text');
  const [body, setBody] = useState('');
  const [title, setTitle] = useState('');
  const [footer, setFooter] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('image');
  const [buttons, setButtons] = useState<TemplateButton[]>([]);
  const [variableNames, setVariableNames] = useState<Record<string, string>>(
    {}
  );

  // Derived config for current type
  const cfg = TYPE_CONFIG[type] || DEFAULT_CONFIG;

  // ── Load templates ───────────────────────────────────────
  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/templates');
      const json = await res.json();
      if (json.success) setTemplates(json.data);
    } catch {
      // handle error silently
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // ── Editor helpers ───────────────────────────────────────
  const resetEditor = () => {
    setName('');
    setType('text');
    setBody('');
    setTitle('');
    setFooter('');
    setMediaUrl('');
    setMediaType('image');
    setButtons([]);
    setVariableNames({});
    setEditingTemplate(null);
  };

  const openCreate = () => {
    resetEditor();
    setEditorMode('create');
    setShowEditor(true);
  };

  const openEdit = (template: Template) => {
    setEditorMode('edit');
    setEditingTemplate(template);
    setName(template.name);
    setType(template.type);
    setBody(template.body || '');
    setTitle(template.title || '');
    setMediaUrl(template.media_url || '');
    setMediaType(template.media_type || 'image');
    setButtons(template.buttons || []);

    // Rebuild variable names from template variables array
    const vars: Record<string, string> = {};
    if (template.variables) {
      template.variables.forEach((v, i) => {
        vars[String(i + 1)] = v;
      });
    }
    setVariableNames(vars);
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    resetEditor();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const input: CreateTemplateInput = {
      name,
      type,
      body: body || undefined,
      title: cfg.showTitle ? title || undefined : undefined,
      media_url: cfg.showMedia ? mediaUrl || undefined : undefined,
      media_type: cfg.showMedia ? mediaType : undefined,
      buttons: cfg.showButtons && buttons.length > 0 ? buttons : undefined,
      variables:
        Object.keys(variableNames).length > 0
          ? Object.values(variableNames)
          : undefined,
    };

    try {
      const res = await fetch('/api/v1/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (json.success) {
        closeEditor();
        loadTemplates();
      }
    } catch {
      // handle error silently
    } finally {
      setIsSaving(false);
    }
  };

  // ── Filtered list ────────────────────────────────────────
  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Status badge colour ──────────────────────────────────
  const statusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/10 text-green-400';
      case 'rejected':
        return 'bg-red-500/10 text-red-400';
      default:
        return 'bg-yellow-500/10 text-yellow-400';
    }
  };

  // ════════════════════════════════════════════════════════
  // EDITOR VIEW
  // ════════════════════════════════════════════════════════
  if (showEditor) {
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={closeEditor}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {editorMode === 'edit' ? 'Edit Template' : 'New Template'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {editorMode === 'edit'
                ? `Editing ${editingTemplate?.name}`
                : 'Create a new WhatsApp message template'}
            </p>
          </div>
        </div>

        {/* 2-Column Layout */}
        <form
          onSubmit={handleSave}
          className="grid gap-7 lg:grid-cols-[1fr_380px]"
        >
          {/* ─── Left: Form ─── */}
          <div className="space-y-6">
            {/* Basic Info */}
            <section className="space-y-3 rounded-xl border border-border bg-card p-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                Basic Info
              </h2>
              <div className="grid gap-2">
                <Label htmlFor="tplName">Template Name</Label>
                <Input
                  id="tplName"
                  placeholder="e.g. appointment_reminder"
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')
                    )
                  }
                  className="font-mono text-sm"
                  required
                />
                <p className="text-[10px] text-muted-foreground">
                  Lowercase, underscores only. This is the Twilio-registered
                  name.
                </p>
              </div>
            </section>

            {/* Template Type */}
            <section className="space-y-3 rounded-xl border border-border bg-card p-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                Template Type
              </h2>
              <TemplateTypePicker value={type} onChange={setType} />
            </section>

            {/* Content */}
            <section className="space-y-3 rounded-xl border border-border bg-card p-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                Content
              </h2>

              {/* Type-specific hint */}
              {cfg.hint && (
                <p className="rounded-md bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
                  {cfg.hint}
                </p>
              )}

              {/* Title (card) */}
              {cfg.showTitle && (
                <div className="grid gap-2">
                  <Label htmlFor="tplTitle">Title</Label>
                  <Input
                    id="tplTitle"
                    placeholder="e.g. Appointment Confirmed"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={60}
                  />
                  <p className="text-right text-[10px] text-muted-foreground">
                    {title.length}/60
                  </p>
                </div>
              )}

              {/* Body / Caption */}
              {cfg.showBody && (
                <div className="grid gap-2">
                  <Label htmlFor="tplBody">{cfg.bodyLabel}</Label>
                  <Textarea
                    id="tplBody"
                    placeholder={cfg.bodyPlaceholder}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={5}
                    maxLength={1024}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                      Use {'{{1}}'}, {'{{2}}'} etc. for variables. Supports
                      *bold*, _italic_, ~strike~.
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {body.length}/1024
                    </span>
                  </div>
                </div>
              )}

              {/* Footer (card) */}
              {cfg.showFooter && (
                <div className="grid gap-2">
                  <Label htmlFor="tplFooter">Footer</Label>
                  <Input
                    id="tplFooter"
                    placeholder="e.g. Reply STOP to unsubscribe"
                    value={footer}
                    onChange={(e) => setFooter(e.target.value)}
                    maxLength={60}
                  />
                  <p className="text-right text-[10px] text-muted-foreground">
                    {footer.length}/60
                  </p>
                </div>
              )}

              {/* Media (card, media) */}
              {cfg.showMedia && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="tplMediaUrl">Media URL</Label>
                    <Input
                      id="tplMediaUrl"
                      placeholder="https://..."
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tplMediaType">Media Type</Label>
                    <select
                      id="tplMediaType"
                      value={mediaType}
                      onChange={(e) => setMediaType(e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                      <option value="document">Document</option>
                    </select>
                  </div>
                </div>
              )}
            </section>

            {/* Buttons */}
            {cfg.showButtons && (
              <section className="space-y-3 rounded-xl border border-border bg-card p-5">
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                  Buttons
                </h2>
                {cfg.buttonHint && (
                  <p className="text-[10px] text-muted-foreground">
                    {cfg.buttonHint}
                  </p>
                )}
                <ButtonEditor
                  buttons={buttons}
                  onChange={setButtons}
                  maxButtons={cfg.maxButtons}
                  allowedTypes={cfg.allowedButtonTypes}
                />
              </section>
            )}

            {/* Variables */}
            <section className="space-y-3 rounded-xl border border-border bg-card p-5">
              <VariableEditor
                bodyText={body}
                titleText={cfg.showTitle ? title : undefined}
                variableNames={variableNames}
                onChange={setVariableNames}
              />
            </section>

            {/* Actions */}
            <div className="flex items-center gap-3 pb-8">
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editorMode === 'edit'
                  ? 'Save Changes'
                  : 'Create & Deploy'}
              </Button>
              <Button type="button" variant="outline" onClick={closeEditor}>
                Cancel
              </Button>
            </div>
          </div>

          {/* ─── Right: Phone Preview ─── */}
          <div className="hidden lg:block">
            <div className="sticky top-6">
              <PhonePreview
                body={body}
                title={cfg.showTitle ? title : undefined}
                mediaUrl={cfg.showMedia ? mediaUrl : undefined}
                footer={cfg.showFooter ? footer : undefined}
                buttons={
                  cfg.showButtons && buttons.length > 0
                    ? buttons
                    : undefined
                }
                templateType={type}
                variableNames={variableNames}
              />
            </div>
          </div>
        </form>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage WhatsApp message templates.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Loading templates...
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
          <FileText className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? 'No templates match your search.'
              : 'No templates yet. Create your first one.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => (
            <button
              key={template.name}
              type="button"
              onClick={() => openEdit(template)}
              className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-mono text-sm font-medium">
                    {template.name}
                  </h3>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {template.type}
                    </Badge>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor(
                        template.status
                      )}`}
                    >
                      {template.status}
                    </span>
                  </div>
                </div>
              </div>

              {template.body && (
                <p className="mt-2.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                  {template.body}
                </p>
              )}

              {template.buttons && template.buttons.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {template.buttons.map((btn, i) => (
                    <span
                      key={i}
                      className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                    >
                      {btn.text || `Button ${i + 1}`}
                    </span>
                  ))}
                </div>
              )}

              {template.content_sid && (
                <div className="mt-2.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <ExternalLink className="h-3 w-3" />
                  {template.content_sid}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
