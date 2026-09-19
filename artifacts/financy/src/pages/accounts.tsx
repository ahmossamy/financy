import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, WalletCards, X } from 'lucide-react';
import { supabase } from '@/lib/services/supabase';

type Account = {
  id: string;
  name: string;
  account_type: string;
  currency_code: string;
  bank_name: string | null;
  provider: string | null;
  opening_balance: number;
  status: string;
  notes: string | null;
};

type TransactionRow = {
  account_id: string | null;
  type: string;
  amount: number;
  status: string;
};

type AccountForm = {
  name: string;
  account_type: string;
  currency_code: string;
  opening_balance: string;
  bank_name: string;
  provider: string;
  account_number: string;
  iban: string;
  mobile_number: string;
  notes: string;
};

const EMPTY_FORM: AccountForm = {
  name: '',
  account_type: 'bank',
  currency_code: 'EGP',
  opening_balance: '0',
  bank_name: '',
  provider: '',
  account_number: '',
  iban: '',
  mobile_number: '',
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

const inputClass =
  'h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10';

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState<AccountForm>(EMPTY_FORM);

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
            'id, name, account_type, currency_code, bank_name, provider, opening_balance, status, notes',
          )
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('name'),

        supabase
          .from('transactions')
          .select('account_id, type, amount, status')
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

  const openingByCurrency = useMemo(() => {
    const result: Record<string, number> = {};

    for (const account of accounts) {
      result[account.currency_code] =
        (result[account.currency_code] ?? 0) +
        Number(account.opening_balance || 0);
    }

    return result;
  }, [accounts]);

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
      account_number: '',
      iban: '',
      mobile_number: '',
      notes: account.notes ?? '',
    });
    setError('');
    setModalOpen(true);
  }

  function update(
    field: keyof AccountForm,
    value: string,
  ) {
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
      currency_code: form.currency_code.toUpperCase(),
      opening_balance: openingBalance,
      bank_name: form.bank_name.trim() || null,
      provider: form.provider.trim() || null,
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
    await loadData();
  }

  async function remove(account: Account) {
    const confirmed = window.confirm(
      `Delete "${account.name}"?`,
    );

    if (!confirmed) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('Your session has expired. Please sign in again.');
      return;
    }

    const { error: deleteError } = await supabase
      .from('accounts')
      .update({ status: 'closed' })
      .eq('id', account.id)
      .eq('user_id', user.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await loadData();
  }

  const openingTotals = Object.entries(openingByCurrency);

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

        <button
          onClick={openAdd}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground"
        >
          <Plus className="size-4" />
          Add account
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {openingTotals.map(([currency, total]) => (
          <div
            key={currency}
            className="rounded-2xl border border-border bg-card p-5 card-shadow"
          >
            <p className="text-xs font-semibold text-muted-foreground">
              Opening balances
            </p>

            <p className="mt-2 font-display text-2xl font-bold tracking-[-0.04em]">
              {money(total, currency)}
            </p>

            <p className="mt-1 text-[11px] text-muted-foreground">
              {accounts.filter(
                (account) => account.currency_code === currency,
              ).length}{' '}
              active account(s)
            </p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card px-5 py-14 text-center text-sm text-muted-foreground">
          Loading accounts...
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-14 text-center card-shadow">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary">
            <WalletCards className="size-5 text-primary" />
          </div>

          <h3 className="mt-4 font-display text-base font-bold">
            Accounts are ready when you are
          </h3>

          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            Add your first account to begin building your money view.
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
              {accounts.length} active account(s)
            </p>
          </div>

          <div className="divide-y divide-border">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-xl bg-secondary">
                    <WalletCards className="size-5 text-primary" />
                  </div>

                  <div>
                    <h4 className="text-sm font-bold">
                      {account.name}
                    </h4>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {ACCOUNT_TYPES.find(
                        ([value]) =>
                          value === account.account_type,
                      )?.[1] ?? account.account_type}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-5 sm:justify-end">
                  <div className="text-left sm:text-right">
                    <p className="font-display text-base font-bold">
                      {money(
                        balances[account.id] ?? 0,
                        account.currency_code,
                      )}
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

                    <button
                      onClick={() => remove(account)}
                      className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Close account"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
                    {ACCOUNT_TYPES.map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
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
                        e.target.value,
                      )
                    }
                    maxLength={3}
                    required
                  />
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
                      update(
                        'opening_balance',
                        e.target.value,
                      )
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
                    Account number
                  </span>
                  <input
                    className={inputClass}
                    value={form.account_number}
                    onChange={(e) =>
                      update(
                        'account_number',
                        e.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-bold">
                    IBAN
                  </span>
                  <input
                    className={inputClass}
                    value={form.iban}
                    onChange={(e) =>
                      update('iban', e.target.value)
                    }
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-bold">
                    Mobile number
                  </span>
                  <input
                    className={inputClass}
                    value={form.mobile_number}
                    onChange={(e) =>
                      update(
                        'mobile_number',
                        e.target.value,
                      )
                    }
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
