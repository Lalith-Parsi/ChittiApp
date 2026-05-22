// Shared atoms used by every ChittiApp screen.
// Loaded after React + tokens.css. Exposes globals on `window`.

const { useEffect, useRef, useState, useMemo } = React;

/* ───────────────────────── StatusBar (iOS-ish) ───────────────────────── */

function StatusBar({ time = "9:41", tone = "auto" }) {
  // tone: "auto" inherits color from --fg-1 (works in light + dark).
  return (
    <div className="ca-status" style={{ color: tone === "auto" ? "var(--fg-1)" : tone }}>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{time}</span>
      <div className="ca-status-icons">
        {/* signal */}
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none" aria-hidden>
          {[2, 5, 8, 11].map((h, i) => (
            <rect key={i} x={i * 4} y={11 - h} width="3" height={h} rx="0.7" fill="currentColor" />
          ))}
        </svg>
        {/* wifi */}
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" aria-hidden>
          <path d="M8 10.2a1.3 1.3 0 100-2.6 1.3 1.3 0 000 2.6z" fill="currentColor" />
          <path d="M3.4 6.4a6.5 6.5 0 019.2 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
          <path d="M.9 3.9a10 10 0 0114.2 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
        </svg>
        {/* battery */}
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none" aria-hidden>
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke="currentColor" opacity="0.5" />
          <rect x="2" y="2" width="19" height="8" rx="1.6" fill="currentColor" />
          <rect x="23.5" y="4" width="1.5" height="4" rx="0.7" fill="currentColor" opacity="0.5" />
        </svg>
      </div>
    </div>
  );
}

/* ───────────────────────── Home indicator ───────────────────────── */
function HomeIndicator() {
  return <div className="ca-home-indicator" />;
}

/* ───────────────────────── Screen frame ───────────────────────── */
// Wraps a screen with the correct theme class + status bar + home indicator.
// children fill the area between status bar and home indicator.
function Screen({ theme = "light", time = "9:41", statusTone, children, style }) {
  return (
    <div className={`ca-screen ca-${theme}`} style={style}>
      <StatusBar time={time} tone={statusTone || "auto"} />
      {children}
      <HomeIndicator />
    </div>
  );
}

/* ───────────────────────── Wordmark ───────────────────────── */
// "chitti" — Instrument Serif lowercase wordmark with a single brass dot over the second i.
// The dot is the "stamp" that recurs on the receipt seal — quiet hint of the signature moment.
function Wordmark({ size = 44, color, dotColor }) {
  const c = color || "var(--fg-1)";
  const dc = dotColor || "var(--brass-500)";
  return (
    <div
      className="ca-display"
      style={{
        position: "relative",
        display: "inline-block",
        fontSize: size,
        lineHeight: 1,
        color: c,
        letterSpacing: "-0.02em",
      }}
      aria-label="chitti"
    >
      chitti
      <span
        aria-hidden
        style={{
          position: "absolute",
          width: size * 0.13,
          height: size * 0.13,
          borderRadius: "50%",
          background: dc,
          // Position over the second "i" dot.
          right: size * 0.21,
          top: size * 0.04,
        }}
      />
    </div>
  );
}

/* ───────────────────────── Currency formatting (Indian) ───────────────────────── */
// Format 100000 → 1,00,000  (Indian system: ##,##,###).
function fmtINR(n) {
  if (n == null || isNaN(n)) return "0";
  const s = Math.abs(Math.trunc(n)).toString();
  if (s.length <= 3) return (n < 0 ? "-" : "") + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const restWithCommas = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return (n < 0 ? "-" : "") + restWithCommas + "," + last3;
}

function Rupee({ value, prefix = "₹", className = "", style }) {
  return (
    <span className={`ca-rupee ca-tnum ${className}`} style={style}>
      {prefix}{fmtINR(value)}
    </span>
  );
}

/* ───────────────────────── Misc icons ───────────────────────── */
function ChevronDown({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 6l4 4 4-4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRight({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M4 10h12M11 5l5 5-5 5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Phone({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M5 3h4l2 4-2.5 1.5a8 8 0 004 4L14 10l4 2v4a2 2 0 01-2 2 14 14 0 01-14-14 2 2 0 012-2z"
        stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function Check({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M4 10.5l4 4 8-9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Warn({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="8" stroke={color} strokeWidth="1.5" />
      <path d="M10 6v5M10 13.5v.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* India flag — tiny SVG, no emoji */
function IndiaFlag({ size = 18 }) {
  return (
    <svg width={size} height={size * (2 / 3)} viewBox="0 0 30 20" aria-hidden style={{ borderRadius: 2, display: "block", overflow: "hidden" }}>
      <rect width="30" height="6.66" y="0" fill="#FF9933" />
      <rect width="30" height="6.66" y="6.66" fill="#FFFFFF" />
      <rect width="30" height="6.66" y="13.33" fill="#138808" />
      <circle cx="15" cy="10" r="2" fill="none" stroke="#000080" strokeWidth="0.4" />
      <circle cx="15" cy="10" r="0.5" fill="#000080" />
    </svg>
  );
}

Object.assign(window, {
  StatusBar, HomeIndicator, Screen, Wordmark, Rupee, fmtINR,
  ChevronDown, ArrowRight, Phone, Check, Warn, IndiaFlag,
});
