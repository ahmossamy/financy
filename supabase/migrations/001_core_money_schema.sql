-- Financy core money schema
-- This migration creates the database foundation only.
-- It intentionally does not insert user financial data.

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  language text default 'en',
  base_currency text default 'EGP',
  date_format text default 'DD/MM/YYYY',
  number_format text default '1,234.56',
  theme text default 'system',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint profiles_user_id_key unique (user_id)
);

create table public.currencies (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  symbol text,
  decimal_places integer default 2,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  from_currency text not null references public.currencies(code),
  to_currency text not null references public.currencies(code),
  rate numeric(20, 8) not null check (rate > 0),
  rate_date date not null,
  source text default 'manual',
  created_at timestamptz default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  account_type text not null,
  currency_code text not null references public.currencies(code),
  bank_name text,
  provider text,
  opening_balance numeric(20, 4) default 0,
  credit_limit numeric(20, 4),
  account_number text,
  iban text,
  mobile_number text,
  statement_date integer,
  payment_due_date integer,
  status text default 'active',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
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
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  parent_id uuid references public.categories(id) on delete set null,
  icon text,
  color text,
  sort_order integer default 0,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint categories_type_check check (type in ('expense', 'income'))
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  notes text,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  person_id uuid references public.people(id) on delete set null,
  amount numeric(20, 4) not null check (amount > 0),
  currency_code text not null references public.currencies(code),
  transaction_date date not null,
  transaction_time time,
  status text default 'completed',
  description text,
  notes text,
  recurring_id uuid,
  transfer_id uuid,
  goal_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
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
  from_account_id uuid not null references public.accounts(id),
  to_account_id uuid not null references public.accounts(id),
  amount numeric(20, 4) not null check (amount > 0),
  currency_code text not null references public.currencies(code),
  exchange_rate numeric(20, 8) check (exchange_rate is null or exchange_rate > 0),
  received_amount numeric(20, 4),
  fee numeric(20, 4) default 0 check (fee >= 0),
  fee_transaction_id uuid,
  transfer_date date not null,
  status text default 'completed',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint transfers_status_check check (
    status in ('pending', 'completed', 'cancelled')
  ),
  constraint transfers_distinct_accounts_check check (
    from_account_id <> to_account_id
  )
);

create table public.transaction_tags (
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (transaction_id, tag_id)
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  file_name text not null,
  file_type text,
  file_size bigint,
  storage_path text not null,
  created_at timestamptz default now()
);

insert into public.currencies (code, name, symbol, decimal_places)
values
  ('EGP', 'Egyptian Pound', 'ج.م', 2),
  ('USD', 'US Dollar', '$', 2),
  ('EUR', 'Euro', '€', 2),
  ('SAR', 'Saudi Riyal', '﷼', 2),
  ('AED', 'United Arab Emirates Dirham', 'د.إ', 2),
  ('GBP', 'British Pound', '£', 2)
on conflict (code) do nothing;

create index idx_profiles_user_id
  on public.profiles(user_id);

create index idx_exchange_rates_user_id
  on public.exchange_rates(user_id);

create index idx_exchange_rates_rate_date
  on public.exchange_rates(rate_date);

create index idx_accounts_user_id
  on public.accounts(user_id);

create index idx_accounts_currency_code
  on public.accounts(currency_code);

create index idx_categories_user_id
  on public.categories(user_id);

create index idx_categories_parent_id
  on public.categories(parent_id);

create index idx_people_user_id
  on public.people(user_id);

create index idx_tags_user_id
  on public.tags(user_id);

create index idx_transaction_tags_tag_id
  on public.transaction_tags(tag_id);

create index idx_transactions_user_id
  on public.transactions(user_id);

create index idx_transactions_transaction_date
  on public.transactions(transaction_date);

create index idx_transactions_account_id
  on public.transactions(account_id);

create index idx_transactions_category_id
  on public.transactions(category_id);

create index idx_transactions_transfer_id
  on public.transactions(transfer_id);

create index idx_transfers_user_id
  on public.transfers(user_id);

create index idx_transfers_transfer_date
  on public.transfers(transfer_date);

create index idx_transfers_from_account_id
  on public.transfers(from_account_id);

create index idx_transfers_to_account_id
  on public.transfers(to_account_id);

create index idx_attachments_user_id
  on public.attachments(user_id);

create index idx_attachments_entity
  on public.attachments(entity_type, entity_id);

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

create trigger profiles_set_updated_at
before update on public.profiles
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

create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

create trigger transfers_set_updated_at
before update on public.transfers
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.currencies enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.people enable row level security;
alter table public.tags enable row level security;
alter table public.transactions enable row level security;
alter table public.transfers enable row level security;
alter table public.transaction_tags enable row level security;
alter table public.attachments enable row level security;

create policy "Users can manage their own profile"
on public.profiles
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Authenticated users can read currencies"
on public.currencies
for select to authenticated
using (true);

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
using (
  exists (
    select 1
    from public.transactions
    where public.transactions.id = transaction_tags.transaction_id
      and public.transactions.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.transactions
    where public.transactions.id = transaction_tags.transaction_id
      and public.transactions.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.tags
    where public.tags.id = transaction_tags.tag_id
      and public.tags.user_id = (select auth.uid())
  )
);

create policy "Users can manage their own attachments"
on public.attachments
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);