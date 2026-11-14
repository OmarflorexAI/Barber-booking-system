-- An Owner may edit their Shop's own details through the API (RLS shops_update), but never
-- what we sell or switch on for them: the plan, billing, account status, payments and Client
-- texts. Those change only through the server (DB owner) or a Platform admin's tools, which
-- never run as `authenticated`. Found by M7 QA: an Owner could set plan = 'pro' themselves.
create or replace function public.guard_shop_billing_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' then
    if new.plan is distinct from old.plan
       or new.billing_status is distinct from old.billing_status
       or new.status is distinct from old.status
       or new.sms_enabled is distinct from old.sms_enabled
       or new.sms_registration is distinct from old.sms_registration
       or new.payments_enabled is distinct from old.payments_enabled
       or new.payment_account_id is distinct from old.payment_account_id then
      raise exception 'only our team can change this field' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger shops_billing_guard before update on public.shops
  for each row execute function public.guard_shop_billing_update();
