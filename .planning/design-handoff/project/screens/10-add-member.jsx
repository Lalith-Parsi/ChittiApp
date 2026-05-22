// Screen 10 — Add member / invite
//
// Key choices:
// • Two paths shown together, not in a flow: most foremen pick from contacts, but a
//   minority will type — making the user choose first wastes a tap.
// • Already-a-member contacts are shown but disabled with a calm pill; hiding them
//   would make the foreman think the contact "doesn't have ChittiApp" when they do.
// • After-adding confirmation pill in-line, no full-screen success — the foreman is
//   usually adding several people in a row; a celebration each time would be noise.
// • "Share group link" sits at the bottom as a third path. WhatsApp deep-link uses
//   the same brand voice as the receipt's share copy.

const { useState } = React;

const CONTACTS = [
  { name: "Meera Pillai",        phone: "+91 98765 11220", initials: "MP", color: "#7CC79E" },
  { name: "Anjali Sharma",       phone: "+91 99988 76543", initials: "AS", color: "#E5A89A", member: true },
  { name: "Arjun Nair",          phone: "+91 98712 33445", initials: "AN", color: "#E7C77A" },
  { name: "Bharath Reddy",       phone: "+91 89012 30912", initials: "BR", color: "#9AB5D8" },
  { name: "Deepa Iyer",          phone: "+91 90123 45678", initials: "DI", color: "#D8B8E5" },
  { name: "Karthik Reddy",       phone: "+91 97654 32109", initials: "KR", color: "#9AB5D8", member: true },
  { name: "Lakshmi Pillai",      phone: "+91 89765 43210", initials: "LP", color: "#D8B8E5", member: true },
  { name: "Manish Gupta",        phone: "+91 98765 09876", initials: "MG", color: "#C9A24B" },
  { name: "Naveen Kumar",        phone: "+91 99876 11223", initials: "NK", color: "#E7C77A" },
  { name: "Pooja Anand",         phone: "+91 88123 55667", initials: "PA", color: "#E5A89A" },
  { name: "Rohit Subramanian",   phone: "+91 90876 54321", initials: "RS", color: "#7CC79E" },
  { name: "Sangeeta Pandian",    phone: "+91 98987 11122", initials: "SP", color: "#D8B8E5" },
  { name: "Vinod Joseph",        phone: "+91 98765 11223", initials: "VJ", color: "#C9A24B" },
];

/* ─────────── Atoms ─────────── */
function AddHeader({ count }) {
  return (
    <div style={{ padding: "8px 20px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button style={navBtn10}>
          <svg width="22" height="22" viewBox="0 0 22 22"><path d="M16 5L6 17M6 5l10 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
        </button>
        <div style={{ fontSize: 13, color: "var(--fg-3)", fontWeight: 600 }}>Add to Anna Nagar Family Chit</div>
        <button style={{ ...navBtn10, color: "var(--primary)", fontWeight: 600, fontSize: 15, width: "auto", padding: "0 6px" }}>
          Done
        </button>
      </div>
      <h1 className="ca-display" style={{ fontSize: 28, lineHeight: 1.15, margin: "12px 0 4px", color: "var(--fg-1)", letterSpacing: "-0.015em" }}>
        Add members
      </h1>
      <div style={{ fontSize: 13.5, color: "var(--fg-2)", lineHeight: 1.5 }}>
        Adds the chit to their phone the moment they sign in with this number.
      </div>
    </div>
  );
}
const navBtn10 = {
  width: 36, height: 36, borderRadius: 18,
  background: "transparent", border: 0, cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  color: "var(--fg-2)", padding: 0, fontFamily: "inherit",
};

function PathTabs({ value, onChange }) {
  return (
    <div style={{
      margin: "16px 20px 0",
      display: "grid", gridTemplateColumns: "1fr 1fr",
      background: "var(--bg-2)", borderRadius: 12, padding: 4,
    }}>
      {[
        { id: "contacts", label: "From contacts" },
        { id: "manual",   label: "Type number" },
      ].map(t => {
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

/* ─────────── Contacts path ─────────── */
function ContactsList({ state, selected, toggle }) {
  if (state === "permission-denied") {
    return (
      <div style={{ padding: "60px 28px 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "var(--bg-2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--fg-3)",
        }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="14" r="6" stroke="currentColor" strokeWidth="1.6" />
            <path d="M6 30c2-6 7-9 12-9s10 3 12 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
        <h3 className="ca-display" style={{ fontSize: 22, margin: "18px 0 6px", color: "var(--fg-1)", letterSpacing: "-0.01em" }}>
          Contacts off
        </h3>
        <p style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.5, margin: 0, maxWidth: 280 }}>
          ChittiApp doesn't read or store contacts — it only shows them so you can pick. You can switch to
          typing the number, or enable contacts in Settings.
        </p>
        <button className="ca-btn ca-btn-primary" style={{ marginTop: 22 }}>
          Open Settings
        </button>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div style={{ padding: "20px 20px 0" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 0",
            borderTop: i === 0 ? "none" : "1px solid var(--divider)",
            opacity: 1 - i * 0.1,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: "var(--bg-2)", animation: "ca-pulse 1.4s ease-in-out infinite" }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 12, width: "60%", background: "var(--bg-2)", borderRadius: 6, animation: "ca-pulse 1.4s ease-in-out infinite" }} />
              <div style={{ height: 10, width: "40%", background: "var(--bg-2)", borderRadius: 5, marginTop: 6, animation: "ca-pulse 1.4s ease-in-out infinite" }} />
            </div>
          </div>
        ))}
        <style>{`@keyframes ca-pulse { 0%,100% { opacity:.45 } 50% { opacity:.85 } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1, overflowY: "auto",
      padding: "8px 20px 100px",
    }}>
      {/* Search */}
      <div className="ca-field" style={{ marginBottom: 6, padding: "10px 14px" }}>
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ color: "var(--fg-3)" }}>
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
          <path d="M14 14l3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input className="ca-input" placeholder="Search contacts" style={{ fontSize: 14 }} />
      </div>

      <div style={{
        background: "var(--bg-2)", borderRadius: 16, padding: "0 14px",
        border: "1px solid var(--divider)", marginTop: 8,
      }}>
        {CONTACTS.map((c, i) => {
          const isSelected = selected.includes(c.phone);
          return (
            <div key={c.phone} style={{
              borderTop: i === 0 ? "none" : "1px solid var(--divider)",
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 0",
              opacity: c.member ? 0.55 : 1,
              cursor: c.member ? "default" : "pointer",
            }}
              onClick={() => !c.member && toggle(c.phone)}
            >
              <Avatar initials={c.initials} color={c.color} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 500, color: "var(--fg-1)" }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "var(--fg-3)" }} className="ca-tnum">{c.phone}</div>
              </div>
              {c.member ? (
                <span className="ca-pill ca-pill-ghost">Already a member</span>
              ) : (
                <span style={{
                  width: 22, height: 22, borderRadius: 6,
                  background: isSelected ? "var(--primary)" : "transparent",
                  border: `1.5px solid ${isSelected ? "var(--primary)" : "var(--divider-2)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--primary-fg)",
                  transition: "all .15s",
                }}>
                  {isSelected && <Check size={14} color="var(--primary-fg)" />}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────── Manual path ─────────── */
function ManualEntry({ state }) {
  return (
    <div style={{ padding: "16px 20px 0", flex: 1 }}>
      {state === "added" && (
        <div style={{
          marginBottom: 14,
          padding: "10px 14px",
          background: "var(--paid-bg)",
          color: "var(--paid-fg)",
          borderRadius: 12,
          fontSize: 13,
          display: "flex", alignItems: "center", gap: 8,
          lineHeight: 1.4,
        }}>
          <Check size={16} color="var(--paid-fg)" />
          <span>Added <b>Ravi Krishnan</b> · <span className="ca-tnum">+91 98765 43210</span>. They'll see this chit when they sign in.</span>
        </div>
      )}

      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>Phone number</div>
      <div className={`ca-field ${state === "validation-error" ? "is-error" : ""}`} style={{ marginTop: 6, padding: "10px 12px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 10px", borderRadius: 10,
          background: "var(--bg-3)", fontSize: 15, fontWeight: 600, color: "var(--fg-1)",
        }}>
          <IndiaFlag size={16} />
          <span className="ca-tnum">+91</span>
        </div>
        <div style={{ width: 1, height: 28, background: "var(--divider-2)" }} />
        <input
          className="ca-input ca-tnum"
          placeholder="98XXX XXXXX"
          defaultValue={state === "validation-error" ? "12345" : state === "added" ? "" : "98765 43210"}
          style={{ fontSize: 20, fontWeight: 500, letterSpacing: "0.02em" }}
        />
      </div>
      {state === "validation-error" && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, color: "var(--err-fg)", fontSize: 12.5, fontWeight: 500 }}>
          <Warn size={13} color="var(--err-fg)" />
          Enter a 10-digit mobile number starting with 6-9.
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>
        Display name <span style={{ color: "var(--fg-3)", fontWeight: 400 }}>· optional</span>
      </div>
      <div className="ca-field" style={{ marginTop: 6 }}>
        <input className="ca-input" placeholder="e.g. Ravi" defaultValue={state === "added" ? "" : "Ravi Krishnan"} style={{ fontSize: 16 }} />
      </div>
      <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 6 }}>
        How they'll appear in the ledger. They can change it later.
      </div>
    </div>
  );
}

/* ─────────── Share-invite footer ─────────── */
function InviteFooter() {
  return (
    <div style={{
      padding: "12px 20px",
      borderTop: "1px solid var(--divider)",
      background: "var(--bg-2)",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: "color-mix(in oklab, #1FA855 16%, var(--bg))",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#1FA855", flex: "0 0 auto",
      }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 1.5A8.5 8.5 0 002.5 14.6L1.5 18.5l4-1A8.5 8.5 0 1010 1.5zm0 1.6a6.9 6.9 0 015.9 10.5l.4 2.4-2.5-.4A6.9 6.9 0 0110 3.1zm-3 3.6c-.2 0-.4.1-.6.3-.2.2-.7.7-.7 1.7 0 1 .7 2 .8 2.1.1.1 1.4 2.2 3.4 3 .5.2.9.3 1.2.4.5.1 1 .1 1.4 0 .4 0 1.2-.5 1.4-1 .2-.4.2-.8.1-.9-.1-.1-.3-.2-.6-.3-.3-.2-1.2-.6-1.4-.7-.2-.1-.3-.1-.5.1-.1.2-.5.7-.6.8-.1.1-.2.1-.4 0-.2-.1-.9-.4-1.7-1-.6-.6-1-1.3-1.1-1.5-.1-.2 0-.3.1-.4l.4-.5.2-.4c.1-.1 0-.3 0-.4l-.6-1.4c-.2-.4-.3-.3-.5-.3z" />
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg-1)" }}>Share group link on WhatsApp</div>
        <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }} className="ca-tnum">chitti://join/anna-nagar-2026</div>
      </div>
      <button style={{
        background: "transparent",
        border: "1px solid var(--divider-2)",
        borderRadius: 8, padding: "8px 12px",
        fontSize: 13, fontWeight: 600, color: "var(--fg-1)",
        cursor: "pointer", fontFamily: "inherit",
      }}>Share</button>
    </div>
  );
}

/* ─────────── Screen ─────────── */
function AddMemberScreen({ theme = "light", state = "loaded", time = "9:41" }) {
  // state: loaded | loading | permission-denied | selecting | added | validation-error
  const [path, setPath] = useState(state === "validation-error" || state === "added" ? "manual" : "contacts");
  const [selected, setSelected] = useState(state === "selecting" ? ["+91 98765 11220", "+91 98712 33445", "+91 89012 30912"] : []);
  function toggle(p) {
    setSelected(s => s.includes(p) ? s.filter(x => x !== p) : [...s, p]);
  }

  const subState =
    state === "loading" ? "loading" :
    state === "permission-denied" ? "permission-denied" :
    "loaded";

  return (
    <Screen theme={theme} time={time}>
      <div style={{ display: "flex", flexDirection: "column", height: "calc(844px - 47px - 24px)" }}>
        <AddHeader />
        <PathTabs value={path} onChange={setPath} />

        {path === "contacts" ? (
          <ContactsList state={subState} selected={selected} toggle={toggle} />
        ) : (
          <ManualEntry state={state === "validation-error" ? "validation-error" : state === "added" ? "added" : "default"} />
        )}

        {path === "manual" || subState === "loaded" ? <InviteFooter /> : null}

        {/* CTA bar */}
        <div style={{
          padding: "12px 20px 22px",
          borderTop: "1px solid var(--divider)",
          background: "var(--bg)",
        }}>
          {path === "contacts" ? (
            <button
              className="ca-btn ca-btn-primary"
              disabled={selected.length === 0 || state === "adding"}
            >
              {state === "adding" ? (
                <><span className="ca-spin" /> Adding {selected.length}…</>
              ) : selected.length > 0 ? (
                <>Add <span className="ca-tnum">{selected.length}</span> {selected.length === 1 ? "member" : "members"}</>
              ) : (
                "Select members to add"
              )}
            </button>
          ) : (
            <button className="ca-btn ca-btn-primary" disabled={state === "validation-error"}>
              {state === "added" ? "Add another" : "Add to chit"}
            </button>
          )}
        </div>
      </div>
    </Screen>
  );
}

window.AddMemberScreen = AddMemberScreen;
