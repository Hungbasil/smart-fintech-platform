import React, { useState } from 'react';
import auth from '../services/auth';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await auth.login({ email, password });
      window.location.replace('/');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Login failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7f6] px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 text-center"><div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#087f74] text-sm font-extrabold text-white shadow-md">SF</div><h1 className="text-3xl font-extrabold tracking-[-.05em] text-[#17212b]">Welcome back</h1><p className="mt-2 text-sm text-[#71808c]">Sign in to your personal finance workspace.</p></div>
        <div className="surface p-7 sm:p-9">
        {error && <div className="mb-4 rounded-xl bg-[#fff1ef] px-3 py-2.5 text-sm font-semibold text-[#c25344]">{error}</div>}
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-[#71808c]">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none transition focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-[#71808c]">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none transition focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0]"
          />
        </div>
        <div>
          <button type="submit" className="w-full rounded-xl bg-[#087f74] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#075c57]">Sign in</button>
        </div>
      </form>
      <p className="mt-6 text-center text-sm text-[#71808c]">New to SmartFin? <a href="/register" className="font-bold text-[#087f74] no-underline hover:underline">Create an account</a></p>
      </div></div>
    </div>
  );
};

export default Login;
