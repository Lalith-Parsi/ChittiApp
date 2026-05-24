// tests/money.test.ts
//
// Covers src/utils/money.ts (plan 01-03). Nine behaviors per the plan's
// <behavior> block: see .planning/phases/01-native-phone-auth-env-config/
// 01-03-helpers-phone-money-PLAN.md task 2.

import {
  paisa,
  toRupees,
  addPaisa,
  subPaisa,
  mulPaisa,
  formatINR,
} from '../src/utils/money';

describe('Paisa branded integer (Pitfall 1)', () => {
  it('paisa(123.45) === 12345', () => {
    expect(paisa(123.45)).toBe(12345);
  });

  it('paisa(0.005) rounds half-up to 1', () => {
    expect(paisa(0.005)).toBe(1);
  });

  it('toRupees(paisa(99.99)) round-trips with cent precision', () => {
    expect(toRupees(paisa(99.99))).toBe(99.99);
  });

  it('paisa(50) === 5000 and round-trips', () => {
    const p = paisa(50);
    expect(p).toBe(5000);
    expect(toRupees(p)).toBe(50);
  });

  it('paisa rounds fractional rupees to nearest paisa', () => {
    expect(paisa(123.456)).toBe(12346);
  });

  it('addPaisa(10, 20) === paisa(30)', () => {
    expect(addPaisa(paisa(10), paisa(20))).toBe(paisa(30));
  });

  it('addPaisa is associative on integer paisa', () => {
    const a = paisa(10);
    const b = paisa(20);
    const c = paisa(30);
    expect(addPaisa(addPaisa(a, b), c)).toBe(addPaisa(a, addPaisa(b, c)));
  });

  it('subPaisa(50, 20) === paisa(30)', () => {
    expect(subPaisa(paisa(50), paisa(20))).toBe(paisa(30));
  });

  it('mulPaisa(10, 3) === paisa(30)', () => {
    expect(mulPaisa(paisa(10), 3)).toBe(paisa(30));
  });

  it('formatINR(paisa(100000)) contains ₹ and 1,00,000', () => {
    const s = formatINR(paisa(100000));
    expect(s).toContain('₹');
    expect(s).toContain('1,00,000');
  });

  it('formatINR with withSymbol: false omits ₹', () => {
    const s = formatINR(paisa(100000), { withSymbol: false });
    expect(s).not.toContain('₹');
    expect(s).toContain('1,00,000');
  });
});
