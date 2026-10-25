import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { Header, Footer } from "@/components/brand";
import { catalogSources } from "@/lib/catalog";
import { shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nos sources et notre méthode" };
export default async function SourcesPage() {
  const result = await catalogSources();
  const providers = new Set(result.sources.map((source) => source.provider));
  const labels: Record<string, string> = {
    smartrecruiters: "SmartRecruiters",
    greenhouse: "Greenhouse",
    lever: "Lever",
    wadifa: "API Wadifa Info",
  };
  return (
    <>
      <Header />
      <main id="main" className="sources-page shell">
        <p className="eyebrow">LA TRANSPARENCE, DÈS LE DÉPART</p>
        <h1>
          Des opportunités.
          <br />
          <em>Des sources identifiées.</em>
        </h1>
        <p className="page-intro">
          Virtus rassemble une sélection d’emplois et de concours publics au
          Maroc. Chaque annonce garde son lien d’origine : vérifiez les
          conditions et postulez à la source.
        </p>
        <div className="method-grid">
          <article>
            <h2>01 / Collecter</h2>
            <p>
              Des API de recrutement et des flux autorisés alimentent le
              catalogue. Les collectes réussies sont datées ; un échec ne
              supprime pas les offres précédentes.
            </p>
          </article>
          <article>
            <h2>02 / Organiser</h2>
            <p>
              Les lieux et contrats sont harmonisés. Les doublons certains sont
              regroupés. Les concours sont retirés après leur date limite au
              Maroc.
            </p>
          </article>
          <article>
            <h2>03 / Vous laisser choisir</h2>
            <p>
              Recherchez ici, puis consultez le site d’origine. Aucun compte ni
              CV n’est demandé par Virtus.
            </p>
          </article>
        </div>
        <div className="section-title">
          <h2>
            {result.review || result.mode === "snapshot"
              ? "Sources de cet aperçu"
              : "Sources du catalogue public"}
          </h2>
          <span>
            {providers.size} INTÉGRATION{providers.size === 1 ? "" : "S"} ·{" "}
            {result.sources.length} FLUX
          </span>
        </div>
        {result.error && (
          <p className="notice" role="alert">
            {result.error}
          </p>
        )}
        <p className="section-description">
          {result.review || result.mode === "snapshot"
            ? "Cet aperçu comprend des sources en évaluation. Elles restent invisibles dans le catalogue public tant que leur diffusion n’est pas approuvée."
            : "Seules les sources approuvées et activées figurent ici. Les sources à l’étude ne sont pas comptées comme couverture publique."}
        </p>
        <div className="source-cards">
          {result.sources.map((source) => (
            <article key={source.id}>
              <div>
                <span className="provider-tag">
                  {labels[source.provider ?? ""] ?? "Flux"}
                </span>
                <span className="status-tag">
                  {source.publication_status === "approved"
                    ? "Diffusion validée"
                    : "En évaluation"}
                </span>
              </div>
              <h3>{source.name}</h3>
              <p>
                {source.count} opportunité{source.count === 1 ? "" : "s"}{" "}
                actuellement visible{source.count === 1 ? "" : "s"}.
              </p>
              <p>{source.permission_note}</p>
              <p>Dernière collecte réussie : {shortDate(source.checked_at)}.</p>
              {source.website && (
                <a
                  href={source.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Site de la source <ArrowUpRight size={15} />
                </a>
              )}
            </article>
          ))}
        </div>
        {!result.sources.length && !result.error && (
          <p>Les premières sources publiques sont en préparation.</p>
        )}
        <div className="method-note">
          <h2>Quelques limites, clairement dites.</h2>
          <p>
            Le catalogue couvre les sources connectées, pas tous les emplois au
            Maroc. Une date de découverte n’est pas une date de publication. Une
            localisation non précisée reste « Maroc ». Le nombre de postes d’un
            concours ne représente pas plusieurs annonces. L’avis officiel fait
            foi, notamment pour l’heure exacte de clôture. LinkedIn n’est pas
            connecté.
          </p>
        </div>
        <Link className="text-link" href="/#offres">
          Explorer les offres <ArrowRight size={16} />
        </Link>
      </main>
      <Footer />
    </>
  );
}
