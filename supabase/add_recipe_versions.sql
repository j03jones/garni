-- Edit history for recipes kept in the account: each time a recipe's title, categories or text changes, the
-- version it replaces is kept (the last 30 per recipe), so the recipe page can show what changed and put an
-- earlier version back. Safe to run again. New projects get this from schema.sql.

create table if not exists public.recipe_versions (
  id bigserial primary key,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  title text not null,
  categories text[] not null default '{}',
  body jsonb not null,
  saved_at timestamptz,                       -- when this version was saved
  replaced_at timestamptz not null default now(),
  replaced_by uuid                            -- who changed it (auth.uid() of the edit)
);
create index if not exists recipe_versions_recipe on public.recipe_versions (recipe_id, replaced_at desc);
alter table public.recipe_versions enable row level security;

-- the people who can see the recipe can see its history (the recipes table's own rules decide that)
drop policy if exists recipe_versions_read on public.recipe_versions;
create policy recipe_versions_read on public.recipe_versions for select to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id));
grant select on public.recipe_versions to authenticated;
-- nobody writes to it directly: only the trigger below does

create or replace function public.keep_recipe_version() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.title is distinct from new.title or old.categories is distinct from new.categories
     or (old.body - 'updated') is distinct from (new.body - 'updated') then
    insert into public.recipe_versions (recipe_id, title, categories, body, saved_at, replaced_by)
      values (old.id, old.title, old.categories, old.body, old.updated_at, auth.uid());
    delete from public.recipe_versions
      where recipe_id = old.id
        and id not in (select id from public.recipe_versions where recipe_id = old.id order by replaced_at desc, id desc limit 30);
  end if;
  return new;
end $$;
drop trigger if exists keep_recipe_version on public.recipes;
create trigger keep_recipe_version after update on public.recipes
  for each row execute function public.keep_recipe_version();
