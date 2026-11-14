-- M1 · Some Safari versions can't encode WebP from a canvas, so phones fall back to JPEG.
-- Accept both in the Shop pictures bucket (paths end in .webp or .jpg, see src/server/media).
update storage.buckets
set allowed_mime_types = array['image/webp', 'image/jpeg']
where id = 'shop-media';
