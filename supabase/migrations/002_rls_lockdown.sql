begin;

revoke all on table public.profiles, public.locations, public.measurements from anon;
revoke all on table public.profiles, public.locations, public.measurements from public;
grant select, insert, update, delete on table public.profiles, public.locations, public.measurements to authenticated;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.locations enable row level security;
alter table public.locations force row level security;
alter table public.measurements enable row level security;
alter table public.measurements force row level security;

commit;