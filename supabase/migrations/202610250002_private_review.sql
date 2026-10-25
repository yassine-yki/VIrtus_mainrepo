-- A narrow, read-only capability for the owner preview. The token is generated
-- outside the repository. It never grants collection, writes or source approval.
create schema if not exists virtus_private;
revoke all on schema virtus_private from public, anon, authenticated;
create table virtus_private.review_access (
  singleton boolean primary key default true check (singleton),
  token_hash text not null
);
alter table virtus_private.review_access enable row level security;
revoke all on virtus_private.review_access from public, anon, authenticated;

create function public.search_catalog_review(
  p_token text, p_query text default '', p_city text default '', p_contract text default '',
  p_workplace text default '', p_source text default '', p_days integer default 0,
  p_page integer default 1, p_sort text default 'recent'
) returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if length(p_token) < 48 or not exists (
    select 1 from virtus_private.review_access where token_hash = md5(p_token)
  ) then raise exception 'Review access denied' using errcode = '42501'; end if;
  return public.search_catalog(p_query,p_city,p_contract,p_workplace,p_source,p_days,p_page,p_sort);
end;
$$;
create function public.get_catalog_job_review(p_token text,p_id text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if length(p_token) < 48 or not exists (
    select 1 from virtus_private.review_access where token_hash = md5(p_token)
  ) then raise exception 'Review access denied' using errcode = '42501'; end if;
  return public.get_catalog_job(p_id);
end;
$$;
revoke all on function public.search_catalog_review(text,text,text,text,text,text,integer,integer,text) from public;
revoke all on function public.get_catalog_job_review(text,text) from public;
grant execute on function public.search_catalog_review(text,text,text,text,text,text,integer,integer,text) to anon,authenticated;
grant execute on function public.get_catalog_job_review(text,text) to anon,authenticated;
insert into public.virtus_migrations(name) values('202610250002_private_review') on conflict do nothing;
