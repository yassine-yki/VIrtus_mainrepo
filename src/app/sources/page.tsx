import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Database,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Header, Footer } from "@/components/brand";
import { sources, candidateSources } from "@/lib/sources";
export const metadata = { title: "Nos sources et notre méthode" };
export default function SourcesPage() {
  return (
    <>
      <Header />
      <main id="main" className="sources-page shell">
        <p className="eyebrow">LA TRANSPARENCE, DÈS LE DÉPART</p>
        <h1>
          Des opportunités.
          <br />
          <em>Des sources identifiées.</em>
        </h1>
        <p className="page-intro">
          Virtus rassemble une sélection d’offres au Maroc. Chaque annonce garde
          son lien d’origine pour que vous puissiez vérifier les détails et
          postuler à la source.
        </p>
        <div className="method-grid">
          {[
            {
              icon: Database,
              title: "01 / Collecter",
              text: "Les connecteurs lisent les offres publiées sur les plateformes de recrutement des employeurs.",
            },
            {
              icon: RefreshCw,
              title: "02 / Organiser",
              text: "Les lieux et contrats sont harmonisés. Les doublons certains sont regroupés et les offres régulièrement revérifiées.",
            },
            {
              icon: ExternalLink,
              title: "03 / Vous laisser choisir",
              text: "Vous cherchez dans le catalogue, puis ouvrez l’offre originale. Aucun compte ni CV n’est demandé par Virtus.",
            },
          ].map((item) => (
            <article key={item.title}>
              <item.icon size={23} />
              <h2>{item.title}</h2>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
        <div className="section-title">
          <h2>Les premiers connecteurs</h2>
          <span>3 PLATEFORMES · 7 FLUX EMPLOYEURS</span>
        </div>
        <p className="section-description">
          Accès technique testé via SmartRecruiters, Greenhouse et Lever. Une
          source reste en évaluation tant que ses conditions de diffusion ne
          sont pas confirmées. Un accès public à des données ne constitue pas, à
          lui seul, une autorisation de republication.
        </p>
        <div className="source-cards">
          {sources.map((source) => (
            <article key={source.id}>
              <div>
                <span className="provider-tag">
                  {source.provider === "smartrecruiters"
                    ? "SmartRecruiters"
                    : source.provider === "greenhouse"
                      ? "Greenhouse"
                      : "Lever"}
                </span>
                <span className="status-tag">En évaluation</span>
              </div>
              <h3>{source.name}</h3>
              <p>{source.permissionNote}</p>
              <a
                href={source.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                Site de recrutement <ArrowUpRight size={15} />
              </a>
            </article>
          ))}
        </div>
        <div className="section-title">
          <h2>Élargir la sélection</h2>
          <span>ÉTAPE SUIVANTE</span>
        </div>
        <p className="section-description">
          Ces sites sont des pistes d’intégration. Leurs annonces ne sont pas
          présentées comme déjà collectées.
        </p>
        <div className="candidate-list">
          {candidateSources.map((source) => (
            <div key={source.name}>
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                {source.name}
                <ArrowUpRight size={14} />
              </a>
              <span>{source.status}</span>
            </div>
          ))}
        </div>
        <div className="method-note">
          <h2>Quelques limites, clairement dites.</h2>
          <p>
            Le catalogue couvre les sources connectées et validées, pas tous les
            emplois au Maroc. Une offre peut être modifiée ou retirée entre deux
            collectes. Une date de découverte n’est pas une date de publication.
            Le télétravail n’est inclus que si la localisation indique le Maroc.
            LinkedIn ne fait pas partie des sources connectées.
          </p>
        </div>
        <Link className="text-link" href="/#offres">
          Explorer les offres <ArrowRight size={16} />
        </Link>
      </main>
      <Footer />
    </>
  );
}
