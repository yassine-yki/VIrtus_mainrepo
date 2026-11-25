export const catalogCategories = [
  { id: "jobs", label: "EXPLORER", hint: "Toutes les offres" },
  { id: "tech", label: "TECH & IT", hint: "Les métiers du numérique" },
  {
    id: "internships",
    label: "STAGES & PFE",
    hint: "Les premières expériences",
  },
  { id: "remote", label: "TÉLÉTRAVAIL", hint: "Accessible depuis le Maroc" },
  { id: "profile", label: "MON PROFIL", hint: "Votre CV, vos correspondances" },
] as const;
export type CatalogCategory = (typeof catalogCategories)[number]["id"];
