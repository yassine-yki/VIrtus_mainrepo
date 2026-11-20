// Explicit labels reviewed from the local catalog titles, independently of classifier output.
// Run only to reconstruct the checked-in fixture from the original audit snapshot.
import { readFile, writeFile } from "node:fs/promises";
const catalog = JSON.parse(await readFile("data/catalog.json", "utf8"));
const indices = [
  ...Array.from({ length: 30 }, (_, i) => i),
  ...Array.from({ length: 50 }, (_, i) => 92 + i),
  ...Array.from({ length: 20 }, (_, i) => 240 + i),
];
const labels: Record<number, [string[], string[], string]> = {
  95: [["qa"], [], "lead"],
  103: [["product", "erp"], ["salesforce"], "unknown"],
  106: [["qa"], [], "senior"],
  109: [["software", "data"], ["python"], "unknown"],
  114: [["data"], [], "senior"],
  115: [["software"], ["dotnet"], "unknown"],
  120: [["cloud"], ["gcp"], "senior"],
  121: [["cloud"], ["gcp"], "unknown"],
  126: [["software"], [], "unknown"],
  128: [["support"], ["oracle"], "unknown"],
  132: [["software"], ["java", "spring", "angular"], "unknown"],
  133: [["data"], ["spark"], "unknown"],
  137: [["software", "cloud"], ["dotnet"], "unknown"],
  139: [["cloud", "support"], ["kubernetes", "gcp"], "junior"],
  240: [["data"], ["sql", "python", "gcp"], "senior"],
  241: [["data"], ["sql", "python", "gcp"], "mid"],
  242: [["data"], [], "unknown"],
  245: [["data"], [], "senior"],
  246: [["data"], ["sql"], "unknown"],
  247: [["data"], ["sql", "python"], "senior"],
  248: [["cloud"], [], "senior"],
  249: [["security"], [], "unknown"],
  250: [["data"], [], "senior"],
  251: [["erp"], [], "unknown"],
  252: [["cloud"], [], "senior"],
  253: [["cloud"], [], "senior"],
  254: [["software"], ["java", "vue", "javascript"], "unknown"],
  255: [["qa", "software"], ["java", "spring"], "senior"],
  256: [["cloud"], [], "senior"],
  257: [["cloud"], [], "unknown"],
  258: [["cloud"], ["aws"], "unknown"],
  259: [["data"], [], "unknown"],
};
const rows = indices.map((index) => {
  const job = catalog.listings[index];
  if (!job) throw new Error("Missing snapshot row");
  const [families, technologies, seniority] = labels[index] || [
    [],
    [],
    "unknown",
  ];
  return {
    title: job.title,
    url: job.url,
    source: job.source_id,
    expected: { families, technologies, seniority },
  };
});
await writeFile(
  "tests/tech-labelled-jobs.json",
  JSON.stringify(
    {
      reviewedAt: "2026-11-18",
      reviewer: "agent manual title review",
      scope:
        "100 real catalog titles. Conservative title-only labels; ambiguous titles are unknown. Not a human-reviewed pilot or a description-extraction benchmark.",
      rows,
    },
    null,
    2,
  ) + "\n",
);
