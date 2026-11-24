import { Header } from "./brand";
export function CatalogLoading() {
  return (
    <>
      <Header />
      <main id="main" className="catalog-loading shell" aria-busy="true">
        <p className="eyebrow">VOTRE PROCHAINE ÉTAPE</p>
        <h1>Les offres arrivent.</h1>
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
      </main>
    </>
  );
}
