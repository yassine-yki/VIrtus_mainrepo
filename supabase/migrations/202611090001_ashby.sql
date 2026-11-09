-- Technical provider support only. No source is enabled or published here.
alter table public.sources drop constraint sources_provider_check;
alter table public.sources add constraint sources_provider_check
  check (provider in ('smartrecruiters','greenhouse','lever','wadifa','html','workable','ashby'));
insert into public.virtus_migrations(name) values('202611090001_ashby') on conflict do nothing;
