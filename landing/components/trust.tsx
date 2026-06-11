import Reveal from "@/components/reveal";
import Counter from "@/components/counter";

const STATS = [
  { value: "₹0", label: "to start — free for your first chit" },
  { value: "5 min", label: "to set up a fund end to end" },
  { value: "100%", label: "of cycles reconciled and auditable" },
];

export default function Trust() {
  return (
    <section id="trust" className="border-t border-line bg-bg py-24 sm:py-32">
      <div className="mx-auto max-w-content px-6">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <Reveal>
            <p className="text-sm font-medium uppercase tracking-widest text-accent">Why Chitti</p>
            <h2 className="mt-4 font-display text-section font-semibold text-ink">
              The trust your group runs on, written down.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              A chit fund is a promise between people. Chitti keeps that promise honest —
              one shared record everyone can see, numbers that always add up, and a
              history no one can quietly rewrite.
            </p>
          </Reveal>

          <Reveal delay={0.15} className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
            {STATS.map((s) => (
              <div key={s.label} className="bg-surface p-8 text-center">
                <p className="font-display text-4xl font-semibold text-accent">
                  <Counter value={s.value} />
                </p>
                <p className="mt-2 text-sm leading-snug text-muted">{s.label}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
