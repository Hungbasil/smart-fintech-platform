import React, { useState } from 'react';
import auth, { forgotPassword, resetPassword } from '../services/auth';
import { OtpInput } from '../components/OtpInput';
import { getApiErrorMessage, toast } from '../services/notifications';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const login = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null); setSaving(true);
    try { await auth.login({ email, password }); toast.success('Signed in successfully'); window.location.replace('/'); }
    catch (err: any) { const message = getApiErrorMessage(err, 'Login failed'); setError(message); toast.error(message); }
    finally { setSaving(false); }
  };
  const requestReset = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null); setSaving(true);
    try { await forgotPassword(email); setStep(1); toast.success('Reset code sent to your email.'); }
    catch (err: any) { const message = getApiErrorMessage(err, 'Unable to send reset code'); setError(message); toast.error(message); }
    finally { setSaving(false); }
  };
  const reset = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null); setSaving(true);
    try { await resetPassword({ email, otp, newPassword }); toast.success('Password reset. You can sign in now.'); setStep(0); setPassword(''); setOtp(''); setNewPassword(''); }
    catch (err: any) { const message = getApiErrorMessage(err, 'Unable to reset password'); setError(message); toast.error(message); }
    finally { setSaving(false); }
  };

  return <div className="flex min-h-screen items-center justify-center bg-[#f4f7f6] px-4 py-10"><div className="w-full max-w-[420px]"><div className="mb-8 text-center"><div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#087f74] text-sm font-extrabold text-white shadow-md">SF</div><h1 className="text-3xl font-extrabold tracking-[-.05em] text-[#17212b]">{step === 0 ? 'Welcome back' : step === 1 ? 'Check your email' : 'Create a new password'}</h1><p className="mt-2 text-sm text-[#71808c]">{step === 0 ? 'Sign in to your personal finance workspace.' : `Secure password recovery for ${email}.`}</p></div><div className="surface p-7 sm:p-9">{error && <div className="mb-4 rounded-xl bg-[#fff1ef] px-3 py-2.5 text-sm font-semibold text-[#c25344]">{error}</div>}{step === 0 && <><form onSubmit={login} className="space-y-5"><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Email address</label><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74]" /></div><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Password</label><input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74]" /></div><button type="submit" disabled={saving} className="w-full rounded-xl bg-[#087f74] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Signing in...' : 'Sign in'}</button></form><form onSubmit={requestReset} className="mt-4"><button type="submit" disabled={saving || !email} className="w-full text-sm font-bold text-[#087f74] disabled:text-[#9aa7af]">Forgot password?</button></form><p className="mt-6 text-center text-sm text-[#71808c]">New to SmartFin? <a href="/register" className="font-bold text-[#087f74] no-underline hover:underline">Create an account</a></p></>}{step === 1 && <form onSubmit={(event) => { event.preventDefault(); if (otp.length === 6) setStep(2); }} className="space-y-5"><OtpInput value={otp} onChange={setOtp} disabled={saving} /><p className="text-center text-xs text-[#71808c]">Enter the 6-digit code sent to your email.</p><button type="submit" disabled={otp.length !== 6} className="w-full rounded-xl bg-[#087f74] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Continue</button><button type="button" onClick={() => setStep(0)} className="w-full text-sm font-bold text-[#71808c]">Back to sign in</button></form>}{step === 2 && <form onSubmit={reset} className="space-y-5"><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">New password</label><input required minLength={8} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74]" /></div><button type="submit" disabled={saving} className="w-full rounded-xl bg-[#087f74] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Updating...' : 'Reset password'}</button></form>}</div></div></div>;
};

export default Login;
