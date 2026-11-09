-- Outbox payloads were written as JSON strings ("{...}") instead of objects.
-- The engine now writes objects; unwrap any rows written before the fix.
update public.outbox
set payload = (payload #>> '{}')::jsonb
where jsonb_typeof(payload) = 'string';
