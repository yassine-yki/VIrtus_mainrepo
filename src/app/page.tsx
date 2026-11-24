import Link from "next/link";
import { Brand } from "@/components/brand";
import { CategoryNavigation } from "@/components/category-navigation";
import { catalogCategories, categoryUrl } from "@/lib/catalog-navigation";
import { parseFilters } from "@/lib/search";

// Deliberately static: entering Virtus never waits for a catalog query.
export default function Home() {
  const filters = parseFilters({});
  return (
    <main id="main" className="landing-screen intro-stage">
      <header className="landing-header">
        <Brand />
        <nav aria-label="Navigation principale">
          {process.env.CANDIDATE_PROFILES_ENABLED === "true" && (
            <Link href="/profil" prefetch={false}>
              Mon profil
            </Link>
          )}
          <Link href="/sources" prefetch={false}>
            Nos sources
          </Link>
        </nav>
      </header>
      <div className="landing-content">
        <div className="landing-heading">
          <p className="eyebrow">VOTRE PROCHAIN CHAPITRE</p>
          <h1>Les opportunités commencent ici.</h1>
        </div>
        <CategoryNavigation
          landing
          compact={false}
          links={catalogCategories.map((category) => ({
            id: category.id,
            href: categoryUrl(filters, category.id),
            current: false,
          }))}
        />
      </div>
      <footer className="landing-footer">
        <span>MAROC · EMPLOIS & OPPORTUNITÉS</span>
        <Link href="/offres">
          Explorer toutes les offres <span aria-hidden="true">↗</span>
        </Link>
      </footer>
    </main>
  );
}
