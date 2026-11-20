import { families, seniorities, technologies } from "@/lib/tech";
import type { Filters } from "@/lib/types";
export function TechFilters({ filters }: { filters: Filters }) {
  return (
    <fieldset className="tech-filters">
      <legend>Votre spécialité</legend>
      <p className="filter-help">Plusieurs choix possibles par catégorie.</p>
      {(
        [
          ["family", "Métiers", families],
          [
            "technology",
            "Technologies",
            Object.fromEntries(technologies.map((t) => [t, t])),
          ],
          ["seniority", "Expérience", seniorities],
          [
            "language",
            "Langues requises",
            { fr: "Français", en: "Anglais", ar: "Arabe" },
          ],
        ] as const
      ).map(([name, label, options]) => (
        <label key={name}>
          {label}
          <select
            multiple
            name={name}
            size={4}
            defaultValue={(filters[name] || "").split(",")}
          >
            {Object.entries(options).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </label>
      ))}
      <label className="check-row">
        <input
          type="checkbox"
          name="pfe"
          value="1"
          defaultChecked={filters.pfe === "1"}
        />{" "}
        PFE explicitement indiqué
      </label>
    </fieldset>
  );
}
