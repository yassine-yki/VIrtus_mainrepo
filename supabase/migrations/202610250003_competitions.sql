-- Additive catalog fields; existing job records and named RPC arguments remain valid.
alter table public.sources drop constraint sources_provider_check;
alter table public.sources add constraint sources_provider_check check (provider in ('smartrecruiters','greenhouse','lever','wadifa','html'));
alter table public.listings
  add column kind text not null default 'job' check (kind in ('job','competition')),
  add column deadline date,
  add column positions integer check (positions > 0),
  add column official_notice_url text check (official_notice_url like 'https://%'),
  add column attribution_url text check (attribution_url like 'https://%');
alter table public.listings add constraint competition_metadata check (
  kind <> 'competition' or (deadline is not null and positions is not null and official_notice_url is not null and attribution_url is not null)
);
create index listings_deadline_idx on public.listings(deadline) where kind = 'competition';
create or replace function public.competition_open(p_deadline date, p_now timestamptz default now())
returns boolean language sql stable parallel safe set search_path = pg_catalog as $$
  select p_deadline is null or p_deadline >= (p_now at time zone 'Africa/Casablanca')::date;
$$;
revoke all on function public.competition_open(date,timestamptz) from public;
grant execute on function public.competition_open(date,timestamptz) to anon,authenticated,service_role;
drop policy listings_public_read on public.listings;
create policy listings_public_read on public.listings for select to anon,authenticated
using (active and last_seen_at > now() - interval '72 hours' and public.competition_open(deadline) and exists (
  select 1 from public.sources s where s.id = source_id and s.enabled and s.publication_status = 'approved'
));

-- Append new view columns after its existing sources column to preserve dependencies.
create or replace view public.catalog_jobs with (security_invoker = true) as
with visible as (
  select l.* from public.listings l join public.sources s on s.id = l.source_id
  where l.active and s.enabled and s.publication_status <> 'blocked'
    and l.last_seen_at > now() - interval '72 hours' and public.competition_open(l.deadline)
), representatives as (
  select distinct on (group_key) * from visible order by group_key,last_seen_at desc,id
)
select r.id,r.group_key,r.source_id,r.external_id,r.company,r.title,r.description,r.locations,r.city_keys,r.country,
  r.workplace,r.contract,r.employment,r.salary,r.url,r.published_at,r.first_seen_at,r.last_seen_at,r.active,r.missing_count,
  (select jsonb_agg(jsonb_build_object('id',v.source_id,'name',s.name,'url',v.url) order by s.name)
    from visible v join public.sources s on s.id=v.source_id where v.group_key=r.group_key) as sources,
  r.kind,r.deadline,r.positions,r.official_notice_url,r.attribution_url
from representatives r;

-- Replace the defaulted signatures rather than adding ambiguous overloads.
drop function public.search_catalog_review(text,text,text,text,text,text,integer,integer,text);
drop function public.search_catalog(text,text,text,text,text,integer,integer,text);
create function public.search_catalog(
  p_query text default '',p_city text default '',p_contract text default '',p_workplace text default '',
  p_source text default '',p_days integer default 0,p_page integer default 1,p_sort text default 'recent',p_kind text default ''
) returns jsonb language sql stable security invoker set search_path = public,pg_temp as $$
with all_jobs as (select * from public.catalog_jobs), filtered as (
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
    'checked_at',s.last_success_at) order by s.name) from public.sources s where s.enabled and s.publication_status <> 'blocked'),'[]'::jsonb),
  'checked_at',(select min(s.last_success_at) from public.sources s where s.enabled and s.publication_status <> 'blocked')
);
$$;
create function public.search_catalog_review(
  p_token text,p_query text default '',p_city text default '',p_contract text default '',p_workplace text default '',
  p_source text default '',p_days integer default 0,p_page integer default 1,p_sort text default 'recent',p_kind text default ''
) returns jsonb language plpgsql stable security definer set search_path = public,pg_temp as $$
begin
  if length(p_token)<48 or not exists(select 1 from virtus_private.review_access where token_hash=md5(p_token)) then
    raise exception 'Review access denied' using errcode='42501';
  end if;
  return public.search_catalog(p_query,p_city,p_contract,p_workplace,p_source,p_days,p_page,p_sort,p_kind);
end;
$$;
revoke all on function public.search_catalog(text,text,text,text,text,integer,integer,text,text) from public;
revoke all on function public.search_catalog_review(text,text,text,text,text,text,integer,integer,text,text) from public;
grant execute on function public.search_catalog(text,text,text,text,text,integer,integer,text,text) to anon,authenticated,service_role;
grant execute on function public.search_catalog_review(text,text,text,text,text,text,integer,integer,text,text) to anon,authenticated;

create function public.register_source(p_source jsonb) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare permitted boolean;
begin
  perform pg_advisory_xact_lock(hashtext(p_source->>'id'));
  insert into public.sources(id,name,company,provider,website,enabled,permission_note)
  values(p_source->>'id',p_source->>'name',p_source->>'company',p_source->>'provider',p_source->>'website',
    coalesce((p_source->>'enabled')::boolean,false),p_source->>'permissionNote')
  on conflict(id) do nothing;
  select enabled and publication_status<>'blocked' into permitted from public.sources where id=p_source->>'id';
  return permitted;
end;
$$;
revoke all on function public.register_source(jsonb) from public,anon,authenticated;
grant execute on function public.register_source(jsonb) to service_role;

create or replace function public.commit_source_sync(p_source jsonb,p_jobs jsonb,p_started_at timestamptz)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare source_key text:=p_source->>'id'; imported integer; previous_count integer; previous_success timestamptz; permitted boolean;
begin
  perform pg_advisory_xact_lock(hashtext(source_key));
  if jsonb_typeof(p_jobs)<>'array' then raise exception 'Jobs must be an array'; end if;
  if exists(select 1 from jsonb_array_elements(p_jobs) j where j->>'source_id' is distinct from source_key) then
    raise exception 'Cross-source records rejected';
  end if;
  if not public.register_source(p_source) then raise exception 'Source disabled or blocked'; end if;
  select last_success_at,enabled and publication_status<>'blocked' into previous_success,permitted
    from public.sources where id=source_key for update;
  if not permitted then raise exception 'Source disabled or blocked'; end if;
  if previous_success is not null and p_started_at<=previous_success then raise exception 'Outdated sync rejected'; end if;
  select count(*) into previous_count from public.listings where source_id=source_key and active;
  if previous_count>=10 and jsonb_array_length(p_jobs)<previous_count*0.5 then
    raise exception 'Suspicious source drop; manual investigation required';
  end if;
  update public.sources set name=p_source->>'name',company=p_source->>'company',website=p_source->>'website' where id=source_key;
  insert into public.listings(id,group_key,source_id,external_id,company,title,description,locations,city_keys,country,
    workplace,contract,employment,salary,url,published_at,last_seen_at,active,missing_count,kind,deadline,positions,official_notice_url,attribution_url)
  select x.id,x.group_key,x.source_id,x.external_id,x.company,x.title,x.description,x.locations,x.city_keys,x.country,
    x.workplace,x.contract,x.employment,x.salary,x.url,x.published_at,now(),true,0,coalesce(x.kind,'job'),x.deadline,x.positions,x.official_notice_url,x.attribution_url
  from jsonb_to_recordset(p_jobs) as x(id text,group_key text,source_id text,external_id text,company text,title text,description text,
    locations text[],city_keys text[],country text,workplace text,contract text,employment text,salary text,url text,published_at timestamptz,
    kind text,deadline date,positions integer,official_notice_url text,attribution_url text)
  on conflict(id) do update set group_key=excluded.group_key,company=excluded.company,title=excluded.title,description=excluded.description,
    locations=excluded.locations,city_keys=excluded.city_keys,workplace=excluded.workplace,contract=excluded.contract,employment=excluded.employment,
    salary=excluded.salary,url=excluded.url,published_at=excluded.published_at,last_seen_at=now(),active=true,missing_count=0,
    kind=excluded.kind,deadline=excluded.deadline,positions=excluded.positions,official_notice_url=excluded.official_notice_url,attribution_url=excluded.attribution_url;
  get diagnostics imported=row_count;
  update public.listings set missing_count=missing_count+1,
    active=case when missing_count+1>=2 and last_seen_at<now()-interval '24 hours' then false else active end
  where source_id=source_key and id not in(select j->>'id' from jsonb_array_elements(p_jobs) j);
  update public.sources set last_success_at=now() where id=source_key;
  insert into public.sync_runs(source_id,status,count,started_at) values(source_key,'success',imported,p_started_at);
  return imported;
end;
$$;
insert into public.virtus_migrations(name) values('202610250003_competitions') on conflict do nothing;
