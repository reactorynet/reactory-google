/**
 * HTML → text utilities for the Google module.
 *
 * Email bodies are overwhelmingly `text/html`. Feeding raw markup to an LLM (or a
 * search result) floods the context and hides the actual content, so every body that
 * leaves the module is converted to readable plain text by default.
 *
 * The converter is self-contained (no new runtime dependency). If the optional
 * `html-to-text` package happens to be resolvable it is used for richer output
 * (tables, definition lists); otherwise the built-in converter is used. Either way
 * the function never throws — a bad body yields best-effort text, never an error.
 */

export interface IHtmlToTextOptions {
  /** Preserve link targets as `text (href)`. Default true. */
  links?: boolean;
  /** Prefer the `html-to-text` package when available. Default true. */
  preferPackage?: boolean;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  copy: '©', reg: '®', trade: '™', deg: '°', euro: '€', pound: '£', yen: '¥',
  mdash: '—', ndash: '–', hellip: '…', laquo: '«', raquo: '»',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  bull: '•', middot: '·', dagger: '†', sect: '§', para: '¶',
};

/** Decode the HTML entities that actually appear in email bodies. */
export function decodeHtmlEntities(input: string): string {
  if (!input) return '';
  return String(input)
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _m;
    })
    .replace(/&#(\d+);/g, (_m, dec) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _m;
    })
    .replace(/&([a-z][a-z0-9]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

/** Remove <script>/<style>/comments. Not a full sanitizer — a pre-pass for text extraction. */
export function stripHtml(html: string): string {
  if (!html) return '';
  return String(html)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|head|title)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
}

let htmlToTextPackage: any = null;
let htmlToTextPackageChecked = false;
const loadPackage = (): any => {
  if (htmlToTextPackageChecked) return htmlToTextPackage;
  htmlToTextPackageChecked = true;
  try {
    // Optional: improves tables/lists when present. Never required.
    // eslint-disable-next-line global-require
    htmlToTextPackage = require('html-to-text');
  } catch {
    htmlToTextPackage = null;
  }
  return htmlToTextPackage;
};

/** The built-in converter: block-aware tag stripping + entity decoding + whitespace collapse. */
const convertInternal = (html: string, options: IHtmlToTextOptions): string => {
  const keepLinks = options.links !== false;
  let text = stripHtml(html);

  // Anchors -> "text (href)" (or just the href when there is no text).
  if (keepLinks) {
    text = text.replace(
      /<a\b[^>]*href\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
      (_m, href, inner) => {
        const label = String(inner).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        return label ? `${label} (${href})` : String(href);
      },
    );
  }

  // Images -> alt text.
  text = text.replace(/<img\b[^>]*\balt\s*=\s*["']([^"']*)["'][^>]*>/gi, ' $1 ');

  // Line breaks and block boundaries.
  text = text.replace(/<\s*br\s*\/?\s*>/gi, '\n');
  text = text.replace(/<\s*li\b[^>]*>/gi, '\n• ');
  text = text.replace(/<\s*hr\s*\/?\s*>/gi, '\n---\n');
  text = text.replace(
    /<\s*\/\s*(p|div|section|article|header|footer|main|tr|li|h[1-6]|blockquote|pre|table|thead|tbody|ul|ol|figure|figcaption|address)\s*>/gi,
    '\n',
  );
  // Cell separators within a row.
  text = text.replace(/<\s*\/(td|th)\s*>/gi, '\t');

  // Remaining tags.
  text = text.replace(/<[^>]+>/g, '');
  text = decodeHtmlEntities(text);

  // Normalise whitespace: collapse spaces, trim lines, cap blank runs.
  text = text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
};

/**
 * Convert an HTML body to readable plain text. Safe to call on non-HTML input
 * (it simply returns the normalised text).
 */
export function htmlToText(html: string, options: IHtmlToTextOptions = {}): string {
  if (!html) return '';
  const raw = String(html);

  // Fast path: no markup at all — normalise spacing but PRESERVE line breaks.
  if (!/[<&]/.test(raw)) {
    return raw
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t\f\v]+/g, ' ')
      .replace(/[ \t]*\n[ \t]*/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  if (options.preferPackage !== false) {
    const pkg = loadPackage();
    if (pkg && typeof pkg.convert === 'function') {
      try {
        const out = pkg.convert(raw, {
          wordwrap: false,
          selectors: [
            { selector: 'a', options: { ignoreHref: options.links === false } },
            { selector: 'img', format: 'skip' },
          ],
        });
        const normalised = String(out).replace(/\n{3,}/g, '\n\n').trim();
        if (normalised) return normalised;
      } catch {
        // fall through to the built-in converter
      }
    }
  }

  return convertInternal(raw, options);
}

/**
 * Choose the best plain-text representation of a message body: the `text/plain`
 * part when present, otherwise the HTML part converted to text.
 */
export function bestEffortTextBody(plain?: string, html?: string): string | undefined {
  const hasPlain = typeof plain === 'string' && plain.trim().length > 0;
  if (hasPlain) return plain;
  const hasHtml = typeof html === 'string' && html.trim().length > 0;
  if (hasHtml) return htmlToText(html as string);
  return undefined;
}
