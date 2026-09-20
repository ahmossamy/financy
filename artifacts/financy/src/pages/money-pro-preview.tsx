import { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  FileText,
  Filter,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  PieChart,
  Plus,
  Search,
  Settings,
  WalletCards,
  X,
} from 'lucide-react';

type Screen = 'overview' | 'accounts' | 'transactions' | 'calendar' | 'budgets' | 'reports';

const screens: Array<{ id: Screen; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'accounts', label: 'Accounts', icon: WalletCards },
  { id: 'transactions', label: 'Transactions', icon: FileText },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'budgets', label: 'Budgets', icon: PieChart },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];

const accountRows = [
  { name: 'Cash', type: 'Cash', currency: 'EGP', balance: 14500 },
  { name: 'CIB', type: 'Bank', currency: 'EGP', balance: 58200 },
  { name: 'CIB USD', type: 'Bank', currency: 'USD', balance: 1240 },
  { name: 'Thndr', type: 'Investment', currency: 'EGP', balance: 50300 },
  { name: 'Tilda', type: 'Investment', currency: 'EGP', balance: 21000 },
  { name: 'CIB Credit Card', type: 'Credit card', currency: 'EGP', balance: -7200 },
];

const transactionRows = [
  { date: '20 Sep', title: 'Salary', account: 'CIB', category: 'Income', amount: 32000, type: 'income' },
  { date: '20 Sep', title: 'Transfer', account: 'Cash → CIB USD', category: 'Transfer', amount: 1000, type: 'transfer' },
  { date: '19 Sep', title: 'Groceries', account: 'CIB', category: 'Food & Dining', amount: -1850, type: 'expense' },
  { date: '18 Sep', title: 'School fees', account: 'CIB', category: 'Education', amount: -4200, type: 'expense' },
  { date: '17 Sep', title: 'Electricity', account: 'Cash', category: 'Bills', amount: -920, type: 'expense' },
  { date: '15 Sep', title: 'Dividend', account: 'Thndr', category: 'Investment income', amount: 780, type: 'income' },
];

const budgetRows = [
  { label: 'Food & Dining', spent: 6200, limit: 8000 },
  { label: 'Bills', spent: 3450, limit: 5000 },
  { label: 'Transport', spent: 1900, limit: 3000 },
  { label: 'Education', spent: 4200, limit: 5000 },
];

function money(value: number, currency = 'EGP') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
  }).format(value);
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={'rounded-3xl border border-border bg-card shadow-sm ' + className}>{children}</div>;
}

function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary" style={{ width: Math.min(value, 100) + '%' }} />
    </div>
  );
}


type TransactionRecord = {
  id: string;
  date: string;
  title: string;
  account: string;
  category: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  payee?: string;
  description?: string;
  className?: string;
  checkNumber?: string;
  status: 'cleared' | 'not-cleared' | 'planned';
  recurring?: boolean;
  items?: Array<{ id: string; name: string; category: string; amount: number }>;
  attachments?: Array<{ name: string; type: string }>;
  method?: string;
  fee?: number;
  transferTo?: string;
  exchangeRate?: number;
  receivedAmount?: number;
};

function TransactionsPreview() {
  type EntryMode = 'expense' | 'income' | 'transfer' | 'planned';
  type LineItem = { id: string; name: string; category: string; amount: number };
  type Attachment = { name: string; type: string };

  const defaultCategories = [
    'Food & Dining',
    'Bills',
    'Transport',
    'Education',
    'Shopping',
    'Health',
    'Entertainment',
    'Salary',
    'Investment income',
    'Other',
  ];

  const [rows, setRows] = useState<TransactionRecord[]>(() =>
    transactionRows.map((row, index) => ({
      ...row,
      id: 'tx-' + index,
      status: 'cleared',
      description: row.title,
      className: 'Personal',
    })),
  );
  const [categories, setCategories] = useState(defaultCategories);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'cleared' | 'not-cleared' | 'planned'>('all');
  const [classFilter, setClassFilter] = useState('all');
  const [period, setPeriod] = useState<'this-month' | 'last-month' | '30-days' | 'custom'>('this-month');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<TransactionRecord | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>('expense');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: 'item-1', name: '', category: 'Food & Dining', amount: 0 },
  ]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const accounts = Array.from(new Set(rows.map((row) => row.account)));
  const classes = Array.from(new Set(rows.map((row) => row.className ?? 'Personal')));
  const itemTotal = lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  function transactionDate(value: string) {
    return new Date(value + ' 2026');
  }

  const filtered = useMemo(() => {
    const now = new Date(2026, 8, 20);
    let startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    if (period === 'last-month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (period === '30-days') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'custom') {
      if (fromDate) startDate = new Date(fromDate + 'T00:00:00');
      if (toDate) endDate = new Date(toDate + 'T23:59:59');
    }

    return rows.filter((row) => {
      const date = transactionDate(row.date);
      const text = [row.title, row.account, row.category, row.payee, row.description, row.checkNumber].join(' ').toLowerCase();
      return (
        date >= startDate &&
        date <= endDate &&
        (typeFilter === 'all' || row.type === typeFilter) &&
        (accountFilter === 'all' || row.account === accountFilter) &&
        (categoryFilter === 'all' || row.category === categoryFilter) &&
        (statusFilter === 'all' || row.status === statusFilter) &&
        (classFilter === 'all' || row.className === classFilter) &&
        (!search || text.includes(search.toLowerCase()))
      );
    });
  }, [rows, typeFilter, accountFilter, categoryFilter, statusFilter, classFilter, period, fromDate, toDate, search]);

  const totals = filtered.reduce(
    (acc, row) => {
      if (row.status === 'planned') return acc;
      if (row.type === 'income') acc.income += row.amount;
      if (row.type === 'expense') acc.expenses += Math.abs(row.amount);
      return acc;
    },
    { income: 0, expenses: 0 },
  );

  function resetAddForm() {
    setEntryMode('expense');
    setLineItems([{ id: 'item-' + Date.now(), name: '', category: categories[0] ?? 'Other', amount: 0 }]);
    setAttachments([]);
    setShowCategoryManager(false);
    setShowAdvanced(false);
    setNewCategory('');
  }

  function openAdd() {
    resetAddForm();
    setShowAdd(true);
  }

  function addLineItem() {
    setLineItems((items) => [
      ...items,
      {
        id: 'item-' + Date.now() + '-' + items.length,
        name: '',
        category: categories[0] ?? 'Other',
        amount: 0,
      },
    ]);
  }

  function updateLineItem(id: string, patch: Partial<LineItem>) {
    setLineItems((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeLineItem(id: string) {
    setLineItems((items) => items.length === 1 ? items : items.filter((item) => item.id !== id));
  }

  function addCategory() {
    const value = newCategory.trim();
    if (!value || categories.some((category) => category.toLowerCase() === value.toLowerCase())) return;
    setCategories((items) => [...items, value]);
    setLineItems((items) => items.map((item, index) => index === items.length - 1 && !item.name ? { ...item, category: value } : item));
    setNewCategory('');
  }

  function handleAttachments(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setAttachments((items) => [
      ...items,
      ...files.map((file) => ({ name: file.name, type: file.type })),
    ]);
    event.currentTarget.value = '';
  }

  function addTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selectedMode = entryMode;
    const enteredAmount = Math.abs(Number(form.get('amount') || 0));
    const amount = selectedMode === 'expense' ? itemTotal : enteredAmount;
    if (amount <= 0) return;
    const plannedType = String(form.get('plannedType') || 'expense') as 'expense' | 'income';
    const type = (selectedMode === 'planned' ? plannedType : selectedMode) as TransactionRecord['type'];
    const account = String(form.get('account') || 'CIB');
    const transferTo = String(form.get('transferTo') || '');
    const method = String(form.get('method') || account);
    const fee = Math.abs(Number(form.get('fee') || 0));
    const exchangeRate = Number(form.get('exchangeRate') || 1);
    const receivedAmount = Math.abs(Number(form.get('receivedAmount') || amount));
    const title = lineItems.length > 1
      ? lineItems.filter((item) => item.name.trim()).map((item) => item.name.trim()).join(', ') || (type === 'income' ? 'Income' : type === 'transfer' ? 'Transfer' : 'Expense')
      : lineItems[0]?.name.trim() || lineItems[0]?.category || (type === 'income' ? 'Income' : type === 'transfer' ? 'Transfer' : 'Transaction');
    const category = selectedMode === 'income'
      ? String(form.get('incomeCategory') || 'Other')
      : selectedMode === 'transfer'
        ? 'Transfer'
        : selectedMode === 'planned'
          ? String(form.get('plannedCategory') || 'Other')
          : lineItems.length > 1 ? 'Multiple items' : lineItems[0]?.category || 'Other';
    const date = String(form.get('date') || '2026-09-20');
    const status = selectedMode === 'planned'
      ? 'planned'
      : String(form.get('status') || 'cleared') as TransactionRecord['status'];

    const record: TransactionRecord = {
      id: 'tx-' + Date.now(),
      date: new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      title,
      account: selectedMode === 'transfer' ? account + ' → ' + transferTo : account,
      category,
      amount: type === 'expense' ? -amount : amount,
      type,
      payee: String(form.get('payee') || ''),
      description: String(form.get('description') || ''),
      className: String(form.get('className') || 'Personal'),
      checkNumber: String(form.get('checkNumber') || ''),
      status,
      recurring: form.get('recurring') === 'on',
      items: lineItems.filter((item) => item.name.trim() || item.amount > 0),
      attachments,
      method,
      fee,
      transferTo,
      exchangeRate,
      receivedAmount,
    };

    setRows((current) => [record, ...current]);
    setShowAdd(false);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Checkbook register</p>
          <h2 className="mt-1 font-display text-3xl font-extrabold">Transactions</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">One transaction can contain multiple items, its own payment method, fees and attachments.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters((value) => !value)} className={'inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-bold ' + (showFilters ? 'border-primary bg-primary/5 text-primary' : 'border-border')}>
            <Filter className="size-4" /> Filters
          </button>
          <button onClick={openAdd} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm">
            <Plus className="size-4" /> Add transaction
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs font-semibold text-muted-foreground">Income</p><p className="mt-2 font-display text-2xl font-extrabold text-primary">{money(totals.income)}</p></Card>
        <Card className="p-4"><p className="text-xs font-semibold text-muted-foreground">Expenses</p><p className="mt-2 font-display text-2xl font-extrabold">{money(totals.expenses)}</p></Card>
        <Card className="p-4"><p className="text-xs font-semibold text-muted-foreground">Cash flow</p><p className="mt-2 font-display text-2xl font-extrabold">{money(totals.income - totals.expenses)}</p></Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border bg-muted/20 p-4">
          <div className="flex flex-wrap gap-2">
            {[
              ['all', 'All'],
              ['income', 'Income'],
              ['expense', 'Expenses'],
              ['transfer', 'Transfers'],
            ].map(([value, label]) => (
              <button key={value} onClick={() => setTypeFilter(value as typeof typeFilter)} className={'rounded-xl px-3 py-2 text-xs font-bold ' + (typeFilter === value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground')}>{label}</button>
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search amount, category, description, payee..." className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-xs outline-none focus:border-primary" />
            </div>
            <select value={period} onChange={(event) => setPeriod(event.target.value as typeof period)} className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold">
              <option value="this-month">This month</option>
              <option value="last-month">Last month</option>
              <option value="30-days">Last 30 days</option>
              <option value="custom">Custom period</option>
            </select>
          </div>

          {period === 'custom' && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-xs" />
              <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-xs" />
            </div>
          )}

          {showFilters && (
            <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
              <select value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-xs">
                <option value="all">All accounts</option>{accounts.map((account) => <option key={account}>{account}</option>)}
              </select>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-xs">
                <option value="all">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="h-10 rounded-xl border border-border bg-background px-3 text-xs">
                <option value="all">All statuses</option><option value="cleared">Cleared</option><option value="not-cleared">Not cleared</option><option value="planned">Planned</option>
              </select>
              <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-xs">
                <option value="all">All classes</option>{classes.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="divide-y divide-border">
          {filtered.map((row) => (
            <button key={row.id} onClick={() => setSelected(row)} className="flex w-full items-start gap-3 px-4 py-4 text-left hover:bg-primary/[0.03] sm:px-5">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
                {row.type === 'income' && <ArrowDownLeft className="size-4 text-primary" />}
                {row.type === 'expense' && <ArrowUpRight className="size-4" />}
                {row.type === 'transfer' && <ArrowLeftRight className="size-4 text-primary" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold">{row.title}</p>
                  {row.recurring && <span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-bold">Recurring</span>}
                  {row.status === 'planned' && <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold">Planned</span>}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{row.date} · {row.account} · {row.category}</p>
                {row.payee && <p className="mt-1 text-[11px] text-muted-foreground">{row.payee}</p>}
              </div>
              <div className="text-right">
                <p className={'text-sm font-extrabold ' + (row.amount >= 0 ? 'text-primary' : 'text-destructive')}>{row.amount >= 0 ? '+' : ''}{money(row.amount)}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{row.status === 'cleared' ? 'Cleared' : row.status === 'planned' ? 'Planned' : 'Not cleared'}</p>
              </div>
            </button>
          ))}
          {filtered.length === 0 && <div className="px-6 py-14 text-center text-sm text-muted-foreground">No transactions match the selected filters.</div>}
        </div>
      </Card>

      {selected && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-foreground/20 p-3 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
            <div className="flex items-start justify-between border-b border-border px-6 py-5">
              <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Transaction details</p><h3 className="mt-1 font-display text-2xl font-extrabold">{selected.title}</h3><p className="mt-1 text-xs text-muted-foreground">{selected.date} · {selected.account}</p></div>
              <button onClick={() => setSelected(null)} className="grid size-9 place-items-center rounded-xl hover:bg-muted"><X className="size-5" /></button>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <Card className="p-4"><p className="text-[11px] text-muted-foreground">Amount</p><p className={'mt-2 font-display text-2xl font-extrabold ' + (selected.amount >= 0 ? 'text-primary' : 'text-destructive')}>{selected.amount >= 0 ? '+' : ''}{money(selected.amount)}</p></Card>
                <Card className="p-4"><p className="text-[11px] text-muted-foreground">Method</p><p className="mt-2 text-sm font-bold">{selected.method || selected.account}</p></Card>
              </div>
              {!!selected.items?.length && (
                <Card className="p-4">
                  <p className="text-[11px] text-muted-foreground">Items</p>
                  <div className="mt-3 divide-y divide-border">{selected.items.map((item: LineItem) => <div key={item.id} className="flex items-center justify-between py-2 text-sm"><div><p className="font-semibold">{item.name || item.category}</p><p className="text-[10px] text-muted-foreground">{item.category}</p></div><p className="font-bold">{money(item.amount)}</p></div>)}</div>
                </Card>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Card className="p-4"><p className="text-[11px] text-muted-foreground">Type</p><p className="mt-2 text-sm font-bold capitalize">{selected.type}</p></Card>
                <Card className="p-4"><p className="text-[11px] text-muted-foreground">Status</p><p className="mt-2 text-sm font-bold">{selected.status}</p></Card>
                <Card className="p-4"><p className="text-[11px] text-muted-foreground">Category</p><p className="mt-2 text-sm font-bold">{selected.category}</p></Card>
                <Card className="p-4"><p className="text-[11px] text-muted-foreground">Fee</p><p className="mt-2 text-sm font-bold">{money(selected.fee || 0)}</p></Card>
              </div>
              {selected.attachments?.length ? <Card className="p-4"><p className="text-[11px] text-muted-foreground">Attachments</p><div className="mt-2 space-y-1">{selected.attachments.map((file: Attachment) => <p key={file.name} className="text-xs font-semibold">{file.name}</p>)}</div></Card> : null}
              <Card className="p-4"><p className="text-[11px] text-muted-foreground">Payee / Description</p><p className="mt-2 text-sm font-bold">{selected.payee || '—'}</p><p className="mt-1 text-xs text-muted-foreground">{selected.description || '—'}</p></Card>
            </div>
            <div className="flex justify-end border-t border-border p-4"><button onClick={() => setSelected(null)} className="h-10 rounded-xl border border-border px-4 text-xs font-bold">Close</button></div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[96vh] w-full max-w-xl flex-col overflow-hidden rounded-t-[2rem] border border-border bg-background shadow-2xl sm:rounded-[2rem]">
            <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-4 sm:px-6">
              <button type="button" onClick={() => setShowAdd(false)} className="grid size-11 place-items-center rounded-full bg-muted hover:bg-muted/70" aria-label="Close">
                <X className="size-6" />
              </button>
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Checkbook</p>
                <h3 className="mt-1 font-display text-xl font-extrabold">
                  {entryMode === 'expense' ? 'Expense' : entryMode === 'income' ? 'Income' : entryMode === 'transfer' ? 'Transfer' : 'Planned'}
                </h3>
              </div>
              <button type="submit" form="transaction-form" className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm" aria-label="Save transaction">
                <span className="text-2xl leading-none">✓</span>
              </button>
            </div>

            <form id="transaction-form" onSubmit={addTransaction} className="min-h-0 overflow-y-auto">
              <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
                <div className="grid grid-cols-4 overflow-hidden rounded-2xl border border-border bg-muted/40">
                  {[
                    ['expense', 'Expense'],
                    ['income', 'Income'],
                    ['transfer', 'Transfer'],
                    ['planned', 'Planned'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setEntryMode(value as EntryMode)}
                      className={'px-2 py-3 text-xs font-bold transition-colors ' + (
                        entryMode === value ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 p-4 sm:p-6">
                {entryMode === 'expense' && (
                  <>
                    <div className="overflow-hidden rounded-3xl border border-border bg-card">
                      <div className="flex items-center justify-between border-b border-border px-5 py-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Paid from</p>
                          <p className="mt-1 text-sm font-extrabold">Choose account</p>
                        </div>
                        <select name="account" className="max-w-[56%] rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold">
                          {accountRows.filter((account) => account.type !== 'Credit card' || account.balance < 0).map((account) => (
                            <option key={account.name}>{account.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center justify-between gap-4 px-5 py-5">
                        <div>
                          <p className="text-xs text-muted-foreground">Total expense</p>
                          <p className="mt-1 text-3xl font-extrabold">EGP</p>
                        </div>
                        <div className="text-right">
                          <p className="text-4xl font-extrabold tracking-tight">{money(itemTotal)}</p>
                          <input type="hidden" name="amount" value={itemTotal} />
                        </div>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-border bg-card">
                      <div className="flex items-center justify-between border-b border-border px-5 py-4">
                        <div>
                          <p className="font-bold">Items</p>
                          <p className="text-[11px] text-muted-foreground">Use one item or split the purchase into several items.</p>
                        </div>
                        <button type="button" onClick={addLineItem} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:bg-muted">
                          <Plus className="size-4" /> Add item
                        </button>
                      </div>
                      <div className="divide-y divide-border">
                        {lineItems.map((item, index) => (
                          <div key={item.id} className="space-y-3 p-4">
                            <div className="flex items-center gap-2">
                              <input
                                value={item.name}
                                onChange={(event) => updateLineItem(item.id, { name: event.target.value })}
                                placeholder={'Item ' + (index + 1) + ' name'}
                                className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm"
                              />
                              {lineItems.length > 1 && (
                                <button type="button" onClick={() => removeLineItem(item.id)} className="grid size-10 place-items-center rounded-xl border border-border text-muted-foreground hover:text-destructive" aria-label="Remove item">
                                  ×
                                </button>
                              )}
                            </div>
                            <div className="grid gap-2 sm:grid-cols-[1fr_125px]">
                              <div className="flex gap-2">
                                <select value={item.category} onChange={(event) => updateLineItem(item.id, { category: event.target.value })} className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm">
                                  {categories.map((category) => <option key={category}>{category}</option>)}
                                </select>
                                <button type="button" onClick={() => setShowCategoryManager(true)} className="h-11 rounded-xl border border-border px-3 text-xs font-bold hover:bg-muted">
                                  Categories
                                </button>
                              </div>
                              <input
                                value={item.amount || ''}
                                onChange={(event) => updateLineItem(item.id, { amount: Number(event.target.value) || 0 })}
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Amount"
                                className="h-11 rounded-xl border border-border bg-background px-3 text-right text-sm font-bold"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between border-t border-border bg-muted/30 px-5 py-3">
                        <span className="text-xs font-semibold text-muted-foreground">Transaction total</span>
                        <span className="text-sm font-extrabold">{money(amount)}</span>
                      </div>
                    </div>
                  </>
                )}

                {entryMode === 'income' && (
                  <>
                    <div className="overflow-hidden rounded-3xl border border-border bg-card">
                      <div className="flex items-center justify-between border-b border-border px-5 py-4">
                        <div><p className="text-xs text-muted-foreground">Deposit to</p><p className="mt-1 text-sm font-extrabold">Choose account</p></div>
                        <select name="account" className="max-w-[56%] rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold">
                          {accountRows.map((account) => <option key={account.name}>{account.name}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center justify-between gap-4 px-5 py-5">
                        <div><p className="text-xs text-muted-foreground">Income amount</p><p className="mt-1 text-3xl font-extrabold">EGP</p></div>
                        <input name="amount" type="number" min="0" step="0.01" required placeholder="0.00" className="w-full max-w-[62%] bg-transparent text-right text-4xl font-extrabold outline-none" />
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-border bg-card">
                      <div className="border-b border-border px-5 py-4">
                        <p className="font-bold">Income details</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">Source and category for this income.</p>
                      </div>
                      <div className="space-y-3 p-4">
                        <input name="payee" placeholder="Source: Salary, client, dividend..." className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" />
                        <select name="incomeCategory" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm">
                          {categories.filter((category) => category === 'Salary' || category === 'Investment income' || category === 'Other').map((category) => <option key={category}>{category}</option>)}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {entryMode === 'transfer' && (
                  <>
                    <div className="overflow-hidden rounded-3xl border border-border bg-card">
                      <div className="grid divide-y divide-border">
                        <label className="flex min-h-20 items-center justify-between gap-4 px-5">
                          <div><p className="text-xs text-muted-foreground">From</p><p className="mt-1 text-sm font-bold">Source account</p></div>
                          <select name="account" className="max-w-[56%] rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold">{accountRows.map((account) => <option key={account.name}>{account.name}</option>)}</select>
                        </label>
                        <label className="flex min-h-20 items-center justify-between gap-4 px-5">
                          <div><p className="text-xs text-muted-foreground">To</p><p className="mt-1 text-sm font-bold">Destination account</p></div>
                          <select name="transferTo" className="max-w-[56%] rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold">{accountRows.map((account) => <option key={account.name}>{account.name}</option>)}</select>
                        </label>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-border bg-card">
                      <div className="grid gap-3 p-4 sm:grid-cols-2">
                        <label className="block"><span className="mb-2 block text-xs font-bold">Send amount</span><input name="amount" type="number" min="0" step="0.01" required placeholder="0.00" className="h-12 w-full rounded-xl border border-border bg-background px-3 text-right text-lg font-extrabold" /></label>
                        <label className="block"><span className="mb-2 block text-xs font-bold">Transfer fee</span><input name="fee" type="number" min="0" step="0.01" defaultValue="0" className="h-12 w-full rounded-xl border border-border bg-background px-3 text-right text-lg font-extrabold" /></label>
                        <label className="block"><span className="mb-2 block text-xs font-bold">Exchange rate</span><input name="exchangeRate" type="number" min="0.000001" step="0.000001" defaultValue="1" className="h-12 w-full rounded-xl border border-border bg-background px-3 text-right text-sm font-bold" /></label>
                        <label className="block"><span className="mb-2 block text-xs font-bold">Received amount</span><input name="receivedAmount" type="number" min="0" step="0.01" placeholder="Same as send" className="h-12 w-full rounded-xl border border-border bg-background px-3 text-right text-sm font-bold" /></label>
                      </div>
                    </div>
                  </>
                )}

                {entryMode === 'planned' && (
                  <div className="overflow-hidden rounded-3xl border border-border bg-card">
                    <div className="border-b border-border px-5 py-4">
                      <p className="font-bold">Planned transaction</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">It stays outside actual balances until it is paid or received.</p>
                    </div>
                    <div className="grid gap-3 p-4 sm:grid-cols-2">
                      <label className="block sm:col-span-2"><span className="mb-2 block text-xs font-bold">Type</span><select name="plannedType" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"><option value="expense">Planned expense</option><option value="income">Planned income</option></select></label>
                      <label className="block"><span className="mb-2 block text-xs font-bold">Account</span><select name="account" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm">{accountRows.map((account) => <option key={account.name}>{account.name}</option>)}</select></label>
                      <label className="block"><span className="mb-2 block text-xs font-bold">Category</span><select name="plannedCategory" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm">{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
                      <label className="block"><span className="mb-2 block text-xs font-bold">Amount</span><input name="amount" type="number" min="0" step="0.01" required placeholder="0.00" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-right text-lg font-extrabold" /></label>
                    </div>
                  </div>
                )}

                <div className="overflow-hidden rounded-3xl border border-border bg-card">
                  <label className="flex cursor-pointer items-center gap-4 px-5 py-4">
                    <div className="grid size-11 place-items-center rounded-2xl bg-muted"><FileText className="size-5" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">Receipt or attachment</p>
                      <p className="text-[11px] text-muted-foreground">Add a photo, PDF or file.</p>
                    </div>
                    <span className="rounded-xl border border-border px-3 py-2 text-xs font-bold">Add</span>
                    <input type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={handleAttachments} className="hidden" />
                  </label>
                  {!!attachments.length && (
                    <div className="border-t border-border px-5 py-3">
                      {attachments.map((file) => (
                        <div key={file.name} className="flex items-center justify-between gap-3 py-1.5 text-xs">
                          <span className="min-w-0 truncate font-semibold">{file.name}</span>
                          <button type="button" onClick={() => setAttachments((items) => items.filter((item) => item.name !== file.name))} className="shrink-0 text-muted-foreground hover:text-destructive">Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="overflow-hidden rounded-3xl border border-border bg-card">
                  <button type="button" onClick={() => setShowAdvanced((value) => !value)} className="flex w-full items-center justify-between px-5 py-4 text-left">
                    <div><p className="font-bold">More details</p><p className="mt-1 text-[11px] text-muted-foreground">Date, status, repeat and notes</p></div>
                    <ChevronRight className={'size-5 transition-transform ' + (showAdvanced ? 'rotate-90' : '')} />
                  </button>
                  {showAdvanced && (
                    <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2">
                      <label className="block"><span className="mb-2 block text-xs font-bold">Date</span><input name="date" required type="date" defaultValue="2026-09-20" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" /></label>
                      <label className="block"><span className="mb-2 block text-xs font-bold">Status</span><select name="status" disabled={entryMode === 'planned'} defaultValue="cleared" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"><option value="cleared">Cleared</option><option value="not-cleared">Not cleared</option></select></label>
                      <label className="block"><span className="mb-2 block text-xs font-bold">Class</span><select name="className" defaultValue="Personal" className="h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"><option>Personal</option><option>Business</option><option>Travel</option></select></label>
                      <label className="block"><span className="mb-2 block text-xs font-bold">Check #</span><input name="checkNumber" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" /></label>
                      <label className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm font-semibold sm:col-span-2">
                        <input name="recurring" type="checkbox" /> Repeat this transaction
                      </label>
                      <label className="block sm:col-span-2"><span className="mb-2 block text-xs font-bold">Notes</span><textarea name="description" rows={3} className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm" placeholder="Add a note..." /></label>
                    </div>
                  )}
                </div>

                <div className="pt-1">
                  <button type="submit" className="h-12 w-full rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-sm">
                    Save {entryMode === 'expense' ? 'expense' : entryMode === 'income' ? 'income' : entryMode === 'transfer' ? 'transfer' : 'planned transaction'}
                  </button>
                </div>
              </div>
            </form>

            {showCategoryManager && (
              <div className="fixed inset-0 z-[90] flex items-end justify-center bg-foreground/40 p-3 sm:items-center">
                <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display text-lg font-extrabold">My categories</p>
                      <p className="text-xs text-muted-foreground">Create your categories the way you want them.</p>
                    </div>
                    <button type="button" onClick={() => setShowCategoryManager(false)} className="grid size-9 place-items-center rounded-xl hover:bg-muted"><X className="size-5" /></button>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCategory(); } }} placeholder="New category" className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm" />
                    <button type="button" onClick={addCategory} className="h-11 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground">Add</button>
                  </div>
                  <div className="mt-4 max-h-56 overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                      {categories.map((category) => (
                        <button type="button" key={category} onClick={() => setCategories((items) => items.filter((item) => item !== category))} className="rounded-full border border-border px-3 py-2 text-xs font-semibold hover:border-destructive hover:text-destructive">
                          {category} ×
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function AccountsPreview() {
  const [filter, setFilter] = useState<'all' | 'cash' | 'bank' | 'investment' | 'card'>('all');
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [openAccountMenu, setOpenAccountMenu] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<(typeof accountRows)[number] | null>(null);
  const [editingAccount, setEditingAccount] = useState<(typeof accountRows)[number] | null>(null);
  const [accountFormType, setAccountFormType] = useState<(typeof accountRows)[number]['type']>('Bank');
  const [accountTransactions, setAccountTransactions] = useState<typeof transactionRows>(transactionRows);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [transactionPeriod, setTransactionPeriod] = useState<'all' | 'today' | 'week' | 'month' | '30days' | 'custom'>('month');
  const [transactionFrom, setTransactionFrom] = useState('');
  const [transactionTo, setTransactionTo] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<(typeof transactionRows)[number] | null>(null);
  const [accounts, setAccounts] = useState(accountRows);

  const filtered = accounts.filter((account) => {
    const matchesType = filter === 'all' || (
      filter === 'cash' ? account.type === 'Cash' :
      filter === 'bank' ? account.type === 'Bank' :
      filter === 'investment' ? account.type === 'Investment' :
      account.type === 'Credit card'
    );
    const matchesSearch = account.name.toLowerCase().includes(search.toLowerCase()) || account.type.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const totals = {
    cash: accounts.filter((a) => a.type === 'Cash' || a.type === 'Bank').reduce((s, a) => s + (a.currency === 'EGP' ? a.balance : 0), 0),
    investments: accounts.filter((a) => a.type === 'Investment' && a.currency === 'EGP').reduce((s, a) => s + a.balance, 0),
    cards: accounts.filter((a) => a.type === 'Credit card' && a.currency === 'EGP').reduce((s, a) => s + Math.abs(a.balance), 0),
  };

  const filteredAccountTransactions = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (transactionPeriod === 'today') {
      // keep today's range
    } else if (transactionPeriod === 'week') {
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
    } else if (transactionPeriod === 'month') {
      start.setDate(1);
    } else if (transactionPeriod === '30days') {
      start.setDate(start.getDate() - 29);
    }

    return accountTransactions.filter((tx) => {
      const typeMatches =
        transactionFilter === 'all' || tx.type === transactionFilter;
      if (!typeMatches) return false;
      if (transactionPeriod === 'all') return true;

      if (transactionPeriod === 'custom') {
        const date = new Date(tx.date + ' 2026');
        const label = tx.date.slice(0, 2) + ' Sep 2026';
        const normalized = new Date(label);
        if (Number.isNaN(normalized.getTime())) return true;
        if (transactionFrom && normalized < new Date(transactionFrom + 'T00:00:00')) return false;
        if (transactionTo && normalized > new Date(transactionTo + 'T23:59:59')) return false;
        return true;
      }

      const normalized = new Date(tx.date + ' 2026');
      if (Number.isNaN(normalized.getTime())) return true;
      return normalized >= start && normalized <= end;
    });
  }, [accountTransactions, transactionFilter, transactionPeriod, transactionFrom, transactionTo]);

  const transactionBalances = useMemo(() => {
    if (!selectedAccount) return new Map<string, number>();
    const sorted = [...accountTransactions].sort((a, b) => new Date(b.date + ' 2026').getTime() - new Date(a.date + ' 2026').getTime());
    let running = selectedAccount.balance;
    const result = new Map<string, number>();

    for (const tx of sorted) {
      result.set(tx.date + tx.title, running);
      running -= tx.amount;
    }

    return result;
  }, [selectedAccount, accountTransactions]);

  function openAccountDetails(account: (typeof accountRows)[number]) {
    setSelectedAccount(account);
    setTransactionFilter('all');
    setTransactionPeriod('month');
    setTransactionFrom('');
    setTransactionTo('');
    setSelectedTransaction(null);
    setAccountTransactions(
      transactionRows.filter((transaction) =>
        transaction.account.toLowerCase().includes(account.name.toLowerCase()) ||
        account.name.toLowerCase().includes(transaction.account.toLowerCase().split(' ')[0]),
      ),
    );
  }

  function openEditAccount(account: (typeof accountRows)[number]) {
    setSelectedAccount(null);
    setEditingAccount(account);
    setAccountFormType(account.type === 'Credit card' ? 'Credit card' : account.type === 'Cash' ? 'Cash' : account.type === 'Investment' ? 'Bank' : account.type);
    setShowAdd(true);
  }

  function submitAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || 'New account').trim();
    const type = String(form.get('type') || accountFormType) as typeof accountRows[number]['type'];
    const currency = String(form.get('currency') || 'EGP');
    const opening = Number(form.get('opening') || 0);
    const bank = String(form.get('bank') || '').trim();
    const provider = String(form.get('provider') || '').trim();
    const location = String(form.get('location') || '').trim();
    const creditLimit = Number(form.get('creditLimit') || 0);
    const outstanding = Number(form.get('outstanding') || 0);

    const nextAccount = {
      name,
      type,
      currency,
      balance:
        type === 'Credit card'
          ? -Math.max(0, Number.isFinite(outstanding) ? outstanding : 0)
          : Number.isFinite(opening) ? opening : 0,
    };

    if (editingAccount) {
      setAccounts((current) => current.map((account) => account.name === editingAccount.name ? nextAccount : account));
      setSelectedAccount((current) => current?.name === editingAccount.name ? nextAccount : current);
    } else {
      setAccounts((current) => [...current, nextAccount]);
    }

    setShowAdd(false);
    setEditingAccount(null);
    setAccountFormType('Bank');
    event.currentTarget.reset();
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Money management</p>
          <h2 className="mt-1 font-display text-3xl font-extrabold tracking-tight">Accounts</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Manage cash, banks, investment accounts and credit cards with a clear register-style view.</p>
        </div>
        <button
          onClick={() => {
            setEditingAccount(null);
            setAccountFormType('Bank');
            setShowAdd(true);
          }}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm"
        >
          <CirclePlus className="size-4" />
          New account
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground">Payment accounts</p>
            <WalletCards className="size-4 text-primary" />
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold">{money(totals.cash)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Cash and bank balances in EGP</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground">Investments</p>
            <Building2 className="size-4 text-primary" />
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold">{money(totals.investments)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Investment accounts tracked separately</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground">Credit card debt</p>
            <WalletCards className="size-4" />
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold">{money(totals.cards)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Outstanding card balance</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1 lg:max-w-md">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search accounts..."
                className="h-11 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(event) => setShowArchived(event.target.checked)}
                className="size-4 accent-primary"
              />
              Show archived
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              ['all', 'All accounts'],
              ['cash', 'Cash'],
              ['bank', 'Banks'],
              ['investment', 'Investments'],
              ['card', 'Credit cards'],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value as typeof filter)}
                className={'rounded-xl px-3 py-2 text-xs font-bold transition-colors ' + (filter === value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden grid-cols-[1.7fr_.9fr_.6fr_1fr_auto] gap-4 border-b border-border bg-muted/40 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground sm:grid">
          <span>Account</span>
          <span>Type</span>
          <span>Currency</span>
          <span className="text-right">Balance</span>
          <span />
        </div>

        <div className="divide-y divide-border">
          {filtered.map((account) => (
            <div
              key={account.name}
              role="button"
              tabIndex={0}
              onClick={() => openAccountDetails(account)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openAccountDetails(account);
                }
              }}
              className="grid cursor-pointer grid-cols-2 items-center gap-3 px-5 py-4 transition-colors hover:bg-primary/[0.035] sm:grid-cols-[1.7fr_.9fr_.6fr_1fr_auto]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{account.name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground sm:hidden">{account.type} · {account.currency}</p>
              </div>
              <span className="hidden text-xs text-muted-foreground sm:block">{account.type}</span>
              <span className="hidden text-xs font-semibold sm:block">{account.currency}</span>
              <span className={'text-right text-sm font-extrabold ' + (account.balance < 0 ? 'text-destructive' : '')}>
                {money(account.balance, account.currency)}
              </span>
              <button
                type="button"
                aria-label={'Edit ' + account.name}
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenAccountMenu((current) => current === account.name ? null : account.name);
                }}
                className="relative hidden size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground sm:grid"
              >
                <MoreHorizontal className="size-4" />
                {openAccountMenu === account.name && (
                  <span
                    className="absolute right-0 top-9 z-30 whitespace-nowrap rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-foreground shadow-lg"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenAccountMenu(null);
                      openAccountDetails(account);
                    }}
                  >
                    Open account
                  </span>
                )}
              </button>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-bold">No accounts found</p>
              <p className="mt-1 text-xs text-muted-foreground">Try another search or category.</p>
            </div>
          )}
        </div>
      </Card>

      {selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-border bg-card shadow-2xl">
            <div className="sticky top-0 z-20 flex items-start justify-between border-b border-border bg-card px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Account details</p>
                <h3 className="mt-1 font-display text-2xl font-extrabold">{selectedAccount.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{selectedAccount.type} · {selectedAccount.currency}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditAccount(selectedAccount)}
                  className="rounded-xl border border-border px-3 py-2 text-xs font-bold hover:bg-muted"
                >
                  Edit account
                </button>
                <button
                  onClick={() => setSelectedAccount(null)}
                  className="rounded-xl border border-border px-3 py-2 text-xs font-bold hover:bg-muted"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="p-4"><p className="text-[11px] text-muted-foreground">Current balance</p><p className="mt-2 font-display text-2xl font-extrabold">{money(selectedAccount.balance, selectedAccount.currency)}</p></Card>
                <Card className="p-4"><p className="text-[11px] text-muted-foreground">Account type</p><p className="mt-2 text-sm font-bold">{selectedAccount.type}</p></Card>
                <Card className="p-4"><p className="text-[11px] text-muted-foreground">Currency</p><p className="mt-2 text-sm font-bold">{selectedAccount.currency}</p></Card>
              </div>

              <Card className="overflow-hidden">
                <div className="border-b border-border p-4">
                  <div>
                    <h4 className="font-display text-lg font-extrabold">Transactions</h4>
                    <p className="mt-1 text-[11px] text-muted-foreground">Filter activity by type and date, and see the running balance after each entry.</p>
                  </div>
                </div>
                <div className="border-b border-border bg-muted/20 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2">
                      {[
                        ['all', 'All'],
                        ['income', 'Income'],
                        ['expense', 'Expenses'],
                        ['transfer', 'Transfers'],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setTransactionFilter(value as typeof transactionFilter)}
                          className={'rounded-xl px-3 py-2 text-[11px] font-bold ' + (transactionFilter === value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground')}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <select
                      value={transactionPeriod}
                      onChange={(event) => setTransactionPeriod(event.target.value as typeof transactionPeriod)}
                      className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold outline-none focus:border-primary"
                    >
                      <option value="all">All time</option>
                      <option value="today">Today</option>
                      <option value="week">This week</option>
                      <option value="month">This month</option>
                      <option value="30days">Last 30 days</option>
                      <option value="custom">Custom period</option>
                    </select>
                  </div>

                  {transactionPeriod === 'custom' && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">From</span>
                        <input
                          type="date"
                          value={transactionFrom}
                          onChange={(event) => setTransactionFrom(event.target.value)}
                          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">To</span>
                        <input
                          type="date"
                          value={transactionTo}
                          onChange={(event) => setTransactionTo(event.target.value)}
                          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div className="divide-y divide-border">
                  {filteredAccountTransactions.map((tx) => {
                    const balanceAfter = transactionBalances.get(tx.date + tx.title) ?? selectedAccount.balance;
                    return (
                      <button
                        key={tx.date + tx.title}
                        type="button"
                        onClick={() => setSelectedTransaction(tx)}
                        className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-primary/[0.035]"
                      >
                        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
                          {tx.type === 'income' && <ArrowDownLeft className="size-4 text-primary" />}
                          {tx.type === 'expense' && <ArrowUpRight className="size-4" />}
                          {tx.type === 'transfer' && <ArrowLeftRight className="size-4 text-primary" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{tx.title}</p>
                          <p className="mt-1 truncate text-[11px] text-muted-foreground">{tx.date} · {tx.category} · {tx.account}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={'text-sm font-extrabold ' + (tx.amount >= 0 ? 'text-primary' : 'text-destructive')}>
                            {tx.amount >= 0 ? '+' : ''}{money(tx.amount, selectedAccount.currency)}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-muted-foreground">
                            {money(balanceAfter, selectedAccount.currency)}
                          </p>

                        </div>
                      </button>
                    );
                  })}
                  {filteredAccountTransactions.length === 0 && (
                    <div className="px-5 py-10 text-center text-xs text-muted-foreground">No transactions match this filter.</div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {selectedTransaction && selectedAccount && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/20 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Transaction details</p>
                <h3 className="mt-1 font-display text-2xl font-extrabold">{selectedTransaction.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{selectedTransaction.category} · {selectedTransaction.account}</p>
              </div>
              <button onClick={() => setSelectedTransaction(null)} className="rounded-xl border border-border px-3 py-2 text-xs font-bold hover:bg-muted">Close</button>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="p-4">
                  <p className="text-[11px] text-muted-foreground">Amount</p>
                  <p className={'mt-2 font-display text-2xl font-extrabold ' + (selectedTransaction.amount >= 0 ? 'text-primary' : 'text-destructive')}>
                    {selectedTransaction.amount >= 0 ? '+' : ''}{money(selectedTransaction.amount, selectedAccount.currency)}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-[11px] text-muted-foreground">Date</p>
                  <p className="mt-2 text-sm font-bold">{selectedTransaction.date}</p>
                </Card>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="p-4">
                  <p className="text-[11px] text-muted-foreground">Type</p>
                  <p className="mt-2 text-sm font-bold capitalize">{selectedTransaction.type}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-[11px] text-muted-foreground">Balance after transaction</p>
                  <p className="mt-2 text-sm font-extrabold">{money(transactionBalances.get(selectedTransaction.date + selectedTransaction.title) ?? selectedAccount.balance, selectedAccount.currency)}</p>
                </Card>
              </div>
              <Card className="p-4">
                <p className="text-[11px] text-muted-foreground">Account</p>
                <p className="mt-2 text-sm font-bold">{selectedAccount.name} · {selectedAccount.currency}</p>
              </Card>
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button onClick={() => setSelectedTransaction(null)} className="h-10 rounded-xl border border-border px-4 text-xs font-bold">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Accounts</p>
                <h3 className="mt-1 font-display text-2xl font-extrabold">{editingAccount ? 'Edit account' : 'New account'}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Add a cash, bank, investment or credit card account.</p>
              </div>
              <button onClick={() => setShowAdd(false)} className="rounded-xl px-3 py-2 text-sm font-bold text-muted-foreground hover:bg-muted">Close</button>
            </div>

            <form onSubmit={submitAccount} className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold">Account name *</span>
                  <input
                    name="name"
                    required
                    defaultValue={editingAccount?.name ?? ''}
                    placeholder={accountFormType === 'Credit card' ? 'CIB Visa' : 'CIB Current Account'}
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold">Account type *</span>
                  <select
                    name="type"
                    value={accountFormType}
                    onChange={(event) => setAccountFormType(event.target.value as typeof accountFormType)}
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  >
                    <option>Bank</option>
                    <option>Cash</option>
                    <option>Credit card</option>
                    <option>Prepaid</option>
                    <option>E-Wallet</option>
                  </select>
                </label>

                {accountFormType === 'Bank' && (
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold">Bank / Institution *</span>
                    <input name="bank" required defaultValue={editingAccount?.type === 'Bank' ? 'CIB' : ''} placeholder="CIB" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
                  </label>
                )}

                {accountFormType === 'Cash' && (
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold">Location / Wallet Name *</span>
                    <input name="location" required placeholder="Home cash" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
                  </label>
                )}

                {accountFormType === 'E-Wallet' && (
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold">Provider *</span>
                    <input name="provider" required placeholder="Vodafone Cash" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
                  </label>
                )}

                {accountFormType === 'Credit card' && (
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold">Bank / Provider *</span>
                    <input name="bank" required defaultValue={editingAccount?.type === 'Credit card' ? 'CIB' : ''} placeholder="CIB" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
                  </label>
                )}

                <label className="block">
                  <span className="mb-2 block text-xs font-bold">Currency *</span>
                  <select name="currency" defaultValue={editingAccount?.currency ?? 'EGP'} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
                    <option value="EGP">EGP — Egyptian Pound</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="AED">AED — UAE Dirham</option>
                    <option value="SAR">SAR — Saudi Riyal</option>
                  </select>
                  <span className="mt-1 block text-[10px] text-muted-foreground">More currencies can be added later from Settings.</span>
                </label>

                {accountFormType !== 'Credit card' && (
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold">Opening balance</span>
                    <input name="opening" type="number" step="0.01" defaultValue={editingAccount?.balance ?? 0} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
                  </label>
                )}

                {accountFormType === 'Credit card' && (
                  <>
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold">Credit limit *</span>
                      <input name="creditLimit" required type="number" min="0" step="0.01" placeholder="50,000" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-bold">Current outstanding</span>
                      <input name="outstanding" type="number" min="0" step="0.01" defaultValue={editingAccount?.balance ? Math.abs(editingAccount.balance) : 0} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-bold">Statement day</span>
                      <input name="statementDay" type="number" min="1" max="31" step="1" placeholder="1 - 31" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-bold">Payment due day</span>
                      <input name="dueDay" type="number" min="1" max="31" step="1" placeholder="1 - 31" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
                    </label>
                  </>
                )}

                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-xs font-bold">Notes</span>
                  <textarea
                    name="notes"
                    defaultValue=""
                    rows={4}
                    placeholder="Optional notes..."
                    className="min-h-24 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-5">
                <button type="button" onClick={() => { setShowAdd(false); setEditingAccount(null); }} className="h-10 rounded-xl border border-border px-4 text-xs font-bold">Cancel</button>
                <button type="submit" className="h-10 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground">{editingAccount ? 'Save changes' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default function MoneyProPreview() {
  const [screen, setScreen] = useState<Screen>('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);

  const monthLabel = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(d);
  }, [monthOffset]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {mobileOpen && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex min-h-dvh">
        <aside className={'fixed inset-y-0 left-0 z-50 w-[248px] border-r border-border bg-card p-4 transition-transform lg:static lg:translate-x-0 ' + (mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
          <div className="flex items-center justify-between px-2 pb-6">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
                <BarChart3 className="size-5" />
              </div>
              <div>
                <p className="font-display text-lg font-extrabold tracking-tight">Financy</p>
                <p className="text-[11px] text-muted-foreground">Money Pro inspired</p>
              </div>
            </div>
            <button className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close">
              <ChevronLeft className="size-5" />
            </button>
          </div>

          <nav className="space-y-1">
            {screens.map((item) => {
              const Icon = item.icon;
              const active = item.id === screen;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setScreen(item.id);
                    setMobileOpen(false);
                  }}
                  className={'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors ' + (active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
                >
                  <Icon className="size-[18px]" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl border border-border bg-muted/40 p-3">
            <p className="text-xs font-bold">Current profile</p>
            <p className="mt-1 text-sm">Ahmed</p>
            <p className="mt-2 text-[11px] text-muted-foreground">Base currency: EGP</p>
          </div>

          <button className="mt-4 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
            <Settings className="size-[18px]" />
            Settings
          </button>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md sm:px-7">
            <div className="flex items-center gap-3">
              <button
                className="grid size-9 place-items-center rounded-xl hover:bg-muted lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </button>
              <div>
                <p className="text-xs text-muted-foreground">Personal finance</p>
                <h1 className="font-display text-lg font-extrabold tracking-tight">
                  {screens.find((x) => x.id === screen)?.label}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="grid size-9 place-items-center rounded-xl border border-border bg-card hover:bg-muted" aria-label="Search">
                <Search className="size-4" />
              </button>
              <button className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-3.5 text-xs font-bold text-primary-foreground">
                <Plus className="size-4" />
                Add
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-[1380px] space-y-6 p-4 sm:p-7 lg:p-9">
            {screen === 'overview' && (
              <>
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Card className="p-5"><p className="text-xs font-semibold text-muted-foreground">Net worth</p><p className="mt-2 font-display text-3xl font-extrabold">{money(143240)}</p><p className="mt-2 text-xs text-muted-foreground">Assets minus liabilities</p></Card>
                  <Card className="p-5"><p className="text-xs font-semibold text-muted-foreground">Available cash</p><p className="mt-2 font-display text-3xl font-extrabold">{money(92700)}</p><p className="mt-2 text-xs text-muted-foreground">Across payment accounts</p></Card>
                  <Card className="p-5"><p className="text-xs font-semibold text-muted-foreground">Investments</p><p className="mt-2 font-display text-3xl font-extrabold">{money(71300)}</p><p className="mt-2 text-xs text-muted-foreground">Current value</p></Card>
                  <Card className="p-5"><p className="text-xs font-semibold text-muted-foreground">Liabilities</p><p className="mt-2 font-display text-3xl font-extrabold">{money(20760)}</p><p className="mt-2 text-xs text-muted-foreground">Cards & debts</p></Card>
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">This month</p><h2 className="mt-1 font-display text-xl font-extrabold">Cash flow</h2></div>
                      <div className="rounded-xl bg-muted px-3 py-2 text-xs font-bold">{monthLabel}</div>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="rounded-2xl bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Income</p><p className="mt-1 text-xl font-extrabold">{money(32780)}</p></div>
                      <div className="rounded-2xl bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Expenses</p><p className="mt-1 text-xl font-extrabold">{money(14220)}</p></div>
                    </div>
                    <div className="mt-6 flex h-44 items-end gap-2">
                      {[35, 48, 34, 60, 42, 72, 55, 82, 64, 90, 70, 78].map((height, i) => (
                        <div key={i} className="flex flex-1 items-end"><div className="w-full rounded-t-lg bg-primary/80" style={{ height: height + '%' }} /></div>
                      ))}
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span></div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Budgets</p><h2 className="mt-1 font-display text-xl font-extrabold">At a glance</h2></div>
                      <button onClick={() => setScreen('budgets')} className="text-xs font-bold text-primary">View all</button>
                    </div>
                    <div className="mt-5 space-y-5">
                      {budgetRows.slice(0, 3).map((row) => (
                        <div key={row.label}>
                          <div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold">{row.label}</span><span className="text-muted-foreground">{money(row.spent)} / {money(row.limit)}</span></div>
                          <Progress value={(row.spent / row.limit) * 100} />
                        </div>
                      ))}
                    </div>
                  </Card>
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
                  <Card className="p-6">
                    <div className="flex items-center justify-between"><h2 className="font-display text-xl font-extrabold">Recent transactions</h2><button onClick={() => setScreen('transactions')} className="text-xs font-bold text-primary">See all</button></div>
                    <div className="mt-4 divide-y divide-border">
                      {transactionRows.slice(0, 5).map((row) => (
                        <div key={row.date + row.title} className="flex items-center justify-between gap-3 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
                              {row.type === 'income' && <ArrowDownLeft className="size-4 text-primary" />}
                              {row.type === 'expense' && <ArrowUpRight className="size-4" />}
                              {row.type === 'transfer' && <ArrowLeftRight className="size-4 text-primary" />}
                            </div>
                            <div className="min-w-0"><p className="truncate text-sm font-bold">{row.title}</p><p className="truncate text-[11px] text-muted-foreground">{row.category} · {row.account}</p></div>
                          </div>
                          <div className={'text-sm font-extrabold ' + (row.amount >= 0 ? 'text-primary' : 'text-foreground')}>{row.amount >= 0 ? '+' : ''}{money(row.amount)}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                  <Card className="p-6">
                    <div className="flex items-center justify-between"><h2 className="font-display text-xl font-extrabold">Accounts</h2><button onClick={() => setScreen('accounts')} className="text-xs font-bold text-primary">Manage</button></div>
                    <div className="mt-4 space-y-3">
                      {accountRows.slice(0, 5).map((row) => (
                        <div key={row.name} className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
                          <div><p className="text-sm font-bold">{row.name}</p><p className="text-[11px] text-muted-foreground">{row.type}</p></div>
                          <p className="text-sm font-extrabold">{money(row.balance, row.currency)}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                </section>
              </>
            )}

            {screen === 'accounts' && (
              <AccountsPreview />
            )}

            {screen === 'transactions' && (
              <TransactionsPreview />
            )}

            {screen === 'calendar' && (
              <section className="space-y-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Bill planning</p><h2 className="mt-1 font-display text-3xl font-extrabold">Calendar</h2><p className="mt-1 text-sm text-muted-foreground">Recurring bills and scheduled transactions.</p></div>
                  <div className="flex items-center gap-2"><button onClick={() => setMonthOffset((v) => v - 1)} className="grid size-9 place-items-center rounded-xl border border-border"><ChevronLeft className="size-4" /></button><div className="min-w-36 text-center text-sm font-bold">{monthLabel}</div><button onClick={() => setMonthOffset((v) => v + 1)} className="grid size-9 place-items-center rounded-xl border border-border"><ChevronRight className="size-4" /></button></div>
                </div>
                <Card className="overflow-hidden p-3 sm:p-5">
                  <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-muted-foreground sm:text-[11px]">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => <div key={d} className="py-2">{d}</div>)}</div>
                  <div className="mt-2 grid grid-cols-7 gap-2">
                    {Array.from({ length: 35 }, (_, i) => {
                      const day = i - 2;
                      return <div key={i} className="min-h-20 rounded-2xl border border-border p-2 text-left sm:min-h-24"><p className="text-xs font-bold">{day > 0 && day <= 30 ? day : ''}</p>{[6, 13, 21, 28].includes(i) && <div className="mt-2 rounded-lg bg-primary/10 px-2 py-1 text-[9px] font-bold text-primary">Electricity</div>}{[10, 25].includes(i) && <div className="mt-1 rounded-lg bg-muted px-2 py-1 text-[9px] font-bold">Salary</div>}</div>;
                    })}
                  </div>
                </Card>
              </section>
            )}

            {screen === 'budgets' && (
              <section className="space-y-5">
                <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Spending control</p><h2 className="mt-1 font-display text-3xl font-extrabold">Budgets</h2><p className="mt-1 text-sm text-muted-foreground">Category limits, progress and rollover-ready planning.</p></div>
                <div className="grid gap-4 md:grid-cols-2">
                  {budgetRows.map((row) => {
                    const pct = (row.spent / row.limit) * 100;
                    return <Card key={row.label} className="p-5"><div className="flex items-center justify-between"><span className="text-sm font-bold">{row.label}</span><span className="text-xs text-muted-foreground">{money(row.spent)} / {money(row.limit)}</span></div><div className="mt-4"><Progress value={pct} /></div><div className="mt-2 flex justify-between text-[11px] text-muted-foreground"><span>{Math.round(pct)}% used</span><span>{money(row.limit - row.spent)} left</span></div></Card>;
                  })}
                </div>
              </section>
            )}

            {screen === 'reports' && (
              <section className="space-y-5">
                <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Analysis</p><h2 className="mt-1 font-display text-3xl font-extrabold">Reports</h2><p className="mt-1 text-sm text-muted-foreground">Income, expenses, cash flow and net worth.</p></div>
                <div className="grid gap-4 md:grid-cols-3"><Card className="p-5"><p className="text-xs text-muted-foreground">Savings rate</p><p className="mt-2 text-2xl font-extrabold">56.6%</p></Card><Card className="p-5"><p className="text-xs text-muted-foreground">Monthly net</p><p className="mt-2 text-2xl font-extrabold">{money(18560)}</p></Card><Card className="p-5"><p className="text-xs text-muted-foreground">Net worth change</p><p className="mt-2 text-2xl font-extrabold text-primary">+4.8%</p></Card></div>
                <Card className="p-6"><h3 className="font-display text-xl font-extrabold">Income vs expenses</h3><div className="mt-6 flex h-56 items-end gap-2 sm:gap-4">{[55, 70, 62, 84, 76, 92, 80, 95, 68, 88, 73, 98].map((h, i) => <div key={i} className="flex flex-1 gap-1"><div className="w-1/2 rounded-t-lg bg-primary/80" style={{ height: h + '%' }} /><div className="w-1/2 rounded-t-lg bg-foreground/15" style={{ height: Math.max(h - 28, 18) + '%' }} /></div>)}</div><div className="mt-3 flex justify-between text-[11px] text-muted-foreground"><span>Jan</span><span>Jun</span><span>Dec</span></div></Card>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}