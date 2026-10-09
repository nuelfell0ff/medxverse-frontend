"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, CalendarClock, CheckCircle2, ChevronDown, CircleHelp, Hospital, Loader2, LockKeyhole, RefreshCw, ShieldCheck, UserRound, X } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { AccountType } from "@/types/auth.types";
import { API_BASE_URL } from "@/services/appointment.service";
import PatientShell from "@/components/patient/PatientShell";

type HospitalOption = { id: string; name: string; code: string; address?: string; logoUrl?: string };

export default function PatientPortalHomePage() {
  const router = useRouter();
  const { account, token, setAuth } = useAuthStore();
  const [hospitals, setHospitals] = useState<HospitalOption[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [hospitalCode, setHospitalCode] = useState("");
  const [mrn, setMrn] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const linked = Boolean(account?.hospitalId && account?.patientId);
  const selectedHospital = useMemo(() => hospitals.find((h) => h.code === hospitalCode), [hospitals, hospitalCode]);

  const loadHospitals = useCallback(async () => {
    setLoadingHospitals(true);
    try {
      const response = await fetch(`${API_BASE_URL}/patient-portal/auth/hospitals`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.message || "Hospitals could not be loaded.");
      setHospitals(Array.isArray(payload.data?.hospitals) ? payload.data.hospitals : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Hospitals could not be loaded."); }
    finally { setLoadingHospitals(false); }
  }, []);

  useEffect(() => { void loadHospitals(); }, [loadHospitals]);

  async function connectHospital(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess(""); setLinking(true);
    try {
      const response = await fetch(`${API_BASE_URL}/patient-portal/auth/link`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: account?.email, password, hospitalCode, mrn: mrn.trim(), dateOfBirth }) });
      const payload = await response.json();
      if (!response.ok || !payload?.success || !payload?.data?.token || !payload?.data?.patient) throw new Error(payload?.message || "We couldn't connect this account to the hospital.");
      const patient = payload.data.patient;
      setAuth({ id: patient.portalAccountId || patient.id, userId: patient.portalAccountId || patient.id, hospitalId: patient.hospitalId, patientId: patient.id, name: patient.name, firstName: patient.firstName, lastName: patient.lastName, email: patient.email, accountType: AccountType.PATIENT_PORTAL, userType: "PATIENT", mrn: patient.mrn }, payload.data.token);
      setPassword(""); setShowLinkForm(false); setSuccess(`Your account is now connected to ${payload.data.hospital?.name || selectedHospital?.name || "the hospital"}.`);
    } catch (e) { setError(e instanceof Error ? e.message : "We couldn't connect your account. Check the details and try again."); }
    finally { setLinking(false); }
  }

  return (
    <PatientShell>
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-[#1b7b68] p-6 text-white shadow-sm sm:p-8"><div aria-hidden="true" className="absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/10 bg-white/[0.04]" /><div aria-hidden="true" className="absolute -bottom-28 right-40 h-48 w-48 rounded-full border border-white/10" /><div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center"><div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-white/70">Patient workspace</p><h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Hello, {(account?.firstName || account?.name || "there").split(" ")[0]}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">Manage your hospital connection and access your virtual-care services from one place.</p></div><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20"><Activity className="h-8 w-8" /></div></div></section>
      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0" /><p className="flex-1">{error}</p><button onClick={() => setError("")} aria-label="Dismiss error"><X className="h-4 w-4" /></button></div>}
      {success && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><p className="flex-1">{success}</p><button onClick={() => setSuccess("")} aria-label="Dismiss message"><X className="h-4 w-4" /></button></div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68]"><Hospital className="h-5 w-5" /></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${linked ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{linked ? "Connected" : "Not connected"}</span></div><h2 className="mt-4 text-sm font-extrabold text-slate-800">Hospital account</h2><p className="mt-1 text-xs leading-5 text-slate-500">{linked ? `Connected to ${selectedHospital?.name || "your hospital"}. Your portal is linked to a patient record.` : "Connect to the hospital where you already have a patient record to access hospital-specific services."}</p>{!linked && <button onClick={() => { setShowLinkForm((v) => !v); setError(""); }} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#1b7b68] px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-[#146253]">Connect a hospital <ArrowRight className="h-3.5 w-3.5" /></button>}</article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><CalendarClock className="h-5 w-5" /></div><h2 className="mt-4 text-sm font-extrabold text-slate-800">Virtual care</h2><p className="mt-1 text-xs leading-5 text-slate-500">Review consultations and access virtual-care options when your account is connected to a participating hospital.</p><button onClick={() => router.push("/telemedicine")} disabled={!linked} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:border-[#1b7b68] hover:text-[#1b7b68] disabled:cursor-not-allowed disabled:opacity-40">Open virtual care <ArrowRight className="h-3.5 w-3.5" /></button></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><ShieldCheck className="h-5 w-5" /></div><h2 className="mt-4 text-sm font-extrabold text-slate-800">Your privacy</h2><p className="mt-1 text-xs leading-5 text-slate-500">We only attach hospital records after your details are checked against the hospital’s patient record.</p><p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Secure patient access</p></article>
      </div>
      {!linked && showLinkForm && <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#1b7b68]">Link your medical record</p><h2 className="mt-1 text-lg font-extrabold text-slate-800">Connect to a hospital</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Choose the hospital where you are registered, then enter your medical record number and date of birth. We will verify the details before connecting the accounts.</p></div><button onClick={() => setShowLinkForm(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close form"><X className="h-4 w-4" /></button></div>
        <form onSubmit={connectHospital} className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <label className="block sm:col-span-2"><span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Hospital</span><span className="relative mt-1.5 block"><select required value={hospitalCode} onChange={(e) => setHospitalCode(e.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 pr-10 text-sm text-slate-700 outline-none focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"><option value="">{loadingHospitals ? "Loading hospitals…" : hospitals.length ? "Select your hospital" : "No hospitals are currently listed"}</option>{hospitals.map((hospital) => <option key={hospital.id} value={hospital.code}>{hospital.name} · {hospital.code}{hospital.address ? ` · ${hospital.address}` : ""}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></span>{!loadingHospitals && hospitals.length === 0 && <button type="button" onClick={() => void loadHospitals()} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#1b7b68]"><RefreshCw className="h-3 w-3" /> Refresh hospital list</button>}</label>
          <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Medical record number (MRN)</span><input required value={mrn} onChange={(e) => setMrn(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10" placeholder="Enter your hospital MRN" /></label>
          <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Date of birth</span><input required type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10" /></label>
          <label className="block sm:col-span-2"><span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Confirm your portal password</span><span className="relative mt-1.5 block"><LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10" placeholder="Confirm it’s your account" /></span></label>
          <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-xl text-[10px] leading-5 text-slate-400">We match your hospital, MRN, date of birth and account details. If they do not match, contact the hospital reception to verify your patient record.</p><button disabled={linking || loadingHospitals || hospitals.length === 0} type="submit" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1b7b68] px-5 py-3 text-xs font-extrabold text-white transition hover:bg-[#146253] disabled:cursor-not-allowed disabled:opacity-50">{linking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Verify and connect</button></div>
        </form></section>}
      {linked && <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></div><div><h2 className="text-sm font-extrabold text-slate-800">Your hospital is connected</h2><p className="mt-1 text-xs leading-5 text-slate-500">Your portal account has a linked patient record. Use Virtual care to access supported appointments and consultations.</p>{account?.mrn && <p className="mt-2 text-xs font-bold text-slate-600">Medical record number: {account.mrn}</p>}</div></div></section>}
      <p className="px-1 text-[10px] leading-5 text-slate-400">Need help? If you cannot find your hospital or your details do not match, contact the hospital where you are registered. The hospital must have an active MedXVerse account and an existing patient record.</p>
    </div>
    </PatientShell>
  );
}
