-- Repair transfer row-level security for the browser transaction flow.
-- Transfers already have RLS enabled in the initial schema, but no policy
-- was created for them. This policy lets an authenticated user manage only
-- their own transfer rows.

drop policy if exists "Users can manage their own transfers" on public.transfers;

create policy "Users can manage their own transfers"
  on public.transfers
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
