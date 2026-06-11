import Reveal from "@/components/reveal";

const FEATURES = [
  {
    title: "Every member, organized",
    body: "Add members once, share a private link, and let them see their own dues and turn — no spreadsheets, no confusion.",
  },
  {
    title: "Payments that reconcile",
    body: "Mark dues paid or pending per cycle. Chitti tracks who owes what and surfaces it before the next draw.",
  },
  {
    title: "Fair, recorded draws",
    body: "Run lottery or auction draws. Winner, discount, dividend, and foreman commission are computed and stored automatically.",
  },
  {
    title: "The full ledger, always",
    body: "Twenty-four cycles or two — every rupee in and out is auditable. Hand anyone a clear statement on demand.",
  },
  {
    title: "Built for trust",
    body: "Phone-number sign-in, private member views, and a tamper-evident record so the group always agrees on the numbers.",
  },
  {
    title: "Works where you are",
    body: "Android in your pocket, web on your desk. The same accounts, the same data, instantly in sync.",
  },
];

export default function Features() {
  return (
    <section id="features" className="border-t border-line bg-bg py-24 sm:py-32">
      <div className="mx-auto max-w-content px-6">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-widest text-accent">Features</p>
          <h2 className="mt-4 max-w-2xl font-display text-section font-semibold text-ink">
            Everything a foreman keeps in their head — now in one app.
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal
              key={f.title}
              delay={(i % 3) * 0.08}
              className="group rounded-2xl border border-line bg-surface p-8 transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-xl hover:shadow-ink/5"
            >
              <span className="font-display text-sm font-semibold text-accent/50 transition-colors duration-300 group-hover:text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 font-display text-xl font-medium text-ink">{f.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{f.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
