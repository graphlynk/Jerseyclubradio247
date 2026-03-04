/**
 * Decode common HTML entities that YouTube's API returns in titles/channel names.
 * Safe to call on already-decoded text (no double-decode risk for these entities).
 */

const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&#x27;': "'",
  '&#x2F;': '/',
  '&nbsp;': ' ',
};

const ENTITY_RE = /&(?:amp|lt|gt|quot|apos|nbsp|#39|#x27|#x2F);/gi;

export function decodeHtmlEntities(str: string): string {
  if (!str) return str;
  return str.replace(ENTITY_RE, (match) => ENTITY_MAP[match.toLowerCase()] ?? match);
}
