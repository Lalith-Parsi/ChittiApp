// TODO(plan-01-03): wire when implementation lands
//
// RED-by-default scaffold. Imports a module that does not exist yet, so this
// file fails to load until plan 01-03 creates src/utils/phone.ts. That failure
// is the intentional gate that keeps the Wave 0 → Wave 2 ordering honest.

import { toE164, isValidIndianMobile, formatNational } from '../src/utils/phone';

describe('phone normalizer (Pitfall 6)', () => {
  it('toE164 returns +91XXXXXXXXXX for a bare 10-digit Indian mobile', () => {
    expect(toE164('9876543210', 'IN')).toBe('+919876543210');
  });

  it('toE164 returns null for garbage input', () => {
    expect(toE164('not a phone', 'IN')).toBeNull();
  });

  it('toE164 accepts already-E.164 input idempotently', () => {
    expect(toE164('+919876543210', 'IN')).toBe('+919876543210');
  });

  it('isValidIndianMobile accepts 10 digits starting 6-9', () => {
    expect(isValidIndianMobile('9876543210')).toBe(true);
    expect(isValidIndianMobile('5876543210')).toBe(false);
  });

  it('formatNational renders +91 98765 43210 style', () => {
    expect(formatNational('+919876543210')).toMatch(/\+91\s?98765\s?43210/);
  });
});
