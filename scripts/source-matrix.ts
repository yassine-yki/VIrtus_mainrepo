import { sources } from "../src/lib/sources";
const selected = process.env.COLLECTION_SOURCE?.trim();
if (
  selected &&
  !sources.some(
    (s) => s.id === selected && s.enabled && s.publicationStatus !== "blocked",
  )
)
  throw new Error("Unknown or disabled collection source");
const include = sources
  .filter((source) => source.enabled && source.publicationStatus !== "blocked")
  .filter((source) => !selected || source.id === selected)
  .map((source) => ({ source: source.id }));
if (!include.length) throw new Error("No enabled sources");
console.log(JSON.stringify({ include }));
