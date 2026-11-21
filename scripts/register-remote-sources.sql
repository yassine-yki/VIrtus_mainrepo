-- Facts and original links within the owner-approved public scope. Never override a suspension.
insert into public.sources(id,name,company,provider,website,publication_status,permission_note)
values ('wikimedia','Wikimedia Foundation','Wikimedia Foundation','greenhouse','https://wikimediafoundation.org/jobs/','approved',
'Owner-approved job facts and original links. Complete public Greenhouse feed validated 2026-11-21. Each imported role explicitly lists Morocco in its hiring countries. Full advertisements not retained; no broad full-ad reuse licence asserted. Evidence: https://wikimediafoundation.org/jobs/ and each original job URL.')
on conflict(id) do nothing;
