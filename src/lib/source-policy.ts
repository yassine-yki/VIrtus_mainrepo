import { deadlineOpen } from "./deadline";
import type { Listing } from "./types";
export const canExportSource = (id: string) => id !== "himalayas";
export function listingVisible(
  job: Listing,
  sourceSuccess: string | null | undefined,
  now = Date.now(),
): boolean {
  return (
    job.active &&
    deadlineOpen(job.deadline, now) &&
    (!job.expires_at || Date.parse(job.expires_at) > now) &&
    (Date.parse(job.last_seen_at) > now - 72 * 3600000 ||
      (job.source_id === "himalayas" &&
        !!sourceSuccess &&
        Date.parse(sourceSuccess) > now - 72 * 3600000))
  );
}
