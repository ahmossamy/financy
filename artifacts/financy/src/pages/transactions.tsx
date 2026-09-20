import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  FileUp,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/services/supabase';

type TransactionType = 'income' | 'expense' | 'transfer';
type ListFilter = 'all' | TransactionType;

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
  payee: string;
  payment_method: string;
  notes: string;
};

const EMPTY_FORM: TransactionForm = {
  account_id: '',
  category_id: '',
  amount: '',
  currency_code: 'EGP',
  transaction_date: new Date().toISOString().slice(0, 10),
  payee: '',
  payment_method: '',
  notes: '',
};

const PAYMENT_METHODS = [
  'Cash',
  'Debit Card',
  'Credit Card',
  'Bank Transfer',
  'Direct Debit',
  'Online Payment',
  'Other',
];

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

function formatDate(date: string) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return date;
  }
}

function getDisplayNotes(notes: string | null) {
  if (!notes) return '';
  return notes
    .replace(/\[Payee: .*?\]\s*/g, '')
    .replace(/\[Payment Method: .*?\]\s*/g, '')
    .trim();
}

function getMeta(notes: string | null) {
  if (!notes) return { payee: '', paymentMethod: '' };
  const payee = notes.match(/\[Payee: (.*?)\]/)?.[1] ?? '';
  const paymentMethod =
    notes.match(/\[Payment Method: (.*?)\]/)?.[1] ?? '';
  return { payee, paymentMethod };
}

function buildNotes(form: TransactionForm) {
  const metadata = [
    form.payee.trim() ? `[Payee: ${form.payee.trim()}]` : '',
    form.payment_method
      ? `[Payment Method: ${form.payment_method}]`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const notes = form.notes.trim();
  return [metadata, notes].filter(Boolean).join('\n') || null;
}

const inputClass =
  'h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10';

const selectClass = `${inputClass} appearance-none`;

export default function Transactions({
  defaultType = 'expense',
}: {
  defaultType?: TransactionType;
}) {
  const [activeFilter, setActiveFilter] = useState<ListFilter>(
    defaultType === 'transfer' ? 'all' : defaultType,
  );
  const [modalType, setModalType] = useState<TransactionType>(
    defaultType === 'transfer' ? 'expense' : defaultType,
  );

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [createAnother, setCreateAnother] = useState(false);
  const [attachmentName, setAttachmentName] = useState('');

  const [form, setForm] = useState<TransactionForm>(EMPTY_FORM);

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
          .in('type', ['income', 'expense', 'transfer'])
          .order('transaction_date', { ascending: false }),
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

    setTransactions((transactionsResult.data ?? []) as Transaction[]);
    setAccounts((accountsResult.data ?? []) as Account[]);
    setCategories((categoriesResult.data ?? []) as Category[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const visibleTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    const today = new Date();
    const start = new Date(today);
    const end = new Date(today);
    if (period === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'this_week') {
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'this_month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'last_30_days') {
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    return transactions.filter((transaction) => {
      const matchesType =
        activeFilter === 'all' || transaction.type === activeFilter;
      if (!matchesType) return false;

      if (period !== 'all') {
        if (period === 'custom') {
          if (customFrom && transaction.transaction_date < customFrom) return false;
          if (customTo && transaction.transaction_date > customTo) return false;
        } else {
          const date = new Date(`${transaction.transaction_date}T12:00:00`);
          if (date < start || date > end) return false;
        }
      }

      if (!query) return true;

      const account = accounts.find(
        (item) => item.id === transaction.account_id,
      );
      const category = categories.find(
        (item) => item.id === transaction.category_id,
      );
      const meta = getMeta(transaction.notes);

      return [
        transaction.description,
        account?.name,
        category?.name,
        meta.payee,
        meta.paymentMethod,
        transaction.currency_code,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [transactions, accounts, categories, activeFilter, search, period, customFrom, customTo]);

  const totals = useMemo(() => {
    const result: Record<string, { income: number; expense: number }> = {};

    visibleTransactions.forEach((transaction) => {
      if (transaction.type === 'transfer') return;
      const currency = transaction.currency_code;
      if (!result[currency]) result[currency] = { income: 0, expense: 0 };
      result[currency][transaction.type] += Number(transaction.amount || 0);
    });

    return result;
  }, [visibleTransactions]);

  function resetForm(type: TransactionType) {
    const firstAccount = accounts[0];
    setForm({
      ...EMPTY_FORM,
      currency_code: firstAccount?.currency_code ?? 'EGP',
      account_id: firstAccount?.id ?? '',
    });
    setModalType(type);
    setAttachmentName('');
  }

  function openAddModal(type: TransactionType = 'expense') {
    setEditingTransaction(null);
    resetForm(type);
    setCreateAnother(false);
    setError('');
    setModalOpen(true);
  }

  function openEditModal(transaction: Transaction) {
    const meta = getMeta(transaction.notes);
    setEditingTransaction(transaction);
    setModalType(transaction.type);
    setForm({
      account_id: transaction.account_id ?? '',
      category_id: transaction.category_id ?? '',
      amount: String(transaction.amount ?? ''),
      currency_code: transaction.currency_code,
      transaction_date: transaction.transaction_date,
      payee: meta.payee,
      payment_method: meta.paymentMethod,
      notes: getDisplayNotes(transaction.notes),
    });
    setAttachmentName('');
    setCreateAnother(false);
    setError('');
    setModalOpen(true);
  }

  function updateField(field: keyof TransactionForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleAccountChange(value: string) {
    const account = accounts.find((item) => item.id === value);
    setForm((current) => ({
      ...current,
      account_id: value,
      currency_code: account?.currency_code ?? current.currency_code,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
      type: modalType,
      amount,
      currency_code: form.currency_code,
      transaction_date: form.transaction_date,
      description: editingTransaction?.description ?? null,
      notes: buildNotes(form),
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
          .insert({ ...payload, user_id: user.id });

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    if (createAnother && !editingTransaction) {
      resetForm(modalType);
      setSaving(false);
      await loadData();
      return;
    }

    setSaving(false);
    setModalOpen(false);
    setEditingTransaction(null);
    setForm(EMPTY_FORM);
    await loadData();
  }

  async function deleteTransaction(transaction: Transaction) {
    const confirmed = window.confirm(
      `Delete "${transaction.description || transaction.type}"?`,
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

    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transaction.id)
      .eq('user_id', user.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await loadData();
  }

  const modalTitle = editingTransaction
    ? `Edit ${modalType}`
    : 'Add Transaction';

  const modalButtonLabel = saving
    ? 'Saving...'
    : editingTransaction
      ? 'Save Changes'
      : modalType === 'expense'
        ? 'Save Expense'
        : modalType === 'income'
          ? 'Save Income'
          : 'Save Transfer';

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-primary">Money</p>
          <h2 className="mt-1 font-display text-[34px] font-extrabold tracking-[-0.06em]">
            Transactions
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Record and manage your income, expenses and transfers.
          </p>
        </div>

        <button
          onClick={() => openAddModal('expense')}
          disabled={accounts.length === 0}
          className="inline-flex h-11 w-fit items-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="size-4" />
          Add Transaction
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex w-fit rounded-2xl border border-border bg-card p-1">
          {(['all', 'income', 'expense', 'transfer'] as ListFilter[]).map(
            (filter) => {
              const label =
                filter === 'all'
                  ? 'All'
                  : filter === 'expense'
                    ? 'Expenses'
                    : filter[0].toUpperCase() + filter.slice(1);

              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                    activeFilter === filter
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {label}
                </button>
              );
            },
          )}
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search transactions..."
              className="h-11 w-full rounded-2xl border border-border bg-card pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <div className="relative sm:w-48">
            <CalendarDays className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="h-11 w-full appearance-none rounded-2xl border border-border bg-card pl-11 pr-4 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="this_week">This week</option>
              <option value="this_month">This month</option>
              <option value="last_30_days">Last 30 days</option>
              <option value="custom">Custom range</option>
            </select>
          </div>
        </div>
        </div>
        {period === 'custom' && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className="h-10 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary" />
            <input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="h-10 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary" />
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {accounts.length === 0 && !loading && (
        <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5 text-sm">
          Add an account first before recording transactions.
        </div>
      )}

      {!loading && activeFilter !== 'transfer' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.entries(totals) as Array<[string, { income: number; expense: number }]>).map(([currency, value]) => (
            <div
              key={currency}
              className="rounded-2xl border border-border bg-card p-5 card-shadow"
            >
              <p className="text-xs font-semibold text-muted-foreground">
                {activeFilter === 'income'
                  ? 'Total income'
                  : activeFilter === 'expense'
                    ? 'Total expenses'
                    : 'Income / Expenses'}
              </p>
              {activeFilter === 'all' ? (
                <div className="mt-2 space-y-1">
                  <p className="font-display text-xl font-bold text-primary">
                    + {formatMoney(value.income, currency)}
                  </p>
                  <p className="font-display text-xl font-bold text-destructive">
                    - {formatMoney(value.expense, currency)}
                  </p>
                </div>
              ) : (
                <p className="mt-2 font-display text-2xl font-bold tracking-[-0.04em]">
                  {formatMoney(
                    activeFilter === 'income' ? value.income : value.expense,
                    currency,
                  )}
                </p>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                {visibleTransactions.filter(
                  (item) => item.currency_code === currency,
                ).length}{' '}
                transaction(s)
              </p>
            </div>
          ))}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-card card-shadow">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="font-display text-sm font-bold">
              {activeFilter === 'all'
                ? 'All Transactions'
                : activeFilter === 'expense'
                  ? 'Expenses'
                  : activeFilter[0].toUpperCase() + activeFilter.slice(1)}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {visibleTransactions.length} transaction(s)
            </p>
          </div>
          <ArrowLeftRight className="size-5 text-primary" />
        </div>

        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            Loading transactions...
          </div>
        ) : visibleTransactions.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
              <ArrowLeftRight className="size-5" />
            </div>
            <h3 className="mt-4 font-display text-base font-bold">
              No transactions yet
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Add your first transaction to start building your financial history.
            </p>
            {accounts.length > 0 && (
              <button
                onClick={() => openAddModal('expense')}
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground"
              >
                <Plus className="size-4" />
                Add Transaction
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {visibleTransactions.map((transaction) => {
              const account = accounts.find(
                (item) => item.id === transaction.account_id,
              );
              const category = categories.find(
                (item) => item.id === transaction.category_id,
              );
              const meta = getMeta(transaction.notes);
              const isIncome = transaction.type === 'income';
              const isTransfer = transaction.type === 'transfer';

              return (
                <button
                  key={transaction.id}
                  type="button"
                  onClick={() => setSelectedTransaction(transaction)}
                  className="flex w-full flex-col gap-4 px-5 py-5 text-left transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`grid size-11 shrink-0 place-items-center rounded-full ${
                        isTransfer
                          ? 'bg-blue-50 text-blue-700'
                          : isIncome
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {isTransfer ? (
                        <ArrowLeftRight className="size-5" />
                      ) : isIncome ? (
                        <ArrowDownLeft className="size-5" />
                      ) : (
                        <ArrowUpRight className="size-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate text-sm font-bold">
                          {category?.name || (isTransfer ? 'Transfer' : isIncome ? 'Income' : 'Expense')}
                        </h4>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {account?.name || 'Account'} · {formatDate(transaction.transaction_date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-5 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p
                        className={`font-display text-base font-bold ${
                          isTransfer
                            ? 'text-foreground'
                            : isIncome
                              ? 'text-primary'
                              : 'text-destructive'
                        }`}
                      >
                        {isIncome ? '+' : isTransfer ? '' : '-'}{' '}
                        {formatMoney(Number(transaction.amount), transaction.currency_code)}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {transaction.status}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    <div className="flex gap-1">
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => { event.stopPropagation(); openEditModal(transaction); }}
                        onKeyDown={(event) => { if (event.key === 'Enter') { event.stopPropagation(); openEditModal(transaction); } }}
                        className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Edit transaction"
                      >
                        <Pencil className="size-4" />
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => { event.stopPropagation(); deleteTransaction(transaction); }}
                        onKeyDown={(event) => { if (event.key === 'Enter') { event.stopPropagation(); deleteTransaction(transaction); } }}
                        className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete transaction"
                      >
                        <Trash2 className="size-4" />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedTransaction && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/20 p-3 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <p className="text-xs font-semibold text-primary">Transactions</p>
                <h3 className="mt-1 font-display text-xl font-bold">
                  {categories.find((item) => item.id === selectedTransaction.category_id)?.name || (selectedTransaction.type === 'transfer' ? 'Transfer' : selectedTransaction.type === 'income' ? 'Income' : 'Expense')}
                </h3>
              </div>
              <button onClick={() => setSelectedTransaction(null)} className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-xs font-semibold text-muted-foreground">Amount</p>
                  <p className={`mt-2 font-display text-xl font-bold ${selectedTransaction.type === 'income' ? 'text-primary' : selectedTransaction.type === 'expense' ? 'text-destructive' : 'text-foreground'}`}>
                    {selectedTransaction.type === 'income' ? '+' : selectedTransaction.type === 'expense' ? '-' : ''} {formatMoney(Number(selectedTransaction.amount), selectedTransaction.currency_code)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-xs font-semibold text-muted-foreground">Date</p>
                  <p className="mt-2 text-sm font-bold">{formatDate(selectedTransaction.transaction_date)}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-xs font-semibold text-muted-foreground">Account</p>
                  <p className="mt-2 text-sm font-bold">{accounts.find((item) => item.id === selectedTransaction.account_id)?.name || 'Account'}</p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-xs font-semibold text-muted-foreground">Status</p>
                  <p className="mt-2 text-sm font-bold capitalize">{selectedTransaction.status}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button onClick={() => { setSelectedTransaction(null); openEditModal(selectedTransaction); }} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-xs font-bold">
                  <Pencil className="size-3.5" />
                  Edit transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-border bg-card shadow-2xl">
            <div className="sticky top-0 z-20 flex items-start justify-between border-b border-border bg-card px-7 py-5">
              <div>
                <p className="text-sm font-semibold text-primary">
                  Transactions
                </p>
                <h3 className="mt-1 font-display text-2xl font-extrabold tracking-[-0.04em]">
                  {modalTitle}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Record your income, expense or transfer.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="px-7 pt-5">
              <div className="grid grid-cols-3 rounded-2xl border border-border bg-background p-1">
                <button
                  type="button"
                  onClick={() => !editingTransaction && setModalType('expense')}
                  disabled={!!editingTransaction}
                  className={`flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-bold ${
                    modalType === 'expense'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'text-muted-foreground hover:bg-muted'
                  } disabled:cursor-default`}
                >
                  <ArrowUpRight className="size-4" />
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => !editingTransaction && setModalType('income')}
                  disabled={!!editingTransaction}
                  className={`flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-bold ${
                    modalType === 'income'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'text-muted-foreground hover:bg-muted'
                  } disabled:cursor-default`}
                >
                  <ArrowDownLeft className="size-4" />
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => !editingTransaction && setModalType('transfer')}
                  disabled={!!editingTransaction}
                  className={`flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-bold ${
                    modalType === 'transfer'
                      ? 'bg-blue-100 text-blue-800'
                      : 'text-muted-foreground hover:bg-muted'
                  } disabled:cursor-default`}
                >
                  <ArrowLeftRight className="size-4" />
                  Transfer
                </button>
              </div>
            </div>

            {modalType === 'transfer' ? (
              <div className="px-7 py-7">
                <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 text-sm text-blue-900">
                  <p className="font-bold">Transfer setup</p>
                  <p className="mt-1 leading-6">
                    Transfers use a source account and destination account. The dedicated transfer workflow will be connected when the transfer fields are wired to the transfers table.
                  </p>
                  <button
                    type="button"
                    onClick={() => setModalType('expense')}
                    className="mt-4 h-10 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground"
                  >
                    Continue with Expense
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 px-7 py-7">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block sm:col-span-1">
                    <span className="mb-2 block text-sm font-bold">Amount *</span>
                    <div className="flex overflow-hidden rounded-2xl border border-border bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                      <select
                        value={form.currency_code}
                        onChange={(event) => updateField('currency_code', event.target.value)}
                        className="w-24 border-r border-border bg-transparent px-4 text-sm font-semibold outline-none"
                      >
                        {Array.from(
                          new Set(['EGP', 'USD', 'AED', 'SAR', ...accounts.map((account) => account.currency_code)]),
                        ).map((currency) => (
                          <option key={currency} value={currency}>
                            {currency}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={form.amount}
                        onChange={(event) => updateField('amount', event.target.value)}
                        className="h-12 min-w-0 flex-1 bg-transparent px-4 text-base outline-none"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold">Date *</span>
                    <div className="relative">
                      <CalendarDays className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="date"
                        value={form.transaction_date}
                        onChange={(event) => updateField('transaction_date', event.target.value)}
                        className={`${inputClass} pl-11`}
                        required
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold">Account *</span>
                    <select
                      value={form.account_id}
                      onChange={(event) => handleAccountChange(event.target.value)}
                      className={selectClass}
                      required
                    >
                      <option value="">Select account</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} · {account.currency_code}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold">Category</span>
                    <select
                      value={form.category_id}
                      onChange={(event) => updateField('category_id', event.target.value)}
                      className={selectClass}
                    >
                      <option value="">No category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold">Payee / Merchant</span>
                    <div className="relative">
                      <UserRound className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={form.payee}
                        onChange={(event) => updateField('payee', event.target.value)}
                        className={`${inputClass} pl-11`}
                        placeholder="e.g. Carrefour, Amazon"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold">Payment Method</span>
                    <select
                      value={form.payment_method}
                      onChange={(event) => updateField('payment_method', event.target.value)}
                      className={selectClass}
                    >
                      <option value="">Not specified</option>
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-2 block text-sm font-bold">Notes</span>
                    <textarea
                      value={form.notes}
                      onChange={(event) => updateField('notes', event.target.value)}
                      rows={3}
                      className="min-h-28 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
                      placeholder="Optional notes..."
                    />
                  </label>

                  <div className="sm:col-span-2">
                    <div className="mb-2 flex items-center gap-2 text-sm font-bold">
                      <FileUp className="size-4 text-muted-foreground" />
                      Attachments
                    </div>
                    <label className="flex min-h-24 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-border bg-background px-4 text-center hover:border-primary hover:bg-primary/5">
                      <input
                        type="file"
                        className="sr-only"
                        onChange={(event) => setAttachmentName(event.target.files?.[0]?.name ?? '')}
                      />
                      <div>
                        <p className="text-sm font-semibold text-primary">
                          {attachmentName || 'Click to upload'}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Images, PDFs or other files
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {attachmentName && (
                  <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                    <Check className="size-4 text-primary" />
                    {attachmentName} selected. File storage will be connected in the attachments phase.
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-3 text-xs font-medium text-destructive">
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={createAnother}
                      onChange={(event) => setCreateAnother(event.target.checked)}
                      className="mt-1 size-4 accent-primary"
                    />
                    <span>
                      <span className="block font-semibold">Create another transaction</span>
                      <span className="block text-xs text-muted-foreground">
                        Keep this form open after saving
                      </span>
                    </span>
                  </label>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="h-11 rounded-2xl border border-border px-5 text-sm font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="h-11 rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground disabled:opacity-60"
                    >
                      {modalButtonLabel}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
