import { CategoryNavigation } from "./category-navigation";
import {
  catalogCategories,
  categoryUrl,
  activeCategory,
} from "@/lib/catalog-navigation";
import { filtersUrl } from "@/lib/search";
import type { Filters } from "@/lib/types";
export function CatalogIntro({
  filters,
  cities,
  compact,
  techMode,
}: {
  filters: Filters;
  cities: { key: string; name: string }[];
  compact: boolean;
  techMode: boolean;
}) {
  return (
    <section
      className={"intro-stage" + (compact ? " intro-compact" : "")}
      aria-labelledby="hero-heading"
    >
      <div className="intro-grid shell">
        <div className="intro-heading">
          <p className="eyebrow">DES POSSIBILITÉS. PRÈS DE VOUS.</p>
          <h1 id="hero-heading">
            {techMode
              ? "Votre prochain défi tech, au Maroc."
              : "Votre prochain emploi, au Maroc."}
          </h1>
          <p>
            {techMode
              ? "Logiciel, data, cloud et métiers IT."
              : "Emplois, stages et concours. Une recherche, moins de détours."}
          </p>
        </div>
        <div className="intro-search">
          <h2>Qu’allez-vous faire ensuite ?</h2>
          <form
            key={filtersUrl(filters)}
            action={techMode ? "/tech#offres" : "/offres#offres"}
            className="intro-search-form"
          >
            <label>
              Métier, compétence ou entreprise
              <input
                name="q"
                type="search"
                defaultValue={filters.q}
                placeholder="Ex. développeur, Python…"
                maxLength={120}
              />
            </label>
            <label>
              Ville
              <select
                name="city"
                defaultValue={filters.city}
                aria-label="Ville de recherche"
              >
                <option value="">Tout le Maroc</option>
                {cities.map((city) => (
                  <option key={city.key} value={city.key}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>
            {Object.entries(filters)
              .filter(
                ([name, value]) =>
                  !["q", "city", "page"].includes(name) &&
                  (name === "days" || value),
              )
              .map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))}
            <button type="submit" className="search-button">
              Rechercher
            </button>
          </form>
          <p className="intro-assurance">
            Sans compte. Candidature sur le site d’origine.
          </p>
        </div>
        <CategoryNavigation
          compact={compact}
          links={catalogCategories
            .filter(
              (category) =>
                category.id !== "profile" ||
                process.env.CANDIDATE_PROFILES_ENABLED === "true",
            )
            .map((category) => ({
              id: category.id,
              href: categoryUrl(filters, category.id),
              current: activeCategory(filters) === category.id,
            }))}
        />
        <a className="intro-explore" href="#offres">
          Explorer les offres <span aria-hidden="true">↓</span>
        </a>
      </div>
    </section>
  );
}
