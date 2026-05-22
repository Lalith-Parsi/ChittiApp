// Screen 09 — Cycle receipt (THE signature screen)
//
// This is the trust artifact. It must read like a real document — wide margins,
// typeset numbers, a brass stamp at the bottom. The "Math verified" seal is the
// product's signature moment. Spec for it lives at the bottom of this file.
//
// Key choices:
// • The equation is laid out vertically with each term on its own row, the operator
//   in the gutter — it reads like a typeset receipt, not a UI. Banknote-faint
//   guilloché lives on the receipt body only. Used nowhere else.
// • "What this means for you" is personalised in plain English — answers the only
//   question every member actually has after a draw ("ok so what changes for me").
// • Share-to-WhatsApp is the primary action because that's how Indian groups already
//   close the loop. PDF is "soon" — honest about v1 scope.

const { useState } = React;

/* ─────────── Brass seal — the verified stamp ─────────── */
function VerifiedSeal({ size = 86, tilt = -6 }) {
  const r = size / 2;
  return (
    <div style={{
      position: "relative",
      width: size,
      height: size,
      transform: `rotate(${tilt}deg)`,
      flex: "0 0 auto",
    }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <defs>
          <radialGradient id="brass-grad">
            <stop offset="0%" stopColor="#E7C77A" />
            <stop offset="60%" stopColor="#C9A24B" />
            <stop offset="100%" stopColor="#8E6E27" />
          </radialGradient>
          <path id={`arc-${size}`}
            d={`M ${r - r * 0.78} ${r} a ${r * 0.78} ${r * 0.78} 0 1 1 ${r * 1.56} 0`}
            fill="none" />
        </defs>

        {/* outer ring */}
        <circle cx={r} cy={r} r={r - 1.5} fill="url(#brass-grad)" />
        {/* inset ring */}
        <circle cx={r} cy={r} r={r - 7} fill="none" stroke="#fff8e3" strokeOpacity="0.45" strokeWidth="1.2" />
        <circle cx={r} cy={r} r={r - 6} fill="none" stroke="#5a4416" strokeOpacity="0.35" strokeWidth="0.8" />

        {/* arc text — MATH VERIFIED */}
        <text fill="#3a2c0d" fontSize={size * 0.115} fontWeight="700" letterSpacing="2.2" fontFamily="Inter, sans-serif">
          <textPath href={`#arc-${size}`} startOffset="50%" textAnchor="middle">
            MATH · VERIFIED · ✦
          </textPath>
        </text>

        {/* check mark */}
        <path
          d={`M ${r - r * 0.32} ${r + r * 0.06} L ${r - r * 0.05} ${r + r * 0.3} L ${r + r * 0.42} ${r - r * 0.22}`}
          stroke="#1a1308" strokeWidth={Math.max(3, size * 0.05)} strokeLinecap="round" strokeLinejoin="round" fill="none"
        />
      </svg>
      {/* sparkle */}
      <span style={{
        position: "absolute",
        right: -3, top: -3,
        width: size * 0.18, height: size * 0.18,
      }}>
        <svg viewBox="0 0 20 20" width="100%" height="100%">
          <path d="M10 1 L11 8.5 L19 10 L11 11.5 L10 19 L9 11.5 L1 10 L9 8.5 Z" fill="#fef4d8" />
        </svg>
      </span>
    </div>
  );
}

/* ─────────── Equation typesetting ─────────── */
function MathRow({ op, value, label, dim }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "28px 1fr auto",
      alignItems: "baseline",
      padding: "10px 0",
      borderTop: "1px solid var(--divider)",
      opacity: dim ? 0.55 : 1,
    }}>
      <div style={{
        fontFamily: "var(--font-display)",
        fontSize: 22,
        color: op === "=" ? "var(--brass-700)" : "var(--fg-3)",
        lineHeight: 1,
      }}>{op}</div>
      <div>
        <div style={{ fontSize: 13, color: "var(--fg-3)", lineHeight: 1.3 }}>{label}</div>
      </div>
      <Rupee value={value} className="ca-display" style={{ fontSize: 24, color: "var(--fg-1)", letterSpacing: "-0.01em" }} />
    </div>
  );
}

function MathBlock({ C, prize, commission, dividend, members }) {
  return (
    <div style={{
      position: "relative",
      background: "var(--bg-2)",
      borderRadius: 18,
      border: "1px solid var(--divider)",
      padding: "16px 18px 18px",
      overflow: "hidden",
    }}>
      {/* faint guilloché — the only screen that earns it */}
      <div className="ca-guilloche" style={{ position: "absolute", inset: 0, opacity: 0.45, pointerEvents: "none" }} />

      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--brass-700)" }}>
            The math
          </div>
          <div style={{ fontSize: 11, color: "var(--fg-3)", fontStyle: "italic", fontFamily: "var(--font-display)" }}>
            Chit Funds Act, 1982 §13
          </div>
        </div>

        {/* The pot — top line, bigger */}
        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-3)" }}>The pot</div>
          </div>
          <Rupee value={C} className="ca-display" style={{ fontSize: 34, color: "var(--fg-1)", letterSpacing: "-0.02em" }} />
        </div>

        {/* Components */}
        <div style={{ marginTop: 16 }}>
          <MathRow op="=" value={prize} label="winner takes" />
          <MathRow op="+" value={commission} label="foreman commission · 5%" />
          <MathRow op="+" value={dividend * members} label={`dividend pool — ${members} members × ${fmtINR(dividend)}`} />
        </div>

        {/* Seal row */}
        <div style={{
          marginTop: 18,
          paddingTop: 16,
          borderTop: "1px dashed var(--divider-2)",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}>
          <VerifiedSeal size={68} />
          <div>
            <div className="ca-display" style={{ fontSize: 20, color: "var(--fg-1)", letterSpacing: "-0.005em", lineHeight: 1.1 }}>
              Math verified
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4, lineHeight: 1.4 }}>
              Every rupee of the pot is accounted for. No money sits in the app.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Header ─────────── */
function ReceiptHeader({ historical }) {
  return (
    <div style={{ padding: "8px 20px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button style={navBtn9}>
          <svg width="22" height="22" viewBox="0 0 22 22"><path d="M13 4l-6 7 6 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div style={{ fontSize: 13, color: "var(--fg-3)", fontWeight: 600 }}>
          Cycle 5 receipt
        </div>
        <button style={navBtn9}>
          <svg width="22" height="22" viewBox="0 0 22 22"><path d="M11 4v10M6 9l5 5 5-5M5 18h12" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--brass-700)" }}>
          {historical ? "Recorded · Sat, Mar 16 · 8:42 PM" : "Cycle 5 conducted · Mar 16, 10:42 PM"}
        </div>
        <h1 className="ca-display" style={{ fontSize: 32, lineHeight: 1.1, margin: "8px 0 0", color: "var(--fg-1)", letterSpacing: "-0.02em" }}>
          {historical ? "Cycle 5 was a draw for ₹70,000." : "Recorded. Here's the receipt."}
        </h1>
      </div>
    </div>
  );
}
const navBtn9 = {
  width: 36, height: 36, borderRadius: 18,
  background: "transparent", border: 0, cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  color: "var(--fg-2)", padding: 0,
};

/* ─────────── Winner card ─────────── */
function WinnerCard({ name, initials, color, prize }) {
  return (
    <div style={{
      background: "var(--bg-2)",
      borderRadius: 18,
      padding: "16px 18px",
      border: "1px solid var(--divider)",
      display: "flex", alignItems: "center", gap: 16,
    }}>
      <Avatar initials={initials} color={color} size={56} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--brass-700)" }}>
          Prized this cycle
        </div>
        <div style={{ marginTop: 4, fontSize: 18, fontWeight: 600, color: "var(--fg-1)", letterSpacing: "-0.005em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
        <div style={{ marginTop: 4, fontSize: 12.5, color: "var(--fg-3)" }}>
          Foreman pays the prize outside the app
        </div>
      </div>
      <Rupee value={prize} className="ca-display" style={{ fontSize: 26, color: "var(--fg-1)", letterSpacing: "-0.015em" }} />
    </div>
  );
}

/* ─────────── Dividend table ─────────── */
function DividendTable({ open, onToggle, members, perMember }) {
  const shown = open ? members : members.slice(0, 5);
  return (
    <div style={{
      background: "var(--bg-2)",
      borderRadius: 16,
      border: "1px solid var(--divider)",
      padding: "4px 16px",
    }}>
      <div style={{
        padding: "12px 0 8px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-3)" }}>
            Dividend back to everyone
          </div>
          <div style={{ marginTop: 2, fontSize: 12.5, color: "var(--fg-2)" }}>
            <Rupee value={perMember} /> credited to all <span className="ca-tnum">20</span> members
          </div>
        </div>
      </div>
      {shown.map((m, i) => (
        <div key={m.name} style={{
          borderTop: "1px solid var(--divider)",
          padding: "10px 0",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <Avatar initials={m.initials} color={m.color} size={28} />
          <div style={{ flex: 1, minWidth: 0, fontSize: 14, color: "var(--fg-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</div>
          <Rupee value={perMember} className="ca-tnum" style={{ fontSize: 14, fontWeight: 600, color: "var(--paid-fg)" }} />
        </div>
      ))}
      <button onClick={onToggle} style={{
        width: "100%", background: "transparent", border: 0, cursor: "pointer",
        padding: "12px 0", borderTop: "1px solid var(--divider)",
        color: "var(--primary)", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
      }}>
        {open ? "Show fewer" : `Show all ${members.length}`}
      </button>
    </div>
  );
}

/* ─────────── Personalised line ─────────── */
function PersonalNote({ youAreWinner }) {
  if (youAreWinner) {
    return (
      <div style={{
        background: "color-mix(in oklab, var(--brass-500) 12%, var(--bg-2))",
        border: "1px solid color-mix(in oklab, var(--brass-500) 40%, transparent)",
        borderRadius: 14, padding: "12px 14px",
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--brass-700)" }}>What this means for you</div>
        <div style={{ marginTop: 6, fontSize: 14, color: "var(--fg-1)", lineHeight: 1.5 }}>
          You won this cycle. Foreman will hand over <b><Rupee value={70000} /></b> outside the app.
          Your next due is still <b><Rupee value={3750} /></b>, on Apr 15.
        </div>
      </div>
    );
  }
  return (
    <div style={{
      background: "color-mix(in oklab, var(--primary) 8%, var(--bg-2))",
      border: "1px solid color-mix(in oklab, var(--primary) 18%, transparent)",
      borderRadius: 14, padding: "12px 14px",
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--primary)" }}>What this means for you</div>
      <div style={{ marginTop: 6, fontSize: 14, color: "var(--fg-1)", lineHeight: 1.55 }}>
        Your next due is <b><Rupee value={3750} /></b> on Apr 15 —{" "}
        <span style={{ color: "var(--paid-fg)", fontWeight: 600 }}>down <Rupee value={1250} /> from last cycle</span>.
      </div>
    </div>
  );
}

/* ─────────── Body ─────────── */
function ReceiptBody({ state }) {
  const [expanded, setExpanded] = useState(false);
  const youWin = state === "you-won";
  const C = 100000;
  const prize = 70000;
  const commission = 5000;
  const dividend = 1250;
  const allMembers = [...MEMBERS.slice(0, 7), ...Array.from({ length: 13 }, (_, k) => ({
    name: ["Meera Pillai","Arjun Nair","Rohit Subramanian","Deepa Iyer","Vikram Rao","Sangeeta Pandian","Naveen Kumar","Aishwarya Krishnan","Manish Gupta","Pooja Anand","Bharath Reddy","Kavitha Menon","Sandeep Joseph"][k],
    initials: ["MP","AN","RS","DI","VR","SP","NK","AK","MG","PA","BR","KM","SJ"][k],
    color: ["#C9A24B","#E7C77A","#7CC79E","#E5A89A","#9AB5D8","#D8B8E5","#C9A24B"][k % 7],
  }))];

  return (
    <div style={{
      flex: 1,
      overflowY: "auto",
      padding: "16px 20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 14,
    }}>
      <WinnerCard
        name={youWin ? "You — Ravi Krishnan" : "Karthik Reddy"}
        initials={youWin ? "RK" : "KR"}
        color={youWin ? "var(--brass-500)" : "#9AB5D8"}
        prize={prize}
      />
      <MathBlock C={C} prize={prize} commission={commission} dividend={dividend} members={20} />
      <PersonalNote youAreWinner={youWin} />
      <DividendTable members={allMembers} perMember={dividend} open={expanded} onToggle={() => setExpanded(!expanded)} />
    </div>
  );
}

/* ─────────── Bottom CTA bar ─────────── */
function ReceiptCTAs() {
  return (
    <div style={{
      padding: "12px 20px 22px",
      borderTop: "1px solid var(--divider)",
      background: "var(--bg)",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <button className="ca-btn ca-btn-primary" style={{
        background: "#1FA855",
        color: "#fff",
      }}>
        {/* WhatsApp glyph */}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M10 1.5A8.5 8.5 0 002.5 14.6L1.5 18.5l4-1A8.5 8.5 0 1010 1.5zm0 1.6a6.9 6.9 0 015.9 10.5l.4 2.4-2.5-.4A6.9 6.9 0 0110 3.1zm-3 3.6c-.2 0-.4.1-.6.3-.2.2-.7.7-.7 1.7 0 1 .7 2 .8 2.1.1.1 1.4 2.2 3.4 3 .5.2.9.3 1.2.4.5.1 1 .1 1.4 0 .4 0 1.2-.5 1.4-1 .2-.4.2-.8.1-.9-.1-.1-.3-.2-.6-.3-.3-.2-1.2-.6-1.4-.7-.2-.1-.3-.1-.5.1-.1.2-.5.7-.6.8-.1.1-.2.1-.4 0-.2-.1-.9-.4-1.7-1-.6-.6-1-1.3-1.1-1.5-.1-.2 0-.3.1-.4l.4-.5.2-.4c.1-.1 0-.3 0-.4l-.6-1.4c-.2-.4-.3-.3-.5-.3z" />
        </svg>
        Share to WhatsApp
      </button>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={secondaryBtn}>View full ledger</button>
        <button style={{ ...secondaryBtn, opacity: 0.55, cursor: "not-allowed" }}>
          Open as PDF · soon
        </button>
      </div>
    </div>
  );
}
const secondaryBtn = {
  flex: 1, padding: "13px", fontFamily: "inherit",
  background: "var(--bg-2)", color: "var(--fg-1)",
  borderRadius: 12, border: "1px solid var(--divider)",
  fontSize: 14, fontWeight: 600, cursor: "pointer",
};

/* ─────────── Share-sheet preview state ─────────── */
function ShareSheet() {
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1 }} />
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 2,
        background: "var(--bg)",
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: "8px 20px 26px",
        boxShadow: "0 -20px 40px -10px rgba(0,0,0,.2)",
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--divider-2)", margin: "10px auto 10px" }} />

        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-3)" }}>
          Share to WhatsApp
        </div>
        <div style={{
          marginTop: 10,
          background: "color-mix(in oklab, #1FA855 8%, var(--bg-2))",
          border: "1px solid color-mix(in oklab, #1FA855 30%, transparent)",
          borderRadius: 14,
          padding: 14,
          fontSize: 13.5, lineHeight: 1.55,
          color: "var(--fg-1)",
        }}>
          <b>Cycle 5 of Anna Nagar Family Chit — done.</b><br />
          🏆 Karthik Reddy won, took ₹70,000.<br />
          ✓ Math verified — every rupee accounted for.<br />
          💰 Your dividend this cycle: ₹1,250.<br />
          📅 Next due: <b>₹3,750 by Apr 15.</b><br />
          <span style={{ color: "var(--fg-3)" }}>chitti://group/anna-nagar</span>
        </div>

        <div style={{
          marginTop: 14, display: "flex", gap: 10, alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--fg-2)" }}>
            <input type="checkbox" checked readOnly /> Send to all 20 members
          </div>
        </div>

        <button className="ca-btn ca-btn-primary" style={{
          marginTop: 16,
          background: "#1FA855", color: "#fff",
        }}>
          Open WhatsApp
        </button>
      </div>
    </>
  );
}

function CycleReceiptScreen({ theme = "light", state = "fresh", time = "9:41" }) {
  // state: fresh | historical | you-won | share
  return (
    <Screen theme={theme} time={time}>
      <div style={{ display: "flex", flexDirection: "column", height: "calc(844px - 47px - 24px)" }}>
        <ReceiptHeader historical={state === "historical"} />
        <ReceiptBody state={state} />
        <ReceiptCTAs />
      </div>
      {state === "share" && <ShareSheet />}
    </Screen>
  );
}

window.CycleReceiptScreen = CycleReceiptScreen;
window.VerifiedSeal = VerifiedSeal;
