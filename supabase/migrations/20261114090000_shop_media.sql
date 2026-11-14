-- M1 · Photo uploads: one public bucket for Shop pictures (Barber photos, logo, gallery, cover).
-- Files live under shops/<shopId>/<kind>/<uuid>.webp. Anyone may read (public bucket);
-- nobody writes from the browser directly: the server checks the Owner and hands out a
-- signed upload URL (service role). So there are deliberately NO storage.objects policies
-- granting insert/update/delete to anon or authenticated.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop-media', 'shop-media', true, 3145728, array['image/webp'])
on conflict (id) do nothing;
