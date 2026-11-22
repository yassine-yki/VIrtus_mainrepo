-- Himalayas alone is a non-authoritative discovery feed. Missing IDs never mean closure.
alter table public.sources drop constraint sources_provider_check;
alter table public.sources add constraint sources_provider_check check(provider in ('smartrecruiters','greenhouse','lever','wadifa','html','workable','ashby','teamtailor','himalayas'));
alter table public.listings add column expires_at timestamptz;
alter table public.listings add constraint himalayas_explicit_expiry check(source_id<>'himalayas' or (expires_at is not null and published_at is null and attribution_url is not null));
grant select(expires_at) on public.listings to anon,authenticated;
alter table public.sync_runs add column reported_total integer, add column observed_total integer, add column partial boolean not null default false;
insert into public.sources(id,name,company,provider,website,enabled,publication_status,permission_note)
values('himalayas','Himalayas','Himalayas','himalayas','https://himalayas.app',true,'approved','Owner-approved 95% discovery coverage. API terms clause 113 checked 2026-11-21: attribution and supplied applicationLink required; no downstream feed/JobPosting redistribution. Explicit Morocco countries and source expiry only. https://himalayas.app/terms') on conflict(id) do nothing;

drop policy listings_public_read on public.listings;
create policy listings_public_read on public.listings for select to anon,authenticated using(
 active and (expires_at is null or expires_at>now()) and public.competition_open(deadline) and exists(
 select 1 from public.sources s where s.id=source_id and s.enabled and s.publication_status='approved'
 and (listings.last_seen_at>now()-interval '72 hours' or (listings.source_id='himalayas' and s.last_success_at>now()-interval '72 hours'))));
create or replace view public.catalog_jobs with (security_invoker = true) as
with visible as (
  select l.id,l.group_key,l.source_id,l.external_id,l.company,l.title,''::text as description,l.locations,l.city_keys,l.country,
    l.workplace,l.contract,l.employment,l.salary,l.url,l.published_at,l.first_seen_at,l.last_seen_at,l.active,l.missing_count,
    l.kind,l.deadline,l.positions,l.official_notice_url,l.attribution_url
  from public.listings l join public.sources s on s.id=l.source_id
  where l.active and s.enabled and s.publication_status<>'blocked'
    and (l.last_seen_at>now()-interval '72 hours' or (l.source_id='himalayas' and s.last_success_at>now()-interval '72 hours')) and (l.expires_at is null or l.expires_at>now()) and public.competition_open(l.deadline)
),representatives as (
  select distinct on(group_key) * from visible order by group_key,last_seen_at desc,id
)
select r.id,r.group_key,r.source_id,r.external_id,r.company,r.title,r.description,r.locations,r.city_keys,r.country,
  r.workplace,r.contract,r.employment,r.salary,r.url,r.published_at,r.first_seen_at,r.last_seen_at,r.active,r.missing_count,
  (select jsonb_agg(jsonb_build_object('id',v.source_id,'name',s.name,'url',v.url) order by s.name)
    from visible v join public.sources s on s.id=v.source_id where v.group_key=r.group_key) as sources,
  r.kind,r.deadline,r.positions,r.official_notice_url,r.attribution_url
from representatives r;


alter function public.commit_source_sync(jsonb,jsonb,timestamptz) rename to commit_source_sync_strict;
revoke all on function public.commit_source_sync_strict(jsonb,jsonb,timestamptz) from public,anon,authenticated,service_role;
create function public.commit_source_sync(p_source jsonb,p_jobs jsonb,p_started_at timestamptz) returns integer
language plpgsql security definer set search_path=pg_catalog,public as $$
declare reported integer; observed integer; imported integer; previous integer; last_success timestamptz; permitted boolean;
begin
 if p_source->>'id' is distinct from 'himalayas' then return public.commit_source_sync_strict(p_source,p_jobs,p_started_at); end if;
 if p_source->>'provider' is distinct from 'himalayas' or jsonb_typeof(p_jobs) is distinct from 'array' then raise exception 'Invalid partial source'; end if;
 reported:=(p_source->'collectionEvidence'->>'reported')::integer;observed:=(p_source->'collectionEvidence'->>'observed')::integer;
 if reported is null or observed is null or reported<=0 or reported>5000 or observed>reported or observed::numeric/reported<0.95 or jsonb_array_length(p_jobs)>observed then raise exception 'Himalayas coverage below 95 percent'; end if;
 if exists(select 1 from jsonb_array_elements(p_jobs) j where j->>'source_id' is distinct from 'himalayas' or j->>'expires_at' is null or (j->>'expires_at')::timestamptz<=now() or j->>'published_at' is not null or j->>'attribution_url' is null or j->>'url' not like 'https://himalayas.app/companies/%/jobs/%' or j->>'description' is distinct from '') then raise exception 'Invalid Himalayas facts or expiry'; end if;
 perform pg_advisory_xact_lock(hashtext('himalayas'));
 if not public.register_source(p_source) then raise exception 'Source disabled or blocked'; end if;
 select enabled and publication_status<>'blocked',last_success_at into permitted,last_success from public.sources where id='himalayas' for update;
 if not permitted then raise exception 'Source disabled or blocked';end if;
 if last_success is not null and p_started_at<=last_success then raise exception 'Outdated sync rejected';end if;
 select count(*) into previous from public.listings where source_id='himalayas' and active and expires_at>now();
 if previous>=10 and jsonb_array_length(p_jobs)<previous*0.5 then raise exception 'Suspicious source drop; previous listings preserved';end if;
 insert into public.listings(id,group_key,source_id,external_id,company,title,description,locations,city_keys,country,workplace,contract,employment,salary,url,published_at,last_seen_at,active,missing_count,kind,attribution_url,tech,expires_at)
 select x.id,x.group_key,x.source_id,x.external_id,x.company,x.title,'',x.locations,x.city_keys,x.country,x.workplace,x.contract,x.employment,x.salary,x.url,null,now(),true,0,'job',x.attribution_url,x.tech,x.expires_at
 from jsonb_to_recordset(p_jobs) as x(id text,group_key text,source_id text,external_id text,company text,title text,locations text[],city_keys text[],country text,workplace text,contract text,employment text,salary text,url text,attribution_url text,tech jsonb,expires_at timestamptz)
 on conflict(id) do update set group_key=excluded.group_key,company=excluded.company,title=excluded.title,locations=excluded.locations,city_keys=excluded.city_keys,workplace=excluded.workplace,contract=excluded.contract,employment=excluded.employment,salary=excluded.salary,url=excluded.url,last_seen_at=now(),active=true,missing_count=0,attribution_url=excluded.attribution_url,tech=excluded.tech,expires_at=excluded.expires_at;
 get diagnostics imported=row_count;
 -- Deliberately no update/deactivation of absent jobs, even at 100% advertised coverage.
 update public.sources set last_success_at=now() where id='himalayas';
 insert into public.sync_runs(source_id,status,count,started_at,reported_total,observed_total,partial) values('himalayas','success',imported,p_started_at,reported,observed,observed<reported);
 return imported;
end $$;
revoke all on function public.commit_source_sync(jsonb,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.commit_source_sync(jsonb,jsonb,timestamptz) to service_role;
create function public.search_catalog_export(
  p_query text default '',p_city text default '',p_contract text default '',p_workplace text default '',
  p_source text default '',p_days integer default 0,p_page integer default 1,p_sort text default 'recent',p_kind text default ''
) returns jsonb language sql stable security invoker set search_path = public,pg_temp as $$
with all_jobs as (select * from public.catalog_jobs where source_id<>'himalayas'), filtered as (
  select *,ts_rank(to_tsvector('simple',public.search_text(title||' '||company||' '||description)),plainto_tsquery('simple',public.search_text(left(p_query,120)))) as relevance
  from all_jobs
  where (p_query='' or to_tsvector('simple',public.search_text(title||' '||company||' '||description)) @@ plainto_tsquery('simple',public.search_text(left(p_query,120))))
    and (p_city='' or p_city=any(city_keys)) and (p_contract='' or contract=p_contract)
    and (p_workplace='' or workplace=p_workplace) and (p_kind='' or kind=p_kind)
    and (p_source='' or sources @> jsonb_build_array(jsonb_build_object('id',p_source)))
    and (p_days not in (1,7,30) or published_at >= now()-make_interval(days=>p_days))
), counts as (select count(*)::integer as total from filtered),
page_info as (select total,least(greatest(1,p_page),greatest(1,ceil(total/12.0)::integer)) as page from counts),
page_rows as (
  select f.* from filtered f order by case when p_sort='relevance' then relevance else 0 end desc,
    coalesce(published_at,first_seen_at) desc,id limit 12 offset (select (page-1)*12 from page_info)
),city_options as (
  select ck.key,min(loc.name) as name,count(distinct j.group_key)::integer as count from all_jobs j
  cross join lateral unnest(j.city_keys) with ordinality ck(key,ord)
  cross join lateral unnest(j.locations) with ordinality loc(name,ord)
  where ck.ord=loc.ord group by ck.key
)
select jsonb_build_object(
  'jobs',coalesce((select jsonb_agg(to_jsonb(p)-'relevance'-'missing_count') from page_rows p),'[]'::jsonb),
  'total',(select total from page_info),'page',(select page from page_info),'pageSize',12,
  'companies',(select count(distinct company) from all_jobs),
  'cities',coalesce((select jsonb_agg(to_jsonb(c) order by c.count desc,c.name) from city_options c),'[]'::jsonb),
  'sources',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'website',s.website,'provider',s.provider,
    'publication_status',s.publication_status,'permission_note',s.permission_note,
    'count',(select count(*) from all_jobs j where j.sources @> jsonb_build_array(jsonb_build_object('id',s.id))),
    'checked_at',s.last_success_at) order by s.name) from public.sources s where s.enabled and s.publication_status <> 'blocked' and s.id<>'himalayas'),'[]'::jsonb),
  'checked_at',(select min(s.last_success_at) from public.sources s where s.enabled and s.publication_status <> 'blocked' and s.id<>'himalayas')
);
$$;

revoke all on function public.search_catalog_export(text,text,text,text,text,integer,integer,text,text) from public;
grant execute on function public.search_catalog_export(text,text,text,text,text,integer,integer,text,text) to anon,authenticated,service_role;
insert into public.virtus_migrations(name) values('20261121230612_himalayas_partial_collection') on conflict do nothing;
