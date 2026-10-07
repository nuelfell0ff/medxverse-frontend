'use client';

import { Dispatch, FormEvent, SetStateAction, useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Hospital,
  Loader2,
  LockKeyhole,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { staffAccountService, StaffProfileResponse } from '@/services/staff-account.service';

export default function StaffSettingsPage() {
  const [profile, setProfile] = useState<StaffProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    title: '',
    jobTitle: '',
    phone: '',
    alternatePhone: '',
    address: '',
    city: '',
    state: '',
    country: '',
  });

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await staffAccountService.getProfile();
      setProfile(data);
      setForm({
        firstName: data.staff.firstName || '',
        middleName: data.staff.middleName || '',
        lastName: data.staff.lastName || '',
        title: data.staff.title || '',
        jobTitle: data.staff.jobTitle || '',
        phone: data.staff.contact?.phone || '',
        alternatePhone: data.staff.contact?.alternatePhone || '',
        address: data.staff.contact?.address || '',
        city: data.staff.contact?.city || '',
        state: data.staff.contact?.state || '',
        country: data.staff.contact?.country || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load your profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setSavingProfile(true);
    setMessage(null);
    setError(null);
    try {
      const data = await staffAccountService.updateProfile(form);
      setProfile(data);
      setMessage('Your profile was updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update your profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setChangingPassword(true);
    setMessage(null);
    setError(null);
    try {
      await staffAccountService.changePassword(passwords);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage('Password changed successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to change your password.');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-72 items-center justify-center gap-2 text-xs text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading your staff profile...</div>;
  }

  if (!profile) {
    return <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-xs text-rose-700">{error || 'Staff profile could not be loaded.'}</div>;
  }

  const displayName = `${profile.staff.firstName || ''} ${profile.staff.lastName || ''}`.trim();

  return (
    <div className="max-w-full space-y-6">
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#1b7b68]">Account</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">Profile & settings</h1>
        <p className="mt-1 text-xs text-slate-500">Manage your staff profile and account security. Hospital identity and role are controlled by your hospital.</p>
      </div>

      {(message || error) && (
        <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-xs ${error ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
          {error ? <ShieldCheck className="mt-0.5 h-4 w-4" /> : <CheckCircle2 className="mt-0.5 h-4 w-4" />}
          <span>{error || message}</span>
        </div>
      )}

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#e8f5f3] text-lg font-bold text-[#1b7b68]">
            {profile.staff.profilePhotoUrl ? <img src={profile.staff.profilePhotoUrl} alt={displayName} className="h-full w-full object-cover" /> : displayName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'ST'}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-800">{displayName || 'Staff member'}</h2>
            <p className="mt-1 text-xs text-slate-500">{profile.staff.jobTitle || profile.staff.professionalTitle || profile.staff.role}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#e8f5f3] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#1b7b68]">{profile.staff.role}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">ID: {profile.staff.staffId}</span>
            </div>
          </div>
        </div>
      </section>

      <form onSubmit={saveProfile} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68]"><UserRound className="h-5 w-5" /></div>
          <div><h2 className="text-sm font-bold text-slate-800">Personal information</h2><p className="text-xs text-slate-400">Update the contact details your hospital allows you to maintain.</p></div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['firstName', 'First name'], ['middleName', 'Middle name'], ['lastName', 'Last name'],
            ['title', 'Title'], ['jobTitle', 'Job title'], ['phone', 'Phone'], ['alternatePhone', 'Alternate phone'],
            ['address', 'Address'], ['city', 'City'], ['state', 'State'], ['country', 'Country'],
          ].map(([field, label]) => (
            <label key={field} className="block">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
              <input value={form[field as keyof typeof form]} onChange={(event) => updateField(field as keyof typeof form, event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/10" />
            </label>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button type="submit" disabled={savingProfile} className="flex items-center gap-2 rounded-xl bg-[#1b7b68] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#166653] disabled:opacity-60">
            {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save profile
          </button>
        </div>
      </form>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><LockKeyhole className="h-5 w-5" /></div>
            <div><h2 className="text-sm font-bold text-slate-800">Change password</h2><p className="text-xs text-slate-400">Use at least 8 characters with upper/lowercase, a number and a special character.</p></div>
          </div>
          <form onSubmit={changePassword} className="mt-6 space-y-4">
            {[
              ['currentPassword', 'Current password', showCurrent, setShowCurrent],
              ['newPassword', 'New password', showNew, setShowNew],
              ['confirmPassword', 'Confirm new password', showConfirm, setShowConfirm],
            ].map(([field, label, visible, setVisible]) => (
              <label key={field as string} className="block">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label as string}</span>
                <div className="relative mt-1.5">
                  <input type={visible ? 'text' : 'password'} value={passwords[field as keyof typeof passwords]} onChange={(event) => setPasswords((current) => ({ ...current, [field as keyof typeof passwords]: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-xs text-slate-700 outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/10" />
                  <button type="button" onClick={() => (setVisible as Dispatch<SetStateAction<boolean>>)(!visible)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600" aria-label={`Show ${label as string}`}>
                    {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            ))}
            <button type="submit" disabled={changingPassword} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#1b7b68]/20 bg-[#e8f5f3] px-4 py-2.5 text-xs font-bold text-[#1b7b68] transition hover:bg-[#dcefeb] disabled:opacity-60">
              {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
              Change password
            </button>
          </form>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68]"><Hospital className="h-5 w-5" /></div><div><h2 className="text-sm font-bold text-slate-800">Your hospital</h2><p className="text-xs text-slate-400">This is the hospital account that owns your staff access.</p></div></div>
            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-800">{profile.hospital.name}</p>
              {profile.hospital.code && <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[#1b7b68]">Hospital code: {profile.hospital.code}</p>}
              <div className="mt-4 grid gap-2 text-xs text-slate-500">
                {profile.hospital.phone && <p>{profile.hospital.phone}</p>}
                {profile.hospital.email && <p>{profile.hospital.email}</p>}
                {profile.hospital.address && <p>{profile.hospital.address}</p>}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Building2 className="h-5 w-5" /></div><div><h2 className="text-sm font-bold text-slate-800">Work identity</h2><p className="text-xs text-slate-400">Hospital-managed information.</p></div></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] uppercase tracking-wider text-slate-400">Email</p><p className="mt-1 break-all text-xs font-semibold text-slate-700">{profile.account.email}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] uppercase tracking-wider text-slate-400">Role</p><p className="mt-1 text-xs font-semibold text-slate-700">{profile.account.role}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] uppercase tracking-wider text-slate-400">Department</p><p className="mt-1 text-xs font-semibold text-slate-700">{profile.staff.department?.name || 'Not assigned'}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] uppercase tracking-wider text-slate-400">Account status</p><p className="mt-1 text-xs font-semibold text-emerald-700">{profile.account.status}</p></div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-xs text-emerald-800">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <div><p className="font-bold">Hospital-scoped access</p><p className="mt-1 leading-5">Your profile, password, communication, tasks, tickets, and notifications are checked against your authenticated staff account and hospital.</p></div>
      </div>
    </div>
  );
}
