export const catalogCategories = [
  { id: "jobs", label: "EMPLOIS", hint: "Votre prochaine étape" },
  { id: "tech", label: "TECH", hint: "Construire demain" },
  { id: "internships", label: "STAGES", hint: "Faire ses premiers pas" },
  { id: "competitions", label: "CONCOURS", hint: "Le service public" },
  { id: "remote", label: "À DISTANCE", hint: "Travailler depuis le Maroc" },
] as const;
export type CatalogCategory = (typeof catalogCategories)[number]["id"];
