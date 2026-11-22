import test from "node:test";
import assert from "node:assert/strict";
import {
  extractionConfig,
  extractionDisclosure,
  extractProfile,
  maximumExtractionCost,
  validateExtractionInput,
  CLOUDFLARE_MODEL,
} from "../src/lib/cv-extraction";
import { emptyProfile } from "../src/lib/profile";
const env = {
  CV_EXTRACTION_ENABLED: "true",
  CV_EXTRACTION_PROVIDER: "cloudflare",
  CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
  CLOUDFLARE_API_TOKEN: "synthetic-key",
  CLOUDFLARE_MODEL,
  CLOUDFLARE_FREE_PLAN_CONFIRMED: "true",
  CLOUDFLARE_PRIVACY_REVIEWED: "true",
  CLOUDFLARE_PRICING_VERSION: "test",
  CLOUDFLARE_INPUT_USD_PER_MILLION: "0.293",
  CLOUDFLARE_OUTPUT_USD_PER_MILLION: "2.253",
};
test("Cloudflare config requires a confirmed Free plan, terms, explicit supported model and valid account without HF fallback", () => {
  const c = extractionConfig(env)!;
  assert.ok(c);
  assert.equal(c.provider, "cloudflare");
  assert.equal(
    c.endpoint,
    "https://api.cloudflare.com/client/v4/accounts/" +
      "a".repeat(32) +
      "/ai/v1/chat/completions",
  );
  for (const patch of [
    { CV_EXTRACTION_ENABLED: "false" },
    { CLOUDFLARE_FREE_PLAN_CONFIRMED: "false" },
    { CLOUDFLARE_PRIVACY_REVIEWED: "false" },
    { CLOUDFLARE_ACCOUNT_ID: "../other-account" },
    { CLOUDFLARE_API_TOKEN: "" },
    { CLOUDFLARE_MODEL: "@cf/unknown/paid-model" },
    { CLOUDFLARE_INPUT_USD_PER_MILLION: "0" },
    { CV_EXTRACTION_PROVIDER: "other" },
  ])
    assert.equal(extractionConfig({ ...env, ...patch }), null);
  assert.ok(
    maximumExtractionCost(c) >= (2 * (19904 * 0.293 + 4096 * 2.253)) / 1e6,
  );
  assert.deepEqual(extractionDisclosure(env), {
    name: "Cloudflare Workers AI",
    privacyUrl:
      "https://developers.cloudflare.com/workers-ai/platform/data-usage/",
  });
  assert.equal(extractionDisclosure({}).name, "Hugging Face");
});
test("Cloudflare bounds UTF-8 input before requests without truncation and preserves validated French facts", async () => {
  const c = extractionConfig(env)!;
  let calls = 0;
  const text = "Développeur Python SQL. Français English. Master informatique.";
  const profile = {
    ...emptyProfile(),
    skills: ["Python", "SQL"],
    languages: ["fr", "en"],
    education: ["Master informatique"],
  };
  const fetcher: typeof fetch = async (url, opts) => {
    calls++;
    assert.equal(url, c.endpoint);
    assert.equal(opts?.redirect, "error");
    const b = JSON.parse(String(opts?.body));
    assert.equal(b.messages[1].content, text);
    assert.equal(b.tools, undefined);
    assert.deepEqual(b.response_format, { type: "json_object" });
    assert.equal(b.max_tokens, 4096);
    return Response.json({
      choices: [
        {
          finish_reason: "stop",
          message: { content: JSON.stringify(profile) },
        },
      ],
    });
  };
  assert.deepEqual(
    (await extractProfile(text, c, fetcher)).skills,
    profile.skills,
  );
  assert.equal(calls, 1);
  const long = "ع".repeat(15000);
  assert.throws(() => validateExtractionInput(long, c), /tronqué/);
  await assert.rejects(extractProfile(long, c, fetcher), /tronqué/);
  assert.equal(calls, 1);
  await assert.rejects(
    extractProfile(text, c, async () =>
      Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify({ ...profile, skills: ["Rust"] }),
            },
          },
        ],
      }),
    ),
    /justifiées/,
  );
});
test("Cloudflare quota exhaustion and invalid auth do not leak responses or switch providers", async () => {
  const c = extractionConfig(env)!;
  for (const status of [429, 401]) {
    let calls = 0;
    await assert.rejects(
      extractProfile("Synthetic Python profile", c, async () => {
        calls++;
        return new Response("private upstream content", {
          status,
          headers: { "retry-after": "60" },
        });
      }),
      /Service occupé|Extraction indisponible/,
    );
    assert.equal(calls, 1);
  }
});
