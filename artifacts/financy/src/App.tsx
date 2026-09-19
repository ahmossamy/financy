import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
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
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

type NavItem = { label: string; href: string; icon: LucideIcon };

const primaryNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Money', href: '/money', icon: WalletCards },
  { label: 'Investments', href: '/investments', icon: LineChart },
  { label: 'Assets', href: '/assets', icon: Landmark },
  { label: 'Liabilities', href: '/liabilities', icon: CreditCard },
  { label: 'Budgets', href: '/budgets', icon: PieChart },
  { label: 'Goals', href: '/goals', icon: Target },
  { label: 'Reports', href: '/reports', icon: FileBarChart },
  { label: 'Calendar', href: '/calendar', icon: CalendarDays },
  { label: 'Search', href: '/search', icon: Search },
  { label: 'Notifications', href: '/notifications', icon: Bell },
];

const moreNav: NavItem[] = [
  { label: 'Settings', href: '/settings', icon: SettingsIcon },
];

const mobileNav: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Money', href: '/money', icon: WalletCards },
  { label: 'Investments', href: '/investments', icon: LineChart },
  { label: 'Reports', href: '/reports', icon: FileBarChart },
];

const moneySections = ['Accounts', 'Income', 'Expenses', 'Transfers', 'Scheduled Transactions', 'Categories'];
const investmentSections = ['Portfolios', 'Platforms', 'Assets', 'Holdings', 'Buy', 'Sell', 'Dividends', 'Current Prices', 'Performance'];

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className={cn('flex items-center gap-3', compact && 'justify-center')} data-testid="link-brand">
      <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-primary text-primary-foreground shadow-sm">
        <span className="relative block h-4 w-4">
          <span className="absolute bottom-0 left-0 h-2.5 w-1.5 rounded-sm bg-current opacity-75" />
          <span className="absolute bottom-0 left-[5px] h-3.5 w-1.5 rounded-sm bg-current opacity-90" />
          <span className="absolute bottom-0 right-0 h-4 w-1.5 rounded-sm bg-current" />
        </span>
      </span>
      {!compact && <span className="font-display text-[19px] font-extrabold tracking-[-0.04em]">Financy</span>}
    </Link>
  );
}

function NavLink({ item, collapsed = false, onNavigate }: { item: NavItem; collapsed?: boolean; onNavigate?: () => void }) {
  const [location] = useLocation();
  const active = item.href === '/dashboard' ? location === '/dashboard' || location === '/' : location.startsWith(item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`}
      className={cn(
        'group flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors',
        active ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))]' : 'text-[hsl(var(--sidebar-foreground)/.62)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]',
        collapsed && 'justify-center px-0',
      )}
    >
      <Icon className={cn('size-[17px] shrink-0', active ? 'text-primary' : 'text-current')} strokeWidth={active ? 2.2 : 1.8} />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

function Sidebar({ collapsed, onCollapse }: { collapsed: boolean; onCollapse: () => void }) {
  return (
    <aside className={cn('hidden h-dvh shrink-0 flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] px-3 py-5 text-[hsl(var(--sidebar-foreground))] transition-[width] duration-200 lg:flex', collapsed ? 'w-[76px]' : 'w-[252px]')}>
      <div className={cn('mb-8 flex items-center px-2', collapsed ? 'justify-center' : 'justify-between')}>
        <Brand compact={collapsed} />
        {!collapsed && <button className="grid size-8 place-items-center rounded-lg text-[hsl(var(--sidebar-foreground)/.55)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]" onClick={onCollapse} aria-label="Collapse navigation" data-testid="button-collapse-sidebar"><ChevronRight className="size-4 rotate-180" /></button>}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {!collapsed && <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--sidebar-foreground)/.36)]">Workspace</p>}
        {primaryNav.map((item) => <NavLink key={item.href} item={item} collapsed={collapsed} />)}
      </nav>
      <div className="mt-4 border-t border-[hsl(var(--sidebar-border))] pt-4">
        {!collapsed && <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--sidebar-foreground)/.36)]">More</p>}
        {moreNav.map((item) => <NavLink key={item.href} item={item} collapsed={collapsed} />)}
        <div className={cn('mt-4 flex items-center gap-2 rounded-xl bg-[hsl(var(--sidebar-accent))] p-2.5', collapsed && 'justify-center')}>
          <div className="grid size-8 place-items-center rounded-full bg-[hsl(var(--primary)/.2)] text-xs font-bold text-primary">YN</div>
          {!collapsed && <div className="min-w-0"><p className="truncate text-xs font-semibold">Your workspace</p><p className="text-[10px] text-[hsl(var(--sidebar-foreground)/.45)]">Private & local</p></div>}
        </div>
      </div>
    </aside>
  );
}

function MobileBottomNav({ onMore }: { onMore: () => void }) {
  const [location] = useLocation();
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background/95 px-2 pt-2 backdrop-blur lg:hidden" aria-label="Mobile navigation">
      {mobileNav.map((item) => {
        const Icon = item.icon;
        const active = location.startsWith(item.href);
        return <Link href={item.href} key={item.href} data-testid={`link-mobile-${item.label.toLowerCase()}`} className={cn('flex min-w-0 flex-1 flex-col items-center gap-1 py-1 text-[10px] font-semibold', active ? 'text-primary' : 'text-muted-foreground')}><Icon className="size-[19px]" strokeWidth={active ? 2.25 : 1.8} /><span>{item.label}</span></Link>;
      })}
      <button onClick={onMore} className="flex min-w-0 flex-1 flex-col items-center gap-1 py-1 text-[10px] font-semibold text-muted-foreground" data-testid="button-mobile-more"><MoreHorizontal className="size-[19px]" /><span>More</span></button>
    </nav>
  );
}

function Topbar({ onQuickAdd, onMenu }: { onQuickAdd: () => void; onMenu: () => void }) {
  const [location] = useLocation();
  const title = location === '/' || location === '/dashboard' ? 'Overview' : (primaryNav.find((item) => location.startsWith(item.href))?.label ?? (location === '/settings' ? 'Settings' : 'Workspace'));
  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border bg-background/90 px-5 backdrop-blur-md sm:px-8 lg:px-10">
      <div className="flex items-center gap-3">
        <button onClick={onMenu} className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted lg:hidden" aria-label="Open navigation" data-testid="button-open-menu"><Menu className="size-5" /></button>
        <div className="lg:hidden"><Brand /></div>
        <div className="hidden lg:block"><p className="text-xs font-semibold text-muted-foreground">Your workspace</p><h1 className="font-display text-[17px] font-bold tracking-[-0.02em]">{title}</h1></div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <button onClick={onQuickAdd} className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-3.5 text-xs font-bold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5" data-testid="button-quick-add-top"><Plus className="size-4" /><span className="hidden sm:inline">Quick add</span></button>
        <Link href="/notifications" className="relative grid size-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Notifications" data-testid="link-notifications-top"><Bell className="size-[18px]" /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" /></Link>
        <Link href="/settings" className="grid size-9 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground" aria-label="Open settings" data-testid="link-settings-top">YN</Link>
      </div>
    </header>
  );
}

function EmptyState({ icon: Icon = Sparkles, title, description, action, onAction }: { icon?: LucideIcon; title: string; description: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex min-h-[228px] flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground"><Icon className="size-5" strokeWidth={1.8} /></div>
      <h3 className="font-display text-base font-bold tracking-[-0.02em]">{title}</h3>
      <p className="mt-2 max-w-[300px] text-sm leading-6 text-muted-foreground">{description}</p>
      {action && <button onClick={onAction} className="mt-5 inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-3.5 text-xs font-bold text-foreground transition-colors hover:border-primary/40 hover:bg-secondary" data-testid={`button-empty-${action.toLowerCase().replaceAll(' ', '-')}`}><Plus className="size-3.5" />{action}</button>}
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, className = '' }: { title: string; icon?: LucideIcon; children: ReactNode; className?: string }) {
  return <section className={cn('overflow-hidden rounded-2xl border border-border bg-card card-shadow', className)}><div className="flex items-center justify-between border-b border-border px-5 py-4"><div className="flex items-center gap-2.5">{Icon && <Icon className="size-4 text-primary" strokeWidth={2} />}<h2 className="font-display text-sm font-bold tracking-[-0.01em]">{title}</h2></div><button className="rounded-lg p-1 text-muted-foreground hover:bg-muted" aria-label={`More options for ${title}`} data-testid={`button-more-${title.toLowerCase().replaceAll(' ', '-')}`}><MoreHorizontal className="size-4" /></button></div>{children}</section>;
}

function MetricCard({ title, icon: Icon, tone = 'green' }: { title: string; icon: LucideIcon; tone?: 'green' | 'blue' | 'sand' | 'rose' }) {
  const toneClass = { green: 'bg-[hsl(var(--primary)/.1)] text-primary', blue: 'bg-secondary text-secondary-foreground', sand: 'bg-[hsl(39_70%_91%)] text-[hsl(31_51%_36%)]', rose: 'bg-[hsl(4_70%_94%)] text-[hsl(4_48%_44%)]' }[tone];
  return <div className="rounded-2xl border border-border bg-card p-4 card-shadow sm:p-5"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-muted-foreground">{title}</span><span className={cn('grid size-8 place-items-center rounded-xl', toneClass)}><Icon className="size-4" strokeWidth={1.8} /></span></div><p className="mt-5 font-display text-[22px] font-bold tracking-[-0.05em] text-muted-foreground/55">Not set up</p><p className="mt-1 text-[11px] text-muted-foreground">Add your first item to see this here</p></div>;
}

function Dashboard() {
  const [, setLocation] = useLocation();
  return <div className="space-y-7">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-primary">Good morning</p><h2 className="mt-1 font-display text-[30px] font-extrabold tracking-[-0.055em] sm:text-[38px]">Welcome, <span className="text-primary">your name</span></h2><p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">A clear view of your money starts here. Take it one small step at a time.</p></div><button onClick={() => setLocation('/settings')} className="inline-flex h-10 w-fit items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-xs font-bold card-shadow hover:bg-muted" data-testid="button-personalize-dashboard"><Sparkles className="size-4 text-primary" />Personalize workspace</button></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><MetricCard title="Net worth" icon={BarChart3} /><MetricCard title="Cash" icon={WalletCards} tone="blue" /><MetricCard title="Investments" icon={TrendingUp} /><MetricCard title="Assets" icon={Landmark} tone="sand" /><MetricCard title="Liabilities" icon={CreditCard} tone="rose" /></div>
    <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><SectionCard title="Recent transactions" icon={ArrowLeftRight}><EmptyState icon={FileText} title="Your ledger is ready" description="Connect or add an account to start seeing your recent transactions." action="Add account" onAction={() => setLocation('/accounts')} /></SectionCard><SectionCard title="Monthly cash flow" icon={BarChart3}><EmptyState icon={BarChart3} title="No cash flow yet" description="Income and expenses will become visible here once your workspace has data." action="Add income" onAction={() => setLocation('/money')} /></SectionCard></div>
    <div className="grid gap-5 xl:grid-cols-3"><SectionCard title="Budget overview" icon={PieChart}><EmptyState icon={PieChart} title="Build a simple budget" description="Give every part of your money a place when you're ready." action="Explore budgets" onAction={() => setLocation('/budgets')} /></SectionCard><SectionCard title="Goals overview" icon={Target}><EmptyState icon={Target} title="Keep a goal in sight" description="Create a goal for something that matters to you." action="Create a goal" onAction={() => setLocation('/goals')} /></SectionCard><SectionCard title="Investment performance" icon={LineChart}><EmptyState icon={LineChart} title="Performance, without noise" description="Your investment view will appear after you set up a portfolio." action="Set up investments" onAction={() => setLocation('/investments')} /></SectionCard></div>
    <SectionCard title="Upcoming transactions" icon={CalendarDays}><EmptyState icon={CalendarDays} title="Your calendar is clear" description="Scheduled income and expenses will show up here so nothing catches you by surprise." action="View calendar" onAction={() => setLocation('/calendar')} /></SectionCard>
  </div>;
}

function HubPage({ type }: { type: 'money' | 'investments' }) {
  const sections = type === 'money' ? moneySections : investmentSections;
  const [active, setActive] = useState(sections[0]);
  const [, setLocation] = useLocation();
  const icon = type === 'money' ? WalletCards : LineChart;
  return <div className="space-y-6"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-primary">{type === 'money' ? 'Money hub' : 'Investment hub'}</p><h2 className="mt-1 font-display text-[30px] font-extrabold tracking-[-0.055em]">{type === 'money' ? 'Make money feel simpler.' : 'Invest with perspective.'}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{type === 'money' ? 'Organize accounts, movement, and plans in one calm place.' : 'A considered home for your portfolios, holdings, and long-term view.'}</p></div><button onClick={() => setLocation(type === 'money' ? '/accounts' : '/portfolios')} className="inline-flex h-10 w-fit items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground" data-testid={`button-add-${type}`}><Plus className="size-4" />{type === 'money' ? 'Add account' : 'Add portfolio'}</button></div>
    <div className="flex gap-2 overflow-x-auto border-b border-border pb-px scrollbar-none">{sections.map((section) => <button key={section} onClick={() => setActive(section)} className={cn('whitespace-nowrap border-b-2 px-1 pb-3 text-xs font-bold transition-colors', active === section ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')} data-testid={`tab-${section.toLowerCase().replaceAll(' ', '-')}`}>{section}</button>)}</div>
    <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]"><SectionCard title={active} icon={icon}><EmptyState icon={icon} title={`${active} is ready when you are`} description={`There is nothing to show here yet. Add your first ${active.toLowerCase().replace('scheduled transactions', 'scheduled transaction')} to begin.`} action={active === 'Accounts' || active === 'Portfolios' ? `Add ${active === 'Accounts' ? 'account' : 'portfolio'}` : undefined} onAction={() => setLocation(type === 'money' ? '/accounts' : '/portfolios')} /></SectionCard><section className="rounded-2xl border border-border bg-[hsl(var(--secondary)/.45)] p-6"><span className="grid size-10 place-items-center rounded-xl bg-background text-primary"><Sparkles className="size-5" /></span><h3 className="mt-5 font-display text-lg font-bold tracking-[-0.03em]">A thoughtful start</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Financy stays quiet until you give it something real to work with. No made-up balances, no assumptions.</p><div className="mt-6 space-y-3 text-xs font-semibold text-foreground"><div className="flex items-center gap-2"><span className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"><span className="text-[10px]">1</span></span>Set up your first {type === 'money' ? 'account' : 'portfolio'}</div><div className="flex items-center gap-2 text-muted-foreground"><span className="grid size-5 place-items-center rounded-full border border-border bg-background"><span className="text-[10px]">2</span></span>Build your view over time</div></div></section></div>
  </div>;
}

const standalonePages: Record<string, { title: string; eyebrow: string; description: string; icon: LucideIcon; action?: string }> = {
  '/accounts': { title: 'Accounts', eyebrow: 'Money', description: 'Keep a clear list of the places your money lives.', icon: WalletCards, action: 'Add account' },
  '/transactions': { title: 'Transactions', eyebrow: 'Money', description: 'A focused ledger for understanding your money movement.', icon: ArrowLeftRight, action: 'Add transaction' },
  '/portfolios': { title: 'Portfolios', eyebrow: 'Investments', description: 'Organize your long-term investment strategy in one place.', icon: BriefcaseBusiness, action: 'Add portfolio' },
  '/platforms': { title: 'Platforms', eyebrow: 'Investments', description: 'Keep track of the investment platforms you use.', icon: Landmark, action: 'Add platform' },
  '/assets': { title: 'Assets', eyebrow: 'Workspace', description: 'See the full picture of what you own beyond accounts.', icon: Landmark, action: 'Add asset' },
  '/liabilities': { title: 'Liabilities', eyebrow: 'Workspace', description: 'Bring obligations into view without making them feel bigger.', icon: CreditCard, action: 'Add liability' },
  '/budgets': { title: 'Budgets', eyebrow: 'Planning', description: 'Give your spending a clear, flexible shape.', icon: PieChart, action: 'Create budget' },
  '/goals': { title: 'Goals', eyebrow: 'Planning', description: 'Create a gentle plan for what you want your money to make possible.', icon: Target, action: 'Create goal' },
  '/reports': { title: 'Reports', eyebrow: 'Insights', description: 'Understand your progress with useful, uncluttered views.', icon: FileBarChart },
  '/calendar': { title: 'Calendar', eyebrow: 'Planning', description: 'Keep upcoming financial moments in one easy view.', icon: CalendarDays },
  '/search': { title: 'Search', eyebrow: 'Workspace', description: 'Search your Financy workspace when there is something to find.', icon: Search },
  '/notifications': { title: 'Notifications', eyebrow: 'Workspace', description: 'Helpful reminders will live here when your workspace has activity.', icon: Bell },
};

function StandalonePage({ page }: { page: (typeof standalonePages)[string] }) {
  return <div className="mx-auto max-w-3xl space-y-6"><div><p className="text-sm font-semibold text-primary">{page.eyebrow}</p><h2 className="mt-1 font-display text-[34px] font-extrabold tracking-[-0.06em]">{page.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{page.description}</p></div><section className="overflow-hidden rounded-2xl border border-border bg-card card-shadow"><EmptyState icon={page.icon} title={`${page.title} are ready when you are`} description={`This is a foundation space for your ${page.title.toLowerCase()}. Add something real to start building your view.`} action={page.action} /></section><div className="rounded-2xl border border-dashed border-primary/30 bg-[hsl(var(--primary)/.05)] p-5"><div className="flex gap-3"><CircleHelp className="mt-0.5 size-4 shrink-0 text-primary" /><p className="text-xs leading-5 text-muted-foreground">Financy does not create placeholder financial data. Once you add your first item, this space will become a useful part of your bigger picture.</p></div></div></div>;
}

const settingsGroups = [
  { title: 'Personal', items: [['Profile', 'Manage your personal workspace details.', 'Profile'], ['Appearance', 'Choose how Financy feels in every light.', 'Appearance'], ['Language', 'Prepare your preferred language and direction.', 'Language'], ['Currency', 'Set the currency used across your workspace.', 'Currency']] },
  { title: 'Workspace', items: [['Categories', 'Shape the labels that make sense for you.', 'Categories'], ['Investment Settings', 'Set your investing preferences and defaults.', 'Investment Settings'], ['Notifications', 'Choose which reminders deserve your attention.', 'Notifications']] },
  { title: 'Trust & control', items: [['Backup & Restore', 'Keep a portable copy of your workspace.', 'Backup & Restore'], ['Security & Privacy', 'Review the principles behind your private workspace.', 'Security & Privacy'], ['Data Management', 'Manage the data you bring into Financy.', 'Data Management'], ['About', 'Learn more about this foundation release.', 'About']] },
];

function Settings() {
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');
  const [language, setLanguage] = useState('English');
  const [active, setActive] = useState('Appearance');
  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', isDark);
    root.dir = language === 'العربية' ? 'rtl' : 'ltr';
    return () => { root.dir = 'ltr'; };
  }, [theme, language]);
  return <div className="space-y-6"><div><p className="text-sm font-semibold text-primary">Workspace</p><h2 className="mt-1 font-display text-[34px] font-extrabold tracking-[-0.06em]">Settings</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Make Financy feel like your own quiet financial notebook.</p></div><div className="grid gap-5 lg:grid-cols-[240px_1fr]"><nav className="space-y-1 rounded-2xl border border-border bg-card p-2 card-shadow" aria-label="Settings sections">{settingsGroups.flatMap((group) => group.items).map(([label]) => <button key={label} onClick={() => setActive(label)} className={cn('flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-colors', active === label ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')} data-testid={`button-settings-${label.toLowerCase().replaceAll(' ', '-')}`}>{label}<ChevronRight className="size-3.5" /></button>)}</nav><section className="rounded-2xl border border-border bg-card p-5 card-shadow sm:p-7"><div className="mb-7 flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-secondary text-secondary-foreground"><SettingsIcon className="size-5" /></span><div><h3 className="font-display text-lg font-bold tracking-[-0.03em]">{active}</h3><p className="mt-1 text-sm text-muted-foreground">{settingsGroups.flatMap((group) => group.items).find(([label]) => label === active)?.[1]}</p></div></div>{active === 'Appearance' ? <div className="space-y-3"><p className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Theme</p><div className="grid gap-3 sm:grid-cols-3">{[['system', 'System', Globe2], ['light', 'Light', Sun], ['dark', 'Dark', Moon]].map(([value, label, Icon]) => { const ThemeIcon = Icon as LucideIcon; return <button key={value as string} onClick={() => setTheme(value as 'system' | 'light' | 'dark')} className={cn('flex items-center gap-3 rounded-xl border p-3 text-left transition-colors', theme === value ? 'border-primary bg-[hsl(var(--primary)/.08)]' : 'border-border hover:bg-muted')} data-testid={`button-theme-${value}`}><ThemeIcon className={cn('size-4', theme === value ? 'text-primary' : 'text-muted-foreground')} /><span className="text-xs font-bold">{label as string}</span>{theme === value && <span className="ml-auto size-2 rounded-full bg-primary" />}</button>; })}</div><p className="mt-5 text-xs leading-5 text-muted-foreground">System is the default. Financy follows your device preference until you choose a different appearance.</p></div> : active === 'Language' ? <div className="space-y-4"><label className="block text-xs font-bold uppercase tracking-[.12em] text-muted-foreground" htmlFor="language-select">Language</label><select id="language-select" value={language} onChange={(event) => setLanguage(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold" data-testid="select-language"><option>English</option><option>العربية</option></select><p className="text-xs leading-5 text-muted-foreground">Arabic support is prepared with right-to-left document direction. Translated content will be added in a future release.</p></div> : <div className="rounded-xl border border-dashed border-border bg-muted/40 p-5"><p className="text-sm font-semibold">This foundation is intentionally quiet.</p><p className="mt-2 text-xs leading-5 text-muted-foreground">The controls for {active.toLowerCase()} will become available as Financy grows. No settings are changed behind the scenes.</p></div>}</section></div></div>;
}

function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  const options = [['Expense', ArrowDownLeft, 'Record spending when you are ready.'], ['Income', ArrowUpRight, 'Keep income visible and organized.'], ['Transfer', ArrowLeftRight, 'Move money between your accounts.'], ['Investment', TrendingUp, 'Add an investment activity.']] as const;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label="Quick add"><div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><div><p className="text-sm font-semibold text-primary">Quick add</p><h2 className="font-display text-xl font-bold tracking-[-0.04em]">What would you like to add?</h2></div><button onClick={onClose} className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted" aria-label="Close quick add" data-testid="button-close-quick-add"><X className="size-5" /></button></div><div className="grid gap-2">{options.map(([label, Icon, description]) => <button key={label} onClick={onClose} className="flex items-center gap-3 rounded-2xl border border-border p-3 text-left transition-colors hover:border-primary/40 hover:bg-secondary" data-testid={`button-quick-add-${label.toLowerCase()}`}><span className="grid size-10 place-items-center rounded-xl bg-secondary text-secondary-foreground"><Icon className="size-5" /></span><span><span className="block text-sm font-bold">{label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{description}</span></span><ChevronRight className="ml-auto size-4 text-muted-foreground" /></button>)}</div><p className="mt-4 text-center text-[11px] text-muted-foreground">Foundation mode — nothing is saved yet.</p></div></div>;
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={onClose}><div className="h-full w-[min(86vw,340px)] bg-[hsl(var(--sidebar))] px-4 py-5 text-[hsl(var(--sidebar-foreground))] shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-8 flex items-center justify-between"><Brand /><button onClick={onClose} className="grid size-9 place-items-center rounded-xl text-[hsl(var(--sidebar-foreground)/.65)] hover:bg-[hsl(var(--sidebar-accent))]" aria-label="Close navigation" data-testid="button-close-menu"><X className="size-5" /></button></div><p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--sidebar-foreground)/.36)]">Workspace</p><nav className="space-y-1">{primaryNav.map((item) => <NavLink key={item.href} item={item} onNavigate={onClose} />)}<NavLink item={moreNav[0]} onNavigate={onClose} /></nav></div></div>;
}

function AppShell({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);
  const [menu, setMenu] = useState(false);
  return <div className="min-h-dvh bg-background"><div className="flex min-h-dvh"><Sidebar collapsed={sidebarCollapsed} onCollapse={() => setSidebarCollapsed((value) => !value)} /><main className="min-w-0 flex-1"><Topbar onQuickAdd={() => setQuickAdd(true)} onMenu={() => setMenu(true)} /><div className="mx-auto max-w-[1500px] px-5 pb-28 pt-7 sm:px-8 sm:pt-9 lg:px-10 lg:pb-10">{children}</div></main></div><MobileBottomNav onMore={() => setMenu(true)} /><MobileMenu open={menu} onClose={() => setMenu(false)} /><QuickAdd open={quickAdd} onClose={() => setQuickAdd(false)} /><button onClick={() => setQuickAdd(true)} className="fixed bottom-20 right-5 z-20 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-1 lg:hidden" aria-label="Open quick add" data-testid="button-floating-quick-add"><CirclePlus className="size-6" /></button></div>;
}

function Router() {
  return <ErrorBoundary><AppShell><Switch><Route path="/" component={Dashboard} /><Route path="/dashboard" component={Dashboard} /><Route path="/money" component={() => <HubPage type="money" />} /><Route path="/investments" component={() => <HubPage type="investments" />} /><Route path="/settings" component={Settings} />{Object.entries(standalonePages).map(([path, page]) => <Route key={path} path={path} component={() => <StandalonePage page={page} />} />)}<Route component={NotFound} /></Switch></AppShell></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;