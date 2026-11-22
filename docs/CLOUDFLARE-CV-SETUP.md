# Cloudflare CV extraction - free-only testing

The website remains on Vercel. Only the CV text extraction provider changes; profile confirmation and deterministic matching remain independent of model calls.

## Verified provider setup (2026-11-22)

- Workers plans dashboard shows this account on Free ($0), with 10,000 Workers AI neurons per day. No subscription, paid Worker, domain transfer or AI Gateway is created. Recheck the plan before changing the free-plan confirmation flag; the application flag is an operator attestation, not a remote billing-plan check. Upgrading Cloudflare requires a separate decision and disabling the free-only integration first.
- Use the pinned, currently listed @cf/meta/llama-3.3-70b-instruct-fp8-fast model. The earlier Llama 3.1 8B variants are deprecated/removed. Do not silently substitute another model or provider.
- Model context is 24,000 tokens. Requests reserve 4,096 output tokens and conservatively bound UTF-8 input plus instructions and envelope overhead before calling the provider. The file parser still allows up to 4 MB / 30,000 characters, but a CV exceeding this model's smaller context budget is explicitly rejected with manual-entry guidance. No silent truncation or unsupported profile facts.
- Official model: https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/
- Pricing and Free-plan stop: https://developers.cloudflare.com/workers-ai/platform/pricing/
- API and token scope: https://developers.cloudflare.com/workers-ai/get-started/rest-api/
- Structured output: https://developers.cloudflare.com/workers-ai/features/json-mode/

## Production settings

The owner stores CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID as server-only Vercel production secrets. Never print, export into browser code, place in GitHub, or copy these values into setup documents. Use a replacement for any token previously shared in chat.

Set these non-secret production variables:

```dotenv
CV_EXTRACTION_PROVIDER=cloudflare
CLOUDFLARE_MODEL=@cf/meta/llama-3.3-70b-instruct-fp8-fast
CLOUDFLARE_FREE_PLAN_CONFIRMED=true
CLOUDFLARE_PRIVACY_REVIEWED=true
CLOUDFLARE_PRICING_VERSION=2026-11-22
CLOUDFLARE_INPUT_USD_PER_MILLION=0.293
CLOUDFLARE_OUTPUT_USD_PER_MILLION=2.253
CV_EXTRACTION_ENABLED=false
CANDIDATE_PROFILES_ENABLED=false
CANDIDATE_PASSWORD_AUTH_READY=false
```

The listed USD prices are conservative equivalent-compute reservations for the existing atomic ledger. They do not authorize paid usage. Keep Cloudflare on Free; the provider rejects calls above its daily allowance. The monthly application ceiling remains $10 equivalent-compute value, with at most five reserved extraction attempts per user per UTC day. A quota, credential or validation failure leaves manual entry available; no paid-provider fallback exists.

The selected endpoint is constructed from the validated account ID and fixed Cloudflare API host. Arbitrary URLs and arbitrary/paid models are not accepted.

## Privacy and consent

Reviewed https://developers.cloudflare.com/workers-ai/platform/data-usage/ on 2026-11-22. Cloudflare states standard stateless inference does not retain content after processing, subject to safety/security/legal exceptions, and does not use it for training. Operational metadata can be retained. This is not a promise of unconditional deletion. We do not enable AI Gateway logging/caching, batch, file storage or stateful features. The confirmation screen and consent error identify Cloudflare Workers AI and link directly to this policy. Only confirmed structured profiles are saved by Virtus.

## Synthetic checks and rollout

Run pnpm check:cloudflare in a trusted server environment with the credentials and settings above. The script temporarily enables only its local configuration object, sends two invented English/French CV snippets, validates the existing profile schema and factual evidence, and logs only a pass count, model ID and timestamp. It does not create candidate accounts, store CV text or write to the database.

Production verification succeeded in Vercel deployment 9Zdq3fFgTiBMYJMevE73A4j27H8x on 2026-11-22 at 12:11:38.120Z: two English/French synthetic CVs passed using the owner's production secrets. The one-time build hook was removed immediately afterward; ordinary builds make no inference requests. The old CLOUDFLARE_SMOKE_ON_BUILD variable, if still present in Vercel, is ignored. The owner can remove that obsolete variable during normal settings maintenance. Use the manual check command in a trusted server environment for future credential checks. Preview and normal CI builds make no provider calls.

Before a candidate pilot, use an operator database connection to prepare virtus_private.cv_budget_config with:

- config_version: llama-profile-v1:cloudflare:2026-11-22:@cf/meta/llama-3.3-70b-instruct-fp8-fast
- reservation*usd: at least ceil(2 * (19904 \_ 0.293 + 4096 \* 2.253)) / 1000000
- monthly_cap: 10
- enabled: false until the authenticated pilot rollout is ready.

No new schema or collector credentials are needed. Profiles and extraction remain disabled until hosted synthetic verification and the controlled pilot setup are ready. Review actual extraction results with ten consenting candidates before wider launch. Independent classification review remains a separate release gate.

## Diagnosis, rotation and rollback

- 401/403: verify the scoped token's Workers AI Read/Edit access and account. Never log upstream response bodies or credentials.
- Quota/busy: retain the profile and show manual entry; honor Retry-After and allow at most one retry. Do not upgrade billing or switch models automatically.
- Oversized/invalid output: reject explicitly; preserve the previous confirmed profile.
- Token rotation: the owner replaces CLOUDFLARE_API_TOKEN directly in Vercel, deploys, runs the synthetic check, then revokes the old token.
- Stop extraction with CV_EXTRACTION_ENABLED=false or CLOUDFLARE_FREE_PLAN_CONFIRMED=false; set the private budget enabled=false as a second gate. General browsing remains available.
