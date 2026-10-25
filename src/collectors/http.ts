const hosts = new Set([
  "api.smartrecruiters.com",
  "boards-api.greenhouse.io",
  "api.lever.co",
]);

export type FetchJson = (url: string) => Promise<unknown>;
export async function fetchJson(url: string): Promise<unknown> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !hosts.has(parsed.hostname))
    throw new Error("Unapproved collection host");
  for (let attempt = 0; attempt < 3; attempt++) {
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
      const retryAfter = Number(response.headers.get("retry-after"));
      await new Promise((resolve) =>
        setTimeout(
          resolve,
          Math.min(
            15_000,
            Math.max(1000 * 2 ** attempt, (retryAfter || 0) * 1000),
          ),
        ),
      );
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
