-- Additive read-only search surface. Existing catalog/matching functions remain available.
-- Batch source aggregation once per duplicate group instead of scanning all visible rows per job.
create view public.catalog_search_jobs with (security_invoker=true) as
with visible as materialized (
  select l.id,l.group_key,l.source_id,l.external_id,l.company,l.title,''::text as description,
    l.locations,l.city_keys,l.country,l.workplace,l.contract,l.employment,l.salary,l.url,
    l.published_at,l.first_seen_at,l.last_seen_at,l.active,l.missing_count,l.kind,l.deadline,
    l.positions,l.official_notice_url,l.attribution_url,l.tech,s.name as source_name
  from public.listings l join public.sources s on s.id=l.source_id
  where l.active and s.enabled and s.publication_status<>'blocked'
    and (l.last_seen_at>now()-interval '72 hours' or (l.source_id='himalayas' and s.last_success_at>now()-interval '72 hours'))
    and (l.expires_at is null or l.expires_at>now()) and public.competition_open(l.deadline)
), representatives as (
  select distinct on(group_key) * from visible order by group_key,last_seen_at desc,id
), memberships as (
  select group_key,jsonb_agg(jsonb_build_object('id',source_id,'name',source_name,'url',url) order by source_name) as sources
  from visible group by group_key
)
select r.id,r.group_key,r.source_id,r.external_id,r.company,r.title,r.description,r.locations,r.city_keys,
  r.country,r.workplace,r.contract,r.employment,r.salary,r.url,r.published_at,r.first_seen_at,r.last_seen_at,
  r.active,r.missing_count,m.sources,r.kind,r.deadline,r.positions,r.official_notice_url,r.attribution_url,r.tech
from representatives r join memberships m using(group_key);
revoke all on public.catalog_search_jobs from public;
grant select on public.catalog_search_jobs to anon,authenticated;

-- Mirrors JavaScript fold(): NFD accents, lowercase, collapsed whitespace.
create function public.catalog_fold(value text) returns text language sql immutable parallel safe
set search_path=pg_catalog as $$
select trim(regexp_replace(regexp_replace(lower(normalize(coalesce(value,''),NFD)),U&'[\0300-\036f]','','g'),'\s+',' ','g'));
$$;
revoke all on function public.catalog_fold(text) from public;
grant execute on function public.catalog_fold(text) to anon,authenticated;

create function public.search_tech_catalog(
  p_query text default '',p_city text default '',p_contract text default '',p_workplace text default '',
  p_source text default '',p_days integer default 0,p_page integer default 1,p_sort text default 'recent',
  p_kind text default '',p_family text default '',p_technology text default '',p_seniority text default '',
  p_language text default '',p_pfe boolean default false,p_export_only boolean default false
) returns jsonb language sql stable security invoker set search_path=pg_catalog,public as $$
with terms as (
  select term from regexp_split_to_table(public.catalog_fold(left(coalesce(p_query,''),120)),' ') term where term<>''
), all_jobs as materialized (
  select j.*,row_number() over(order by j.group_key) as ordinal
  from public.catalog_search_jobs j
  where j.kind='job' and jsonb_array_length(coalesce(j.tech->'families','[]'::jsonb))>0
    and (not p_export_only or j.source_id<>'himalayas')
), matching as materialized (
  select j.*,
    (p_city='' or p_city=any(j.city_keys)) as city_match,
    (p_source='' or j.sources @> jsonb_build_array(jsonb_build_object('id',p_source))) as source_match,
    (select coalesce(sum((case when strpos(public.catalog_fold(j.title),t.term)>0 then 3 else 0 end)+
      (case when strpos(public.catalog_fold(j.company),t.term)>0 then 2 else 0 end)),0) from terms t) as relevance
  from all_jobs j
  where (p_kind='' or j.kind=p_kind)
    and (p_family='' or coalesce(j.tech->'families','[]'::jsonb) ?| string_to_array(p_family,','))
    and (p_technology='' or coalesce(j.tech->'technologies','[]'::jsonb) ?| string_to_array(p_technology,','))
    and (p_seniority='' or j.tech->>'seniority'=any(string_to_array(p_seniority,',')))
    and (p_language='' or coalesce(j.tech->'requiredLanguages','[]'::jsonb) ?| string_to_array(p_language,','))
    and (not p_pfe or coalesce((j.tech->>'pfe')::boolean,false))
    and not exists(select 1 from terms t where strpos(public.catalog_fold(j.title||' '||j.company||' '||j.description),t.term)=0)
    and (p_contract='' or j.contract=p_contract) and (p_workplace='' or j.workplace=p_workplace)
    and (p_days<=0 or j.published_at>=now()-make_interval(days=>p_days))
), filtered as materialized (
  select * from matching where city_match and source_match
), page_info as (
  select count(*)::integer as total,least(greatest(1,p_page),greatest(1,ceil(count(*)/12.0)::integer)) as page from filtered
), page_rows as (
  select f.* from filtered f order by case when p_sort='relevance' then relevance else 0 end desc,
    coalesce(published_at,first_seen_at,last_seen_at) desc,id collate "C"
  limit 12 offset (select (page-1)*12 from page_info)
), city_options as (
  select regexp_replace(regexp_replace(public.catalog_fold(loc.name),'[^a-z0-9\u0600-\u06ff]+','-','g'),'(^-|-$)','','g') as key,
    loc.name,count(*)::integer as count,min(j.ordinal*10000+loc.ord) as first_ordinal
  from matching j cross join lateral unnest(j.locations) with ordinality loc(name,ord)
  where j.source_match and regexp_replace(regexp_replace(public.catalog_fold(loc.name),'[^a-z0-9\u0600-\u06ff]+','-','g'),'(^-|-$)','','g')=any(j.city_keys)
  group by key,loc.name
), source_counts as (
  select member->>'id' as id,count(distinct j.group_key)::integer as count
  from matching j cross join lateral jsonb_array_elements(j.sources) member where j.city_match group by member->>'id'
)
select jsonb_build_object(
  'jobs',coalesce((select jsonb_agg(to_jsonb(p)-'ordinal'-'city_match'-'source_match'-'relevance' order by
    case when p_sort='relevance' then relevance else 0 end desc,coalesce(published_at,first_seen_at,last_seen_at) desc,id collate "C") from page_rows p),'[]'::jsonb),
  'total',(select total from page_info),'page',(select page from page_info),'pageSize',12,
  'companies',(select count(distinct company) from filtered),
  'cities',coalesce((select jsonb_agg(jsonb_build_object('key',key,'name',name,'count',count) order by count desc,first_ordinal) from city_options),'[]'::jsonb),
  'sources',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'website',s.website,'provider',s.provider,
    'publication_status',s.publication_status,'permission_note',s.permission_note,'count',coalesce(c.count,0),'checked_at',s.last_success_at) order by s.name)
    from public.sources s left join source_counts c on c.id=s.id
    where s.enabled and s.publication_status<>'blocked' and (not p_export_only or s.id<>'himalayas')),'[]'::jsonb),
  'checked_at',coalesce((select min(last_seen_at) from all_jobs),now())
);
$$;
revoke all on function public.search_tech_catalog(text,text,text,text,text,integer,integer,text,text,text,text,text,text,boolean,boolean) from public;
grant execute on function public.search_tech_catalog(text,text,text,text,text,integer,integer,text,text,text,text,text,text,boolean,boolean) to anon,authenticated;

create function public.get_catalog_source_summary() returns jsonb language sql stable security invoker
set search_path=pg_catalog,public as $$
with jobs as materialized (select group_key,company,sources from public.catalog_search_jobs),
source_counts as (
  select member->>'id' as id,count(distinct j.group_key)::integer as count
  from jobs j cross join lateral jsonb_array_elements(j.sources) member group by member->>'id'
)
select jsonb_build_object('jobs','[]'::jsonb,'cities','[]'::jsonb,'page',1,'pageSize',12,
  'total',(select count(*) from jobs),'companies',(select count(distinct company) from jobs),
  'sources',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'website',s.website,'provider',s.provider,
    'publication_status',s.publication_status,'permission_note',s.permission_note,'count',coalesce(c.count,0),'checked_at',s.last_success_at) order by s.name)
    from public.sources s left join source_counts c on c.id=s.id where s.enabled and s.publication_status<>'blocked'),'[]'::jsonb),
  'checked_at',(select min(last_success_at) from public.sources where enabled and publication_status<>'blocked'));
$$;
revoke all on function public.get_catalog_source_summary() from public;
grant execute on function public.get_catalog_source_summary() to anon,authenticated;
insert into public.virtus_migrations(name) values('20261125172615_paginated_catalog_search') on conflict do nothing;
