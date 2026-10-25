import Link from "next/link";
import { ArrowUpRight, MapPin, Clock3, BriefcaseBusiness } from "lucide-react";
import { age, workplaceLabels, deadlineLabel } from "@/lib/format";
import type { Job } from "@/lib/types";

const companyColors: Record<string, string> = {
  ALTEN: "blue",
  Accor: "purple",
  SQLI: "coral",
  Devoteam: "red",
  Nuitée: "green",
  "Energy Recovery": "blue",
};
export function CompanyMark({
  company,
  large = false,
}: {
  company: string;
  large?: boolean;
}) {
  return (
    <span
      className={`company-mark ${companyColors[company] ?? "green"} ${large ? "large" : ""}`}
      aria-hidden="true"
    >
      {company === "Nuitée"
        ? "n."
        : company === "Accor"
          ? "A"
          : company.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function JobCard({ job }: { job: Job }) {
  const date = job.published_at
    ? age(job.published_at)
    : `Repérée ${age(job.first_seen_at ?? job.last_seen_at).toLowerCase()}`;
  return (
    <article className="job-card">
      <CompanyMark company={job.company} />
      <div className="job-content">
        <div className="job-company">
          {job.company}
          <span className="company-separator">/</span>
          <span>
            {job.sources.length > 1
              ? `${job.sources.length} sources`
              : job.sources[0]?.name}
          </span>
        </div>
        <h3>
          <Link href={`/offres/${job.group_key}`}>{job.title}</Link>
        </h3>
        {job.kind === "competition" && (
          <div className="competition-meta">
            <strong className="competition-badge">Concours public</strong>
            <span>
              {job.positions} poste{job.positions === 1 ? "" : "s"} · Date
              limite : {deadlineLabel(job.deadline)}
            </span>
          </div>
        )}
        <div className="job-meta">
          <span>
            <MapPin size={14} />
            {job.locations.join(" · ")}
          </span>
          {job.contract !== "Non précisé" && (
            <span>
              <BriefcaseBusiness size={14} />
              {job.contract}
            </span>
          )}
          {job.workplace !== "unknown" && (
            <span className={job.workplace === "remote" ? "remote-text" : ""}>
              {workplaceLabels[job.workplace]}
            </span>
          )}
        </div>
        {job.salary && <p className="salary">{job.salary}</p>}
        {job.attribution_url && (
          <a
            className="attribution"
            href={job.attribution_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Source : Wadifa Info
          </a>
        )}
      </div>
      <div className="job-action">
        <span className="job-age">
          <Clock3 size={12} />
          {date}
        </span>
        <a
          className="view-job"
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Voir l’offre ${job.title} chez ${job.company} sur le site d’origine`}
        >
          Voir l’offre <ArrowUpRight size={15} />
        </a>
      </div>
    </article>
  );
}
