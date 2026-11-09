import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Virtus, accueil">
      <svg
        width="29"
        height="29"
        viewBox="0 0 29 29"
        fill="none"
        aria-hidden="true"
      >
        <path d="M2 5h7l6 15 6-15h6L17 27h-5L2 5Z" fill="currentColor" />
        <path d="M19 2h8v8" stroke="#f29a43" strokeWidth="3" />
      </svg>
      <span>
        virtus<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
export function Header() {
  return (
    <div className="site-header-wrap">
      <header className="site-header shell">
        <Brand />
        <nav aria-label="Navigation principale">
          <a href="/#offres">Les offres</a>
          <Link href="/sources">Nos sources</Link>
        </nav>
        <a className="header-cta" href="/#offres">
          Explorer les offres <ArrowRight size={17} />
        </a>
      </header>
    </div>
  );
}
export function Footer() {
  return (
    <footer className="site-footer shell">
      <div>
        <Brand />
        <p>Moins d’onglets. Plus de possibilités.</p>
      </div>
      <div className="footer-links">
        <Link href="/sources">Sources & méthode</Link>
        <a
          href="https://github.com/yassine-yki/VIrtus_mainrepo"
          target="_blank"
          rel="noopener noreferrer"
        >
          Le projet <ArrowUpRight size={14} />
        </a>
      </div>
      <p className="footer-note">
        Les candidatures se font sur le site d’origine.
        <br />
        Une sélection de sources, pas la totalité du marché.
      </p>
    </footer>
  );
}
