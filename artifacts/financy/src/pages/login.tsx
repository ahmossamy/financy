import { FormEvent, useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/services/supabase';

export default function Login() {
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setLocation('/dashboard');
  }

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <div className="relative h-5 w-5">
              <span className="absolute bottom-0 left-0 h-3 w-1.5 rounded-sm bg-current opacity-75" />
              <span className="absolute bottom-0 left-[6px] h-4 w-1.5 rounded-sm bg-current opacity-90" />
              <span className="absolute bottom-0 right-0 h-5 w-1.5 rounded-sm bg-current" />
            </div>
          </div>

          <h1 className="font-display text-3xl font-extrabold tracking-[-0.05em]">
            Welcome to Financy
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to manage your money and investments.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 card-shadow sm:p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-xs font-bold text-foreground"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                required
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-xs font-bold text-foreground"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-3 text-xs font-medium text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-[11px] text-muted-foreground">
          Your financial data stays private to your account.
        </p>
      </div>
    </div>
  );
}
