-- M5: the Shop profile Clients see at the top of /b/<shopSlug>. Logo and cover are
-- https links to uploaded photos (M1); `about_en` / `about_es` follow Q35 (Clients see
-- the written one when theirs is missing; no auto-translation). The slug is not editable
-- by the Owner (Q21), so nothing here touches it.
alter table public.shops
  add column logo_url text check (logo_url is null or logo_url ~ '^https://'),
  add column cover_url text check (cover_url is null or cover_url ~ '^https://'),
  add column about_en text not null default '' check (char_length(about_en) <= 600),
  add column about_es text not null default '' check (char_length(about_es) <= 600);
