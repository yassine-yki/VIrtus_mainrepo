const hosts = new Set([
  "api.smartrecruiters.com",
  "boards-api.greenhouse.io",
  "api.lever.co",
  "www.wadifa-info.com",
  "apply.workable.com",
  "api.ashbyhq.com",
  "cg-jobstream-api.azurewebsites.net",
  "careers.capgemini.com",
  "orange.jobs",
  "cgi.njoyn.com",
  "api.digitalrecruiters.com",
]);

export type FetchJson = (url: string) => Promise<unknown>;
export type FetchText = (url: string) => Promise<string>;
export type PostJson = (url: string, body: unknown) => Promise<unknown>;
const lastHtmlRequest = new Map<string, number>();
let wadifaLastRequest = 0;
export function retryDelay(
  host: string,
  attempt: number,
  retryAfter: string | null,
  now = Date.now(),
): number {
  const seconds = Number(retryAfter);
  const retryMs = Number.isFinite(seconds)
    ? seconds * 1000
    : Math.max(0, Date.parse(retryAfter ?? "") - now) || 0;
  // A limit above this run's budget is a failure, not permission to retry early.
  return Math.max(
    host === "www.wadifa-info.com" ? 61_000 : 1000 * 2 ** attempt,
    retryMs,
  );
}
async function fetchResponse(
  url: string,
  html = false,
  body?: unknown,
): Promise<Response> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !hosts.has(parsed.hostname))
    throw new Error("Unapproved collection host");
  for (let attempt = 0; attempt < 3; attempt++) {
    if (html) {
      const wait = Math.max(
        0,
        (lastHtmlRequest.get(parsed.hostname) ?? 0) + 350 - Date.now(),
      );
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      lastHtmlRequest.set(parsed.hostname, Date.now());
    }
    if (parsed.hostname === "www.wadifa-info.com") {
      const wait = Math.max(0, wadifaLastRequest + 61_000 - Date.now());
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      wadifaLastRequest = Date.now();
    }
    const response = await fetch(url, {
      ...(body === undefined
        ? {}
        : { method: "POST", body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(25_000),
      redirect: "error",
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        Accept: html ? "text/html" : "application/json",
        "User-Agent":
          "VirtusJobCollector/0.1 (+https://github.com/yassine-yki/VIrtus_mainrepo)",
      },
    });
    if (response.ok) return response;
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      const delay = retryDelay(
        parsed.hostname,
        attempt,
        response.headers.get("retry-after"),
      );
      if (delay > 120_000)
        throw new Error("Retry-After exceeds collection budget");
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    throw new Error(`${parsed.hostname}: HTTP ${response.status}`);
  }
  throw new Error("Collection retry budget exhausted");
}

export async function fetchJson(url: string): Promise<unknown> {
  return (await fetchResponse(url)).json();
}
export async function postJson(url: string, body: unknown): Promise<unknown> {
  return (await fetchResponse(url, false, body)).json();
}

export async function fetchText(url: string): Promise<string> {
  const response = await fetchResponse(url, true);
  if (!response.headers.get("content-type")?.includes("text/html"))
    throw new Error("Expected employer HTML response");
  const text = await response.text();
  if (text.length > 3_000_000)
    throw new Error("Employer page exceeds safety limit");
  return text;
}

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Unexpected source response");
  return value as Record<string, unknown>;
}
export function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}
