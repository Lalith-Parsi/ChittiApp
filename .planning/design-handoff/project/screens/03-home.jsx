// Screen 03 — Home, "My Chits"
//
// Key choices:
// • Top band answers the only question a returning user has: "what do I owe and when?".
//   It collapses to a single sentence with the rupee number first.
// • Group cards lean toward "passbook row" rather than "card". A single hairline frame,
//   left-side ledger green stripe ONLY on cards where the user is foreman — the role
//   distinction is encoded in the visual rhythm, not just a badge.
// • The cycle progress is a dotted bar (one mark per cycle), not a continuous bar. A chit
//   *is* discrete monthly events; treating it as a continuous % would misrepresent it.
// • FAB labelled "+ New chit" not just "+" — Indian-market users skew older / less
//   familiar with iconic FABs, so the text label earns its size.

const { useState } = React;

/* ─────────── Data ─────────── */
const today = { day: 12, monthName: "Mar", year: 2026 };

const SAMPLE_CHITS = [
  {
    id: "c1",
    name: "Anna Nagar Family Chit",
    role: "foreman",
    chitValue: 100000,
    members: 20,
    cycle: 5,
    totalCycles: 20,
    dueAmount: 3750,
    dueDate: "Mar 15",
    daysLeft: 3,
    nextDraw: "Mar 16",
    drawType: "Lottery",
    membersPaid: 12,
    accent: "ledger",
  },
  {
    id: "c2",
    name: "Office Lunch Chit",
    role: "member",
    chitValue: 20000,
    members: 10,
    cycle: 8,
    totalCycles: 10,
    dueAmount: 1750,
    dueDate: "Mar 18",
    daysLeft: 6,
    nextDraw: "Mar 19",
    drawType: "Lottery",
    foreman: "Priya Menon",
  },
  {
    id: "c3",
    name: "Saraswathi Trust Chit",
    role: "member",
    chitValue: 200000,
    members: 24,
    cycle: 12,
    totalCycles: 24,
    dueAmount: 7000,
    dueDate: "Mar 28",
    daysLeft: 16,
    nextDraw: "Mar 29",
    drawType: "Auction",
    foreman: "Suresh Iyer",
    prized: true, // user won this one
  },
];

/* ─────────── Atoms ─────────── */
function RoleBadge({ role }) {
  const isForeman = role === "foreman";
  return (
    <span
      className="ca-pill"
      style={{
        background: isForeman ? "color-mix(in oklab, var(--primary) 14%, var(--bg-2))" : "var(--bg-2)",
        color: isForeman ? "var(--primary)" : "var(--fg-2)",
        fontWeight: 600,
      }}
    >
      {isForeman ? "You're the foreman" : "Member"}
    </span>
  );
}

function CycleDots({ cycle, total }) {
  // Render up to ~20 dots; collapse for larger groups.
  const max = Math.min(total, 24);
  const scale = total / max;
  const filledCount = Math.round(cycle / scale);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div style={{ display: "flex", gap: 3 }}>
        {Array.from({ length: max }).map((_, i) => {
          const isFilled = i < filledCount;
          const isCurrent = i === filledCount - 1;
          return (
            <span
              key={i}
              style={{
                width: isCurrent ? 10 : 5,
                height: 5,
                borderRadius: 3,
                background: isFilled
                  ? (isCurrent ? "var(--primary)" : "color-mix(in oklab, var(--primary) 55%, transparent)")
                  : "var(--divider-2)",
                transition: "background .2s",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function Avatar({ initials, color = "#C9A24B", size = 32 }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: "50%",
      background: color,
      color: "#1A1714",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 600,
      letterSpacing: "0.02em",
    }}>{initials}</div>
  );
}

function GroupCard({ chit }) {
  const isForeman = chit.role === "foreman";
  return (
    <div style={{
      position: "relative",
      background: "var(--bg-2)",
      borderRadius: 16,
      padding: "16px 16px 14px 18px",
      border: "1px solid var(--divider)",
      overflow: "hidden",
    }}>
      {/* Left stripe for foreman — visual rhythm cue */}
      {isForeman && (
        <span style={{
          position: "absolute",
          left: 0, top: 0, bottom: 0,
          width: 3,
          background: "var(--primary)",
        }} />
      )}

      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em",
            color: "var(--fg-1)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{chit.name}</div>
          <div style={{
            marginTop: 3, fontSize: 12.5, color: "var(--fg-3)",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <Rupee value={chit.chitValue} /> pot
            <span style={{ color: "var(--divider-2)" }}>·</span>
            <span>{chit.members} members</span>
            {chit.prized && (
              <>
                <span style={{ color: "var(--divider-2)" }}>·</span>
                <span style={{ color: "var(--brass-500)" }}>You won cycle 3</span>
              </>
            )}
          </div>
        </div>
        <RoleBadge role={chit.role} />
      </div>

      {/* Mid row — your due */}
      <div style={{ marginTop: 14, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-3)", fontWeight: 600 }}>
            Your next due
          </div>
          <div style={{ marginTop: 4, display: "flex", alignItems: "baseline", gap: 8 }}>
            <Rupee value={chit.dueAmount} className="ca-display" style={{ fontSize: 26, letterSpacing: "-0.015em", color: "var(--fg-1)" }} />
            <span style={{ fontSize: 13, color: "var(--fg-2)" }}>
              by {chit.dueDate}
            </span>
          </div>
        </div>
        <span className={`ca-pill ${chit.daysLeft <= 5 ? "ca-pill-pend" : "ca-pill-ghost"}`}>
          {chit.daysLeft <= 0 ? "Due today" : `in ${chit.daysLeft} days`}
        </span>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--divider)", margin: "14px 0 12px" }} />

      {/* Bottom row — cycle progress */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "var(--fg-2)", fontWeight: 500 }}>
            Cycle <span className="ca-tnum">{chit.cycle}</span> of <span className="ca-tnum">{chit.totalCycles}</span>
          </div>
          <CycleDots cycle={chit.cycle} total={chit.totalCycles} />
        </div>
        <div style={{ textAlign: "right", fontSize: 12, color: "var(--fg-2)" }}>
          <div>Next draw</div>
          <div style={{ color: "var(--fg-1)", fontWeight: 600, marginTop: 2 }}>{chit.nextDraw}</div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Header / summary ─────────── */
function HomeHeader() {
  return (
    <div style={{
      padding: "8px 24px 0",
      display: "flex", justifyContent: "space-between", alignItems: "center",
    }}>
      <Wordmark size={26} />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* search */}
        <button style={{
          width: 36, height: 36, borderRadius: 18,
          background: "transparent", border: 0, cursor: "pointer",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          color: "var(--fg-2)",
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
            <path d="M14 14l3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <Avatar initials="RK" color="var(--brass-300)" size={32} />
      </div>
    </div>
  );
}

function SummaryBand({ amount, dueWindow, chitsCount }) {
  return (
    <div style={{
      margin: "16px 20px 0",
      padding: "16px 18px",
      borderRadius: 16,
      background: "linear-gradient(180deg, color-mix(in oklab, var(--primary) 14%, var(--bg-2)) 0%, var(--bg-2) 100%)",
      border: "1px solid color-mix(in oklab, var(--primary) 12%, var(--divider))",
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--primary)" }}>
        Due this week
      </div>
      <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", gap: 8 }}>
        <Rupee value={amount} className="ca-display" style={{ fontSize: 36, letterSpacing: "-0.02em", color: "var(--fg-1)" }} />
        <span style={{ fontSize: 14, color: "var(--fg-2)" }}>across {chitsCount} chits</span>
      </div>
      <div style={{ marginTop: 8, fontSize: 13, color: "var(--fg-2)", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 3, background: "var(--primary)" }} />
        Anna Nagar Family Chit — <Rupee value={3750} />, in 3 days
      </div>
    </div>
  );
}

/* ─────────── Empty state ─────────── */
function EmptyState() {
  return (
    <div style={{ padding: "60px 28px 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      {/* Stamped circle, echoes the receipt seal */}
      <div style={{
        width: 84, height: 84,
        borderRadius: "50%",
        background: "color-mix(in oklab, var(--brass-500) 14%, var(--bg-2))",
        border: "2px dashed color-mix(in oklab, var(--brass-500) 50%, transparent)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--brass-500)",
      }}>
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <rect x="6" y="10" width="24" height="20" rx="3" stroke="currentColor" strokeWidth="1.6" />
          <path d="M6 16h24M12 22h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
      <h2 className="ca-display" style={{
        fontSize: 28, lineHeight: 1.15, margin: "20px 0 0", color: "var(--fg-1)",
        letterSpacing: "-0.01em",
      }}>
        No chits yet.
      </h2>
      <p style={{ fontSize: 14.5, color: "var(--fg-2)", lineHeight: 1.5, margin: "8px 0 0", maxWidth: 280 }}>
        Start one for your family or office — or wait for someone to add you with this number.
      </p>

      <div style={{ marginTop: 32, width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
        <button className="ca-btn ca-btn-primary">
          Create your first chit
        </button>
        <button style={{
          padding: "14px",
          background: "transparent",
          border: "1px solid var(--divider-2)",
          borderRadius: 14,
          fontSize: 15, fontWeight: 600,
          color: "var(--fg-1)",
          cursor: "pointer",
        }}>
          How chits work — 60s explainer
        </button>
      </div>
    </div>
  );
}

/* ─────────── Screens ─────────── */
function HomePopulated() {
  const total = SAMPLE_CHITS.reduce((acc, c) => acc + c.dueAmount, 0); // 12,500
  const dueThisWeek = 3750 + 1750; // 5,500
  return (
    <>
      <HomeHeader />
      <SummaryBand amount={dueThisWeek} chitsCount={SAMPLE_CHITS.length} />

      <div style={{
        margin: "20px 20px 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-3)" }}>
          My chits · {SAMPLE_CHITS.length}
        </div>
        <button style={{
          background: "transparent", border: 0, padding: 0, cursor: "pointer",
          fontSize: 13, color: "var(--fg-2)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 2,
        }}>
          Recent <ChevronDown size={14} />
        </button>
      </div>

      <div style={{
        margin: "10px 20px 0",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        overflowY: "auto",
        paddingBottom: 110,
      }}>
        {SAMPLE_CHITS.map(c => <GroupCard key={c.id} chit={c} />)}
      </div>

      {/* FAB — labelled */}
      <button style={{
        position: "absolute",
        right: 20, bottom: 30,
        height: 52,
        padding: "0 22px",
        borderRadius: 26,
        background: "var(--primary)",
        color: "var(--primary-fg)",
        border: 0,
        fontSize: 15, fontWeight: 600,
        boxShadow: "0 12px 30px -8px color-mix(in oklab, var(--primary) 60%, transparent)",
        display: "inline-flex", alignItems: "center", gap: 8,
        cursor: "pointer",
      }}>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        New chit
      </button>
    </>
  );
}

function HomeEmpty() {
  return (
    <>
      <HomeHeader />
      <EmptyState />
    </>
  );
}

function HomeOffline() {
  return (
    <>
      <HomeHeader />
      {/* Offline strip */}
      <div style={{
        margin: "12px 20px 0",
        padding: "10px 14px",
        borderRadius: 12,
        background: "var(--pend-bg)",
        color: "var(--pend-fg)",
        fontSize: 13, fontWeight: 500,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10 5v5M10 13v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        You're offline — showing the last numbers you saw.
      </div>
      <SummaryBand amount={5500} chitsCount={3} />

      <div style={{
        margin: "20px 20px 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-3)" }}>
          My chits · 3
        </div>
        <span style={{ fontSize: 12, color: "var(--fg-3)" }}>Updated 2h ago</span>
      </div>

      <div style={{
        margin: "10px 20px 0",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        opacity: 0.85,
        paddingBottom: 80,
      }}>
        {SAMPLE_CHITS.map(c => <GroupCard key={c.id} chit={c} />)}
      </div>
    </>
  );
}

function HomeScreen({ theme = "light", state = "populated", time = "9:41" }) {
  return (
    <Screen theme={theme} time={time}>
      {state === "empty" && <HomeEmpty />}
      {state === "populated" && <HomePopulated />}
      {state === "offline" && <HomeOffline />}
    </Screen>
  );
}

window.HomeScreen = HomeScreen;
window.SAMPLE_CHITS = SAMPLE_CHITS;
