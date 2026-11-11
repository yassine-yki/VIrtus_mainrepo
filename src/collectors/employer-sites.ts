import { load } from "cheerio";
import {
  normalizeListing,
  plainText,
  fold,
  dateOrNull,
  isMoroccoLocation,
} from "../lib/normalize";
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

function integer(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0)
    throw new Error("Invalid employer result count");
  return Number(value);
}
function unique(seen: Set<string>, id: string) {
  if (!id || seen.has(id))
    throw new Error("Missing or duplicate employer job ID");
  seen.add(id);
}
function originalUrl(raw: string, host: string): string {
  const url = new URL(raw);
  if (
    url.protocol !== "https:" ||
    url.hostname !== host ||
    url.username ||
    url.password
  )
    throw new Error("Unexpected employer job URL");
  url.hash = "";
  return url.href;
}
function publication(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  const date = dateOrNull(value);
  if (!date) throw new Error("Malformed employer publication date");
  return date;
}
function jobPosting(html: string): Record<string, unknown> {
  const $ = load(html);
  const postings = $("script[type='application/ld+json']")
    .toArray()
    .flatMap((element) => {
      const raw = JSON.parse($(element).text());
      const nodes = Array.isArray(raw)
        ? raw
        : Array.isArray(raw["@graph"])
          ? raw["@graph"]
          : [raw];
      return nodes.filter((item) => item["@type"] === "JobPosting");
    });
  if (postings.length !== 1)
    throw new Error("Missing or ambiguous employer job metadata");
  return record(postings[0]);
}

/** Capgemini's own search frontend uses this endpoint and ma-en country scope.
 * Index/update timestamps are deliberately ignored. Dates come from the original
 * careers page's JobPosting microdata; descriptions are never persisted. */
export async function collectCapgemini(
  source: Source,
  get: FetchJson = fetchJson,
  html: FetchText = fetchText,
): Promise<Listing[]> {
  const result: Listing[] = [],
    seen = new Set<string>();
  let expected: number | undefined;
  for (let page = 1; page <= 100; page++) {
    const data = record(
      await get(
        `https://cg-jobstream-api.azurewebsites.net/api/job-search?country_code=ma-en&page=${page}&size=100`,
      ),
    );
    const total = integer(data.count);
    if (
      !Array.isArray(data.data) ||
      integer(data.total) !== total ||
      data.timed_out === true ||
      data.data.length > 100
    )
      throw new Error("Invalid Capgemini page");
    if (expected !== undefined && expected !== total)
      throw new Error("Capgemini changed during pagination");
    expected = total;
    if (!data.data.length && seen.size < total)
      throw new Error("Incomplete Capgemini pagination");
    for (const raw of data.data) {
      const item = record(raw),
        id = str(item.id);
      unique(seen, id);
      if (!str(item.title).trim() || !str(item.country_code))
        throw new Error("Incomplete Capgemini metadata");
      if (item.country_code !== "en-ma") continue;
      if (item.deleted_at || item.wp_deleted_at) continue;
      if (item.status !== "1")
        throw new Error("Unknown Capgemini publication status");
      const url = new URL(
        originalUrl(str(item.apply_job_url), "careers.capgemini.com"),
      );
      if (!/^\/job\/.+\/\d+\/?$/.test(url.pathname))
        throw new Error("Invalid Capgemini application path");
      url.search = "";
      const $ = load(await html(url.href));
      const posting = $(
        '[itemtype="http://schema.org/JobPosting"], [itemtype="https://schema.org/JobPosting"]',
      );
      if (posting.length !== 1)
        throw new Error("Capgemini detail is no longer a job page");
      const title = posting.find('[itemprop="title"]').text().trim();
      if (title && fold(plainText(title)) !== fold(plainText(item.title)))
        throw new Error("Capgemini detail title mismatch");
      const job = normalizeListing(source, {
        externalId: id,
        title: str(item.title),
        location: str(item.location) || "Maroc",
        country: "MA",
        url: url.href,
        contract: str(item.contract_type),
        publishedAt: publication(
          posting.find('[itemprop="datePosted"]').attr("content"),
        ),
      });
      if (job) result.push(job);
    }
    if (seen.size === total) return result;
    if (seen.size > total || data.data.length < 100)
      throw new Error("Incomplete Capgemini result set");
  }
  throw new Error("Capgemini pagination safety limit reached");
}

function orangePage(html: string): Record<string, unknown> {
  const match = html.match(/phApp\.ddo\s*=\s*(\{.+?\});/s);
  if (!match) throw new Error("Missing Orange search data");
  // Parse the public embedded JSON; never execute source JavaScript.
  const data = record(record(JSON.parse(match[1])).eagerLoadRefineSearch);
  if (data.status !== 200) throw new Error("Orange search failed");
  return data;
}
export function orangePublication(description: unknown): string | undefined {
  const text = plainText(description);
  const label = /Date de publication\s*:/i;
  if (!label.test(text)) return undefined;
  const match = text.match(
    /Date de publication\s*:\s*([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})/i,
  );
  if (!match) throw new Error("Unrecognized Orange original publication date");
  const month = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ].indexOf(match[1].toLowerCase());
  const date = `${match[3]}-${String(month + 1).padStart(2, "0")}-${match[2].padStart(2, "0")}`;
  const parsed = publication(`${date}T00:00:00Z`);
  if (month < 0 || parsed?.slice(0, 10) !== date)
    throw new Error("Invalid Orange original publication date");
  return parsed;
}
export async function collectOrange(
  source: Source,
  html: FetchText = fetchText,
): Promise<Listing[]> {
  const result: Listing[] = [],
    seen = new Set<string>();
  let expected: number | undefined;
  for (let from = 0; from < 2000; from += 10) {
    const data = orangePage(
      await html(
        `https://orange.jobs/fr/fr/morocco-search-results?from=${from}&s=1`,
      ),
    );
    const total = integer(data.totalHits),
      jobs = record(data.data).jobs;
    if (
      !Array.isArray(jobs) ||
      integer(data.hits) !== jobs.length ||
      jobs.length > 10
    )
      throw new Error("Invalid Orange page");
    if (expected !== undefined && total !== expected)
      throw new Error("Orange changed during pagination");
    expected = total;
    for (const raw of jobs) {
      const item = record(raw),
        id = str(item.jobId),
        seq = str(item.jobSeqNo);
      unique(seen, id);
      if (
        !str(item.title).trim() ||
        !str(item.country) ||
        !/^[A-Z0-9]+$/.test(seq)
      )
        throw new Error("Incomplete Orange metadata");
      if (!isMoroccoLocation("", str(item.country))) continue;
      if (item.visibilityType !== "External")
        throw new Error("Unexpected Orange visibility");
      const url = `https://orange.jobs/fr/fr/job/${seq}`;
      const detail = jobPosting(await html(url));
      if (
        str(record(detail.identifier).value) !== id ||
        fold(plainText(detail.title)) !== fold(plainText(item.title))
      )
        throw new Error("Orange detail identity mismatch");
      // postedDate/datePosted are refreshed by the search platform. Only use
      // the explicitly labelled original publication date, otherwise unknown.
      const company = str(record(detail.hiringOrganization).name);
      const job = normalizeListing(source, {
        externalId: id,
        title: str(item.title),
        company: company || source.company,
        location: str(item.city) || "Maroc",
        country: str(item.country),
        url,
        contract: str(item.contractType),
        employment: str(item.hiringType),
        publishedAt: orangePublication(detail.description),
        workplace: /hybrid/i.test(str(item.workModel))
          ? "hybrid"
          : /^(remote|à distance)$/i.test(str(item.workModel))
            ? "remote"
            : "unknown",
      });
      if (job) result.push(job);
    }
    if (seen.size === total) return result;
    if (seen.size > total || jobs.length < 10)
      throw new Error("Incomplete Orange result set");
  }
  throw new Error("Orange pagination safety limit reached");
}

export async function collectCgi(
  source: Source,
  html: FetchText = fetchText,
): Promise<Listing[]> {
  const base = "https://cgi.njoyn.com/corp/xweb/xweb.asp";
  const $ = load(
    await html(`${base}?CLID=21001&page=joblisting&CountryID=MA&lang=2`),
  );
  const count = $("header")
    .text()
    .match(/Résultats de recherche\s*\((\d+)\)/i);
  const rows = $("table.table-result-search tbody tr");
  if (!count || rows.length !== Number(count[1]) || rows.length > 1000)
    throw new Error(
      "Incomplete or changed CGI results; reconciliation refused",
    );
  const result: Listing[] = [],
    seen = new Set<string>();
  for (const row of rows.toArray()) {
    const cells = $(row).find("td");
    if (cells.length !== 5) throw new Error("Invalid CGI result row");
    const url = new URL(cells.eq(0).find("a").attr("href") ?? "", base);
    originalUrl(url.href, "cgi.njoyn.com");
    const id = url.searchParams.get("Jobid") ?? "";
    if (
      !/^J\d{4}-\d+$/.test(id) ||
      url.searchParams.get("Page") !== "JobDetails" ||
      url.searchParams.get("clid") !== "21001"
    )
      throw new Error("Unexpected CGI detail URL");
    unique(seen, id);
    const country = cells.eq(4).text().trim(),
      title = cells.eq(1).text().trim();
    if (!country || !title) throw new Error("Incomplete CGI metadata");
    if (!isMoroccoLocation("", country)) continue;
    const detail = jobPosting(await html(url.href));
    if (
      fold(plainText(detail.title)) !== fold(title) ||
      str(record(detail.hiringOrganization).name) !== "CGI"
    )
      throw new Error("CGI detail identity mismatch");
    const address = record(record(detail.jobLocation).address);
    if (!isMoroccoLocation("", str(address.addressCountry)))
      throw new Error("CGI detail location mismatch");
    const job = normalizeListing(source, {
      externalId: id,
      title,
      location:
        str(address.addressLocality) || cells.eq(3).text().trim() || "Maroc",
      country: "MA",
      url: url.href,
      publishedAt: publication(detail.datePosted),
      employment: str(detail.employmentType),
      contract: /\b(stage|pfe)\b/i.test(title) ? "Stage" : "",
    });
    if (job) result.push(job);
  }
  return result;
}

/** Public DigitalRecruiters careers search, as used by careers.cegedim.com.
 * Read all location rows; a Morocco city is only a candidate until the detail's
 * explicit country confirms eligibility. Non-public/aggregated jobs fail closed. */
export async function collectCegedim(
  source: Source,
  get: FetchJson = fetchJson,
  post: PostJson = postJson,
): Promise<Listing[]> {
  const base =
    "https://api.digitalrecruiters.com/public/v1/careers-site/job-ads";
  const result: Listing[] = [],
    seen = new Set<string>();
  let expected: number | undefined;
  for (let page = 1; page <= 100; page++) {
    const data = record(
      await post(
        `${base}?domainName=careers.cegedim.com&limit=100&page=${page}&locale=fr_FR`,
        { filters: {} },
      ),
    );
    const total = integer(data.count);
    if (!Array.isArray(data.items) || data.items.length > 100)
      throw new Error("Invalid Cegedim search response");
    if (expected !== undefined && total !== expected)
      throw new Error("Cegedim changed during pagination");
    expected = total;
    for (const raw of data.items) {
      const item = record(raw),
        id = str(item.id);
      unique(seen, id);
      if (
        !/^\d+-\d+$/.test(id) ||
        !str(item.title).trim() ||
        !str(item.location)
      )
        throw new Error("Incomplete Cegedim metadata");
      if (!isMoroccoLocation(str(item.location))) continue;
      if (
        item.is_external !== false ||
        item.is_aggregated !== false ||
        item.career_domain !== "careers.cegedim.com"
      )
        throw new Error("Unexpected Cegedim source");
      const [jobId, addressId] = id.split("-");
      if (Number(jobId) !== item.job_ad_id)
        throw new Error("Cegedim job ID mismatch");
      const detail = record(
        await get(
          `${base}/${jobId}?domainName=careers.cegedim.com&locale=fr_FR&withJsonld=1&external=0&addressId=${addressId}`,
        ),
      );
      const meta = record(detail.jsonld),
        address = record(record(meta.jobLocation).address);
      if (
        detail.id !== id ||
        detail.job_ad_status !== 1 ||
        detail.career_domain !== "careers.cegedim.com" ||
        detail.is_external !== false ||
        detail.is_aggregated !== false ||
        str(record(meta.identifier).value) !== id ||
        fold(plainText(meta.title)) !== fold(plainText(item.title))
      )
        throw new Error("Cegedim detail identity mismatch");
      if (!str(address.addressCountry))
        throw new Error("Missing Cegedim country");
      if (!isMoroccoLocation("", str(address.addressCountry))) continue;
      const slug = str(detail.url);
      if (!new RegExp(`^${jobId}-[a-z0-9-]+$`).test(slug))
        throw new Error("Invalid Cegedim job slug");
      const job = normalizeListing(source, {
        externalId: id,
        title: str(meta.title),
        location: str(address.addressLocality) || "Maroc",
        country: str(address.addressCountry),
        url: `https://careers.cegedim.com/fr/annonce/${slug}`,
        contract: str(item.contract),
        publishedAt: publication(meta.datePosted),
      });
      if (job) result.push(job);
    }
    if (seen.size === total) return result;
    if (seen.size > total || data.items.length < 100)
      throw new Error("Incomplete Cegedim result set");
  }
  throw new Error("Cegedim pagination safety limit reached");
}
