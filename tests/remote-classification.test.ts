import test from "node:test";
import assert from "node:assert/strict";
import { classifyTech, TECH_VERSION } from "../src/lib/tech";
test("classification v2 recognizes explicit SRE and technical product titles without adding generic product roles", () => {
  assert.equal(TECH_VERSION, 2);
  for (const title of ["Senior Site Reliability Engineer", "SRE"])
    assert.ok(classifyTech(title).families.includes("cloud"));
  for (const title of [
    "Group Product Manager, Data Platforms",
    "Senior Product Manager, Mobile Apps (Contract)",
  ])
    assert.deepEqual(classifyTech(title).families, ["product"]);
  for (const title of [
    "Product Manager",
    "Product Manager, Cosmetics",
    "Head of Marketing",
  ])
    assert.deepEqual(classifyTech(title).families, []);
});
