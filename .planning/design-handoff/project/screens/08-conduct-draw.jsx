// Screen 08 — Conduct draw
//
// Two modes: Lottery (auto pick from eligible) and Manual entry (auction-style).
// Key UX choices:
// • The eligibility filter is shown as a sentence, not a count badge — "Eligible: 16 of
//   20 (4 already prized)". The user understands at a glance why some members are absent.
// • The Lottery rolling animation shows a vertical stack of names blurring downward as
//   the wheel decelerates. Not casino — feels closer to a railway-station split-flap board.
// • In Manual entry, the "money-conservation invariant" prints LIVE inline as a single
//   readable equation, with a brass tick when it balances. The user is taught to expect
//   it before they ever see screen 09's receipt.
// • Validation rule "prize ≥ chit_value × (1 − d_max)" is enforced by clamping the input;
//   above the cap, the equation stays visible but greys, and the CTA blocks with a calm
//   single-line reason.

const { useState } = React;

const ELIGIBLE = [
  { name: "Ravi Krishnan", initials: "RK", color: "#C9A24B" },
  { name: "Karthik Reddy", initials: "KR", color: "#9AB5D8" },
  { name: "Lakshmi Pillai", initials: "LP", color: "#D8B8E5" },
  { name: "Vinod Joseph", initials: "VJ", color: "#C9A24B" },
  { name: "Meera Pillai", initials: "MP", color: "#7CC79E" },
  { name: "Arjun Nair", initials: "AN", color: "#E7C77A" },
  { name: "Rohit Subramanian", initials: "RS", color: "#E5A89A" },
  { name: "Deepa Iyer", initials: "DI", color: "#9AB5D8" },
];

function DrawHeader({ mode, setMode }) {
  return (
    <div style={{ padding: "8px 20px 8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button style={navBtn8}>
          <svg width="22" height="22" viewBox="0 0 22 22"><path d="M13 4l-6 7 6 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div style={{ fontSize: 13, color: "var(--fg-3)", fontWeight: 600 }}>
          Cycle 5 · Anna Nagar Family Chit
        </div>
        <span style={{ width: 36 }} />
      </div>
      <h1 className="ca-display" style={{ fontSize: 30, lineHeight: 1.1, margin: "12px 0 0", color: "var(--fg-1)", letterSpacing: "-0.015em" }}>
        Conduct the draw
      </h1>
      <div style={{ fontSize: 13.5, color: "var(--fg-2)", marginTop: 4 }}>
        Everyone has paid — pick who takes this month's pot.
      </div>

      <div style={{ marginTop: 16 }}>
        <SegmentedDraw value={mode} onChange={setMode} />
      </div>
    </div>
  );
}
const navBtn8 = {
  width: 36, height: 36, borderRadius: 18,
  background: "transparent", border: 0, cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  color: "var(--fg-2)", padding: 0,
};

function SegmentedDraw({ value, onChange }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr",
      background: "var(--bg-2)", borderRadius: 12, padding: 4,
    }}>
      {[{id:"lottery",label:"Lottery"},{id:"manual",label:"Manual entry"}].map(t => {
        const a = value === t.id;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            padding: "10px 8px", borderRadius: 8, border: 0, cursor: "pointer",
            background: a ? "var(--bg)" : "transparent",
            boxShadow: a ? "0 1px 2px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)" : "none",
            color: a ? "var(--fg-1)" : "var(--fg-2)",
            fontSize: 14, fontWeight: 600, fontFamily: "inherit",
          }}>{t.label}</button>
        );
      })}
    </div>
  );
}

function EligibleBanner() {
  return (
    <div style={{
      margin: "16px 20px 0",
      padding: "10px 14px",
      borderRadius: 10,
      background: "var(--bg-2)",
      fontSize: 12.5, color: "var(--fg-2)",
      display: "flex", justifyContent: "space-between",
    }}>
      <span>Eligible <b style={{ color: "var(--fg-1)" }}>16 of 20</b></span>
      <span style={{ color: "var(--fg-3)" }}>4 already prized</span>
    </div>
  );
}

/* ─────────── Lottery ─────────── */
function LotteryView({ phase }) {
  // phase: idle | rolling | revealed
  if (phase === "revealed") {
    return <LotteryReveal />;
  }
  return (
    <div style={{ padding: "12px 20px 0", display: "flex", flexDirection: "column", flex: 1 }}>
      <EligibleBanner />

      {/* Roller window */}
      <div style={{
        marginTop: 18,
        background: "var(--bg-2)",
        borderRadius: 22,
        border: "1px solid var(--divider)",
        padding: 18,
        position: "relative",
        flex: 1,
        overflow: "hidden",
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
          color: "var(--fg-3)", alignSelf: "flex-start", marginBottom: 8,
        }}>The pot</div>
        <Rupee value={100000} className="ca-display" style={{ fontSize: 36, color: "var(--fg-1)", letterSpacing: "-0.02em", alignSelf: "flex-start" }} />

        <div style={{
          marginTop: 22,
          height: 200, width: "100%",
          position: "relative",
          overflow: "hidden",
          borderTop: "1px solid var(--divider-2)",
          borderBottom: "1px solid var(--divider-2)",
        }}>
          {/* Top + bottom fade */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2,
            background: "linear-gradient(180deg, var(--bg-2), transparent 28%, transparent 72%, var(--bg-2))",
          }} />
          {/* Center line */}
          <div style={{ position: "absolute", left: 14, right: 14, top: "50%", transform: "translateY(-50%)", height: 50, borderRadius: 10,
            background: "color-mix(in oklab, var(--primary) 10%, transparent)",
            border: "1px solid color-mix(in oklab, var(--primary) 40%, transparent)",
          }} />
          {/* Names */}
          <div style={{
            position: "absolute", left: 0, right: 0, top: "50%",
            transform: `translateY(${phase === "rolling" ? -240 : 0}px)`,
            transition: phase === "rolling" ? "transform 1200ms cubic-bezier(0.18, 0.9, 0.3, 1)" : "none",
            animation: phase === "rolling" ? "ca-roll 0.6s linear infinite" : "none",
          }}>
            <style>{`@keyframes ca-roll { to { transform: translateY(-100px); } }`}</style>
            {[...ELIGIBLE, ...ELIGIBLE].map((m, i) => (
              <div key={i} style={{
                height: 50, marginTop: i === 0 ? -25 : 0,
                display: "flex", alignItems: "center", gap: 12,
                padding: "0 18px",
                filter: phase === "rolling" ? "blur(0.5px)" : "none",
              }}>
                <Avatar initials={m.initials} color={m.color} size={32} />
                <span style={{
                  fontSize: 18, fontWeight: 500, color: "var(--fg-1)",
                  fontFamily: "var(--font-display)",
                }}>{m.name}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          className="ca-btn ca-btn-primary"
          disabled={phase === "rolling"}
          style={{ marginTop: 20, width: "100%" }}
        >
          {phase === "rolling" ? <><span className="ca-spin" /> Drawing…</> : <>Draw winner</>}
        </button>
        <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 10, textAlign: "center", padding: "0 16px" }}>
          Lottery prizes the full pot. No discount, no dividend — set foreman commission on the next screen.
        </div>
      </div>
    </div>
  );
}

function LotteryReveal() {
  return (
    <div style={{ padding: "16px 20px 0", display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{
        background: "var(--bg-2)",
        borderRadius: 22,
        border: "1px solid var(--divider)",
        padding: 22,
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* faint guilloché */}
        <div className="ca-guilloche" style={{
          position: "absolute", inset: 0, opacity: 0.5, pointerEvents: "none",
        }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--brass-500)" }}>
            Cycle 5 · Winner
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 16 }}>
            <Avatar initials="KR" color="#9AB5D8" size={72} />
            <div className="ca-display" style={{ fontSize: 28, color: "var(--fg-1)", letterSpacing: "-0.01em" }}>
              Karthik Reddy
            </div>
            <div style={{ fontSize: 12.5, color: "var(--fg-3)" }} className="ca-tnum">+91 97654 32109</div>
          </div>
          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-3)" }}>Prize</div>
            <Rupee value={100000} className="ca-display" style={{ fontSize: 44, color: "var(--fg-1)", letterSpacing: "-0.02em", display: "block", marginTop: 4 }} />
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 6 }}>
              Full pot · no discount in lottery
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ padding: "16px 0 24px" }}>
        <button className="ca-btn ca-btn-primary">
          Record cycle & open receipt <ArrowRight size={18} />
        </button>
        <button style={{
          marginTop: 10, width: "100%",
          padding: "12px", background: "transparent", border: 0, cursor: "pointer",
          color: "var(--fg-2)", fontSize: 14, fontWeight: 500, fontFamily: "inherit",
        }}>
          Re-roll
        </button>
      </div>
    </div>
  );
}

/* ─────────── Manual entry ─────────── */
function ManualView({ state }) {
  // state: empty | valid | invalid | confirming
  const C = 100000;
  const dMaxPct = 30;
  const fPct = 5;

  const seedPrize = {
    empty: 0,
    valid: 70000,
    invalid: 60000,
    confirming: 70000,
  }[state] || 0;
  const [prize, setPrize] = useState(seedPrize);

  const discount = prize ? C - prize : 0;
  const commission = Math.round(C * fPct / 100);
  const dividendPool = Math.max(0, discount - commission);
  const dividend = dividendPool / 20;
  const isAboveCap = discount > C * dMaxPct / 100;
  const isBelowZero = prize > C;
  const isInvalid = isAboveCap || isBelowZero || prize <= 0;

  return (
    <div style={{ padding: "12px 20px 0", display: "flex", flexDirection: "column", flex: 1, gap: 12 }}>
      <EligibleBanner />

      {/* Winner picker */}
      <div style={{ marginTop: 4 }}>
        <Label>Who's taking it this cycle?</Label>
        <button style={{
          width: "100%", marginTop: 6,
          background: "var(--bg-2)", border: 0, cursor: "pointer", fontFamily: "inherit",
          borderRadius: 12, padding: "14px 16px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          {state === "empty" ? (
            <>
              <div style={{ width: 36, height: 36, borderRadius: 18, background: "var(--bg-3)" }} />
              <span style={{ flex: 1, textAlign: "left", color: "var(--fg-3)", fontSize: 15 }}>Pick from 16 eligible members</span>
            </>
          ) : (
            <>
              <Avatar initials="KR" color="#9AB5D8" size={36} />
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-1)" }}>Karthik Reddy</div>
                <div style={{ fontSize: 12, color: "var(--fg-3)" }} className="ca-tnum">+91 97654 32109</div>
              </div>
            </>
          )}
          <ChevronDown size={18} color="var(--fg-3)" />
        </button>
      </div>

      {/* Prize amount */}
      <div>
        <Label>Prize amount (after discount)</Label>
        <div className="ca-field" style={{ marginTop: 6, padding: "12px 14px" }}>
          <span style={{ fontSize: 24, color: "var(--fg-2)", fontWeight: 500 }}>₹</span>
          <input
            className="ca-input ca-tnum"
            inputMode="numeric"
            value={prize ? fmtINR(prize) : ""}
            onChange={(e) => setPrize(parseInt(e.target.value.replace(/\D/g, "")) || 0)}
            placeholder="70,000"
            style={{ fontSize: 26, fontWeight: 500 }}
          />
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: isInvalid ? "var(--err-fg)" : "var(--fg-3)", display: "flex", alignItems: "center", gap: 6 }}>
          {isInvalid && <Warn size={12} color="var(--err-fg)" />}
          {isAboveCap
            ? <>Discount <Rupee value={discount} /> exceeds the 30% cap of <Rupee value={C*0.3} />.</>
            : prize > 0
              ? <>Discount <Rupee value={discount} /> · {Math.round(discount/C*100)}% of the pot</>
              : <>Enter what the winner is willing to take.</>
          }
        </div>
      </div>

      {/* Money-conservation invariant */}
      <ConservationBadge
        C={C}
        prize={prize}
        commission={commission}
        dividendPool={dividendPool}
        members={20}
        valid={!isInvalid && prize > 0}
      />

      <div style={{ flex: 1 }} />

      <div style={{ paddingBottom: 22 }}>
        <button
          className="ca-btn ca-btn-primary"
          disabled={isInvalid}
        >
          Conduct draw and record
        </button>
        <div style={{ fontSize: 11, color: "var(--fg-3)", textAlign: "center", marginTop: 8 }}>
          This will be recorded permanently. Every member sees it.
        </div>
      </div>
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)", letterSpacing: "-0.005em" }}>{children}</div>
  );
}

function ConservationBadge({ C, prize, commission, dividendPool, members, valid }) {
  const dividend = members > 0 ? dividendPool / members : 0;
  return (
    <div style={{
      borderRadius: 14,
      border: `1px solid ${valid ? "color-mix(in oklab, var(--brass-500) 50%, transparent)" : "var(--divider-2)"}`,
      background: valid ? "color-mix(in oklab, var(--brass-500) 8%, var(--bg-2))" : "var(--bg-2)",
      padding: "14px 16px",
      transition: "background .2s, border-color .2s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: valid ? "var(--brass-700)" : "var(--fg-3)" }}>
          The math · live
        </div>
        {valid && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 11, fontWeight: 600,
            color: "var(--brass-700)",
          }}>
            <Check size={12} color="var(--brass-700)" /> Balanced
          </span>
        )}
      </div>
      <div style={{ marginTop: 10, fontFamily: "var(--font-display)", fontSize: 17, lineHeight: 1.55, color: valid ? "var(--fg-1)" : "var(--fg-3)" }}>
        <Rupee value={C} /> <span style={{ color: "var(--fg-3)" }}>=</span> <Rupee value={prize} />
        {" "}<span style={{ color: "var(--fg-3)" }}>+</span> <Rupee value={commission} />
        {" "}<span style={{ color: "var(--fg-3)" }}>+</span> <Rupee value={Math.round(dividend)} /> <span style={{ color: "var(--fg-3)", fontSize: 14 }}>× {members}</span>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 8,
        marginTop: 12,
        fontSize: 11.5,
        color: "var(--fg-3)",
      }}>
        <div>Winner takes</div>
        <div>Your commission</div>
        <div>Each member back</div>
      </div>
    </div>
  );
}

/* ─────────── Confirm sheet (manual) ─────────── */
function ManualConfirmSheet() {
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1 }} />
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 2,
        background: "var(--bg)",
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: "8px 24px 28px",
        boxShadow: "0 -20px 40px -10px rgba(0,0,0,.2)",
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--divider-2)", margin: "10px auto 14px" }} />
        <h2 className="ca-display" style={{ fontSize: 24, lineHeight: 1.2, margin: "8px 0 6px", color: "var(--fg-1)", letterSpacing: "-0.01em" }}>
          Record this draw?
        </h2>
        <p style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.5, margin: "0 0 16px" }}>
          You're prizing <b style={{ color: "var(--fg-1)" }}>Karthik Reddy</b> for{" "}
          <b style={{ color: "var(--fg-1)" }}>₹70,000</b>. Every member will see this.
          You can't undo it — only correct it with a new entry in the audit log.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{
            flex: 1, padding: 16, fontFamily: "inherit",
            background: "var(--bg-2)", color: "var(--fg-1)",
            borderRadius: 14, border: 0, fontSize: 15, fontWeight: 600, cursor: "pointer",
          }}>Go back</button>
          <button className="ca-btn ca-btn-primary" style={{ flex: 1.4, width: "auto" }}>
            Yes, record
          </button>
        </div>
      </div>
    </>
  );
}

function ConductDrawScreen({ theme = "light", state = "lottery-idle", time = "9:41" }) {
  const [mode, setMode] = useState(state.startsWith("manual") ? "manual" : "lottery");
  return (
    <Screen theme={theme} time={time}>
      <div style={{ display: "flex", flexDirection: "column", height: "calc(844px - 47px - 24px)" }}>
        <DrawHeader mode={mode} setMode={setMode} />
        {mode === "lottery" ? (
          <LotteryView phase={
            state === "lottery-rolling" ? "rolling" :
            state === "lottery-revealed" ? "revealed" :
            "idle"
          } />
        ) : (
          <ManualView state={
            state === "manual-empty" ? "empty" :
            state === "manual-invalid" ? "invalid" :
            state === "manual-confirming" ? "confirming" :
            "valid"
          } />
        )}
      </div>
      {state === "manual-confirming" && <ManualConfirmSheet />}
    </Screen>
  );
}

window.ConductDrawScreen = ConductDrawScreen;
