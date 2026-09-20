import { type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { supabase } from '@/lib/services/supabase';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  CirclePlus,
  CreditCard,
  FileBarChart,
  FileText,
  Globe2,
  Home,
  Landmark,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  PieChart,
  Plus,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  loadTransactionSettings,
  saveTransactionSettings,
  resetTransactionSettings,
  TRANSACTION_FIELD_LABELS,
  type CategoryItem,
  type ExpenseItem,
  type TransactionFieldKey,
  type TransactionSettings,
} from '@/lib/transaction-settings';

import {
  Link,
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import NotFound from '@/pages/not-found';
import Login from '@/pages/login';
import Accounts from '@/pages/accounts';
import Transactions from '@/pages/transactions';
import MoneyProPreview from '@/pages/money-pro-preview';

const queryClient = new QueryClient();

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const primaryNav: NavItem[] = [
  { label: 'Overview', href: '/pro', icon: LayoutDashboard },
  { label: 'Accounts', href: '/pro?screen=accounts', icon: WalletCards },
  { label: 'Transactions', href: '/pro?screen=transactions', icon: ArrowLeftRight },
  { label: 'Investments', href: '/pro?screen=investments', icon: LineChart },
  { label: 'Budgets', href: '/pro?screen=budgets', icon: PieChart },
  { label: 'Reports', href: '/pro?screen=reports', icon: FileBarChart },
  { label: 'Calendar', href: '/pro?screen=calendar', icon: CalendarDays },
  { label: 'Settings', href: '/settings', icon: SettingsIcon },
];

const moreNav: NavItem[] = [
  { label: 'Settings', href: '/settings', icon: SettingsIcon },
];

const mobileNav: NavItem[] = [
  { label: 'Accounts', href: '/pro?screen=accounts', icon: WalletCards },
  { label: 'Transactions', href: '/pro?screen=transactions', icon: ArrowLeftRight },
  { label: 'Investments', href: '/pro?screen=investments', icon: LineChart },
  { label: 'Reports', href: '/pro?screen=reports', icon: FileBarChart },
];

const moneySections = [
  'Payment Accounts',
  'Credit Cards',
  'Other Assets',
  'Investments',
];

const investmentSections = [
  'Portfolios',
  'Platforms',
  'Assets',
  'Holdings',
  'Buy',
  'Sell',
  'Dividends',
  'Current Prices',
  'Performance',
];

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/dashboard"
      className={cn(
        'flex items-center gap-3',
        compact && 'justify-center',
      )}
      data-testid="link-brand"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-primary text-primary-foreground shadow-sm">
        <span className="relative block h-4 w-4">
          <span className="absolute bottom-0 left-0 h-2.5 w-1.5 rounded-sm bg-current opacity-75" />
          <span className="absolute bottom-0 left-[5px] h-3.5 w-1.5 rounded-sm bg-current opacity-90" />
          <span className="absolute bottom-0 right-0 h-4 w-1.5 rounded-sm bg-current" />
        </span>
      </span>

      {!compact && (
        <span className="font-display text-[19px] font-extrabold tracking-[-0.04em]">
          Financy
        </span>
      )}
    </Link>
  );
}

function NavLink({
  item,
  collapsed = false,
  onNavigate,
}: {
  item: NavItem;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const [location] = useLocation();

  const active =
    item.href === '/dashboard'
      ? location === '/dashboard' || location === '/'
      : location.startsWith(item.href);

  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`}
      className={cn(
        'group flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors',
        active
          ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))]'
          : 'text-[hsl(var(--sidebar-foreground)/.62)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]',
        collapsed && 'justify-center px-0',
      )}
    >
      <Icon
        className={cn(
          'size-[17px] shrink-0',
          active ? 'text-primary' : 'text-current',
        )}
        strokeWidth={active ? 2.2 : 1.8}
      />

      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

function Sidebar({
  collapsed,
  onCollapse,
  onLogout,
  userEmail,
}: {
  collapsed: boolean;
  onCollapse: () => void;
  onLogout: () => void;
  userEmail?: string;
}) {
  return (
    <aside
      className={cn(
        'hidden h-dvh shrink-0 flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] px-3 py-5 text-[hsl(var(--sidebar-foreground))] transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[76px]' : 'w-[252px]',
      )}
    >
      <div
        className={cn(
          'mb-8 flex items-center px-2',
          collapsed ? 'justify-center' : 'justify-between',
        )}
      >
        <Brand compact={collapsed} />

        {!collapsed && (
          <button
            className="grid size-8 place-items-center rounded-lg text-[hsl(var(--sidebar-foreground)/.55)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]"
            onClick={onCollapse}
            aria-label="Collapse navigation"
            data-testid="button-collapse-sidebar"
          >
            <ChevronRight className="size-4 rotate-180" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {!collapsed && (
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--sidebar-foreground)/.36)]">
            Workspace
          </p>
        )}

        {primaryNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <div className="mt-4 border-t border-[hsl(var(--sidebar-border))] pt-4">
        {!collapsed && (
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--sidebar-foreground)/.36)]">
            More
          </p>
        )}

        {moreNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
          />
        ))}

        <div
          className={cn(
            'mt-4 rounded-xl bg-[hsl(var(--sidebar-accent))] p-2.5',
            collapsed ? 'flex justify-center' : 'flex items-center gap-2',
          )}
        >
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary)/.2)] text-xs font-bold text-primary">
            {userEmail?.charAt(0).toUpperCase() ?? 'U'}
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">
                {userEmail ?? 'Your workspace'}
              </p>

              <button
                onClick={onLogout}
                className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-[hsl(var(--sidebar-foreground)/.5)] hover:text-primary"
                data-testid="button-logout"
              >
                <LogOut className="size-3" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function MobileBottomNav({ onMore }: { onMore: () => void }) {
  const [location] = useLocation();

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background/95 px-2 pt-2 backdrop-blur lg:hidden"
      aria-label="Mobile navigation"
    >
      {mobileNav.map((item) => {
        const Icon = item.icon;
        const active = location.startsWith(item.href);

        return (
          <Link
            href={item.href}
            key={item.label}
            data-testid={`link-mobile-${item.label.toLowerCase()}`}
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center gap-1 py-1 text-[10px] font-semibold',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Icon
              className="size-[19px]"
              strokeWidth={active ? 2.25 : 1.8}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}

      <button
        onClick={onMore}
        className="flex min-w-0 flex-1 flex-col items-center gap-1 py-1 text-[10px] font-semibold text-muted-foreground"
        data-testid="button-mobile-more"
      >
        <MoreHorizontal className="size-[19px]" />
        <span>More</span>
      </button>
    </nav>
  );
}

function Topbar({
  onQuickAdd,
  onMenu,
}: {
  onQuickAdd: () => void;
  onMenu: () => void;
}) {
  const [location] = useLocation();

  const title =
    location === '/' || location === '/dashboard'
      ? 'Overview'
      : primaryNav.find((item) =>
          location.startsWith(item.href),
        )?.label ??
        (location === '/settings' ? 'Settings' : 'Workspace');

  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border bg-background/90 px-5 backdrop-blur-md sm:px-8 lg:px-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted lg:hidden"
          aria-label="Open navigation"
          data-testid="button-open-menu"
        >
          <Menu className="size-5" />
        </button>

        <div className="lg:hidden">
          <Brand />
        </div>

        <div className="hidden lg:block">
          <p className="text-xs font-semibold text-muted-foreground">
            Your workspace
          </p>

          <h1 className="font-display text-[17px] font-bold tracking-[-0.02em]">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onQuickAdd}
          className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-3.5 text-xs font-bold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5"
          data-testid="button-quick-add-top"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Quick add</span>
        </button>

        <Link
          href="/notifications"
          className="relative grid size-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Notifications"
          data-testid="link-notifications-top"
        >
          <Bell className="size-[18px]" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" />
        </Link>

        <Link
          href="/settings"
          className="grid size-9 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground"
          aria-label="Open settings"
          data-testid="link-settings-top"
        >
          YN
        </Link>
      </div>
    </header>
  );
}

function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  action,
  onAction,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-[228px] flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
        <Icon className="size-5" strokeWidth={1.8} />
      </div>

      <h3 className="font-display text-base font-bold tracking-[-0.02em]">
        {title}
      </h3>

      <p className="mt-2 max-w-[300px] text-sm leading-6 text-muted-foreground">
        {description}
      </p>

      {action && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-3.5 text-xs font-bold text-foreground transition-colors hover:border-primary/40 hover:bg-secondary"
          data-testid={`button-empty-${action.toLowerCase().replaceAll(' ', '-')}`}
        >
          <Plus className="size-3.5" />
          {action}
        </button>
      )}
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
  className = '',
}: {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-card card-shadow',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <Icon
              className="size-4 text-primary"
              strokeWidth={2}
            />
          )}

          <h2 className="font-display text-sm font-bold tracking-[-0.01em]">
            {title}
          </h2>
        </div>

        <button
          className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
          aria-label={`More options for ${title}`}
          data-testid={`button-more-${title.toLowerCase().replaceAll(' ', '-')}`}
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>

      {children}
    </section>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  tone = 'green',
  subtitle,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  tone?: 'green' | 'blue' | 'sand' | 'rose';
  subtitle?: string;
}) {
  const toneClass = {
    green: 'bg-[hsl(var(--primary)/.1)] text-primary',
    blue: 'bg-secondary text-secondary-foreground',
    sand: 'bg-[hsl(39_70%_91%)] text-[hsl(31_51%_36%)]',
    rose: 'bg-[hsl(4_70%_94%)] text-[hsl(4_48%_44%)]',
  }[tone];

  return (
    <div className="rounded-2xl border border-border bg-card p-4 card-shadow sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">
          {title}
        </span>
        <span className={cn('grid size-8 place-items-center rounded-xl', toneClass)}>
          <Icon className="size-4" strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-5 font-display text-[22px] font-bold tracking-[-0.05em]">
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function Dashboard() {
  const [, setLocation] = useLocation();

  const [cash, setCash] = useState(0);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<
    Array<{
      id: string;
      type: string;
      amount: number;
      currency_code: string;
      transaction_date: string;
      description: string | null;
    }>
  >([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      setDashboardLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (mounted) setDashboardLoading(false);
        return;
      }

      const [accountsResult, transactionsResult, transfersResult] = await Promise.all([
        supabase
          .from('accounts')
          .select('id, opening_balance, currency_code, status')
          .eq('user_id', user.id)
          .eq('status', 'active'),

        supabase
          .from('transactions')
          .select(
            'id, type, amount, currency_code, transaction_date, description, status',
          )
          .eq('user_id', user.id)
          .in('type', ['income', 'expense'])
          .order('transaction_date', { ascending: false })
          .limit(8),

        supabase
          .from('transfers')
          .select('from_account_id, to_account_id, amount, received_amount, transfer_date, status')
          .eq('user_id', user.id)
          .eq('status', 'completed'),
      ]);

      if (!mounted) return;

      const accountRows = accountsResult.data ?? [];
      const transactionRows = transactionsResult.data ?? [];
      const transferRows = transfersResult.data ?? [];

      let egpCash = 0;

      for (const account of accountRows) {
        if (account.currency_code === 'EGP') {
          egpCash += Number(account.opening_balance ?? 0);
        }
      }

      let monthIncome = 0;
      let monthExpenses = 0;
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      for (const transaction of transactionRows) {
        if (transaction.status !== 'completed') continue;

        const amount = Number(transaction.amount ?? 0);

        if (transaction.currency_code === 'EGP') {
          if (transaction.type === 'income') egpCash += amount;
          if (transaction.type === 'expense') egpCash -= amount;
        }

        const transactionDate = new Date(
          `${transaction.transaction_date}T00:00:00`,
        );

        if (
          transactionDate.getFullYear() === currentYear &&
          transactionDate.getMonth() === currentMonth
        ) {
          if (transaction.type === 'income') monthIncome += amount;
          if (transaction.type === 'expense') monthExpenses += amount;
        }
      }

      const accountCurrencyById = new Map(
        accountRows.map((account) => [account.id, account.currency_code]),
      );

      for (const transfer of transferRows) {
        const fromCurrency = accountCurrencyById.get(transfer.from_account_id);
        const toCurrency = accountCurrencyById.get(transfer.to_account_id);

        if (fromCurrency === 'EGP') {
          egpCash -= Number(transfer.amount ?? 0);
        }
        if (toCurrency === 'EGP') {
          egpCash += Number(transfer.received_amount ?? 0);
        }
      }

      setCash(egpCash);
      setIncome(monthIncome);
      setExpenses(monthExpenses);
      setRecentTransactions(transactionRows);
      setDashboardLoading(false);
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  function formatEGP(value: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 2,
    }).format(value);
  }

  const cashFlow = income - expenses;

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-primary">Good morning</p>
          <h2 className="mt-1 font-display text-[30px] font-extrabold tracking-[-0.055em] sm:text-[38px]">
            Welcome, <span className="text-primary">your name</span>
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            Here is your current financial picture based on the data in Financy.
          </p>
        </div>

        <button
          onClick={() => setLocation('/settings')}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-xs font-bold card-shadow hover:bg-muted"
          data-testid="button-personalize-dashboard"
        >
          <Sparkles className="size-4 text-primary" />
          Personalize workspace
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Net worth"
          value={dashboardLoading ? 'Loading...' : formatEGP(cash)}
          icon={BarChart3}
          subtitle="Cash only for now"
        />
        <MetricCard
          title="Cash"
          value={dashboardLoading ? 'Loading...' : formatEGP(cash)}
          icon={WalletCards}
          tone="blue"
          subtitle="Active EGP accounts"
        />
        <MetricCard
          title="Investments"
          value="EGP 0.00"
          icon={TrendingUp}
          subtitle="Investment module next"
        />
        <MetricCard
          title="Assets"
          value="EGP 0.00"
          icon={Landmark}
          tone="sand"
          subtitle="Asset module next"
        />
        <MetricCard
          title="Liabilities"
          value="EGP 0.00"
          icon={CreditCard}
          tone="rose"
          subtitle="Liability module next"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <SectionCard title="Recent transactions" icon={ArrowLeftRight}>
          {dashboardLoading ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              Loading transactions...
            </div>
          ) : recentTransactions.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No transactions yet"
              description="Add income or expenses to start building your financial history."
              action="Add income"
              onAction={() => setLocation('/income')}
            />
          ) : (
            <div className="divide-y divide-border">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary">
                      {transaction.type === 'income' ? (
                        <ArrowDownLeft className="size-4 text-primary" />
                      ) : (
                        <ArrowUpRight className="size-4 text-primary" />
                      )}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {transaction.description ||
                          (transaction.type === 'income' ? 'Income' : 'Expense')}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {transaction.transaction_date}
                      </p>
                    </div>
                  </div>

                  <p
                    className={cn(
                      'shrink-0 font-display text-sm font-bold',
                      transaction.type === 'income'
                        ? 'text-primary'
                        : 'text-destructive',
                    )}
                  >
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatEGP(Number(transaction.amount ?? 0))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Monthly cash flow" icon={BarChart3}>
          <div className="space-y-5 p-5">
            <div className="rounded-2xl bg-secondary/60 p-5">
              <p className="text-xs font-semibold text-muted-foreground">
                Current month
              </p>
              <p className="mt-2 font-display text-2xl font-bold tracking-[-0.04em]">
                {dashboardLoading ? 'Loading...' : formatEGP(cashFlow)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Income minus expenses
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-4">
                <p className="text-[11px] font-semibold text-muted-foreground">
                  Income
                </p>
                <p className="mt-2 font-display text-base font-bold text-primary">
                  {dashboardLoading ? 'Loading...' : formatEGP(income)}
                </p>
              </div>

              <div className="rounded-xl border border-border p-4">
                <p className="text-[11px] font-semibold text-muted-foreground">
                  Expenses
                </p>
                <p className="mt-2 font-display text-base font-bold text-destructive">
                  {dashboardLoading ? 'Loading...' : formatEGP(expenses)}
                </p>
              </div>
            </div>

            <button
              onClick={() => setLocation('/expenses')}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border text-xs font-bold hover:bg-muted"
            >
              View expenses
              <ChevronRight className="size-4" />
            </button>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <SectionCard title="Budget overview" icon={PieChart}>
          <EmptyState
            icon={PieChart}
            title="Budgets are next"
            description="Budget tracking will use your real income and expenses once the budget module is built."
            action="Explore budgets"
            onAction={() => setLocation('/budgets')}
          />
        </SectionCard>

        <SectionCard title="Goals overview" icon={Target}>
          <EmptyState
            icon={Target}
            title="Goals are next"
            description="Create goals after the core money flow is complete."
            action="Create a goal"
            onAction={() => setLocation('/goals')}
          />
        </SectionCard>

        <SectionCard title="Investment performance" icon={LineChart}>
          <EmptyState
            icon={LineChart}
            title="Investments are next"
            description="Portfolio values and performance will appear here after the investment module is connected."
            action="Set up investments"
            onAction={() => setLocation('/investments')}
          />
        </SectionCard>
      </div>

      <SectionCard title="Upcoming transactions" icon={CalendarDays}>
        <EmptyState
          icon={CalendarDays}
          title="Scheduled transactions are next"
          description="Scheduled income, expenses, bills, and installments will appear here when that module is connected."
          action="View calendar"
          onAction={() => setLocation('/calendar')}
        />
      </SectionCard>
    </div>
  );
}

function HubPage({ type }: { type: 'money' | 'investments' }) {
  const [, setLocation] = useLocation();
  const sections = type === 'investments' ? investmentSections : moneySections;
  const [active, setActive] = useState(sections[0]);

  if (type === 'investments') {

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">
              Investment hub
            </p>

            <h2 className="mt-1 font-display text-[30px] font-extrabold tracking-[-0.055em]">
              Invest with perspective.
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              A considered home for your portfolios, holdings, and long-term view.
            </p>
          </div>

          <button
            onClick={() => setLocation('/portfolios')}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground"
            data-testid="button-add-investments"
          >
            <Plus className="size-4" />
            Add portfolio
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-border pb-px scrollbar-none">
          {sections.map((section) => (
            <button
              key={section}
              onClick={() => setActive(section)}
              className={cn(
                'whitespace-nowrap border-b-2 px-1 pb-3 text-xs font-bold transition-colors',
                active === section
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {section}
            </button>
          ))}
        </div>

        <SectionCard title={active} icon={LineChart}>
          <EmptyState
            icon={LineChart}
            title={`${active} is ready when you are`}
            description="The investment module will be connected after Money is fully completed."
            action={active === 'Portfolios' ? 'Add portfolio' : undefined}
            onAction={() => setLocation('/portfolios')}
          />
        </SectionCard>
      </div>
    );
  }

  const [moneyLoading, setMoneyLoading] = useState(true);
  const [moneyAccounts, setMoneyAccounts] = useState<
    Array<{
      id: string;
      name: string;
      account_type: string;
      currency_code: string;
      opening_balance: number;
      status: string;
    }>
  >([]);
  const [moneyTransactions, setMoneyTransactions] = useState<
    Array<{
      id: string;
      account_id: string | null;
      type: 'income' | 'expense';
      amount: number;
      currency_code: string;
      transaction_date: string;
      description: string | null;
    }>
  >([]);

  useEffect(() => {
    let mounted = true;

    async function loadMoneyHub() {
      setMoneyLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (mounted) setMoneyLoading(false);
        return;
      }

      const [accountsResult, transactionsResult] = await Promise.all([
        supabase
          .from('accounts')
          .select('id, name, account_type, currency_code, opening_balance, status')
          .eq('user_id', user.id),
        supabase
          .from('transactions')
          .select('id, account_id, type, amount, currency_code, transaction_date, description')
          .eq('user_id', user.id)
          .in('type', ['income', 'expense'])
          .order('transaction_date', { ascending: false }),
      ]);

      if (!mounted) return;

      setMoneyAccounts((accountsResult.data ?? []) as typeof moneyAccounts);
      setMoneyTransactions((transactionsResult.data ?? []) as typeof moneyTransactions);
      setMoneyLoading(false);
    }

    loadMoneyHub();

    return () => {
      mounted = false;
    };
  }, []);

  const paymentAccounts = moneyAccounts.filter(
    (account) =>
      account.status === 'active' &&
      ['bank', 'cash', 'wallet', 'prepaid'].includes(account.account_type),
  );
  const creditCards = moneyAccounts.filter(
    (account) => account.status === 'active' && account.account_type === 'credit_card',
  );

  const accountBalances = moneyAccounts.reduce<Record<string, number>>(
    (result, account) => {
      result[account.id] = Number(account.opening_balance || 0);
      return result;
    },
    {},
  );

  for (const transaction of moneyTransactions) {
    if (!transaction.account_id) continue;
    if (!(transaction.account_id in accountBalances)) continue;
    if (transaction.type === 'income') {
      accountBalances[transaction.account_id] += Number(transaction.amount || 0);
    } else {
      accountBalances[transaction.account_id] -= Number(transaction.amount || 0);
    }
  }

  const paymentTotal = paymentAccounts.reduce(
    (sum, account) => sum + Number(accountBalances[account.id] ?? 0),
    0,
  );
  const creditOutstanding = creditCards.reduce(
    (sum, account) => sum + Math.max(0, -Number(accountBalances[account.id] ?? 0)),
    0,
  );

  function hubMoney(value: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 2,
    }).format(value);
  }

  function hubDate(value: string) {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  }

  const moneyCards = [
    {
      label: 'Payment Accounts',
      value: hubMoney(paymentTotal),
      meta: `${paymentAccounts.length} account${paymentAccounts.length === 1 ? '' : 's'}`,
      href: '/accounts',
      icon: WalletCards,
      tone: 'bg-secondary',
    },
    {
      label: 'Credit Cards',
      value: `- ${hubMoney(creditOutstanding)}`,
      meta: `${creditCards.length} card${creditCards.length === 1 ? '' : 's'}`,
      href: '/accounts',
      icon: CreditCard,
      tone: 'bg-destructive/10',
    },
    {
      label: 'Other Assets',
      value: 'Open workspace',
      meta: 'Assets outside accounts',
      href: '/assets',
      icon: Landmark,
      tone: 'bg-secondary',
    },
    {
      label: 'Investments',
      value: 'Open workspace',
      meta: 'Portfolios and holdings',
      href: '/investments',
      icon: TrendingUp,
      tone: 'bg-secondary',
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Money</p>
          <h2 className="mt-1 font-display text-[34px] font-extrabold tracking-[-0.06em]">
            Money Hub
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Your complete financial picture in one place.
          </p>
        </div>

        <button
          onClick={() => setLocation('/accounts')}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground"
        >
          <Plus className="size-4" />
          Add Account
        </button>
      </div>

      <section className="rounded-3xl bg-primary p-6 text-primary-foreground shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold opacity-75">Payment Accounts</p>
            <p className="mt-2 font-display text-3xl font-extrabold tracking-[-0.05em]">
              {moneyLoading ? 'Loading...' : hubMoney(paymentTotal)}
            </p>
            <p className="mt-1 text-xs opacity-75">
              {paymentAccounts.length} active account{paymentAccounts.length === 1 ? '' : 's'}
            </p>
          </div>
          <WalletCards className="size-6 opacity-80" />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {moneyCards.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => setLocation(item.href)}
              className="group rounded-2xl border border-border bg-card p-5 text-left card-shadow transition-colors hover:border-primary/30 hover:bg-secondary/20"
            >
              <div className="flex items-start justify-between gap-4">
                <span className={`grid size-11 place-items-center rounded-xl ${item.tone} text-primary`}>
                  <Icon className="size-5" />
                </span>
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
              <p className="mt-4 text-sm font-bold">{item.label}</p>
              <p className="mt-1 font-display text-xl font-bold tracking-[-0.03em]">
                {item.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
            </button>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card card-shadow">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="font-display text-base font-bold">Recent Activity</h3>
            <p className="mt-1 text-xs text-muted-foreground">Latest income and expenses</p>
          </div>
          <button
            onClick={() => setLocation('/transactions')}
            className="text-xs font-bold text-primary"
          >
            View all
          </button>
        </div>

        {moneyTransactions.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            No transactions yet.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {moneyTransactions.slice(0, 5).map((transaction) => {
              const positive = transaction.type === 'income';
              const account = moneyAccounts.find((item) => item.id === transaction.account_id);
              return (
                <div key={transaction.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-full ${positive ? 'bg-secondary text-primary' : 'bg-destructive/10 text-destructive'}`}>
                      {positive ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{transaction.description || 'Untitled transaction'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{account?.name || 'Unlinked account'}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{hubDate(transaction.transaction_date)}</span>
                  <span className={`text-sm font-bold ${positive ? 'text-primary' : 'text-destructive'}`}>
                    {positive ? '+ ' : '- '}{hubMoney(Number(transaction.amount || 0))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="rounded-2xl border border-dashed border-primary/30 bg-[hsl(var(--primary)/.05)] p-5">
        <div className="flex gap-3">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold">Money Hub is your overview</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Accounts holds the detailed account records. Assets and Investments keep their own dedicated workspaces.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

}

const standalonePages: Record<
  string,
  {
    title: string;
    eyebrow: string;
    description: string;
    icon: LucideIcon;
    action?: string;
  }
> = {
  '/transactions': {
    title: 'Transactions',
    eyebrow: 'Money',
    description:
      'A focused ledger for understanding your money movement.',
    icon: ArrowLeftRight,
    action: 'Add transaction',
  },
  '/portfolios': {
    title: 'Portfolios',
    eyebrow: 'Investments',
    description:
      'Organize your long-term investment strategy in one place.',
    icon: BriefcaseBusiness,
    action: 'Add portfolio',
  },
  '/platforms': {
    title: 'Platforms',
    eyebrow: 'Investments',
    description:
      'Keep track of the investment platforms you use.',
    icon: Landmark,
    action: 'Add platform',
  },
  '/assets': {
    title: 'Assets',
    eyebrow: 'Workspace',
    description:
      'See the full picture of what you own beyond accounts.',
    icon: Landmark,
    action: 'Add asset',
  },
  '/liabilities': {
    title: 'Liabilities',
    eyebrow: 'Workspace',
    description:
      'Bring obligations into view without making them feel bigger.',
    icon: CreditCard,
    action: 'Add liability',
  },
  '/budgets': {
    title: 'Budgets',
    eyebrow: 'Planning',
    description:
      'Give your spending a clear, flexible shape.',
    icon: PieChart,
    action: 'Create budget',
  },
  '/goals': {
    title: 'Goals',
    eyebrow: 'Planning',
    description:
      'Create a gentle plan for what you want your money to make possible.',
    icon: Target,
    action: 'Create goal',
  },
  '/reports': {
    title: 'Reports',
    eyebrow: 'Insights',
    description:
      'Understand your progress with useful, uncluttered views.',
    icon: FileBarChart,
  },
  '/calendar': {
    title: 'Calendar',
    eyebrow: 'Planning',
    description:
      'Keep upcoming financial moments in one easy view.',
    icon: CalendarDays,
  },
  '/search': {
    title: 'Search',
    eyebrow: 'Workspace',
    description:
      'Search your Financy workspace when there is something to find.',
    icon: Search,
  },
  '/notifications': {
    title: 'Notifications',
    eyebrow: 'Workspace',
    description:
      'Helpful reminders will live here when your workspace has activity.',
    icon: Bell,
  },
};

function StandalonePage({
  page,
}: {
  page: (typeof standalonePages)[string];
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">
          {page.eyebrow}
        </p>

        <h2 className="mt-1 font-display text-[34px] font-extrabold tracking-[-0.06em]">
          {page.title}
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {page.description}
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card card-shadow">
        <EmptyState
          icon={page.icon}
          title={`${page.title} are ready when you are`}
          description={`This is a foundation space for your ${page.title.toLowerCase()}. Add something real to start building your view.`}
          action={page.action}
        />
      </section>

      <div className="rounded-2xl border border-dashed border-primary/30 bg-[hsl(var(--primary)/.05)] p-5">
        <div className="flex gap-3">
          <CircleHelp className="mt-0.5 size-4 shrink-0 text-primary" />

          <p className="text-xs leading-5 text-muted-foreground">
            Financy does not create placeholder financial data. Once you add your first item, this space will become a useful part of your bigger picture.
          </p>
        </div>
      </div>
    </div>
  );
}

const settingsGroups = [
  {
    title: 'Personal',
    items: [
      ['Profile', 'Manage your personal workspace details.'],
      ['Appearance', 'Choose how Financy feels in every light.'],
      ['Language', 'Choose your language and direction.'],
      ['Currency', 'Set your base currency.'],
    ],
  },
  {
    title: 'Money',
    items: [
      ['Transaction Form', 'Choose which optional transaction fields are visible.'],
      ['Categories', 'Manage separate expense and income category trees.'],
      ['Expense Items', 'Choose reusable expense items instead of typing item names in transactions.'],
      ['People, Classes & Tags', 'Manage people, classes and tags used by transactions.'],
      ['Payment Methods & Payees', 'Manage payment methods and saved merchants.'],
    ],
  },
  {
    title: 'Investments',
    items: [
      ['Investment Settings', 'Set investment defaults and preferences.'],
    ],
  },
  {
    title: 'Trust & control',
    items: [
      ['Notifications', 'Choose which reminders deserve your attention.'],
      ['Backup & Restore', 'Manage workspace backup and restore.'],
      ['Security & Privacy', 'Review privacy and security controls.'],
      ['Data Management', 'Manage workspace data.'],
      ['About', 'About Financy.'],
    ],
  },
];

function Settings() {
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');
  const [language, setLanguage] = useState('English');
  const [active, setActive] = useState('Transaction Form');
  const [transactionSettings, setTransactionSettings] = useState<TransactionSettings>(() => loadTransactionSettings());
  const [categoryType, setCategoryType] = useState<'expense' | 'income'>('expense');
  const [categoryName, setCategoryName] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [expenseItemName, setExpenseItemName] = useState('');
  const [expenseItemMainCategoryId, setExpenseItemMainCategoryId] = useState('');
  const [expenseItemSubcategoryId, setExpenseItemSubcategoryId] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingExpenseItemId, setEditingExpenseItemId] = useState<string | null>(null);
  const [editingExpenseItemName, setEditingExpenseItemName] = useState('');
  const [listInputs, setListInputs] = useState({
    people: '',
    classes: '',
    tags: '',
    paymentMethods: '',
    payees: '',
  });

  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', isDark);
    root.dir = language === 'العربية' ? 'rtl' : 'ltr';
    return () => { root.dir = 'ltr'; };
  }, [theme, language]);

  const optionalFields = Object.entries(transactionSettings.visibleOptionalFields) as Array<[TransactionFieldKey, boolean]>;
  const activeCategories = categoryType === 'expense' ? transactionSettings.expenseCategories : transactionSettings.incomeCategories;
  const topLevelCategories = activeCategories.filter((item) => !item.parentId);
  const description = settingsGroups.flatMap((group) => group.items).find(([label]) => label === active)?.[1] ?? '';

  function updateSettings(next: TransactionSettings) {
    setTransactionSettings(next);
    saveTransactionSettings(next);
  }

  function toggleField(key: TransactionFieldKey, enabled: boolean) {
    updateSettings({
      ...transactionSettings,
      visibleOptionalFields: { ...transactionSettings.visibleOptionalFields, [key]: enabled },
    });
  }

  function setAllFields(enabled: boolean) {
    updateSettings({
      ...transactionSettings,
      visibleOptionalFields: Object.fromEntries(Object.keys(transactionSettings.visibleOptionalFields).map((key) => [key, enabled])) as TransactionSettings['visibleOptionalFields'],
    });
  }

  function addCategory() {
    const name = categoryName.trim();
    if (!name) return;
    const key = categoryType === 'expense' ? 'expenseCategories' : 'incomeCategories';
    const list = transactionSettings[key];
    if (list.some((item) => item.name.toLowerCase() === name.toLowerCase())) return;
    const item: CategoryItem = {
      id: (categoryType === 'expense' ? 'exp-' : 'inc-') + Date.now(),
      name,
      parentId: parentCategoryId || null,
    };
    updateSettings({ ...transactionSettings, [key]: [...list, item] });
    setCategoryName('');
    setParentCategoryId('');
  }

  function editCategory(id: string, name: string) {
    const nextName = name.trim();
    if (!nextName) return;
    const key = categoryType === 'expense' ? 'expenseCategories' : 'incomeCategories';
    const list = transactionSettings[key];
    if (list.some((item) => item.id !== id && item.name.toLowerCase() === nextName.toLowerCase())) return;
    updateSettings({
      ...transactionSettings,
      [key]: list.map((item) => item.id === id ? { ...item, name: nextName } : item),
    });
    setEditingCategoryId(null);
    setEditingCategoryName('');
  }

  function removeCategory(id: string) {
    const key = categoryType === 'expense' ? 'expenseCategories' : 'incomeCategories';
    const list = transactionSettings[key];
    const removeIds = new Set([id, ...list.filter((item) => item.parentId === id).map((item) => item.id)]);
    updateSettings({ ...transactionSettings, [key]: list.filter((item) => !removeIds.has(item.id)) });
  }

  function addExpenseItem() {
    const name = expenseItemName.trim();
    if (!name) return;
    if (transactionSettings.expenseItems.some((item) => item.name.toLowerCase() === name.toLowerCase())) return;

    const fallbackCategoryId = transactionSettings.expenseCategories.find((item) => !item.parentId)?.id ?? '';
    const selectedCategoryId = expenseItemSubcategoryId || expenseItemMainCategoryId || fallbackCategoryId;
    const item: ExpenseItem = {
      id: 'item-' + Date.now(),
      name,
      categoryId: selectedCategoryId,
    };

    updateSettings({
      ...transactionSettings,
      expenseItems: [...transactionSettings.expenseItems, item],
    });
    setExpenseItemName('');
    setExpenseItemMainCategoryId('');
    setExpenseItemSubcategoryId('');
  }

  function editExpenseItem(id: string, name: string) {
    const nextName = name.trim();
    if (!nextName) return;
    if (transactionSettings.expenseItems.some((item) => item.id !== id && item.name.toLowerCase() === nextName.toLowerCase())) return;
    updateSettings({
      ...transactionSettings,
      expenseItems: transactionSettings.expenseItems.map((item) => item.id === id ? { ...item, name: nextName } : item),
    });
    setEditingExpenseItemId(null);
    setEditingExpenseItemName('');
  }

  function removeExpenseItem(id: string) {
    updateSettings({
      ...transactionSettings,
      expenseItems: transactionSettings.expenseItems.filter((item) => item.id !== id),
    });
  }

  function addListItem(key: 'people' | 'classes' | 'tags' | 'paymentMethods' | 'payees', inputKey: keyof typeof listInputs) {
    const value = listInputs[inputKey].trim();
    if (!value || transactionSettings[key].some((item) => item.toLowerCase() === value.toLowerCase())) return;
    updateSettings({ ...transactionSettings, [key]: [...transactionSettings[key], value] });
    setListInputs((state) => ({ ...state, [inputKey]: '' }));
  }

  function removeListItem(key: 'people' | 'classes' | 'tags' | 'paymentMethods' | 'payees', value: string) {
    updateSettings({ ...transactionSettings, [key]: transactionSettings[key].filter((item) => item !== value) });
  }

  function renderListEditor(
    key: 'people' | 'classes' | 'tags' | 'paymentMethods' | 'payees',
    inputKey: keyof typeof listInputs,
    title: string,
    placeholder: string,
  ) {
    return (
      <div className="rounded-2xl border border-border p-4">
        <p className="text-sm font-bold">{title}</p>
        <div className="mt-3 flex gap-2">
          <input value={listInputs[inputKey]} onChange={(event) => setListInputs((state) => ({ ...state, [inputKey]: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addListItem(key, inputKey); } }} placeholder={placeholder} className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-xs" />
          <button type="button" onClick={() => addListItem(key, inputKey)} className="h-10 rounded-lg bg-primary px-3 text-[10px] font-bold text-primary-foreground">Add</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {transactionSettings[key].map((item) => (
            <span key={item} className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-[10px] font-semibold">
              {item}
              <button type="button" onClick={() => removeListItem(key, item)} className="text-muted-foreground hover:text-destructive">×</button>
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Workspace</p>
        <h2 className="mt-1 font-display text-[34px] font-extrabold tracking-[-0.06em]">Settings</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Control Financy without changing required transaction information.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
        <nav className="space-y-1 rounded-2xl border border-border bg-card p-2 card-shadow">
          {settingsGroups.map((group) => (
            <div key={group.title} className="space-y-1 pb-3">
              <p className="px-3 pt-2 text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">{group.title}</p>
              {group.items.map(([label]) => (
                <button type="button" key={label} onClick={() => setActive(label)} className={cn('flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-bold', active === label ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                  {label}<ChevronRight className="size-3.5" />
                </button>
              ))}
            </div>
          ))}
        </nav>

        <section className="rounded-2xl border border-border bg-card p-5 card-shadow sm:p-7">
          <div className="mb-6">
            <h3 className="font-display text-lg font-bold">{active}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>

          {active === 'Appearance' && (
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['system', 'System', Globe2],
                ['light', 'Light', Sun],
                ['dark', 'Dark', Moon],
              ].map(([value, label, Icon]) => {
                const ThemeIcon = Icon as LucideIcon;
                return <button type="button" key={value as string} onClick={() => setTheme(value as 'system' | 'light' | 'dark')} className={cn('flex items-center gap-3 rounded-xl border p-3 text-left', theme === value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted')}><ThemeIcon className="size-4" /><span className="text-xs font-bold">{label as string}</span></button>;
              })}
            </div>
          )}

          {active === 'Language' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Language</label>
              <select value={language} onChange={(event) => setLanguage(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold"><option>English</option><option>العربية</option></select>
            </div>
          )}

          {active === 'Transaction Form' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-sm font-bold">Optional transaction fields</p><p className="mt-1 text-xs text-muted-foreground">Required: Account, Amount, Currency, Date and Category. These cannot be hidden.</p></div>
                <div className="flex gap-2"><button type="button" onClick={() => setAllFields(true)} className="rounded-lg border border-border px-3 py-2 text-[10px] font-bold">Show all</button><button type="button" onClick={() => setAllFields(false)} className="rounded-lg border border-border px-3 py-2 text-[10px] font-bold">Hide all</button></div>
              </div>
              <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
                {['Account','Amount','Currency','Date','Category'].map((label) => <div key={label} className="flex items-center justify-between px-4 py-3"><span className="text-sm font-bold">{label}</span><span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">Required</span></div>)}
                {optionalFields.map(([key, enabled]) => (
                  <label key={key} className="flex cursor-pointer items-center justify-between px-4 py-3">
                    <span className="text-sm font-semibold">{TRANSACTION_FIELD_LABELS[key]}</span>
                    <input type="checkbox" checked={enabled} onChange={(event) => toggleField(key, event.target.checked)} />
                  </label>
                ))}
              </div>
              <button type="button" onClick={() => { resetTransactionSettings(); setTransactionSettings(loadTransactionSettings()); }} className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold">Reset to defaults</button>
            </div>
          )}

          {active === 'Categories' && (
            <div className="space-y-5">
              <div className="flex gap-2">
                <button type="button" onClick={() => { setCategoryType('expense'); setParentCategoryId(''); }} className={cn('rounded-xl px-3 py-2 text-xs font-bold', categoryType === 'expense' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>Expenses</button>
                <button type="button" onClick={() => { setCategoryType('income'); setParentCategoryId(''); }} className={cn('rounded-xl px-3 py-2 text-xs font-bold', categoryType === 'income' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>Income</button>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Category or subcategory name" className="h-10 rounded-xl border border-border bg-background px-3 text-sm" />
                <select value={parentCategoryId} onChange={(event) => setParentCategoryId(event.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm"><option value="">Top level</option>{topLevelCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                <button type="button" onClick={addCategory} className="h-10 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground">Add</button>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border">
                {topLevelCategories.map((mainCategory) => {
                  const branches = activeCategories.filter((item) => item.parentId === mainCategory.id);
                  const mainEditing = editingCategoryId === mainCategory.id;
                  return (
                    <div key={mainCategory.id} className="border-b border-border last:border-b-0">
                      <div className="flex items-center justify-between gap-3 bg-muted/30 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          {mainEditing ? (
                            <input autoFocus value={editingCategoryName} onChange={(event) => setEditingCategoryName(event.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold" />
                          ) : (
                            <p className="text-sm font-extrabold">{mainCategory.name}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {mainEditing ? (
                            <>
                              <button type="button" onClick={() => editCategory(mainCategory.id, editingCategoryName)} className="text-xs font-bold text-primary">Save</button>
                              <button type="button" onClick={() => setEditingCategoryId(null)} className="text-xs font-bold text-muted-foreground">Cancel</button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => { setEditingCategoryId(mainCategory.id); setEditingCategoryName(mainCategory.name); }} className="text-xs font-bold text-muted-foreground hover:text-foreground">Edit</button>
                              <button type="button" onClick={() => removeCategory(mainCategory.id)} className="text-xs font-bold text-muted-foreground hover:text-destructive">Remove</button>
                            </>
                          )}
                        </div>
                      </div>

                      {branches.map((branch) => {
                        const editing = editingCategoryId === branch.id;
                        return (
                          <div key={branch.id} className="flex items-center justify-between gap-3 border-t border-border px-6 py-2.5">
                            <div className="min-w-0 flex-1">
                              <span className="mr-2 text-muted-foreground">└</span>
                              {editing ? (
                                <input autoFocus value={editingCategoryName} onChange={(event) => setEditingCategoryName(event.target.value)} className="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs" />
                              ) : (
                                <span className="text-xs font-semibold">{branch.name}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {editing ? (
                                <>
                                  <button type="button" onClick={() => editCategory(branch.id, editingCategoryName)} className="text-[10px] font-bold text-primary">Save</button>
                                  <button type="button" onClick={() => setEditingCategoryId(null)} className="text-[10px] font-bold text-muted-foreground">Cancel</button>
                                </>
                              ) : (
                                <>
                                  <button type="button" onClick={() => { setEditingCategoryId(branch.id); setEditingCategoryName(branch.name); }} className="text-[10px] font-bold text-muted-foreground hover:text-foreground">Edit</button>
                                  <button type="button" onClick={() => removeCategory(branch.id)} className="text-[10px] font-bold text-muted-foreground hover:text-destructive">Remove</button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {!branches.length && (
                        <div className="px-6 py-3 text-[10px] text-muted-foreground">No branches yet</div>
                      )}
                    </div>
                  );
                })}
              </div>            </div>
          )}

          {active === 'Expense Items' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <p className="text-sm font-bold">Expense Items</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Items are selected in the expense form. Their category is assigned here and is not entered again during the transaction.
                </p>
              </div>

              <div className="grid gap-2 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
                <input
                  value={expenseItemName}
                  onChange={(event) => setExpenseItemName(event.target.value)}
                  placeholder="Item name"
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                />
                <select
                  value={expenseItemMainCategoryId}
                  onChange={(event) => {
                    setExpenseItemMainCategoryId(event.target.value);
                    setExpenseItemSubcategoryId('');
                  }}
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                >
                  <option value="">Main category</option>
                  {transactionSettings.expenseCategories
                    .filter((item) => !item.parentId)
                    .map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                </select>
                <select
                  value={expenseItemSubcategoryId}
                  onChange={(event) => setExpenseItemSubcategoryId(event.target.value)}
                  disabled={!expenseItemMainCategoryId}
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                >
                  <option value="">Branch / subcategory</option>
                  {transactionSettings.expenseCategories
                    .filter((item) => item.parentId === expenseItemMainCategoryId)
                    .map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                </select>
                <button type="button" onClick={addExpenseItem} className="h-10 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground">Add</button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border">
                <div className="hidden grid-cols-[1.2fr_1fr_1fr_auto] border-b border-border bg-muted/40 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground sm:grid">
                  <span>Item</span><span>Main category</span><span>Branch</span><span />
                </div>
                <div className="divide-y divide-border">
                  {transactionSettings.expenseItems.map((item) => {
                    const category = transactionSettings.expenseCategories.find((entry) => entry.id === item.categoryId);
                    const parent = category?.parentId
                      ? transactionSettings.expenseCategories.find((entry) => entry.id === category.parentId)
                      : category;
                    const branch = category?.parentId ? category : null;
                    const editing = editingExpenseItemId === item.id;
                    return (
                      <div key={item.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-center">
                        <div>
                          {editing ? (
                            <input autoFocus value={editingExpenseItemName} onChange={(event) => setEditingExpenseItemName(event.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs" />
                          ) : (
                            <span className="text-sm font-semibold">{item.name}</span>
                          )}
                        </div>
                        <span className="text-xs">{parent?.name ?? '—'}</span>
                        <span className="text-xs text-muted-foreground">{branch?.name ?? '—'}</span>
                        <div className="flex items-center gap-2">
                          {editing ? (
                            <>
                              <button type="button" onClick={() => editExpenseItem(item.id, editingExpenseItemName)} className="text-[10px] font-bold text-primary">Save</button>
                              <button type="button" onClick={() => setEditingExpenseItemId(null)} className="text-[10px] font-bold text-muted-foreground">Cancel</button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => { setEditingExpenseItemId(item.id); setEditingExpenseItemName(item.name); }} className="text-[10px] font-bold text-muted-foreground hover:text-foreground">Edit</button>
                              <button type="button" onClick={() => removeExpenseItem(item.id)} className="text-[10px] font-bold text-muted-foreground hover:text-destructive">Remove</button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>            </div>
          )}

          {active === 'People, Classes & Tags' && (
            <div className="grid gap-5 lg:grid-cols-3">
              {renderListEditor('people','people','People','Add person')}
              {renderListEditor('classes','classes','Classes','Add class')}
              {renderListEditor('tags','tags','Tags','Add tag')}
            </div>
          )}

          {active === 'Payment Methods & Payees' && (
            <div className="grid gap-5 lg:grid-cols-2">
              {renderListEditor('paymentMethods','paymentMethods','Payment Methods','Add payment method')}
              {renderListEditor('payees','payees','Payees / Merchants','Add merchant')}
            </div>
          )}

          {!['Appearance','Language','Transaction Form','Categories','Expense Items','People, Classes & Tags','Payment Methods & Payees'].includes(active) && (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5">
              <p className="text-sm font-semibold">This settings section is ready for its module.</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">The structure is included now so Financy can keep one consistent settings model as the remaining modules are connected.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function QuickAdd({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [, setLocation] = useLocation();

  if (!open) return null;

  const options = [
    ['Expense', ArrowDownLeft, 'Record spending when you are ready.', '/expenses'],
    ['Income', ArrowUpRight, 'Keep income visible and organized.', '/income'],
    ['Transfer', ArrowLeftRight, 'Move money between your accounts.', '/money'],
    ['Investment', TrendingUp, 'Add an investment activity.', '/investments'],
  ] as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 p-3 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Quick add"
    >
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Quick add</p>
            <h2 className="font-display text-xl font-bold tracking-[-0.04em]">
              What would you like to add?
            </h2>
          </div>

          <button
            onClick={onClose}
            className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
            aria-label="Close quick add"
            data-testid="button-close-quick-add"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="grid gap-2">
          {options.map(([label, Icon, description, href]) => (
            <button
              key={label}
              onClick={() => {
                onClose();
                setLocation(href);
              }}
              className="flex items-center gap-3 rounded-2xl border border-border p-3 text-left transition-colors hover:border-primary/40 hover:bg-secondary"
              data-testid={`button-quick-add-${label.toLowerCase()}`}
            >
              <span className="grid size-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <Icon className="size-5" />
              </span>

              <span>
                <span className="block text-sm font-bold">{label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {description}
                </span>
              </span>

              <ChevronRight className="ml-auto size-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Quick add opens the relevant Financy module.
        </p>
      </div>
    </div>
  );
}

function MobileMenu({
  open,
  onClose,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
      onClick={onClose}
    >
      <div
        className="h-full w-[min(86vw,340px)] bg-[hsl(var(--sidebar))] px-4 py-5 text-[hsl(var(--sidebar-foreground))] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-8 flex items-center justify-between">
          <Brand />

          <button
            onClick={onClose}
            className="grid size-9 place-items-center rounded-xl text-[hsl(var(--sidebar-foreground)/.65)] hover:bg-[hsl(var(--sidebar-accent))]"
            aria-label="Close navigation"
            data-testid="button-close-menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--sidebar-foreground)/.36)]">
          Workspace
        </p>

        <nav className="space-y-1">
          {primaryNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              onNavigate={onClose}
            />
          ))}

          <NavLink
            item={moreNav[0]}
            onNavigate={onClose}
          />
        </nav>

        <button
          onClick={() => {
            onClose();
            onLogout();
          }}
          className="mt-5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[hsl(var(--sidebar-foreground)/.62)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]"
          data-testid="button-mobile-logout"
        >
          <LogOut className="size-[17px]" />
          Sign out
        </button>
      </div>
    </div>
  );
}

function AppShell({
  children,
  onLogout,
  userEmail,
}: {
  children: ReactNode;
  onLogout: () => void;
  userEmail?: string;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  const [quickAdd, setQuickAdd] = useState(false);
  const [menu, setMenu] = useState(false);

  return (
    <div className="min-h-dvh bg-background">
      <div className="flex min-h-dvh">
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapse={() =>
            setSidebarCollapsed((value) => !value)
          }
          onLogout={onLogout}
          userEmail={userEmail}
        />

        <main className="min-w-0 flex-1">
          <Topbar
            onQuickAdd={() => setQuickAdd(true)}
            onMenu={() => setMenu(true)}
          />

          <div className="mx-auto max-w-[1500px] px-5 pb-28 pt-7 sm:px-8 sm:pt-9 lg:px-10 lg:pb-10">
            {children}
          </div>
        </main>
      </div>

      <MobileBottomNav
        onMore={() => setMenu(true)}
      />

      <MobileMenu
        open={menu}
        onClose={() => setMenu(false)}
        onLogout={onLogout}
      />

      <QuickAdd
        open={quickAdd}
        onClose={() => setQuickAdd(false)}
      />

      <button
        onClick={() => setQuickAdd(true)}
        className="fixed bottom-20 right-5 z-20 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-1 lg:hidden"
        aria-label="Open quick add"
        data-testid="button-floating-quick-add"
      >
        <CirclePlus className="size-6" />
      </button>
    </div>
  );
}

function Router({
  onLogout,
  userEmail,
}: {
  onLogout: () => void;
  userEmail?: string;
}) {
  return (
    <ErrorBoundary>
      <AppShell
        onLogout={onLogout}
        userEmail={userEmail}
      >
        <Switch>
          <Route path="/" component={MoneyProPreview} />
          <Route
            path="/dashboard"
            component={MoneyProPreview}
          />

          <Route
            path="/pro"
            component={MoneyProPreview}
          />

          <Route
            path="/accounts"
            component={() => <Accounts />}
          />

          <Route
            path="/credit-cards"
            component={() => <Accounts />}
          />

          <Route
            path="/transactions"
            component={() => <Transactions />}
          />

          <Route
            path="/income"
            component={() => (
              <Transactions defaultType="income" />
            )}
          />

          <Route
            path="/expenses"
            component={() => (
              <Transactions defaultType="expense" />
            )}
          />

          <Route
            path="/money"
            component={() => (
              <HubPage type="money" />
            )}
          />

          <Route
            path="/investments"
            component={() => (
              <HubPage type="investments" />
            )}
          />

          <Route
            path="/settings"
            component={Settings}
          />

          {Object.entries(standalonePages).map(
            ([path, page]) => (
              <Route
                key={path}
                path={path}
                component={() => (
                  <StandalonePage page={page} />
                )}
              />
            ),
          )}

          <Route component={NotFound} />
        </Switch>
      </AppShell>
    </ErrorBoundary>
  );
}

function AuthenticatedApp({
  session,
  onLogout,
}: {
  session: Session;
  onLogout: () => void;
}) {
  return (
    <WouterRouter
      base={import.meta.env.BASE_URL.replace(
        /\/$/,
        '',
      )}
    >
      <Router
        onLogout={onLogout}
        userEmail={session.user.email}
      />
    </WouterRouter>
  );
}

function App() {
  const [session, setSession] =
    useState<Session | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (mounted) {
          setSession(nextSession);
          setLoading(false);
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <div className="relative h-5 w-5">
              <span className="absolute bottom-0 left-0 h-3 w-1.5 rounded-sm bg-current opacity-75" />
              <span className="absolute bottom-0 left-[6px] h-4 w-1.5 rounded-sm bg-current opacity-90" />
              <span className="absolute bottom-0 right-0 h-5 w-1.5 rounded-sm bg-current" />
            </div>
          </div>

          <p className="text-sm font-semibold text-muted-foreground">
            Loading Financy...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthenticatedApp
          session={session}
          onLogout={handleLogout}
        />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
