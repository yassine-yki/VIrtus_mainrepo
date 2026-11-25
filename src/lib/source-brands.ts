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
      src: "/images/sources/" + id + ".webp",
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
