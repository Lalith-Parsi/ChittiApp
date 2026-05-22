// Design system summary — palette, type, spacing, components, signature interaction.
// Lives at the end of the canvas in its own section. Wider artboards than the phone
// screens — these are reference sheets, not screens.

/* ─────────── Reusable swatch row ─────────── */
function Swatch({ label, value, css, dark }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "10px 0",
      borderBottom: "1px solid var(--paper-200)",
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: value,
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1714" }}>{label}</div>
        <div style={{ fontSize: 12, color: "#7A7062", fontFamily: "var(--font-mono)", marginTop: 2 }}>{css}</div>
      </div>
      <div style={{ fontSize: 12, color: "#7A7062", fontFamily: "var(--font-mono)" }}>{value}</div>
    </div>
  );
}

function TokensColors() {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#FAF7F0", color: "#1A1714",
      padding: "32px 36px",
      fontFamily: "var(--font-body)",
      overflow: "auto",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#7A7062" }}>
        Design tokens · colors
      </div>
      <h1 className="ca-display" style={{ fontSize: 36, margin: "6px 0 4px", letterSpacing: "-0.015em" }}>
        Ledger green on paper warmth.
      </h1>
      <p style={{ fontSize: 14, color: "#4A4239", lineHeight: 1.55, maxWidth: 540, margin: "0 0 22px" }}>
        Two surfaces, two brand colors. Primary (ledger green) carries trust and action; brass shows up only on
        cycle receipts and the verified seal — earned, not decorative. All semantic colors are muted on purpose.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {/* Brand */}
        <div>
          <SectionLabel>Brand</SectionLabel>
          <Swatch label="Ledger 700 — primary (light)" value="#0F5132" css="--ledger-700" />
          <Swatch label="Ledger 500 — primary (dark)"  value="#2A8A5F" css="--ledger-500" />
          <Swatch label="Ledger 100 — paid pill"       value="#DCEEE4" css="--ledger-100" />
          <Swatch label="Brass 500 — receipt accent"   value="#C9A24B" css="--brass-500" />
          <Swatch label="Brass 300 — dark accent"      value="#E7C77A" css="--brass-300" />
        </div>

        {/* Surfaces */}
        <div>
          <SectionLabel>Surfaces · paper (light)</SectionLabel>
          <Swatch label="Paper 50 — canvas"   value="#FAF7F0" css="--paper-50" />
          <Swatch label="Paper 100 — card"    value="#F2EDE2" css="--paper-100" />
          <Swatch label="Paper 200 — divider" value="#E7E1D2" css="--paper-200" />
          <Swatch label="Fg 1 — primary text" value="#1A1714" css="--fg-l-1" />
          <Swatch label="Fg 2 — secondary"    value="#4A4239" css="--fg-l-2" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginTop: 22 }}>
        <div>
          <SectionLabel>Surfaces · ink (dark)</SectionLabel>
          <Swatch label="Ink 900 — canvas"      value="#0E1410" css="--ink-900" />
          <Swatch label="Ink 700 — card"        value="#1A2520" css="--ink-700" />
          <Swatch label="Ink 500 — elevated"    value="#232925" css="--ink-500" />
          <Swatch label="Fg d-1 — primary text" value="#ECE8DD" css="--fg-d-1" />
          <Swatch label="Fg d-2 — secondary"    value="#B5AE9F" css="--fg-d-2" />
        </div>

        <div>
          <SectionLabel>Semantic · muted</SectionLabel>
          <Swatch label="Paid · pill bg"     value="#DCEEE4" css="--paid-bg-l" />
          <Swatch label="Paid · fg"          value="#0F5132" css="--paid-fg-l" />
          <Swatch label="Pending · pill bg"  value="#F4E6C3" css="--pending-bg-l" />
          <Swatch label="Pending · fg"       value="#6B4F11" css="--pending-fg-l" />
          <Swatch label="Error · fg"         value="#8C3A26" css="--error-fg-l" />
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
      color: "#7A7062", marginBottom: 8,
    }}>{children}</div>
  );
}

function TokensTypeAndSpacing() {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#FAF7F0", color: "#1A1714",
      padding: "32px 36px",
      fontFamily: "var(--font-body)",
      overflow: "auto",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#7A7062" }}>
        Design tokens · type, spacing, radii
      </div>
      <h1 className="ca-display" style={{ fontSize: 36, margin: "6px 0 24px", letterSpacing: "-0.015em" }}>
        Inter for the work · Instrument Serif for the moments.
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 36 }}>
        <div>
          <SectionLabel>Type scale</SectionLabel>
          {[
            { name: "Display · receipt headline", size: 32, family: "Instrument Serif", weight: 400, sample: "Cycle 5 conducted." },
            { name: "Display · screen headline",  size: 26, family: "Instrument Serif", weight: 400, sample: "Mark this month's payments." },
            { name: "Display · big number",       size: 30, family: "Instrument Serif", weight: 400, sample: "₹1,00,000", tnum: true },
            { name: "UI · title",                 size: 16, family: "Inter",            weight: 600, sample: "Anna Nagar Family Chit" },
            { name: "UI · body",                  size: 14, family: "Inter",            weight: 400, sample: "You owe ₹3,750 by Mar 15." },
            { name: "UI · caption / footnote",    size: 12, family: "Inter",            weight: 500, sample: "Marked by Ravi · 10:42 today" },
            { name: "UI · eyebrow",               size: 11, family: "Inter",            weight: 600, sample: "DUE THIS WEEK", letterSpacing: "0.06em", upper: true },
          ].map(t => (
            <div key={t.name} style={{
              display: "grid", gridTemplateColumns: "180px 1fr",
              alignItems: "baseline", gap: 16,
              padding: "12px 0", borderBottom: "1px solid #E7E1D2",
            }}>
              <div style={{ fontSize: 12, color: "#7A7062" }}>
                <div style={{ color: "#1A1714", fontWeight: 600 }}>{t.name}</div>
                <div style={{ fontFamily: "var(--font-mono)", marginTop: 2 }}>
                  {t.size}px · {t.family} {t.weight}
                </div>
              </div>
              <div style={{
                fontFamily: t.family.includes("Instrument") ? "var(--font-display)" : "var(--font-body)",
                fontSize: t.size,
                fontWeight: t.weight,
                lineHeight: 1.15,
                letterSpacing: t.letterSpacing || (t.size > 24 ? "-0.015em" : "-0.005em"),
                textTransform: t.upper ? "uppercase" : "none",
                fontVariantNumeric: t.tnum ? "tabular-nums" : "normal",
                color: "#1A1714",
              }}>{t.sample}</div>
            </div>
          ))}
        </div>

        <div>
          <SectionLabel>Spacing scale · 4-base</SectionLabel>
          {[
            { name: "--s-1",  px: 4  },
            { name: "--s-2",  px: 8  },
            { name: "--s-3",  px: 12 },
            { name: "--s-4",  px: 16 },
            { name: "--s-5",  px: 20 },
            { name: "--s-6",  px: 24 },
            { name: "--s-8",  px: 32 },
            { name: "--s-10", px: 40 },
          ].map(s => (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0" }}>
              <div style={{ width: 80, fontSize: 12, fontFamily: "var(--font-mono)", color: "#7A7062" }}>{s.name}</div>
              <div style={{ width: 36, fontSize: 12, color: "#7A7062", fontVariantNumeric: "tabular-nums" }}>{s.px}px</div>
              <div style={{ width: s.px, height: 14, background: "#0F5132", borderRadius: 2 }} />
            </div>
          ))}

          <SectionLabel style={{ marginTop: 26 }}>Radius · calm, not pillowy</SectionLabel>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap", marginTop: 6 }}>
            {[
              { name: "--r-1", v: 6 },
              { name: "--r-2", v: 10 },
              { name: "--r-3", v: 14 },
              { name: "--r-4", v: 20 },
              { name: "pill", v: 999, w: 100 },
            ].map(r => (
              <div key={r.name} style={{ textAlign: "center" }}>
                <div style={{
                  width: r.w || 60, height: 60,
                  borderRadius: r.v, background: "#F2EDE2", border: "1px solid #E7E1D2",
                }} />
                <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#7A7062", marginTop: 4 }}>{r.name}</div>
              </div>
            ))}
          </div>

          <SectionLabel style={{ marginTop: 26 }}>Shadow · sparing</SectionLabel>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <div style={{ flex: 1, height: 70, borderRadius: 10, background: "#fff", boxShadow: "0 1px 0 rgba(28,22,12,.04), 0 0 0 1px rgba(28,22,12,.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#7A7062" }}>
              card · hairline
            </div>
            <div style={{ flex: 1, height: 70, borderRadius: 10, background: "#fff", boxShadow: "0 18px 40px -10px rgba(28,22,12,.18), 0 1px 0 rgba(28,22,12,.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#7A7062" }}>
              popover · drop
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComponentInventory() {
  const items = [
    { name: "Rupee",                  desc: "₹ + tabular-num INR amount (Indian comma grouping)." },
    { name: "RoleBadge",              desc: "\"You're the foreman\" vs \"Member\" — primary-tint vs neutral." },
    { name: "GroupCard",              desc: "Home list row: name, role, due, cycle dots, next draw. Left ledger stripe for foreman." },
    { name: "CycleDots",              desc: "Discrete cycle progress — one mark per month, current cycle widens." },
    { name: "MemberRow",              desc: "Avatar · name · prized pill · phone · paid pill + audit pin." },
    { name: "PaymentRow",             desc: "Member row with \"Mark paid\" CTA or paid pill + amount." },
    { name: "MarkPaymentSheet",       desc: "Bottom sheet: 5 mode-icon buttons (cash/UPI/bank/cheque/other), date, note." },
    { name: "ConservationBadge",      desc: "Live equation C = Prize + Commission + N×Dividend with a \"Balanced\" tick." },
    { name: "MathBlock",              desc: "Receipt-grade typeset equation, brass seal at bottom. Guilloché bg." },
    { name: "VerifiedSeal",           desc: "Brass disc · arc text · checkmark · sparkle. The signature mark." },
    { name: "DividendTable",          desc: "Collapsed-to-5 / expandable list of all members and their dividend." },
    { name: "EligibleBanner",         desc: "\"Eligible: 16 of 20 (4 already prized)\" — single calm line." },
    { name: "PercentSlider",          desc: "Slider with Act-cap label baked into the track scale." },
    { name: "SegmentedControl",       desc: "iOS-style with disabled \"soon\" state for not-yet-shipped options." },
    { name: "TabStrip",               desc: "Group-detail tabs · primary underline · scrollable." },
    { name: "Wordmark",               desc: "\"chitti\" Instrument Serif lowercase + brass dot on the second i." },
    { name: "Avatar",                 desc: "Colored disc with initials. Fallback when no contact photo." },
    { name: "StatusBar / HomeIndicator", desc: "Lightweight iOS chrome — auto-tones to the theme's fg-1." },
    { name: "PathTabs",               desc: "Add-member: contacts ↔ manual." },
    { name: "ShareSheet",             desc: "WhatsApp-tinted preview of the templated share message." },
  ];
  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#FAF7F0", color: "#1A1714",
      padding: "32px 36px",
      fontFamily: "var(--font-body)",
      overflow: "auto",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#7A7062" }}>
        Component inventory
      </div>
      <h1 className="ca-display" style={{ fontSize: 36, margin: "6px 0 18px", letterSpacing: "-0.015em" }}>
        Twenty reusables, named.
      </h1>
      <p style={{ fontSize: 14, color: "#4A4239", lineHeight: 1.55, maxWidth: 600, margin: "0 0 22px" }}>
        Every component below appears at least twice across the ten screens — most three or more.
        Names match the JSX in <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>screens/*</span>.
      </p>

      <div style={{
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #E7E1D2",
        padding: "4px 18px",
      }}>
        {items.map((it, i) => (
          <div key={it.name} style={{
            display: "grid", gridTemplateColumns: "200px 1fr",
            gap: 18,
            padding: "12px 0",
            borderTop: i === 0 ? "none" : "1px solid #F2EDE2",
            alignItems: "baseline",
          }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "#0F5132" }}>
              {it.name}
            </div>
            <div style={{ fontSize: 13.5, color: "#4A4239", lineHeight: 1.5 }}>{it.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SignatureSpec() {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#FAF7F0", color: "#1A1714",
      padding: "32px 36px",
      fontFamily: "var(--font-body)",
      overflow: "auto",
      position: "relative",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#7A7062" }}>
        Signature interaction
      </div>
      <h1 className="ca-display" style={{ fontSize: 36, margin: "6px 0 4px", letterSpacing: "-0.015em" }}>
        The math seals itself.
      </h1>
      <p style={{ fontSize: 14, color: "#4A4239", lineHeight: 1.55, maxWidth: 600, margin: "0 0 24px" }}>
        On the Cycle Receipt (screen 09), the equation typesets in piece by piece and a brass disc
        punches in with a hand-drawn tick. ~720 ms total. The most memorable moment of the product —
        the proof that every rupee is accounted for becomes a physical thing.
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1.1fr 1fr",
        gap: 28,
        alignItems: "stretch",
      }}>
        {/* Demo */}
        <div style={{
          background: "#F2EDE2",
          borderRadius: 18,
          border: "1px solid #E7E1D2",
          padding: 22,
          position: "relative",
          overflow: "hidden",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          minHeight: 380,
        }}>
          <div className="ca-guilloche" style={{ position: "absolute", inset: 0, opacity: 0.5 }} />
          <SealAnimationDemo />
        </div>

        {/* Spec */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SpecBlock t="00 → 120 ms" head="Pot lifts" body="The pot value (₹1,00,000) slides up 12px and locks in. Spring(stiffness 220, damping 24)." />
          <SpecBlock t="120 → 480 ms" head="Terms typeset" body="Each row of the equation (=, +, +) slides in from the left, 8px offset, 90 ms stagger. Spring(180, 22). Numbers tnum so they don't reflow." />
          <SpecBlock t="480 → 620 ms" head="Operators ink" body="The =/+ in the gutter draws on with a 140 ms stroke (path length animation) in brass. Easing: cubic-bezier(.4,0,.2,1)." />
          <SpecBlock t="540 → 720 ms" head="Seal punches in" body="Brass disc scales from 0.6 → 1.0 with a -6° → 0° tilt. Drop shadow ramps in over the first 80 ms. Single sparkle pops at 660 ms." />
          <SpecBlock t="720 ms → hold" head="Done" body="No looping. The seal stays. Re-opening the receipt (historical state) skips straight to the held frame." />
        </div>
      </div>

      <div style={{
        marginTop: 24,
        padding: "14px 16px",
        background: "#fff",
        border: "1px solid #E7E1D2",
        borderRadius: 12,
        fontSize: 13, lineHeight: 1.55,
        color: "#4A4239",
        maxWidth: 760,
      }}>
        <b style={{ color: "#1A1714" }}>Reduced motion:</b> when <span style={{ fontFamily: "var(--font-mono)" }}>prefers-reduced-motion</span> is set,
        the equation fades in over 200 ms and the seal appears at full scale with no tilt. Same composition, no kinetics.
      </div>
    </div>
  );
}

function SpecBlock({ t, head, body }) {
  return (
    <div style={{
      padding: "12px 14px",
      borderRadius: 12,
      background: "#fff",
      border: "1px solid #E7E1D2",
    }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "#0F5132", fontWeight: 600 }}>{t}</div>
      <div style={{ marginTop: 4, fontSize: 14.5, fontWeight: 600, color: "#1A1714" }}>{head}</div>
      <div style={{ marginTop: 4, fontSize: 13, color: "#4A4239", lineHeight: 1.55 }}>{body}</div>
    </div>
  );
}

/* ─────────── Replay-on-click demo of the signature seal ─────────── */
function SealAnimationDemo() {
  const [key, setKey] = React.useState(0);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, position: "relative" }}>
      <div key={key} style={{
        display: "flex", flexDirection: "column", alignItems: "stretch", gap: 6,
        minWidth: 280,
      }}>
        <style>{`
          @keyframes potUp { from { transform: translateY(12px); opacity:0 } to { transform: translateY(0); opacity:1 } }
          @keyframes termIn { from { transform: translateX(-8px); opacity:0 } to { transform: translateX(0); opacity:1 } }
          @keyframes sealIn { from { transform: scale(0.6) rotate(-22deg); opacity:0 } to { transform: scale(1) rotate(-6deg); opacity:1 } }
          @keyframes sparkleIn { from { opacity:0; transform: scale(0.4) } 60% { opacity:1 } to { opacity:1; transform: scale(1) } }
        `}</style>
        <div style={{
          fontFamily: "var(--font-display)", fontSize: 30, color: "#1A1714",
          letterSpacing: "-0.02em",
          animation: "potUp 220ms cubic-bezier(.2,.7,.3,1) both",
          textAlign: "center",
        }}>₹1,00,000</div>

        <Term op="=" value="₹70,000"  label="winner takes" delay={120} />
        <Term op="+" value="₹5,000"   label="commission · 5%" delay={210} />
        <Term op="+" value="₹1,250 × 20" label="dividend pool" delay={300} />

        <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <div style={{
            animation: "sealIn 240ms cubic-bezier(.2,.7,.3,1) both",
            animationDelay: "540ms",
          }}>
            <VerifiedSeal size={92} tilt={0} />
          </div>
        </div>
      </div>

      <button onClick={() => setKey(k => k + 1)} style={{
        marginTop: 14,
        background: "transparent",
        border: "1px solid #D7CFBC",
        borderRadius: 999, padding: "8px 16px",
        fontSize: 13, fontWeight: 600, color: "#1A1714",
        fontFamily: "inherit", cursor: "pointer",
      }}>
        Replay ↻
      </button>
    </div>
  );
}

function Term({ op, value, label, delay }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "24px 1fr auto",
      alignItems: "baseline",
      padding: "6px 0",
      borderTop: "1px solid rgba(0,0,0,0.08)",
      animation: "termIn 220ms cubic-bezier(.2,.7,.3,1) both",
      animationDelay: `${delay}ms`,
    }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "#8E6E27" }}>{op}</div>
      <div style={{ fontSize: 12, color: "#7A7062" }}>{label}</div>
      <div className="ca-display ca-tnum" style={{ fontSize: 17, color: "#1A1714" }}>{value}</div>
    </div>
  );
}

window.TokensColors = TokensColors;
window.TokensTypeAndSpacing = TokensTypeAndSpacing;
window.ComponentInventory = ComponentInventory;
window.SignatureSpec = SignatureSpec;
