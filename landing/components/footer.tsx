export default function Footer() {
  return (
    <footer className="border-t border-line bg-surface py-12">
      <div className="mx-auto flex max-w-content flex-col items-center justify-between gap-6 px-6 sm:flex-row">
        <span className="font-display text-xl font-semibold text-ink">chitti</span>
        <nav className="flex items-center gap-8 text-sm text-muted">
          <a href="#features" className="transition-colors hover:text-ink">Features</a>
          <a href="#how" className="transition-colors hover:text-ink">How it works</a>
          <a href="#download" className="transition-colors hover:text-ink">Download</a>
        </nav>
        <p className="text-sm text-muted">© 2026 Chitti</p>
      </div>
    </footer>
  );
}
