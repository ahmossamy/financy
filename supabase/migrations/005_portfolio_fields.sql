-- Financy investment portfolio fields
-- Adds portfolio classification and target allocation used by the Investments UI.

alter table public.portfolios
  add column if not exists portfolio_type text not null default 'other',
  add column if not exists target_allocation numeric(6, 2) not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'portfolios_portfolio_type_check'
      and conrelid = 'public.portfolios'::regclass
  ) then
    alter table public.portfolios
      add constraint portfolios_portfolio_type_check
      check (portfolio_type in ('wealth', 'retirement', 'children', 'education', 'emergency', 'personal', 'other'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'portfolios_target_allocation_check'
      and conrelid = 'public.portfolios'::regclass
  ) then
    alter table public.portfolios
      add constraint portfolios_target_allocation_check
      check (target_allocation between 0 and 100);
  end if;
end $$;
