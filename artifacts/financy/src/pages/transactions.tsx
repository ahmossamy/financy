import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/services/supabase';

type TransactionType = 'income' | 'expense';

type Account = {
  id: string;
  name: string;
  currency_code: string;
  status: string;
};

type Category = {
  id: string;
  name: string;
  status: string;
};

type Transaction = {
  id: string;
  account_id: string | null;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  currency_code: string;
  transaction_date: string;
  description: string | null;
  notes: string | null;
  status: string;
};

type TransactionForm = {
  account_id: string;
  category_id: string;
  amount: string;
  currency_code: string;
  transaction_date: string;
  description: string;
  notes: string;
};

const EMPTY_FORM: TransactionForm = {
  account_id: '',
  category_id: '',
  amount: '',
  currency_code: 'EGP',
  transaction_date: new Date().toISOString().slice(0, 10),
  description: '',
  notes: '',
};

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

const inputClass =
  'h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10';

export default function Transactions({
  defaultType = 'expense',
}: {
  defaultType?: TransactionType;
}) {
  const [activeType, setActiveType] =
    useState<TransactionType>(defaultType);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const [form, setForm] =
    useState<TransactionForm>(EMPTY_FORM);

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

    const [transactionsResult, accountsResult, categoriesResult] =
      await Promise.all([
        supabase
          .from('transactions')
          .select(
            'id, account_id, category_id, type, amount, currency_code, transaction_date, description, notes, status',
          )
          .eq('user_id', user.id)
          .in('type', ['income', 'expense'])
          .order('transaction_date', {
            ascending: false,
          }),

        supabase
          .from('accounts')
          .select('id, name, currency_code, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('name'),

        supabase
          .from('categories')
          .select('id, name, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('sort_order')
          .order('name'),
      ]);

    if (transactionsResult.error) {
      setError(transactionsResult.error.message);
      setLoading(false);
      return;
    }

    if (accountsResult.error) {
      setError(accountsResult.error.message);
      setLoading(false);
      return;
    }

    if (categoriesResult.error) {
      setError(categoriesResult.error.message);
      setLoading(false);
      return;
    }

    setTransactions(
      (transactionsResult.data ?? []) as Transaction[],
    );

    setAccounts(
      (accountsResult.data ?? []) as Account[],
    );

    setCategories(
      (categoriesResult.data ?? []) as Category[],
    );

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) => transaction.type === activeType,
      ),
    [transactions, activeType],
  );

  const totals = useMemo(() => {
    const result: Record<string, number> = {};

    filteredTransactions.forEach((transaction) => {
      result[transaction.currency_code] =
        (result[transaction.currency_code] ?? 0) +
        Number(transaction.amount || 0);
    });

    return result;
  }, [filteredTransactions]);

  function openAddModal() {
    setEditingTransaction(null);

    const firstAccount = accounts[0];

    setForm({
      ...EMPTY_FORM,
      currency_code:
        firstAccount?.currency_code ?? 'EGP',
      account_id: firstAccount?.id ?? '',
      category_id: categories[0]?.id ?? '',
    });

    setError('');
    setModalOpen(true);
  }

  function openEditModal(transaction: Transaction) {
    setEditingTransaction(transaction);

    setForm({
      account_id: transaction.account_id ?? '',
      category_id: transaction.category_id ?? '',
      amount: String(transaction.amount ?? ''),
      currency_code: transaction.currency_code,
      transaction_date: transaction.transaction_date,
      description: transaction.description ?? '',
      notes: transaction.notes ?? '',
    });

    setError('');
    setModalOpen(true);
  }

  function updateField(
    field: keyof TransactionForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleAccountChange(value: string) {
    const account = accounts.find(
      (item) => item.id === value,
    );

    setForm((current) => ({
      ...current,
      account_id: value,
      currency_code:
        account?.currency_code ?? current.currency_code,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!form.account_id) {
      setError('Please select an account.');
      return;
    }

    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }

    if (!form.transaction_date) {
      setError('Date is required.');
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
      account_id: form.account_id,
      category_id: form.category_id || null,
      type: activeType,
      amount,
      currency_code: form.currency_code,
      transaction_date: form.transaction_date,
      description: form.description.trim() || null,
      notes: form.notes.trim() || null,
      status: 'completed',
    };

    const result = editingTransaction
      ? await supabase
          .from('transactions')
          .update(payload)
          .eq('id', editingTransaction.id)
          .eq('user_id', user.id)
      : await supabase
          .from('transactions')
          .insert({
            ...payload,
            user_id: user.id,
          });

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setModalOpen(false);
    setEditingTransaction(null);
    setForm(EMPTY_FORM);

    await loadData();
  }

  async function deleteTransaction(
    transaction: Transaction,
  ) {
    const confirmed = window.confirm(
      `Delete "${transaction.description || activeType}"?`,
    );

    if (!confirmed) return;

    setError('');

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('Your session has expired. Please sign in again.');
      return;
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transaction.id)
      .eq('user_id', user.id);

    if (error) {
      setError(error.message);
      return;
    }

    await loadData();
  }

  const pageTitle =
    activeType === 'income' ? 'Income' : 'Expenses';

  const pageDescription =
    activeType === 'income'
      ? 'Record and manage the money coming into your accounts.'
      : 'Record and manage the money leaving your accounts.';

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-primary">
            Money
          </p>

          <h2 className="mt-1 font-display text-[34px] font-extrabold tracking-[-0.06em]">
            {pageTitle}
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {pageDescription}
          </p>
        </div>

        <button
          onClick={openAddModal}
          disabled={accounts.length === 0}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="size-4" />
          Add {activeType}
        </button>
      </div>

      <div className="inline-flex rounded-xl border border-border bg-card p-1">
        <button
          onClick={() => setActiveType('income')}
          className={`rounded-lg px-4 py-2 text-xs font-bold ${
            activeType === 'income'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          Income
        </button>

        <button
          onClick={() => setActiveType('expense')}
          className={`rounded-lg px-4 py-2 text-xs font-bold ${
            activeType === 'expense'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          Expenses
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {accounts.length === 0 && !loading && (
        <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5 text-sm">
          Add an account first before recording {pageTitle.toLowerCase()}.
        </div>
      )}

      {!loading && filteredTransactions.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(totals).map(
            ([currency, total]) => (
              <div
                key={currency}
                className="rounded-2xl border border-border bg-card p-5 card-shadow"
              >
                <p className="text-xs font-semibold text-muted-foreground">
                  Total {pageTitle.toLowerCase()}
                </p>

                <p className="mt-2 font-display text-2xl font-bold tracking-[-0.04em]">
                  {formatMoney(total, currency)}
                </p>

                <p className="mt-1 text-[11px] text-muted-foreground">
                  {filteredTransactions.length} transaction(s)
                </p>
              </div>
            ),
          )}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-card card-shadow">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="font-display text-sm font-bold">
              {pageTitle}
            </h3>

            <p className="mt-1 text-xs text-muted-foreground">
              {filteredTransactions.length} transaction(s)
            </p>
          </div>

          {activeType === 'income' ? (
            <ArrowDownLeft className="size-5 text-primary" />
          ) : (
            <ArrowUpRight className="size-5 text-primary" />
          )}
        </div>

        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            Loading transactions...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
              {activeType === 'income' ? (
                <ArrowDownLeft className="size-5" />
              ) : (
                <ArrowUpRight className="size-5" />
              )}
            </div>

            <h3 className="mt-4 font-display text-base font-bold">
              No {pageTitle.toLowerCase()} yet
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Add your first {activeType} to start building your
              financial history.
            </p>

            {accounts.length > 0 && (
              <button
                onClick={openAddModal}
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground"
              >
                <Plus className="size-4" />
                Add {activeType}
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTransactions.map((transaction) => {
              const account = accounts.find(
                (item) => item.id === transaction.account_id,
              );

              const category = categories.find(
                (item) => item.id === transaction.category_id,
              );

              return (
                <div
                  key={transaction.id}
                  className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                      {activeType === 'income' ? (
                        <ArrowDownLeft className="size-5" />
                      ) : (
                        <ArrowUpRight className="size-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-bold">
                        {transaction.description ||
                          category?.name ||
                          pageTitle}
                      </h4>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {account?.name || 'Account'}
                        {category?.name
                          ? ` • ${category.name}`
                          : ''}
                        {` • ${transaction.transaction_date}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-5 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="font-display text-base font-bold">
                        {formatMoney(
                          Number(transaction.amount),
                          transaction.currency_code,
                        )}
                      </p>

                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {transaction.status}
                      </p>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          openEditModal(transaction)
                        }
                        className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Edit transaction"
                      >
                        <Pencil className="size-4" />
                      </button>

                      <button
                        onClick={() =>
                          deleteTransaction(transaction)
                        }
                        className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete transaction"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 p-3 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-4">
              <div>
                <p className="text-xs font-semibold text-primary">
                  Money
                </p>

                <h3 className="font-display text-lg font-bold">
                  {editingTransaction
                    ? `Edit ${activeType}`
                    : `Add ${activeType}`}
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

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-5"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold">
                    Account *
                  </span>

                  <select
                    value={form.account_id}
                    onChange={(event) =>
                      handleAccountChange(
                        event.target.value,
                      )
                    }
                    className={inputClass}
                    required
                  >
                    <option value="">
                      Select account
                    </option>

                    {accounts.map((account) => (
                      <option
                        key={account.id}
                        value={account.id}
                      >
                        {account.name} —{' '}
                        {account.currency_code}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold">
                    Category
                  </span>

                  <select
                    value={form.category_id}
                    onChange={(event) =>
                      updateField(
                        'category_id',
                        event.target.value,
                      )
                    }
                    className={inputClass}
                  >
                    <option value="">
                      No category
                    </option>

                    {categories.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold">
                    Amount *
                  </span>

                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.amount}
                    onChange={(event) =>
                      updateField(
                        'amount',
                        event.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="0.00"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold">
                    Currency *
                  </span>

                  <input
                    value={form.currency_code}
                    onChange={(event) =>
                      updateField(
                        'currency_code',
                        event.target.value,
                      )
                    }
                    className={inputClass}
                    maxLength={3}
                    required
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-xs font-bold">
                    Date *
                  </span>

                  <input
                    type="date"
                    value={form.transaction_date}
                    onChange={(event) =>
                      updateField(
                        'transaction_date',
                        event.target.value,
                      )
                    }
                    className={inputClass}
                    required
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-bold">
                  Description
                </span>

                <input
                  value={form.description}
                  onChange={(event) =>
                    updateField(
                      'description',
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder={
                    activeType === 'income'
                      ? 'Salary'
                      : 'Groceries'
                  }
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold">
                  Notes
                </span>

                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    updateField(
                      'notes',
                      event.target.value,
                    )
                  }
                  rows={3}
                  className={`${inputClass} min-h-24 py-3`}
                  placeholder="Optional notes..."
                />
              </label>

              {error && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-3 text-xs font-medium text-destructive">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-border pt-5">
                <button
                  type="button"
                  onClick={() =>
                    setModalOpen(false)
                  }
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
                    : editingTransaction
                      ? 'Save changes'
                      : `Create ${activeType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
