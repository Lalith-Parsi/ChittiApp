// Screen 02 — OTP entry
//
// Key choices:
// • Six independent boxes with auto-advance — feels like a passbook row, not a single input.
// • The number is shown unmasked. The user just typed it; masking it here would imply someone
//   else sent it to them. Showing it (with an Edit affordance) is more trustworthy.
// • Countdown ticks down a 60s window; "Call me instead" appears once the timer expires —
//   matching the affordance promised on screen 01.
// • Wrong code shakes briefly and turns the boxes' baseline red. Expired code = passive header
//   message (it's not the user's fault).

const { useState, useEffect, useRef } = React;

function OtpBoxes({ value, onChange, status }) {
  // status: typing | filled | wrong | expired | success
  const refs = useRef([]);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");
  const filledIdx = value.length;
  const showError = status === "wrong" || status === "expired";
  const showOk = status === "success";

  function set(i, char) {
    const c = char.replace(/\D/g, "").slice(-1);
    if (!c) return;
    const next = (value + c).slice(0, 6);
    onChange(next);
    if (next.length < 6) {
      const el = refs.current[next.length];
      if (el) el.focus();
    }
  }
  function back(i) {
    if (i === 0 && value.length === 0) return;
    const next = value.slice(0, Math.max(0, i));
    onChange(next);
    const el = refs.current[Math.max(0, i - 1)];
    if (el) el.focus();
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        justifyContent: "space-between",
        animation: status === "wrong" ? "ca-shake .4s cubic-bezier(.36,.07,.19,.97)" : "none",
      }}
    >
      <style>{`
        @keyframes ca-shake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
      `}</style>
      {digits.map((d, i) => {
        const isFocused = i === filledIdx && status === "typing";
        const isFilled = d.trim() !== "";
        return (
          <div
            key={i}
            style={{
              width: 48,
              height: 60,
              borderRadius: 12,
              background: "var(--bg-2)",
              border: `1.5px solid ${
                showError ? "var(--err-fg)" :
                showOk ? "var(--primary)" :
                isFocused ? "var(--primary)" :
                "transparent"
              }`,
              boxShadow: isFocused ? "0 0 0 4px color-mix(in oklab, var(--primary) 16%, transparent)" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 500,
              color: showError ? "var(--err-fg)" : "var(--fg-1)",
              fontVariantNumeric: "tabular-nums",
              fontFamily: "var(--font-num)",
              position: "relative",
              transition: "border-color .15s, box-shadow .15s",
            }}
          >
            {isFilled ? d : (isFocused ? <span style={{ width: 2, height: 26, background: "var(--primary)", borderRadius: 1, animation: "ca-blink 1s steps(2) infinite" }} /> : null)}
            {/* hidden input for keyboard focus capture per box */}
            <input
              ref={(el) => (refs.current[i] = el)}
              value={d.trim()}
              onChange={(e) => set(i, e.target.value)}
              onKeyDown={(e) => { if (e.key === "Backspace") back(i); }}
              inputMode="numeric"
              maxLength={1}
              aria-label={`Digit ${i + 1}`}
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0,
                border: 0,
                background: "transparent",
                font: "inherit",
                color: "transparent",
                caretColor: "transparent",
                outline: "none",
              }}
            />
            <style>{`@keyframes ca-blink { 50% { opacity: 0; } }`}</style>
          </div>
        );
      })}
    </div>
  );
}

function OtpEntry({ state = "typing" }) {
  // state: typing | filled | submitting | wrong | expired | success | aftertimeout
  const seedValue = {
    typing:       "412",
    filled:       "412908",
    submitting:   "412908",
    wrong:        "412908",
    expired:      "412908",
    success:      "412908",
    aftertimeout: "",
  }[state] || "";

  const [value, setValue] = useState(seedValue);
  useEffect(() => setValue(seedValue), [state]);

  const isFinal = ["wrong", "expired", "success", "submitting"].includes(state);
  const boxStatus =
    state === "wrong" ? "wrong" :
    state === "expired" ? "wrong" :
    state === "success" ? "success" :
    state === "submitting" ? "filled" :
    state === "filled" ? "filled" :
    "typing";

  const countdown = state === "aftertimeout" ? 0 : 42; // seconds

  return (
    <div style={{
      padding: "20px 28px 24px",
      display: "flex",
      flexDirection: "column",
      height: "calc(844px - 47px - 24px)",
    }}>
      {/* Back chevron — iOS pattern */}
      <button className="ca-btn-ghost" style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "6px 6px 6px 0",
        background: "transparent", border: 0, cursor: "pointer",
        color: "var(--fg-2)", fontSize: 16, fontWeight: 500,
        alignSelf: "flex-start",
      }}>
        <svg width="20" height="20" viewBox="0 0 20 20"><path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Back
      </button>

      {/* Header */}
      <div style={{ marginTop: 32 }}>
        <h1 className="ca-display" style={{
          fontSize: 36, lineHeight: 1.1,
          margin: 0,
          letterSpacing: "-0.015em",
          color: "var(--fg-1)",
        }}>
          Enter the 6-digit code
        </h1>
        <div style={{
          marginTop: 14,
          fontSize: 15, lineHeight: 1.5,
          color: "var(--fg-2)",
        }}>
          We sent it to{" "}
          <span style={{ color: "var(--fg-1)", fontWeight: 500 }} className="ca-tnum">+91 98765 43210</span>
          <span style={{ margin: "0 8px", color: "var(--fg-3)" }}>·</span>
          <button style={{
            background: "transparent", border: 0, padding: 0,
            color: "var(--primary)", fontWeight: 600, fontSize: 15,
            cursor: "pointer",
          }}>
            Edit
          </button>
        </div>
      </div>

      {/* Boxes */}
      <div style={{ marginTop: 36 }}>
        <OtpBoxes value={value} onChange={setValue} status={boxStatus} />

        {/* Inline status under the boxes — single line slot */}
        <div style={{ minHeight: 22, marginTop: 18, paddingLeft: 2 }}>
          {state === "wrong" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--err-fg)", fontSize: 13, fontWeight: 500 }}>
              <Warn size={14} color="var(--err-fg)" />
              <span>That code didn't match. Try again or resend.</span>
            </div>
          )}
          {state === "expired" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--err-fg)", fontSize: 13, fontWeight: 500 }}>
              <Warn size={14} color="var(--err-fg)" />
              <span>This code expired. We can send a new one.</span>
            </div>
          )}
          {state === "submitting" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--fg-2)", fontSize: 13, fontWeight: 500 }}>
              <span className="ca-spin" style={{ width: 14, height: 14 }} />
              <span>Verifying…</span>
            </div>
          )}
          {state === "success" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--paid-fg)", fontSize: 13, fontWeight: 600 }}>
              <Check size={16} color="var(--paid-fg)" />
              <span>Verified. Taking you in…</span>
            </div>
          )}
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Resend + Call me — single calm row */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        paddingBottom: 36,
      }}>
        {countdown > 0 ? (
          <div style={{
            fontSize: 14, color: "var(--fg-3)",
          }}>
            Resend code in <span className="ca-tnum" style={{ color: "var(--fg-2)", fontWeight: 600 }}>0:{String(countdown).padStart(2, "0")}</span>
          </div>
        ) : state === "expired" ? (
          <button className="ca-btn ca-btn-primary" style={{ width: "100%" }}>
            Send a new code
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--fg-2)" }}>
            <span>Didn't get it?</span>
            <button style={{
              background: "transparent", border: 0, padding: "4px 6px",
              color: "var(--primary)", fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}>Resend</button>
            <span style={{ color: "var(--fg-3)" }}>·</span>
            <button style={{
              background: "transparent", border: 0, padding: "4px 6px",
              color: "var(--primary)", fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}>Call me instead</button>
          </div>
        )}
      </div>
    </div>
  );
}

function OtpEntryScreen({ theme = "light", state = "typing", time = "9:41" }) {
  return (
    <Screen theme={theme} time={time}>
      <OtpEntry state={state} />
    </Screen>
  );
}

window.OtpEntryScreen = OtpEntryScreen;
