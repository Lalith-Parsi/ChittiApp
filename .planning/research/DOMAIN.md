# Chit Fund Domain Reference

**Compiled:** 2026-05-22
**Scope:** Foundational domain knowledge for ChittiApp — what a chit fund actually is, the parameters real-world operators track, and the legal/regulatory frame in India.

This document is the canonical "what the domain means" reference. Roadmap, requirements, and planning agents read this when reasoning about chit fund features.

---

## 1. What a chit fund is

A chit fund is a rotating savings-and-credit association (ROSCA) regulated in India under the **Chit Funds Act, 1982**. A fixed group of **N subscribers** contributes a fixed monthly amount for **T months** (T = N). Each month the pooled "pot" is awarded to one subscriber — chosen by **lottery**, **auction**, or **pre-agreed assignment** — and that subscriber is then "prized" and cannot win again. Over the full term every subscriber wins exactly once, so the chit is both a savings vehicle (for those who win late) and a credit instrument (for those who win early).

The operator (**foreman**) runs the chit for a regulated commission and is legally responsible for collections, draws, payouts, and recordkeeping.

---

## 2. Core parameters

| Parameter | Symbol | Meaning | Regulated / typical value |
|---|---|---|---|
| Chit value | **C** | Headline pot — total prize on offer each month | e.g. ₹1,00,000 |
| Subscribers | **N** | Members in the group | e.g. 20 |
| Duration | **T** | Months the chit runs | **T = N** |
| Gross monthly subscription | — | What each member pays if no auction discount | C / N |
| Foreman commission | **f** | Operator fee, deducted from discount each month | ≤ **5%** of C (Act 1982); up to **7%** (2019 Amendment) |
| Maximum discount | **d_max** | Cap on how deep bidders may discount the prize | ≤ **30%** of C (Act); up to 40% by agreement |
| Bid increment | — | Min step during auction | ₹100 or multiples |
| Tie-break | — | Two bidders offer the same max discount | Decided by lot |
| Draw type | — | How winner is selected | `auction` / `lottery` / `self-assign` |
| Eligibility | — | Who may win this cycle | Only **non-prized** members |
| Payment due day | — | Day of month subscription is due | Per agreement |
| Grace period & penalty | — | Late payment treatment | Per agreement (commonly 1–2%/month on arrears) |

---

## 3. Subscriber states

- **Non-prized** — has not yet won. Bids in future auctions, pays (often reduced by dividend), receives dividend each cycle.
- **Prized** — has won. **Cannot bid again.** Continues paying remaining instalments — effectively a borrower for the rest of the term. Usually required to provide a **guarantor or security** because they now owe future instalments without further winning incentive.

---

## 4. The monthly cycle

For each of the T months:

1. All N subscribers pay the monthly subscription → **pot = N × subscription = C**.
2. **Draw** happens among non-prized subscribers (auction / lottery / pre-assignment).
3. Winning bid = **prize amount (P)**. Discount = **D = C − P**.
4. Foreman commission **f × C** is deducted from D.
5. **Distributable dividend = D − (f × C)**.
6. **Dividend per subscriber = distributable / N**.
7. **Winner receives P** (cash payout from the foreman).
8. **Dividend is credited** to every subscriber — usually as a reduction on the *next* month's subscription, sometimes the current month. Application policy is configurable per operator.

### Money conservation invariant

For every cycle:

```
N × subscription  ==  P  +  (f × C)  +  (dividend × N)
```

This identity should be enforced as a test assertion anywhere cycle math is calculated.

---

## 5. Worked example

**Group:** C = ₹1,00,000, N = 20, subscription = ₹5,000, f = 5%.

**Month 5 auction:**

| Step | Value |
|---|---|
| Pot collected | 20 × ₹5,000 = **₹1,00,000** |
| Lowest accepted bid (P) | **₹70,000** |
| Discount (D) | ₹30,000 |
| Foreman commission (f × C) | ₹5,000 |
| Distributable dividend | ₹25,000 |
| Dividend per subscriber | ₹25,000 / 20 = **₹1,250** |
| Winner receives | **₹70,000** |
| Each subscriber's next subscription | ₹5,000 − ₹1,250 = **₹3,750** |

**Check:** ₹1,00,000 = ₹70,000 + ₹5,000 + (₹1,250 × 20) ✓

---

## 6. Beyond the basic cycle — fields real operators track

- **Agreement metadata** — agreement date, start date, first instalment date, registered chit number.
- **Bid history per cycle** — every bid placed, not just the winner. Required for dispute resolution.
- **Penalty / interest on default** — arrears age, interest rate, accrued interest.
- **Defaulter handling** — set off arrears against accrued dividends; removal of non-prized defaulter with substitute admission; recovery from prized defaulter via guarantor.
- **Guarantor / security** captured for each prized subscriber.
- **Foreman's own ticket** — foreman may hold one slot; commonly takes the first month as prize without auction.
- **Dividend application policy** — current month vs next month, plus rounding rules.
- **Registrar deposit** — for regulated chits, a percentage of C lodged with the state Registrar of Chits as security.
- **Receipts and statements** — each subscriber needs per-cycle receipts and a running statement.
- **Cycle ledger** — for each cycle: collections, payout, commission, dividend, arrears, payout date.

---

## 7. Gap analysis vs current ChittiApp code

What `src/types/index.ts` and `src/utils/chitti.ts` already model:

- ✓ `ChittiGroup` (C, N, T, draw type, start date, payment day)
- ✓ `Member.hasReceived` / `cycleReceived` — captures prized/non-prized state
- ✓ `Cycle.winAmount`, `discount`, `dividendPerMember`, `drawType`, `conducted`
- ✓ `Payment` per member per cycle
- ✓ `calculateDividend(pool, winAmount, members)` — but computes `(pool − winAmount) / N` directly

Missing or incorrect vs the real domain:

- ✗ **No foreman commission field.** `calculateDividend` treats the entire discount as dividend; correct formula is `(discount − foreman_commission) / N`.
- ✗ **`amount` field is ambiguous.** `winAmount = group.amount × group.totalMembers` implies `amount` = monthly subscription, but most operators store **chit value (C)** as the source of truth and derive subscription. Decide which is canonical.
- ✗ **No bid history** per cycle.
- ✗ **No min/max discount caps** per group, no enforcement.
- ✗ **No penalty / arrears / interest** on missed payments.
- ✗ **No dividend application policy** field (current month vs next month).
- ✗ **No foreman ticket / first-month auto-prize** representation.
- ✗ **No guarantor / security** info on prized members.
- ✗ **Money conservation invariant** is not validated anywhere.
- ✗ `self-assign` draw type doesn't enforce non-prized eligibility.

---

## 8. Sources

- [The Chit Funds Act, 1982 — full text (India Code)](https://www.indiacode.nic.in/bitstream/123456789/21348/1/the_chit_funds_act,_1982.pdf)
- [Chit Funds Act 1982 — rules & amendments (IndiaFilings)](https://www.indiafilings.com/learn/chit-funds)
- [The Chit Funds Act, 1982 (RBI Sachet)](https://sachet.rbi.org.in/Docs/0%C2%A5central%20ChitFundAct%201982.pdf)
- [Chit Fund — meaning, how it works (Bajaj Finserv)](https://www.bajajfinserv.in/investments/chit-funds)
- [Dividend Chart Guide (Kopuram Chits)](https://kopuramchits.com/blogs/demystifying-dividend-charts-a-handy-guide-for-chit-fund-investors/)
- [How Chit Fund Works (Balussery Chits)](https://balusserychitsonline.com/chit-funds/how-it-works/)
- [The Chit Process (Muthoot Chits)](https://muthootchits.com/chits/process-about-chits)

---

*Last updated: 2026-05-22 during /gsd-new-project research step*
