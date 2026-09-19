import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  EyeOff,
  Landmark,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/services/supabase';

type Account = {
  id: string;
  name: string;
  account_type: string;
  currency_code: string;
  bank_name: string | null;
  provider: string | null;
  opening_balance: number;
  credit_limit: number | null;
  statement_date: number | null;
  payment_due_date: number | null;
  status: string;
  notes: string | null;
};

type TransactionRow = {
  id: string;
  account_id: string | null;
  type: 'income' | 'expense';
  amount: number;
  currency_code: string;
  transaction_date: string;
  description: string | null;
  notes: string | null;
  status: string;
};

type AccountForm = {
  name: string;
  account_type: string;
  currency_code: string;
  opening_balance: string;
  bank_name: string;
  location: string;
  provider: string;
  credit_limit: string;
  statement_date: string;
  payment_due_date: string;
  current_outstanding: string;
  notes: string;
};

const CURRENCIES = [
  { code: 'EGP', label: 'EGP — Egyptian Pound' },
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'AED', label: 'AED — UAE Dirham' },
  { code: 'SAR', label: 'SAR — Saudi Riyal' },
];

const ACCOUNT_TYPES = [
  { value: 'bank', label: 'Bank Account' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'prepaid', label: 'Prepaid' },
  { value: 'wallet', label: 'E-Wallet' },
];

const PAYMENT_TYPES = ['bank', 'cash', 'prepaid', 'wallet'];

const EMPTY_FORM: AccountForm = {
  name: '',
  account_type: 'bank',
  currency_code: 'EGP',
  opening_balance: '0',
  bank_name: '',
  location: '',
  provider: '',
  credit_limit: '',
  statement_date: '',
  payment_due_date: '',
  current_outstanding: '0',
  notes: '',
};

const inputClass =
  'h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10';

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toLocaleString()} ${currency}`;
  }
}

function accountTypeLabel(value: string) {
  return (
    ACCOUNT_TYPES.find((item) => item.value === value)?.label ??
    value
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState<AccountForm>(EMPTY_FORM);

  const [showClosed, setShowClosed] = useState(false);
  const [search, setSearch] = useState('');

  const [selectedAccount, setSelectedAccount] =
    useState<Account | null>(null);

  async function loadData() {
    setLoading(true);
    setError('');

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError('Your session has expired. Please sign in again.');
      setLoading(false);
      return;
    }

    const [accountsResult, transactionsResult] =
      await Promise.all([
        supabase
          .from('accounts')
          .select(
            'id, name, account_type, currency_code, bank_name, provider, opening_balance, credit_limit, statement_date, payment_due_date, status, notes',
          )
          .eq('user_id', user.id)
          .order('name'),

        supabase
          .from('transactions')
          .select(
            'id, account_id, type, amount, currency_code, transaction_date, description, notes, status',
          )
          .eq('user_id', user.id)
          .in('type', ['income', 'expense'])
          .order('transaction_date', { ascending: false }),
      ]);

    if (accountsResult.error) {
      setError(accountsResult.error.message);
      setLoading(false);
      return;
    }

    if (transactionsResult.error) {
      setError(transactionsResult.error.message);
      setLoading(false);
      return;
    }

    setAccounts((accountsResult.data ?? []) as Account[]);
    setTransactions(
      (transactionsResult.data ?? []) as TransactionRow[],
    );
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const balances = useMemo(() => {
    const result: Record<string, number> = {};

    for (const account of accounts) {
      result[account.id] = Number(account.opening_balance || 0);
    }

    for (const transaction of transactions) {
      if (!transaction.account_id) continue;
      if (transaction.status !== 'completed') continue;
      if (!(transaction.account_id in result)) continue;

      const amount = Number(transaction.amount || 0);

      if (transaction.type === 'income') {
        result[transaction.account_id] += amount;
      } else if (transaction.type === 'expense') {
        result[transaction.account_id] -= amount;
      }
    }

    return result;
  }, [accounts, transactions]);

  const paymentAccounts = useMemo(
    () =>
      accounts.filter((account) =>
        PAYMENT_TYPES.includes(account.account_type),
      ),
    [accounts],
  );

  const creditCards = useMemo(
    () =>
      accounts.filter(
        (account) => account.account_type === 'credit_card',
      ),
    [accounts],
  );

  const visibleAccounts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return accounts.filter((account) => {
      if (!showClosed && account.status !== 'active') {
        return false;
      }

      if (!normalizedSearch) return true;

      return [
        account.name,
        account.bank_name,
        account.provider,
        account.currency_code,
        accountTypeLabel(account.account_type),
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalizedSearch),
        );
    });
  }, [accounts, search, showClosed]);

  const activeAccounts = accounts.filter(
    (account) => account.status === 'active',
  );

  const paymentActiveAccounts = paymentAccounts.filter(
    (account) => account.status === 'active',
  );

  const activeCreditCards = creditCards.filter(
    (account) => account.status === 'active',
  );

  const totalsByCurrency = useMemo(() => {
    const result: Record<string, number> = {};

    for (const account of activeAccounts) {
      result[account.currency_code] =
        (result[account.currency_code] ?? 0) +
        Number(balances[account.id] ?? 0);
    }

    return result;
  }, [activeAccounts, balances]);

  const paymentTotalsByCurrency = useMemo(() => {
    const result: Record<string, number> = {};

    for (const account of paymentActiveAccounts) {
      result[account.currency_code] =
        (result[account.currency_code] ?? 0) +
        Number(balances[account.id] ?? 0);
    }

    return result;
  }, [paymentActiveAccounts, balances]);

  const creditTotalsByCurrency = useMemo(() => {
    const result: Record<string, number> = {};

    for (const account of activeCreditCards) {
      result[account.currency_code] =
        (result[account.currency_code] ?? 0) +
        Math.max(0, -Number(balances[account.id] ?? 0));
    }

    return result;
  }, [activeCreditCards, balances]);

  const groupedAccounts = useMemo(() => {
    const groups = [
      { key: 'bank', label: 'Bank Accounts', types: ['bank'] },
      { key: 'cash', label: 'Cash Accounts', types: ['cash'] },
      { key: 'wallet', label: 'E-Wallets & Prepaid', types: ['wallet', 'prepaid'] },
      { key: 'credit', label: 'Credit Cards', types: ['credit_card'] },
    ];

    return groups
      .map((group) => ({
        ...group,
        accounts: visibleAccounts.filter((account) =>
          group.types.includes(account.account_type),
        ),
      }))
      .filter((group) => group.accounts.length > 0);
  }, [visibleAccounts]);

  const selectedTransactions = useMemo(() => {
    if (!selectedAccount) return [];

    return transactions
      .filter(
        (transaction) =>
          transaction.account_id === selectedAccount.id,
      )
      .sort((a, b) =>
        b.transaction_date.localeCompare(a.transaction_date),
      );
  }, [selectedAccount, transactions]);

  const selectedSummary = useMemo(() => {
    if (!selectedAccount) {
      return {
        income: 0,
        expenses: 0,
      };
    }

    return selectedTransactions.reduce(
      (summary, transaction) => {
        if (transaction.status !== 'completed') return summary;

        if (transaction.type === 'income') {
          summary.income += Number(transaction.amount || 0);
        } else {
          summary.expenses += Number(transaction.amount || 0);
        }

        return summary;
      },
      { income: 0, expenses: 0 },
    );
  }, [selectedAccount, selectedTransactions]);

  function openAdd(type = 'bank') {

    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      account_type: type,
      currency_code: 'EGP',
    });
    setError('');
    setModalOpen(true);
  }

  function openEdit(account: Account) {
    const isCredit = account.account_type === 'credit_card';

    setEditing(account);
    setForm({
      name: account.name,
      account_type: account.account_type,
      currency_code: account.currency_code,
      opening_balance: isCredit
        ? '0'
        : String(account.opening_balance ?? 0),
      bank_name: account.bank_name ?? '',
      location: account.notes ?? '',
      provider: account.provider ?? '',
      credit_limit:
        account.credit_limit == null
          ? ''
          : String(account.credit_limit),
      statement_date:
        account.statement_date == null
          ? ''
          : String(account.statement_date),
      payment_due_date:
        account.payment_due_date == null
          ? ''
          : String(account.payment_due_date),
      current_outstanding: isCredit
        ? String(Math.max(0, -(balances[account.id] ?? 0)))
        : '0',
      notes: account.notes ?? '',
    });

    setError('');
    setModalOpen(true);
  }

  function update(field: keyof AccountForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError('Account name is required.');
      return;
    }

    const isCredit = form.account_type === 'credit_card';

    const openingBalance = Number(
      isCredit ? -(Number(form.current_outstanding) || 0) : form.opening_balance,
    );

    if (!Number.isFinite(openingBalance)) {
      setError('Opening balance must be a valid number.');
      return;
    }

    const creditLimit = isCredit
      ? Number(form.credit_limit)
      : null;

    if (
      isCredit &&
      (!Number.isFinite(creditLimit) || creditLimit < 0)
    ) {
      setError('Credit limit must be zero or greater.');
      return;
    }

    const currentOutstanding = isCredit
      ? Number(form.current_outstanding)
      : 0;

    if (
      isCredit &&
      (!Number.isFinite(currentOutstanding) ||
        currentOutstanding < 0)
    ) {
      setError('Current outstanding must be zero or greater.');
      return;
    }

    if (
      isCredit &&
      creditLimit !== null &&
      currentOutstanding > creditLimit
    ) {
      setError(
        'Current outstanding cannot be greater than the credit limit.',
      );
      return;
    }

    const statementDate =
      form.statement_date.trim() === ''
        ? null
        : Number(form.statement_date);

    const paymentDueDate =
      form.payment_due_date.trim() === ''
        ? null
        : Number(form.payment_due_date);

    if (
      isCredit &&
      statementDate !== null &&
      (!Number.isInteger(statementDate) ||
        statementDate < 1 ||
        statementDate > 31)
    ) {
      setError('Statement day must be between 1 and 31.');
      return;
    }

    if (
      isCredit &&
      paymentDueDate !== null &&
      (!Number.isInteger(paymentDueDate) ||
        paymentDueDate < 1 ||
        paymentDueDate > 31)
    ) {
      setError('Payment due day must be between 1 and 31.');
      return;
    }

    setSaving(true);
    setError('');

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('Your session has expired. Please sign in again.');
      setSaving(false);
      return;
    }

    const payload = {
      name: form.name.trim(),
      account_type: form.account_type,
      currency_code: form.currency_code,
      opening_balance: openingBalance,
      bank_name: form.bank_name.trim() || null,
      provider:
        form.account_type === 'wallet' && form.provider.trim()
          ? form.provider.trim()
          : null,
      credit_limit: creditLimit,
      statement_date: isCredit ? statementDate : null,
      payment_due_date: isCredit ? paymentDueDate : null,
      notes:
        form.account_type === 'cash'
          ? form.location.trim() || form.notes.trim() || null
          : form.notes.trim() || null,
    };

    const result = editing
      ? await supabase
          .from('accounts')
          .update(payload)
          .eq('id', editing.id)
          .eq('user_id', user.id)
      : await supabase
          .from('accounts')
          .insert({
            ...payload,
            user_id: user.id,
            status: 'active',
          });

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    await loadData();
  }

  async function closeAccount(account: Account) {
    if (account.status !== 'active') return;

    const accountBalance = Number(balances[account.id] ?? 0);

    const confirmed = window.confirm(
      accountBalance !== 0
        ? `"${account.name}" still has a balance of ${money(
            Math.abs(accountBalance),
            account.currency_code,
          )}. Close it anyway?`
        : `Close "${account.name}"?`,
    );

    if (!confirmed) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('Your session has expired. Please sign in again.');
      return;
    }

    const { error: closeError } = await supabase
      .from('accounts')
      .update({ status: 'closed' })
      .eq('id', account.id)
      .eq('user_id', user.id);

    if (closeError) {
      setError(closeError.message);
      return;
    }

    await loadData();
  }

  async function reopenAccount(account: Account) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('Your session has expired. Please sign in again.');
      return;
    }

    const { error: reopenError } = await supabase
      .from('accounts')
      .update({ status: 'active' })
      .eq('id', account.id)
      .eq('user_id', user.id);

    if (reopenError) {
      setError(reopenError.message);
      return;
    }

    await loadData();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Money</p>
          <h2 className="mt-1 font-display text-[34px] font-extrabold tracking-[-0.06em]">
            Accounts
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Manage all your bank accounts, cash, wallets, and credit cards in one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowClosed((value) => !value)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-bold"
          >
            {showClosed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {showClosed ? 'Hide closed' : 'Show closed'}
          </button>

          <button
            onClick={() => openAdd()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground"
          >
            <Plus className="size-4" />
            Add Account
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => { window.location.href = '/money'; }}
        className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        ← Money Hub
      </button>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4 card-shadow">
            <p className="text-xs font-semibold text-muted-foreground">Total Accounts</p>
            <p className="mt-2 font-display text-xl font-bold">{activeAccounts.length}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Active accounts</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 card-shadow">
            <p className="text-xs font-semibold text-muted-foreground">Payment Accounts</p>
            <p className="mt-2 font-display text-xl font-bold">
              {Object.entries(paymentTotalsByCurrency).length === 1
                ? money(Object.values(paymentTotalsByCurrency)[0], Object.keys(paymentTotalsByCurrency)[0])
                : `${paymentActiveAccounts.length} accounts`}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Bank, cash, wallets & prepaid</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 card-shadow">
            <p className="text-xs font-semibold text-muted-foreground">Credit Cards</p>
            <p className="mt-2 font-display text-xl font-bold">
              {Object.entries(creditTotalsByCurrency).length === 1
                ? money(Object.values(creditTotalsByCurrency)[0], Object.keys(creditTotalsByCurrency)[0])
                : `${activeCreditCards.length} cards`}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Total outstanding</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 card-shadow">
            <p className="text-xs font-semibold text-muted-foreground">Currencies</p>
            <p className="mt-2 font-display text-xl font-bold">{Object.keys(totalsByCurrency).length}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {Object.keys(totalsByCurrency).join(' · ') || 'No active accounts'}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className={`${inputClass} pl-10`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search accounts..."
          />
        </div>

        <button
          onClick={loadData}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-xs font-bold"
        >
          <RefreshCw className="size-4" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card px-5 py-14 text-center text-sm text-muted-foreground">
          Loading accounts...
        </div>
      ) : groupedAccounts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-14 text-center card-shadow">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary">
            <WalletCards className="size-5 text-primary" />
          </div>
          <h3 className="mt-4 font-display text-base font-bold">No accounts found</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            Add your first account to start tracking balances and transactions.
          </p>
          <button
            onClick={() => openAdd()}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground"
          >
            <Plus className="size-4" />
            Add Account
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedAccounts.map((group) => {
            const groupTotal = group.accounts.reduce((sum, account) => {
              const balance = Number(balances[account.id] ?? 0);
              return sum + (account.account_type === 'credit_card' ? Math.max(0, -balance) : balance);
            }, 0);
            const groupCurrency = group.accounts.every((account) => account.currency_code === group.accounts[0]?.currency_code)
              ? group.accounts[0]?.currency_code
              : null;

            return (
              <section key={group.key}>
                <div className="mb-2 flex items-center justify-between px-1">
                  <h3 className="font-display text-base font-bold">{group.label}</h3>
                  <span className="text-xs text-muted-foreground">
                    {groupCurrency ? `Total: ${money(groupTotal, groupCurrency)}` : `${group.accounts.length} accounts`}
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border bg-card card-shadow">
                  <div className="divide-y divide-border">
                    {group.accounts.map((account) => {
                      const balance = Number(balances[account.id] ?? 0);
                      const isCredit = account.account_type === 'credit_card';
                      const amount = isCredit ? Math.max(0, -balance) : balance;
                      const availableCredit = isCredit
                        ? Math.max(0, Number(account.credit_limit ?? 0) - amount)
                        : 0;
                      const isClosed = account.status !== 'active';

                      return (
                        <div
                          key={account.id}
                          className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedAccount(account)}
                            className="flex min-w-0 items-center gap-3 text-left"
                          >
                            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary">
                              {isCredit ? <Landmark className="size-5 text-primary" /> : <WalletCards className="size-5 text-primary" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="truncate text-sm font-bold">{account.name}</h4>
                                {isClosed && (
                                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Closed</span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {accountTypeLabel(account.account_type)}
                                {account.bank_name ? ` · ${account.bank_name}` : ''}
                                {account.account_type === 'cash' && account.notes ? ` · ${account.notes}` : ''}
                                {(account.account_type === 'wallet' || account.account_type === 'prepaid') && account.provider ? ` · ${account.provider}` : ''}
                                {` · ${account.currency_code}`}
                              </p>
                            </div>
                          </button>

                          <div className="flex items-center justify-between gap-4 sm:justify-end">
                            <div className="text-right">
                              <p className={`font-display text-base font-bold ${isCredit ? 'text-destructive' : ''}`}>
                                {isCredit ? `- ${money(amount, account.currency_code)}` : money(amount, account.currency_code)}
                              </p>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {isCredit ? `Outstanding · Available ${money(availableCredit, account.currency_code)}` : 'Current balance'}
                              </p>
                            </div>

                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => openEdit(account)}
                                className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                                aria-label="Edit account"
                              >
                                <Pencil className="size-4" />
                              </button>
                              {isClosed ? (
                                <button
                                  type="button"
                                  onClick={() => reopenAccount(account)}
                                  className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
                                  aria-label="Reopen account"
                                >
                                  <Eye className="size-4" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => closeAccount(account)}
                                  className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                  aria-label="Close account"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 p-3 backdrop-blur-sm sm:items-center">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-4">
              <div>
                <p className="text-xs font-semibold text-primary">
                  Account details
                </p>

                <h3 className="font-display text-lg font-bold">
                  {selectedAccount.name}
                </h3>
              </div>

              <button
                onClick={() => setSelectedAccount(null)}
                className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {(() => {
                const balance = Number(
                  balances[selectedAccount.id] ?? 0,
                );
                const isCredit =
                  selectedAccount.account_type === 'credit_card';
                const outstanding = isCredit
                  ? Math.max(0, -balance)
                  : balance;
                const availableCredit = isCredit
                  ? Math.max(
                      0,
                      Number(
                        selectedAccount.credit_limit ?? 0,
                      ) - outstanding,
                    )
                  : 0;

                return (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-border p-4">
                        <p className="text-[11px] font-semibold text-muted-foreground">
                          {isCredit
                            ? 'Outstanding'
                            : 'Current balance'}
                        </p>

                        <p className="mt-2 font-display text-xl font-bold">
                          {money(
                            isCredit
                              ? outstanding
                              : balance,
                            selectedAccount.currency_code,
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border p-4">
                        <p className="text-[11px] font-semibold text-muted-foreground">
                          Total income
                        </p>

                        <p className="mt-2 font-display text-xl font-bold">
                          {money(
                            selectedSummary.income,
                            selectedAccount.currency_code,
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border p-4">
                        <p className="text-[11px] font-semibold text-muted-foreground">
                          Total expenses
                        </p>

                        <p className="mt-2 font-display text-xl font-bold">
                          {money(
                            selectedSummary.expenses,
                            selectedAccount.currency_code,
                          )}
                        </p>
                      </div>
                    </div>

                    {isCredit && (
                      <div className="rounded-2xl border border-border bg-secondary/40 p-4">
                        <div className="flex flex-wrap gap-5 text-xs">
                          <span>
                            Credit limit:{' '}
                            <strong>
                              {money(
                                Number(
                                  selectedAccount.credit_limit ?? 0,
                                ),
                                selectedAccount.currency_code,
                              )}
                            </strong>
                          </span>

                          <span>
                            Available:{' '}
                            <strong>
                              {money(
                                availableCredit,
                                selectedAccount.currency_code,
                              )}
                            </strong>
                          </span>

                          {selectedAccount.statement_date && (
                            <span>
                              Statement day:{' '}
                              <strong>
                                {selectedAccount.statement_date}
                              </strong>
                            </span>
                          )}

                          {selectedAccount.payment_due_date && (
                            <span>
                              Due day:{' '}
                              <strong>
                                {selectedAccount.payment_due_date}
                              </strong>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-display text-base font-bold">
                    Transactions
                  </h4>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Only transactions belonging to this account.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(selectedAccount)}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-border px-3 text-xs font-bold"
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </button>

                  <button
                    onClick={() => {
                      window.location.href =
                        `/expenses?account=${selectedAccount.id}`;
                    }}
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground"
                  >
                    <Plus className="size-3.5" />
                    Add transaction
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border">
                {selectedTransactions.length === 0 ? (
                  <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                    No transactions for this account yet.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {selectedTransactions.map(
                      (transaction) => (
                        <div
                          key={transaction.id}
                          className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                        >
                          <div>
                            <p className="text-sm font-semibold">
                              {transaction.description ||
                                'Untitled transaction'}
                            </p>

                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {formatDate(
                                transaction.transaction_date,
                              )}
                              {' · '}
                              {transaction.status}
                            </p>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold ${
                              transaction.type === 'income'
                                ? 'text-primary'
                                : 'text-destructive'
                            }`}
                          >
                            {transaction.type === 'income' ? (
                              <ArrowDownLeft className="size-3.5" />
                            ) : (
                              <ArrowUpRight className="size-3.5" />
                            )}
                            {transaction.type === 'income'
                              ? '+'
                              : '-'}
                            {money(
                              Number(transaction.amount),
                              transaction.currency_code,
                            )}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 p-3 backdrop-blur-sm sm:items-center">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-4">
              <div>
                <p className="text-xs font-semibold text-primary">
                  Money
                </p>

                <h3 className="font-display text-lg font-bold">
                  {editing
                    ? 'Edit account'
                    : form.account_type === 'credit_card'
                      ? 'Add credit card'
                      : 'Add account'}
                </h3>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-5 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-xs font-bold">
                    Account name *
                  </span>

                  <input
                    className={inputClass}
                    value={form.name}
                    onChange={(event) =>
                      update('name', event.target.value)
                    }
                    placeholder={
                      form.account_type === 'credit_card'
                        ? 'CIB Visa'
                        : 'CIB Current Account'
                    }
                    required
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-bold">
                    Account type *
                  </span>

                  <select
                    className={inputClass}
                    value={form.account_type}
                    onChange={(event) => {
                      const nextType =
                        event.target.value;

                      setForm((current) => ({
                        ...current,
                        account_type: nextType,
                        opening_balance:
                          nextType === 'credit_card'
                            ? '0'
                            : current.opening_balance,
                        current_outstanding:
                          nextType === 'credit_card'
                            ? current.current_outstanding
                            : '0',
                      }));
                    }}
                  >
                    {ACCOUNT_TYPES.map((item) => (
                      <option
                        key={item.value}
                        value={item.value}
                      >
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                {form.account_type === 'bank' && (
                  <label>
                    <span className="mb-2 block text-xs font-bold">
                      Bank / Institution *
                    </span>

                    <input
                      className={inputClass}
                      value={form.bank_name}
                      onChange={(event) =>
                        update(
                          'bank_name',
                          event.target.value,
                        )
                      }
                      placeholder="CIB"
                      required
                    />
                  </label>
                )}

                {form.account_type === 'cash' && (
                  <label>
                    <span className="mb-2 block text-xs font-bold">
                      Location / Wallet Name *
                    </span>

                    <input
                      className={inputClass}
                      value={form.location}
                      onChange={(event) =>
                        update(
                          'location',
                          event.target.value,
                        )
                      }
                      placeholder="Home cash"
                      required
                    />
                  </label>
                )}

                {form.account_type === 'wallet' && (
                  <label>
                    <span className="mb-2 block text-xs font-bold">
                      Provider *
                    </span>

                    <input
                      className={inputClass}
                      value={form.provider}
                      onChange={(event) =>
                        update(
                          'provider',
                          event.target.value,
                        )
                      }
                      placeholder="Vodafone Cash"
                      required
                    />
                  </label>
                )}

                {form.account_type === 'credit_card' && (
                  <label>
                    <span className="mb-2 block text-xs font-bold">
                      Bank / Provider *
                    </span>

                    <input
                      className={inputClass}
                      value={form.bank_name}
                      onChange={(event) =>
                        update(
                          'bank_name',
                          event.target.value,
                        )
                      }
                      placeholder="CIB"
                      required
                    />
                  </label>
                )}

                <label>
                  <span className="mb-2 block text-xs font-bold">
                    Currency *
                  </span>

                  <select
                    className={inputClass}
                    value={form.currency_code}
                    onChange={(event) =>
                      update(
                        'currency_code',
                        event.target.value,
                      )
                    }
                  >
                    {CURRENCIES.map((currency) => (
                      <option
                        key={currency.code}
                        value={currency.code}
                      >
                        {currency.label}
                      </option>
                    ))}
                  </select>

                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    More currencies can be added later from Settings.
                  </span>
                </label>

                {form.account_type !== 'credit_card' && (
                  <label>
                    <span className="mb-2 block text-xs font-bold">
                      Opening balance
                    </span>

                    <input
                      className={inputClass}
                      type="number"
                      step="0.01"
                      value={form.opening_balance}
                      onChange={(event) =>
                        update(
                          'opening_balance',
                          event.target.value,
                        )
                      }
                    />
                  </label>
                )}

                {form.account_type === 'credit_card' && (
                  <>
                    <label>
                      <span className="mb-2 block text-xs font-bold">
                        Credit limit *
                      </span>

                      <input
                        className={inputClass}
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.credit_limit}
                        onChange={(event) =>
                          update(
                            'credit_limit',
                            event.target.value,
                          )
                        }
                        placeholder="50,000"
                        required
                      />
                    </label>

                    <label>
                      <span className="mb-2 block text-xs font-bold">
                        Current outstanding
                      </span>

                      <input
                        className={inputClass}
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.current_outstanding}
                        onChange={(event) =>
                          update(
                            'current_outstanding',
                            event.target.value,
                          )
                        }
                        placeholder="0"
                      />
                    </label>

                    <label>
                      <span className="mb-2 block text-xs font-bold">
                        Statement day
                      </span>

                      <input
                        className={inputClass}
                        type="number"
                        min="1"
                        max="31"
                        step="1"
                        value={form.statement_date}
                        onChange={(event) =>
                          update(
                            'statement_date',
                            event.target.value,
                          )
                        }
                        placeholder="1 - 31"
                      />
                    </label>

                    <label>
                      <span className="mb-2 block text-xs font-bold">
                        Payment due day
                      </span>

                      <input
                        className={inputClass}
                        type="number"
                        min="1"
                        max="31"
                        step="1"
                        value={form.payment_due_date}
                        onChange={(event) =>
                          update(
                            'payment_due_date',
                            event.target.value,
                          )
                        }
                        placeholder="1 - 31"
                      />
                    </label>
                  </>
                )}

                <label className="sm:col-span-2">
                  <span className="mb-2 block text-xs font-bold">
                    Notes
                  </span>

                  <textarea
                    className={`${inputClass} min-h-24 py-3`}
                    value={form.notes}
                    onChange={(event) =>
                      update('notes', event.target.value)
                    }
                    placeholder="Optional notes..."
                  />
                </label>
              </div>

              {error && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-border pt-5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-10 rounded-xl border border-border px-4 text-xs font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground disabled:opacity-60"
                >
                  {saving
                    ? 'Saving...'
                    : editing
                      ? 'Save changes'
                      : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
