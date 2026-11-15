-- Garni Pro, supporter purchases and recipe packs. Run after add_households.sql (safe to run again).
-- New projects get this from schema.sql.
--
-- What someone has bought is an "entitlement" on their account: 'pro' (Lifetime Pro), 'supporter' (a tip),
-- or 'pack:<id>' (one recipe pack). Only the server writes them: the stripe-webhook edge function when Stripe
-- confirms a payment, or the admin (Admin tools, for testing and gifts). People can read their own.
-- Pro lifts the free plan's private-recipe limit (is_paid) and opens every pack.
--
-- A pack's recipes live here, not on the public website, so paid ones can't be downloaded for free.
-- claim_pack() copies a pack's recipes into the person's private recipes (once); those copies don't count
-- toward the free limit.

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product text not null check (product ~ '^(pro|supporter|pack:[a-z0-9-]{1,40})$'),
  source text not null default 'admin' check (source in ('stripe', 'admin', 'apple', 'google')),
  reference text,                          -- the Stripe checkout session, so a repeated webhook isn't counted twice
  amount_cents int check (amount_cents is null or amount_cents >= 0),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,                  -- set on a refund
  unique (source, reference)
);
create index if not exists entitlements_user on public.entitlements (user_id);
alter table public.entitlements enable row level security;
drop policy if exists entitlements_own_read on public.entitlements;
create policy entitlements_own_read on public.entitlements for select to authenticated using (user_id = auth.uid() or public.is_admin());
-- no insert/update/delete policies: only the webhook (service role) and the admin functions below write

create or replace function public.has_entitlement(p_user uuid, p_product text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.entitlements where user_id = p_user and product = p_product and revoked_at is null)
$$;
create or replace function public.is_pro(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_entitlement(p_user, 'pro')
$$;

-- Paid = a member of a restaurant with an active plan, or Garni Pro. Lifts the private-recipe limit.
create or replace function public.is_paid(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.restaurant_members m
                 join public.restaurants r on r.id = m.restaurant_id
                 where m.user_id = p_user and r.subscription_status in ('active', 'trialing'))
      or public.is_pro(p_user);
$$;

-- Admin tools: give or take back a product by email (testing, gifts, refunds outside Stripe).
create or replace function public.admin_grant(p_email text, p_product text) returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_user uuid;
begin
  if not public.is_admin() then raise exception 'Only the admin can grant purchases.'; end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then raise exception 'No account has that email.'; end if;
  if public.has_entitlement(v_user, p_product) then return; end if;
  insert into public.entitlements (user_id, product, source) values (v_user, p_product, 'admin');
end $$;
create or replace function public.admin_revoke(p_email text, p_product text) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'Only the admin can take back purchases.'; end if;
  update public.entitlements e set revoked_at = now()
    from auth.users u
    where u.id = e.user_id and lower(u.email) = lower(trim(p_email)) and e.product = p_product and e.revoked_at is null;
end $$;

-- ----------------------------------------------------------------------------- recipe packs
create table if not exists public.packs (
  id text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '' check (char_length(description) <= 600),
  price_cents int not null default 0 check (price_cents >= 0),   -- 0 = free with an account
  published boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.pack_recipes (
  id uuid primary key default gen_random_uuid(),
  pack_id text not null references public.packs (id) on delete cascade,
  title text not null check (length(title) between 1 and 300),
  categories text[] not null default '{}',
  body jsonb not null,
  sort int not null default 0
);
create index if not exists pack_recipes_pack on public.pack_recipes (pack_id);
alter table public.packs enable row level security;
alter table public.pack_recipes enable row level security;
drop policy if exists packs_read on public.packs;
create policy packs_read on public.packs for select to anon, authenticated using (published or public.is_admin());
drop policy if exists pack_recipes_admin on public.pack_recipes;
create policy pack_recipes_admin on public.pack_recipes for select to authenticated using (public.is_admin());
-- nobody else reads pack_recipes directly: pack_preview shows titles, claim_pack hands over the recipes

alter table public.recipes add column if not exists pack_id text references public.packs (id) on delete set null;

-- A published pack's recipe titles (anyone can see what's in it before buying).
create or replace function public.pack_preview(p_pack text) returns table (title text, categories text[])
language sql stable security definer set search_path = public as $$
  select r.title, r.categories from public.pack_recipes r join public.packs p on p.id = r.pack_id
  where r.pack_id = p_pack and p.published order by r.sort, r.title
$$;

-- Copy a pack's recipes into your private recipes (each once). Paid packs need Pro or that pack.
create or replace function public.claim_pack(p_pack text) returns int
language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_pack public.packs; n int;
begin
  if v_me is null then raise exception 'Please sign in first.'; end if;
  select * into v_pack from public.packs where id = p_pack and published;
  if v_pack.id is null then raise exception 'That pack isn''t available.'; end if;
  if v_pack.price_cents > 0 and not (public.is_pro(v_me) or public.has_entitlement(v_me, 'pack:' || v_pack.id)) then
    raise exception 'This pack needs to be unlocked first.';
  end if;
  perform set_config('garni.claiming_pack', 'on', true);       -- lets these copies carry pack_id (see enforce_free_limit)
  insert into public.recipes (owner_id, scope, title, categories, body, author_name, pack_id)
    select v_me, 'private', r.title, r.categories, r.body, 'Garni', v_pack.id
    from public.pack_recipes r
    where r.pack_id = v_pack.id
      and not exists (select 1 from public.recipes x where x.owner_id = v_me and x.pack_id = v_pack.id and x.title = r.title);
  get diagnostics n = row_count;
  perform set_config('garni.claiming_pack', 'off', true);
  return n;
end $$;

-- Pack copies don't count toward the free limit; only claim_pack can mark a recipe as one.
create or replace function public.enforce_free_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare lim int;
begin
  if new.pack_id is not null and coalesce(current_setting('garni.claiming_pack', true), '') <> 'on' then
    new.pack_id := null;
  end if;
  if new.scope = 'private' and new.pack_id is null and not public.is_admin() and not public.is_paid(new.owner_id) then
    select free_recipe_limit into lim from public.app_settings;
    if (select count(*) from public.recipes where owner_id = new.owner_id and scope = 'private' and pack_id is null) >= lim then
      raise exception 'The free plan allows % private recipes. Upgrade to Garni Pro to add more.', lim;
    end if;
  end if;
  return new;
end $$;

-- a pack copy stays a pack copy: editing a recipe can't set or clear pack_id
create or replace function public.guard_recipe_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.owner_id := old.owner_id;
    new.restaurant_id := old.restaurant_id;
    new.scope := old.scope;
    new.status := old.status;
    new.source_recipe_id := old.source_recipe_id;
    new.author_name := old.author_name;
    new.review_note := old.review_note;
    new.pack_id := old.pack_id;
  end if;
  new.updated_at := now();
  return new;
end $$;

revoke execute on function public.has_entitlement(uuid, text), public.is_pro(uuid), public.admin_grant(text, text),
  public.admin_revoke(text, text), public.pack_preview(text), public.claim_pack(text) from public, anon;
grant execute on function public.has_entitlement(uuid, text), public.is_pro(uuid), public.admin_grant(text, text),
  public.admin_revoke(text, text), public.claim_pack(text) to authenticated;
grant execute on function public.pack_preview(text) to anon, authenticated;
