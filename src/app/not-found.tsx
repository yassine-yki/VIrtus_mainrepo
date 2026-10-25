import Link from "next/link";
import { Header, Footer } from "@/components/brand";
export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="not-found shell">
        <p className="eyebrow">UNE AUTRE PORTE VOUS ATTEND</p>
        <h1>
          Cette offre n’est
          <br />
          plus disponible.
        </h1>
        <p>Elle a peut-être été retirée, ou son lien a changé.</p>
        <Link className="search-button" href="/#offres">
          Revenir aux opportunités ↗
        </Link>
      </main>
      <Footer />
    </>
  );
}
