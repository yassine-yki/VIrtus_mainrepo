import { normalizeListing, plainText, fold } from "../lib/normalize";
import type { Source, Listing } from "../lib/types";
import { fetchJson, record, str, type FetchJson } from "./http";
export const HIMALAYAS_MIN_COVERAGE = 0.95;
export interface CollectionEvidence {
  reported: number;
  observed: number;
  partial: boolean;
  coverage: number;
}
export interface CollectionBatch {
  jobs: Listing[];
  evidence?: CollectionEvidence;
}
const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
function epoch(value: unknown, name: string): string {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 946684800 ||
    value > 4102444800
  )
    throw new Error("Invalid Himalayas " + name);
  return new Date(value * 1000).toISOString();
}
export function coverageEvidence(
  reported: number,
  observed: number,
): CollectionEvidence {
  if (
    !Number.isSafeInteger(reported) ||
    reported <= 0 ||
    !Number.isSafeInteger(observed) ||
    observed < 0 ||
    observed > reported ||
    observed / reported < HIMALAYAS_MIN_COVERAGE
  )
    throw new Error(
      "Himalayas coverage below 95%; previous listings preserved",
    );
  return {
    reported,
    observed,
    coverage: observed / reported,
    partial: observed < reported,
  };
}
export async function collectHimalayas(
  source: Source,
  get: FetchJson = fetchJson,
  wait: (ms: number) => Promise<void> = pause,
  now = Date.now(),
): Promise<CollectionBatch> {
  if (source.id !== "himalayas" || source.provider !== "himalayas")
    throw new Error("Unexpected partial source");
  const rows = new Map<string, Record<string, unknown>>();
  let expected: number | null = null;
  for (let page = 1; page <= 251; page++) {
    if (page > 1) await wait(3100);
    let response: unknown;
    try {
      response = await get(
        "https://himalayas.app/jobs/api/search?country=MA&exclude_worldwide=true&sort=recent&page=" +
          page,
      );
    } catch (error) {
      if (expected !== null && rows.size / expected >= HIMALAYAS_MIN_COVERAGE)
        break;
      throw error;
    }
    const data = record(response);
    if (
      !Array.isArray(data.jobs) ||
      !Number.isSafeInteger(data.totalCount) ||
      Number(data.totalCount) <= 0 ||
      Number(data.totalCount) > 5000 ||
      data.offset !== (page - 1) * 20 ||
      data.limit !== 20 ||
      data.jobs.length > 20
    )
      throw new Error("Malformed Himalayas pagination");
    expected ??= Number(data.totalCount);
    if (data.totalCount !== expected)
      throw new Error("Himalayas total changed during traversal");
    const before = rows.size;
    for (const raw of data.jobs) {
      const item = record(raw);
      const id = str(item.guid);
      if (!id) throw new Error("Missing Himalayas identity");
      const previous = rows.get(id);
      if (
        previous &&
        (previous.title !== item.title ||
          previous.companyName !== item.companyName)
      )
        throw new Error("Conflicting Himalayas identity");
      if (!previous) rows.set(id, item);
    }
    if (data.jobs.length < 20) break;
    if (rows.size === before) throw new Error("Repeated Himalayas page");
  }
  const evidence = coverageEvidence(expected ?? 0, rows.size);
  const jobs: Listing[] = [];
  for (const [guid, item] of rows) {
    const identity = new URL(guid);
    const url = new URL(str(item.applicationLink));
    if (
      identity.protocol !== "https:" ||
      identity.hostname !== "himalayas.app" ||
      identity.username ||
      identity.password ||
      !/^\/companies\/[^/]+\/jobs\/[^/]+$/.test(identity.pathname) ||
      url.origin !== identity.origin ||
      url.pathname !== identity.pathname ||
      url.username ||
      url.password
    )
      throw new Error("Unexpected Himalayas application link");
    if (
      !str(item.title).trim() ||
      !str(item.companyName).trim() ||
      !Array.isArray(item.locationRestrictions)
    )
      throw new Error("Malformed Himalayas job metadata");
    const countries = item.locationRestrictions.map((c) =>
      typeof c === "string"
        ? fold(c)
        : fold(str(record(c).alpha2) || str(record(c).name)),
    );
    if (!countries.some((c) => ["ma", "morocco", "maroc"].includes(c)))
      continue;
    const expiry = epoch(item.expiryDate, "expiry");
    const updated = epoch(item.pubDate, "updated date");
    if (Date.parse(expiry) <= now) continue;
    if (Date.parse(updated) > now + 86400000)
      throw new Error("Future Himalayas update date");
    const text = plainText(item.description);
    if (
      /\b(?:hybrid|on[- ]?site)\s+(?:role|position|job)\b/i.test(
        text.slice(0, 2000),
      )
    )
      continue;
    if (
      /\b(?:US|USA|United States|UK|United Kingdom|Canada|Europe)[ -]only\b|\b(?:must|need to) be (?:based|located|resident) in (?!Morocco\b)[^.!\n]+/i.test(
        text.slice(0, 5000),
      )
    )
      continue;
    const job = normalizeListing(
      source,
      {
        externalId: guid,
        company: str(item.companyName),
        title: str(item.title),
        description: text,
        location: "Remote",
        eligibleCountries: ["MA"],
        workplace: "remote",
        url: url.href,
        attributionUrl: identity.href,
        employment: str(item.employmentType),
      },
      new Date(now).toISOString(),
    );
    if (!job?.tech?.families.length) continue;
    const offsets = item.timezoneRestrictions;
    if (
      offsets != null &&
      (!Array.isArray(offsets) ||
        offsets.some(
          (v) =>
            typeof v !== "number" || !Number.isFinite(v) || v < -12 || v > 14,
        ))
    )
      throw new Error("Invalid Himalayas timezone metadata");
    job.tech.remoteEvidence = {
      country: "MA",
      url: url.href,
      note: "Himalayas indique que cette offre accepte les candidatures depuis le Maroc.",
      workAuthorization: false,
      timezoneNote:
        Array.isArray(offsets) && offsets.length > 0 && offsets.length < 25
          ? "Fuseaux acceptés selon Himalayas : " +
            offsets
              .map((v) => "UTC" + (Number(v) >= 0 ? "+" : "") + v)
              .join(", ")
          : null,
      sourceUpdatedAt: updated,
    };
    jobs.push({ ...job, url: url.href, description: "", expires_at: expiry });
  }
  return { jobs, evidence };
}
