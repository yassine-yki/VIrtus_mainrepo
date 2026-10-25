-- Public reads are restricted to individually approved sources. Collector writes
-- are atomic per source and only available to the server's service_role.
create table if not exists public.virtus_migrations(name text primary key,applied_at timestamptz not null default now());
alter table public.virtus_migrations enable row level security;
revoke all on public.virtus_migrations from public,anon,authenticated;
create function public.search_text(value text) returns text
language sql immutable parallel safe set search_path = pg_catalog as $$
  select translate(lower(value), 'àâäáãåçèéêëìíîïñòóôöõùúûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy');
$$;
create table public.sources (
  id text primary key,
  name text not null,
  company text not null,
  provider text not null check (provider in ('smartrecruiters','greenhouse','lever','html')),
  website text not null check (website like 'https://%'),
  enabled boolean not null default true,
  publication_status text not null default 'pending' check (publication_status in ('pending','approved','blocked')),
  permission_note text not null default '',
  last_success_at timestamptz
);

create table public.listings (
  id text primary key check (id ~ '^[a-f0-9]{32}$'),
  group_key text not null check (group_key ~ '^[a-f0-9]{32}$'),
  source_id text not null references public.sources(id),
  external_id text not null,
  company text not null,
  title text not null check (length(title) between 1 and 300),
  description text not null default '',
  locations text[] not null,
  city_keys text[] not null,
  country text not null default 'MA' check (country = 'MA'),
  workplace text not null check (workplace in ('onsite','hybrid','remote','unknown')),
  contract text not null,
  employment text,
  salary text,
  url text not null check (url like 'https://%'),
  published_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null,
  active boolean not null default true,
  missing_count integer not null default 0,
  unique(source_id, external_id)
);

create table public.sync_runs (
  id bigint generated always as identity primary key,
  source_id text not null references public.sources(id),
  status text not null check (status in ('success','failed','skipped')),
  count integer not null default 0,
  started_at timestamptz not null,
  finished_at timestamptz not null default now(),
  error text
);
create index listings_group_idx on public.listings(group_key);
create index listings_source_idx on public.listings(source_id);
create index listings_city_idx on public.listings using gin(city_keys);
create index listings_search_idx on public.listings using gin(to_tsvector('simple', public.search_text(title || ' ' || company || ' ' || description)));
create index listings_active_idx on public.listings(last_seen_at desc) where active;
create index sync_runs_source_idx on public.sync_runs(source_id, finished_at desc);

alter table public.sources enable row level security;
alter table public.listings enable row level security;
alter table public.sync_runs enable row level security;
create policy sources_public_read on public.sources for select to anon, authenticated
  using (enabled and publication_status = 'approved');
create policy listings_public_read on public.listings for select to anon, authenticated
  using (active and last_seen_at > now() - interval '72 hours' and exists (
    select 1 from public.sources s where s.id = source_id and s.enabled and s.publication_status = 'approved'
  ));
grant select on public.sources, public.listings to anon, authenticated;
revoke all on public.sync_runs from anon, authenticated;

create view public.catalog_jobs with (security_invoker = true) as
with visible as (
  select l.* from public.listings l join public.sources s on s.id = l.source_id
  where l.active and s.enabled and s.publication_status <> 'blocked' and l.last_seen_at > now() - interval '72 hours'
), representatives as (
  select distinct on (group_key) * from visible order by group_key, last_seen_at desc, id
)
select r.*, (
  select jsonb_agg(jsonb_build_object('id', v.source_id, 'name', s.name, 'url', v.url) order by s.name)
  from visible v join public.sources s on s.id = v.source_id where v.group_key = r.group_key
) as sources
from representatives r;
grant select on public.catalog_jobs to anon, authenticated;

create function public.search_catalog(
  p_query text default '', p_city text default '', p_contract text default '',
  p_workplace text default '', p_source text default '', p_days integer default 0,
  p_page integer default 1, p_sort text default 'recent'
) returns jsonb language sql stable security invoker set search_path = public, pg_temp as $$
with all_jobs as (select * from public.catalog_jobs),
filtered as (
  select *, ts_rank(to_tsvector('simple', public.search_text(title || ' ' || company || ' ' || description)), plainto_tsquery('simple', public.search_text(left(p_query,120)))) as relevance
  from all_jobs
  where (p_query = '' or to_tsvector('simple', public.search_text(title || ' ' || company || ' ' || description)) @@ plainto_tsquery('simple', public.search_text(left(p_query,120))))
    and (p_city = '' or p_city = any(city_keys))
    and (p_contract = '' or contract = p_contract)
    and (p_workplace = '' or workplace = p_workplace)
    and (p_source = '' or sources @> jsonb_build_array(jsonb_build_object('id',p_source)))
    and (p_days not in (1,7,30) or published_at >= now() - make_interval(days => p_days))
), counts as (select count(*)::integer as total from filtered),
page_info as (select total, least(greatest(1,p_page), greatest(1,ceil(total/12.0)::integer)) as page from counts),
page_rows as (
  select f.* from filtered f
  order by case when p_sort = 'relevance' then relevance else 0 end desc,
    coalesce(published_at,first_seen_at) desc, id
  limit 12 offset (select (page-1)*12 from page_info)
), city_options as (
  select ck.key, min(loc.name) as name, count(distinct j.group_key)::integer as count
  from all_jobs j
  cross join lateral unnest(j.city_keys) with ordinality ck(key,ord)
  cross join lateral unnest(j.locations) with ordinality loc(name,ord)
  where ck.ord = loc.ord group by ck.key
)
select jsonb_build_object(
  'jobs', coalesce((select jsonb_agg(to_jsonb(p) - 'relevance' - 'missing_count') from page_rows p),'[]'::jsonb),
  'total', (select total from page_info), 'page', (select page from page_info), 'pageSize',12,
  'companies',(select count(distinct company) from all_jobs),
  'cities',coalesce((select jsonb_agg(to_jsonb(c) order by c.count desc,c.name) from city_options c),'[]'::jsonb),
  'sources',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'count',
    (select count(distinct l.group_key) from public.listings l where l.source_id=s.id and l.active),
    'checked_at',s.last_success_at) order by s.name) from public.sources s),'[]'::jsonb),
  'checked_at',(select min(s.last_success_at) from public.sources s)
);
$$;

create function public.get_catalog_job(p_id text) returns jsonb
language sql stable security invoker set search_path = public, pg_temp as $$
  select to_jsonb(j) - 'missing_count' from public.catalog_jobs j where j.group_key = p_id limit 1;
$$;
revoke all on function public.search_catalog(text,text,text,text,text,integer,integer,text) from public;
revoke all on function public.get_catalog_job(text) from public;
grant execute on function public.search_catalog(text,text,text,text,text,integer,integer,text) to anon,authenticated,service_role;
grant execute on function public.get_catalog_job(text) to anon,authenticated,service_role;

create function public.commit_source_sync(p_source jsonb, p_jobs jsonb, p_started_at timestamptz)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare source_key text := p_source->>'id'; imported integer; previous_count integer; previous_success timestamptz;
begin
  perform pg_advisory_xact_lock(hashtext(source_key));
  if jsonb_typeof(p_jobs) <> 'array' then raise exception 'Jobs must be an array'; end if;
  if exists (select 1 from jsonb_array_elements(p_jobs) j where j->>'source_id' is distinct from source_key) then
    raise exception 'Cross-source records rejected';
  end if;
  select last_success_at into previous_success from public.sources where id = source_key;
  if previous_success is not null and p_started_at <= previous_success then raise exception 'Outdated sync rejected'; end if;
  select count(*) into previous_count from public.listings where source_id=source_key and active;
  -- Treat a sudden empty/large drop as a collection failure, not proof of closure.
  if previous_count >= 10 and jsonb_array_length(p_jobs) < previous_count * 0.5 then
    raise exception 'Suspicious source drop; manual investigation required';
  end if;
  insert into public.sources(id,name,company,provider,website,enabled,permission_note)
  values(source_key,p_source->>'name',p_source->>'company',p_source->>'provider',p_source->>'website',true,p_source->>'permissionNote')
  on conflict(id) do update set name=excluded.name, company=excluded.company, website=excluded.website;
  insert into public.listings(id,group_key,source_id,external_id,company,title,description,locations,city_keys,country,
    workplace,contract,employment,salary,url,published_at,last_seen_at,active,missing_count)
  select x.id,x.group_key,x.source_id,x.external_id,x.company,x.title,x.description,x.locations,x.city_keys,x.country,
    x.workplace,x.contract,x.employment,x.salary,x.url,x.published_at,now(),true,0
  from jsonb_to_recordset(p_jobs) as x(id text,group_key text,source_id text,external_id text,company text,title text,
    description text,locations text[],city_keys text[],country text,workplace text,contract text,employment text,
    salary text,url text,published_at timestamptz)
  on conflict(id) do update set group_key=excluded.group_key, company=excluded.company, title=excluded.title,
    description=excluded.description, locations=excluded.locations, city_keys=excluded.city_keys,
    workplace=excluded.workplace, contract=excluded.contract, employment=excluded.employment,
    salary=excluded.salary,url=excluded.url,published_at=excluded.published_at,last_seen_at=now(),active=true,missing_count=0;
  get diagnostics imported = row_count;
  update public.listings set missing_count=missing_count+1,
    active=case when missing_count+1 >= 2 and last_seen_at < now()-interval '24 hours' then false else active end
  where source_id=source_key and id not in (select j->>'id' from jsonb_array_elements(p_jobs) j);
  update public.sources set last_success_at=now() where id=source_key;
  insert into public.sync_runs(source_id,status,count,started_at) values(source_key,'success',imported,p_started_at);
  return imported;
end;
$$;
revoke all on function public.commit_source_sync(jsonb,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.commit_source_sync(jsonb,jsonb,timestamptz) to service_role;
grant all on public.sources,public.listings,public.sync_runs to service_role;
grant usage,select on sequence public.sync_runs_id_seq to service_role;
insert into public.virtus_migrations(name) values('202610250001_catalog') on conflict do nothing;
