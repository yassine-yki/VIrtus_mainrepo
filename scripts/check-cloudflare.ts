import { extractionConfig, extractProfile } from "../src/lib/cv-extraction";
// Explicit operator smoke: synthetic text only, no files, accounts, database writes or raw response logs.
const config = extractionConfig({
  ...process.env,
  CV_EXTRACTION_PROVIDER: "cloudflare",
  CV_EXTRACTION_ENABLED: "true",
});
if (!config)
  throw new Error(
    "Cloudflare synthetic check requires configured credentials, reviewed terms and a confirmed Free plan. No API request made.",
  );
const samples = [
  {
    text: "Synthetic test CV. Python SQL developer. Languages: French and English. Education: Master informatique.",
    skills: ["python", "sql"],
  },
  {
    text: "CV fictif de test. Développeur Java et React. Langues : Français et Anglais. Formation : Licence informatique.",
    skills: ["java", "react"],
  },
];
for (const sample of samples) {
  const profile = await extractProfile(sample.text, config);
  if (
    sample.skills.some(
      (skill) => !profile.skills.some((s) => s.toLowerCase() === skill),
    )
  )
    throw new Error(
      "Synthetic extraction missed an explicitly stated skill. Candidate rollout remains disabled.",
    );
  if (
    profile.years !== null ||
    !profile.languages.includes("fr") ||
    !profile.languages.includes("en")
  )
    throw new Error("Synthetic extraction failed profile validation.");
}
console.log(
  JSON.stringify({
    check: "cloudflare-synthetic-cv",
    passed: samples.length,
    model: config.model,
    checkedAt: new Date().toISOString(),
  }),
);
