alter table public.incidents
drop column if exists status;

drop index if exists incidents_status_idx;
