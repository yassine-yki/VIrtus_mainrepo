import {
  citiesFor,
  dateOrNull,
  isMoroccoLocation,
  normalizeListing,
} from "../lib/normalize";
import type { Listing, Source } from "../lib/types";
import { fetchJson, record, str, type FetchJson } from "./http";

/** Ashby's documented public API returns all published postings in one response. */
export async function collectAshby(
  source: Source,
  get: FetchJson = fetchJson,
): Promise<Listing[]> {
  const data = record(
    await get(
      `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(source.identifier)}`,
    ),
  );
  if (data.apiVersion !== "1" || !Array.isArray(data.jobs))
    throw new Error("Invalid Ashby feed");
  if (
    data.jobs.length >= 10000 ||
    data.next ||
    data.nextPage ||
    data.cursor ||
    data.hasMore ||
    data.pagination ||
    (data.total != null && data.total !== data.jobs.length)
  )
    throw new Error("Potentially incomplete Ashby feed");
  const seen = new Set<string>();
  const jobs: Listing[] = [];
  for (const raw of data.jobs) {
    const item = record(raw);
    const id = str(item.id);
    if (
      !/^[a-f0-9-]{36}$/i.test(id) ||
      seen.has(id) ||
      !str(item.title).trim() ||
      typeof item.isListed !== "boolean"
    )
      throw new Error("Missing or repeated Ashby posting metadata");
    seen.add(id);
    const url = new URL(str(item.jobUrl));
    if (
      url.protocol !== "https:" ||
      url.hostname !== "jobs.ashbyhq.com" ||
      url.username ||
      url.password ||
      url.pathname.replace(/\/$/, "").toLowerCase() !==
        `/${source.identifier}/${id}`.toLowerCase()
    )
      throw new Error("Unexpected Ashby original link");
    if (
      item.secondaryLocations != null &&
      !Array.isArray(item.secondaryLocations)
    )
      throw new Error("Invalid Ashby secondary locations");
    if (item.publishedAt != null && !dateOrNull(item.publishedAt))
      throw new Error("Invalid Ashby publication date");
    if (!item.isListed) continue;
    const locations = [
      item,
      ...(Array.isArray(item.secondaryLocations)
        ? item.secondaryLocations
        : []),
    ]
      .map(record)
      .flatMap((location) => {
        const address =
          location.address == null ? {} : record(location.address);
        const postal =
          address.postalAddress == null
            ? address
            : record(address.postalAddress);
        const country = str(postal.addressCountry);
        const label = str(location.location);
        if (!isMoroccoLocation(label, country || undefined)) return [];
        const cities = citiesFor(str(postal.addressLocality) || label).names;
        return cities.length ? cities : ["Maroc"];
      });
    if (!locations.length) continue;
    const workplace =
      item.workplaceType === "Remote"
        ? "remote"
        : item.workplaceType === "Hybrid"
          ? "hybrid"
          : item.workplaceType === "OnSite"
            ? "onsite"
            : "unknown";
    const job = normalizeListing(source, {
      externalId: id,
      title: str(item.title),
      location: [...new Set(locations)].join("; "),
      country: "MA",
      url: url.href,
      employment: str(item.employmentType),
      workplace,
      publishedAt: item.publishedAt,
    });
    if (job) jobs.push(job);
  }
  return jobs;
}
