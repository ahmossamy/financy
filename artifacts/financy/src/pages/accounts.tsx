import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Archive, WalletCards, X } from 'lucide-react';
import { supabase } from '@/lib/services/supabase';

type AccountType =
  | 'bank'
  | 'cash'
  | 'credit_card'
  | 'prepaid'
  | 'wallet'
  | 'investment_cash';

type AccountStatus = 'active' | 'archived' | 'closed';

type Currency = {
  code: string;
  name?: string | null;
};

type Account = {
  id: string;
  user_id: string;
  name: string;
  account_type: AccountType;
  currency_code: string;
  bank_name: string | null;
  provider: string | null;
  opening_balance: number;
  credit_limit: number | null;
  account_number: string | null;
  iban: string | null;
  mobile_number: string | null;
  statement_date: number | null;
  payment_due_date: number | null;
  status: AccountStatus;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type AccountForm = {
  name: string;
  account_type: AccountType;
  currency_code: string;
  bank_name: string;
  provider: string;
  opening_balance: string;
  credit_limit: string;
  account_number: string;
  iban: string;
  mobile_number: string;
  statement_date: string;
  payment_due_date: string;
  notes: string;
};

const ACCOUNT_TYPES: Array<{
  value: AccountType;
  label: string;
}> = [
  { value: 'bank', label: 'Bank Account' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'prepaid', label: 'Prepaid Card' },
  { value: 'wallet', label: 'E-Wallet' },
  { value: 'investment_cash', label: 'Investment Cash' },
];

const EMPTY_FORM: AccountForm = {
  name: '',
  account_type: 'bank',
  currency_code: 'EGP',
  bank_name: '',
  provider: '',
  opening_balance: '0',
  credit_limit: '',
  account_number: '',
  iban: '',
  mobile_number: '',
  statement_date: '',
  payment_due_date: '',
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

function getAccountTypeLabel(type: AccountType) {
  return (
    ACCOUNT_TYPES.find((item) => item.value === type)?.label ??
    type
  );
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] =
    useState<Account | null>(null);
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

    const [accountsResult, currenciesResult] =
      await Promise.all([
        supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', {
            ascending: false,
          }),

        supabase
          .from('currencies')
          .select('code, name')
          .order('code'),
      ]);

    if (accountsResult.error) {
      setError(accountsResult.error.message);
      setLoading(false);
      return;
    }

    setAccounts(
      (accountsResult.data ?? []) as Account[],
    );

    setCurrencies(
      (currenciesResult.data ?? []) as Currency[],
    );

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function openAddModal() {
    setEditingAccount(null);

    setForm({
      ...EMPTY_FORM,
      currency_code:
        currencies.find((currency) => currency.code === 'EGP')
          ?.code ??
        currencies[0]?.code ??
        'EGP',
    });

    setError('');
    setModalOpen(true);
  }

  function openEditModal(account: Account) {
    setEditingAccount(account);

    setForm({
      name: account.name,
      account_type: account.account_type,
      currency_code: account.currency_code,
      bank_name: account.bank_name ?? '',
      provider: account.provider ?? '',
      opening_balance: String(account.opening_balance ?? 0),
      credit_limit:
        account.credit_limit === null
          ? ''
          : String(account.credit_limit),
      account_number: account.account_number ?? '',
      iban: account.iban ?? '',
      mobile_number: account.mobile_number ?? '',
      statement_date:
        account.statement_date === null
          ? ''
          : String(account.statement_date),
      payment_due_date:
        account.payment_due_date === null
          ? ''
          : String(account.payment_due_date),
      notes: account.notes ?? '',
    });

    setError('');
    setModalOpen(true);
  }

  function updateField<K extends keyof AccountForm>(
    field: K,
    value: AccountForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError('Account name is required.');
      return;
    }

    if (!form.currency_code) {
      setError('Currency is required.');
      return;
    }

    const openingBalance =
      Number(form.opening_balance || 0);

    const creditLimit =
      form.credit_limit.trim() === ''
        ? null
        : Number(form.credit_limit);

    if (Number.isNaN(openingBalance)) {
      setError('Opening balance must be a valid number.');
      return;
    }

    if (
      creditLimit !== null &&
      Number.isNaN(creditLimit)
    ) {
      setError('Credit limit must be a valid number.');
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
      currency_code: form.currency_code,
      bank_name: form.bank_name.trim() || null,
      provider: form.provider.trim() || null,
      opening_balance: openingBalance,
      credit_limit: creditLimit,
      account_number:
        form.account_number.trim() || null,
      iban: form.iban.trim() || null,
      mobile_number:
        form.mobile_number.trim() || null,
      statement_date:
        form.statement_date.trim() === ''
          ? null
          : Number(form.statement_date),
      payment_due_date:
        form.payment_due_date.trim() === ''
          ? null
          : Number(form.payment_due_date),
      notes: form.notes.trim() || null,
    };

    const result = editingAccount
      ? await supabase
          .from('accounts')
          .update(payload)
          .eq('id', editingAccount.id)
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
    setEditingAccount(null);
    setForm(EMPTY_FORM);

    await loadData();
  }

  async function archiveAccount(account: Account) {
    const confirmed = window.confirm(
      `Archive "${account.name}"?`,
    );

    if (!confirmed) return;

    setError('');

    const { error } = await supabase
      .from('accounts')
      .update({
        status: 'archived',
      })
      .eq('id', account.id)
      .eq('user_id', account.user_id);

    if (error) {
      setError(error.message);
      return;
    }

    await loadData();
  }

  const activeAccounts = useMemo(
    () =>
      accounts.filter(
        (account) => account.status === 'active',
      ),
    [accounts],
  );

  const archivedAccounts = useMemo(
    () =>
      accounts.filter(
        (account) => account.status !== 'active',
      ),
    [accounts],
  );

  const totalsByCurrency = useMemo(() => {
    const totals: Record<string, number> = {};

    activeAccounts.forEach((account) => {
      totals[account.currency_code] =
        (totals[account.currency_code] ?? 0) +
        Number(account.opening_balance || 0);
    });

    return totals;
  }, [activeAccounts]);

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

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Manage the places where your money lives.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground"
          data-testid="button-add-account"
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

      {!loading && activeAccounts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(totalsByCurrency).map(
            ([currency, total]) => (
              <div
                key={currency}
                className="rounded-2xl border border-border bg-card p-5 card-shadow"
              >
                <p className="text-xs font-semibold text-muted-foreground">
                  Opening balances
                </p>

                <p className="mt-2 font-display text-2xl font-bold tracking-[-0.04em]">
                  {formatMoney(total, currency)}
                </p>

                <p className="mt-1 text-[11px] text-muted-foreground">
                  {activeAccounts.filter(
                    (account) =>
                      account.currency_code === currency,
                  ).length}{' '}
                  active account(s)
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
              Your accounts
            </h3>

            <p className="mt-1 text-xs text-muted-foreground">
              {activeAccounts.length} active account
              {activeAccounts.length === 1 ? '' : 's'}
            </p>
          </div>

          <WalletCards className="size-5 text-primary" />
        </div>

        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            Loading accounts...
          </div>
        ) : activeAccounts.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
              <WalletCards className="size-5" />
            </div>

            <h3 className="mt-4 font-display text-base font-bold">
              No accounts yet
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Add your first bank account, cash wallet, credit card,
              or investment cash account.
            </p>

            <button
              onClick={openAddModal}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground"
            >
              <Plus className="size-4" />
              Add your first account
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {activeAccounts.map((account) => (
              <div
                key={account.id}
                className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                    <WalletCards className="size-5" />
                  </div>

                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-bold">
                      {account.name}
                    </h4>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {getAccountTypeLabel(
                        account.account_type,
                      )}
                      {account.bank_name
                        ? ` • ${account.bank_name}`
                        : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-5 sm:justify-end">
                  <div className="text-left sm:text-right">
                    <p className="font-display text-base font-bold">
                      {formatMoney(
                        Number(account.opening_balance || 0),
                        account.currency_code,
                      )}
                    </p>

                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Opening balance
                    </p>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() =>
                        openEditModal(account)
                      }
                      className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Edit ${account.name}`}
                    >
                      <Pencil className="size-4" />
                    </button>

                    <button
                      onClick={() =>
                        archiveAccount(account)
                      }
                      className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Archive ${account.name}`}
                    >
                      <Archive className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {archivedAccounts.length > 0 && (
        <details className="rounded-2xl border border-border bg-card card-shadow">
          <summary className="cursor-pointer px-5 py-4 text-sm font-bold">
            Archived accounts ({archivedAccounts.length})
          </summary>

          <div className="divide-y divide-border border-t border-border">
            {archivedAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between px-5 py-4"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {account.name}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {getAccountTypeLabel(
                      account.account_type,
                    )}
                  </p>
                </div>

                <span className="rounded-lg bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {account.status}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 p-3 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-4">
              <div>
                <p className="text-xs font-semibold text-primary">
                  Money
                </p>

                <h3 className="font-display text-lg font-bold">
                  {editingAccount
                    ? 'Edit account'
                    : 'Add account'}
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
                <Field label="Account name" required>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      updateField(
                        'name',
                        event.target.value,
                      )
                    }
                    placeholder="CIB Current Account"
                    className={inputClass}
                    required
                  />
                </Field>

                <Field label="Account type" required>
                  <select
                    value={form.account_type}
                    onChange={(event) =>
                      updateField(
                        'account_type',
                        event.target.value as AccountType,
                      )
                    }
                    className={inputClass}
                  >
                    {ACCOUNT_TYPES.map((type) => (
                      <option
                        key={type.value}
                        value={type.value}
                      >
                        {type.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Currency" required>
                  <select
                    value={form.currency_code}
                    onChange={(event) =>
                      updateField(
                        'currency_code',
                        event.target.value,
                      )
                    }
                    className={inputClass}
                  >
                    {currencies.length === 0 ? (
                      <option value="EGP">
                        EGP
                      </option>
                    ) : (
                      currencies.map((currency) => (
                        <option
                          key={currency.code}
                          value={currency.code}
                        >
                          {currency.code}
                          {currency.name
                            ? ` — ${currency.name}`
                            : ''}
                        </option>
                      ))
                    )}
                  </select>
                </Field>

                <Field label="Opening balance">
                  <input
                    type="number"
                    step="0.01"
                    value={form.opening_balance}
                    onChange={(event) =>
                      updateField(
                        'opening_balance',
                        event.target.value,
                      )
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Bank / Institution">
                  <input
                    value={form.bank_name}
                    onChange={(event) =>
                      updateField(
                        'bank_name',
                        event.target.value,
                      )
                    }
                    placeholder="CIB"
                    className={inputClass}
                  />
                </Field>

                <Field label="Provider">
                  <input
                    value={form.provider}
                    onChange={(event) =>
                      updateField(
                        'provider',
                        event.target.value,
                      )
                    }
                    placeholder="Thndr, Tilda, Vodafone..."
                    className={inputClass}
                  />
                </Field>

                <Field label="Account number">
                  <input
                    value={form.account_number}
                    onChange={(event) =>
                      updateField(
                        'account_number',
                        event.target.value,
                      )
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="IBAN">
                  <input
                    value={form.iban}
                    onChange={(event) =>
                      updateField(
                        'iban',
                        event.target.value,
                      )
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Mobile number">
                  <input
                    value={form.mobile_number}
                    onChange={(event) =>
                      updateField(
                        'mobile_number',
                        event.target.value,
                      )
                    }
                    className={inputClass}
                  />
                </Field>

                {form.account_type ===
                  'credit_card' && (
                  <Field label="Credit limit">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.credit_limit}
                      onChange={(event) =>
                        updateField(
                          'credit_limit',
                          event.target.value,
                        )
                      }
                      className={inputClass}
                    />
                  </Field>
                )}

                {form.account_type ===
                  'credit_card' && (
                  <>
                    <Field label="Statement day">
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={form.statement_date}
                        onChange={(event) =>
                          updateField(
                            'statement_date',
                            event.target.value,
                          )
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Payment due day">
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={form.payment_due_date}
                        onChange={(event) =>
                          updateField(
                            'payment_due_date',
                            event.target.value,
                          )
                        }
                        className={inputClass}
                      />
                    </Field>
                  </>
                )}
              </div>

              <Field label="Notes">
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    updateField(
                      'notes',
                      event.target.value,
                    )
                  }
                  rows={3}
                  placeholder="Optional notes..."
                  className={`${inputClass} min-h-24 py-3`}
                />
              </Field>

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
                    : editingAccount
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

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-foreground">
        {label}
        {required && (
          <span className="ml-1 text-destructive">*</span>
        )}
      </span>

      {children}
    </label>
  );
}

const inputClass =
  'h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10';
