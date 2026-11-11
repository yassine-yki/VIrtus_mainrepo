-- Owner-requested expansion (2026-11-11) of the public job-facts/original-link
-- catalog. No descriptions, applicant data or access policies are exposed.
-- Preserve every existing suspension/publication decision on conflict.
insert into public.sources(id,name,company,provider,website,publication_status,permission_note)
select id,name,name,'html',website,'approved',
  'Owner requested major Moroccan tech-employer expansion on 2026-11-11 within the public job-facts and original-link catalog scope. Original advertisements stay at the employer; no full-description redistribution licence is asserted.'
from (values
  ('capgemini','Capgemini','https://www.capgemini.com/ma-en/job-search/'),
  ('cgi','CGI','https://www.cgi.com/maroc/fr/carrieres'),
  ('cegedim','Cegedim','https://careers.cegedim.com/fr')
) as candidates(id,name,website)
on conflict(id) do nothing;
insert into public.virtus_migrations(name) values('202611110001_major_tech_employers') on conflict do nothing;
