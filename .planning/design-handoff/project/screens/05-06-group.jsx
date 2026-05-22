// Screens 05 + 06 — Group detail (Foreman + Member)
//
// Key choice — the two views are deliberately PARALLEL, not different.
// Same numbers, same ledger, same vocabulary. Only what's actionable differs:
//   • Foreman sees "Mark payments" + "Conduct draw"; a foreman left-stripe on the page.
//   • Member sees their own due/dividend/prized-status front and center, plus a passive
//     read-only ledger of who's paid. No state-changing buttons — just receipts and a
//     WhatsApp deep link to the foreman.
// The shared header is one component so the ledger feels like the same document.

const { useState } = React;

/* ─────────── Shared atoms ─────────── */

function GroupHeader({ role, name, status = "Active", cycle, totalCycles }) {
  return (
    <div style={{ padding: "8px 20px 12px" }}>
      {/* nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button style={navBtn}>
          <svg width="22" height="22" viewBox="0 0 22 22"><path d="M13 4l-6 7 6 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--fg-3)", fontWeight: 600 }}>
          <span style={{
            display: "inline-block", width: 6, height: 6, borderRadius: 3,
            background: "var(--ledger-500)",
          }} />
          {status}
        </div>
        <button style={navBtn}>
          <svg width="22" height="22" viewBox="0 0 22 22"><circle cx="5" cy="11" r="1.6" fill="currentColor"/><circle cx="11" cy="11" r="1.6" fill="currentColor"/><circle cx="17" cy="11" r="1.6" fill="currentColor"/></svg>
        </button>
      </div>
      {/* title block */}
      <div style={{ marginTop: 10, display: "flex", alignItems: "flex-end", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <RoleBadge role={role} />
          </div>
          <h1 className="ca-display" style={{
            fontSize: 30, lineHeight: 1.05, margin: "8px 0 0",
            color: "var(--fg-1)", letterSpacing: "-0.015em", textWrap: "balance",
          }}>
            {name}
          </h1>
          <div style={{ marginTop: 6, fontSize: 13, color: "var(--fg-2)" }}>
            Cycle <b className="ca-tnum" style={{ color: "var(--fg-1)" }}>{cycle}</b> of <span className="ca-tnum">{totalCycles}</span>
            <span style={{ color: "var(--divider-2)", margin: "0 8px" }}>·</span>
            <Rupee value={100000} /> pot
          </div>
        </div>
      </div>
    </div>
  );
}
const navBtn = {
  width: 36, height: 36, borderRadius: 18,
  background: "transparent", border: 0, cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  color: "var(--fg-2)", padding: 0,
};

function RoleBadge({ role }) {
  const isF = role === "foreman";
  return (
    <span className="ca-pill" style={{
      background: isF ? "color-mix(in oklab, var(--primary) 16%, var(--bg-2))" : "var(--bg-2)",
      color: isF ? "var(--primary)" : "var(--fg-2)", fontWeight: 600,
    }}>
      {isF ? "You're the foreman" : "Member"}
    </span>
  );
}

function TabStrip({ tabs, value, onChange }) {
  return (
    <div style={{
      borderBottom: "1px solid var(--divider)",
      padding: "0 8px",
      display: "flex",
      gap: 0,
      overflowX: "auto",
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: "12px 14px",
          background: "transparent", border: 0, cursor: "pointer",
          fontFamily: "inherit", fontSize: 14, fontWeight: 600,
          color: value === t.id ? "var(--fg-1)" : "var(--fg-3)",
          borderBottom: `2px solid ${value === t.id ? "var(--primary)" : "transparent"}`,
          marginBottom: -1,
          letterSpacing: "-0.005em",
        }}>{t.label}</button>
      ))}
    </div>
  );
}

function StatPair({ label, children, hint }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-3)" }}>
        {label}
      </div>
      <div style={{ marginTop: 4 }}>{children}</div>
      {hint && <div style={{ marginTop: 2, fontSize: 12, color: "var(--fg-3)" }}>{hint}</div>}
    </div>
  );
}

/* ─────────── Members preview ─────────── */
const MEMBERS = [
  { name: "Ravi Krishnan",   phone: "+91 98765 43210", initials: "RK", color: "#C9A24B", paid: true,  prized: false, paidOn: "Mar 10" },
  { name: "Priya Menon",     phone: "+91 98123 45678", initials: "PM", color: "#E7C77A", paid: true,  prized: true,  prizedCycle: 3 },
  { name: "Suresh Iyer",     phone: "+91 90123 45678", initials: "SI", color: "#7CC79E", paid: true,  prized: false, paidOn: "Mar 11" },
  { name: "Anjali Sharma",   phone: "+91 99988 76543", initials: "AS", color: "#E5A89A", paid: false, prized: true,  prizedCycle: 1 },
  { name: "Karthik Reddy",   phone: "+91 97654 32109", initials: "KR", color: "#9AB5D8", paid: false, prized: false },
  { name: "Lakshmi Pillai",  phone: "+91 89765 43210", initials: "LP", color: "#D8B8E5", paid: true,  prized: false, paidOn: "Mar 12" },
  { name: "Vinod Joseph",    phone: "+91 98765 11223", initials: "VJ", color: "#C9A24B", paid: false, prized: false },
];

function MemberRow({ m, compact = false }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: compact ? "10px 0" : "12px 0",
    }}>
      <Avatar initials={m.initials} color={m.color} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 14.5, fontWeight: 500, color: "var(--fg-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</span>
          {m.prized && (
            <span style={{
              flex: "0 0 auto",
              padding: "2px 6px",
              borderRadius: 999,
              background: "color-mix(in oklab, var(--brass-500) 16%, var(--bg-2))",
              color: "var(--brass-500)",
              fontSize: 10.5, fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}>Prized · C{m.prizedCycle}</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }} className="ca-tnum">{m.phone}</div>
      </div>
      {m.paid ? (
        <div style={{ textAlign: "right" }}>
          <span className="ca-pill ca-pill-paid">Paid</span>
          {m.paidOn && <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 3 }}>{m.paidOn}</div>}
        </div>
      ) : (
        <span className="ca-pill ca-pill-pend">Pending</span>
      )}
    </div>
  );
}

function Avatar({ initials, color = "#C9A24B", size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color, color: "#1A1714",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 600, flex: "0 0 auto",
    }}>{initials}</div>
  );
}

/* ─────────── Foreman screen body ─────────── */
function ForemanBody({ state }) {
  const [tab, setTab] = useState("overview");

  // Cycle 5 of 20 numbers:
  const subscription = 5000;
  const dividend = 1250;
  const dueAmount = subscription - dividend; // 3,750
  const paidCount = state === "all-paid" ? 20 : state === "premembers" ? 0 : 12;
  const totalCount = 20;
  const drawReady = paidCount === totalCount;

  if (state === "premembers") {
    return (
      <>
        <TabStrip
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "members",  label: "Members" },
            { id: "cycles",   label: "Cycles" },
            { id: "activity", label: "Activity" },
          ]}
          value={tab}
          onChange={setTab}
        />
        <div style={{ padding: "24px 20px 40px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{
            background: "color-mix(in oklab, var(--brass-500) 12%, var(--bg-2))",
            border: "1px dashed color-mix(in oklab, var(--brass-500) 40%, transparent)",
            borderRadius: 16, padding: 18,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--brass-500)" }}>
              Not started yet
            </div>
            <div className="ca-display" style={{ fontSize: 22, lineHeight: 1.2, color: "var(--fg-1)", marginTop: 8, letterSpacing: "-0.01em" }}>
              Add your members to begin.
            </div>
            <div style={{ fontSize: 13.5, color: "var(--fg-2)", marginTop: 8, lineHeight: 1.5 }}>
              Once 20 people have joined this chit, you can run the first cycle in April.
            </div>
            <button className="ca-btn ca-btn-primary" style={{ marginTop: 18 }}>
              Add members <ArrowRight size={16} />
            </button>
          </div>

          <PlanCard subscription={5000} members={20} months={20} commission={5000} />
        </div>
      </>
    );
  }

  return (
    <>
      <TabStrip
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "members",  label: `Members · ${totalCount}` },
          { id: "cycles",   label: "Cycles" },
          { id: "activity", label: "Activity" },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 20px 100px",
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        {/* Current cycle card */}
        <div style={{
          position: "relative",
          background: "var(--bg-2)",
          borderRadius: 18,
          padding: "16px 18px 18px",
          border: "1px solid var(--divider)",
          overflow: "hidden",
        }}>
          <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "var(--primary)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--primary)" }}>
                Current cycle · March 2026
              </div>
              <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", gap: 8 }}>
                <Rupee value={dueAmount} className="ca-display" style={{ fontSize: 30, letterSpacing: "-0.02em", color: "var(--fg-1)" }} />
                <span style={{ fontSize: 13, color: "var(--fg-2)" }}>per member</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 12.5, color: "var(--fg-3)" }}>
                <Rupee value={subscription} /> gross − <Rupee value={dividend} /> dividend
              </div>
            </div>
            <span className={`ca-pill ${drawReady ? "ca-pill-paid" : "ca-pill-pend"}`}>
              {drawReady ? "Ready to draw" : "Collecting"}
            </span>
          </div>

          {/* Progress meter */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--fg-2)", marginBottom: 6 }}>
              <span><b style={{ color: "var(--fg-1)" }} className="ca-tnum">{paidCount}</b> of <span className="ca-tnum">{totalCount}</span> members paid</span>
              <span className="ca-tnum">{Math.round(paidCount / totalCount * 100)}%</span>
            </div>
            <div style={{ height: 6, background: "var(--bg-3)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${(paidCount / totalCount) * 100}%`,
                background: drawReady ? "var(--ledger-500)" : "var(--primary)",
                borderRadius: 3,
                transition: "width .3s",
              }} />
            </div>
          </div>

          <button className="ca-btn ca-btn-primary" style={{ marginTop: 16, minHeight: 48 }}>
            {drawReady ? <>Conduct draw <ArrowRight size={16} /></> : <>Mark payments <ArrowRight size={16} /></>}
          </button>
        </div>

        {/* Next draw card */}
        <div style={{
          background: "var(--bg-2)",
          borderRadius: 16,
          padding: "14px 16px",
          border: "1px solid var(--divider)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-3)" }}>Next draw</div>
            <div style={{ marginTop: 4, display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 17, fontWeight: 600, color: "var(--fg-1)" }}>{drawReady ? "Today" : "Sat, Mar 16"}</span>
              <span className="ca-pill ca-pill-ghost">Lottery</span>
            </div>
            <div style={{ marginTop: 4, fontSize: 12.5, color: "var(--fg-3)" }}>
              Eligible: <span className="ca-tnum" style={{ color: "var(--fg-2)", fontWeight: 600 }}>16 of 20</span> (4 already prized)
            </div>
          </div>
          <div style={{
            width: 44, height: 44, borderRadius: 22,
            background: "color-mix(in oklab, var(--brass-500) 20%, transparent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--brass-500)", flex: "0 0 auto",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>
          </div>
        </div>

        {/* Members preview */}
        <div style={{
          background: "var(--bg-2)",
          borderRadius: 16,
          padding: "8px 16px",
          border: "1px solid var(--divider)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0 4px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-3)" }}>
              Members · this cycle
            </div>
            <button style={{
              background: "transparent", border: 0, padding: 0, cursor: "pointer",
              color: "var(--primary)", fontSize: 13, fontWeight: 600,
            }}>See all</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", divider: "1px solid var(--divider)" }}>
            {MEMBERS.slice(0, 4).map((m, i) => (
              <div key={m.name} style={{ borderTop: i === 0 ? "none" : "1px solid var(--divider)" }}>
                <MemberRow m={m} compact />
              </div>
            ))}
          </div>
        </div>

        {/* Activity preview */}
        <div style={{
          background: "var(--bg-2)",
          borderRadius: 16,
          padding: "12px 16px",
          border: "1px solid var(--divider)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-3)" }}>
              Recent activity
            </div>
            <button style={{
              background: "transparent", border: 0, padding: 0, cursor: "pointer",
              color: "var(--primary)", fontSize: 13, fontWeight: 600,
            }}>See log</button>
          </div>
          <div style={{ marginTop: 6, display: "flex", flexDirection: "column" }}>
            <ActivityRow when="10:42 today"   actor="You" verb="marked" obj="Lakshmi Pillai paid (UPI · ₹3,750)" />
            <ActivityRow when="Yesterday"     actor="You" verb="marked" obj="Suresh Iyer paid (cash · ₹3,750)" />
            <ActivityRow when="Mar 1"         actor="System" verb="opened" obj="Cycle 5 — subscription set to ₹3,750" />
          </div>
        </div>
      </div>
    </>
  );
}

function ActivityRow({ when, actor, verb, obj }) {
  return (
    <div style={{
      padding: "10px 0",
      borderTop: "1px solid var(--divider)",
      fontSize: 13, color: "var(--fg-2)", lineHeight: 1.45,
    }}>
      <div>
        <b style={{ color: "var(--fg-1)" }}>{actor}</b> {verb} {obj}.
      </div>
      <div style={{ marginTop: 2, fontSize: 11.5, color: "var(--fg-3)" }} className="ca-tnum">{when}</div>
    </div>
  );
}

function PlanCard({ subscription, members, months, commission }) {
  return (
    <div style={{
      background: "var(--bg-2)",
      borderRadius: 16,
      padding: 18,
      border: "1px solid var(--divider)",
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-3)" }}>
        The plan
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <StatPair label="Monthly subscription"><Rupee value={subscription} className="ca-display" style={{ fontSize: 22 }} /></StatPair>
        <StatPair label="Members"><span className="ca-display ca-tnum" style={{ fontSize: 22 }}>{members}</span></StatPair>
        <StatPair label="Months"><span className="ca-display ca-tnum" style={{ fontSize: 22 }}>{months}</span></StatPair>
        <StatPair label="Your commission / cycle"><Rupee value={commission} className="ca-display" style={{ fontSize: 22 }} /></StatPair>
      </div>
    </div>
  );
}

/* ─────────── Member screen body ─────────── */
function MemberBody({ state }) {
  const [tab, setTab] = useState("overview");

  const isPaid = state === "paid";
  const isPrized = state === "prized";

  return (
    <>
      <TabStrip
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "members",  label: "Members · 20" },
          { id: "cycles",   label: "Cycles" },
          { id: "activity", label: "Activity" },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 20px 100px",
        display: "flex", flexDirection: "column", gap: 14,
      }}>

        {/* Your status — the only card a member really opens this screen for */}
        <div style={{
          background: "var(--bg-2)",
          borderRadius: 18,
          padding: "16px 18px 18px",
          border: "1px solid var(--divider)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-3)" }}>
            Your status · March 2026
          </div>
          <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
            <div>
              <Rupee value={3750} className="ca-display" style={{ fontSize: 30, color: "var(--fg-1)", letterSpacing: "-0.02em" }} />
              <div style={{ fontSize: 13, color: "var(--fg-2)", marginTop: 2 }}>
                due by Sun, Mar 15
              </div>
            </div>
            {isPaid ? (
              <div style={{ textAlign: "right" }}>
                <span className="ca-pill ca-pill-paid"><Check size={12} /> Paid · UPI</span>
                <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4 }}>Marked by Ravi · Mar 10</div>
              </div>
            ) : (
              <span className="ca-pill ca-pill-pend">Not yet marked paid</span>
            )}
          </div>
          <div style={{
            marginTop: 14, padding: "10px 12px",
            background: "var(--bg-3)",
            borderRadius: 10,
            fontSize: 12.5,
            color: "var(--fg-2)",
            display: "flex", justifyContent: "space-between",
          }}>
            <span>You saved this cycle</span>
            <span style={{ color: "var(--fg-1)", fontWeight: 600 }}>
              <Rupee value={1250} /> dividend
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button style={{
              flex: 1, padding: 12, fontFamily: "inherit",
              background: "var(--bg-3)", color: "var(--fg-1)",
              borderRadius: 12, border: 0, fontSize: 14, fontWeight: 600, cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <Phone size={14} /> Contact foreman
            </button>
            <button style={{
              flex: 1, padding: 12, fontFamily: "inherit",
              background: "var(--bg-3)", color: "var(--fg-1)",
              borderRadius: 12, border: 0, fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>
              Open my receipt
            </button>
          </div>
        </div>

        {/* Personal summary */}
        <div style={{
          background: "var(--bg-2)",
          borderRadius: 16,
          padding: "16px 18px",
          border: "1px solid var(--divider)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}>
          <StatPair label="Dividends so far">
            <Rupee value={4200} className="ca-display" style={{ fontSize: 22 }} />
            <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>across 4 cycles</div>
          </StatPair>
          <StatPair label="Prized status">
            {isPrized ? (
              <>
                <span style={{ color: "var(--brass-500)", fontWeight: 600, fontSize: 17 }}>You won C3</span>
                <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>
                  Prize <Rupee value={78500} />
                </div>
              </>
            ) : (
              <>
                <span style={{ color: "var(--fg-1)", fontWeight: 600, fontSize: 17 }}>Not yet</span>
                <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>15 still eligible</div>
              </>
            )}
          </StatPair>
        </div>

        {/* Whole-group ledger preview — same data, read only */}
        <div style={{
          background: "var(--bg-2)",
          borderRadius: 16,
          padding: "8px 16px",
          border: "1px solid var(--divider)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0 4px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-3)" }}>
              This cycle's ledger
            </div>
            <span style={{ fontSize: 12, color: "var(--fg-3)" }} className="ca-tnum">12 / 20 paid</span>
          </div>
          {MEMBERS.slice(0, 4).map((m, i) => (
            <div key={m.name} style={{ borderTop: i === 0 ? "none" : "1px solid var(--divider)" }}>
              <MemberRow m={m} compact />
            </div>
          ))}
          <div style={{
            padding: "10px 0",
            borderTop: "1px solid var(--divider)",
            fontSize: 12.5,
            color: "var(--fg-3)",
            textAlign: "center",
          }}>
            + 16 more members — <span style={{ color: "var(--primary)", fontWeight: 600 }}>show all</span>
          </div>
        </div>

        {/* Next draw — passive */}
        <div style={{
          background: "var(--bg-2)",
          borderRadius: 16,
          padding: "14px 16px",
          border: "1px solid var(--divider)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-3)" }}>Next draw</div>
            <div style={{ marginTop: 4, fontSize: 15, color: "var(--fg-1)", fontWeight: 600 }}>Sat, Mar 16</div>
            <div style={{ marginTop: 2, fontSize: 12, color: "var(--fg-3)" }}>You'll see the result the moment it's drawn.</div>
          </div>
          <span className="ca-pill ca-pill-ghost">Lottery</span>
        </div>
      </div>
    </>
  );
}

/* ─────────── Public screens ─────────── */
function GroupForemanScreen({ theme = "light", state = "mid", time = "9:41" }) {
  return (
    <Screen theme={theme} time={time}>
      <GroupHeader role="foreman" name="Anna Nagar Family Chit" cycle={5} totalCycles={20} />
      <ForemanBody state={state} />
    </Screen>
  );
}

function GroupMemberScreen({ theme = "light", state = "unpaid", time = "9:41" }) {
  return (
    <Screen theme={theme} time={time}>
      <GroupHeader role="member" name="Saraswathi Trust Chit" cycle={12} totalCycles={24} status="Active" />
      <MemberBody state={state} />
    </Screen>
  );
}

window.GroupForemanScreen = GroupForemanScreen;
window.GroupMemberScreen = GroupMemberScreen;
window.MEMBERS = MEMBERS;
window.MemberRow = MemberRow;
window.Avatar = Avatar;
