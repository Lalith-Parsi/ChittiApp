import Reveal from "@/components/reveal";

const STEPS = [
  {
    n: "01",
    title: "Create your chit",
    body: "Set the pot, members, duration, and commission. Chitti builds every cycle for you in seconds.",
  },
  {
    n: "02",
    title: "Add members & track dues",
    body: "Invite members with a private link. Mark payments as they come in, cycle by cycle.",
  },
  {
    n: "03",
    title: "Conduct the draw",
    body: "Run the lottery or auction. Winner, dividend, and commission are calculated and recorded.",
  },
  {
    n: "04",
    title: "Close the book, clean",
    body: "Every cycle settles to a clear ledger. The group sees the same numbers, every time.",
  },
];

export default function How() {
  return (
    <section id="how" className="border-t border-line bg-surface py-24 sm:py-32">
      <div className="mx-auto max-w-content px-6">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-widest text-accent">How it works</p>
          <h2 className="mt-4 max-w-2xl font-display text-section font-semibold text-ink">
            From first cycle to final payout, in four steps.
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <span className="font-display text-3xl font-semibold text-accent/40">{s.n}</span>
              <h3 className="mt-4 font-display text-xl font-medium text-ink">{s.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{s.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
