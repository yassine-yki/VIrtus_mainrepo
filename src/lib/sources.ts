import type { Source } from "./types";
import auditedEmployers from "./audited-employers.json";

// Public endpoint availability is technical evidence, not a republication licence.
// Approve sources individually only after documenting the applicable agreement.
const pending =
  "Endpoint public testé. Conditions de republication à confirmer avant diffusion publique.";
export const sources: Source[] = [
  {
    id: "accor",
    name: "Accor",
    company: "Accor",
    provider: "smartrecruiters",
    identifier: "Accor",
    website: "https://careers.accor.com/fr/fr/morocco",
    enabled: true,
    publicationStatus: "pending",
    permissionNote: pending,
  },
  {
    id: "accorhotel",
    name: "Accor Hotels",
    company: "Accor",
    provider: "smartrecruiters",
    identifier: "AccorHotel",
    website: "https://careers.accor.com/fr/fr/morocco",
    enabled: true,
    publicationStatus: "pending",
    permissionNote: pending,
  },
  {
    id: "alten",
    name: "ALTEN",
    company: "ALTEN",
    provider: "smartrecruiters",
    identifier: "ALTEN",
    website: "https://careers.smartrecruiters.com/ALTEN",
    enabled: true,
    publicationStatus: "pending",
    permissionNote: pending,
  },
  {
    id: "devoteam",
    name: "Devoteam",
    company: "Devoteam",
    provider: "smartrecruiters",
    identifier: "Devoteam",
    website: "https://www.devoteam.com/fr-ma/jobs/",
    enabled: true,
    publicationStatus: "pending",
    permissionNote: pending,
  },
  {
    id: "sqli",
    name: "SQLI",
    company: "SQLI",
    provider: "smartrecruiters",
    identifier: "SQLI1",
    website: "https://careers.smartrecruiters.com/SQLI1",
    enabled: true,
    publicationStatus: "pending",
    permissionNote: pending,
  },
  {
    id: "nuitee",
    name: "Nuitée",
    company: "Nuitée",
    provider: "greenhouse",
    identifier: "nuitee",
    website: "https://job-boards.eu.greenhouse.io/nuitee",
    enabled: true,
    publicationStatus: "pending",
    permissionNote: pending,
  },
  {
    id: "energy-recovery",
    name: "Energy Recovery",
    company: "Energy Recovery",
    provider: "lever",
    identifier: "energyrecovery",
    website: "https://jobs.lever.co/energyrecovery",
    enabled: true,
    publicationStatus: "pending",
    permissionNote: pending,
  },
  {
    id: "wadifa",
    name: "Wadifa Info",
    company: "Wadifa Info",
    provider: "wadifa",
    identifier: "concours",
    website: "https://www.wadifa-info.com/developpeurs",
    enabled: true,
    publicationStatus: "pending",
    permissionNote:
      "CC BY 4.0, usage commercial autorisé. Source : Wadifa Info et lien par élément obligatoires. Licence vérifiée le 25/10/2026 : https://www.wadifa-info.com/developpeurs. Approbation opérateur en base requise.",
  },
  ...auditedEmployers.map(
    (entry): Source => ({
      id: entry.id,
      name: entry.name,
      company: entry.company,
      provider: entry.provider as Source["provider"],
      identifier: entry.identifier,
      website: entry.website,
      enabled: entry.enabled,
      publicationStatus: "pending",
      permissionNote: entry.permissionNote,
    }),
  ),
];

export const candidateSources = [
  {
    name: "Dreamjob.ma",
    url: "https://www.dreamjob.ma/",
    status: "Accès et réutilisation à valider",
  },
  {
    name: "Emploi-public.ma",
    url: "https://www.emploi-public.ma/",
    status: "Collecteur et dates limites à valider",
  },
  {
    name: "MarocAnnonces",
    url: "https://www.marocannonces.com/",
    status: "Accès et réutilisation à valider",
  },
  {
    name: "MonCallCenter",
    url: "https://www.moncallcenter.ma/",
    status: "Accès et réutilisation à valider",
  },
  {
    name: "Stagiaires.ma",
    url: "https://www.stagiaires.ma/",
    status: "Accès et réutilisation à valider",
  },
  {
    name: "ReKrute",
    url: "https://www.rekrute.com/",
    status: "Accord de diffusion nécessaire avant activation",
  },
  {
    name: "Emploi.ma",
    url: "https://www.emploi.ma/",
    status: "Accord de diffusion nécessaire avant activation",
  },
];
