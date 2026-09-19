import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Eye,
  EyeOff,
  Landmark,
  Pencil,
  Plus,
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
  account_id: string | null;
  type: string;
  amount: number;
  currency_code: string;
  status: string;
};

type AccountForm = {
  name: string;
  account_type: string;
  currency_code: string;
  opening_balance: string;
  bank_name: string;
  provider: string;
  credit_limit: string;
  statement_date: string;
  payment_due_date: string;
  notes: string;
};

const EMPTY_FORM: AccountForm = {
  name: '',
  account_type: 'bank',
  currency_code: 'EGP',
  opening_balance: '0',
  bank_name: '',
  provider: '',
  credit_limit: '',
  statement_date: '',
  payment_due_date: '',
  notes: '',
};

const ACCOUNT_TYPES = [
  ['bank', 'Bank Account'],
  ['cash', 'Cash'],
  ['credit_card', 'Credit Card'],
  ['prepaid', 'Prepaid'],
  ['wallet', 'E-Wallet'],
  ['investment_cash', 'Investment Cash'],
];

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
    ACCOUNT_TYPES.find(([type]) => type === value)?.[1] ?? value
  );
}

const inputClass =
  'h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10';

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

    const [accountsResult, transactionsResult] = await Promise.all([
      supabase
        .from('accounts')
        .select(
          'id, name, account_type, currency_code, bank_name, provider, opening_balance, credit_limit, statement_date, payment_due_date, status, notes',
        )
        .eq('user_id', user.id)
        .order('name'),

      supabase
        .from('transactions')
        .select('account_id, type, amount, currency_code, status')
        .eq('user_id', user.id)
        .in('type', ['income', 'expense']),
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

  const visibleAccounts = useMemo(
    () =>
      showClosed
        ? accounts
        : accounts.filter((account) => account.status === 'active'),
    [accounts, showClosed],
  );

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
      }

      if (transaction.type === 'expense') {
        result[transaction.account_id] -= amount;
      }
    }

    return result;
  }, [accounts, transactions]);

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.status === 'active'),
    [accounts],
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

  const totalOpeningByCurrency = useMemo(() => {
    const result: Record<string, number> = {};

    for (const account of activeAccounts) {
      result[account.currency_code] =
        (result[account.currency_code] ?? 0) +
        Number(account.opening_balance || 0);
    }

    return result;
  }, [activeAccounts]);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setForm({
      name: account.name,
      account_type: account.account_type,
      currency_code: account.currency_code,
      opening_balance: String(account.opening_balance ?? 0),
      bank_name: account.bank_name ?? '',
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

    const openingBalance = Number(form.opening_balance);

    if (!Number.isFinite(openingBalance)) {
      setError('Opening balance must be a valid number.');
      return;
    }

    const creditLimit =
      form.credit_limit.trim() === ''
        ? null
        : Number(form.credit_limit);

    if (
      creditLimit !== null &&
      (!Number.isFinite(creditLimit) || creditLimit < 0)
    ) {
      setError('Credit limit must be zero or greater.');
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
      statementDate !== null &&
      (!Number.isInteger(statementDate) ||
        statementDate < 1 ||
        statementDate > 31)
    ) {
      setError('Statement day must be between 1 and 31.');
      return;
    }

    if (
      paymentDueDate !== null &&
      (!Number.isInteger(paymentDueDate) ||
        paymentDueDate < 1 ||
        paymentDueDate > 31)
    ) {
      setError('Payment due day must be between 1 and 31.');
      return;
    }

    if (
      form.account_type === 'credit_card' &&
      creditLimit === null
    ) {
      setError('Please enter a credit limit for a credit card.');
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
      currency_code: form.currency_code.trim().toUpperCase(),
      opening_balance: openingBalance,
      bank_name: form.bank_name.trim() || null,
      provider: form.provider.trim() || null,
      credit_limit: creditLimit,
      statement_date: statementDate,
      payment_due_date: paymentDueDate,
      notes: form.notes.trim() || null,
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
            accountBalance,
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

  const currencySummary = Object.entries(totalsByCurrency);
  const openingSummary = Object.entries(totalOpeningByCurrency);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-primary">
            Money
          </p>

          <h2 className="mt-1 font-display text-[34px] font-extrabold tracking-[-0.06em]">
            Accounts
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Manage the places where your money lives.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowClosed((value) => !value)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-bold"
          >
            {showClosed ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
            {showClosed ? 'Hide closed' : 'Show closed'}
          </button>

          <button
            onClick={openAdd}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground"
          >
            <Plus className="size-4" />
            Add account
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && activeAccounts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {currencySummary.map(([currency, total]) => (
            <div
              key={currency}
              className="rounded-2xl border border-border bg-card p-5 card-shadow"
            >
              <p className="text-xs font-semibold text-muted-foreground">
                Current balance
              </p>

              <p className="mt-2 font-display text-2xl font-bold tracking-[-0.04em]">
                {money(total, currency)}
              </p>

              <p className="mt-1 text-[11px] text-muted-foreground">
                {activeAccounts.filter(
                  (account) => account.currency_code === currency,
                ).length}{' '}
                active account(s)
              </p>
            </div>
          ))}

          {openingSummary.map(([currency, total]) => (
            <div
              key={`opening-${currency}`}
              className="rounded-2xl border border-dashed border-border bg-background p-5"
            >
              <p className="text-xs font-semibold text-muted-foreground">
                Opening balance
              </p>

              <p className="mt-2 font-display text-2xl font-bold tracking-[-0.04em]">
                {money(total, currency)}
              </p>

              <p className="mt-1 text-[11px] text-muted-foreground">
                Before recorded income and expenses
              </p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-border bg-card px-5 py-14 text-center text-sm text-muted-foreground">
          Loading accounts...
        </div>
      ) : visibleAccounts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-14 text-center card-shadow">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary">
            <WalletCards className="size-5 text-primary" />
          </div>

          <h3 className="mt-4 font-display text-base font-bold">
            {showClosed
              ? 'No accounts yet'
              : 'No active accounts'}
          </h3>

          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            {showClosed
              ? 'Add your first account to begin building your money view.'
              : 'Add an account or show closed accounts to review your existing accounts.'}
          </p>

          <button
            onClick={openAdd}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground"
          >
            <Plus className="size-4" />
            Add account
          </button>
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-border bg-card card-shadow">
          <div className="border-b border-border px-5 py-4">
            <h3 className="font-display text-sm font-bold">
              Your accounts
            </h3>

            <p className="mt-1 text-xs text-muted-foreground">
              {visibleAccounts.length}{' '}
              {showClosed ? 'account(s)' : 'active account(s)'}
            </p>
          </div>

          <div className="divide-y divide-border">
            {visibleAccounts.map((account) => {
              const balance = Number(balances[account.id] ?? 0);
              const isClosed = account.status !== 'active';

              return (
                <div
                  key={account.id}
                  className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary">
                      {account.account_type === 'bank' ? (
                        <Landmark className="size-5 text-primary" />
                      ) : (
                        <WalletCards className="size-5 text-primary" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate text-sm font-bold">
                          {account.name}
                        </h4>

                        {isClosed && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            Closed
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {accountTypeLabel(account.account_type)}
                        {account.bank_name
                          ? ` · ${account.bank_name}`
                          : ''}
                        {account.provider
                          ? ` · ${account.provider}`
                          : ''}
                      </p>

                      {account.account_type === 'credit_card' && (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {account.credit_limit != null
                            ? `Limit: ${money(
                                Number(account.credit_limit),
                                account.currency_code,
                              )}`
                            : 'Credit limit not set'}
                          {account.payment_due_date
                            ? ` · Due day: ${account.payment_due_date}`
                            : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-5 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="font-display text-base font-bold">
                        {money(balance, account.currency_code)}
                      </p>

                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Current balance
                      </p>

                      <p className="text-[10px] text-muted-foreground">
                        Opening:{' '}
                        {money(
                          Number(account.opening_balance || 0),
                          account.currency_code,
                        )}
                      </p>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(account)}
                        className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Edit account"
                      >
                        <Pencil className="size-4" />
                      </button>

                      {isClosed ? (
                        <button
                          onClick={() => reopenAccount(account)}
                          className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Reopen account"
                          title="Reopen account"
                        >
                          <Eye className="size-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => closeAccount(account)}
                          className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Close account"
                          title="Close account"
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
        </section>
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
                  {editing ? 'Edit account' : 'Add account'}
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
                    onChange={(e) =>
                      update('name', e.target.value)
                    }
                    placeholder="CIB Current Account"
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
                    onChange={(e) =>
                      update('account_type', e.target.value)
                    }
                  >
                    {ACCOUNT_TYPES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-xs font-bold">
                    Currency *
                  </span>
                  <input
                    className={inputClass}
                    value={form.currency_code}
                    onChange={(e) =>
                      update(
                        'currency_code',
                        e.target.value.toUpperCase(),
                      )
                    }
                    maxLength={3}
                    required
                  />
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    Example: EGP, USD, SAR
                  </span>
                </label>

                <label>
                  <span className="mb-2 block text-xs font-bold">
                    Opening balance
                  </span>
                  <input
                    className={inputClass}
                    type="number"
                    step="0.01"
                    value={form.opening_balance}
                    onChange={(e) =>
                      update('opening_balance', e.target.value)
                    }
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-bold">
                    Bank / Institution
                  </span>
                  <input
                    className={inputClass}
                    value={form.bank_name}
                    onChange={(e) =>
                      update('bank_name', e.target.value)
                    }
                    placeholder="CIB"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-bold">
                    Provider
                  </span>
                  <input
                    className={inputClass}
                    value={form.provider}
                    onChange={(e) =>
                      update('provider', e.target.value)
                    }
                    placeholder="Thndr, Tilda, Vodafone..."
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-bold">
                    Credit limit
                  </span>
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.credit_limit}
                    onChange={(e) =>
                      update('credit_limit', e.target.value)
                    }
                    placeholder={
                      form.account_type === 'credit_card'
                        ? 'Required for credit cards'
                        : 'Optional'
                    }
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
                    onChange={(e) =>
                      update('statement_date', e.target.value)
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
                    onChange={(e) =>
                      update(
                        'payment_due_date',
                        e.target.value,
                      )
                    }
                    placeholder="1 - 31"
                  />
                </label>

                <label className="sm:col-span-2">
                  <span className="mb-2 block text-xs font-bold">
                    Notes
                  </span>
                  <textarea
                    className={`${inputClass} min-h-24 py-3`}
                    value={form.notes}
                    onChange={(e) =>
                      update('notes', e.target.value)
                    }
                    placeholder="Optional notes..."
                  />
                </label>
              </div>

              {form.account_type === 'credit_card' && (
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs leading-5 text-muted-foreground">
                  Credit card purchases will later be treated as
                  liabilities, while payments to the card will be
                  recorded as transfers. We will connect this fully
                  when Transfers and Liabilities are completed.
                </div>
              )}

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
                      : 'Create account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
