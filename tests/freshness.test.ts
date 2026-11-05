import test from "node:test";
import assert from "node:assert/strict";
import { publicationLabel, sourceOverdue } from "../src/lib/format";
test("publication age stays separate from observation time and includes the year for old ads", () => {
  const now = Date.parse("2026-11-05T12:00:00Z");
  assert.match(publicationLabel("2021-12-15T16:25:09Z", now), /2021/);
  assert.equal(publicationLabel(null, now), "Publication non datée");
  assert.equal(
    publicationLabel("2026-11-05T10:00:00Z", now),
    "Publiée aujourd’hui",
  );
  assert.equal(sourceOverdue("2026-11-04T12:00:00Z", now), false);
  assert.equal(sourceOverdue("2026-11-04T11:59:59Z", now), true);
  assert.equal(sourceOverdue(null, now), true);
});
