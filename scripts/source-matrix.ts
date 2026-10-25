import { sources } from "../src/lib/sources";
const include = sources
  .filter((source) => source.enabled && source.publicationStatus !== "blocked")
  .map((source) => ({ source: source.id }));
if (!include.length) throw new Error("No enabled sources");
console.log(JSON.stringify({ include }));
