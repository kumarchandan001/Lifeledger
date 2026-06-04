// ═══════════════════════════════════════════════════
// String Utilities
// ═══════════════════════════════════════════════════

/**
 * Convert a string to a URL-safe slug.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Truncate a string to a max length with ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Mask PII data (e.g., email, phone, Aadhaar).
 */
export function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  const masked = name.length > 2 ? name[0] + '***' + name[name.length - 1] : '***';
  return `${masked}@${domain}`;
}

export function maskPhone(phone: string): string {
  if (phone.length < 6) return '***';
  return phone.slice(0, 3) + '****' + phone.slice(-3);
}

export function maskAadhaar(aadhaar: string): string {
  const digits = aadhaar.replace(/\D/g, '');
  if (digits.length !== 12) return '****-****-****';
  return `****-****-${digits.slice(-4)}`;
}

/**
 * Capitalize first letter of each word.
 */
export function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate initials from a full name (e.g., "Rahul Mehta" → "RM").
 */
export function getInitials(name: string, maxChars = 2): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, maxChars)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}
