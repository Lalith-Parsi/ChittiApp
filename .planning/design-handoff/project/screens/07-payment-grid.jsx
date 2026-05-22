// Screen 07 — Cycle ledger / payment grid
//
// Key choices:
// • The subscription breakdown sits at the very top as a single readable line —
//   "₹5,000 gross − ₹1,250 dividend = ₹3,750 due" — so members never have to ask
//   "wait, why is this different from what we agreed?"
// • Each paid row is stamped "marked by Ravi · 11:42 today" — every payment carries
//   an audit pin. Trust signal #1 of the screen.
// • Bulk "Mark all paid" is intentionally one tap away but never the default — chit
//   cycles tend to have a couple of late payers, and "all paid by default" risks
//   foremen rubber-stamping without checking.
// • The mark-payment sheet uses big icon buttons for payment mode (cash / UPI / bank /
//   cheque / other) — older foremen don't read tiny chips well.

const { useState } = React;

function PaymentGrid({ state = "some" }) {
  const subscription = 5000;
  const dividend = 1250;
  const due = 3750;
  const total = 20;

  const initial = MEMBERS.map((m, i) => {
    if (state === "all-unpaid") return { ...m, paid: false, paidOn: null, mode: null };
    if (state === "all-paid")   return { ...m, paid: true,  paidOn: "Mar 12", mode: ["upi","cash","bank","upi","upi","cash","upi"][i % 7] };
    if (state === "some")       return { ...m, paid: i < 4, paidOn: i < 4 ? ["Mar 10","Mar 10","Mar 11","Mar 12"][i] : null, mode: ["upi","cash","upi","upi",null,null,null][i] };
    return m;
  });

  // Pad to 20 members for realism
  const extras = Array.from({ length: 13 }, (_, k) => ({
    name: ["Meera Pillai","Arjun Nair","Rohit Subramanian","Deepa Iyer","Vikram Rao","Sangeeta Pandian","Naveen Kumar","Aishwarya Krishnan","Manish Gupta","Pooja Anand","Bharath Reddy","Kavitha Menon","Sandeep Joseph"][k],
    phone: `+91 9${(8765432100n + BigInt(k * 17)).toString().slice(0, 9)}`,
    initials: ["MP","AN","RS","DI","VR","SP","NK","AK","MG","PA","BR","KM","SJ"][k],
    color: ["#C9A24B","#E7C77A","#7CC79E","#E5A89A","#9AB5D8","#D8B8E5","#C9A24B"][k % 7],
    paid: state === "all-paid" ? true : (state === "some" && k < 8),
    paidOn: state === "all-paid" ? "Mar 12" : (state === "some" && k < 8) ? "Mar 11" : null,
    mode: state === "all-paid" ? ["upi","cash","bank","upi","cheque","upi","upi"][k % 7] : (state === "some" && k < 8) ? "upi" : null,
    prized: k === 1 ? { cycle: 2 } : k === 5 ? { cycle: 4 } : null,
  }));
  const all = [...initial, ...extras];
  const paidCount = all.filter(m => m.paid).length;
  const collected = paidCount * due;
  const pending = (total - paidCount) * due;
  const dividendPool = total * subscription - (state === "all-paid" ? 70000 + 5000 : 0); // illustrative
  const allPaid = paidCount === total;

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "calc(844px - 47px - 24px)",
    }}>
      {/* Sticky header */}
      <div style={{ padding: "8px 20px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button style={navBtn7}>
            <svg width="22" height="22" viewBox="0 0 22 22"><path d="M13 4l-6 7 6 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div style={{ fontSize: 13, color: "var(--fg-3)", fontWeight: 600 }}>Anna Nagar Family Chit</div>
          <button style={navBtn7}>
            <svg width="22" height="22" viewBox="0 0 22 22"><circle cx="5" cy="11" r="1.6" fill="currentColor"/><circle cx="11" cy="11" r="1.6" fill="currentColor"/><circle cx="17" cy="11" r="1.6" fill="currentColor"/></svg>
          </button>
        </div>

        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--primary)" }}>
            Cycle 5 of 20 · March 2026
          </div>
          <h1 className="ca-display" style={{ fontSize: 26, lineHeight: 1.15, margin: "6px 0 6px", color: "var(--fg-1)", letterSpacing: "-0.01em" }}>
            Mark this month's payments
          </h1>
          {/* Subscription breakdown — one readable line */}
          <div style={{
            background: "var(--bg-2)",
            borderRadius: 12,
            padding: "10px 14px",
            display: "flex", alignItems: "baseline", gap: 8,
            fontSize: 13, color: "var(--fg-2)",
            flexWrap: "wrap",
          }}>
            <span style={{ color: "var(--fg-1)", fontWeight: 600 }}><Rupee value={subscription} /></span>
            <span style={{ color: "var(--fg-3)" }}>gross</span>
            <span style={{ color: "var(--fg-3)" }}>−</span>
            <span style={{ color: "var(--fg-1)", fontWeight: 600 }}><Rupee value={dividend} /></span>
            <span style={{ color: "var(--fg-3)" }}>dividend</span>
            <span style={{ color: "var(--fg-3)" }}>=</span>
            <span style={{ color: "var(--primary)", fontWeight: 700, fontSize: 14 }}><Rupee value={due} /></span>
            <span style={{ color: "var(--fg-3)" }}>each member</span>
          </div>
        </div>

        {/* Totals strip */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8, marginTop: 12,
        }}>
          <Stat sublabel="Collected" value={collected} primary />
          <Stat sublabel="Pending" value={pending} muted={pending === 0} />
          <Stat sublabel="Members paid" raw={`${paidCount}/${total}`} />
        </div>

        {/* Bulk action */}
        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
            <span className="ca-tnum">{total - paidCount}</span> still to mark
          </div>
          {!allPaid && (
            <button style={{
              background: "transparent",
              border: "1px solid var(--divider-2)",
              borderRadius: 999,
              padding: "6px 12px",
              fontSize: 13, fontWeight: 600,
              color: "var(--fg-1)",
              cursor: "pointer", fontFamily: "inherit",
            }}>
              Mark all paid
            </button>
          )}
        </div>
      </div>

      {/* Member list */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "0 20px 100px",
      }}>
        <div style={{
          background: "var(--bg-2)",
          borderRadius: 16,
          padding: "4px 14px",
          border: "1px solid var(--divider)",
        }}>
          {all.map((m, i) => (
            <div key={m.name} style={{ borderTop: i === 0 ? "none" : "1px solid var(--divider)" }}>
              <PaymentRow m={m} due={due} />
            </div>
          ))}
        </div>

        {/* Sticky CTA shown when all paid */}
      </div>

      {/* Bottom CTA */}
      <div style={{
        padding: "12px 20px 24px",
        borderTop: "1px solid var(--divider)",
        background: "var(--bg)",
      }}>
        <button
          className="ca-btn ca-btn-primary"
          disabled={!allPaid}
          style={{ minHeight: 52 }}
        >
          {allPaid ? <>Conduct draw <ArrowRight size={18} /></> : `Conduct draw — ${total - paidCount} pending`}
        </button>
      </div>
    </div>
  );
}

const navBtn7 = {
  width: 36, height: 36, borderRadius: 18,
  background: "transparent", border: 0, cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  color: "var(--fg-2)", padding: 0,
};

function Stat({ sublabel, value, raw, primary, muted }) {
  return (
    <div style={{
      background: "var(--bg-2)",
      borderRadius: 12,
      padding: "10px 12px",
      border: "1px solid var(--divider)",
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-3)" }}>{sublabel}</div>
      <div style={{
        marginTop: 4,
        fontSize: 16, fontWeight: 600,
        color: muted ? "var(--fg-3)" : primary ? "var(--primary)" : "var(--fg-1)",
        fontVariantNumeric: "tabular-nums",
      }}>
        {raw ? raw : <Rupee value={value} />}
      </div>
    </div>
  );
}

const MODE_LABEL = { upi: "UPI", cash: "Cash", bank: "Bank", cheque: "Cheque", other: "Other" };
const MODE_ICON = {
  upi:  (s) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/><path d="M7 9l3-3 3 3-3 3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
  cash: (s) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><rect x="2" y="6" width="16" height="9" rx="1.6" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10.5" r="2" stroke="currentColor" strokeWidth="1.5"/></svg>,
  bank: (s) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M2 8l8-4 8 4M3 8h14M5 8v8M9 8v8M13 8v8M17 8v8M2 17h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  cheque:(s) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><rect x="2" y="5" width="16" height="10" rx="1.6" stroke="currentColor" strokeWidth="1.5"/><path d="M5 9h10M5 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  other:(s) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M8 8.5a2 2 0 114 0c0 1.5-2 2-2 3.5M10 14v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
};

function PaymentRow({ m, due }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 0",
    }}>
      <Avatar initials={m.initials} color={m.color} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14.5, fontWeight: 500, color: "var(--fg-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</span>
          {m.prized && (
            <span style={{
              padding: "2px 6px", borderRadius: 999,
              background: "color-mix(in oklab, var(--brass-500) 16%, var(--bg-2))",
              color: "var(--brass-500)", fontSize: 10.5, fontWeight: 600,
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>Prized C{m.prized?.cycle || m.prizedCycle}</span>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }} className="ca-tnum">
          {m.paid ? (
            <>Marked by Ravi · {m.paidOn} · {MODE_LABEL[m.mode] || "—"}</>
          ) : m.phone}
        </div>
      </div>
      {m.paid ? (
        <span className="ca-pill ca-pill-paid"><Check size={12} /> <Rupee value={due} /></span>
      ) : (
        <button style={{
          background: "var(--primary)",
          color: "var(--primary-fg)",
          border: 0, cursor: "pointer", fontFamily: "inherit",
          borderRadius: 999, padding: "7px 14px",
          fontSize: 12.5, fontWeight: 600,
        }}>
          Mark paid
        </button>
      )}
    </div>
  );
}

/* ─────────── Mark-payment bottom sheet ─────────── */
function MarkPaymentSheet() {
  const due = 3750;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1 }} />
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 2,
        background: "var(--bg)",
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: "8px 20px 28px",
        boxShadow: "0 -20px 40px -10px rgba(0,0,0,.2)",
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--divider-2)", margin: "10px auto 14px" }} />

        {/* Member + amount */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <Avatar initials="KR" color="#9AB5D8" size={44} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--fg-1)" }}>Karthik Reddy</div>
            <div style={{ fontSize: 12.5, color: "var(--fg-3)" }} className="ca-tnum">+91 97654 32109</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <Rupee value={due} className="ca-display" style={{ fontSize: 22, color: "var(--fg-1)" }} />
            <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 1 }}>this cycle</div>
          </div>
        </div>

        {/* Mode picker */}
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: 8 }}>
          How did they pay?
        </div>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8,
        }}>
          {["upi", "cash", "bank", "cheque", "other"].map((mode, i) => {
            const active = mode === "upi";
            return (
              <button key={mode} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                padding: "12px 4px",
                borderRadius: 12,
                background: active ? "color-mix(in oklab, var(--primary) 14%, var(--bg-2))" : "var(--bg-2)",
                border: `1px solid ${active ? "var(--primary)" : "transparent"}`,
                cursor: "pointer", fontFamily: "inherit",
                color: active ? "var(--primary)" : "var(--fg-2)",
              }}>
                {MODE_ICON[mode](22)}
                <span style={{ fontSize: 11, fontWeight: 600 }}>{MODE_LABEL[mode]}</span>
              </button>
            );
          })}
        </div>

        {/* Date */}
        <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 13, color: "var(--fg-2)", flex: 1 }}>Paid on</div>
          <button style={{
            background: "var(--bg-2)", border: 0, cursor: "pointer", fontFamily: "inherit",
            borderRadius: 10, padding: "10px 14px",
            display: "flex", alignItems: "center", gap: 8,
            color: "var(--fg-1)", fontSize: 14, fontWeight: 600,
          }}>
            <span>Today, Mar 12</span>
            <ChevronDown size={14} />
          </button>
        </div>

        {/* Note */}
        <div className="ca-field" style={{ marginTop: 14, padding: "12px 14px" }}>
          <input className="ca-input" placeholder="Optional note (e.g. 'paid at office')" style={{ fontSize: 14 }} />
        </div>

        <button className="ca-btn ca-btn-primary" style={{ marginTop: 18 }}>
          <Check size={18} /> Mark paid · <Rupee value={due} />
        </button>
      </div>
    </>
  );
}

function PaymentGridScreen({ theme = "light", state = "some", time = "9:41" }) {
  return (
    <Screen theme={theme} time={time}>
      <PaymentGrid state={state === "marking" ? "some" : state} />
      {state === "marking" && <MarkPaymentSheet />}
    </Screen>
  );
}

window.PaymentGridScreen = PaymentGridScreen;
