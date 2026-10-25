import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Search,
  MapPin,
  SlidersHorizontal,
  Check,
  Layers3,
} from "lucide-react";
import { Header, Footer } from "@/components/brand";
import { JobCard } from "@/components/job-card";
import { searchCatalog } from "@/lib/catalog";
import { parseFilters, filtersUrl } from "@/lib/search";
import { number, shortDate } from "@/lib/format";
import type { Filters } from "@/lib/types";

export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseFilters(await searchParams);
  const result = await searchCatalog(filters);
  const activeFilters = [
    filters.city,
    filters.contract,
    filters.workplace,
    filters.source,
    filters.days,
    filters.kind,
  ].filter(Boolean).length;
  return (
    <>
      <Header />
      <main id="main">
        <section className="hero shell">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="live-dot" /> DE NOUVELLES PERSPECTIVES, AU MAROC
            </p>
            <h1>
              Le bon poste.
              <br />
              <span>Au même endroit.</span>
            </h1>
            <p className="hero-description">
              Votre prochain chapitre mérite mieux que vingt onglets ouverts.
              Les offres se rassemblent ici. À vous de choisir la suite.
            </p>
            <div className="hero-benefits">
              <span>
                <Check size={14} /> Sans compte
              </span>
              <span>
                <Check size={14} /> Liens directs
              </span>
              <span>
                <Check size={14} /> Sources transparentes
              </span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <span className="art-coordinate">33°35′ N · 7°37′ W</span>
            <div className="art-stamp">
              MA
              <span>
                VOTRE PROCHAINE
                <br />
                DESTINATION
              </span>
            </div>
            <div className="art-note note-one">
              <span className="note-icon">↗</span>
              <span>
                De nouvelles portes
                <br />
                <strong>s’ouvrent ici.</strong>
              </span>
            </div>
            <div className="art-note note-two">
              <span className="note-dot" /> Casablanca · Rabat · et au-delà
            </div>
            <span className="art-star">✳</span>
          </div>
        </section>
        <section
          className="search-section shell"
          aria-label="Rechercher un emploi"
        >
          <form action="/#offres" className="search-form">
            <label className="keyword-field">
              <Search size={21} />
              <span className="sr-only">Métier, compétence ou entreprise</span>
              <input
                name="q"
                defaultValue={filters.q}
                placeholder="Un métier, une compétence, une entreprise…"
                maxLength={120}
              />
            </label>
            <label className="location-field">
              <MapPin size={19} />
              <span className="sr-only">Ville</span>
              <select
                name="city"
                aria-label="Ville de recherche"
                defaultValue={filters.city}
              >
                <option value="">Tout le Maroc</option>
                {result.cities.map((city) => (
                  <option key={city.key} value={city.key}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>
            {(
              [
                "contract",
                "workplace",
                "source",
                "days",
                "sort",
                "kind",
              ] as const
            ).map((name) =>
              filters[name] ? (
                <input
                  key={name}
                  type="hidden"
                  name={name}
                  value={filters[name]}
                />
              ) : null,
            )}
            <button className="search-button" type="submit">
              Explorer les offres <ArrowRight size={18} />
            </button>
          </form>
          <div className="search-bottom">
            <p>
              Un seul point de départ. Des opportunités de plusieurs sources.
            </p>
            <a href="#offres">
              Découvrir <ArrowDown size={13} />
            </a>
          </div>
        </section>
        <div className="source-strip">
          <div className="shell source-strip-inner">
            <span>
              DIRECTEMENT DEPUIS
              <br />
              <strong>LES SOURCES CONNECTÉES</strong>
            </span>
            <div>
              {result.sources
                .filter((source) => source.count > 0)
                .slice(0, 5)
                .map((source) => (
                  <span key={source.id}>{source.name}</span>
                ))}
              {!result.sources.some((source) => source.count > 0) && (
                <span>Une sélection en préparation</span>
              )}
            </div>
            <Link href="/sources" aria-label="Comprendre les sources affichées">
              <ArrowUpRight size={20} />
            </Link>
          </div>
        </div>
        <section
          id="offres"
          className="catalog shell"
          aria-labelledby="results-heading"
        >
          <div className="catalog-top">
            <div>
              <p className="eyebrow">LA SUITE SE TROUVE PEUT-ÊTRE ICI</p>
              <h2 id="results-heading">
                À chaque ambition,
                <br className="mobile-break" /> une opportunité
                <span className="coral">.</span>
              </h2>
            </div>
            <span className="catalog-edition">MAROC / ÉDITION 01</span>
          </div>
          {result.mode === "snapshot" && (
            <div className="notice">
              <Layers3 size={18} />
              <p>
                <strong>Données locales de développement.</strong> Collecte du{" "}
                {shortDate(result.checked_at)}.
              </p>
            </div>
          )}
          {result.error && (
            <div role="alert" className="notice error">
              {result.error}
            </div>
          )}
          <div className="catalog-grid">
            <aside className="filters">
              <details open>
                <summary>
                  <span>
                    <SlidersHorizontal size={16} /> Affiner la recherche
                  </span>
                  {activeFilters > 0 && (
                    <span className="filter-counter">{activeFilters}</span>
                  )}
                </summary>
                <form action="/#offres">
                  <input type="hidden" name="q" value={filters.q} />
                  <input type="hidden" name="sort" value={filters.sort} />
                  <label>
                    Type d’opportunité
                    <select
                      name="kind"
                      aria-label="Type d’opportunité"
                      defaultValue={filters.kind ?? ""}
                    >
                      <option value="">Toutes les opportunités</option>
                      <option value="job">Emplois employeurs</option>
                      <option value="competition">Concours publics</option>
                    </select>
                  </label>
                  <label>
                    Ville
                    <select
                      name="city"
                      aria-label="Ville du poste"
                      defaultValue={filters.city}
                    >
                      <option value="">Toutes les villes</option>
                      {result.cities.map((city) => (
                        <option value={city.key} key={city.key}>
                          {city.name} ({city.count})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Type de contrat
                    <select
                      name="contract"
                      aria-label="Type de contrat"
                      defaultValue={filters.contract}
                    >
                      <option value="">Tous les contrats</option>
                      {[
                        "CDI",
                        "CDD",
                        "Stage",
                        "Freelance",
                        "Intérim",
                        "Non précisé",
                      ].map((contract) => (
                        <option key={contract}>{contract}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Mode de travail
                    <select
                      name="workplace"
                      aria-label="Mode de travail"
                      defaultValue={filters.workplace}
                    >
                      <option value="">Tous les modes</option>
                      <option value="onsite">Sur site</option>
                      <option value="hybrid">Hybride</option>
                      <option value="remote">À distance au Maroc</option>
                      <option value="unknown">Non précisé</option>
                    </select>
                  </label>
                  <label>
                    Date de publication
                    <select
                      name="days"
                      aria-label="Date de publication"
                      defaultValue={String(filters.days)}
                    >
                      <option value="0">Toutes les dates</option>
                      <option value="1">Dernières 24 heures</option>
                      <option value="7">7 derniers jours</option>
                      <option value="30">30 derniers jours</option>
                    </select>
                  </label>
                  <label>
                    Source
                    <select
                      name="source"
                      aria-label="Source"
                      defaultValue={filters.source}
                    >
                      <option value="">Toutes les sources</option>
                      {result.sources.map((source) => (
                        <option value={source.id} key={source.id}>
                          {source.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" className="filter-submit">
                    Appliquer les filtres <ArrowRight size={14} />
                  </button>
                  {(activeFilters > 0 || filters.q) && (
                    <Link className="reset-link" href="/#offres">
                      Effacer la recherche
                    </Link>
                  )}
                </form>
              </details>
              <div className="sidebar-note">
                <span className="small-star">✳</span>
                <h3>
                  Votre recherche,
                  <br />
                  sans les détours.
                </h3>
                <p>
                  Une offre vous parle ? Retrouvez tous les détails et postulez
                  directement sur le site d’origine.
                </p>
                <Link href="/sources">
                  Comment ça marche <ArrowUpRight size={14} />
                </Link>
              </div>
            </aside>
            <div className="results">
              <div className="results-toolbar">
                <p>
                  <strong>{number(result.total)}</strong>{" "}
                  {result.total === 1 ? "offre" : "offres"}
                  {filters.q ? (
                    <>
                      {" "}
                      pour <strong>« {filters.q} »</strong>
                    </>
                  ) : (
                    " à explorer"
                  )}
                </p>
                <form action="/#offres" className="sort-form">
                  {Object.entries(filters)
                    .filter(
                      ([name, value]) =>
                        !["page", "sort"].includes(name) && value,
                    )
                    .map(([name, value]) => (
                      <input
                        key={name}
                        type="hidden"
                        name={name}
                        value={value}
                      />
                    ))}
                  <label className="sr-only" htmlFor="sort">
                    Trier les offres
                  </label>
                  <select id="sort" name="sort" defaultValue={filters.sort}>
                    <option value="recent">Les plus récentes</option>
                    <option value="relevance">Pertinence</option>
                  </select>
                  <button type="submit" aria-label="Appliquer le tri">
                    <ArrowDown size={15} />
                  </button>
                </form>
              </div>
              {result.jobs.length ? (
                <div className="job-list">
                  {result.jobs.map((job) => (
                    <JobCard key={job.group_key} job={job} />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Search size={31} strokeWidth={1.3} />
                  <h3>
                    {result.error
                      ? "La recherche fait une pause."
                      : result.mode === "snapshot"
                        ? "Aucune offre avec ces critères."
                        : "Les premières opportunités arrivent."}
                  </h3>
                  <p>
                    {result.error
                      ? "Vos critères sont conservés. Vous pouvez réessayer."
                      : filters.q || activeFilters
                        ? "Essayez un autre mot-clé ou élargissez vos filtres."
                        : "Le catalogue sera disponible dès la validation des premières sources. Notre méthode reste consultable en attendant."}
                  </p>
                  <Link
                    className="text-link"
                    href={filters.q || activeFilters ? "/#offres" : "/sources"}
                  >
                    {filters.q || activeFilters
                      ? "Élargir ma recherche"
                      : "Découvrir nos sources"}{" "}
                    <ArrowRight size={15} />
                  </Link>
                </div>
              )}
              <Pagination
                filters={filters}
                page={result.page}
                total={result.total}
                pageSize={result.pageSize}
              />
              <p className="results-note">
                Recherche dans tout le catalogue indexé. Les offres peuvent
                évoluer : vérifiez leur disponibilité auprès de l’employeur.
                {result.checked_at && (
                  <> Dernière collecte : {shortDate(result.checked_at)}.</>
                )}
              </p>
            </div>
          </div>
        </section>
        <section className="closing shell">
          <div>
            <p className="eyebrow">UNE RECHERCHE PLUS CLAIRE</p>
            <h2>
              Votre temps est précieux.
              <br />
              <em>Gardez-le pour la suite.</em>
            </h2>
          </div>
          <Link href="/sources">
            Les sources derrière les offres <ArrowUpRight size={19} />
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
function Pagination({
  filters,
  page,
  total,
  pageSize,
}: {
  filters: Filters;
  page: number;
  total: number;
  pageSize: number;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages < 2) return null;
  const visible = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((value) => value >= 1 && value <= pages)
    .sort((a, b) => a - b);
  return (
    <nav className="pagination" aria-label="Pages de résultats">
      {page > 1 ? (
        <Link href={filtersUrl(filters, { page: page - 1 })}>← Précédent</Link>
      ) : (
        <span />
      )}
      <div>
        {visible.map((value, index) => (
          <span key={value}>
            {index > 0 && value - visible[index - 1] > 1 && (
              <span className="ellipsis">…</span>
            )}
            <Link
              aria-current={value === page ? "page" : undefined}
              aria-label={`Page ${value}`}
              href={filtersUrl(filters, { page: value })}
            >
              {value}
            </Link>
          </span>
        ))}
      </div>
      {page < pages ? (
        <Link href={filtersUrl(filters, { page: page + 1 })}>Suivant →</Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
