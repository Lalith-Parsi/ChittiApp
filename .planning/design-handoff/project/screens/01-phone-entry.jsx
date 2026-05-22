// Screen 01 — Phone number entry (auth)
//
// Key choices:
// • Big quiet hero with the wordmark — first impression is "this is calm and trustworthy".
// • Country code +91 + India flag in a locked chip, not a real dropdown — there is no other
//   country in v1; pretending there is would be a lie. Tap shows a small tooltip explaining why.
// • Phone formatted live as "9XXXX XXXXX" (Indian 5-5), but the underlying value is just digits.
// • The "call me instead" affordance only appears in the post-30s state (not pre-empted) so the
//   first screen isn't crowded with options the user doesn't need yet.

const { useState, useEffect } = React;

/* Format raw digits into Indian "9XXXX XXXXX" pattern. */
function formatPhone(raw) {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 5) return d;
  return d.slice(0, 5) + " " + d.slice(5);
}

function PhoneEntry({ state = "default" }) {
  // state: default | invalid | loading | ratelimited | aftertimeout
  const seed = {
    default:      "",
    invalid:      "98123 45",        // too-short triggers inline error
    loading:      "98123 45678",
    ratelimited:  "98123 45678",
    aftertimeout: "98123 45678",
  }[state] || "";

  const [phone, setPhone] = useState(seed);
  useEffect(() => setPhone(seed), [state]);

  const digits = phone.replace(/\D/g, "");
  const isValid = digits.length === 10 && /^[6-9]/.test(digits);
  const showInlineError = state === "invalid";
  const showRateLimit  = state === "ratelimited";
  const showCallInstead = state === "aftertimeout" || state === "ratelimited";
  const isLoading = state === "loading";

  return (
    <>
      {/* Top strip — only the brand mark and a tiny version line.
          Centered visually slightly above optical center to leave room for the keyboard. */}
      <div style={{
        padding: "24px 28px 0",
        display: "flex",
        flexDirection: "column",
        height: "calc(844px - 47px - 24px)", // status bar + bottom inset
      }}>
        {/* Hero */}
        <div style={{ marginTop: 36 }}>
          <Wordmark size={48} />
          <div style={{
            marginTop: 18,
            fontSize: 22,
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
            color: "var(--fg-1)",
            fontWeight: 500,
            maxWidth: 280,
            textWrap: "balance",
          }}>
            Run a real chit fund from your phone.
          </div>
          <div style={{
            marginTop: 8,
            fontSize: 15,
            lineHeight: 1.45,
            color: "var(--fg-2)",
            maxWidth: 280,
            textWrap: "pretty",
          }}>
            Every member sees the same numbers. The math is always right.
          </div>
        </div>

        {/* Phone input block — sits well below the hero */}
        <div style={{ marginTop: 44 }}>
          <label style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--fg-2)",
            letterSpacing: "0.01em",
            display: "block",
            marginBottom: 8,
            paddingLeft: 4,
          }}>
            Your phone number
          </label>

          <div className={`ca-field ${showInlineError ? "is-error" : ""}`} style={{ padding: "10px 12px" }}>
            {/* Country code chip — locked */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 10,
              background: "var(--bg-3)",
              fontSize: 15,
              fontWeight: 600,
              color: "var(--fg-1)",
              flex: "0 0 auto",
            }}>
              <IndiaFlag size={16} />
              <span className="ca-tnum">+91</span>
            </div>

            <div style={{
              width: 1, height: 28,
              background: "var(--divider-2)",
              flex: "0 0 auto",
            }} />

            <input
              className="ca-input ca-tnum"
              inputMode="numeric"
              placeholder="98XXX XXXXX"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              style={{ fontSize: 20, fontWeight: 500, letterSpacing: "0.02em" }}
            />
          </div>

          {/* Inline message slot — shows error or rate-limit */}
          <div style={{ minHeight: 22, marginTop: 10, paddingLeft: 6 }}>
            {showInlineError && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 13, color: "var(--err-fg)", fontWeight: 500,
              }}>
                <Warn size={14} color="var(--err-fg)" />
                <span>Enter a 10-digit mobile number starting with 6-9.</span>
              </div>
            )}
            {showRateLimit && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 13, color: "var(--err-fg)", fontWeight: 500,
              }}>
                <Warn size={14} color="var(--err-fg)" />
                <span>Too many attempts. Try again in <span className="ca-tnum">60s</span>.</span>
              </div>
            )}
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1, minHeight: 16 }} />

        {/* CTA + footnote */}
        <div style={{ paddingBottom: 28 }}>
          <button
            className="ca-btn ca-btn-primary"
            disabled={!isLoading && (!isValid || showRateLimit)}
            style={ showRateLimit ? { opacity: 0.45 } : undefined }
          >
            {isLoading ? (
              <>
                <span className="ca-spin" />
                <span>Sending OTP…</span>
              </>
            ) : (
              <>
                <span>Send OTP</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>

          {/* Post-timeout affordance */}
          {showCallInstead && (
            <div style={{
              marginTop: 14,
              display: "flex",
              justifyContent: "center",
              gap: 4,
              fontSize: 14,
              color: "var(--fg-2)",
            }}>
              <span>Didn't get it?</span>
              <button className="ca-btn ca-btn-ghost" style={{
                padding: "0 2px",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--primary)",
                background: "transparent",
                minHeight: 0,
              }}>
                Call me instead
              </button>
            </div>
          )}

          {/* Legal */}
          <p style={{
            marginTop: showCallInstead ? 14 : 18,
            fontSize: 12,
            lineHeight: 1.5,
            color: "var(--fg-3)",
            textAlign: "center",
            padding: "0 18px",
          }}>
            By continuing you agree to our{" "}
            <span style={{ color: "var(--fg-2)", borderBottom: "1px solid var(--divider-2)" }}>Terms</span>
            {" "}and{" "}
            <span style={{ color: "var(--fg-2)", borderBottom: "1px solid var(--divider-2)" }}>Privacy Policy</span>.
            We'll send a one-time code to verify it's you.
          </p>
        </div>
      </div>
    </>
  );
}

/* Public wrapper combining Screen + theme */
function PhoneEntryScreen({ theme = "light", state = "default", time = "9:41" }) {
  return (
    <Screen theme={theme} time={time}>
      <PhoneEntry state={state} />
    </Screen>
  );
}

window.PhoneEntryScreen = PhoneEntryScreen;
