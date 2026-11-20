import { families, seniorities, type TechMetadata, classifyTech } from "./tech";
import { profileSkills, type CandidateProfile } from "./profile";
import type { Job } from "./types";
export interface Match {
  job: Job;
  score: number;
  reasons: string[];
  gaps: string[];
  conflicts: string[];
  unknowns: string[];
  completeness: TechMetadata["completeness"];
}
export function matchJob(profile: CandidateProfile, job: Job): Match | null {
  const tech = job.tech ?? classifyTech(job.title, "", job.kind);
  if (!job.active || job.kind === "competition" || !tech.families.length)
    return null;
  const skills = profileSkills(profile),
    shared = tech.technologies.filter((s) => skills.includes(s));
  const family = tech.families.filter((f) =>
    profile.preferences.families.values.includes(f),
  );
  if (!family.length && shared.length < 2) return null;
  const reasons: string[] = [],
    gaps: string[] = [],
    conflicts: string[] = [],
    unknowns: string[] = [];
  const expected: Record<keyof CandidateProfile["preferences"], string[]> = {
    families: tech.families,
    seniority: tech.seniority === "unknown" ? [] : [tech.seniority],
    cities: job.city_keys,
    workplace: job.workplace === "unknown" ? [] : [job.workplace],
    internship: tech.pfe
      ? ["pfe", "internship"]
      : job.contract === "Stage"
        ? ["internship"]
        : job.contract === "Non précisé"
          ? []
          : ["job"],
  };
  const labels = {
    families: "Métier",
    seniority: "Niveau",
    cities: "Ville",
    workplace: "Mode de travail",
    internship: "Stage / PFE",
  };
  for (const [k, pref] of Object.entries(profile.preferences) as [
    keyof typeof expected,
    CandidateProfile["preferences"]["families"],
  ][]) {
    if (!pref.values.length) continue;
    if (!expected[k].length) {
      if (pref.mandatory) return null;
      unknowns.push(`${labels[k]} non précisé dans l'annonce.`);
      continue;
    }
    if (!pref.values.some((v) => expected[k].includes(v))) {
      if (pref.mandatory) return null;
      conflicts.push(`${labels[k]} différent de votre préférence.`);
    }
  }
  if (family.length)
    reasons.push(
      `Métier recherché : ${family.map((f) => families[f]).join(", ")}.`,
    );
  if (shared.length)
    reasons.push(`Technologies en commun : ${shared.join(", ")}.`);
  const missing = tech.requiredTechnologies.filter((s) => !skills.includes(s));
  if (missing.length)
    gaps.push(
      `Compétences requises non indiquées dans votre profil : ${missing.join(", ")}.`,
    );
  const missingLanguages = tech.requiredLanguages.filter(
    (l) => !profile.languages.includes(l),
  );
  if (missingLanguages.length)
    gaps.push(
      `Langues requises non indiquées dans votre profil : ${missingLanguages.join(", ")}.`,
    );
  const seniorityMatches = profile.preferences.seniority.values.includes(
    tech.seniority,
  );
  if (seniorityMatches)
    reasons.push(`Niveau recherché : ${seniorities[tech.seniority]}.`);
  if (tech.minimumYears !== null) {
    if (profile.years === null)
      unknowns.push(
        `L'annonce demande ${tech.minimumYears} ans ; votre expérience totale n'est pas confirmée.`,
      );
    else if (profile.years < tech.minimumYears)
      conflicts.push(
        `${tech.minimumYears} ans minimum demandés ; ${profile.years} ans confirmés dans votre profil.`,
      );
    else
      reasons.push(
        `Votre expérience confirmée couvre les ${tech.minimumYears} ans minimum indiqués.`,
      );
  }
  if (!tech.requiredTechnologies.length)
    unknowns.push("Compétences obligatoires non précisées ou non identifiées.");
  if (!tech.requiredLanguages.length)
    unknowns.push("Langues requises non précisées ou non identifiées.");
  if (tech.completeness === "title-only")
    unknowns.push(
      "Évaluation limitée au titre et aux métadonnées disponibles.",
    );
  const basis = tech.requiredTechnologies.length
    ? tech.requiredTechnologies
    : tech.technologies;
  const technologyScore = basis.length
    ? (35 * basis.filter((s) => skills.includes(s)).length) / basis.length
    : 0;
  const languageScore = tech.requiredLanguages.length
    ? (10 *
        tech.requiredLanguages.filter((l) => profile.languages.includes(l))
          .length) /
      tech.requiredLanguages.length
    : 0;
  if (languageScore)
    reasons.push(
      `Langues requises présentes dans votre profil : ${tech.requiredLanguages.filter((l) => profile.languages.includes(l)).join(", ")}.`,
    );
  return {
    job: { ...job, tech },
    score:
      (family.length ? 40 : 0) +
      technologyScore +
      (seniorityMatches ? 15 : 0) +
      languageScore,
    reasons,
    gaps,
    conflicts,
    unknowns,
    completeness: tech.completeness,
  };
}
export function rankMatches(
  profile: CandidateProfile,
  jobs: Job[],
  days = 30,
  page = 1,
  now = Date.now(),
) {
  const matches = jobs
    .filter(
      (j) =>
        Date.parse(j.last_seen_at) > now - 72 * 3600000 &&
        (!days ||
          (j.published_at &&
            Date.parse(j.published_at) >= now - days * 86400000)),
    )
    .map((j) => matchJob(profile, j))
    .filter((m): m is Match => m !== null)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Date.parse(b.job.published_at || "1970-01-01") -
          Date.parse(a.job.published_at || "1970-01-01") ||
        a.job.group_key.localeCompare(b.job.group_key),
    );
  const current = Math.min(
    Math.max(1, page),
    Math.max(1, Math.ceil(matches.length / 12)),
  );
  return {
    matches: matches
      .slice((current - 1) * 12, current * 12)
      .map(({ score: _score, ...match }) => match),
    total: matches.length,
    page: current,
    pageSize: 12,
    days,
    classificationVersion: 1,
  };
}
