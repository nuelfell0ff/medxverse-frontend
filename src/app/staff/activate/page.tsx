'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { staffAuthService, StaffInvitationPreview } from '@/services/staff-auth.service';

function ActivateStaffForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [invitation, setInvitation] = useState<StaffInvitationPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('This invitation link is missing its activation token.');
      setLoadingPreview(false);
      return;
    }
    let cancelled = false;
    void staffAuthService.previewInvitation(token)
      .then((response) => { if (!cancelled) setInvitation(response.data); })
      .catch((err: any) => { if (!cancelled) setError(err?.message || 'This invitation is invalid, expired, or already used.'); })
      .finally(() => { if (!cancelled) setLoadingPreview(false); });
    return () => { cancelled = true; };
  }, [token]);

  const checks = useMemo(() => ({
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z\d]/.test(password),
  }), [password]);

  const strong = Object.values(checks).every(Boolean);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!strong) {
      setError('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await staffAuthService.acceptInvitation(token, password);
      setSuccess(true);
      window.setTimeout(() => {
        const email = invitation?.email ? `&email=${encodeURIComponent(invitation.email)}` : '';
        router.replace(`/auth/login?staffActivated=true${email}`);
      }, 900);
    } catch (err: any) {
      setError(err?.message || 'We could not activate this staff account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f7f6] px-4 py-8 font-sans sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.10)] md:grid-cols-[0.85fr_1.15fr]">
          <section className="hidden bg-[#1b7b68] p-8 text-white md:flex md:flex-col md:justify-between lg:p-10">
            <div>
              <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20"><ShieldCheck className="h-5 w-5" /></div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">MedXverse</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your hospital workspace starts here.</h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-white/70">Activate your staff account to securely access hospital communication, patients, tasks, and the clinical tools assigned to your role.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/65"><p className="font-semibold text-white">Private hospital access</p><p className="mt-1">Your account is tied to the hospital that issued this invitation.</p></div>
          </section>

          <section className="p-6 sm:p-8 lg:p-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#1b7b68]">Staff account activation</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-800">Welcome to MedXverse</h2>
            <p className="mt-1 text-sm text-slate-500">Set a secure password to activate your hospital staff account.</p>

            {loadingPreview ? (
              <div className="flex min-h-64 items-center justify-center rounded-2xl bg-slate-50"><Loader2 className="h-6 w-6 animate-spin text-[#1b7b68]" /></div>
            ) : success ? (
              <div className="mt-7 rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" /><h3 className="mt-3 text-lg font-bold text-slate-800">Account activated</h3><p className="mt-1 text-sm text-slate-500">Taking you to the MedXverse login page...</p></div>
            ) : !invitation ? (
              <div className="mt-7 rounded-2xl border border-rose-100 bg-rose-50 p-5"><div className="flex gap-3"><AlertCircle className="h-5 w-5 shrink-0 text-rose-600" /><div><h3 className="font-bold text-rose-800">Invitation unavailable</h3><p className="mt-1 text-sm leading-5 text-rose-700">{error}</p></div></div><Link href="/auth/login" className="mt-5 inline-flex text-xs font-bold text-[#1b7b68] hover:underline">Return to login</Link></div>
            ) : (
              <form onSubmit={submit} className="mt-7 space-y-5">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">Invited staff member</p>
                  <p className="mt-1 text-sm font-bold text-slate-800">{invitation.staff?.firstName} {invitation.staff?.lastName}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500"><Mail className="h-3.5 w-3.5" />{invitation.email}</div>
                  {invitation.hospital?.name && <p className="mt-1 text-xs text-slate-500">{invitation.hospital.name}</p>}
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Role: {invitation.role || invitation.staff?.role || 'Staff'}</p>
                </div>

                {error && <div className="flex gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs text-rose-700"><AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span></div>}

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-slate-600">Create password</label>
                  <div className="relative"><LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-11 pr-11 text-sm text-slate-800 outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/10" placeholder="Create a strong password" required /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label="Toggle password visibility">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-slate-400">{Object.entries({ length: '8+ characters', upper: 'Uppercase', lower: 'Lowercase', number: 'Number', special: 'Special character' }).map(([key, label]) => <span key={key} className={checks[key as keyof typeof checks] ? 'text-emerald-600' : ''}>• {label}</span>)}</div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="mb-1.5 block text-xs font-semibold text-slate-600">Confirm password</label>
                  <div className="relative"><LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="confirmPassword" type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-11 pr-11 text-sm text-slate-800 outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/10" placeholder="Repeat your password" required /><button type="button" onClick={() => setShowConfirm((value) => !value)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label="Toggle confirmation visibility">{showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                </div>

                <button type="submit" disabled={submitting} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1b7b68] px-4 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-md shadow-[#1b7b68]/15 transition hover:bg-[#176c5c] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Activating</> : <><ShieldCheck className="h-4 w-4" />Activate account</>}</button>
                <p className="text-center text-[10px] leading-4 text-slate-400">Access is restricted to authorized hospital work.</p>
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default function StaffActivatePage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#f4f7f6]"><Loader2 className="h-7 w-7 animate-spin text-[#1b7b68]" /></div>}><ActivateStaffForm /></Suspense>;
}
