"use client";

import { motion } from "motion/react";

const HEADLINE = "Run your chit funds with confidence.";

export default function Hero() {
  const words = HEADLINE.split(" ");

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden pt-16">
      <GradientGlow />

      <div className="mx-auto grid max-w-content grid-cols-1 items-center gap-16 px-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-muted"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            The modern chit fund book
          </motion.p>

          <h1 className="font-display text-display font-semibold text-ink">
            {words.map((word, i) => (
              <span key={i} className="inline-block overflow-hidden align-bottom">
                <motion.span
                  className="inline-block"
                  initial={{ y: "110%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 + i * 0.07 }}
                >
                  {word}
                  {i < words.length - 1 ? " " : ""}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.45 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-muted"
          >
            Chitti replaces the paper register and the WhatsApp chaos. Track members,
            record every payment, conduct fair draws, and keep each rupee accounted
            for — all from your phone.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.58 }}
            className="mt-9"
          >
            <a
              href="#download"
              className="inline-flex items-center justify-center rounded-full bg-accent px-8 py-4 text-base font-medium text-white transition-all duration-300 hover:bg-accent-dark hover:shadow-lg hover:shadow-accent/25"
            >
              Download the app
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.3 }}
          className="lg:col-span-5"
        >
          <div className="mx-auto w-full max-w-xs rounded-[2.2rem] border border-line bg-surface p-3 shadow-xl shadow-ink/5">
            <div className="rounded-[1.7rem] bg-accent-soft p-5">
              <p className="text-xs font-medium uppercase tracking-widest text-accent-dark">
                Due this week
              </p>
              <p className="mt-2 font-display text-4xl font-semibold text-ink">₹15,333</p>
              <p className="text-sm text-muted">across 3 chits</p>
              <div className="mt-5 space-y-3">
                <PreviewRow name="Saraswathi Trust" pot="₹1,99,992" delay={0.65} />
                <PreviewRow name="Anna Nagar Family" pot="₹1,00,000" delay={0.75} />
                <PreviewRow name="Office Lunch Chit" pot="₹20,000" delay={0.85} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function PreviewRow({ name, pot, delay }: { name: string; pot: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      className="flex items-center justify-between rounded-xl bg-surface px-4 py-3"
    >
      <span className="text-sm font-medium text-ink">{name}</span>
      <span className="text-sm text-muted">{pot}</span>
    </motion.div>
  );
}

// Slow, breathing accent glow — the "subtle motion" hero from the guide.
function GradientGlow() {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute -right-40 top-1/4 -z-10 h-[42rem] w-[42rem] rounded-full bg-accent/10 blur-[120px]"
      animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
      transition={{ duration: 9, ease: "easeInOut", repeat: Infinity }}
    />
  );
}
