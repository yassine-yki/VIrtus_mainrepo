const hosts = new Set([
  "api.smartrecruiters.com",
  "boards-api.greenhouse.io",
  "api.lever.co",
  "www.wadifa-info.com",
]);

export type FetchJson = (url: string) => Promise<unknown>;
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
export async function fetchJson(url: string): Promise<unknown> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !hosts.has(parsed.hostname))
    throw new Error("Unapproved collection host");
  for (let attempt = 0; attempt < 3; attempt++) {
    if (parsed.hostname === "www.wadifa-info.com") {
      const wait = Math.max(0, wadifaLastRequest + 61_000 - Date.now());
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      wadifaLastRequest = Date.now();
    }
    const response = await fetch(url, {
      signal: AbortSignal.timeout(25_000),
      redirect: "error",
      headers: {
        Accept: "application/json",
        "User-Agent":
          "VirtusJobCollector/0.1 (+https://github.com/yassine-yki/VIrtus_mainrepo)",
      },
    });
    if (response.ok) return response.json();
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

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Unexpected source response");
  return value as Record<string, unknown>;
}
export function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}
