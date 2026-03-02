/**
 * WhatsApp text formatting utilities.
 *
 * Handles WA markdown (*bold*, _italic_, ~strikethrough~),
 * variable placeholder substitution, and variable extraction.
 */

const SAMPLE_VALUES: Record<number, string> = {
  1: 'John',
  2: 'Acme Corp',
  3: '10:00 AM',
  4: 'R250',
  5: '12 March',
  6: 'Sandton',
};

/** Escape HTML entities to prevent XSS. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Convert WhatsApp markdown to HTML.
 * Supports *bold*, _italic_, ~strikethrough~, and newlines.
 */
export function formatWhatsAppText(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  html = html.replace(/~(.*?)~/g, '<del>$1</del>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

/**
 * Extract variable numbers from text (e.g., {{1}}, {{2}}).
 * Returns sorted, deduplicated list of variable numbers.
 */
export function extractVariables(text: string): number[] {
  const matches = text.match(/\{\{(\d+)\}\}/g) || [];
  return [...new Set(matches.map(m => parseInt(m.replace(/[{}]/g, ''))))].sort(
    (a, b) => a - b
  );
}

/**
 * Replace {{N}} placeholders with sample values for preview.
 * Custom names override the default samples.
 */
export function replaceVariablesWithSamples(
  text: string,
  customNames?: Record<string, string>
): string {
  return text.replace(/\{\{(\d+)\}\}/g, (_, n) => {
    const num = parseInt(n);
    if (customNames?.[n]) return customNames[n];
    return SAMPLE_VALUES[num] || `[var${num}]`;
  });
}
