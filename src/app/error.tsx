"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="not-found shell">
      <p className="eyebrow">UN INSTANT</p>
      <h1>
        La page n’a pas
        <br />
        pu se charger.
      </h1>
      <p>Réessayez dans quelques instants.</p>
      <button className="search-button" onClick={reset}>
        Réessayer
      </button>
    </main>
  );
}
