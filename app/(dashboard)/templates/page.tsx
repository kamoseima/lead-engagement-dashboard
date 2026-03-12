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
  AlertTriangle,
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

/** WhatsApp template categories */
type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

const CATEGORIES: { value: TemplateCategory; label: string; description: string }[] = [
  { value: 'MARKETING', label: 'Marketing', description: 'Promotions, offers, announcements' },
  { value: 'UTILITY', label: 'Utility', description: 'Order updates, confirmations, alerts' },
  { value: 'AUTHENTICATION', label: 'Authentication', description: 'OTP codes, verification' },
];

/** Common WhatsApp-supported language codes */
const LANGUAGES: { code: string; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'en_US', name: 'English (US)' },
  { code: 'en_GB', name: 'English (UK)' },
  { code: 'af', name: 'Afrikaans' },
  { code: 'ar', name: 'Arabic' },
  { code: 'zh_CN', name: 'Chinese (Simplified)' },
  { code: 'zh_TW', name: 'Chinese (Traditional)' },
  { code: 'nl', name: 'Dutch' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'hi', name: 'Hindi' },
  { code: 'id', name: 'Indonesian' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ms', name: 'Malay' },
  { code: 'pt_BR', name: 'Portuguese (Brazil)' },
  { code: 'pt_PT', name: 'Portuguese (Portugal)' },
  { code: 'ru', name: 'Russian' },
  { code: 'es', name: 'Spanish' },
  { code: 'es_AR', name: 'Spanish (Argentina)' },
  { code: 'es_MX', name: 'Spanish (Mexico)' },
  { code: 'sw', name: 'Swahili' },
  { code: 'sv', name: 'Swedish' },
  { code: 'th', name: 'Thai' },
  { code: 'tr', name: 'Turkish' },
  { code: 'ur', name: 'Urdu' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'zu', name: 'Zulu' },
];

/** Shortened URL domains that Meta always rejects */
const SHORTENED_URL_DOMAINS = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd', 'buff.ly', 'rebrand.ly', 'short.io'];

type EditorMode = 'create' | 'edit';

/** Per-type configuration for the content editor */
interface TypeConfig {
  hint: string;
  showTitle: boolean;
  showBody: boolean;
  bodyLabel: string;
  bodyPlaceholder: string;
  bodyMaxLength: number;
  showMedia: boolean;
  showButtons: boolean;
  /** Restrict which button types are allowed */
  allowedButtonTypes?: Array<'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE'>;
  buttonHint?: string;
  maxButtons: number;
  showFooter: boolean;
  /** Whether this type can only be used in-session (not approved as template) */
  inSessionOnly?: boolean;
  /** Show catalog_id field */
  showCatalogId?: boolean;
  /** Show carousel card editor */
  showCarouselCards?: boolean;
  /** Authentication: body is preset by WhatsApp */
  presetBody?: boolean;
  /** Show security recommendation toggle */
  showSecurityRecommendation?: boolean;
  /** Show code expiration field */
  showCodeExpiration?: boolean;
  /** Show thumbnail_item_id field (catalog) */
  showThumbnailItemId?: boolean;
  /** Forced category (e.g. authentication always = AUTHENTICATION) */
  forcedCategory?: TemplateCategory;
}

const TYPE_CONFIG: Record<string, TypeConfig> = {
  text: {
    hint: 'Plain text message. No buttons or media.',
    showTitle: false,
    showBody: true,
    bodyLabel: 'Body',
    bodyPlaceholder: 'Hi {{1}}, welcome to our service! We\'re glad to have you.',
    bodyMaxLength: 1024,
    showMedia: false,
    showButtons: false,
    maxButtons: 0,
    showFooter: false,
  },
  'quick-reply': {
    hint: 'Body with up to 10 quick-reply buttons (3 for in-session). Buttons appear below the message.',
    showTitle: false,
    showBody: true,
    bodyLabel: 'Body',
    bodyPlaceholder: 'Hi {{1}}, your appointment is on {{2}} at {{3}}. Would you like to confirm?',
    bodyMaxLength: 1024,
    showMedia: false,
    showButtons: true,
    allowedButtonTypes: ['QUICK_REPLY'],
    buttonHint: 'Quick reply buttons only. Max 10 (approved) or 3 (in-session).',
    maxButtons: 10,
    showFooter: false,
  },
  'call-to-action': {
    hint: 'Body with URL or phone number action buttons. Max 640 characters.',
    showTitle: false,
    showBody: true,
    bodyLabel: 'Body',
    bodyPlaceholder: 'Hi {{1}}, click below to view your order or call us for support.',
    bodyMaxLength: 640,
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
    bodyMaxLength: 1024,
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
    bodyMaxLength: 1024,
    showMedia: true,
    showButtons: false,
    maxButtons: 0,
    showFooter: false,
  },
  carousel: {
    hint: 'Multiple swipeable cards. Each card: title + body max 160 chars, media required, 1–2 buttons.',
    showTitle: false,
    showBody: true,
    bodyLabel: 'Intro Body',
    bodyPlaceholder: 'Hi {{1}}, here are some options for you:',
    bodyMaxLength: 1024,
    showMedia: false,
    showButtons: false,
    maxButtons: 0,
    showFooter: false,
    showCarouselCards: true,
  },
  'list-picker': {
    hint: 'Message with a button that opens a selectable list menu. In-session only — cannot be submitted for template approval.',
    showTitle: false,
    showBody: true,
    bodyLabel: 'Body',
    bodyPlaceholder: 'Hi {{1}}, please select an option from the menu below.',
    bodyMaxLength: 1024,
    showMedia: false,
    showButtons: false,
    maxButtons: 0,
    showFooter: false,
    inSessionOnly: true,
  },
  authentication: {
    hint: 'OTP / verification code template. Body is preset by WhatsApp — you can only configure security recommendation and code expiration.',
    showTitle: false,
    showBody: false,
    bodyLabel: 'Body',
    bodyPlaceholder: '',
    bodyMaxLength: 1024,
    showMedia: false,
    showButtons: true,
    allowedButtonTypes: ['COPY_CODE'],
    buttonHint: 'Copy Code button for OTP auto-copy. Max 1.',
    maxButtons: 1,
    showFooter: false,
    presetBody: true,
    showSecurityRecommendation: true,
    showCodeExpiration: true,
    forcedCategory: 'AUTHENTICATION',
  },
  catalog: {
    hint: 'Product catalog message. Requires a Catalog ID from Meta Commerce Manager.',
    showTitle: false,
    showBody: true,
    bodyLabel: 'Body',
    bodyPlaceholder: 'Hi {{1}}, browse our latest products below!',
    bodyMaxLength: 1024,
    showMedia: false,
    showButtons: false,
    maxButtons: 0,
    showFooter: false,
    showCatalogId: true,
    showThumbnailItemId: true,
  },
};

const DEFAULT_CONFIG: TypeConfig = {
  hint: '',
  showTitle: false,
  showBody: true,
  bodyLabel: 'Body',
  bodyPlaceholder: 'Hi {{1}}, your message here...',
  bodyMaxLength: 1024,
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
  const [catalogId, setCatalogId] = useState('');
  const [thumbnailItemId, setThumbnailItemId] = useState('');
  const [carouselCards, setCarouselCards] = useState<
    Array<{ title: string; body: string; mediaUrl: string; buttons: TemplateButton[] }>
  >([]);
  const [footerError, setFooterError] = useState('');
  const [category, setCategory] = useState<TemplateCategory>('MARKETING');
  const [language, setLanguage] = useState('en');
  const [addSecurityRecommendation, setAddSecurityRecommendation] = useState(false);
  const [codeExpirationMinutes, setCodeExpirationMinutes] = useState<number | ''>('');
  const [saveErrors, setSaveErrors] = useState<string[]>([]);

  // Derived config for current type
  const cfg = TYPE_CONFIG[type] || DEFAULT_CONFIG;

  // Force category for certain template types
  const effectiveCategory = cfg.forcedCategory || category;

  // Body max length: marketing/utility approved templates have 550-char limit on CTA,
  // but base limits remain per-type. Marketing/utility categories cap at 1024,
  // CTA caps at 640 regardless of category.
  const effectiveBodyMaxLength = cfg.bodyMaxLength;

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
    setCatalogId('');
    setThumbnailItemId('');
    setCarouselCards([]);
    setFooterError('');
    setCategory('MARKETING');
    setLanguage('en');
    setAddSecurityRecommendation(false);
    setCodeExpirationMinutes('');
    setSaveErrors([]);
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

  /** Check if a URL uses a shortened domain */
  const isShortenedUrl = (url: string) => {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return SHORTENED_URL_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
    } catch {
      return false;
    }
  };

  /** Check if URL variables are only at the end */
  const hasVariableNotAtEnd = (url: string) => {
    // Variables like {{1}} should only appear at the very end of the URL
    const varPattern = /\{\{\d+\}\}/g;
    const matches = [...url.matchAll(varPattern)];
    if (matches.length === 0) return false;
    // The last variable should end at the string end
    const lastMatch = matches[matches.length - 1];
    const afterLast = url.substring(lastMatch.index! + lastMatch[0].length);
    // If there's a variable NOT at the end, or if there are multiple variables
    if (afterLast.trim().length > 0) return true;
    // Check if any variable appears in the middle (not the last one)
    if (matches.length > 1) return true;
    return false;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];

    // Validate footer has no variables
    if (footer && /\{\{\d+\}\}/.test(footer)) {
      setFooterError('Variables are not supported in footers.');
      errors.push('Footer contains variables.');
    }

    // Carousel: minimum 2 cards
    if (cfg.showCarouselCards && carouselCards.length < 2 && carouselCards.length > 0) {
      errors.push('Carousel requires at least 2 cards.');
    }

    // Carousel: cross-card consistency
    if (cfg.showCarouselCards && carouselCards.length >= 2) {
      const firstCardButtonCount = carouselCards[0].buttons.length;
      const firstCardButtonTypes = carouselCards[0].buttons.map(b => b.type).join(',');
      const firstCardMediaType = carouselCards[0].mediaUrl ? 'has_media' : 'no_media';

      for (let i = 1; i < carouselCards.length; i++) {
        if (carouselCards[i].buttons.length !== firstCardButtonCount) {
          errors.push(`Card ${i + 1} must have the same number of buttons as Card 1 (${firstCardButtonCount}).`);
        }
        if (carouselCards[i].buttons.map(b => b.type).join(',') !== firstCardButtonTypes) {
          errors.push(`Card ${i + 1} button types must match Card 1 order.`);
        }
        const cardMediaType = carouselCards[i].mediaUrl ? 'has_media' : 'no_media';
        if (cardMediaType !== firstCardMediaType) {
          errors.push(`All cards must have the same media presence.`);
          break;
        }
      }
    }

    // URL button validations
    if (cfg.showButtons && buttons.length > 0) {
      buttons.forEach((btn, i) => {
        if (btn.type === 'URL' && btn.url) {
          if (isShortenedUrl(btn.url)) {
            errors.push(`Button ${i + 1}: Shortened URLs (bit.ly, etc.) are always rejected by Meta.`);
          }
          if (hasVariableNotAtEnd(btn.url)) {
            errors.push(`Button ${i + 1}: URL variables ({{1}}) are only allowed at the end of the URL.`);
          }
        }
      });
    }

    // Authentication: code expiration validation
    if (cfg.showCodeExpiration && codeExpirationMinutes !== '' &&
        (codeExpirationMinutes < 1 || codeExpirationMinutes > 90)) {
      errors.push('Code expiration must be between 1 and 90 minutes.');
    }

    if (errors.length > 0) {
      setSaveErrors(errors);
      return;
    }

    setSaveErrors([]);
    setIsSaving(true);

    const input: CreateTemplateInput = {
      name,
      type,
      category: effectiveCategory,
      language,
      body: cfg.presetBody ? undefined : (body || undefined),
      title: cfg.showTitle ? title || undefined : undefined,
      media_url: cfg.showMedia ? mediaUrl || undefined : undefined,
      media_type: cfg.showMedia ? mediaType : undefined,
      buttons: cfg.showButtons && buttons.length > 0 ? buttons : undefined,
      variables:
        Object.keys(variableNames).length > 0
          ? Object.values(variableNames)
          : undefined,
      ...(cfg.showCatalogId && catalogId ? { catalog_id: catalogId } : {}),
      ...(cfg.showThumbnailItemId && thumbnailItemId ? { thumbnail_item_id: thumbnailItemId } : {}),
      ...(cfg.showCarouselCards && carouselCards.length > 0
        ? { carousel_cards: carouselCards }
        : {}),
      ...(cfg.showSecurityRecommendation ? { add_security_recommendation: addSecurityRecommendation } : {}),
      ...(cfg.showCodeExpiration && codeExpirationMinutes !== '' ? { code_expiration_minutes: codeExpirationMinutes } : {}),
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

              {/* Category */}
              <div className="grid gap-2">
                <Label htmlFor="tplCategory">Category</Label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => {
                    const isActive = effectiveCategory === cat.value;
                    const isForced = cfg.forcedCategory === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        disabled={!!cfg.forcedCategory && !isForced}
                        onClick={() => !cfg.forcedCategory && setCategory(cat.value)}
                        className={`rounded-lg border p-2.5 text-left transition-colors ${
                          isActive
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/30'
                        } ${cfg.forcedCategory && !isForced ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <span className={`text-xs font-medium ${isActive ? 'text-primary' : ''}`}>
                          {cat.label}
                        </span>
                        <p className="text-[10px] text-muted-foreground">{cat.description}</p>
                      </button>
                    );
                  })}
                </div>
                {cfg.forcedCategory && (
                  <p className="text-[10px] text-muted-foreground">
                    Category is auto-set to {cfg.forcedCategory} for this template type.
                  </p>
                )}
              </div>

              {/* Language */}
              <div className="grid gap-2">
                <Label htmlFor="tplLanguage">Language</Label>
                <select
                  id="tplLanguage"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} ({lang.code})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">
                  Required for WhatsApp template approval. Must match the message language.
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
                    maxLength={effectiveBodyMaxLength}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                      Use {'{{1}}'}, {'{{2}}'} etc. for variables. Supports
                      *bold*, _italic_, ~strike~.
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {body.length}/{effectiveBodyMaxLength}
                    </span>
                  </div>
                </div>
              )}

              {/* Authentication preset body info */}
              {cfg.presetBody && (
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5">
                  <p className="text-xs font-medium">Preset body by WhatsApp</p>
                  <p className="mt-1 text-[11px] text-muted-foreground italic">
                    &quot;{'{{1}}'} is your verification code.&quot;
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    WhatsApp auto-generates the body. You cannot customise it.
                  </p>
                </div>
              )}

              {/* Security Recommendation (authentication) */}
              {cfg.showSecurityRecommendation && (
                <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2.5">
                  <div>
                    <p className="text-xs font-medium">Security Recommendation</p>
                    <p className="text-[10px] text-muted-foreground">
                      Appends &quot;Do not share this code&quot; to the message.
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      id="tplSecurityRecommendation"
                      checked={addSecurityRecommendation}
                      onChange={(e) => setAddSecurityRecommendation(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="peer h-5 w-9 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full" />
                  </label>
                </div>
              )}

              {/* Code Expiration (authentication) */}
              {cfg.showCodeExpiration && (
                <div className="grid gap-2">
                  <Label htmlFor="tplCodeExpiration">Code Expiration (minutes)</Label>
                  <Input
                    id="tplCodeExpiration"
                    type="number"
                    min={1}
                    max={90}
                    placeholder="e.g. 10"
                    value={codeExpirationMinutes}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCodeExpirationMinutes(val === '' ? '' : parseInt(val, 10));
                    }}
                    className="w-32"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    1–90 minutes. Appends &quot;This code expires in X minutes&quot; to the message.
                  </p>
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
                    onChange={(e) => {
                      const val = e.target.value;
                      setFooter(val);
                      if (/\{\{\d+\}\}/.test(val)) {
                        setFooterError('Variables are not supported in footers.');
                      } else {
                        setFooterError('');
                      }
                    }}
                    maxLength={60}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                      No variables allowed in footer.
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {footer.length}/60
                    </span>
                  </div>
                  {footerError && (
                    <p className="text-[10px] text-destructive">{footerError}</p>
                  )}
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

            {/* In-session only warning */}
            {cfg.inSessionOnly && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
                <p className="text-xs font-medium text-warning">In-session only</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  This template type can only be sent in active conversations. It cannot be submitted for WhatsApp template approval.
                </p>
              </div>
            )}

            {/* Catalog ID (catalog type) */}
            {cfg.showCatalogId && (
              <section className="space-y-3 rounded-xl border border-border bg-card p-5">
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                  Catalog
                </h2>
                <div className="grid gap-2">
                  <Label htmlFor="tplCatalogId">Catalog ID</Label>
                  <Input
                    id="tplCatalogId"
                    placeholder="e.g. 123456789012345"
                    value={catalogId}
                    onChange={(e) => setCatalogId(e.target.value)}
                    className="font-mono text-sm"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">
                    From Meta Commerce Manager. Required to link your product catalog.
                  </p>
                </div>
                {cfg.showThumbnailItemId && (
                  <div className="grid gap-2">
                    <Label htmlFor="tplThumbnailItemId">Thumbnail Product ID</Label>
                    <Input
                      id="tplThumbnailItemId"
                      placeholder="e.g. SKU-12345"
                      value={thumbnailItemId}
                      onChange={(e) => setThumbnailItemId(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Optional. The product retailer ID to use as the thumbnail image.
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Carousel Cards (carousel type) */}
            {cfg.showCarouselCards && (
              <section className="space-y-3 rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                    Carousel Cards
                  </h2>
                  {carouselCards.length < 10 && (
                    <button
                      type="button"
                      onClick={() =>
                        setCarouselCards([
                          ...carouselCards,
                          { title: '', body: '', mediaUrl: '', buttons: [] },
                        ])
                      }
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Plus className="h-3 w-3" /> Add Card
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Min 2, max 10 cards. Each card: title + body max 160 chars combined, media required, 1–2 buttons.
                  All cards must have the same number/type of buttons and same media type.
                </p>
                {carouselCards.map((card, ci) => {
                  const combinedLen = card.title.length + card.body.length;
                  return (
                    <div key={ci} className="space-y-2 rounded-lg border border-border bg-background p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">Card {ci + 1}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setCarouselCards(carouselCards.filter((_, i) => i !== ci))
                          }
                          className="text-xs text-destructive hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                      <Input
                        placeholder="Card title"
                        value={card.title}
                        onChange={(e) => {
                          const updated = [...carouselCards];
                          updated[ci] = { ...updated[ci], title: e.target.value };
                          setCarouselCards(updated);
                        }}
                        className="h-8 text-xs"
                      />
                      <Input
                        placeholder="Card body"
                        value={card.body}
                        onChange={(e) => {
                          const updated = [...carouselCards];
                          updated[ci] = { ...updated[ci], body: e.target.value };
                          setCarouselCards(updated);
                        }}
                        className="h-8 text-xs"
                      />
                      <p className={`text-[10px] ${combinedLen > 160 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {combinedLen}/160 chars (title + body combined)
                      </p>
                      <Input
                        placeholder="Media URL (required)"
                        value={card.mediaUrl}
                        onChange={(e) => {
                          const updated = [...carouselCards];
                          updated[ci] = { ...updated[ci], mediaUrl: e.target.value };
                          setCarouselCards(updated);
                        }}
                        className="h-8 text-xs"
                        required
                      />
                      <ButtonEditor
                        buttons={card.buttons}
                        onChange={(newButtons) => {
                          const updated = [...carouselCards];
                          updated[ci] = { ...updated[ci], buttons: newButtons };
                          setCarouselCards(updated);
                        }}
                        maxButtons={2}
                      />
                    </div>
                  );
                })}
              </section>
            )}

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

            {/* Validation errors */}
            {saveErrors.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 space-y-1">
                <p className="text-xs font-medium text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Validation Errors
                </p>
                {saveErrors.map((err, i) => (
                  <p key={i} className="text-[11px] text-destructive/80">• {err}</p>
                ))}
              </div>
            )}

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
