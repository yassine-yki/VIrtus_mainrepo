import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  MapPin,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
} from "lucide-react";
import { Header, Footer } from "@/components/brand";
import { CompanyMark } from "@/components/job-card";
import { getJob } from "@/lib/catalog";
import { shortDate, workplaceLabels, deadlineLabel } from "@/lib/format";

export const dynamic = "force-dynamic";
export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { job } = await getJob((await params).id);
  if (!job) notFound();
  return (
    <>
      <Header />
      <main id="main" className="detail-page shell">
        <Link className="back-link" href="/#offres">
          <ArrowLeft size={15} /> Toutes les offres
        </Link>
        <div className="detail-grid">
          <article className="detail-main">
            <div className="detail-company">
              <CompanyMark company={job.company} large />
              <div>
                <p className="eyebrow">VOTRE PROCHAINE ÉTAPE ?</p>
                <p>{job.company}</p>
              </div>
            </div>
            <h1>{job.title}</h1>
            {job.kind === "competition" && (
              <div className="competition-meta">
                <strong className="competition-badge">Concours public</strong>
                <p>
                  {job.positions} poste{job.positions === 1 ? "" : "s"} · Date
                  limite : {deadlineLabel(job.deadline)} (heure du Maroc)
                </p>
              </div>
            )}
            <div className="detail-facts">
              <span>
                <MapPin size={17} />
                {job.locations.join(" · ")}
              </span>
              <span>
                <BriefcaseBusiness size={17} />
                {job.contract}
              </span>
              <span>
                <Building2 size={17} />
                {workplaceLabels[job.workplace]}
              </span>
              <span>
                <CalendarDays size={17} />
                {job.published_at
                  ? `Publiée le ${shortDate(job.published_at)}`
                  : "Date de publication non précisée"}
              </span>
            </div>
            <div className="description">
              <h2>À propos de cette opportunité</h2>
              <p>
                Virtus rassemble les informations essentielles et le lien vers
                l’annonce. Consultez le site d’origine pour la description
                complète, les conditions et les modalités de candidature.
              </p>
            </div>
          </article>
          <aside className="apply-panel">
            <p className="eyebrow">ÇA VOUS PARLE ?</p>
            <h2>
              La suite se passe
              <br />
              chez l’employeur.
            </h2>
            <p>
              Consultez les conditions complètes et envoyez votre candidature
              sur le site d’origine.
            </p>
            <a
              className="search-button"
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {job.kind === "competition"
                ? "Voir l’avis officiel"
                : "Voir l’offre originale"}{" "}
              <ArrowUpRight size={17} />
            </a>
            <dl>
              <dt>Entreprise</dt>
              <dd>{job.company}</dd>
              <dt>Rémunération</dt>
              <dd>{job.salary ?? "Non communiquée"}</dd>
              <dt>Dernière collecte</dt>
              <dd>{shortDate(job.last_seen_at)}</dd>
            </dl>
            {job.attribution_url && (
              <p>
                <a
                  className="attribution"
                  href={job.attribution_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Source : Wadifa Info
                </a>
                <br />
                <small>
                  Métadonnées adaptées sous licence{" "}
                  <a
                    href="https://creativecommons.org/licenses/by/4.0/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    CC BY 4.0
                  </a>
                  . L’avis officiel fait foi.
                </small>
              </p>
            )}
            {job.official_notice_url && job.official_notice_url !== job.url && (
              <a
                href={job.official_notice_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Avis officiel
              </a>
            )}
            <h3>Source{job.sources.length > 1 ? "s" : ""}</h3>
            {job.sources.map((source) => (
              <a
                className="source-detail-link"
                key={source.id}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {source.name}
                <ArrowUpRight size={14} />
              </a>
            ))}
            <p className="fine-print">
              Virtus ne reçoit pas votre candidature. Les informations et la
              disponibilité peuvent changer.
            </p>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
