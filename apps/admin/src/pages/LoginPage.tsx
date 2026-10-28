import { Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { session, signIn, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [status, setStatus] = useState<{ type: 'idle' | 'error' | 'success'; message: string }>({
    type: 'idle',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email || !password) {
      setStatus({ type: 'error', message: 'Please enter both email and password.' });
      return;
    }

    setSubmitting(true);
    setStatus({ type: 'idle', message: '' });

    const result = await signIn(email, password);
    setSubmitting(false);

    if (!result.success) {
      const message = result.error?.includes('Invalid login')
        ? 'Invalid credentials. Please verify the email and password.'
        : result.error ?? 'Authentication failed.';
      setStatus({ type: 'error', message });
      return;
    }

    setStatus({ type: 'success', message: 'Signed in successfully.' });
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading MINDLOCK…</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 flex items-center justify-center gap-3 text-center">
          <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">MINDLOCK</h1>
            <p className="text-sm text-slate-500">Admin access portal</p>
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@company.com"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none ring-0 transition focus:border-sky-500 focus:bg-white"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 pr-11 outline-none transition focus:border-sky-500 focus:bg-white"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-500"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-sky-600"
              />
              Remember me
            </label>
            <span className="inline-flex items-center gap-1 text-sky-700">
              <LockKeyhole size={14} />
              Secure sign in
            </span>
          </div>

          {status.type !== 'idle' && (
            <div
              className={`rounded-xl border px-3 py-2 text-sm ${
                status.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {status.message}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
