export type TransactionFieldKey =
  | 'time'
  | 'description'
  | 'payee'
  | 'status'
  | 'person'
  | 'className'
  | 'reference'
  | 'attachment'
  | 'notes'
  | 'tags'
  | 'recurring'
  | 'repeat'
  | 'nextDate'
  | 'installment'
  | 'installmentCount'
  | 'currentInstallment';

export type CategoryItem = {
  id: string;
  name: string;
  parentId: string | null;
};

export type TransactionSettings = {
  visibleOptionalFields: Record<TransactionFieldKey, boolean>;
  expenseCategories: CategoryItem[];
  incomeCategories: CategoryItem[];
  people: string[];
  classes: string[];
  tags: string[];
  paymentMethods: string[];
  payees: string[];
};

export const REQUIRED_TRANSACTION_FIELDS = [
  'account',
  'amount',
  'currency',
  'date',
  'category',
] as const;

export const TRANSACTION_FIELD_LABELS: Record<TransactionFieldKey, string> = {
  time: 'Time',
  description: 'Description',
  payee: 'Payee / Merchant',
  status: 'Status',
  person: 'Person',
  className: 'Class',
  reference: 'Reference',
  attachment: 'Attachment',
  notes: 'Notes',
  tags: 'Tags',
  recurring: 'Recurring',
  repeat: 'Repeat',
  nextDate: 'Next Date',
  installment: 'Installment',
  installmentCount: 'Installment Count',
  currentInstallment: 'Current Installment',
};

export const DEFAULT_TRANSACTION_SETTINGS: TransactionSettings = {
  visibleOptionalFields: {
    time: true,
    description: true,
    payee: true,
    status: true,
    person: true,
    className: true,
    reference: true,
    attachment: true,
    notes: true,
    tags: true,
    recurring: true,
    repeat: true,
    nextDate: true,
    installment: true,
    installmentCount: true,
    currentInstallment: true,
  },
  expenseCategories: [
    { id: 'exp-home', name: 'Home', parentId: null },
    { id: 'exp-bills', name: 'Bills', parentId: null },
    { id: 'exp-electricity', name: 'Electricity', parentId: 'exp-bills' },
    { id: 'exp-internet', name: 'Internet', parentId: 'exp-bills' },
    { id: 'exp-food', name: 'Food & Dining', parentId: null },
    { id: 'exp-groceries', name: 'Groceries', parentId: 'exp-food' },
    { id: 'exp-restaurants', name: 'Restaurants', parentId: 'exp-food' },
    { id: 'exp-transport', name: 'Transport', parentId: null },
    { id: 'exp-fuel', name: 'Fuel', parentId: 'exp-transport' },
    { id: 'exp-shopping', name: 'Shopping', parentId: null },
    { id: 'exp-health', name: 'Health', parentId: null },
    { id: 'exp-education', name: 'Education', parentId: null },
    { id: 'exp-entertainment', name: 'Entertainment', parentId: null },
    { id: 'exp-fees', name: 'Bank Fees', parentId: null },
    { id: 'exp-other', name: 'Other', parentId: null },
  ],
  incomeCategories: [
    { id: 'inc-salary', name: 'Salary', parentId: null },
    { id: 'inc-business', name: 'Business', parentId: null },
    { id: 'inc-investment', name: 'Investment income', parentId: null },
    { id: 'inc-dividend', name: 'Dividends', parentId: 'inc-investment' },
    { id: 'inc-interest', name: 'Interest', parentId: 'inc-investment' },
    { id: 'inc-gift', name: 'Gifts', parentId: null },
    { id: 'inc-other', name: 'Other', parentId: null },
  ],
  people: ['Me'],
  classes: ['Personal', 'Business', 'Travel'],
  tags: ['Family', 'Needs', 'Wants'],
  paymentMethods: ['Cash', 'Debit Card', 'Credit Card', 'Bank Transfer', 'E-Wallet'],
  payees: ['Carrefour', 'Amazon', 'Electricity', 'Google', 'Apple', 'Microsoft', 'Canva'],
};

const STORAGE_KEY = 'financy-transaction-settings-v1';

function cloneDefaults(): TransactionSettings {
  return JSON.parse(JSON.stringify(DEFAULT_TRANSACTION_SETTINGS)) as TransactionSettings;
}

export function loadTransactionSettings(): TransactionSettings {
  if (typeof window === 'undefined') return cloneDefaults();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaults();

    const parsed = JSON.parse(raw) as Partial<TransactionSettings>;

    return {
      ...cloneDefaults(),
      ...parsed,
      visibleOptionalFields: {
        ...cloneDefaults().visibleOptionalFields,
        ...(parsed.visibleOptionalFields ?? {}),
      },
      expenseCategories: parsed.expenseCategories?.length ? parsed.expenseCategories : cloneDefaults().expenseCategories,
      incomeCategories: parsed.incomeCategories?.length ? parsed.incomeCategories : cloneDefaults().incomeCategories,
      people: parsed.people?.length ? parsed.people : cloneDefaults().people,
      classes: parsed.classes?.length ? parsed.classes : cloneDefaults().classes,
      tags: parsed.tags ?? cloneDefaults().tags,
      paymentMethods: parsed.paymentMethods?.length ? parsed.paymentMethods : cloneDefaults().paymentMethods,
      payees: parsed.payees ?? cloneDefaults().payees,
    };
  } catch {
    return cloneDefaults();
  }
}

export function saveTransactionSettings(settings: TransactionSettings) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent('financy-transaction-settings-changed'));
}

export function resetTransactionSettings() {
  saveTransactionSettings(cloneDefaults());
}

export function categoryLabel(category: CategoryItem, categories: CategoryItem[]) {
  const parent = category.parentId ? categories.find((item) => item.id === category.parentId) : null;
  return parent ? parent.name + ' > ' + category.name : category.name;
}

export function flattenCategoryLabels(categories: CategoryItem[]) {
  return categories.map((category) => ({
    value: category.name,
    label: categoryLabel(category, categories),
  }));
}
