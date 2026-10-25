import type { Source } from "./types";

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
