import assert from "node:assert/strict";
import { reviewCookieValue } from "../src/lib/review-auth";
const base = "http://127.0.0.1:3001";
const token = process.env.VIRTUS_REVIEW_TOKEN;
if (!token) throw new Error("A local review token is required");
const anonymous = await fetch(`${base}/api/jobs`);
assert.equal(anonymous.status, 401);
const redirect = await fetch(base, { redirect: "manual" });
assert.equal(redirect.status, 307);
assert.equal(
  new URL(redirect.headers.get("location")!, base).pathname,
  "/access",
);
const response = await fetch(`${base}/api/jobs?q=java`, {
  headers: { Cookie: `virtus_review=${reviewCookieValue(token)}` },
});
assert.equal(response.status, 200);
const body = await response.json();
assert.equal(body.mode, "supabase");
assert.equal(body.review, true);
assert.ok(body.total > 0);
console.log(
  JSON.stringify({
    anonymousApi: anonymous.status,
    anonymousPage: "redirected to access",
    authorizedApi: response.status,
    results: body.total,
    storage: body.mode,
  }),
);
