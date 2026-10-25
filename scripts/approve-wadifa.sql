-- Operator action after migration + collection + attribution verification.
-- This is deliberately not part of collector code or automatic registration.
update public.sources set publication_status='approved',
  permission_note='CC BY 4.0, commercial reuse explicitly allowed. Evidence checked 2026-10-25: https://www.wadifa-info.com/developpeurs . Display Source : Wadifa Info linking to each record attribution_url without nofollow. Preserve official notice; dates and positions verified there. Metadata adapted by Virtus.'
where id='wadifa' and provider='wadifa';
