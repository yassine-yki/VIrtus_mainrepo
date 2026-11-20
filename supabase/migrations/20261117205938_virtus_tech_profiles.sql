-- Additive metadata: descriptions stay operator-only. Successful collection alone refreshes freshness.
alter table public.sources drop constraint sources_provider_check;
alter table public.sources add constraint sources_provider_check check (provider in ('smartrecruiters','greenhouse','lever','wadifa','html','workable','ashby','teamtailor'));
-- Only insert newly validated feeds; never override an existing operator suspension.
insert into public.sources(id,name,company,provider,website,publication_status,permission_note)
values ('inwi','inwi','inwi','teamtailor','https://jobs.inwi.ma/jobs','approved','Owner-approved job facts and original links. Public RSS and sitemap completeness validated 2026-11-17; no full-ad licence asserted.'),
 ('leyton-morocco','Leyton Maroc','Leyton','teamtailor','https://leytonglobal-morocco.teamtailor.com/jobs','approved','Owner-approved job facts and original links. Official careers link, public RSS and sitemap completeness validated 2026-11-17; no full-ad licence asserted.')
on conflict(id) do nothing;
alter table public.listings add column tech jsonb;
grant select(tech) on public.listings to anon,authenticated;
alter function public.commit_source_sync(jsonb,jsonb,timestamptz) rename to commit_source_sync_without_tech;
revoke all on function public.commit_source_sync_without_tech(jsonb,jsonb,timestamptz) from public,anon,authenticated,service_role;
create function public.commit_source_sync(p_source jsonb,p_jobs jsonb,p_started_at timestamptz)
returns integer language plpgsql security definer set search_path=pg_catalog,public as $$
declare imported integer;
begin
  imported := public.commit_source_sync_without_tech(p_source,p_jobs,p_started_at);
  update public.listings l set tech=j.value->'tech'
    from jsonb_array_elements(p_jobs) j where l.id=j.value->>'id' and l.source_id=p_source->>'id';
  return imported;
end $$;
revoke all on function public.commit_source_sync(jsonb,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.commit_source_sync(jsonb,jsonb,timestamptz) to service_role;

create view public.catalog_tech_jobs with (security_invoker=true) as
select c.*,l.tech from public.catalog_jobs c join public.listings l on l.id=c.id
where c.kind='job' and jsonb_array_length(coalesce(l.tech->'families','[]'::jsonb))>0;
grant select on public.catalog_tech_jobs to anon,authenticated;
-- One consistent snapshot, no PostgREST row-limit truncation or silent top-K shortlist.
create function public.get_tech_catalog() returns jsonb language sql stable security invoker set search_path=pg_catalog,public as $$
select jsonb_build_object('jobs',coalesce((select jsonb_agg(to_jsonb(j) order by group_key) from public.catalog_tech_jobs j),'[]'::jsonb),
 'sources',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'company',s.company,'provider',s.provider,'identifier','',
 'website',s.website,'enabled',s.enabled,'publicationStatus',s.publication_status,'permissionNote',s.permission_note,'lastSuccessAt',s.last_success_at))
 from public.sources s where s.enabled and s.publication_status<>'blocked'),'[]'::jsonb));
$$;
revoke all on function public.get_tech_catalog() from public;
grant execute on function public.get_tech_catalog() to anon,authenticated;

create table public.candidate_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null check (jsonb_typeof(profile)='object' and profile->>'version'='1' and octet_length(profile::text)<=60000),
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.candidate_profiles enable row level security;
revoke all on public.candidate_profiles from public,anon,authenticated;
grant select,insert,update,delete on public.candidate_profiles to authenticated;
create policy own_profile on public.candidate_profiles for all to authenticated
 using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create function virtus_private.profile_revision() returns trigger language plpgsql set search_path=pg_catalog as $$
begin new.revision:=case when TG_OP='UPDATE' then old.revision+1 else 1 end; new.updated_at:=now(); return new; end $$;
create trigger profile_revision before insert or update on public.candidate_profiles for each row execute function virtus_private.profile_revision();
revoke all on function virtus_private.profile_revision() from public;

-- No CV text in accounting. Operator-only configuration, fail closed until priced.
create table virtus_private.cv_budget_config (
 id boolean primary key default true check(id), enabled boolean not null default false,
 reservation_usd numeric(12,6) check(reservation_usd>0 and reservation_usd<=10),
 config_version text not null default '', monthly_cap numeric(12,6) not null default 10 check(monthly_cap>0 and monthly_cap<=10)
);
insert into virtus_private.cv_budget_config(id) values(true);
create table virtus_private.cv_usage (
 id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), reserved_usd numeric(12,6) not null check(reserved_usd>0)
);
create index cv_usage_user_day on virtus_private.cv_usage(user_id,created_at);
create index cv_usage_month on virtus_private.cv_usage(created_at);
alter table virtus_private.cv_budget_config enable row level security;
alter table virtus_private.cv_usage enable row level security;
revoke all on virtus_private.cv_usage,virtus_private.cv_budget_config from public,anon,authenticated;
-- This narrowly privileged routine cannot refund, set prices, select another user or bypass a cap.
create function public.reserve_cv_extraction(p_config_version text,p_max_cost numeric) returns uuid
language plpgsql security definer set search_path=pg_catalog as $$
declare uid uuid:=auth.uid(); cfg virtus_private.cv_budget_config%rowtype; reservation uuid; month_start timestamptz:=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC'; day_start timestamptz:=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select * into cfg from virtus_private.cv_budget_config where id=true for update;
 if not cfg.enabled or cfg.reservation_usd is null or p_config_version is distinct from cfg.config_version
   or p_max_cost is null or p_max_cost<=0 or p_max_cost>cfg.reservation_usd then raise exception 'Extraction not configured'; end if;
 if (select count(*) from virtus_private.cv_usage where user_id=uid and created_at>=day_start)>=5 then raise exception 'Daily extraction limit'; end if;
 if coalesce((select sum(reserved_usd) from virtus_private.cv_usage where created_at>=month_start),0)+cfg.reservation_usd>cfg.monthly_cap then raise exception 'Monthly extraction budget exhausted'; end if;
 insert into virtus_private.cv_usage(user_id,reserved_usd) values(uid,cfg.reservation_usd) returning id into reservation;
 return reservation;
end $$;
revoke all on function public.reserve_cv_extraction(text,numeric) from public,anon;
grant execute on function public.reserve_cv_extraction(text,numeric) to authenticated;
insert into public.virtus_migrations(name) values('20261117205938_virtus_tech_profiles') on conflict do nothing;
