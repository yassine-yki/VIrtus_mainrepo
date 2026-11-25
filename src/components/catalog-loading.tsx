import { Header } from "./brand";
import { CatalogIntro } from "./catalog-intro";
import { parseFilters } from "@/lib/search";
export function CatalogLoading({ techMode = false }: { techMode?: boolean }) {
  return (
    <>
      <Header />
      <main id="main" className="catalog-page" aria-busy="true">
        <CatalogIntro
          filters={parseFilters(techMode ? { tech: "1" } : {})}
          cities={[]}
          compact
          techMode={techMode}
        />
        <div className="source-strip loading-source-strip" aria-hidden="true">
          <div className="shell source-strip-inner">
            <span>Des sources identifiées</span>
            <div className="loading-logo-slot" />
          </div>
        </div>
        <section className="catalog shell catalog-pending">
          <div className="catalog-top">
            <h2>Les offres. Votre prochaine étape.</h2>
          </div>
          <p role="status">Recherche des opportunités…</p>
          <div className="loading-rows" aria-hidden="true">
            {[0, 1, 2].map((n) => (
              <div key={n}>
                <span />
                <span />
                <span />
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
