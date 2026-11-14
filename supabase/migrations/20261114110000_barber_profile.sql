-- M4: the Barber profile Clients see. `bio` stays the English bio; `bio_es` is the
-- Spanish one (Q35: one language required, the other optional, no auto-translation).
-- `instagram` is a bare handle (no @, no URL); the public page builds the link.
alter table public.barbers
  add column bio_es text not null default '',
  add column instagram text
    check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$');
