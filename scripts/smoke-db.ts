import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
const url = process.env.SUPABASE_URL,
  key = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Configure Supabase publishable read values");
const client = createClient(url, key, { auth: { persistSession: false } });
const all = await client.rpc("search_catalog");
assert.equal(all.error, null);
assert.ok(all.data.total > 0);
assert.ok(
  all.data.jobs.every((job: { description: string }) => job.description === ""),
);
const jobs = await client.rpc("search_catalog", { p_kind: "job" });
const competitions = await client.rpc("search_catalog", {
  p_kind: "competition",
});
assert.equal(jobs.error, null);
assert.equal(competitions.error, null);
assert.ok(jobs.data.total > 0);
assert.ok(competitions.data.total > 0);
const detail = await client.rpc("get_catalog_job", {
  p_id: jobs.data.jobs[0].group_key,
});
assert.equal(detail.error, null);
assert.equal(detail.data.description, "");
const denied = await client.from("listings").select("description").limit(1);
assert.ok(denied.error, "Full imported descriptions must remain inaccessible");
const oldReview = await client.rpc("search_catalog_review", {
  p_token: "a".repeat(64),
});
assert.ok(oldReview.error, "Retired private endpoint must be inaccessible");
console.log(
  JSON.stringify({
    publicResults: all.data.total,
    employerJobs: jobs.data.total,
    competitions: competitions.data.total,
    fullDescriptions: "not exposed",
    retiredReview: "denied",
  }),
);
