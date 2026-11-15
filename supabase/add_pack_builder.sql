-- The admin's pack builder: make and edit starter packs, and put recipes in them, from the app.
-- Run after add_pro_and_packs.sql. Safe to run again.

drop policy if exists packs_admin_write on public.packs;
create policy packs_admin_write on public.packs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists pack_recipes_admin_write on public.pack_recipes;
create policy pack_recipes_admin_write on public.pack_recipes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant insert, update, delete on public.packs to authenticated;
grant insert, update, delete on public.pack_recipes to authenticated;

-- a pack's recipe must be Garni's own words: a straight copy of another website's recipe (a link to the
-- original and no "adapted" credit) can't go in. Make your own version of it first.
create or replace function public.guard_pack_recipe() returns trigger
language plpgsql set search_path = public as $$
begin
  if coalesce(new.body #>> '{src,url}', '') <> '' and new.body -> 'adapted' is null then
    raise exception 'That recipe is a copy of another website''s. Make your own version of it first.';
  end if;
  if new.body ->> 'kind' = 'link' then
    raise exception 'A link card has no recipe to put in a pack.';
  end if;
  return new;
end $$;
drop trigger if exists pack_recipe_guard on public.pack_recipes;
create trigger pack_recipe_guard before insert or update on public.pack_recipes
  for each row execute function public.guard_pack_recipe();
