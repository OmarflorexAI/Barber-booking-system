-- M7: plans Free and Pro (Q24, Q28-Q31). Pro unlocks online card payments, Telegram
-- alerts and Client text messages; Free is everything else. We switch plans by hand
-- (Platform admin `setPlan`, logged in support_access_log). The server enforces the
-- gating, not just the UI. New Shops start on Free; every Shop that exists today
-- (demo-shop, any with Stripe) starts on Pro so nothing they use goes away.
alter table public.shops
  add column plan text not null default 'free' check (plan in ('free', 'pro'));

update public.shops set plan = 'pro';
