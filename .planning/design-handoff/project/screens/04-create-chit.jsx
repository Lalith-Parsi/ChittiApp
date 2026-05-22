// Screen 04 — Create chit group (form)
//
// Key choices:
// • Education is part of the form. Each parameter has a plain-English helper, and three of
//   them (subscription, commission, dividend) show their derived rupee value LIVE as the
//   user moves a number. The user learns the math by feeling it.
// • Two Act-anchored sliders (commission ≤ 5%, max discount ≤ 30%) — the slider track is
//   labelled with the legal cap so the user can never accidentally violate it.
// • The "Confirming" state quotes the chit back as a single readable sentence rather than a
//   summary table — same vocabulary the user will see in the group later.

const { useState } = React;

/* ─────────── Atoms ─────────── */
function FieldGroup({ label, helper, children, error }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <label style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-1)", letterSpacing: "-0.005em" }}>{label}</label>
      </div>
      {helper && <div style={{ fontSize: 12.5, color: "var(--fg-3)", lineHeight: 1.45, marginBottom: 10 }}>{helper}</div>}
      {children}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, color: "var(--err-fg)", fontSize: 12.5, fontWeight: 500 }}>
          <Warn size={13} color="var(--err-fg)" />
          {error}
        </div>
      )}
    </div>
  );
}

function PercentSlider({ value, max, cap, onChange, capLabel }) {
  // cap is a hard limit (Act-mandated); max is the slider's range (= cap for these).
  const pct = (value / max) * 100;
  return (
    <div>
      <div style={{
        position: "relative",
        height: 40,
        background: "var(--bg-2)",
        borderRadius: 12,
        padding: "0 14px",
        display: "flex",
        alignItems: "center",
      }}>
        {/* track */}
        <div style={{ position: "absolute", left: 14, right: 14, top: "50%", height: 4, background: "var(--divider-2)", borderRadius: 2, transform: "translateY(-50%)" }} />
        <div style={{ position: "absolute", left: 14, width: `calc((100% - 28px) * ${pct / 100})`, top: "50%", height: 4, background: "var(--primary)", borderRadius: 2, transform: "translateY(-50%)" }} />
        {/* thumb */}
        <div style={{
          position: "absolute",
          left: `calc(14px + (100% - 28px) * ${pct / 100})`,
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: 22, height: 22,
          borderRadius: "50%",
          background: "var(--bg)",
          border: "2px solid var(--primary)",
          boxShadow: "0 2px 6px rgba(0,0,0,.12)",
        }} />
      </div>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        marginTop: 6,
        fontSize: 11, color: "var(--fg-3)",
        fontVariantNumeric: "tabular-nums",
      }}>
        <span>0%</span>
        <span style={{ color: "var(--fg-2)", fontWeight: 600 }}>
          <span className="ca-tnum">{value}%</span> · {capLabel}
        </span>
        <span>{cap}%</span>
      </div>
    </div>
  );
}

function NumberStepper({ value, onChange, min = 2, max = 60 }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      background: "var(--bg-2)",
      borderRadius: 12,
      padding: 4,
      width: "100%",
    }}>
      <button onClick={() => onChange(Math.max(min, value - 1))} style={stepBtnStyle}>−</button>
      <div style={{
        flex: 1, textAlign: "center",
        fontSize: 22, fontWeight: 600,
        color: "var(--fg-1)",
        fontFamily: "var(--font-num)",
        fontVariantNumeric: "tabular-nums",
      }}>{value}</div>
      <button onClick={() => onChange(Math.min(max, value + 1))} style={stepBtnStyle}>+</button>
    </div>
  );
}
const stepBtnStyle = {
  width: 40, height: 40,
  borderRadius: 10,
  background: "transparent",
  border: 0, cursor: "pointer",
  fontSize: 22, fontWeight: 500,
  color: "var(--fg-1)",
};

function SegmentedControl({ options, value, onChange }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${options.length}, 1fr)`,
      background: "var(--bg-2)",
      borderRadius: 10,
      padding: 3,
      gap: 0,
    }}>
      {options.map(opt => {
        const isActive = value === opt.id;
        const isDisabled = opt.disabled;
        return (
          <button
            key={opt.id}
            disabled={isDisabled}
            onClick={() => !isDisabled && onChange(opt.id)}
            style={{
              padding: "10px 8px",
              borderRadius: 8,
              border: 0,
              cursor: isDisabled ? "not-allowed" : "pointer",
              background: isActive ? "var(--bg)" : "transparent",
              boxShadow: isActive ? "0 1px 2px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)" : "none",
              color: isDisabled ? "var(--fg-3)" : isActive ? "var(--fg-1)" : "var(--fg-2)",
              fontSize: 13, fontWeight: 600,
              fontFamily: "inherit",
              opacity: isDisabled ? 0.5 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
            }}
          >
            {opt.label}
            {isDisabled && <span style={{ fontSize: 10, fontWeight: 500, color: "var(--brass-500)", marginLeft: 4 }}>soon</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────── Form body ─────────── */
function CreateChit({ state = "filling" }) {
  // state: empty | filling | invalid | confirming

  const [name, setName] = useState(state === "empty" ? "" : "Anna Nagar Family Chit");
  const [chitValue, setChitValue] = useState(state === "empty" ? 0 : 100000);
  const [members, setMembers] = useState(state === "empty" ? 12 : 20);
  const [commission, setCommission] = useState(state === "invalid" ? 7 : 5);
  const [maxDiscount, setMaxDiscount] = useState(30);
  const [dueDay, setDueDay] = useState(15);
  const [drawType, setDrawType] = useState("lottery");
  const [startMonth, setStartMonth] = useState("April 2026");

  const subscription = members > 0 ? Math.round(chitValue / members) : 0;
  const commissionAmt = Math.round(chitValue * commission / 100);
  const isCommissionInvalid = commission > 5;

  return (
    <div style={{
      padding: "16px 0 0",
      display: "flex",
      flexDirection: "column",
      height: "calc(844px - 47px - 24px)",
    }}>
      {/* Header bar */}
      <div style={{
        padding: "0 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button style={{
          background: "transparent", border: 0, padding: "6px 6px 6px 0", cursor: "pointer",
          color: "var(--fg-2)", fontSize: 16, fontWeight: 500,
        }}>Cancel</button>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--fg-1)" }}>New chit</div>
        <button style={{
          background: "transparent", border: 0, padding: "6px 0 6px 6px", cursor: "pointer",
          color: "var(--fg-2)", fontSize: 15, fontWeight: 500,
        }}>Save draft</button>
      </div>

      {/* Scrollable body */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "20px 24px 16px",
      }}>
        {/* Group name */}
        <FieldGroup label="Group name" helper="What you'll call it. Members will see this on their phones.">
          <div className="ca-field">
            <input
              className="ca-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Anna Nagar Family Chit"
            />
          </div>
        </FieldGroup>

        {/* Chit value */}
        <FieldGroup label="Chit value" helper="The pot every cycle — what everyone pools each month, in total.">
          <div className="ca-field">
            <span style={{ fontSize: 22, color: "var(--fg-2)", fontWeight: 500 }}>₹</span>
            <input
              className="ca-input ca-tnum"
              inputMode="numeric"
              value={chitValue ? fmtINR(chitValue) : ""}
              onChange={(e) => setChitValue(parseInt(e.target.value.replace(/\D/g, "")) || 0)}
              placeholder="1,00,000"
              style={{ fontSize: 26, fontWeight: 500 }}
            />
          </div>
        </FieldGroup>

        {/* Members */}
        <FieldGroup label="Number of members" helper="This is also how many months the chit runs.">
          <NumberStepper value={members} onChange={setMembers} />
          {/* Derived — subscription */}
          <div style={{
            marginTop: 10, padding: "10px 14px",
            background: "color-mix(in oklab, var(--primary) 8%, var(--bg-2))",
            border: "1px solid color-mix(in oklab, var(--primary) 14%, transparent)",
            borderRadius: 10,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div style={{ fontSize: 12.5, color: "var(--fg-2)" }}>
              Each member pays
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--primary)" }}>
              <Rupee value={subscription} /> / month
            </div>
          </div>
        </FieldGroup>

        {/* Commission */}
        <FieldGroup
          label="Foreman commission"
          helper="Your fee for running the chit. The Chit Funds Act, 1982 caps this at 5%."
          error={isCommissionInvalid ? "Commission cannot exceed the 5% legal cap." : null}
        >
          <PercentSlider value={commission} max={isCommissionInvalid ? 10 : 5} cap={5} onChange={setCommission} capLabel="Act cap" />
          <div style={{
            marginTop: 10, padding: "10px 14px",
            background: "var(--bg-2)",
            borderRadius: 10,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div style={{ fontSize: 12.5, color: "var(--fg-2)" }}>You earn per cycle</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: isCommissionInvalid ? "var(--err-fg)" : "var(--fg-1)" }}>
              <Rupee value={commissionAmt} />
            </div>
          </div>
        </FieldGroup>

        {/* Max discount */}
        <FieldGroup
          label="Maximum discount"
          helper="How much a bidder can give up in the auction. Act cap is 30%."
        >
          <PercentSlider value={maxDiscount} max={30} cap={30} onChange={setMaxDiscount} capLabel="Act cap" />
        </FieldGroup>

        {/* Payment due day */}
        <FieldGroup label="Payment due day" helper="Day of every month when subscriptions are due.">
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 6,
          }}>
            {[1, 5, 10, 15, 20, 25, 28].map(d => (
              <button key={d}
                onClick={() => setDueDay(d)}
                style={{
                  padding: "10px 0",
                  borderRadius: 8,
                  background: dueDay === d ? "var(--primary)" : "var(--bg-2)",
                  color: dueDay === d ? "var(--primary-fg)" : "var(--fg-1)",
                  border: 0, cursor: "pointer",
                  fontSize: 14, fontWeight: 600,
                  fontFamily: "inherit",
                  fontVariantNumeric: "tabular-nums",
                }}>
                {d}
              </button>
            ))}
          </div>
        </FieldGroup>

        {/* Draw type */}
        <FieldGroup label="Draw type" helper="How the winner is chosen each cycle. You can mix lottery + auction across cycles.">
          <SegmentedControl
            value={drawType}
            onChange={setDrawType}
            options={[
              { id: "lottery", label: "Lottery" },
              { id: "manual",  label: "Manual entry" },
              { id: "auction", label: "Auction", disabled: true },
            ]}
          />
        </FieldGroup>

        {/* Start */}
        <FieldGroup label="Starting month" helper="First cycle's subscription will be due that month.">
          <button style={{
            width: "100%",
            background: "var(--bg-2)",
            borderRadius: 12,
            padding: "14px 16px",
            border: 0, cursor: "pointer",
            fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            color: "var(--fg-1)", fontSize: 16, fontWeight: 500,
          }}>
            {startMonth}
            <ChevronDown size={18} color="var(--fg-3)" />
          </button>
        </FieldGroup>

        <div style={{ height: 8 }} />
      </div>

      {/* Sticky CTA bar */}
      <div style={{
        padding: "12px 24px 24px",
        borderTop: "1px solid var(--divider)",
        background: "var(--bg)",
      }}>
        <button
          className="ca-btn ca-btn-primary"
          disabled={isCommissionInvalid || !name || chitValue < 1000}
        >
          Review and create
        </button>
      </div>
    </div>
  );
}

/* ─────────── Confirming sheet ─────────── */
function ConfirmingSheet() {
  return (
    <>
      {/* dim */}
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 1,
      }} />
      {/* sheet */}
      <div style={{
        position: "absolute",
        left: 0, right: 0, bottom: 0,
        zIndex: 2,
        background: "var(--bg)",
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: "8px 24px 28px",
        boxShadow: "0 -20px 40px -10px rgba(0,0,0,.2)",
      }}>
        {/* Grabber */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--divider-2)", margin: "10px auto 8px" }} />
        <h2 className="ca-display" style={{
          fontSize: 26, lineHeight: 1.15, margin: "12px 0 6px",
          color: "var(--fg-1)", letterSpacing: "-0.01em", textWrap: "balance",
        }}>
          You're about to start this chit.
        </h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--fg-2)", margin: "0 0 18px" }}>
          A <b style={{ color: "var(--fg-1)" }}>20-member, 20-month</b> chit with a{" "}
          <b style={{ color: "var(--fg-1)" }}>₹1,00,000</b> pot. Each member pays{" "}
          <b style={{ color: "var(--fg-1)" }}>₹5,000</b> a month before any discount.
          You'll earn <b style={{ color: "var(--fg-1)" }}>₹5,000</b> per cycle as foreman.
        </p>

        <div style={{
          background: "var(--bg-2)",
          borderRadius: 14,
          padding: "14px 16px",
          marginBottom: 18,
          display: "flex", flexDirection: "column", gap: 8,
          fontSize: 13.5,
        }}>
          <Row label="Starts" value="April 2026 · cycle 1 of 20" />
          <Row label="Due day" value="15th of every month" />
          <Row label="Draw" value="Lottery (you can change per cycle)" />
          <Row label="Max discount" value="30% — the Act cap" />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button style={{
            flex: 1, padding: 16, fontFamily: "inherit",
            background: "var(--bg-2)", color: "var(--fg-1)",
            borderRadius: 14, border: 0, fontSize: 15, fontWeight: 600, cursor: "pointer",
          }}>
            Go back
          </button>
          <button className="ca-btn ca-btn-primary" style={{ flex: 1.4, width: "auto" }}>
            Create chit
          </button>
        </div>
      </div>
    </>
  );
}
function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ color: "var(--fg-3)" }}>{label}</span>
      <span style={{ color: "var(--fg-1)", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function CreateChitScreen({ theme = "light", state = "filling", time = "9:41" }) {
  return (
    <Screen theme={theme} time={time}>
      <CreateChit state={state} />
      {state === "confirming" && <ConfirmingSheet />}
    </Screen>
  );
}

window.CreateChitScreen = CreateChitScreen;
