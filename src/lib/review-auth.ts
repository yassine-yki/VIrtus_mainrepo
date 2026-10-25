import { createHash, timingSafeEqual } from "node:crypto";
export function reviewEnabled(): boolean {
  return (
    process.env.CATALOG_AUDIENCE === "internal" &&
    Boolean(
      process.env.VIRTUS_REVIEW_TOKEN &&
        process.env.VIRTUS_REVIEW_TOKEN.length >= 48,
    )
  );
}
export function reviewCookieValue(token: string): string {
  return createHash("sha256").update(`virtus-review:${token}`).digest("hex");
}
export function equalSecret(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}
