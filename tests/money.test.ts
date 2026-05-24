// TODO(plan-01-03): wire when implementation lands
//
// RED-by-default scaffold. src/utils/money.ts lands in plan 01-03.

import { paisa, toRupees, addPaisa } from '../src/utils/money';

describe('Paisa branded integer (Pitfall 1)', () => {
  it('paisa(50) === 5000 and toRupees round-trips', () => {
    const p = paisa(50);
    expect(p).toBe(5000);
    expect(toRupees(p)).toBe(50);
  });

  it('paisa rounds fractional rupees to nearest paisa', () => {
    // 123.456 rupees = 12345.6 paisa → rounded to 12346
    expect(paisa(123.456)).toBe(12346);
  });

  it('addPaisa is associative on integer paisa', () => {
    const a = paisa(10);
    const b = paisa(20);
    const c = paisa(30);
    expect(addPaisa(addPaisa(a, b), c)).toBe(addPaisa(a, addPaisa(b, c)));
  });
});
