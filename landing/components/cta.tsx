import Reveal from "@/components/reveal";

export default function CTA() {
  return (
    <section id="download" className="border-t border-line bg-bg py-24 sm:py-32">
      <div className="mx-auto max-w-content px-6">
        <Reveal>
          <div className="overflow-hidden rounded-3xl bg-accent-dark px-8 py-16 text-center sm:px-16 sm:py-24">
            <h2 className="mx-auto max-w-2xl font-display text-section font-semibold text-white">
              Put the register down. Pick up Chitti.
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-white/70">
              Free to start. Your first chit fund is running in under five minutes.
            </p>
            <div className="mt-9">
              <a
                href="#"
                className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-base font-medium text-accent-dark transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-soft hover:shadow-xl hover:shadow-black/20"
              >
                Download for Android
              </a>
            </div>
            <p className="mt-4 text-sm text-white/50">iOS coming soon</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
