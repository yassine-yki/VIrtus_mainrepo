const assetVersions: Record<string, string> = {
  accor: "36417869571a",
  alten: "62ee0118c632",
  "alter-solutions": "7a1f387426c7",
  arcsen: "4e0d621d69ed",
  artefact: "8aac5079db79",
  devoteam: "65931d708544",
  scalian: "dfd556a384a2",
  sgs: "4968ea586b3a",
  sqli: "b9577c14aa44",
  wavestone: "31df8366af1c",
};
type Brand = { id: string; src: string; dark?: boolean };
const brands: Record<string, Brand> = Object.fromEntries(
  [
    "accor",
    "alten",
    "alter-solutions",
    "arcsen",
    "artefact",
    "devoteam",
    "scalian",
    "sqli",
    "wavestone",
    "sgs",
  ].map((id) => [
    id,
    {
      id,
      src:
        "/images/sources/versioned/" + id + "." + assetVersions[id] + ".webp",
      ...(["artefact", "arcsen", "sgs"].includes(id) ? { dark: true } : {}),
    },
  ]),
);
export function sourceBrand(source: {
  id: string;
  name: string;
}): Brand | undefined {
  if (
    source.id === "accorhotel" ||
    source.name.toLowerCase() === "accor hotels"
  )
    return brands.accor;
  return (
    brands[source.id] ?? brands[source.name.toLowerCase().replaceAll(" ", "-")]
  );
}
export function stripSources<
  T extends { id: string; name: string; count: number },
>(sources: T[]): T[] {
  const seen = new Set<string>();
  return sources
    .filter((source) => {
      if (source.count <= 0) return false;
      const key = sourceBrand(source)?.id ?? source.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
}
