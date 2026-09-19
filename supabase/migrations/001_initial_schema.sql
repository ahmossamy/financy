-- Financy initial Supabase schema
-- This migration defines the application schema and reference currencies only.
-- It intentionally does not insert sample users, accounts, transactions, or other
-- user financial data.

create extension if not exists pgcrypto;

create table public.currencies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  symbol text,
  decimal_places integer not null default 2 check (decimal_places between 0 and 8),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.currencies (code, name, symbol, decimal_places)
values
  ('EGP', 'Egyptian Pound', 'ج.م', 2),
  ('USD', 'US Dollar', '$', 2),
  ('EUR', 'Euro', '€', 2),
  ('SAR', 'Saudi Riyal', '﷼', 2),
  ('AED', 'United Arab Emirates Dirham', 'د.إ', 2),
  ('GBP', 'British Pound', '£', 2);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  language text not null default 'en',
  base_currency text not null default 'EGP' references public.currencies(code),
  date_format text not null default 'DD/MM/YYYY',
  number_format text not null default '1,234.56',
  theme text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_currency text not null references public.currencies(code),
  to_currency text not null references public.currencies(code),
  rate numeric(20, 8) not null check (rate > 0),
  rate_date date not null,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exchange_rates_distinct_currencies_check
    check (from_currency <> to_currency),
  constraint exchange_rates_unique_rate
    unique (user_id, from_currency, to_currency, rate_date)
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  account_type text not null,
  currency_code text not null references public.currencies(code),
  bank_name text,
  provider text,
  opening_balance numeric(20, 4) not null default 0,
  credit_limit numeric(20, 4) check (credit_limit is null or credit_limit >= 0),
  account_number text,
  iban text,
  mobile_number text,
  statement_date integer check (statement_date is null or statement_date between 1 and 31),
  payment_due_date integer check (payment_due_date is null or payment_due_date between 1 and 31),
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_account_type_check check (
    account_type in (
      'bank',
      'cash',
      'credit_card',
      'prepaid',
      'wallet',
      'investment_cash'
    )
  ),
  constraint accounts_status_check check (
    status in ('active', 'archived', 'closed')
  )
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  parent_id uuid references public.categories(id) on delete set null,
  icon text,
  color text,
  sort_order integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_type_check check (type in ('expense', 'income')),
  constraint categories_status_check check (status in ('active', 'archived'))
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint people_status_check check (status in ('active', 'archived'))
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tags_name_unique_per_user unique (user_id, name)
);

create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  frequency text not null,
  interval_value integer not null default 1 check (interval_value > 0),
  start_date date not null,
  end_date date,
  next_run_date date not null,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_rules_frequency_check check (
    frequency in ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')
  ),
  constraint recurring_rules_date_range_check check (
    end_date is null or end_date >= start_date
  ),
  constraint recurring_rules_status_check check (
    status in ('active', 'paused', 'completed', 'cancelled')
  )
);

create table public.scheduled_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recurring_rule_id uuid references public.recurring_rules(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  person_id uuid references public.people(id) on delete set null,
  type text not null,
  amount numeric(20, 4) not null check (amount > 0),
  currency_code text not null references public.currencies(code),
  description text,
  notes text,
  next_run_date date not null,
  last_run_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scheduled_transactions_type_check check (
    type in ('expense', 'income', 'transfer', 'investment', 'debt_payment', 'loan_payment')
  ),
  constraint scheduled_transactions_status_check check (
    status in ('active', 'paused', 'completed', 'cancelled')
  )
);

create table public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  base_currency text not null default 'EGP' references public.currencies(code),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolios_status_check check (status in ('active', 'archived'))
);

create table public.platforms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  platform_type text not null default 'broker',
  currency_code text references public.currencies(code),
  account_reference text,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platforms_status_check check (status in ('active', 'archived'))
);

create table public.investment_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text,
  name text not null,
  asset_type text not null,
  currency_code text not null references public.currencies(code),
  isin text,
  exchange text,
  sector text,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investment_assets_asset_type_check check (
    asset_type in ('stock', 'etf', 'mutual_fund', 'bond', 'crypto', 'commodity', 'cash', 'other')
  ),
  constraint investment_assets_status_check check (status in ('active', 'archived'))
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  asset_type text not null,
  description text,
  currency_code text not null references public.currencies(code),
  purchase_date date,
  purchase_value numeric(20, 4) check (purchase_value is null or purchase_value >= 0),
  current_value numeric(20, 4) check (current_value is null or current_value >= 0),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assets_status_check check (status in ('active', 'sold', 'archived'))
);

create table public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  investment_asset_id uuid not null references public.investment_assets(id) on delete restrict,
  platform_id uuid references public.platforms(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  quantity numeric(24, 8) not null default 0 check (quantity >= 0),
  average_cost numeric(20, 8) check (average_cost is null or average_cost >= 0),
  current_price numeric(20, 8) check (current_price is null or current_price >= 0),
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint holdings_status_check check (status in ('active', 'closed')),
  constraint holdings_unique_asset_per_portfolio unique (portfolio_id, investment_asset_id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scheduled_transaction_id uuid references public.scheduled_transactions(id) on delete set null,
  recurring_rule_id uuid references public.recurring_rules(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  person_id uuid references public.people(id) on delete set null,
  amount numeric(20, 4) not null check (amount > 0),
  currency_code text not null references public.currencies(code),
  transaction_date date not null,
  transaction_time time,
  type text not null,
  status text not null default 'completed',
  description text,
  notes text,
  transfer_id uuid,
  goal_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_type_check check (
    type in (
      'expense',
      'income',
      'transfer',
      'investment',
      'asset_purchase',
      'asset_sale',
      'debt_payment',
      'loan_payment'
    )
  ),
  constraint transactions_status_check check (
    status in ('pending', 'completed', 'cancelled')
  )
);

create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_account_id uuid not null references public.accounts(id) on delete restrict,
  to_account_id uuid not null references public.accounts(id) on delete restrict,
  amount numeric(20, 4) not null check (amount > 0),
  currency_code text not null references public.currencies(code),
  exchange_rate numeric(20, 8) check (exchange_rate is null or exchange_rate > 0),
  received_amount numeric(20, 4) check (received_amount is null or received_amount > 0),
  fee numeric(20, 4) not null default 0 check (fee >= 0),
  fee_transaction_id uuid,
  transfer_date date not null,
  status text not null default 'completed',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transfers_status_check check (
    status in ('pending', 'completed', 'cancelled')
  ),
  constraint transfers_distinct_accounts_check check (
    from_account_id <> to_account_id
  )
);

create table public.transaction_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transaction_tags_unique_link unique (transaction_id, tag_id)
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  file_name text not null,
  file_type text,
  file_size bigint check (file_size is null or file_size >= 0),
  storage_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.investment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  holding_id uuid references public.holdings(id) on delete set null,
  investment_asset_id uuid not null references public.investment_assets(id) on delete restrict,
  platform_id uuid references public.platforms(id) on delete set null,
  type text not null,
  quantity numeric(24, 8) not null check (quantity > 0),
  price numeric(20, 8) not null check (price >= 0),
  fees numeric(20, 4) not null default 0 check (fees >= 0),
  currency_code text not null references public.currencies(code),
  transaction_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investment_transactions_type_check check (
    type in ('buy', 'sell', 'transfer_in', 'transfer_out', 'split', 'other')
  )
);

create table public.dividends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  holding_id uuid references public.holdings(id) on delete set null,
  investment_asset_id uuid not null references public.investment_assets(id) on delete restrict,
  amount numeric(20, 4) not null check (amount > 0),
  currency_code text not null references public.currencies(code),
  ex_date date,
  payment_date date not null,
  reinvested boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.asset_prices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  investment_asset_id uuid not null references public.investment_assets(id) on delete cascade,
  price numeric(20, 8) not null check (price >= 0),
  currency_code text not null references public.currencies(code),
  price_date date not null,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_prices_unique_daily_price
    unique (investment_asset_id, price_date)
);

create table public.asset_valuations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid references public.assets(id) on delete cascade,
  holding_id uuid references public.holdings(id) on delete cascade,
  value numeric(20, 4) not null check (value >= 0),
  currency_code text not null references public.currencies(code),
  valuation_date date not null,
  source text not null default 'manual',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_valuations_one_subject_check check (
    (asset_id is not null and holding_id is null)
    or (asset_id is null and holding_id is not null)
  )
);

create table public.receivables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,
  name text not null,
  description text,
  amount_due numeric(20, 4) not null check (amount_due >= 0),
  amount_received numeric(20, 4) not null default 0 check (amount_received >= 0),
  currency_code text not null references public.currencies(code),
  due_date date,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint receivables_received_amount_check check (amount_received <= amount_due),
  constraint receivables_status_check check (status in ('open', 'partially_paid', 'paid', 'cancelled'))
);

create table public.liabilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  liability_type text not null,
  description text,
  principal_amount numeric(20, 4) not null check (principal_amount >= 0),
  outstanding_amount numeric(20, 4) not null check (outstanding_amount >= 0),
  currency_code text not null references public.currencies(code),
  due_date date,
  interest_rate numeric(10, 6) check (interest_rate is null or interest_rate >= 0),
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint liabilities_outstanding_amount_check
    check (outstanding_amount <= principal_amount),
  constraint liabilities_status_check check (status in ('open', 'partially_paid', 'paid', 'cancelled'))
);

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  liability_id uuid references public.liabilities(id) on delete set null,
  lender_person_id uuid references public.people(id) on delete set null,
  name text not null,
  principal_amount numeric(20, 4) not null check (principal_amount >= 0),
  outstanding_amount numeric(20, 4) not null check (outstanding_amount >= 0),
  currency_code text not null references public.currencies(code),
  interest_rate numeric(10, 6) check (interest_rate is null or interest_rate >= 0),
  term_months integer check (term_months is null or term_months > 0),
  start_date date not null,
  end_date date,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint loans_outstanding_amount_check
    check (outstanding_amount <= principal_amount),
  constraint loans_date_range_check check (end_date is null or end_date >= start_date),
  constraint loans_status_check check (status in ('active', 'paid', 'defaulted', 'cancelled'))
);

create table public.loan_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  loan_id uuid not null references public.loans(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  amount numeric(20, 4) not null check (amount > 0),
  principal_amount numeric(20, 4) not null default 0 check (principal_amount >= 0),
  interest_amount numeric(20, 4) not null default 0 check (interest_amount >= 0),
  fee_amount numeric(20, 4) not null default 0 check (fee_amount >= 0),
  currency_code text not null references public.currencies(code),
  payment_date date not null,
  status text not null default 'completed',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint loan_payments_components_check check (
    principal_amount + interest_amount + fee_amount <= amount
  ),
  constraint loan_payments_status_check check (status in ('pending', 'completed', 'cancelled'))
);

create table public.installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  loan_id uuid references public.loans(id) on delete cascade,
  liability_id uuid references public.liabilities(id) on delete cascade,
  name text not null,
  installment_number integer,
  amount numeric(20, 4) not null check (amount > 0),
  paid_amount numeric(20, 4) not null default 0 check (paid_amount >= 0),
  currency_code text not null references public.currencies(code),
  due_date date not null,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint installments_one_parent_check check (
    (loan_id is not null and liability_id is null)
    or (loan_id is null and liability_id is not null)
  ),
  constraint installments_paid_amount_check check (paid_amount <= amount),
  constraint installments_status_check check (status in ('pending', 'partially_paid', 'paid', 'overdue', 'cancelled'))
);

create table public.installment_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  installment_id uuid not null references public.installments(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  amount numeric(20, 4) not null check (amount > 0),
  currency_code text not null references public.currencies(code),
  payment_date date not null,
  status text not null default 'completed',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint installment_payments_status_check check (status in ('pending', 'completed', 'cancelled'))
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  period text not null,
  start_date date not null,
  end_date date not null,
  amount numeric(20, 4) not null check (amount >= 0),
  currency_code text not null references public.currencies(code),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budgets_date_range_check check (end_date >= start_date),
  constraint budgets_period_check check (period in ('weekly', 'monthly', 'quarterly', 'yearly', 'custom')),
  constraint budgets_status_check check (status in ('active', 'closed', 'archived'))
);

create table public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_id uuid not null references public.budgets(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  amount numeric(20, 4) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_categories_unique_link unique (budget_id, category_id)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  target_amount numeric(20, 4) not null check (target_amount > 0),
  current_amount numeric(20, 4) not null default 0 check (current_amount >= 0),
  currency_code text not null references public.currencies(code),
  target_date date,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goals_current_amount_check check (current_amount <= target_amount),
  constraint goals_status_check check (status in ('active', 'completed', 'paused', 'cancelled'))
);

create table public.goal_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  allocated_amount numeric(20, 4) check (allocated_amount is null or allocated_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goal_links_unique_entity unique (goal_id, entity_type, entity_id)
);

create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  amount numeric(20, 4) not null check (amount > 0),
  currency_code text not null references public.currencies(code),
  contribution_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email_enabled boolean not null default true,
  push_enabled boolean not null default true,
  budget_alerts boolean not null default true,
  payment_reminders boolean not null default true,
  goal_updates boolean not null default true,
  investment_updates boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  language text not null default 'en',
  base_currency text not null default 'EGP' references public.currencies(code),
  date_format text not null default 'DD/MM/YYYY',
  number_format text not null default '1,234.56',
  theme text not null default 'system',
  week_starts_on integer not null default 1 check (week_starts_on between 0 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  file_size bigint check (file_size is null or file_size >= 0),
  backup_type text not null default 'manual',
  status text not null default 'created',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint backups_type_check check (backup_type in ('manual', 'scheduled', 'automatic')),
  constraint backups_status_check check (status in ('pending', 'created', 'failed', 'deleted'))
);

alter table public.transactions
  add constraint transactions_transfer_id_fkey
  foreign key (transfer_id) references public.transfers(id) on delete set null;

alter table public.transactions
  add constraint transactions_goal_id_fkey
  foreign key (goal_id) references public.goals(id) on delete set null;

alter table public.transfers
  add constraint transfers_fee_transaction_id_fkey
  foreign key (fee_transaction_id) references public.transactions(id) on delete set null;

create index idx_profiles_user_id on public.profiles(user_id);
create index idx_exchange_rates_user_id on public.exchange_rates(user_id);
create index idx_exchange_rates_rate_date on public.exchange_rates(rate_date);
create index idx_accounts_user_id on public.accounts(user_id);
create index idx_accounts_currency_code on public.accounts(currency_code);
create index idx_categories_user_id on public.categories(user_id);
create index idx_categories_parent_id on public.categories(parent_id);
create index idx_people_user_id on public.people(user_id);
create index idx_tags_user_id on public.tags(user_id);
create index idx_recurring_rules_user_id on public.recurring_rules(user_id);
create index idx_recurring_rules_next_run_date on public.recurring_rules(next_run_date);
create index idx_scheduled_transactions_user_id on public.scheduled_transactions(user_id);
create index idx_scheduled_transactions_next_run_date on public.scheduled_transactions(next_run_date);
create index idx_portfolios_user_id on public.portfolios(user_id);
create index idx_platforms_user_id on public.platforms(user_id);
create index idx_investment_assets_user_id on public.investment_assets(user_id);
create index idx_assets_user_id on public.assets(user_id);
create index idx_holdings_user_id on public.holdings(user_id);
create index idx_holdings_portfolio_id on public.holdings(portfolio_id);
create index idx_transactions_user_id on public.transactions(user_id);
create index idx_transactions_transaction_date on public.transactions(transaction_date);
create index idx_transactions_account_id on public.transactions(account_id);
create index idx_transactions_category_id on public.transactions(category_id);
create index idx_transactions_transfer_id on public.transactions(transfer_id);
create index idx_transactions_goal_id on public.transactions(goal_id);
create index idx_transfers_user_id on public.transfers(user_id);
create index idx_transfers_transfer_date on public.transfers(transfer_date);
create index idx_transfers_from_account_id on public.transfers(from_account_id);
create index idx_transfers_to_account_id on public.transfers(to_account_id);
create index idx_transaction_tags_user_id on public.transaction_tags(user_id);
create index idx_transaction_tags_tag_id on public.transaction_tags(tag_id);
create index idx_attachments_user_id on public.attachments(user_id);
create index idx_attachments_entity on public.attachments(entity_type, entity_id);
create index idx_investment_transactions_user_id on public.investment_transactions(user_id);
create index idx_investment_transactions_portfolio_id on public.investment_transactions(portfolio_id);
create index idx_investment_transactions_transaction_date on public.investment_transactions(transaction_date);
create index idx_dividends_user_id on public.dividends(user_id);
create index idx_dividends_payment_date on public.dividends(payment_date);
create index idx_asset_prices_user_id on public.asset_prices(user_id);
create index idx_asset_prices_price_date on public.asset_prices(price_date);
create index idx_asset_valuations_user_id on public.asset_valuations(user_id);
create index idx_asset_valuations_valuation_date on public.asset_valuations(valuation_date);
create index idx_receivables_user_id on public.receivables(user_id);
create index idx_receivables_due_date on public.receivables(due_date);
create index idx_liabilities_user_id on public.liabilities(user_id);
create index idx_liabilities_due_date on public.liabilities(due_date);
create index idx_loans_user_id on public.loans(user_id);
create index idx_loans_status on public.loans(status);
create index idx_loan_payments_user_id on public.loan_payments(user_id);
create index idx_loan_payments_loan_id on public.loan_payments(loan_id);
create index idx_installments_user_id on public.installments(user_id);
create index idx_installments_due_date on public.installments(due_date);
create index idx_installment_payments_user_id on public.installment_payments(user_id);
create index idx_installment_payments_installment_id on public.installment_payments(installment_id);
create index idx_budgets_user_id on public.budgets(user_id);
create index idx_budgets_date_range on public.budgets(start_date, end_date);
create index idx_budget_categories_user_id on public.budget_categories(user_id);
create index idx_goals_user_id on public.goals(user_id);
create index idx_goals_status on public.goals(status);
create index idx_goal_links_user_id on public.goal_links(user_id);
create index idx_goal_contributions_user_id on public.goal_contributions(user_id);
create index idx_goal_contributions_goal_id on public.goal_contributions(goal_id);
create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_unread on public.notifications(user_id, read_at);
create index idx_audit_logs_user_id on public.audit_logs(user_id);
create index idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);
create index idx_backups_user_id on public.backups(user_id);
create index idx_backups_created_at on public.backups(created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger currencies_set_updated_at
before update on public.currencies
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger exchange_rates_set_updated_at
before update on public.exchange_rates
for each row execute function public.set_updated_at();

create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger people_set_updated_at
before update on public.people
for each row execute function public.set_updated_at();

create trigger tags_set_updated_at
before update on public.tags
for each row execute function public.set_updated_at();

create trigger recurring_rules_set_updated_at
before update on public.recurring_rules
for each row execute function public.set_updated_at();

create trigger scheduled_transactions_set_updated_at
before update on public.scheduled_transactions
for each row execute function public.set_updated_at();

create trigger portfolios_set_updated_at
before update on public.portfolios
for each row execute function public.set_updated_at();

create trigger platforms_set_updated_at
before update on public.platforms
for each row execute function public.set_updated_at();

create trigger investment_assets_set_updated_at
before update on public.investment_assets
for each row execute function public.set_updated_at();

create trigger assets_set_updated_at
before update on public.assets
for each row execute function public.set_updated_at();

create trigger holdings_set_updated_at
before update on public.holdings
for each row execute function public.set_updated_at();

create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

create trigger transfers_set_updated_at
before update on public.transfers
for each row execute function public.set_updated_at();

create trigger transaction_tags_set_updated_at
before update on public.transaction_tags
for each row execute function public.set_updated_at();

create trigger attachments_set_updated_at
before update on public.attachments
for each row execute function public.set_updated_at();

create trigger investment_transactions_set_updated_at
before update on public.investment_transactions
for each row execute function public.set_updated_at();

create trigger dividends_set_updated_at
before update on public.dividends
for each row execute function public.set_updated_at();

create trigger asset_prices_set_updated_at
before update on public.asset_prices
for each row execute function public.set_updated_at();

create trigger asset_valuations_set_updated_at
before update on public.asset_valuations
for each row execute function public.set_updated_at();

create trigger receivables_set_updated_at
before update on public.receivables
for each row execute function public.set_updated_at();

create trigger liabilities_set_updated_at
before update on public.liabilities
for each row execute function public.set_updated_at();

create trigger loans_set_updated_at
before update on public.loans
for each row execute function public.set_updated_at();

create trigger loan_payments_set_updated_at
before update on public.loan_payments
for each row execute function public.set_updated_at();

create trigger installments_set_updated_at
before update on public.installments
for each row execute function public.set_updated_at();

create trigger installment_payments_set_updated_at
before update on public.installment_payments
for each row execute function public.set_updated_at();

create trigger budgets_set_updated_at
before update on public.budgets
for each row execute function public.set_updated_at();

create trigger budget_categories_set_updated_at
before update on public.budget_categories
for each row execute function public.set_updated_at();

create trigger goals_set_updated_at
before update on public.goals
for each row execute function public.set_updated_at();

create trigger goal_links_set_updated_at
before update on public.goal_links
for each row execute function public.set_updated_at();

create trigger goal_contributions_set_updated_at
before update on public.goal_contributions
for each row execute function public.set_updated_at();

create trigger notifications_set_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

create trigger notification_settings_set_updated_at
before update on public.notification_settings
for each row execute function public.set_updated_at();

create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

create trigger audit_logs_set_updated_at
before update on public.audit_logs
for each row execute function public.set_updated_at();

create trigger backups_set_updated_at
before update on public.backups
for each row execute function public.set_updated_at();

alter table public.currencies enable row level security;
alter table public.profiles enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.people enable row level security;
alter table public.tags enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.scheduled_transactions enable row level security;
alter table public.portfolios enable row level security;
alter table public.platforms enable row level security;
alter table public.investment_assets enable row level security;
alter table public.assets enable row level security;
alter table public.holdings enable row level security;
alter table public.transactions enable row level security;
alter table public.transfers enable row level security;
alter table public.transaction_tags enable row level security;
alter table public.attachments enable row level security;
alter table public.investment_transactions enable row level security;
alter table public.dividends enable row level security;
alter table public.asset_prices enable row level security;
alter table public.asset_valuations enable row level security;
alter table public.receivables enable row level security;
alter table public.liabilities enable row level security;
alter table public.loans enable row level security;
alter table public.loan_payments enable row level security;
alter table public.installments enable row level security;
alter table public.installment_payments enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_categories enable row level security;
alter table public.goals enable row level security;
alter table public.goal_links enable row level security;
alter table public.goal_contributions enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_settings enable row level security;
alter table public.user_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.backups enable row level security;

create policy "Authenticated users can read currencies"
on public.currencies
for select to authenticated
using (true);

create policy "Users can manage their own profiles"
on public.profiles
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own exchange rates"
on public.exchange_rates
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own accounts"
on public.accounts
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own categories"
on public.categories
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own people"
on public.people
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own tags"
on public.tags
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own recurring rules"
on public.recurring_rules
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own scheduled transactions"
on public.scheduled_transactions
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own portfolios"
on public.portfolios
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own platforms"
on public.platforms
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own investment assets"
on public.investment_assets
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own assets"
on public.assets
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own holdings"
on public.holdings
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own transactions"
on public.transactions
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own transfers"
on public.transfers
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own transaction tags"
on public.transaction_tags
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own attachments"
on public.attachments
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own investment transactions"
on public.investment_transactions
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own dividends"
on public.dividends
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own asset prices"
on public.asset_prices
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own asset valuations"
on public.asset_valuations
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own receivables"
on public.receivables
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own liabilities"
on public.liabilities
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own loans"
on public.loans
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own loan payments"
on public.loan_payments
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own installments"
on public.installments
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own installment payments"
on public.installment_payments
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own budgets"
on public.budgets
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own budget categories"
on public.budget_categories
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own goals"
on public.goals
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own goal links"
on public.goal_links
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own goal contributions"
on public.goal_contributions
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own notifications"
on public.notifications
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own notification settings"
on public.notification_settings
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own settings"
on public.user_settings
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can read their own audit logs"
on public.audit_logs
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can manage their own backups"
on public.backups
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);