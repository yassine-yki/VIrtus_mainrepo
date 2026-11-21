import { normalizeListing, plainText, dateOrNull } from "../lib/normalize";
import type { Listing, Source } from "../lib/types";
import { fetchJson, record, str, type FetchJson } from "./http";

/** Individually audited policy, not a generic inference from a remote/EMEA label. */
export async function collectWikimedia(
  source: Source,
  get: FetchJson = fetchJson,
): Promise<Listing[]> {
  if (
    source.id !== "wikimedia" ||
    source.identifier !== "wikimedia" ||
    source.provider !== "greenhouse"
  )
    throw new Error("Unreviewed remote employer");
  const data = record(
    await get(
      "https://boards-api.greenhouse.io/v1/boards/wikimedia/jobs?content=true",
    ),
  );
  if (
    !Array.isArray(data.jobs) ||
    record(data.meta).total !== data.jobs.length ||
    data.jobs.length >= 10000 ||
    data.next ||
    data.next_page ||
    data.has_more
  )
    throw new Error("Incomplete Wikimedia feed");
  const seen = new Set<number>();
  const jobs: Listing[] = [];
  for (const raw of data.jobs) {
    const item = record(raw);
    if (
      !Number.isSafeInteger(item.id) ||
      Number(item.id) <= 0 ||
      seen.has(Number(item.id)) ||
      !str(item.title).trim() ||
      typeof item.content !== "string"
    )
      throw new Error("Invalid or repeated Wikimedia posting");
    seen.add(Number(item.id));
    const url = new URL(str(item.absolute_url));
    if (
      url.protocol !== "https:" ||
      url.hostname !== "job-boards.greenhouse.io" ||
      url.username ||
      url.password ||
      url.pathname !== "/wikimedia/jobs/" + item.id
    )
      throw new Error("Unexpected Wikimedia original link");
    if (item.first_published != null && !dateOrNull(item.first_published))
      throw new Error("Invalid Wikimedia publication date");
    const text = plainText(item.content);
    // The role itself must contain the audited country list. A company policy alone is insufficient.
    const countries = [
      ...text.matchAll(/(?:^|\n)\s*Countries:\s*([^\n.]+)\./gi),
    ];
    const eligible =
      countries.length === 1 &&
      /(?:^|,)\s*Morocco\s*(?:,|$)/i.test(countries[0][1]);
    const location = str(record(item.location).name).trim();
    const roleLocation = text
      .match(/(?:^|\n)\s*Location:\s*([^\n]+)/i)?.[1]
      ?.trim();
    if (
      !eligible ||
      !/^remote$/i.test(location) ||
      (roleLocation &&
        !/^remote(?:[ .]*|, \d+-month contract)$/i.test(roleLocation))
    )
      continue;
    const roleText = text.slice(0, text.search(/(?:^|\n)\s*Countries:/i));
    if (
      /\b(?:US|USA|United States|UK|United Kingdom|Canada|Europe)[ -]only\b|\b(?:must|need to) be (?:based|located|resident) in (?!Morocco\b)[^.!\n]+/i.test(
        roleText,
      )
    )
      continue;
    if (
      item.application_deadline != null &&
      !dateOrNull(item.application_deadline)
    )
      throw new Error("Invalid Wikimedia application deadline");
    if (
      item.application_deadline &&
      Date.parse(str(item.application_deadline)) < Date.now()
    )
      continue;
    const job = normalizeListing(source, {
      externalId: String(item.id),
      title: str(item.title),
      description: text,
      location: "Remote",
      eligibleCountries: ["MA"],
      workplace: "remote",
      url: url.href,
      publishedAt: item.first_published,
    });
    if (!job) throw new Error("Remote eligibility mapping failed");
    if (job.tech)
      job.tech.remoteEvidence = {
        country: "MA",
        url: url.href,
        note: "Le Maroc figure dans les pays de recrutement de cette offre.",
        workAuthorization:
          /must have current work authorization in their location/i.test(text),
        timezoneNote:
          /at least four hours of your workday to occur between 15:00 UTC and 21:00 UTC/i.test(
            text,
          )
            ? "Au moins 4 heures de travail entre 15 h et 21 h UTC."
            : null,
      };
    jobs.push({ ...job, description: "" });
  }
  return jobs;
}
