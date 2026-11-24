import CatalogPage from "@/components/catalog-page";
export const dynamic = "force-dynamic";
export const metadata = { title: "Offres d’emploi au Maroc" };
export default function JobsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <CatalogPage {...props} />;
}
