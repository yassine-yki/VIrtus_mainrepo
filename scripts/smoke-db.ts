import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
const token = process.env.VIRTUS_REVIEW_TOKEN;
if (!url || !key || !token)
  throw new Error(
    "Configure local Supabase read and review values before running this check",
  );
const client = createClient(url, key, { auth: { persistSession: false } });
const publicRead = await client.rpc("search_catalog");
assert.equal(publicRead.error, null);
const denied = await client.rpc("search_catalog_review", {
  p_token: "invalid",
});
assert.ok(denied.error, "Wrong preview token must be denied");
const review = await client.rpc("search_catalog_review", { p_token: token });
assert.equal(review.error, null);
assert.ok(
  review.data.total > 0,
  "Review database must contain real imported jobs",
);
const search = await client.rpc("search_catalog_review", {
  p_token: token,
  p_query: "java",
});
assert.equal(search.error, null);
assert.ok(search.data.total > 0);
const filtered = await client.rpc("search_catalog_review", {
  p_token: token,
  p_query: "java",
  p_contract: "CDI",
  p_workplace: "hybrid",
});
assert.equal(filtered.error, null);
assert.ok(filtered.data.total <= search.data.total);
const first = review.data.jobs[0];
const detail = await client.rpc("get_catalog_job_review", {
  p_token: token,
  p_id: first.group_key,
});
assert.equal(detail.error, null);
assert.equal(detail.data.group_key, first.group_key);
console.log(
  JSON.stringify({
    publicResults: publicRead.data.total,
    reviewResults: review.data.total,
    javaResults: search.data.total,
    filteredResults: filtered.data.total,
    details: "ok",
    wrongToken: "denied",
  }),
);
