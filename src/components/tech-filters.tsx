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
        <details
          className="tech-filter-group"
          key={name}
          open={!!filters[name]}
        >
          <summary>
            {label}
            <span>
              {filters[name]
                ? filters[name].split(",").length + " sélectionné(s)"
                : "Tous"}
            </span>
          </summary>
          <fieldset>
            <legend className="sr-only">{label}</legend>
            {Object.entries(options).map(([value, text]) => (
              <label className="check-row" key={value}>
                <input
                  type="checkbox"
                  name={name}
                  value={value}
                  defaultChecked={(filters[name] || "")
                    .split(",")
                    .includes(value)}
                />
                {text}
              </label>
            ))}
          </fieldset>
        </details>
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
