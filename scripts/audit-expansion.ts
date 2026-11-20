/** Read public employer pages; write factual audit artifacts only. Never registers or collects into production. */
import { writeFile, mkdir } from "node:fs/promises";
import { load } from "cheerio";
import { collectTeamtailor } from "../src/collectors/teamtailor";
import { sources } from "../src/lib/sources";
const employers = [
  [
    "Deloitte",
    "https://www.deloitte.com/global/en/careers/job-search.html",
    "Country selector; complete Morocco feed not validated.",
  ],
  [
    "DXC",
    "https://careers.dxc.com/job-search-results/",
    "Custom careers search; no complete public Workday feed validated.",
  ],
  [
    "Orange/Sofrecom",
    "https://orange.jobs/fr/fr/morocco-search-results",
    "Existing collector requires complete stable pagination; remains disabled pending recheck.",
  ],
  [
    "Expleo",
    "https://expleo-jobs-ma-fr.icims.com/jobs/search",
    "iCIMS adapter outside this release; do not treat industrial vacancies as tech.",
  ],
  [
    "VISEO",
    "https://viseo.applytojob.com/apply",
    "JazzHR board; Morocco vacancies visible, connector outside this release.",
  ],
  [
    "Leyton",
    "https://leytonglobal-morocco.teamtailor.com/jobs",
    "Teamtailor RSS cross-checked against sitemap before and after traversal.",
  ],
  [
    "inwi",
    "https://jobs.inwi.ma/jobs",
    "Teamtailor RSS cross-checked against sitemap before and after traversal.",
  ],
  [
    "Ericsson",
    "https://jobs.ericsson.com/careers",
    "Custom dynamic careers search; complete supported feed not validated.",
  ],
  [
    "Oracle",
    "https://careers.oracle.com/en/sites/jobsearch",
    "Oracle candidate portal; connector outside this release.",
  ],
  [
    "Salesforce",
    "https://careers.salesforce.com/en/jobs/",
    "Careers portal; complete supported feed not validated.",
  ],
  [
    "Microsoft",
    "https://careers.microsoft.com/v2/global/en/home.html",
    "Dynamic careers portal; complete supported feed not validated.",
  ],
  [
    "IBM",
    "https://www.ibm.com/careers/search",
    "Dynamic careers portal; complete supported feed not validated.",
  ],
  [
    "SOTI",
    "https://soti.net/careers/",
    "Careers landing page; complete supported feed not validated.",
  ],
  [
    "Dell Technologies",
    "https://jobs.dell.com/en/location/morocco-jobs/375/2542007/2",
    "Redirects to Oracle candidate experience; connector outside this release.",
  ],
  [
    "Canonical",
    "https://canonical.com/careers/all",
    "Remote EMEA/worldwide is not explicit Morocco eligibility; do not import on that basis.",
  ],
  [
    "GitLab",
    "https://about.gitlab.com/jobs/",
    "Remote organization; explicit Morocco eligibility must be validated per posting.",
  ],
  [
    "Automattic",
    "https://automattic.com/work-with-us/jobs/",
    "Global remote does not prove Morocco eligibility; complete eligible feed not validated.",
  ],
  [
    "Chari",
    "https://chari.group/fr/careers",
    "Careers page with email/LinkedIn applications; no supported public listing feed established.",
  ],
  [
    "Freterium",
    "https://freterium.ai/careers",
    "Careers landing page; complete supported job feed not established.",
  ],
  [
    "PayTic",
    "https://payticconnect.com/careers/",
    "Careers endpoint must be verified; no supported feed established.",
  ],
];
const checkedAt = new Date().toISOString(),
  rows = [];
for (const [name, careersUrl, note] of employers) {
  try {
    const r = await fetch(careersUrl, {
      signal: AbortSignal.timeout(20000),
      headers: { "User-Agent": "VirtusSourceAudit/1.0" },
    });
    const html = await r.text(),
      $ = load(html);
    const links = [
      ...new Set(
        $("a[href]")
          .map((_, e) => $(e).attr("href") || "")
          .get(),
      ),
    ];
    rows.push({
      name,
      careersUrl,
      finalUrl: r.url,
      status: r.status,
      checkedAt,
      title: $("title").text().trim(),
      identifier:
        sources.find((s) => s.website === careersUrl)?.identifier ?? null,
      atsLinks: links
        .filter((u) =>
          /greenhouse|lever\.co|ashbyhq|workable|teamtailor|myworkdayjobs|icims|applytojob/.test(
            u,
          ),
        )
        .slice(0, 12),
      evidenceUrls: [careersUrl],
      publicationScope:
        "Owner-approved job facts and original links; no full-ad licence asserted",
      note,
      decision: "deferred",
      moroccoCount: null as number | null,
      techCount: null as number | null,
      recentTechCount: null as number | null,
      paginationComplete: false,
    });
  } catch (e) {
    rows.push({
      name,
      careersUrl,
      checkedAt,
      status: null,
      note,
      decision: "deferred-access-unverified",
      error: e instanceof Error ? e.name : "Fetch failed",
      moroccoCount: null,
      techCount: null,
      recentTechCount: null,
      paginationComplete: false,
    });
  }
}
for (const id of ["inwi", "leyton-morocco"]) {
  const source = sources.find((s) => s.id === id)!;
  const jobs = await collectTeamtailor(source),
    row = rows.find((r) => r.careersUrl === source.website)!;
  Object.assign(row, {
    decision: jobs.some((j) => j.tech?.families.length)
      ? "validated"
      : "disabled-no-tech",
    moroccoCount: jobs.length,
    techCount: jobs.filter((j) => j.tech?.families.length).length,
    recentTechCount: jobs.filter(
      (j) =>
        j.tech?.families.length &&
        j.published_at &&
        Date.parse(j.published_at) >= Date.now() - 30 * 86400000,
    ).length,
    paginationComplete: true,
  });
  await mkdir("data/audits", { recursive: true });
  await writeFile(
    `data/audits/${id}-tech.json`,
    JSON.stringify({ checkedAt, source, listings: jobs }, null, 2),
  );
}
await writeFile(
  "docs/TECH-EXPANSION-AUDIT-2026-11-17.json",
  JSON.stringify({ checkedAt, employers: rows }, null, 2),
);
console.log(
  JSON.stringify(
    rows.map((r) => ({
      name: r.name,
      status: r.status,
      decision: r.decision,
      morocco: r.moroccoCount,
      tech: r.techCount,
      recentTech: r.recentTechCount,
    })),
  ),
);
