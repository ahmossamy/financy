import { useEffect, useMemo, useState } from 'react';
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
  LineChart,
  Plus,
  Search,
  Settings,
  WalletCards,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/services/supabase';
import {
  categoryLabel,
  loadTransactionSettings,
  saveTransactionSettings,
  TRANSACTION_FIELD_LABELS,
  type TransactionFieldKey,
  type TransactionSettings,
} from '@/lib/transaction-settings';

type Screen = 'overview' | 'accounts' | 'transactions' | 'investments' | 'calendar' | 'budgets' | 'reports';

const screens: Array<{ id: Screen; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'accounts', label: 'Accounts', icon: WalletCards },
  { id: 'transactions', label: 'Transactions', icon: FileText },
  { id: 'investments', label: 'Investments', icon: LineChart },
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
  currency?: string;
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
  person?: string;
  reference?: string;
  tag?: string;
  repeat?: string;
  nextDate?: string;
  installment?: boolean;
  installmentCount?: number;
  currentInstallment?: number;
  time?: string;
};


function InvestmentsPreview() {
  type InvestmentTab = 'overview' | 'portfolios' | 'platforms' | 'assets' | 'activity';
  type Holding = { id: string; asset: string; symbol: string; type: string; portfolio: string; platform: string; quantity: number; avgCost: number; price: number; currency: string };

  const [tab, setTab] = useState<InvestmentTab>('overview');
  const [showAdd, setShowAdd] = useState(false);
  const [holdings, setHoldings] = useState<Holding[]>([
    { id: 'h1', asset: 'Orascom Construction', symbol: 'ORAS', type: 'Stock', portfolio: 'Wealth', platform: 'Thndr', quantity: 120, avgCost: 133.33, price: 160, currency: 'EGP' },
    { id: 'h2', asset: 'EFG Holding', symbol: 'EFID', type: 'Stock', portfolio: 'Wealth', platform: 'Thndr', quantity: 400, avgCost: 20, price: 24.5, currency: 'EGP' },
    { id: 'h3', asset: 'Telecom Egypt', symbol: 'ETEL', type: 'Stock', portfolio: 'Wealth', platform: 'Thndr', quantity: 300, avgCost: 20.13, price: 25.2, currency: 'EGP' },
    { id: 'h4', asset: 'Abu Dhabi Islamic Bank', symbol: 'ADIB', type: 'Stock', portfolio: 'Wealth', platform: 'CIB', quantity: 180, avgCost: 36.06, price: 42.5, currency: 'EGP' },
    { id: 'h5', asset: 'Elsewedy Electric', symbol: 'SWDY', type: 'Stock', portfolio: 'Retirement', platform: 'Thndr', quantity: 60, avgCost: 42.05, price: 48.8, currency: 'EGP' },
    { id: 'h6', asset: 'Talaat Moustafa Group', symbol: 'TMGH', type: 'Stock', portfolio: 'Retirement', platform: 'Thndr', quantity: 45, avgCost: 53.44, price: 61.2, currency: 'EGP' },
    { id: 'h7', asset: 'Sharia Equity Fund', symbol: 'CI-SHARIA', type: 'Fund', portfolio: 'Education', platform: 'CIB', quantity: 1000, avgCost: 10, price: 11.2, currency: 'EGP' },
  ]);

  const portfolios = [
    { name: 'Wealth', type: 'Wealth', target: 60, value: 43800 },
    { name: 'Retirement', type: 'Retirement', target: 25, value: 11900 },
    { name: 'Education', type: 'Education', target: 15, value: 5800 },
  ];
  const platforms = [
    { name: 'Thndr', type: 'Broker', value: 38200, holdings: 6 },
    { name: 'CIB', type: 'Bank / Funds', value: 17100, holdings: 2 },
    { name: 'Tilda', type: 'Investment platform', value: 6200, holdings: 0 },
  ];
  const activity = [
    { date: '20 Sep 2026', action: 'Buy', asset: 'ORAS', portfolio: 'Wealth', platform: 'Thndr', amount: 5000 },
    { date: '15 Sep 2026', action: 'Dividend', asset: 'ADIB', portfolio: 'Wealth', platform: 'CIB', amount: 780 },
    { date: '10 Sep 2026', action: 'Buy', asset: 'CI-SHARIA', portfolio: 'Education', platform: 'CIB', amount: 3000 },
    { date: '01 Sep 2026', action: 'Buy', asset: 'SWDY', portfolio: 'Retirement', platform: 'Thndr', amount: 2500 },
  ];

  const invested = holdings.reduce((sum, row) => sum + row.quantity * row.avgCost, 0);
  const currentValue = holdings.reduce((sum, row) => sum + row.quantity * row.price, 0);
  const unrealized = currentValue - invested;
  const returnPct = invested ? (unrealized / invested) * 100 : 0;

  function addHolding(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const quantity = Math.abs(Number(form.get('quantity') || 0));
    const avgCost = Math.abs(Number(form.get('avgCost') || 0));
    if (!String(form.get('asset') || '').trim() || quantity <= 0 || avgCost <= 0) return;
    const price = Math.abs(Number(form.get('price') || avgCost));
    setHoldings((rows) => [{
      id: 'h-' + Date.now(),
      asset: String(form.get('asset')),
      symbol: String(form.get('symbol') || '').toUpperCase(),
      type: String(form.get('type') || 'Stock'),
      portfolio: String(form.get('portfolio') || 'Wealth'),
      platform: String(form.get('platform') || 'Thndr'),
      quantity, avgCost, price,
      currency: String(form.get('currency') || 'EGP'),
    }, ...rows]);
    setShowAdd(false);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Investments</p>
          <h2 className="mt-1 font-display text-3xl font-extrabold">Investments</h2>
          <p className="mt-1 text-sm text-muted-foreground">Track portfolios, platforms, holdings, transactions and performance.</p>
        </div>
        <button type="button" onClick={() => setShowAdd(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm"><Plus className="size-4" /> Add investment</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5"><p className="text-xs text-muted-foreground">Current value</p><p className="mt-2 text-2xl font-extrabold">{money(currentValue)}</p><p className="mt-1 text-[11px] text-muted-foreground">Across all portfolios</p></Card>
        <Card className="p-5"><p className="text-xs text-muted-foreground">Invested</p><p className="mt-2 text-2xl font-extrabold">{money(invested)}</p><p className="mt-1 text-[11px] text-muted-foreground">Total cost basis</p></Card>
        <Card className="p-5"><p className="text-xs text-muted-foreground">Unrealized gain</p><p className="mt-2 text-2xl font-extrabold text-primary">{money(unrealized)}</p><p className="mt-1 text-[11px] text-primary">+{returnPct.toFixed(1)}%</p></Card>
        <Card className="p-5"><p className="text-xs text-muted-foreground">Holdings</p><p className="mt-2 text-2xl font-extrabold">{holdings.length}</p><p className="mt-1 text-[11px] text-muted-foreground">{platforms.length} platforms</p></Card>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-border bg-card p-2">
        {[['overview','Overview'],['portfolios','Portfolios'],['platforms','Platforms'],['assets','Assets'],['activity','Activity']].map(([value,label]) => (
          <button key={value} type="button" onClick={() => setTab(value as InvestmentTab)} className={'shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold ' + (tab === value ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted')}>{label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <Card className="p-5">
            <div className="flex items-center justify-between"><div><h3 className="font-display text-xl font-extrabold">Holdings</h3><p className="mt-1 text-xs text-muted-foreground">Current value and unrealized performance.</p></div><button type="button" onClick={() => setTab('assets')} className="text-xs font-bold text-primary">View all</button></div>
            <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead><tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.08em] text-muted-foreground"><th className="px-3 py-3">Asset</th><th className="px-3 py-3">Portfolio</th><th className="px-3 py-3">Platform</th><th className="px-3 py-3 text-right">Value</th><th className="px-3 py-3 text-right">Return</th></tr></thead><tbody>
              {holdings.map((row) => { const value = row.quantity * row.price; const gain = value - row.quantity * row.avgCost; const pct = row.avgCost ? (gain / (row.quantity * row.avgCost)) * 100 : 0; return <tr key={row.id} className="border-b border-border last:border-0"><td className="px-3 py-3"><p className="font-bold">{row.symbol || row.asset}</p><p className="text-[11px] text-muted-foreground">{row.asset}</p></td><td className="px-3 py-3 text-xs">{row.portfolio}</td><td className="px-3 py-3 text-xs">{row.platform}</td><td className="px-3 py-3 text-right font-bold">{money(value,row.currency)}</td><td className="px-3 py-3 text-right font-bold text-primary">+{pct.toFixed(1)}%</td></tr>; })}
            </tbody></table></div>
          </Card>
          <div className="space-y-5">
            <Card className="p-5"><h3 className="font-display text-xl font-extrabold">Allocation</h3><p className="mt-1 text-xs text-muted-foreground">By investment type.</p><div className="mt-5 space-y-4">
              {[['Stocks', holdings.filter((row) => row.type === 'Stock').reduce((sum,row) => sum + row.quantity * row.price,0)],['Funds', holdings.filter((row) => row.type === 'Fund').reduce((sum,row) => sum + row.quantity * row.price,0)],['Other',0]].map(([label,value]) => { const pct = currentValue ? (Number(value)/currentValue)*100 : 0; return <div key={label as string}><div className="flex justify-between text-xs font-bold"><span>{label}</span><span>{pct.toFixed(1)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:pct+'%'}} /></div><p className="mt-1 text-[11px] text-muted-foreground">{money(Number(value))}</p></div>; })}
            </div></Card>
            <Card className="p-5"><div className="flex items-center justify-between"><h3 className="font-display text-xl font-extrabold">Recent activity</h3><button type="button" onClick={() => setTab('activity')} className="text-xs font-bold text-primary">View all</button></div><div className="mt-3 divide-y divide-border">{activity.map((row) => <div key={row.date + row.asset} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-bold">{row.action} {row.asset}</p><p className="text-[11px] text-muted-foreground">{row.date} · {row.platform}</p></div><span className="text-sm font-bold">{money(row.amount)}</span></div>)}</div></Card>
          </div>
        </div>
      )}

      {tab === 'portfolios' && <Card className="p-5"><div className="flex items-center justify-between"><div><h3 className="font-display text-xl font-extrabold">Portfolios</h3><p className="mt-1 text-xs text-muted-foreground">Separate investment goals and track their value.</p></div><button type="button" className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold"><Plus className="size-3.5" /> New portfolio</button></div><div className="mt-5 grid gap-4 md:grid-cols-3">{portfolios.map((row) => <div key={row.name} className="rounded-2xl border border-border p-4"><div className="flex items-center justify-between"><div><p className="font-bold">{row.name}</p><p className="text-[11px] text-muted-foreground">{row.type}</p></div><span className="text-xs font-bold">{row.target}% target</span></div><p className="mt-5 text-2xl font-extrabold">{money(row.value)}</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:Math.min((row.value/currentValue)*100,100)+'%'}} /></div><p className="mt-2 text-[11px] text-muted-foreground">{holdings.filter((holding) => holding.portfolio === row.name).length} holdings</p></div>)}</div></Card>}

      {tab === 'platforms' && <Card className="p-5"><div className="flex items-center justify-between"><div><h3 className="font-display text-xl font-extrabold">Platforms</h3><p className="mt-1 text-xs text-muted-foreground">Brokers, banks and investment platforms.</p></div><button type="button" className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold"><Plus className="size-3.5" /> Add platform</button></div><div className="mt-5 grid gap-4 md:grid-cols-3">{platforms.map((row) => <div key={row.name} className="rounded-2xl border border-border p-4"><p className="font-bold">{row.name}</p><p className="mt-1 text-[11px] text-muted-foreground">{row.type}</p><p className="mt-5 text-2xl font-extrabold">{money(row.value)}</p><p className="mt-2 text-[11px] text-muted-foreground">{row.holdings} holdings</p></div>)}</div></Card>}

      {tab === 'assets' && <Card className="p-5"><div className="flex items-center justify-between"><div><h3 className="font-display text-xl font-extrabold">Assets</h3><p className="mt-1 text-xs text-muted-foreground">Stocks, funds and other investment assets.</p></div><button type="button" onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold"><Plus className="size-3.5" /> Add holding</button></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.08em] text-muted-foreground"><th className="px-3 py-3">Asset</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Qty</th><th className="px-3 py-3 text-right">Avg cost</th><th className="px-3 py-3 text-right">Price</th><th className="px-3 py-3 text-right">Value</th></tr></thead><tbody>{holdings.map((row) => <tr key={row.id} className="border-b border-border last:border-0"><td className="px-3 py-3"><p className="font-bold">{row.symbol || row.asset}</p><p className="text-[11px] text-muted-foreground">{row.asset}</p></td><td className="px-3 py-3 text-xs">{row.type}</td><td className="px-3 py-3">{row.quantity}</td><td className="px-3 py-3 text-right">{money(row.avgCost,row.currency)}</td><td className="px-3 py-3 text-right">{money(row.price,row.currency)}</td><td className="px-3 py-3 text-right font-bold">{money(row.quantity*row.price,row.currency)}</td></tr>)}</tbody></table></div></Card>}

      {tab === 'activity' && <Card className="p-5"><div><h3 className="font-display text-xl font-extrabold">Investment activity</h3><p className="mt-1 text-xs text-muted-foreground">Buy, sell and dividend transactions.</p></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead><tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.08em] text-muted-foreground"><th className="px-3 py-3">Date</th><th className="px-3 py-3">Action</th><th className="px-3 py-3">Asset</th><th className="px-3 py-3">Portfolio</th><th className="px-3 py-3">Platform</th><th className="px-3 py-3 text-right">Amount</th></tr></thead><tbody>{activity.map((row) => <tr key={row.date+row.asset} className="border-b border-border last:border-0"><td className="px-3 py-3 text-xs">{row.date}</td><td className="px-3 py-3 font-bold">{row.action}</td><td className="px-3 py-3 font-bold">{row.asset}</td><td className="px-3 py-3 text-xs">{row.portfolio}</td><td className="px-3 py-3 text-xs">{row.platform}</td><td className="px-3 py-3 text-right font-bold">{money(row.amount)}</td></tr>)}</tbody></table></div></Card>}

      {showAdd && <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-background p-6 shadow-2xl"><div className="flex items-center justify-between"><div><h3 className="font-display text-2xl font-extrabold">Add investment holding</h3><p className="mt-1 text-xs text-muted-foreground">Create the holding now. Buy and sell transaction history will be connected next.</p></div><button type="button" onClick={() => setShowAdd(false)} className="grid size-9 place-items-center rounded-xl border border-border"><X className="size-4" /></button></div><form onSubmit={addHolding} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-bold">Asset name<input name="asset" required className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal" placeholder="e.g. Orascom Construction" /></label>
        <label className="text-xs font-bold">Symbol<input name="symbol" className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal uppercase" placeholder="ORAS" /></label>
        <label className="text-xs font-bold">Type<select name="type" className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal"><option>Stock</option><option>Fund</option><option>ETF</option><option>Bond</option><option>Gold</option><option>Certificate</option><option>Crypto</option><option>Other</option></select></label>
        <label className="text-xs font-bold">Currency<select name="currency" className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal"><option>EGP</option><option>USD</option><option>SAR</option><option>AED</option></select></label>
        <label className="text-xs font-bold">Portfolio<select name="portfolio" className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal">{portfolios.map((row) => <option key={row.name}>{row.name}</option>)}</select></label>
        <label className="text-xs font-bold">Platform<select name="platform" className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal">{platforms.map((row) => <option key={row.name}>{row.name}</option>)}</select></label>
        <label className="text-xs font-bold">Quantity<input name="quantity" type="number" min="0" step="any" required className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal" /></label>
        <label className="text-xs font-bold">Average cost / unit<input name="avgCost" type="number" min="0" step="any" required className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal" /></label>
        <label className="text-xs font-bold">Current price / unit<input name="price" type="number" min="0" step="any" className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal" /></label>
        <div className="sm:col-span-2 flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowAdd(false)} className="h-11 rounded-xl border border-border px-4 text-sm font-bold">Cancel</button><button type="submit" className="h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground">Add holding</button></div>
      </form></div></div>}
    </section>
  );
}

function TransactionsPreview() {
  type EntryMode = 'expense' | 'income' | 'transfer' | 'planned';
  type LineItem = { id: string; itemId: string; name: string; category: string; amount: number };
  type Attachment = { name: string; type: string };

  const [rows, setRows] = useState<TransactionRecord[]>(() =>
    transactionRows.map((row, index) => ({
      ...row,
      id: 'tx-' + index,
      currency: accountRows.find((account) => account.name === row.account)?.currency ?? 'EGP',
      status: 'cleared',
      description: row.title,
      className: 'Personal',
    })),
  );
  const [transactionSettings, setTransactionSettings] = useState<TransactionSettings>(() => loadTransactionSettings());
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'cleared' | 'not-cleared' | 'planned'>('all');
  const [period, setPeriod] = useState<'this-month' | 'last-month' | '30-days' | 'custom'>('this-month');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<TransactionRecord | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showFieldSettings, setShowFieldSettings] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>('expense');
  const [formAccount, setFormAccount] = useState(accountRows[0]?.name ?? 'Cash');
  const [transferToAccount, setTransferToAccount] = useState(accountRows[1]?.name ?? accountRows[0]?.name ?? 'Cash');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferRate, setTransferRate] = useState('1');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: 'item-1', itemId: '', name: '', category: loadTransactionSettings().expenseCategories[0]?.name ?? 'Other', amount: 0 },
  ]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const accountOptions = accountRows.map((account) => account.name);
  const formCurrency = accountRows.find((account) => account.name === formAccount)?.currency ?? 'EGP';
  const expenseCategories = transactionSettings.expenseCategories;
  const incomeCategories = transactionSettings.incomeCategories;
  const expenseCategoryOptions = expenseCategories.map((item) => ({
    value: item.name,
    label: categoryLabel(item, expenseCategories),
  }));
  const incomeCategoryOptions = incomeCategories.map((item) => ({
    value: item.name,
    label: categoryLabel(item, incomeCategories),
  }));
  const categoryFilterOptions = Array.from(new Set([
    ...expenseCategoryOptions.map((item) => item.label),
    ...incomeCategoryOptions.map((item) => item.label),
    ...rows.map((row) => row.category),
  ]));
  const itemTotal = lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const transferSource = accountRows.find((account) => account.name === formAccount);
  const transferDestination = accountRows.find((account) => account.name === transferToAccount);
  const sourceCurrency = transferSource?.currency ?? 'EGP';
  const destinationCurrency = transferDestination?.currency ?? 'EGP';
  const effectiveTransferRate = sourceCurrency === destinationCurrency ? 1 : Math.max(0, Number(transferRate) || 0);
  const transferReceived = Math.max(0, Number(transferAmount) || 0) * effectiveTransferRate;

  useEffect(() => {
    const onSettingsChanged = () => setTransactionSettings(loadTransactionSettings());
    window.addEventListener('financy-transaction-settings-changed', onSettingsChanged);
    return () => window.removeEventListener('financy-transaction-settings-changed', onSettingsChanged);
  }, []);

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
      const date = new Date(row.date + ' 2026');
      const text = [row.title, row.account, row.category, row.payee, row.description, row.checkNumber, row.person, row.reference, row.tag].join(' ').toLowerCase();
      return (
        date >= startDate &&
        date <= endDate &&
        (typeFilter === 'all' || row.type === typeFilter) &&
        (accountFilter === 'all' || row.account.includes(accountFilter)) &&
        (categoryFilter === 'all' || row.category === categoryFilter) &&
        (statusFilter === 'all' || row.status === statusFilter) &&
        (!search || text.includes(search.toLowerCase()))
      );
    });
  }, [rows, typeFilter, accountFilter, categoryFilter, statusFilter, period, fromDate, toDate, search]);

  const totals = filtered.reduce((acc, row) => {
    if (row.status === 'planned') return acc;
    if (row.type === 'income') acc.income += Math.abs(row.amount);
    if (row.type === 'expense') acc.expenses += Math.abs(row.amount);
    return acc;
  }, { income: 0, expenses: 0 });

  function resetAddForm() {
    const settings = loadTransactionSettings();
    setTransactionSettings(settings);
    setEntryMode('expense');
    setFormAccount(accountRows[0]?.name ?? 'Cash');
    setTransferToAccount(accountRows[1]?.name ?? accountRows[0]?.name ?? 'Cash');
    setTransferAmount('');
    setTransferRate('1');
    setLineItems([{ id: 'item-' + Date.now(), itemId: '', name: '', category: settings.expenseCategories[0]?.name ?? 'Other', amount: 0 }]);
    setAttachments([]);
    setShowFieldSettings(false);
    setShowMoreDetails(false);
  }

  function openAdd() {
    resetAddForm();
    setShowAdd(true);
  }

  function closeAdd() {
    setShowAdd(false);
    setShowFieldSettings(false);
    setShowMoreDetails(false);
  }

  function addLineItem() {
    setLineItems((items) => [
      ...items,
      { id: 'item-' + Date.now() + '-' + items.length, itemId: '', name: '', category: expenseCategories[0]?.name ?? 'Other', amount: 0 },
    ]);
  }

  function updateLineItem(id: string, patch: Partial<LineItem>) {
    setLineItems((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function selectExpenseItem(id: string, itemId: string) {
    const selectedItem = transactionSettings.expenseItems.find((item) => item.id === itemId);
    if (!selectedItem) {
      updateLineItem(id, { itemId: '', name: '', category: expenseCategories[0]?.name ?? 'Other' });
      return;
    }
    const selectedCategory = expenseCategories.find((category) => category.id === selectedItem.categoryId);
    updateLineItem(id, {
      itemId,
      name: selectedItem.name,
      category: selectedCategory?.name ?? expenseCategories[0]?.name ?? 'Other',
    });
  }

  function removeLineItem(id: string) {
    setLineItems((items) => items.length === 1 ? items : items.filter((item) => item.id !== id));
  }

  function handleAttachments(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setAttachments((items) => [...items, ...files.map((file) => ({ name: file.name, type: file.type }))]);
    event.currentTarget.value = '';
  }

  function addTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = entryMode === 'expense'
      ? itemTotal
      : Math.abs(Number(form.get('amount') || 0));

    if (amount <= 0) return;

    const plannedType = String(form.get('plannedType') || 'expense') as 'expense' | 'income';
    const type = (entryMode === 'planned' ? plannedType : entryMode) as TransactionRecord['type'];
    const transferTo = entryMode === 'transfer' ? transferToAccount : String(form.get('transferTo') || '');
    const fee = Math.abs(Number(form.get('fee') || 0));

    const title = String(form.get('title') || (
      lineItems.filter((item) => item.name.trim()).map((item) => item.name.trim()).join(', ') ||
      (type === 'income' ? 'Income' : type === 'transfer' ? 'Transfer' : 'Expense')
    ));

    const category = entryMode === 'income'
      ? String(form.get('incomeCategory') || 'Other')
      : entryMode === 'planned'
        ? String(form.get('plannedCategory') || 'Other')
        : entryMode === 'transfer'
          ? 'Transfer'
          : lineItems.length > 1
            ? 'Multiple items'
            : lineItems[0]?.category || 'Other';

    const record: TransactionRecord = {
      id: 'tx-' + Date.now(),
      date: new Date(String(form.get('date') || '2026-09-20') + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      title,
      account: entryMode === 'transfer' ? formAccount + ' → ' + transferTo : formAccount,
      category,
      currency: formCurrency,
      amount: type === 'expense' ? -amount : amount,
      type,
      payee: String(form.get('payee') || ''),
      description: String(form.get('description') || ''),
      className: String(form.get('className') || 'Personal'),
      checkNumber: String(form.get('checkNumber') || ''),
      status: entryMode === 'planned' ? 'planned' : String(form.get('status') || 'cleared') as TransactionRecord['status'],
      recurring: form.get('recurring') === 'on',
      items: lineItems.filter((item) => item.itemId || item.amount > 0),
      attachments,
      method: String(form.get('method') || ''),
      fee,
      transferTo,
      exchangeRate: Number(form.get('exchangeRate') || 1),
      receivedAmount: entryMode === 'transfer' ? transferReceived : Math.abs(Number(form.get('receivedAmount') || amount)),
      person: String(form.get('person') || ''),
      reference: String(form.get('reference') || ''),
      tag: String(form.get('tag') || ''),
      repeat: String(form.get('repeat') || ''),
      nextDate: String(form.get('nextDate') || ''),
      installment: form.get('installment') === 'on',
      installmentCount: Number(form.get('installmentCount') || 1),
      currentInstallment: Number(form.get('currentInstallment') || 1),
      time: String(form.get('time') || ''),
    };

    setRows((current) => [record, ...current]);
    setShowAdd(false);
  }

  const optionalFieldEntries = Object.entries(transactionSettings.visibleOptionalFields) as Array<[TransactionFieldKey, boolean]>;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Money</p>
          <h2 className="mt-1 font-display text-3xl font-extrabold">Transactions</h2>
          <p className="mt-1 text-sm text-muted-foreground">All income, expenses, transfers and planned transactions in a simple register.</p>
        </div>
        <button onClick={openAdd} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm">
          <Plus className="size-4" /> Add transaction
        </button>
      </div>

      <Card className="p-4">
        <div className="grid gap-2 md:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search transactions..." className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary" />
          </div>
          <select value={period} onChange={(event) => setPeriod(event.target.value as typeof period)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-semibold">
            <option value="this-month">This month</option><option value="last-month">Last month</option><option value="30-days">Last 30 days</option><option value="custom">Custom period</option>
          </select>
          <select value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-semibold"><option value="all">All accounts</option>{accountOptions.map((account) => <option key={account}>{account}</option>)}</select>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-semibold"><option value="all">All categories</option>{categoryFilterOptions.map((category) => <option key={category}>{category}</option>)}</select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-semibold"><option value="all">All statuses</option><option value="cleared">Paid</option><option value="not-cleared">Not cleared</option><option value="planned">Planned</option></select>
        </div>
        {period === 'custom' && <div className="mt-3 grid gap-2 sm:grid-cols-2"><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm" /><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm" /></div>}
        <div className="mt-3 flex flex-wrap gap-2">{[
          ['all', 'All'],['income', 'Income'],['expense', 'Expenses'],['transfer', 'Transfers'],
        ].map(([value, label]) => <button key={value} onClick={() => setTypeFilter(value as typeof typeFilter)} className={'rounded-lg px-3 py-2 text-xs font-bold ' + (typeFilter === value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')}>{label}</button>)}<button type="button" onClick={() => { setSearch(''); setPeriod('this-month'); setAccountFilter('all'); setCategoryFilter('all'); setStatusFilter('all'); setTypeFilter('all'); setFromDate(''); setToDate(''); }} className="rounded-lg border border-border px-3 py-2 text-xs font-bold">Reset</button></div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Total income</p><p className="mt-2 text-2xl font-extrabold text-emerald-600">{money(totals.income)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Total expenses</p><p className="mt-2 text-2xl font-extrabold text-red-600">{money(totals.expenses)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Net cash flow</p><p className="mt-2 text-2xl font-extrabold">{money(totals.income - totals.expenses)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Transactions</p><p className="mt-2 text-2xl font-extrabold">{filtered.length}</p></Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[930px] border-collapse text-sm">
            <thead><tr className="border-b border-border bg-muted/40 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground"><th className="px-4 py-3">Date</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Account</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-center">Att.</th></tr></thead>
            <tbody>{filtered.map((row) => (
              <tr key={row.id} onClick={() => setSelected(row)} className="cursor-pointer border-b border-border last:border-0 hover:bg-primary/[0.03]">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{row.date} 2026</td>
                <td className="px-4 py-3"><span className={'inline-flex rounded-md px-2 py-1 text-[10px] font-bold ' + (row.type === 'expense' ? 'bg-red-100 text-red-700' : row.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700')}>{row.type === 'expense' ? 'Expense' : row.type === 'income' ? 'Income' : 'Transfer'}</span></td>
                <td className="max-w-[250px] px-4 py-3 font-semibold">{row.title}</td>
                <td className="px-4 py-3"><span className="inline-flex rounded-md bg-muted px-2 py-1 text-[10px] font-semibold">{row.category}</span></td>
                <td className="px-4 py-3 text-xs font-semibold">{row.account}</td>
                <td className={'px-4 py-3 text-right font-extrabold ' + (row.amount >= 0 ? 'text-emerald-600' : 'text-red-600')}>{row.amount >= 0 ? '+' : ''}{money(row.amount, row.currency ?? 'EGP')}</td>
                <td className="px-4 py-3"><span className={'inline-flex rounded-md px-2 py-1 text-[10px] font-bold ' + (row.status === 'cleared' ? 'bg-emerald-100 text-emerald-700' : row.status === 'planned' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700')}>{row.status === 'cleared' ? 'Paid' : row.status === 'planned' ? 'Planned' : 'Not cleared'}</span></td>
                <td className="px-4 py-3 text-center text-muted-foreground">{row.attachments?.length ? '📎' : '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground"><span>Showing {filtered.length} transactions</span><div className="flex items-center gap-2"><button type="button" className="grid size-8 place-items-center rounded-lg border border-border">‹</button><button type="button" className="grid size-8 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">1</button><button type="button" className="grid size-8 place-items-center rounded-lg border border-border">2</button><button type="button" className="grid size-8 place-items-center rounded-lg border border-border">›</button></div></div>
      </Card>

      {selected && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/25 p-3 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl">
            <div className="flex items-start justify-between border-b border-border px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Transaction details</p><h3 className="mt-1 text-xl font-extrabold">{selected.title}</h3><p className="mt-1 text-xs text-muted-foreground">{selected.date} · {selected.account} · {selected.currency ?? 'EGP'}</p></div><button type="button" onClick={() => setSelected(null)} className="grid size-9 place-items-center rounded-xl hover:bg-muted"><X className="size-5" /></button></div>
            <div className="space-y-3 p-5">
              <Card className="p-4"><p className="text-xs text-muted-foreground">Amount</p><p className={'mt-2 text-3xl font-extrabold ' + (selected.amount >= 0 ? 'text-emerald-600' : 'text-red-600')}>{selected.amount >= 0 ? '+' : ''}{money(selected.amount, selected.currency ?? 'EGP')}</p></Card>
              {selected.items?.length ? <Card className="p-4"><p className="text-xs font-bold">Items</p><div className="mt-2 divide-y divide-border">{selected.items.map((item) => <div key={item.id} className="flex items-center justify-between py-2"><div><p className="text-sm font-semibold">{item.name || item.category}</p></div><span className="font-bold">{money(item.amount, selected.currency ?? 'EGP')}</span></div>)}</div></Card> : null}
              {selected.attachments?.length ? <Card className="p-4"><p className="text-xs font-bold">Attachments</p><div className="mt-2 space-y-1">{selected.attachments.map((file) => <p key={file.name} className="text-xs font-semibold">{file.name}</p>)}</div></Card> : null}
              <div className="grid gap-3 sm:grid-cols-2"><Card className="p-4"><p className="text-[11px] text-muted-foreground">Type</p><p className="mt-1 text-sm font-bold capitalize">{selected.type}</p></Card><Card className="p-4"><p className="text-[11px] text-muted-foreground">Status</p><p className="mt-1 text-sm font-bold">{selected.status}</p></Card><Card className="p-4"><p className="text-[11px] text-muted-foreground">Category</p><p className="mt-1 text-sm font-bold">{selected.category}</p></Card><Card className="p-4"><p className="text-[11px] text-muted-foreground">Fee</p><p className="mt-1 text-sm font-bold">{money(selected.fee || 0)}</p></Card></div>
              <Card className="p-4"><p className="text-[11px] text-muted-foreground">Payee / Description</p><p className="mt-2 text-sm font-bold">{selected.payee || '—'}</p><p className="mt-1 text-xs text-muted-foreground">{selected.description || '—'}</p></Card>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/30 p-3 backdrop-blur-sm sm:p-6">
          <div className="relative flex max-h-[94vh] w-full max-w-[620px] flex-col overflow-hidden rounded-[2rem] border border-border bg-background shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-5 py-4">
              <button type="button" onClick={closeAdd} className="text-sm font-medium text-muted-foreground hover:text-foreground">Cancel</button>
              <div className="text-center"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">Checkbook</p><h3 className="text-lg font-extrabold">{entryMode === 'expense' ? 'Expense' : entryMode === 'income' ? 'Income' : entryMode === 'transfer' ? 'Money Transfer' : 'Planned'}</h3></div>
              <div className="flex items-center gap-2"><button type="button" onClick={() => setShowFieldSettings(true)} className="grid size-9 place-items-center rounded-xl border border-border hover:bg-muted" aria-label="Transaction settings"><Settings className="size-4" /></button><button type="submit" form="transaction-form" className="text-sm font-bold text-primary">Save</button></div>
            </div>

            <form id="transaction-form" onSubmit={addTransaction} className="min-h-0 flex-1 overflow-y-auto">
              <div className="border-b border-border bg-card px-4 py-3">
                <div className="grid grid-cols-4 overflow-hidden rounded-xl border border-border">
                  {[
                    ['expense', 'Expense'],
                    ['income', 'Income'],
                    ['transfer', 'Transfer'],
                    ['planned', 'Planned'],
                  ].map(([value, label]) => <button key={value} type="button" onClick={() => setEntryMode(value as EntryMode)} className={'px-2 py-3 text-xs font-bold ' + (entryMode === value ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground')}>{label}</button>)}
                </div>
              </div>

              <div className="space-y-3 p-4">
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="flex min-h-14 items-center justify-between border-b border-border px-4"><span className="text-sm font-semibold">Account *</span><select name="account" value={formAccount} onChange={(event) => setFormAccount(event.target.value)} className="max-w-[60%] bg-transparent text-right text-sm font-bold outline-none">{accountRows.map((account) => <option key={account.name} value={account.name}>{account.name}</option>)}</select></div>
                  <div className="flex min-h-14 items-center justify-between border-b border-border px-4"><span className="text-sm font-semibold">Currency *</span><span className="text-sm font-extrabold">{formCurrency}</span><input type="hidden" name="currency" value={formCurrency} /></div>
                  <label className="flex min-h-14 items-center justify-between px-4"><span className="text-sm font-semibold">Date *</span><input name="date" required type="date" defaultValue="2026-09-20" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
                </div>

                {entryMode === 'expense' && (
                  <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3"><div><p className="text-sm font-bold">Items *</p><p className="text-[10px] text-muted-foreground">Add one or several purchases to one expense.</p></div><button type="button" onClick={addLineItem} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-[10px] font-bold"><Plus className="size-3.5" /> Add</button></div>
                    <div className="divide-y divide-border">
                      {lineItems.map((item, index) => (
                        <div key={item.id} className="space-y-2 p-3">
                          <div className="grid grid-cols-[minmax(0,1fr)_100px_auto] gap-2">
                            <select
                                required
                                value={item.itemId}
                                onChange={(event) => selectExpenseItem(item.id, event.target.value)}
                                className="h-10 min-w-0 rounded-lg border border-border bg-background px-3 text-sm"
                              >
                                <option value="">Choose item {index + 1}</option>
                                {expenseCategories
                                  .filter((category) => category.parentId === null)
                                  .map((mainCategory) => {
                                    const branchItems = transactionSettings.expenseItems.filter((item) => {
                                      const assigned = expenseCategories.find((category) => category.id === item.categoryId);
                                      return assigned?.id === mainCategory.id || assigned?.parentId === mainCategory.id;
                                    });
                                    if (!branchItems.length) return null;
                                    return (
                                      <optgroup key={mainCategory.id} label={mainCategory.name}>
                                        {branchItems.map((configuredItem) => {
                                          const assigned = expenseCategories.find((category) => category.id === configuredItem.categoryId);
                                          const branch = assigned?.parentId ? assigned.name : '';
                                          return <option key={configuredItem.id} value={configuredItem.id}>{branch ? branch + ' · ' : ''}{configuredItem.name}</option>;
                                        })}
                                      </optgroup>
                                    );
                                  })}
                              </select>
                            <input value={item.amount || ''} onChange={(event) => updateLineItem(item.id, { amount: Number(event.target.value) || 0 })} type="number" min="0" step="0.01" placeholder="0.00" className="h-10 rounded-lg border border-border bg-background px-2 text-right text-sm font-bold" />
                            {lineItems.length > 1 ? <button type="button" onClick={() => removeLineItem(item.id)} className="grid size-10 place-items-center rounded-lg border border-border text-muted-foreground hover:text-destructive">×</button> : <span />}
                          </div>

                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-3"><span className="text-xs font-semibold text-muted-foreground">Total Amount</span><span className="text-lg font-extrabold">{money(itemTotal, formCurrency)}</span></div>
                  </div>
                )}

                {entryMode === 'income' && (
                  <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="flex min-h-14 items-center justify-between border-b border-border px-4"><span className="text-sm font-semibold">Category *</span><select name="incomeCategory" required className="max-w-[62%] bg-transparent text-right text-sm font-bold outline-none">{incomeCategoryOptions.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select></div>
                    <div className="flex min-h-16 items-center justify-between px-4"><span className="text-sm font-semibold">Amount *</span><input name="amount" required type="number" min="0" step="0.01" placeholder="0.00" className="max-w-[60%] bg-transparent text-right text-3xl font-extrabold outline-none" /></div>
                  </div>
                )}

                {entryMode === 'transfer' && (
                  <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="flex min-h-14 items-center justify-between border-b border-border px-4">
                      <span className="text-sm font-semibold">From *</span>
                      <select name="account" value={formAccount} onChange={(event) => setFormAccount(event.target.value)} className="max-w-[62%] bg-transparent text-right text-sm font-bold outline-none">
                        {accountRows.map((account) => <option key={account.name} value={account.name}>{account.name}</option>)}
                      </select>
                    </div>
                    <div className="flex min-h-14 items-center justify-between border-b border-border px-4">
                      <span className="text-sm font-semibold">To *</span>
                      <select name="transferTo" value={transferToAccount} onChange={(event) => setTransferToAccount(event.target.value)} className="max-w-[62%] bg-transparent text-right text-sm font-bold outline-none">
                        {accountRows.map((account) => <option key={account.name} value={account.name}>{account.name}</option>)}
                      </select>
                    </div>
                    <div className="flex min-h-14 items-center justify-between border-b border-border px-4">
                      <span className="text-sm font-semibold">Amount *</span>
                      <div className="flex items-center gap-2">
                        <input name="amount" value={transferAmount} onChange={(event) => setTransferAmount(event.target.value)} required type="number" min="0" step="0.01" placeholder="0.00" className="w-36 bg-transparent text-right text-2xl font-extrabold outline-none" />
                        <span className="text-xs font-bold text-muted-foreground">{sourceCurrency}</span>
                      </div>
                    </div>
                    <div className="flex min-h-14 items-center justify-between border-b border-border px-4">
                      <span className="text-sm font-semibold">Fee</span>
                      <input name="fee" type="number" min="0" step="0.01" defaultValue="0" className="max-w-[45%] bg-transparent text-right text-sm font-bold outline-none" />
                    </div>
                    <div className="flex min-h-14 items-center justify-between border-b border-border px-4">
                      <span className="text-sm font-semibold">Exchange rate</span>
                      <input name="exchangeRate" value={sourceCurrency === destinationCurrency ? '1' : transferRate} onChange={(event) => setTransferRate(event.target.value)} disabled={sourceCurrency === destinationCurrency} type="number" min="0.000001" step="0.000001" className="max-w-[45%] bg-transparent text-right text-sm font-bold outline-none" />
                    </div>
                    <div className="flex min-h-16 items-center justify-between px-4">
                      <span className="text-sm font-semibold">Received</span>
                      <div className="text-right">
                        <p className="text-2xl font-extrabold">{money(transferReceived, destinationCurrency)}</p>
                        <p className="text-[10px] text-muted-foreground">Automatically calculated from amount × exchange rate</p>
                      </div>
                      <input type="hidden" name="receivedAmount" value={transferReceived} />
                    </div>
                  </div>
                )}

                {entryMode === 'planned' && (
                  <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="flex min-h-14 items-center justify-between border-b border-border px-4"><span className="text-sm font-semibold">Type *</span><select name="plannedType" className="max-w-[60%] bg-transparent text-right text-sm font-bold outline-none"><option value="expense" className="text-black">Planned expense</option><option value="income" className="text-black">Planned income</option></select></div>
                    <div className="flex min-h-14 items-center justify-between border-b border-border px-4"><span className="text-sm font-semibold">Category *</span><select name="plannedCategory" className="max-w-[60%] bg-transparent text-right text-sm font-bold outline-none">{expenseCategoryOptions.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select></div>
                    <div className="flex min-h-16 items-center justify-between px-4"><span className="text-sm font-semibold">Amount *</span><input name="amount" required type="number" min="0" step="0.01" placeholder="0.00" className="max-w-[60%] bg-transparent text-right text-2xl font-extrabold outline-none" /></div>
                  </div>
                )}

                {transactionSettings.visibleOptionalFields.attachment && (
                  <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    <label className="flex cursor-pointer items-center gap-3 px-4 py-4">
                      <div className="grid size-10 place-items-center rounded-xl bg-muted"><FileText className="size-4" /></div>
                      <div className="min-w-0 flex-1"><p className="text-sm font-bold">Attachment</p><p className="text-[10px] text-muted-foreground">Photo, receipt, PDF or file</p></div>
                      <span className="rounded-lg border border-border px-2.5 py-2 text-[10px] font-bold">Add</span>
                      <input type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={handleAttachments} className="hidden" />
                    </label>
                    {!!attachments.length && <div className="border-t border-border px-4 py-2">{attachments.map((file) => <div key={file.name} className="flex items-center justify-between gap-2 py-1 text-[10px]"><span className="truncate font-semibold">{file.name}</span><button type="button" onClick={() => setAttachments((items) => items.filter((item) => item.name !== file.name))} className="text-muted-foreground">Remove</button></div>)}</div>}
                  </div>
                )}

                {optionalFieldEntries.some(([, enabled]) => enabled) && (
                  <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    <button type="button" onClick={() => setShowMoreDetails((value) => !value)} className="flex w-full items-center justify-between px-4 py-4 text-left">
                      <div><p className="text-sm font-bold">More details</p><p className="mt-1 text-[10px] text-muted-foreground">Optional fields</p></div>
                      <ChevronRight className={'size-4 transition-transform ' + (showMoreDetails ? 'rotate-90' : '')} />
                    </button>
                    {showMoreDetails && (
                      <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2">
                        {transactionSettings.visibleOptionalFields.time && <label className="block"><span className="mb-1.5 block text-[10px] font-bold">Time</span><input name="time" type="time" defaultValue="18:30" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>}
                        {transactionSettings.visibleOptionalFields.description && <label className="block sm:col-span-2"><span className="mb-1.5 block text-[10px] font-bold">Description</span><input name="title" placeholder="Short description" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>}
                        {transactionSettings.visibleOptionalFields.payee && <label className="block"><span className="mb-1.5 block text-[10px] font-bold">Payee / Merchant</span><input name="payee" list="financy-payees" placeholder="Who did you pay?" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /><datalist id="financy-payees">{transactionSettings.payees.map((item) => <option key={item} value={item} />)}</datalist></label>}
                        {transactionSettings.visibleOptionalFields.paymentMethod && <label className="block"><span className="mb-1.5 block text-[10px] font-bold">Payment Method</span><select name="method" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"><option value="">Choose method</option>{transactionSettings.paymentMethods.map((item) => <option key={item}>{item}</option>)}</select></label>}
                        {transactionSettings.visibleOptionalFields.status && <label className="block"><span className="mb-1.5 block text-[10px] font-bold">Status</span><select name="status" disabled={entryMode === 'planned'} defaultValue="cleared" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"><option value="cleared">Paid</option><option value="not-cleared">Not cleared</option></select></label>}
                        {transactionSettings.visibleOptionalFields.person && <label className="block"><span className="mb-1.5 block text-[10px] font-bold">Person</span><select name="person" defaultValue={transactionSettings.people[0] ?? ''} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">{transactionSettings.people.map((item) => <option key={item}>{item}</option>)}</select></label>}
                        {transactionSettings.visibleOptionalFields.className && <label className="block"><span className="mb-1.5 block text-[10px] font-bold">Class</span><select name="className" defaultValue={transactionSettings.classes[0] ?? 'Personal'} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">{transactionSettings.classes.map((item) => <option key={item}>{item}</option>)}</select></label>}
                        {transactionSettings.visibleOptionalFields.reference && <label className="block"><span className="mb-1.5 block text-[10px] font-bold">Reference</span><input name="reference" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" placeholder="Reference number" /></label>}
                        {transactionSettings.visibleOptionalFields.tags && <label className="block"><span className="mb-1.5 block text-[10px] font-bold">Tags</span><select name="tag" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"><option value="">Choose tag</option>{transactionSettings.tags.map((item) => <option key={item}>{item}</option>)}</select></label>}
                        {transactionSettings.visibleOptionalFields.notes && <label className="block sm:col-span-2"><span className="mb-1.5 block text-[10px] font-bold">Notes</span><textarea name="description" rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Add a note..." /></label>}
                        {transactionSettings.visibleOptionalFields.recurring && <label className="flex items-center gap-2 text-xs font-semibold"><input name="recurring" type="checkbox" /> Recurring</label>}
                        {transactionSettings.visibleOptionalFields.repeat && <label className="block"><span className="mb-1.5 block text-[10px] font-bold">Repeat</span><select name="repeat" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"><option>Daily</option><option>Weekly</option><option>Monthly</option><option>Yearly</option><option>Custom</option></select></label>}
                        {transactionSettings.visibleOptionalFields.nextDate && <label className="block"><span className="mb-1.5 block text-[10px] font-bold">Next Date</span><input name="nextDate" type="date" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>}
                        {transactionSettings.visibleOptionalFields.installment && <label className="flex items-center gap-2 text-xs font-semibold"><input name="installment" type="checkbox" /> Installment</label>}
                        {transactionSettings.visibleOptionalFields.installmentCount && <label className="block"><span className="mb-1.5 block text-[10px] font-bold">Installment Count</span><input name="installmentCount" type="number" min="1" defaultValue="1" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>}
                        {transactionSettings.visibleOptionalFields.currentInstallment && <label className="block"><span className="mb-1.5 block text-[10px] font-bold">Current Installment</span><input name="currentInstallment" type="number" min="1" defaultValue="1" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>}
                      </div>
                    )}
                  </div>
                )}

                <button type="submit" className="h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground">Save Transaction</button>
              </div>
            </form>

            {showFieldSettings && (
              <div className="absolute inset-0 z-[120] flex items-center justify-center bg-foreground/20 p-3 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
                  <div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Settings</p><h4 className="mt-1 text-lg font-extrabold">Transaction fields</h4><p className="mt-1 text-xs text-muted-foreground">Required fields cannot be hidden.</p></div><button type="button" onClick={() => setShowFieldSettings(false)} className="grid size-8 place-items-center rounded-lg hover:bg-muted"><X className="size-4" /></button></div>
                  <div className="mt-4 flex gap-2"><button type="button" onClick={() => { const next={...transactionSettings,visibleOptionalFields:Object.fromEntries(Object.keys(transactionSettings.visibleOptionalFields).map((key)=>[key,true])) as TransactionSettings['visibleOptionalFields']}; setTransactionSettings(next); saveTransactionSettings(next); }} className="rounded-lg border border-border px-3 py-2 text-[10px] font-bold">Show all</button><button type="button" onClick={() => { const next={...transactionSettings,visibleOptionalFields:Object.fromEntries(Object.keys(transactionSettings.visibleOptionalFields).map((key)=>[key,false])) as TransactionSettings['visibleOptionalFields']}; setTransactionSettings(next); saveTransactionSettings(next); }} className="rounded-lg border border-border px-3 py-2 text-[10px] font-bold">Hide all optional</button></div>
                  <div className="mt-4 max-h-[55vh] overflow-y-auto divide-y divide-border rounded-xl border border-border">
                    {['Account','Amount','Currency','Date','Category'].map((label) => <div key={label} className="flex items-center justify-between px-3 py-2.5"><span className="text-xs font-bold">{label}</span><span className="text-[10px] font-bold text-primary">Required</span></div>)}
                    {optionalFieldEntries.map(([key, enabled]) => (
                      <label key={key} className="flex items-center justify-between gap-3 px-3 py-2.5"><span className="text-xs font-semibold">{TRANSACTION_FIELD_LABELS[key]}</span><input type="checkbox" checked={enabled} onChange={(event) => { const next={...transactionSettings,visibleOptionalFields:{...transactionSettings.visibleOptionalFields,[key]:event.target.checked}}; setTransactionSettings(next); saveTransactionSettings(next); }} /></label>
                    ))}
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
  const initialScreen = (() => {
    if (typeof window === 'undefined') return 'overview' as Screen;
    const value = new URLSearchParams(window.location.search).get('screen');
    return ['overview', 'accounts', 'transactions', 'investments', 'calendar', 'budgets', 'reports'].includes(value ?? '')
      ? value as Screen
      : 'overview';
  })();
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const [calendarEvents, setCalendarEvents] = useState<Array<{
    id: string;
    day: number;
    title: string;
    type: 'income' | 'expense' | 'transfer';
    category: string;
    account: string;
    amount: number;
    currency: string;
    status: string;
    kind: 'transaction' | 'planned' | 'recurring' | 'bills' | 'installments';
    repeat?: string;
  }>>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadCalendarData() {
      setCalendarLoading(true);
      try {
        const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!publishableKey || publishableKey === 'missing-publishable-key') {
          if (!cancelled) {
            setCalendarConnected(false);
            setCalendarEvents([]);
            setCalendarLoading(false);
          }
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          if (!cancelled) {
            setCalendarConnected(false);
            setCalendarLoading(false);
            setCalendarEvents([]);
          }
          return;
        }

        const start = new Date(2026, 8 + monthOffset, 1);
      const end = new Date(2026, 9 + monthOffset, 0);
      const from = start.toISOString().slice(0, 10);
      const to = end.toISOString().slice(0, 10);

      const [transactionsResult, scheduledResult, recurringResult, installmentsResult, accountsResult] = await Promise.all([
        supabase
          .from('transactions')
          .select('id,type,amount,currency_code,transaction_date,status,description,account_id,categories(name),accounts(name)')
          .gte('transaction_date', from)
          .lte('transaction_date', to)
          .order('transaction_date', { ascending: true }),
        supabase
          .from('scheduled_transactions')
          .select('id,type,amount,currency_code,next_run_date,status,description,account_id,categories(name),accounts(name),recurring_rule_id')
          .gte('next_run_date', from)
          .lte('next_run_date', to)
          .eq('status', 'active')
          .order('next_run_date', { ascending: true }),
        supabase
          .from('recurring_rules')
          .select('id,name,frequency,next_run_date,status')
          .lte('next_run_date', to)
          .in('status', ['active', 'paused'])
          .order('next_run_date', { ascending: true }),
        supabase
          .from('installments')
          .select('id,name,amount,currency_code,due_date,status,installment_number')
          .gte('due_date', from)
          .lte('due_date', to)
          .in('status', ['pending', 'partially_paid', 'overdue'])
          .order('due_date', { ascending: true }),
        supabase
          .from('accounts')
          .select('id,name,account_type,currency_code,payment_due_date,status')
          .eq('account_type', 'credit_card')
          .eq('status', 'active'),
      ]);

      if (cancelled) return;

      const hasErrors = [transactionsResult.error, scheduledResult.error, recurringResult.error, installmentsResult.error, accountsResult.error].some(Boolean);
      if (hasErrors) {
        setCalendarConnected(false);
        setCalendarEvents([]);
        setCalendarLoading(false);
        return;
      }

      const events: typeof calendarEvents = [];
      for (const row of transactionsResult.data ?? []) {
        const account = Array.isArray(row.accounts) ? row.accounts[0] : row.accounts;
        const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;
        const day = Number(String(row.transaction_date).slice(8, 10));
        if (!day) continue;
        events.push({
          id: 'tx-' + row.id,
          day,
          title: row.description || (row.type === 'income' ? 'Income' : row.type === 'expense' ? 'Expense' : 'Transfer'),
          type: row.type === 'income' ? 'income' : row.type === 'expense' ? 'expense' : 'transfer',
          category: category?.name ?? (row.type === 'transfer' ? 'Transfer' : 'Uncategorized'),
          account: account?.name ?? 'Account',
          amount: row.type === 'expense' ? -Number(row.amount) : Number(row.amount),
          currency: row.currency_code,
          status: row.status,
          kind: 'transaction',
        });
      }

      for (const row of scheduledResult.data ?? []) {
        const account = Array.isArray(row.accounts) ? row.accounts[0] : row.accounts;
        const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;
        const day = Number(String(row.next_run_date).slice(8, 10));
        if (!day) continue;
        const type = row.type === 'income' ? 'income' : 'expense';
        events.push({
          id: 'scheduled-' + row.id,
          day,
          title: row.description || 'Planned Transaction',
          type,
          category: category?.name ?? 'Scheduled',
          account: account?.name ?? 'Account',
          amount: type === 'expense' ? -Number(row.amount) : Number(row.amount),
          currency: row.currency_code,
          status: 'Planned',
          kind: row.recurring_rule_id ? 'recurring' : 'planned',
          repeat: row.recurring_rule_id ? 'Recurring' : undefined,
        });
      }

      for (const row of installmentsResult.data ?? []) {
        const day = Number(String(row.due_date).slice(8, 10));
        if (!day) continue;
        events.push({
          id: 'installment-' + row.id,
          day,
          title: row.name,
          type: 'expense',
          category: 'Installments',
          account: 'Due payment',
          amount: -Number(row.amount),
          currency: row.currency_code,
          status: row.status === 'overdue' ? 'Overdue' : 'Planned',
          kind: 'installments',
          repeat: row.installment_number ? 'Installment ' + row.installment_number : undefined,
        });
      }

      const daysInMonth = end.getDate();
      for (const row of accountsResult.data ?? []) {
        const dueDay = Number(row.payment_due_date);
        if (!dueDay || dueDay < 1 || dueDay > daysInMonth) continue;
        events.push({
          id: 'cc-due-' + row.id + '-' + from.slice(0, 7),
          day: dueDay,
          title: row.name + ' Payment Due',
          type: 'expense',
          category: 'Credit Card Due',
          account: row.name,
          amount: 0,
          currency: row.currency_code,
          status: 'Due',
          kind: 'bills',
        });
      }

        setCalendarConnected(true);
        setCalendarEvents(events);
        setCalendarLoading(false);
      } catch {
        if (!cancelled) {
          setCalendarConnected(false);
          setCalendarEvents([]);
          setCalendarLoading(false);
        }
      }
    }
    void loadCalendarData();
    return () => { cancelled = true; };
  }, [monthOffset]);

  const [selectedCalendarDate, setSelectedCalendarDate] = useState<number | null>(20);
  const [calendarView, setCalendarView] = useState<'all' | 'planned' | 'recurring' | 'bills' | 'installments'>('all');

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

            {screen === 'investments' && (
              <InvestmentsPreview />
            )}

            {screen === 'calendar' && (
              <section className="space-y-5">
                {(() => {
                  const base = new Date();
                  base.setDate(1);
                  base.setMonth(base.getMonth() + monthOffset);
                  const year = base.getFullYear();
                  const month = base.getMonth();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
                  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => {
                    const day = index - firstDay + 1;
                    return day > 0 && day <= daysInMonth ? day : null;
                  });

                  const fallbackEvents = transactionRows.map((row, index) => {
                    const match = row.date.match(/(\d{1,2})\s+/);
                    return {
                      id: 'demo-' + index,
                      day: match ? Number(match[1]) : 1,
                      title: row.title,
                      type: row.type === 'income' ? 'income' as const : row.type === 'expense' ? 'expense' as const : 'transfer' as const,
                      category: row.category,
                      account: row.account,
                      amount: row.amount,
                      currency: accountRows.find((account) => account.name === row.account)?.currency ?? 'EGP',
                      status: 'completed',
                      kind: 'transaction' as const,
                    };
                  });
                  const allEvents = calendarConnected ? calendarEvents : fallbackEvents;
                  const dateTransactions = allEvents.filter((row) => row.kind === 'transaction');
                  const scheduledRows = allEvents.filter((row) => row.kind !== 'transaction');


                  const visibleScheduledRows = calendarView === 'all'
                    ? scheduledRows
                    : scheduledRows.filter((row) => row.kind === calendarView);

                  const transactionsForDay = (day: number) => [
                    ...dateTransactions.filter((row) => {
                      const match = row.date.match(/(\d{1,2})\s+/);
                      return match && Number(match[1]) === day;
                    }).map((row) => ({ ...row, kind: 'transaction' as const })),
                    ...visibleScheduledRows.filter((row) => row.day === day),
                  ];

                  const selectedTransactions = selectedCalendarDate ? transactionsForDay(selectedCalendarDate) : [];

                  const monthIncome = dateTransactions.filter((row) => row.type === 'income').reduce((sum, row) => sum + row.amount, 0);
                  const monthExpenses = dateTransactions.filter((row) => row.type === 'expense').reduce((sum, row) => sum + Math.abs(row.amount), 0);
                  const plannedIncome = visibleScheduledRows.filter((row) => row.type === 'income').reduce((sum, row) => sum + row.amount, 0);
                  const plannedExpenses = visibleScheduledRows.filter((row) => row.type === 'expense').reduce((sum, row) => sum + Math.abs(row.amount), 0);

                  return (
                    <>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Money calendar</p>
                          <h2 className="mt-1 font-display text-3xl font-extrabold">Calendar</h2>
                          <p className="mt-1 text-sm text-muted-foreground">Track completed and upcoming money events in one place.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setMonthOffset((value) => value - 1)} className="grid size-10 place-items-center rounded-xl border border-border hover:bg-muted"><ChevronLeft className="size-4" /></button>
                          <button type="button" onClick={() => { setMonthOffset(0); setSelectedCalendarDate(new Date().getDate()); }} className="h-10 rounded-xl border border-border px-3 text-xs font-bold">Today</button>
                          <div className="min-w-36 text-center text-sm font-extrabold">{monthLabel}</div>
                          <button type="button" onClick={() => setMonthOffset((value) => value + 1)} className="grid size-10 place-items-center rounded-xl border border-border hover:bg-muted"><ChevronRight className="size-4" /></button>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-4">
                        {[
                          ['all', 'All'],
                          ['planned', 'Planned'],
                          ['recurring', 'Recurring'],
                          ['bills', 'Bills'],
                        ].map(([value, label]) => (
                          <button key={value} type="button" onClick={() => setCalendarView(value as typeof calendarView)} className={'rounded-2xl border p-4 text-left ' + (calendarView === value ? 'border-primary bg-primary/[0.06]' : 'border-border hover:bg-muted/40')}>
                            <p className="text-xs font-bold">{label}</p>
                            <p className="mt-1 text-lg font-extrabold">{value === 'all' ? visibleScheduledRows.length : scheduledRows.filter((row) => row.kind === value).length}</p>
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {calendarLoading && <span className="text-[10px] font-semibold text-muted-foreground">Loading your calendar data...</span>}
                        {!calendarLoading && calendarConnected && <span className="text-[10px] font-semibold text-primary">Connected to your Financy data</span>}
                        {!calendarLoading && !calendarConnected && <span className="text-[10px] font-semibold text-muted-foreground">Demo data · sign in to use your saved data</span>}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setCalendarView('installments')} className={'rounded-xl border px-3 py-2 text-[10px] font-bold ' + (calendarView === 'installments' ? 'border-primary bg-primary/10 text-primary' : 'border-border')}>Installments</button>
                        <span className="rounded-xl border border-border px-3 py-2 text-[10px] font-semibold text-muted-foreground">Upcoming income: {money(plannedIncome)}</span>
                        <span className="rounded-xl border border-border px-3 py-2 text-[10px] font-semibold text-muted-foreground">Upcoming expenses: {money(plannedExpenses)}</span>
                      </div>

                      <Card className="overflow-hidden">
                        <div className="grid grid-cols-7 border-b border-border bg-muted/30">
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                            <div key={day} className="py-3 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{day}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7">
                          {cells.map((day, index) => {
                            const dayRows = day ? transactionsForDay(day) : [];
                            const income = dayRows.filter((row) => row.type === 'income').reduce((sum, row) => sum + row.amount, 0);
                            const expense = dayRows.filter((row) => row.type === 'expense').reduce((sum, row) => sum + Math.abs(row.amount), 0);
                            const scheduledCount = dayRows.filter((row) => row.kind !== 'transaction').length;
                            const isToday = day === new Date().getDate() && monthOffset === 0 && month === new Date().getMonth() && year === new Date().getFullYear();
                            const isSelected = day === selectedCalendarDate;
                            return (
                              <button key={index} type="button" disabled={!day} onClick={() => day && setSelectedCalendarDate(day)} className={'min-h-24 border-b border-r border-border p-2 text-left transition-colors sm:min-h-28 ' + (!day ? 'bg-muted/10' : isSelected ? 'bg-primary/[0.08]' : 'hover:bg-muted/50')}>
                                {day && (
                                  <>
                                    <div className="flex items-center justify-between">
                                      <span className={'grid size-7 place-items-center rounded-full text-xs font-bold ' + (isToday ? 'bg-primary text-primary-foreground' : '')}>{day}</span>
                                      {dayRows.length > 0 && <span className="text-[9px] font-bold text-muted-foreground">{dayRows.length}</span>}
                                    </div>
                                    <div className="mt-2 space-y-1">
                                      {income > 0 && <p className="truncate rounded-md bg-primary/10 px-1.5 py-1 text-[9px] font-bold text-primary">+{money(income)}</p>}
                                      {expense > 0 && <p className="truncate rounded-md bg-destructive/10 px-1.5 py-1 text-[9px] font-bold text-destructive">-{money(expense)}</p>}
                                      {scheduledCount > 0 && <p className="truncate rounded-md bg-amber-500/10 px-1.5 py-1 text-[9px] font-bold text-amber-700">{scheduledCount} upcoming</p>}
                                    </div>
                                  </>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </Card>

                      <Card className="p-5">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Selected day</p>
                            <h3 className="mt-1 font-display text-xl font-extrabold">{selectedCalendarDate ? selectedCalendarDate + ' ' + new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(base) : 'Choose a day'}</h3>
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground">{selectedTransactions.length} event{selectedTransactions.length === 1 ? '' : 's'}</span>
                        </div>

                        {selectedTransactions.length > 0 ? (
                          <div className="mt-4 divide-y divide-border">
                            {selectedTransactions.map((row) => (
                              <div key={row.id} className="flex items-center gap-3 py-3">
                                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted">
                                  {row.type === 'income' && <ArrowDownLeft className="size-4 text-primary" />}
                                  {row.type === 'expense' && <ArrowUpRight className="size-4" />}
                                  {row.type === 'transfer' && <ArrowLeftRight className="size-4 text-primary" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-bold">{row.title}</p>
                                  <p className="mt-1 truncate text-[11px] text-muted-foreground">{row.account} · {row.category} · {row.status}{'repeat' in row ? ' · ' + row.repeat : ''}</p>
                                </div>
                                <span className={'text-sm font-extrabold ' + (row.amount >= 0 ? 'text-primary' : 'text-destructive')}>{row.amount >= 0 ? '+' : ''}{money(row.amount, row.currency ?? 'EGP')}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center">
                            <p className="text-sm font-bold">No events</p>
                            <p className="mt-1 text-xs text-muted-foreground">Nothing is scheduled for this day.</p>
                          </div>
                        )}
                      </Card>
                    </>
                  );
                })()}
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

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/95 px-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden" aria-label="Main navigation">
        {[
          { id: 'accounts' as Screen, label: 'Accounts', icon: WalletCards },
          { id: 'transactions' as Screen, label: 'Transactions', icon: FileText },
          { id: 'investments' as Screen, label: 'Investments', icon: LineChart },
          { id: 'reports' as Screen, label: 'Reports', icon: BarChart3 },
        ].map((item) => {
          const Icon = item.icon;
          const active = screen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setScreen(item.id);
                setMobileOpen(false);
              }}
              className={'flex min-w-0 flex-1 flex-col items-center gap-1 py-1 text-[10px] font-semibold ' + (active ? 'text-primary' : 'text-muted-foreground')}
            >
              <Icon className="size-[19px]" strokeWidth={active ? 2.25 : 1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}