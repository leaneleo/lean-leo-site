alter table public.assignments drop constraint assignments_check;
alter table public.assignments add column reviewed boolean not null default false;
alter table public.students add column import_data jsonb not null default '{}'::jsonb, add column import_key text unique;
alter table public.workouts add column import_data jsonb not null default '{}'::jsonb, add column import_key text unique;
alter table public.assignments add column import_data jsonb not null default '{}'::jsonb, add column import_key text unique;
alter table public.payments add column import_data jsonb not null default '{}'::jsonb, add column import_key text unique;
alter table public.tasks add column import_key text unique;
