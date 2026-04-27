drop policy if exists "Authorized users can update incidents" on public.incidents;
drop policy if exists "Admins can update incidents" on public.incidents;
create policy "Admins can update incidents"
on public.incidents for update
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop policy if exists "Admins can delete incidents" on public.incidents;
create policy "Admins can delete incidents"
on public.incidents for delete
to authenticated
using (public.is_admin_user(auth.uid()));
