import CatalogPage from "@/components/catalog-page";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Emplois tech au Maroc",
  description:
    "Développement, data, cloud, cybersécurité et IT. Des offres employeurs avec liens directs.",
};
export default function TechPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <CatalogPage {...props} techMode />;
}
