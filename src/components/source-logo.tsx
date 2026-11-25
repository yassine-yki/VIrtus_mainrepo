import { sourceBrand } from "@/lib/source-brands";
export function SourceLogo({
  source,
  decorative = false,
}: {
  source: { id: string; name: string };
  decorative?: boolean;
}) {
  const brand = sourceBrand(source);
  return (
    <span
      className={
        "source-logo" +
        (brand?.dark ? " source-logo-dark" : "") +
        (!brand ? " source-logo-fallback" : "")
      }
      title={source.name}
      aria-hidden={decorative || undefined}
    >
      {brand ? (
        <img
          src={brand.src}
          alt={decorative ? "" : source.name}
          width={128}
          height={48}
          loading="lazy"
          decoding="async"
        />
      ) : decorative ? (
        source.name.slice(0, 2).toUpperCase()
      ) : (
        source.name
      )}
    </span>
  );
}
