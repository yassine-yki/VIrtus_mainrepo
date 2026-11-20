import test from "node:test";
import assert from "node:assert/strict";
import fixture from "./tech-labelled-jobs.json";
import { classifyTech } from "../src/lib/tech";
test("100 manually labelled catalog titles meet inclusion and emitted-tag precision gates", () => {
  assert.equal(fixture.rows.length, 100);
  let emitted = 0,
    correct = 0,
    included = 0,
    includedCorrect = 0,
    positives = 0,
    recalled = 0;
  for (const row of fixture.rows) {
    const result = classifyTech(row.title);
    if (row.expected.families.length) positives++;
    if (result.families.length) {
      included++;
      if (row.expected.families.length) {
        includedCorrect++;
        recalled++;
      }
      for (const family of result.families) {
        emitted++;
        if (row.expected.families.includes(family)) correct++;
      }
      for (const tech of result.technologies) {
        emitted++;
        if (row.expected.technologies.includes(tech)) correct++;
      }
      if (result.seniority !== "unknown") {
        emitted++;
        if (result.seniority === row.expected.seniority) correct++;
      }
      assert.deepEqual(result.requiredLanguages, []);
      assert.deepEqual(result.requiredTechnologies, []);
    }
  }
  console.log(
    JSON.stringify({
      benchmark: "title-v1",
      samples: 100,
      included,
      positives,
      inclusionPrecision: includedCorrect / included,
      emittedTags: emitted,
      tagPrecision: correct / emitted,
      recall: recalled / positives,
    }),
  );
  assert.ok(included > 15 && emitted > 30);
  assert.ok(includedCorrect / included >= 0.95);
  assert.ok(correct / emitted >= 0.95);
});
