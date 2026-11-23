import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { categoryImages } from "../src/lib/category-imagery";
import { catalogCategories } from "../src/lib/catalog-navigation";
test("every category has a distinct valid local WebP background within the page asset budget", () => {
  const files = catalogCategories.map((c) => categoryImages[c.id]);
  assert.equal(new Set(files).size, 5);
  let total = 0;
  for (const file of files) {
    assert.match(file, /^\/images\/[a-z-]+\.webp$/);
    const bytes = readFileSync("public" + file);
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
    assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
    total += bytes.length;
  }
  assert.ok(
    total < 900000,
    "Decorative backgrounds must stay below 900 KB combined; load only visited categories",
  );
});
