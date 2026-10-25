-- Owner explicitly chose one public metadata/link catalog on 2026-10-25.
-- Full imported advertisement text remains collector/operator-only.
revoke all on function public.search_catalog_review(text,text,text,text,text,text,integer,integer,text,text) from public,anon,authenticated;
revoke all on function public.get_catalog_job_review(text,text) from public,anon,authenticated;
revoke select on public.listings from anon,authenticated;
grant select(id,group_key,source_id,external_id,company,title,locations,city_keys,country,workplace,contract,employment,salary,url,
  published_at,first_seen_at,last_seen_at,active,missing_count,kind,deadline,positions,official_notice_url,attribution_url)
  on public.listings to anon,authenticated;
create or replace view public.catalog_jobs with (security_invoker = true) as
with visible as (
  select l.id,l.group_key,l.source_id,l.external_id,l.company,l.title,''::text as description,l.locations,l.city_keys,l.country,
    l.workplace,l.contract,l.employment,l.salary,l.url,l.published_at,l.first_seen_at,l.last_seen_at,l.active,l.missing_count,
    l.kind,l.deadline,l.positions,l.official_notice_url,l.attribution_url
  from public.listings l join public.sources s on s.id=l.source_id
  where l.active and s.enabled and s.publication_status<>'blocked'
    and l.last_seen_at>now()-interval '72 hours' and public.competition_open(l.deadline)
),representatives as (
  select distinct on(group_key) * from visible order by group_key,last_seen_at desc,id
)
select r.id,r.group_key,r.source_id,r.external_id,r.company,r.title,r.description,r.locations,r.city_keys,r.country,
  r.workplace,r.contract,r.employment,r.salary,r.url,r.published_at,r.first_seen_at,r.last_seen_at,r.active,r.missing_count,
  (select jsonb_agg(jsonb_build_object('id',v.source_id,'name',s.name,'url',v.url) order by s.name)
    from visible v join public.sources s on s.id=v.source_id where v.group_key=r.group_key) as sources,
  r.kind,r.deadline,r.positions,r.official_notice_url,r.attribution_url
from representatives r;
insert into public.virtus_migrations(name) values('202610250004_public_metadata') on conflict do nothing;
