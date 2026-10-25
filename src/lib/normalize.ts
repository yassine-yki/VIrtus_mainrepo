import { createHash } from "node:crypto";
import { load } from "cheerio";
import type {
  Contract,
  Listing,
  Source,
  Workplace,
  OpportunityKind,
} from "./types";

export const cityAliases: Record<string, string[]> = {
  Casablanca: [
    "casablanca",
    "dar el beida",
    "الدار البيضاء",
    "nouaceur",
    "bouskoura",
    "zenata",
  ],
  Rabat: ["rabat", "الرباط"],
  Salé: ["sale", "salé", "سلا"],
  Tanger: ["tanger", "tangier", "طنجة"],
  Marrakech: ["marrakech", "marrakesh", "مراكش"],
  Agadir: ["agadir", "اكادير", "أكادير"],
  Fès: ["fès", "fes", "fez", "فاس"],
  Meknès: ["meknès", "meknes", "مكناس"],
  Tétouan: ["tétouan", "tetouan", "تطوان"],
  Oujda: ["oujda", "وجدة"],
  Kénitra: ["kénitra", "kenitra", "القنيطرة"],
  Taghazout: ["taghazout", "تغازوت"],
  Mohammedia: ["mohammedia", "المحمدية"],
  Benguerir: ["benguerir", "ben guerir", "بن جرير"],
  ElJadida: ["el jadida", "الجديدة"],
  Nador: ["nador", "الناظور"],
};

export function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
export function key(value: string): string {
  return fold(value)
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-|-$/g, "");
}
export function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

export function plainText(html: unknown): string {
  if (typeof html !== "string") return "";
  let text = html.slice(0, 500_000);
  // Some feeds entity-encode an entire HTML document. Decode bounded layers,
  // removing executable elements on every pass before returning plain text.
  for (let pass = 0; pass < 3; pass++) {
    const $ = load(text);
    $("script,style,iframe,object,svg").remove();
    $("br").replaceWith("\n");
    $("p,div,li,h1,h2,h3,h4,section").each((_, element) => {
      $(element).append("\n");
    });
    const decoded = $.root().text();
    if (decoded === text) break;
    text = decoded;
  }
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function canonicalUrl(raw: string): string {
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error("Only HTTPS job URLs are accepted");
  url.hash = "";
  for (const param of [...url.searchParams.keys()]) {
    if (
      /^(utm_|trk|trid|source$|referrer$|oga$|gh_src$|lever-source$)/i.test(
        param,
      )
    )
      url.searchParams.delete(param);
  }
  if (url.hostname === "jobs.lever.co")
    url.pathname = url.pathname.replace(/\/apply\/?$/, "");
  url.pathname = url.pathname.replace(/\/$/, "");
  url.searchParams.sort();
  return url.toString();
}

export function citiesFor(raw: string): { names: string[]; keys: string[] } {
  const normalized = ` ${fold(raw).replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")} `;
  const names = Object.entries(cityAliases)
    .filter(([, aliases]) =>
      aliases.some((alias) => normalized.includes(` ${fold(alias)} `)),
    )
    .map(([name]) => (name === "ElJadida" ? "El Jadida" : name));
  return { names, keys: names.map(key) };
}

export function isMoroccoLocation(raw: string, country?: string): boolean {
  if (country)
    return ["ma", "mar", "morocco", "maroc", "المغرب"].includes(fold(country));
  return (
    /\b(morocco|maroc)\b|المغرب/i.test(raw) || citiesFor(raw).names.length > 0
  );
}

export function contractFor(value: string): Contract {
  const text = fold(value);
  if (/\b(intern(ship)?|stage|stagiaire|apprenticeship|pfe)\b/.test(text))
    return "Stage";
  if (/\b(cdd|fixed[ -]term|temporary)\b/.test(text)) return "CDD";
  if (/\b(cdi|permanent)\b/.test(text)) return "CDI";
  if (/\b(interim|temp agency)\b/.test(text)) return "Intérim";
  if (/\b(freelance|independent contractor|self[ -]employed)\b/.test(text))
    return "Freelance";
  // Full time is a schedule, not proof of a permanent contract.
  return "Non précisé";
}

export function dateOrNull(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  if (
    !Number.isFinite(date.getTime()) ||
    date.getUTCFullYear() < 2000 ||
    date.getTime() > Date.now() + 86_400_000
  )
    return null;
  return date.toISOString();
}

interface Input {
  company?: string;
  kind?: OpportunityKind;
  deadline?: string | null;
  positions?: number | null;
  officialNoticeUrl?: string | null;
  attributionUrl?: string | null;
  externalId: string;
  title: string;
  location: string;
  country?: string;
  url: string;
  description?: string;
  employment?: string;
  contract?: string;
  workplace?: Workplace;
  publishedAt?: unknown;
  salary?: string;
}
export function normalizeListing(
  source: Source,
  input: Input,
  now = new Date().toISOString(),
): Listing | null {
  if (!isMoroccoLocation(input.location, input.country)) return null;
  if (!input.externalId || !input.title.trim() || !input.location.trim())
    throw new Error("Incomplete job record");
  const url = canonicalUrl(input.url);
  const cities = citiesFor(input.location);
  const company = plainText(input.company ?? source.company).trim();
  if (!company) throw new Error("Missing employer");
  return {
    id: hash(`${source.id}:${input.externalId}`),
    group_key: hash(`${fold(company)}:${url}`),
    source_id: source.id,
    external_id: input.externalId,
    company,
    kind: input.kind ?? "job",
    deadline: input.deadline ?? null,
    positions: input.positions ?? null,
    official_notice_url: input.officialNoticeUrl
      ? canonicalUrl(input.officialNoticeUrl)
      : null,
    attribution_url: input.attributionUrl
      ? canonicalUrl(input.attributionUrl)
      : null,
    title: plainText(input.title).slice(0, 300),
    description: plainText(input.description).slice(0, 30_000),
    locations: cities.names.length ? cities.names : [input.location.trim()],
    city_keys: cities.keys,
    country: "MA",
    workplace: input.workplace ?? "unknown",
    contract: contractFor(input.contract ?? input.employment ?? ""),
    employment: input.employment ?? null,
    salary: input.salary ?? null,
    url,
    published_at: dateOrNull(input.publishedAt),
    last_seen_at: now,
    active: true,
  };
}
