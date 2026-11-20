import {
  canonicalSkills,
  families,
  seniorities,
  type Family,
  type Seniority,
} from "./tech";
export interface Experience {
  role: string;
  organization: string;
  start: string;
  end: string;
}
export interface Preference {
  values: string[];
  mandatory: boolean;
}
export interface CandidateProfile {
  version: 1;
  skills: string[];
  history: Experience[];
  education: string[];
  projects: string[];
  languages: string[];
  years: number | null;
  preferences: {
    families: Preference;
    seniority: Preference;
    cities: Preference;
    workplace: Preference;
    internship: Preference;
  };
}
export const emptyProfile = (): CandidateProfile => ({
  version: 1,
  skills: [],
  history: [],
  education: [],
  projects: [],
  languages: [],
  years: null,
  preferences: {
    families: { values: [], mandatory: false },
    seniority: { values: [], mandatory: false },
    cities: { values: [], mandatory: false },
    workplace: { values: [], mandatory: false },
    internship: { values: [], mandatory: false },
  },
});
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Profil invalide.");
  return value as Record<string, unknown>;
}
function strings(value: unknown, max = 80): string[] {
  if (
    !Array.isArray(value) ||
    value.length > max ||
    value.some((v) => typeof v !== "string" || v.length > 1000)
  )
    throw new Error("Champ de profil invalide ou trop long.");
  return [...new Set(value.map((v) => (v as string).trim()).filter(Boolean))];
}
export function validateProfile(raw: unknown): CandidateProfile {
  const o = object(raw);
  if (
    JSON.stringify(o).length > 30000 ||
    o.version !== 1 ||
    !Array.isArray(o.history) ||
    o.history.length > 30
  )
    throw new Error("Profil trop long ou invalide.");
  const history = o.history.map((item) => {
    const row = object(item);
    const result: Experience = {
      role: "",
      organization: "",
      start: "",
      end: "",
    };
    for (const k of Object.keys(result) as (keyof Experience)[]) {
      if (typeof row[k] !== "string" || (row[k] as string).length > 300)
        throw new Error("Expérience invalide.");
      result[k] = (row[k] as string).trim();
    }
    if (
      [result.start, result.end].some(
        (date) => date && !/^\d{4}-(0[1-9]|1[0-2])$/.test(date),
      )
    )
      throw new Error("Les dates doivent être au format AAAA-MM.");
    if (result.start && result.end && result.start > result.end)
      throw new Error("Les dates d'expérience sont inversées.");
    return result;
  });
  if (
    o.years !== null &&
    (typeof o.years !== "number" ||
      !Number.isFinite(o.years) ||
      o.years < 0 ||
      o.years > 70)
  )
    throw new Error("Expérience totale invalide.");
  const preferences = emptyProfile().preferences,
    p = object(o.preferences);
  for (const k of Object.keys(preferences) as (keyof typeof preferences)[]) {
    const v = object(p[k]);
    if (typeof v.mandatory !== "boolean")
      throw new Error("Préférence invalide.");
    const values = strings(v.values, 40);
    const valid =
      k === "families"
        ? Object.keys(families)
        : k === "seniority"
          ? Object.keys(seniorities).filter((s) => s !== "unknown")
          : k === "workplace"
            ? ["onsite", "remote", "hybrid"]
            : k === "internship"
              ? ["internship", "pfe", "job"]
              : null;
    if (valid && values.some((s) => !valid.includes(s)))
      throw new Error("Préférence inconnue.");
    if (k === "cities" && values.some((s) => !/^[a-z-]{1,60}$/.test(s)))
      throw new Error("Ville invalide.");
    preferences[k] = { values, mandatory: v.mandatory };
  }
  const languages = strings(o.languages, 3);
  if (languages.some((v) => !["fr", "en", "ar"].includes(v)))
    throw new Error("Langue inconnue.");
  return {
    version: 1,
    skills: strings(o.skills),
    history,
    education: strings(o.education, 20),
    projects: strings(o.projects, 30),
    languages,
    years: o.years as number | null,
    preferences,
  };
}
export function profileSkills(p: CandidateProfile): string[] {
  return canonicalSkills(p.skills.join(" "));
}
export function targetFamilies(p: CandidateProfile): Family[] {
  return p.preferences.families.values as Family[];
}
export function targetSeniority(p: CandidateProfile): Seniority[] {
  return p.preferences.seniority.values as Seniority[];
}
