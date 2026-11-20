/** Versioned, deterministic role classification. No employer-industry inference. */
export const TECH_VERSION = 1;
export const families = {
  software: "Développement logiciel",
  data: "Data & IA",
  cloud: "Cloud & DevOps",
  security: "Cybersécurité",
  qa: "Qualité logicielle",
  support: "Support IT & réseaux",
  erp: "ERP & applications",
  product: "Produit technique",
} as const;
export const seniorities = {
  internship: "Stage",
  junior: "Junior",
  mid: "Confirmé",
  senior: "Senior",
  lead: "Lead / management",
  unknown: "Non précisé",
} as const;
export type Family = keyof typeof families;
export type Seniority = keyof typeof seniorities;
export const normalized = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const technologyPatterns: Record<string, RegExp> = {
  javascript: /\bjavascript\b|(?<![\w.])js\b/,
  typescript: /\btypescript\b/,
  java: /\bjava\b/,
  python: /\bpython\b/,
  react: /\breact(?:js|\.js)?\b/,
  angular: /\bangular\b/,
  vue: /\bvue(?:js|\.js)?\b/,
  nodejs: /\bnode(?:js|\.js)\b/,
  dotnet: /\.net\b|\bdotnet\b|\bc#/,
  php: /\bphp\b/,
  laravel: /\blaravel\b/,
  spring: /\bspring\b/,
  sql: /\bsql\b/,
  postgresql: /\bpostgres(?:ql)?\b/,
  mysql: /\bmysql\b/,
  mongodb: /\bmongodb\b/,
  aws: /\baws\b|amazon web services/,
  azure: /\bazure\b/,
  gcp: /\bgcp\b|google cloud/,
  docker: /\bdocker\b/,
  kubernetes: /\bkubernetes\b|\bk8s\b/,
  terraform: /\bterraform\b/,
  linux: /\blinux\b/,
  sap: /\bsap\b/,
  salesforce: /\bsalesforce\b/,
  oracle: /\boracle\b/,
  servicenow: /\bservicenow\b/,
  powerbi: /\bpower\s?bi\b/,
  spark: /\b(?:apache )?spark\b/,
  tensorflow: /\btensorflow\b/,
  pytorch: /\bpytorch\b/,
  selenium: /\bselenium\b/,
  cypress: /\bcypress\b/,
  playwright: /\bplaywright\b/,
  git: /\bgit\b/,
  golang: /\bgolang\b|\bgo developer\b/,
  rust: /\brust\b/,
  cpp: /\bc\+\+/,
  cisco: /\bcisco\b/,
};
export const technologies = Object.keys(technologyPatterns);
export function canonicalSkills(text: string): string[] {
  const n = normalized(text);
  return technologies.filter((t) => technologyPatterns[t].test(n));
}
export interface TechMetadata {
  version: number;
  families: Family[];
  technologies: string[];
  requiredTechnologies: string[];
  seniority: Seniority;
  pfe: boolean;
  requiredLanguages: string[];
  minimumYears: number | null;
  completeness: "title-only" | "description";
  eligibility: "morocco" | "remote-morocco";
}
const rolePatterns: Record<Family, RegExp> = {
  software:
    /\b(developpeur|developer|developpement logiciel|software|full[ -]?stack|front[ -]?end|back[ -]?end|programmeur|programmer|architecte logiciel|architecte applicatif|embedded software|ingenieur logiciel|mobile engineer)\b/,
  data: /\b(data (engineer|scientist|analyst|architect|science)|ingenieur (data|donnees|ia)|analyste (data|donnees)|machine learning|intelligence artificielle|ai engineer|business intelligence|big data|ml engineer)\b/,
  cloud:
    /\b(devops|devsecops|sre|cloud (engineer|architect)|ingenieur cloud|architecte cloud|platform engineer|infrastructure (engineer|cloud))\b/,
  security:
    /\b(cybersecurity|cybersecurite|cyber security|securite (informatique|reseau|si)|information security|security (engineer|analyst|architect)|soc analyst|pentester|penetration tester)\b/,
  qa: /\b(qa|sdet|software test|test (automation|logiciel)|testeur logiciel|quality assurance engineer|ingenieur (test|validation) logiciel|automaticien test)\b/,
  support:
    /\b(it support|support (informatique|it|technique logiciel)|helpdesk|service desk|network engineer|ingenieur (reseau|systeme)|administrateur (systeme|reseau)|system administrator|it technician|technicien informatique)\b/,
  erp: /\b(sap|erp|salesforce|servicenow|dynamics 365|consultant oracle|oracle consultant)\b/,
  product:
    /\b(technical product|product (owner|manager).*\b(software|tech|digital|it)|chef de (projet|produit).*\b(informatique|digital|logiciel)|it (project|business)|business analyst.*\b(it|digital|software))\b/,
};
export function classifyTech(
  title: string,
  description = "",
  kind = "job",
  eligibility: TechMetadata["eligibility"] = "morocco",
): TechMetadata {
  const t = normalized(title),
    d = normalized(description);
  const commercial =
    /\b(business develop(?:er|peur)|developpeur commercial|sales representative|account executive)\b/.test(
      t,
    );
  const selected =
    kind === "competition" || commercial
      ? []
      : (Object.keys(families) as Family[]).filter((f) =>
          rolePatterns[f].test(t),
        );
  // Never treat company introductions or optional/desirable skills as mandatory requirements.
  const sentences = d.split(/[\n!?;]+|\.(?=\s|$)/);
  const requirements = sentences
    .filter(
      (s) =>
        /\b(required|must|mandatory|essential|requis(?:e?s)?|exige(?:e?s)?|obligatoire|indispensable|maitrise)\b/.test(
          s,
        ) &&
        !/\b(preferred|optional|souhaite|souhaitable|atout|idealement|apprecie|not required|non requis)\b/.test(
          s,
        ),
    )
    .join("\n");
  const skillsContext = sentences
    .filter(
      (s) =>
        /\b(experience|skills?|competences?|knowledge|connaissances?|maitrise|proficien\w*|required|requis\w*|preferred|souhait\w*|atout)\b/.test(
          s,
        ) &&
        !/\b(our company|notre entreprise|our clients|nos clients|about us|a propos|we are a|nous sommes)\b/.test(
          s,
        ),
    )
    .join("\n");
  const years = requirements.match(/\b(\d{1,2})\+?\s*(?:years?|ans?)\b/);
  return {
    version: TECH_VERSION,
    families: selected,
    technologies: selected.length
      ? canonicalSkills(title + " " + skillsContext + " " + requirements)
      : [],
    requiredTechnologies: selected.length ? canonicalSkills(requirements) : [],
    seniority: /\b(stage|stagiaire|intern|internship|pfe)\b/.test(t)
      ? "internship"
      : /\b(lead|head|manager|directeur|responsable)\b/.test(t)
        ? "lead"
        : /\b(senior|expert|principal)\b/.test(t)
          ? "senior"
          : /\b(junior|debutant|graduate|entry level)\b/.test(t)
            ? "junior"
            : /\b(confirme|intermediate|mid[ -]level)\b/.test(t)
              ? "mid"
              : "unknown",
    pfe: /\bpfe\b|stage de fin d.etudes/.test(t + " " + d),
    requiredLanguages: selected.length
      ? Object.entries({
          fr: /\b(french|francais)\b/,
          en: /\b(english|anglais)\b/,
          ar: /\b(arabic|arabe)\b/,
        })
          .filter(([, re]) => re.test(requirements))
          .map(([lang]) => lang)
      : [],
    minimumYears: years ? Number(years[1]) : null,
    completeness: description.trim() ? "description" : "title-only",
    eligibility,
  };
}
