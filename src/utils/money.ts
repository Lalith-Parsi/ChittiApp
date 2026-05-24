// src/utils/money.ts
//
// ADR: Paisa is the integer-paisa money primitive for ChittiApp.
//
// Rule: any new money field added from Phase 1 onward uses Paisa. Existing
//       money fields stay as plain integer-rupees `number` until a planned
//       migration phase.
// Rule: do NOT refactor existing fields ad-hoc — the math is currently correct
//       and a partial migration would introduce drift mid-flight.
//
// See: .planning/research/PITFALLS.md Pitfall 1 (floating-point money drift)
//      .planning/phases/01-native-phone-auth-env-config/01-CONTEXT.md
//        (Paisa decision: "minimal helper, no migration" [LOCKED])
//
// The `Paisa` brand is a TS-only fiction — at runtime a Paisa is just a
// number. The brand prevents accidental assignment of a raw rupee number
// to a paisa field, which is the single bug class this primitive exists
// to prevent.

import { fmtINR } from '../lib/theme';

export type Paisa = number & { readonly __brand: 'Paisa' };

const PAISA_PER_RUPEE = 100;

/** Convert rupees (possibly fractional) to integer paisa, rounding half-up. */
export function paisa(rupees: number): Paisa {
  return Math.round(rupees * PAISA_PER_RUPEE) as Paisa;
}

/** Convert integer paisa back to rupees (may be fractional). */
export function toRupees(p: Paisa): number {
  return p / PAISA_PER_RUPEE;
}

/** Sum of two Paisa values; result is also Paisa. */
export function addPaisa(a: Paisa, b: Paisa): Paisa {
  return (a + b) as Paisa;
}

/** Difference of two Paisa values; result is also Paisa. */
export function subPaisa(a: Paisa, b: Paisa): Paisa {
  return (a - b) as Paisa;
}

/** Multiply Paisa by a scalar; result is rounded to nearest integer paisa. */
export function mulPaisa(a: Paisa, n: number): Paisa {
  return Math.round(a * n) as Paisa;
}

/**
 * Format a Paisa value as Indian-system currency.
 *   formatINR(paisa(100000))                        -> '₹1,00,000'
 *   formatINR(paisa(100000), { withSymbol: false }) -> '1,00,000'
 *
 * Reuses the existing `fmtINR` helper from `src/lib/theme.ts` so the entire
 * app shares one grouping/symbol convention.
 */
export function formatINR(p: Paisa, opts?: { withSymbol?: boolean }): string {
  const rupees = toRupees(p);
  const body = fmtINR(rupees);
  return opts?.withSymbol === false ? body : `₹${body}`;
}
