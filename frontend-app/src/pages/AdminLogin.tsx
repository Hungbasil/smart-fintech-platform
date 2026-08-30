import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import auth from '../services/auth';
import { getApiErrorMessage, toast } from '../services/notifications';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (auth.isAuthenticated() && auth.isAdmin()) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await auth.login({ email, password });

      if (!auth.isAdmin()) {
        auth.logout();
        setError('This account does not have admin permissions.');
        toast.error('This account is not an administrator.');
        return;
      }

      toast.success('Admin access granted');
      navigate('/admin', { replace: true });
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, 'Admin login failed');
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#e0f2fe_0%,_#f8fafc_30%,_#eef2ff_100%)] px-4 py-10 text-slate-800">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.12)]">
        <div className="grid min-h-[760px] md:grid-cols-[1.08fr_0.92fr]">
          <div className="relative hidden items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-sky-950 to-indigo-950 p-10 md:flex">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(129,140,248,0.25),_transparent_35%)]" />
            <div className="relative max-w-md space-y-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-100 backdrop-blur-md">
                <ShieldCheck size={13} />
                Admin Portal
              </div>

              <div>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 text-xl font-black text-white shadow-lg shadow-sky-600/30">
                    S
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-sky-200/80">SmartFin</p>
                    <p className="text-xl font-bold text-white">Operations Center</p>
                  </div>
                </div>

                <h1 className="text-4xl font-black leading-tight tracking-[-0.06em] text-white">
                  Control your business with confidence.
                </h1>
              </div>

              <p className="text-base leading-7 text-sky-100/90">
                Monitor wallet activity, users, growth, and financial health from a single secure admin workspace.
              </p>

              <div className="space-y-3">
                {[
                  'Live system health monitoring',
                  'User and role management',
                  'Financial analytics and reports',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-sky-50 backdrop-blur-sm">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
                      <CheckCircle2 size={14} />
                    </div>
                    {item}
                  </div>
                ))}
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between text-sm text-sky-50/80">
                  <span>System health</span>
                  <span className="font-bold text-emerald-300">Online</span>
                </div>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[88%] rounded-full bg-gradient-to-r from-emerald-400 to-sky-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center bg-slate-50 p-6 md:p-10">
            <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
              <div className="mb-8">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-700">
                  <Sparkles size={12} />
                  Secure access
                </div>
                <h2 className="text-3xl font-black tracking-[-0.06em] text-slate-900">Admin Login</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-600">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="admin-email" className="mb-2 block text-sm font-semibold text-slate-700">
                    Email address
                  </label>
                  <input
                    id="admin-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@smartfin.com"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label htmlFor="admin-password" className="mb-2 block text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  <input
                    id="admin-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign in to admin'}
                  {!isSubmitting && <ArrowRight size={16} />}
                </button>
              </form>

              <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
                <span>Need system access?</span>
                <button
                  type="button"
                  onClick={() => navigate('/login', { replace: true })}
                  className="font-semibold text-sky-600 hover:text-sky-700"
                >
                  User login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default AdminLogin;
