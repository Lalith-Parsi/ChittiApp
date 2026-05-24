// src/utils/phone.ts
//
// Single-writer phone normalization (Pitfall 6). Every E.164 phone string in
// ChittiApp must flow through `toE164(input, 'IN')` from this module — the
// ESLint `no-restricted-syntax` rule in `.eslintrc.js` enforces this by
// forbidding `'+91' + ...` concatenation and `` `+91${...}` `` templates.
//
// Uses the `/min` sub-path of libphonenumber-js (~110 KB metadata; sufficient
// for IN parse + validate + format). See:
//   .planning/phases/01-native-phone-auth-env-config/01-RESEARCH.md §Pattern 4
//   .planning/research/PITFALLS.md Pitfall 6

import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js/min';

/**
 * Parse `input` and return its canonical E.164 form, or `null` if the value
 * is not a valid phone number for `defaultCountry`.
 *
 * Examples:
 *   toE164('9876543210', 'IN')       -> '+919876543210'
 *   toE164('+91 98765 43210', 'IN')  -> '+919876543210'
 *   toE164('garbage', 'IN')          -> null
 *   toE164('123', 'IN')              -> null
 */
export function toE164(input: string, defaultCountry: CountryCode = 'IN'): string | null {
  if (!input) return null;
  const parsed = parsePhoneNumberFromString(input, defaultCountry);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

/**
 * Fast-path UI validator for Indian mobile numbers. Accepts:
 *   - 10 digits with leading 6-9 (TRAI mobile range), OR
 *   - any already-formatted +91 number that libphonenumber-js considers valid.
 *
 * The two-tier shape keeps the existing per-keystroke regex check in
 * AddMemberScreen / LoginScreen cheap, while still tolerating users who
 * paste a pre-formatted `+91 98765 43210`-style number.
 */
export function isValidIndianMobile(input: string): boolean {
  if (!input) return false;
  const digits = input.replace(/\D/g, '');
  // For 10-digit national input the TRAI mobile prefix (6-9) is authoritative;
  // libphonenumber-js's `/min` IN metadata is too permissive (accepts 5xxxxxxxxx
  // because the leading 5 series exists in some sub-routes), so we reject here
  // before deferring to the full parser.
  if (digits.length === 10) {
    return /^[6-9]/.test(digits);
  }
  // 11-digit national (leading 0) or +91 E.164 inputs: same rule on the trunk-stripped
  // mobile number.
  if (digits.length === 11 && digits.startsWith('0')) {
    return /^[6-9]/.test(digits.slice(1));
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return /^[6-9]/.test(digits.slice(2));
  }
  // Fallback to full parse (handles formatted '+91 98765 43210', country lookup).
  const parsed = parsePhoneNumberFromString(input, 'IN');
  return !!parsed?.isValid() && parsed.country === 'IN';
}

/**
 * Render an E.164 number in human-readable national/international form:
 *   formatNational('+919876543210') -> '+91 98765 43210'
 *
 * Falls back to the input verbatim if parsing fails — callers that need to
 * detect invalid input should use `toE164` first.
 */
export function formatNational(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  return parsed ? parsed.formatInternational() : e164;
}
