import { normalizeListing, fold } from "../lib/normalize";
import type { Listing, Source } from "../lib/types";
import {
  fetchJson,
  fetchText,
  postJson,
  record,
  str,
  type FetchJson,
  type FetchText,
  type PostJson,
} from "./http";
import { dateOnly } from "../lib/deadline";
import { collectAshby } from "./ashby";
import {
  collectCapgemini,
  collectOrange,
  collectCgi,
  collectCegedim,
} from "./employer-sites";

export async function collectSmartRecruiters(
  source: Source,
  get: FetchJson = fetchJson,
): Promise<Listing[]> {
  const jobs: Listing[] = [];
  const seen = new Set<string>();
  let expectedTotal: number | null = null;
  for (let offset = 0; offset < 20_000; offset += 100) {
    const base = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(source.identifier)}/postings`;
    const page = record(
      await get(
        `${base}?country=ma&destination=PUBLIC&limit=100&offset=${offset}`,
      ),
    );
    if (
      !Array.isArray(page.content) ||
      !Number.isInteger(page.totalFound) ||
      Number(page.totalFound) < 0
    )
      throw new Error("Invalid SmartRecruiters page");
    if (expectedTotal !== null && expectedTotal !== page.totalFound)
      throw new Error(
        "Source changed during pagination; retry a complete sync",
      );
    expectedTotal = Number(page.totalFound);
    if (page.content.length === 0 && offset < expectedTotal)
      throw new Error("Incomplete SmartRecruiters pagination");
    for (const raw of page.content) {
      const item = record(raw);
      const id = str(item.id);
      if (!id || seen.has(id))
        throw new Error("Missing or repeated source ID during pagination");
      seen.add(id);
      // Construct the documented URL ourselves; never fetch an arbitrary response ref.
      const detail = record(await get(`${base}/${encodeURIComponent(id)}`));
      const location = record(detail.location ?? item.location);
      const sections = record(record(detail.jobAd).sections);
      const employment = record(
        detail.typeOfEmployment ?? item.typeOfEmployment ?? {},
      );
      const contractField = Array.isArray(detail.customField)
        ? detail.customField
            .map(record)
            .find((field) => /contract|contrat/i.test(str(field.fieldLabel)))
        : undefined;
      const workplace =
        location.hybrid === true
          ? "hybrid"
          : location.remote === true
            ? "remote"
            : location.remote === false
              ? "onsite"
              : "unknown";
      const listing = normalizeListing(source, {
        externalId: id,
        title: str(detail.name || item.name),
        location: str(location.city || location.fullLocation),
        country: str(location.country),
        url: str(detail.postingUrl || detail.applyUrl),
        description: Object.values(sections)
          .map((section) => str(record(section).text))
          .join("\n"),
        employment: str(employment.label),
        contract: str(contractField?.valueLabel) || str(employment.label),
        workplace,
        publishedAt: detail.releasedDate,
      });
      if (listing) jobs.push(listing);
    }
    if (offset + page.content.length >= expectedTotal) {
      if (seen.size !== expectedTotal)
        throw new Error("Incomplete SmartRecruiters result set");
      return jobs;
    }
  }
  throw new Error("SmartRecruiters pagination safety limit reached");
}

export async function collectGreenhouse(
  source: Source,
  get: FetchJson = fetchJson,
): Promise<Listing[]> {
  const data = record(
    await get(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(source.identifier)}/jobs?content=true`,
    ),
  );
  if (!Array.isArray(data.jobs)) throw new Error("Invalid Greenhouse response");
  if (
    (data.meta != null && record(data.meta).total !== data.jobs.length) ||
    data.next ||
    data.next_page ||
    data.has_more
  )
    throw new Error("Incomplete Greenhouse feed");
  const jobs: Listing[] = [];
  for (const raw of data.jobs) {
    const item = record(raw);
    const location = record(item.location);
    const listing = normalizeListing(source, {
      externalId: String(item.id ?? ""),
      title: str(item.title),
      location: str(location.name),
      url: str(item.absolute_url),
      description: str(item.content),
      // Greenhouse updated_at is not a publication timestamp.
      publishedAt: item.first_published,
      workplace: /\bremote\b|teletravail/i.test(str(location.name))
        ? "remote"
        : "unknown",
    });
    if (listing) jobs.push(listing);
  }
  return uniqueIds(jobs);
}

export async function collectLever(
  source: Source,
  get: FetchJson = fetchJson,
): Promise<Listing[]> {
  const jobs: Listing[] = [];
  const seen = new Set<string>();
  for (let skip = 0; skip < 20_000; skip += 100) {
    const data = await get(
      `https://api.lever.co/v0/postings/${encodeURIComponent(source.identifier)}?mode=json&limit=100&skip=${skip}`,
    );
    if (!Array.isArray(data)) throw new Error("Invalid Lever response");
    for (const raw of data) {
      const item = record(raw);
      const id = str(item.id);
      if (!id || seen.has(id))
        throw new Error(
          "Repeated or missing Lever ID; pagination cannot be trusted",
        );
      seen.add(id);
      const categories = record(item.categories);
      const locations = Array.isArray(categories.allLocations)
        ? categories.allLocations.map(str).join("; ")
        : str(categories.location);
      const type = str(item.workplaceType);
      const listing = normalizeListing(source, {
        externalId: id,
        title: str(item.text),
        location: locations,
        url: str(item.hostedUrl),
        description: str(item.descriptionPlain || item.description),
        employment: str(categories.commitment),
        workplace:
          type === "remote"
            ? "remote"
            : type === "hybrid"
              ? "hybrid"
              : type === "on-site"
                ? "onsite"
                : /\bremote\b/i.test(locations)
                  ? "remote"
                  : "unknown",
        // createdAt identifies the posting creation time in Lever's public response.
        publishedAt: item.createdAt,
      });
      if (listing) jobs.push(listing);
    }
    if (data.length < 100) return uniqueIds(jobs);
  }
  throw new Error("Lever pagination safety limit reached");
}

function uniqueIds(jobs: Listing[]): Listing[] {
  if (new Set(jobs.map((job) => job.id)).size !== jobs.length)
    throw new Error("Duplicate IDs in source response");
  return jobs;
}

// Workable documents this public all-published-jobs widget feed. It has no
// pagination contract; unexpected pagination/count metadata fails closed.
export async function collectWorkable(
  source: Source,
  get: FetchJson = fetchJson,
): Promise<Listing[]> {
  const data = record(
    await get(
      `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(source.identifier)}`,
    ),
  );
  if (
    !Array.isArray(data.jobs) ||
    !str(data.name).trim() ||
    fold(str(data.name)) !== fold(source.company)
  )
    throw new Error("Invalid Workable feed or employer identity");
  if (
    data.jobs.length >= 1000 ||
    data.next ||
    data.next_page ||
    data.has_more ||
    data.paging ||
    data.pagination ||
    (data.total != null && data.total !== data.jobs.length)
  )
    throw new Error(
      "Potentially incomplete Workable feed; reconciliation refused",
    );
  const seen = new Map<string, string>();
  const jobs = new Map<string, Listing>();
  for (const raw of data.jobs) {
    const item = record(raw);
    const id = str(item.shortcode);
    if (!/^[A-Za-z0-9]+$/.test(id) || !str(item.title).trim())
      throw new Error("Missing Workable ID/title");
    // The documented widget repeats a posting for each published location.
    // Merge those variants only when their non-location metadata agrees.
    const signature = JSON.stringify([
      item.title,
      item.url,
      item.published_on,
      item.employment_type,
      item.telecommuting,
    ]);
    if (seen.has(id) && seen.get(id) !== signature)
      throw new Error(`Workable item ${id}: conflicting location variants`);
    seen.set(id, signature);
    const url = new URL(str(item.url));
    if (
      url.protocol !== "https:" ||
      url.hostname !== "apply.workable.com" ||
      url.username ||
      url.password ||
      url.pathname !== `/j/${id}`
    )
      throw new Error(`Workable item ${id}: unexpected original link`);
    if (item.locations != null && !Array.isArray(item.locations))
      throw new Error(`Workable item ${id}: invalid locations`);
    const locations =
      item.locations == null
        ? [{ country: item.country, city: item.city, hidden: false }]
        : item.locations.map(record);
    const morocco = locations.filter((location: Record<string, unknown>) => {
      if (location.hidden != null && typeof location.hidden !== "boolean")
        throw new Error(`Workable item ${id}: invalid location visibility`);
      const code = str(location.countryCode).toUpperCase();
      return (
        location.hidden !== true &&
        (code
          ? code === "MA"
          : ["morocco", "maroc"].includes(fold(str(location.country))))
      );
    });
    // Neither a remote flag nor EMEA/Worldwide is proof of Morocco eligibility.
    if (!morocco.length) continue;
    const published =
      item.published_on == null || item.published_on === ""
        ? null
        : dateOnly(item.published_on);
    if (item.published_on && !published)
      throw new Error(`Workable item ${id}: invalid publication date`);
    const cities = [
      ...new Set(
        morocco
          .map((location: Record<string, unknown>) => str(location.city).trim())
          .filter(Boolean),
      ),
    ];
    const listing = normalizeListing(source, {
      externalId: id,
      title: str(item.title),
      country: "MA",
      location: cities.length ? cities.join("; ") : "Maroc",
      url: url.href,
      employment: str(item.employment_type),
      workplace: item.telecommuting === true ? "remote" : "unknown",
      publishedAt: published ? `${published}T00:00:00Z` : undefined,
    });
    if (listing) {
      const existing = jobs.get(id);
      if (existing) {
        existing.locations = [
          ...new Set([...existing.locations, ...listing.locations]),
        ];
        existing.city_keys = [
          ...new Set([...existing.city_keys, ...listing.city_keys]),
        ];
      } else jobs.set(id, listing);
    }
  }
  return uniqueIds([...jobs.values()]);
}

export function collectSource(
  source: Source,
  get: FetchJson = fetchJson,
  html: FetchText = fetchText,
  post: PostJson = postJson,
): Promise<Listing[]> {
  if (source.provider === "smartrecruiters")
    return collectSmartRecruiters(source, get);
  if (source.provider === "greenhouse") return collectGreenhouse(source, get);
  if (source.provider === "lever") return collectLever(source, get);
  if (source.provider === "workable") return collectWorkable(source, get);
  if (source.provider === "ashby") return collectAshby(source, get);
  if (source.provider === "wadifa") return collectWadifa(source, get);
  if (source.provider === "html") {
    if (source.id === "capgemini" && source.identifier === "capgemini-ma")
      return collectCapgemini(source, get, html);
    if (source.id === "orange" && source.identifier === "orange-ma")
      return collectOrange(source, html);
    if (source.id === "cgi" && source.identifier === "cgi-ma")
      return collectCgi(source, html);
    if (source.id === "cegedim" && source.identifier === "cegedim-ma")
      return collectCegedim(source, get, post);
  }
  throw new Error(
    "HTML source requires an individually reviewed collector; no scraper is enabled",
  );
}

export async function collectWadifa(
  source: Source,
  get: FetchJson = fetchJson,
): Promise<Listing[]> {
  const data = record(
    await get("https://www.wadifa-info.com/api/v1/concours?lang=fr&limit=2000"),
  );
  if (!Array.isArray(data.items) || data.count !== data.items.length)
    throw new Error("Invalid Wadifa response or incomplete item count");
  if (data.items.length >= 2000)
    throw new Error(
      "Potentially truncated Wadifa feed; reconciliation refused",
    );
  if (record(data.attribution).license !== "CC-BY-4.0")
    throw new Error("Wadifa licence changed; review before collection");
  const jobs = data.items.map((raw) => {
    const item = record(raw);
    if (!str(item.employer).trim() || item.deadline == null) {
      console.warn(
        `Wadifa item ${String(item.id)} excluded: missing employer or deadline`,
      );
      return null;
    }
    const deadline = dateOnly(item.deadline);
    // Publication is optional metadata: a missing date stays unknown.
    // Deadline and required notice metadata still fail closed when malformed.
    const publishedMissing = item.published == null || item.published === "";
    const published = publishedMissing ? null : dateOnly(item.published);
    const invalidFields = [
      ...(!Number.isSafeInteger(item.id) || Number(item.id) <= 0 ? ["id"] : []),
      ...(!deadline ? ["deadline"] : []),
      ...(!publishedMissing && !published ? ["published"] : []),
      ...(!str(item.grade).trim() ? ["grade"] : []),
      ...(!Number.isSafeInteger(item.posts) || Number(item.posts) <= 0
        ? ["posts"]
        : []),
    ];
    if (invalidFields.length)
      throw new Error(
        `Wadifa item ${String(item.id)}: invalid ${invalidFields.join(", ")}; reconciliation refused`,
      );
    if (publishedMissing)
      console.warn(
        `Wadifa item ${String(item.id)}: publication date unavailable`,
      );
    const attribution = new URL(str(item.url));
    const official = new URL(str(item.official_notice));
    if (
      attribution.protocol !== "https:" ||
      attribution.hostname !== "www.wadifa-info.com" ||
      official.protocol !== "https:" ||
      official.hostname !== "www.emploi-public.ma"
    )
      throw new Error("Unexpected competition link host");
    return normalizeListing(source, {
      externalId: String(item.id),
      title: str(item.grade),
      company: str(item.employer),
      location: "Maroc",
      country: "MA",
      kind: "competition",
      deadline,
      positions: Number(item.posts),
      url: official.href,
      officialNoticeUrl: official.href,
      attributionUrl: attribution.href,
      publishedAt: published ? `${published}T00:00:00Z` : undefined,
    })!;
  });
  const eligible = jobs.filter((job): job is Listing => job !== null);
  if (data.items.length && !eligible.length)
    throw new Error("No publishable metadata in non-empty Wadifa feed");
  return uniqueIds(eligible);
}
