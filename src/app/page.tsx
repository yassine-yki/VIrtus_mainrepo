import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Search,
  MapPin,
  Check,
  Layers3,
  X,
  Globe2,
} from "lucide-react";
import { Header, Footer } from "@/components/brand";
import { FilterDisclosure } from "@/components/filter-disclosure";
import { JobCard } from "@/components/job-card";
import { searchCatalog } from "@/lib/catalog";
import { parseFilters, filtersUrl } from "@/lib/search";
import { number, shortDate, workplaceLabels } from "@/lib/format";
import type { Filters } from "@/lib/types";

export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseFilters(await searchParams);
  const result = await searchCatalog(filters);
  const selectedFilters = [
    { key: "q", label: filters.q },
    {
      key: "city",
      label:
        result.cities.find((city) => city.key === filters.city)?.name ??
        filters.city,
    },
    { key: "contract", label: filters.contract },
    {
      key: "workplace",
      label: filters.workplace
        ? workplaceLabels[filters.workplace as keyof typeof workplaceLabels]
        : "",
    },
    {
      key: "source",
      label:
        result.sources.find((source) => source.id === filters.source)?.name ??
        filters.source,
    },
    {
      key: "kind",
      label:
        filters.kind === "competition"
          ? "Concours publics"
          : filters.kind === "job"
            ? "Emplois employeurs"
            : "",
    },
  ].filter((filter) => filter.label);
  const activeFilters =
    selectedFilters.filter((filter) => filter.key !== "q").length +
    (filters.days ? 1 : 0);
  return (
    <>
      <Header />
      <main id="main">
        <div className="hero-surface">
          <section className="hero shell" aria-labelledby="hero-heading">
            <div className="hero-copy">
              <p className="eyebrow">
                <Globe2 size={15} /> VOTRE AVENIR S'ÉCRIT AU MAROC
              </p>
              <h1 id="hero-heading">
                Moins de recherches.
                <br />
                <span>Plus de possibilités.</span>
              </h1>
              <p className="hero-description">
                Les offres d'emploi et les concours publics, réunis au même
                endroit.
                <br className="desktop-break" /> Trouvez votre prochaine étape.
                Postulez directement à la source.
              </p>
            </div>
            <div className="hero-decoration" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </section>
          <section
            className="search-section shell"
            aria-label="Rechercher un emploi"
          >
            <form
              key={filtersUrl(filters)}
              action="/#offres"
              className="search-form"
            >
              <label className="keyword-field">
                <Search size={21} />
                <span className="sr-only">
                  Métier, compétence ou entreprise
                </span>
                <input
                  name="q"
                  type="search"
                  defaultValue={filters.q}
                  placeholder="Métier, compétence ou entreprise"
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
                filters[name] || name === "days" ? (
                  <input
                    key={name}
                    type="hidden"
                    name={name}
                    value={filters[name]}
                  />
                ) : null,
              )}
              <button className="search-button" type="submit">
                Rechercher <ArrowRight size={18} />
              </button>
            </form>
            <div className="quick-searches" aria-label="Idées de recherche">
              <span>À explorer</span>
              {[
                {
                  label: "Développeur",
                  changes: { q: "développeur", kind: "job" as const },
                },
                { label: "Data", changes: { q: "data", kind: "job" as const } },
                {
                  label: "Stages",
                  changes: { q: "", contract: "Stage", kind: "job" as const },
                },
                {
                  label: "Télétravail",
                  changes: { workplace: "remote", kind: "job" as const },
                },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={filtersUrl(parseFilters({}), item.changes)}
                >
                  {item.label}
                  <ArrowUpRight size={13} />
                </Link>
              ))}
            </div>
            <div className="hero-benefits">
              <span>
                <Check size={15} /> Sans compte
              </span>
              <span>
                <Check size={15} /> Candidature à la source
              </span>
              <span>
                <Check size={15} /> Accès gratuit
              </span>
            </div>
          </section>
        </div>
        <div className="source-strip">
          <div className="shell source-strip-inner">
            <span>
              À RETROUVER SUR VIRTUS
              <br />
              <strong>Des sources identifiées</strong>
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
              <p className="eyebrow">VOTRE PROCHAINE ÉTAPE</p>
              <h2 id="results-heading">Une opportunité à votre image.</h2>
              <p className="catalog-intro">
                Explorez les annonces. Affinez vos critères. Trouvez votre voie.
              </p>
            </div>
            <Link className="catalog-method" href="/sources">
              Comment ça marche <ArrowUpRight size={16} />
            </Link>
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
          <nav className="opportunity-tabs" aria-label="Types d'opportunités">
            {[
              { value: "", label: "Toutes les opportunités" },
              { value: "job", label: "Emplois employeurs" },
              { value: "competition", label: "Concours publics" },
            ].map((item) => (
              <Link
                key={item.value}
                href={filtersUrl(filters, {
                  kind: item.value as Filters["kind"],
                  page: 1,
                })}
                aria-current={
                  (filters.kind ?? "") === item.value ? "page" : undefined
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="catalog-grid">
            <aside className="filters">
              <FilterDisclosure count={activeFilters}>
                <form key={filtersUrl(filters)} action="/#offres">
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
              </FilterDisclosure>
              <div className="sidebar-note">
                <ArrowUpRight size={24} />
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
              <div
                className="active-filters"
                aria-label="Critères de recherche actifs"
              >
                <Link
                  className="date-context"
                  href={filtersUrl(filters, {
                    days: filters.days ? 0 : 30,
                    page: 1,
                  })}
                  aria-label={
                    filters.days
                      ? "Afficher toutes les dates"
                      : "Afficher les 30 derniers jours"
                  }
                >
                  {filters.days
                    ? filters.days === 1
                      ? "Dernières 24 heures"
                      : filters.days + " derniers jours"
                    : "Toutes les dates"}
                  {filters.days > 0 && <X size={13} />}
                </Link>
                {selectedFilters.map((filter) => (
                  <Link
                    key={filter.key}
                    href={filtersUrl(filters, { [filter.key]: "", page: 1 })}
                    aria-label={"Retirer le filtre " + filter.label}
                  >
                    {filter.label}
                    <X size={13} />
                  </Link>
                ))}
                {selectedFilters.length > 0 && (
                  <Link className="clear-filters" href="/#offres">
                    Tout effacer
                  </Link>
                )}
              </div>
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
                <form
                  key={filtersUrl(filters)}
                  action="/#offres"
                  className="sort-form"
                >
                  {Object.entries(filters)
                    .filter(
                      ([name, value]) =>
                        !["page", "sort"].includes(name) &&
                        (name === "days" || value),
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
                    <JobCard
                      key={job.group_key}
                      job={job}
                      searchHref={filtersUrl(filters, { page: result.page })}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Search size={31} strokeWidth={1.3} />
                  <h3>
                    {result.error
                      ? "La recherche fait une pause."
                      : "Aucune offre avec ces critères."}
                  </h3>
                  <p>
                    {result.error
                      ? "Vos critères sont conservés. Vous pouvez réessayer."
                      : filters.q || activeFilters
                        ? "Essayez un autre mot-clé ou élargissez vos filtres."
                        : "Essayez un autre mot-clé ou consultez toutes les dates."}
                  </p>
                  <Link
                    className="text-link"
                    href={
                      filters.q || activeFilters
                        ? "/?days=0#offres"
                        : "/sources"
                    }
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
                {filters.days
                  ? `Publications des ${filters.days} derniers jours. Les dates non précisées sont exclues.`
                  : "Toutes les dates, y compris les annonces anciennes encore présentes dans les flux."}{" "}
                Les offres peuvent évoluer : vérifiez leur disponibilité auprès
                de l’employeur.
                {result.checked_at && (
                  <>
                    {" "}
                    Collecte la plus ancienne parmi les sources :{" "}
                    {shortDate(result.checked_at)}.
                  </>
                )}
              </p>
            </div>
          </div>
        </section>
        <section className="closing shell">
          <div>
            <p className="eyebrow">UNE RECHERCHE PLUS CLAIRE</p>
            <h2>
              Votre prochain chapitre
              <br />
              <em>commence par une rencontre.</em>
            </h2>
          </div>
          <Link href="/sources">
            Découvrir notre méthode <ArrowUpRight size={19} />
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
