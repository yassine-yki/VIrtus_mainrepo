import { load } from "cheerio";
import {
  dateOrNull,
  isMoroccoLocation,
  normalizeListing,
} from "../lib/normalize";
import { fetchXml, type FetchText } from "./http";
import type { Source, Listing } from "../lib/types";
const allowed = new Set([
  "jobs.inwi.ma",
  "leytonglobal-morocco.teamtailor.com",
]);
export async function collectTeamtailor(
  source: Source,
  get: FetchText = fetchXml,
): Promise<Listing[]> {
  if (!allowed.has(source.identifier))
    throw new Error("Unapproved Teamtailor board");
  const base = `https://${source.identifier}`;
  const validUrl = (value: string) => {
    const u = new URL(value);
    if (
      u.origin !== base ||
      u.username ||
      u.password ||
      u.search ||
      u.hash ||
      !/^\/jobs\/\d+-[a-z0-9-]+$/.test(u.pathname)
    )
      throw new Error("Unexpected Teamtailor link");
    return u.href;
  };
  function sitemap(text: string) {
    if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error("Unsafe XML");
    const $ = load(text, { xml: true });
    if ($("urlset").length !== 1 || $("sitemapindex").length)
      throw new Error("Unsupported or incomplete sitemap");
    const urls = $("loc")
      .map((_, n) => $(n).text().trim())
      .get()
      .filter((u) => /\/jobs\//.test(u))
      .map(validUrl);
    if (urls.length >= 2000 || new Set(urls).size !== urls.length)
      throw new Error("Repeated or truncated sitemap");
    return urls.sort();
  }
  const before = sitemap(await get(`${base}/sitemap.xml`));
  const xml = await get(`${base}/jobs.rss`);
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("Unsafe XML");
  const $ = load(xml, { xml: true });
  if ($("rss channel").length !== 1) throw new Error("Invalid Teamtailor RSS");
  const links: string[] = [],
    jobs: Listing[] = [];
  for (const element of $("item").toArray()) {
    const item = $(element),
      url = validUrl(item.find("link").text().trim());
    links.push(url);
    const title = item.find("title").text().trim(),
      published = dateOrNull(item.find("pubDate").text().trim());
    if (!title || !published)
      throw new Error("Missing Teamtailor title or original publication date");
    const locations = item
      .find("tt\\:location")
      .toArray()
      .flatMap((node) => {
        const country = $(node).find("tt\\:country").text().trim(),
          city = $(node).find("tt\\:city").text().trim();
        return isMoroccoLocation(city, country || undefined)
          ? [city || "Maroc"]
          : [];
      });
    if (!locations.length) continue;
    const remote = item.find("remoteStatus").text();
    const job = normalizeListing(source, {
      externalId: new URL(url).pathname.match(/\/jobs\/(\d+)/)![1],
      title,
      url,
      description: item.find("description").text(),
      location: [...new Set(locations)].join("; "),
      country: "MA",
      publishedAt: published,
      contract: /\b(stage|pfe|internship)\b/i.test(title) ? "Stage" : "",
      workplace:
        remote === "fully"
          ? "remote"
          : remote === "hybrid"
            ? "hybrid"
            : ["none", "onsite"].includes(remote)
              ? "onsite"
              : "unknown",
    });
    if (job) jobs.push({ ...job, description: "" });
  }
  if (
    JSON.stringify(links.sort()) !== JSON.stringify(before) ||
    JSON.stringify(sitemap(await get(`${base}/sitemap.xml`))) !==
      JSON.stringify(before)
  )
    throw new Error("Teamtailor feed incomplete or changed during collection");
  return jobs;
}
