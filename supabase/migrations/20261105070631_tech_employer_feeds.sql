-- Owner requested more tech coverage within the existing public metadata/link scope.
-- Operator migration approves only these new audited sources; collectors cannot approve.
alter table public.sources drop constraint sources_provider_check;
alter table public.sources add constraint sources_provider_check
  check (provider in ('smartrecruiters','greenhouse','lever','wadifa','html','workable'));
insert into public.sources(id,name,company,provider,website,publication_status,permission_note) values
('scalian','Scalian','Scalian','smartrecruiters','https://careers.smartrecruiters.com/Scalian','approved','Owner-requested expansion of the public metadata/link catalog on 2026-11-05. Original ads and applications remain on employer sites. Public API access is technical evidence; no separate licence to redistribute full descriptions established.'),
('theodo','Theodo','Theodo','lever','https://jobs.lever.co/theodo','approved','Owner-requested expansion of the public metadata/link catalog on 2026-11-05. Original ads and applications remain on employer sites. Public API access is technical evidence; no separate licence to redistribute full descriptions established.'),
('alter-solutions','Alter Solutions','Alter Solutions','smartrecruiters','https://careers.smartrecruiters.com/AlterSolutions','approved','Owner-requested expansion of the public metadata/link catalog on 2026-11-05. Original ads and applications remain on employer sites. Public API access is technical evidence; no separate licence to redistribute full descriptions established.'),
('mindera','Mindera','Mindera','workable','https://apply.workable.com/minderacraft/','approved','Owner-requested expansion of the public metadata/link catalog on 2026-11-05. Original ads and applications remain on employer sites. Public API access is technical evidence; no separate licence to redistribute full descriptions established.'),
('infomineo','Infomineo','Infomineo','workable','https://apply.workable.com/infomineo/','approved','Owner-requested expansion of the public metadata/link catalog on 2026-11-05. Original ads and applications remain on employer sites. Public API access is technical evidence; no separate licence to redistribute full descriptions established.')
on conflict(id) do nothing; -- Preserve existing disabled, pending or blocked operator decisions.
insert into public.virtus_migrations(name) values('20261105070631_tech_employer_feeds') on conflict do nothing;
