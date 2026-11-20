import CatalogPage from "@/components/catalog-page";
export const dynamic = "force-dynamic";
export default function Home(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <CatalogPage {...props} />;
}
