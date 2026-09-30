begin;

alter table public.profiles
  add column user_id uuid;

alter table public.locations
  add column user_id uuid;

do $$
declare
  initial_owner_id uuid;
  auth_user_count bigint;
  legacy_row_count bigint;
begin
  select
    (select count(*) from auth.users where deleted_at is null),
    (select count(*) from public.profiles) + (select count(*) from public.locations)
  into auth_user_count, legacy_row_count;

  if legacy_row_count > 0 and auth_user_count <> 1 then
    raise exception
      'Cannot backfill ownership safely: expected exactly one active Supabase Auth user for existing profiles/locations, found %. Provision the designated initial owner, then rerun this migration.',
      auth_user_count;
  end if;

  if legacy_row_count > 0 then
    select id
      into initial_owner_id
      from auth.users
     where deleted_at is null;

    update public.profiles set user_id = initial_owner_id where user_id is null;
    update public.locations set user_id = initial_owner_id where user_id is null;
  end if;

  if exists (select 1 from public.profiles where user_id is null)
     or exists (select 1 from public.locations where user_id is null) then
    raise exception 'Ownership backfill left profile or location rows without an owner.';
  end if;

  if exists (
    select 1
      from public.measurements as measurement
      join public.profiles as profile on profile.id = measurement.profile_id
      join public.locations as location on location.id = measurement.location_id
     where profile.user_id is distinct from location.user_id
  ) then
    raise exception 'Existing measurements reference a profile and location with different owners.';
  end if;
end;
$$;

alter table public.profiles
  alter column user_id set default auth.uid(),
  alter column user_id set not null,
  add constraint profiles_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete restrict,
  add constraint profiles_id_user_id_unique unique (id, user_id);

alter table public.locations
  alter column user_id set default auth.uid(),
  alter column user_id set not null,
  add constraint locations_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete restrict,
  add constraint locations_id_user_id_unique unique (id, user_id);

create index profiles_user_id_name_idx on public.profiles (user_id, name);
create index locations_user_id_name_idx on public.locations (user_id, name);

create policy profiles_select_own
  on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));

create policy profiles_insert_own
  on public.profiles for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy profiles_update_own
  on public.profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy profiles_delete_own
  on public.profiles for delete to authenticated
  using (user_id = (select auth.uid()));

create policy locations_select_own
  on public.locations for select to authenticated
  using (user_id = (select auth.uid()));

create policy locations_insert_own
  on public.locations for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy locations_update_own
  on public.locations for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy locations_delete_own
  on public.locations for delete to authenticated
  using (user_id = (select auth.uid()));

create policy measurements_select_via_owned_profile
  on public.measurements for select to authenticated
  using (
    exists (
      select 1 from public.profiles as profile
       where profile.id = measurements.profile_id
         and profile.user_id = (select auth.uid())
    )
  );

create policy measurements_insert_via_owned_profile_and_location
  on public.measurements for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles as profile
       where profile.id = measurements.profile_id
         and profile.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.locations as location
       where location.id = measurements.location_id
         and location.user_id = (select auth.uid())
    )
  );

create policy measurements_update_within_owned_profile_and_location
  on public.measurements for update to authenticated
  using (
    exists (
      select 1 from public.profiles as profile
       where profile.id = measurements.profile_id
         and profile.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.locations as location
       where location.id = measurements.location_id
         and location.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.profiles as profile
       where profile.id = measurements.profile_id
         and profile.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.locations as location
       where location.id = measurements.location_id
         and location.user_id = (select auth.uid())
    )
  );

create policy measurements_delete_via_owned_profile_and_location
  on public.measurements for delete to authenticated
  using (
    exists (
      select 1 from public.profiles as profile
       where profile.id = measurements.profile_id
         and profile.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.locations as location
       where location.id = measurements.location_id
         and location.user_id = (select auth.uid())
    )
  );

commit;