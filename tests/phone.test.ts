// tests/phone.test.ts
//
// Covers src/utils/phone.ts (plan 01-03). Eight behaviors per the plan's
// <behavior> block: see .planning/phases/01-native-phone-auth-env-config/
// 01-03-helpers-phone-money-PLAN.md task 1.

import { toE164, isValidIndianMobile, formatNational } from '../src/utils/phone';

describe('phone normalizer (Pitfall 6)', () => {
  it('toE164 returns +91XXXXXXXXXX for a bare 10-digit Indian mobile', () => {
    expect(toE164('9876543210', 'IN')).toBe('+919876543210');
  });

  it('toE164 tolerates whitespace in already-E.164 input', () => {
    expect(toE164('+91 98765 43210', 'IN')).toBe('+919876543210');
  });

  it('toE164 returns null for too-short input', () => {
    expect(toE164('123', 'IN')).toBeNull();
  });

  it('toE164 returns null for garbage input', () => {
    expect(toE164('not a phone', 'IN')).toBeNull();
  });

  it('toE164 accepts already-E.164 input idempotently', () => {
    expect(toE164('+919876543210', 'IN')).toBe('+919876543210');
  });

  it('toE164 returns null for empty input', () => {
    expect(toE164('', 'IN')).toBeNull();
  });

  it('isValidIndianMobile fast-path: 10 digits starting 6-9', () => {
    expect(isValidIndianMobile('9876543210')).toBe(true);
    expect(isValidIndianMobile('6876543210')).toBe(true);
  });

  it('isValidIndianMobile rejects leading-5 (TRAI invalid)', () => {
    expect(isValidIndianMobile('5876543210')).toBe(false);
  });

  it('isValidIndianMobile slow-path: full E.164', () => {
    expect(isValidIndianMobile('+919876543210')).toBe(true);
  });

  it('formatNational renders +91 98765 43210 style', () => {
    expect(formatNational('+919876543210')).toMatch(/^\+91\s?98765\s?43210$/);
  });
});
