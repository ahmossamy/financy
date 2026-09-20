import { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  FileText,
  LayoutDashboard,
  Menu,
  PieChart,
  Plus,
  Search,
  Settings,
  WalletCards,
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
              <section className="space-y-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Checkbook register</p><h2 className="mt-1 font-display text-3xl font-extrabold">Accounts</h2><p className="mt-1 text-sm text-muted-foreground">Cash, banks, cards and investment accounts.</p></div>
                  <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"><CirclePlus className="size-4" />New account</button>
                </div>
                <Card className="overflow-hidden">
                  <div className="hidden grid-cols-[1.6fr_.9fr_.5fr_1fr] gap-4 border-b border-border bg-muted/40 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground sm:grid"><span>Account</span><span>Type</span><span>Currency</span><span className="text-right">Balance</span></div>
                  {accountRows.map((row) => (
                    <div key={row.name} className="grid grid-cols-2 items-center gap-3 border-b border-border px-5 py-4 last:border-0 sm:grid-cols-[1.6fr_.9fr_.5fr_1fr]">
                      <div><p className="text-sm font-bold">{row.name}</p><p className="text-[11px] text-muted-foreground sm:hidden">{row.type} · {row.currency}</p></div>
                      <span className="hidden text-xs text-muted-foreground sm:block">{row.type}</span>
                      <span className="hidden text-xs font-semibold sm:block">{row.currency}</span>
                      <span className={'text-right text-sm font-extrabold ' + (row.balance < 0 ? 'text-destructive' : '')}>{money(row.balance, row.currency)}</span>
                    </div>
                  ))}
                </Card>
              </section>
            )}

            {screen === 'transactions' && (
              <section className="space-y-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Register</p><h2 className="mt-1 font-display text-3xl font-extrabold">Transactions</h2><p className="mt-1 text-sm text-muted-foreground">Income, expenses, transfers and recurring entries.</p></div>
                  <div className="flex gap-2"><button className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-bold"><Search className="size-4" />Search</button><button className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"><Plus className="size-4" />Add transaction</button></div>
                </div>
                <Card className="overflow-hidden">
                  <div className="flex flex-wrap gap-2 border-b border-border bg-muted/30 p-4">{['All', 'Income', 'Expenses', 'Transfers'].map((f, i) => <button key={f} className={'rounded-xl px-3 py-2 text-xs font-bold ' + (i === 0 ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted')}>{f}</button>)}</div>
                  {transactionRows.map((row) => (
                    <div key={row.date + row.title} className="grid grid-cols-[70px_1fr_auto] items-center gap-3 border-b border-border px-5 py-4 last:border-0 sm:grid-cols-[90px_1.5fr_1fr_auto]">
                      <span className="text-xs text-muted-foreground">{row.date}</span>
                      <div><p className="text-sm font-bold">{row.title}</p><p className="text-[11px] text-muted-foreground">{row.category}</p></div>
                      <span className="hidden text-xs text-muted-foreground sm:block">{row.account}</span>
                      <span className={'text-sm font-extrabold ' + (row.amount >= 0 ? 'text-primary' : '')}>{row.amount >= 0 ? '+' : ''}{money(row.amount)}</span>
                    </div>
                  ))}
                </Card>
              </section>
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
