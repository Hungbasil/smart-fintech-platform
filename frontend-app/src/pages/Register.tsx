import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import auth, { resendRegistration, verifyRegistration } from '../services/auth';
import { OtpInput } from '../components/OtpInput';
import { getApiErrorMessage, toast } from '../services/notifications';

export const Register: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resendIn, setResendIn] = useState(60);
  const navigate = useNavigate();

  useEffect(() => {
    if (step !== 'otp' || resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [step, resendIn]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null); setSaving(true);
    try { await auth.register({ fullName, email, password }); setStep('otp'); setResendIn(60); toast.success('Verification code sent to your email.'); }
    catch (err: any) { const message = getApiErrorMessage(err, 'Registration failed'); setError(message); toast.error(message); }
    finally { setSaving(false); }
  };

  const submitOtp = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null); setSaving(true);
    try { await verifyRegistration({ email, otp }); toast.success('Email verified. You can sign in now.'); navigate('/login', { replace: true }); }
    catch (err: any) { const message = getApiErrorMessage(err, 'Invalid verification code'); setError(message); toast.error(message); }
    finally { setSaving(false); }
  };

  const resend = async () => {
    try { await resendRegistration(email); setResendIn(60); toast.success('A new code has been sent.'); }
    catch (err: any) { toast.error(getApiErrorMessage(err, 'Unable to resend code')); }
  };

  return <div className="flex min-h-screen items-center justify-center bg-[#f4f7f6] px-4 py-10"><div className="w-full max-w-[420px]"><div className="mb-8 text-center"><div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#087f74] text-sm font-extrabold text-white shadow-md">SF</div><h1 className="text-3xl font-extrabold tracking-[-.05em] text-[#17212b]">{step === 'form' ? 'Create your workspace' : 'Verify your email'}</h1><p className="mt-2 text-sm text-[#71808c]">{step === 'form' ? 'A calmer way to understand your money.' : `Enter the code sent to ${email}.`}</p></div><div className="surface p-7 sm:p-9">{error && <div className="mb-4 rounded-xl bg-[#fff1ef] px-3 py-2.5 text-sm font-semibold text-[#c25344]">{error}</div>}{step === 'otp' ? <form onSubmit={submitOtp} className="space-y-5"><OtpInput value={otp} onChange={setOtp} disabled={saving} /><p className="text-center text-xs text-[#71808c]">Code expires in 5:00</p><button type="submit" disabled={saving || otp.length !== 6} className="w-full rounded-xl bg-[#087f74] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Verifying...' : 'Verify email'}</button><button type="button" disabled={resendIn > 0} onClick={resend} className="w-full text-sm font-bold text-[#087f74] disabled:text-[#9aa7af]">{resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}</button></form> : <form onSubmit={submit} className="space-y-5"><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Full name</label><input required value={fullName} onChange={(event) => setFullName(event.target.value)} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74]" /></div><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Email address</label><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74]" /></div><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Password</label><input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74]" /></div><button type="submit" disabled={saving} className="w-full rounded-xl bg-[#087f74] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Creating...' : 'Create account'}</button></form>}<p className="mt-6 text-center text-sm text-[#71808c]">Already have an account? <a href="/login" className="font-bold text-[#087f74] no-underline hover:underline">Sign in</a></p></div></div></div>;
};

export default Register;
