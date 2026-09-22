'use client';

import {
  AlertCircle,
  Bell,
  Building2,
  Check,
  ChevronRight,
  Clock3,
  Globe2,
  Loader2,
  Lock,
  Palette,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

const RAW_API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://medxverse-backend.onrender.com/api/v1';

const API_BASE_URL = /\/api\/v1\/?$/i.test(RAW_API_URL.replace(/\/$/, ''))
  ? RAW_API_URL.replace(/\/$/, '')
  : `${RAW_API_URL.replace(/\/$/, '')}/api/v1`;

interface BrandingSettings {
  organizationName: string;
  shortName?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  supportEmail?: string;
  supportPhone?: string;
}
interface AddressSettings {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country: string;
  postalCode?: string;
}
interface ClaimsSettings {
  autoAcknowledgeClaims: boolean;
  requireDiagnosisCode: boolean;
  requireProviderReference: boolean;
  allowPartialApproval: boolean;
}
interface PreAuthorizationSettings {
  enabled: boolean;
  defaultValidityDays: number;
  requireClinicalNotes: boolean;
  autoExpire: boolean;
}
interface NotificationSettings {
  emailNotifications: boolean;
  claimNotifications: boolean;
  preAuthorizationNotifications: boolean;
  systemNotifications: boolean;
}
interface SecuritySettings {
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  requireStrongPasswords: boolean;
}
interface HMOSettings {
  _id: string;
  hmoId: string;
  branding: BrandingSettings;
  address: AddressSettings;
  currency: string;
  timezone: string;
  dateFormat: string;
  claims: ClaimsSettings;
  preAuthorization: PreAuthorizationSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  createdAt?: string;
  updatedAt?: string;
}

type SettingsSection = 'organization' | 'branding' | 'claims' | 'preauth' | 'notifications' | 'security';

type SectionMeta = {
  id: SettingsSection;
  label: string;
  description: string;
  icon: typeof Building2;
};

const DEFAULT_SETTINGS: HMOSettings = {
  _id: '',
  hmoId: '',
  branding: {
    organizationName: 'HMO', shortName: '', logoUrl: '', primaryColor: '#1b7b68', secondaryColor: '#0f766e', supportEmail: '', supportPhone: '',
  },
  address: { addressLine1: '', addressLine2: '', city: '', state: '', country: 'Nigeria', postalCode: '' },
  currency: 'NGN', timezone: 'Africa/Lagos', dateFormat: 'DD/MM/YYYY',
  claims: { autoAcknowledgeClaims: false, requireDiagnosisCode: true, requireProviderReference: true, allowPartialApproval: true },
  preAuthorization: { enabled: true, defaultValidityDays: 30, requireClinicalNotes: true, autoExpire: true },
  notifications: { emailNotifications: true, claimNotifications: true, preAuthorizationNotifications: true, systemNotifications: true },
  security: { sessionTimeoutMinutes: 60, maxLoginAttempts: 5, requireStrongPasswords: true },
};

const SECTIONS: SectionMeta[] = [
  { id: 'organization', label: 'Organization', description: 'Profile and contact details', icon: Building2 },
  { id: 'branding', label: 'Branding & Regional', description: 'Appearance and regional defaults', icon: Palette },
  { id: 'claims', label: 'Claims', description: 'Claims processing preferences', icon: SlidersHorizontal },
  { id: 'preauth', label: 'Pre-Authorizations', description: 'Authorization workflow', icon: ShieldCheck },
  { id: 'notifications', label: 'Notifications', description: 'Operational notifications', icon: Bell },
  { id: 'security', label: 'Security', description: 'Session and access controls', icon: Lock },
];

const inputClass = 'mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm outline-none transition placeholder:text-slate-300 hover:border-slate-300 focus:border-[#1b7b68] focus:ring-4 focus:ring-[#1b7b68]/10';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  for (const key of ['token', 'accessToken', 'access_token', 'authToken', 'jwt']) {
    const value = window.localStorage.getItem(key);
    if (!value) continue;
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'string') return parsed;
      if (parsed?.accessToken) return String(parsed.accessToken);
      if (parsed?.token) return String(parsed.token);
    } catch {
      return value;
    }
  }
  return null;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeSettings(data: Partial<HMOSettings> | null | undefined, base = DEFAULT_SETTINGS): HMOSettings {
  const source = data ?? {};
  return {
    ...base,
    ...source,
    branding: { ...base.branding, ...(source.branding ?? {}) },
    address: { ...base.address, ...(source.address ?? {}) },
    claims: { ...base.claims, ...(source.claims ?? {}) },
    preAuthorization: { ...base.preAuthorization, ...(source.preAuthorization ?? {}) },
    notifications: { ...base.notifications, ...(source.notifications ?? {}) },
    security: { ...base.security, ...(source.security ?? {}) },
  };
}

async function parseResponse(response: Response): Promise<any> {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.message || json?.error || `Request failed with status ${response.status}`);
  return json;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{children}</div>;
}

function SettingsCard({ icon: Icon, title, description, children }: { icon: typeof Building2; title: string; description: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1b7b68]/10 text-[#1b7b68]"><Icon size={18} /></div>
          <div><h2 className="text-sm font-extrabold text-slate-800 sm:text-base">{title}</h2><p className="mt-1 text-[11px] leading-5 text-slate-400">{description}</p></div>
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function Field({ label, required, description, children }: { label: string; required?: boolean; description?: string; children: ReactNode }) {
  return <div><label className="block text-[11px] font-extrabold text-slate-600">{label}{required && <span className="ml-1 text-rose-500">*</span>}</label>{children}{description && <p className="mt-1.5 text-[10px] leading-5 text-slate-400">{description}</p>}</div>;
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between gap-5 border-b border-slate-100 py-4 last:border-b-0"><div className="min-w-0"><p className="text-xs font-extrabold text-slate-700">{label}</p><p className="mt-1 max-w-2xl text-[10px] leading-5 text-slate-400">{description}</p></div><button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-[#1b7b68]' : 'bg-slate-300'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${checked ? 'left-[22px]' : 'left-0.5'}`} /></button></div>;
}

export default function HMOSettingsPage() {
  const [settings, setSettings] = useState<HMOSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<HMOSettings>(DEFAULT_SETTINGS);
  const [activeSection, setActiveSection] = useState<SettingsSection>('organization');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  const hasChanges = useMemo(() => JSON.stringify(settings) !== JSON.stringify(savedSettings), [settings, savedSettings]);
  const activeMeta = SECTIONS.find((section) => section.id === activeSection) ?? SECTIONS[0];

  const request = useCallback(async (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return parseResponse(await fetch(`${API_BASE_URL}${path}`, { ...options, headers, credentials: 'include' }));
  }, []);

  const fetchSettings = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await request('/settings');
      const data = response?.data ?? response?.settings ?? response;
      const normalized = normalizeSettings(data);
      setSettings(normalized); setSavedSettings(clone(normalized));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load HMO settings');
    } finally { setLoading(false); }
  }, [request]);

  useEffect(() => { void fetchSettings(); }, [fetchSettings]);

  const update = useCallback(<K extends keyof HMOSettings>(key: K, value: HMOSettings[K]) => setSettings((current) => ({ ...current, [key]: value })), []);
  const updateNested = useCallback(<K extends 'branding' | 'address' | 'claims' | 'preAuthorization' | 'notifications' | 'security', F extends keyof HMOSettings[K]>(group: K, field: F, value: HMOSettings[K][F]) => setSettings((current) => ({ ...current, [group]: { ...current[group], [field]: value } })), []);

  const saveSettings = async (event?: FormEvent) => {
    event?.preventDefault(); if (saving) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const payload = { branding: settings.branding, address: settings.address, currency: settings.currency, timezone: settings.timezone, dateFormat: settings.dateFormat, claims: settings.claims, preAuthorization: settings.preAuthorization, notifications: settings.notifications, security: settings.security };
      const response = await request('/settings', { method: 'PATCH', body: JSON.stringify(payload) });
      const normalized = normalizeSettings(response?.data ?? response?.settings ?? response, settings);
      setSettings(normalized); setSavedSettings(clone(normalized)); setSuccess('Settings saved successfully.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save settings'); }
    finally { setSaving(false); }
  };

  const resetSettings = async () => {
    if (resetting || saving || !window.confirm('Reset all HMO settings to their default values? This cannot be undone.')) return;
    setResetting(true); setError(''); setSuccess('');
    try {
      const response = await request('/settings/reset', { method: 'POST' });
      const normalized = normalizeSettings(response?.data ?? response?.settings ?? response, DEFAULT_SETTINGS);
      setSettings(normalized); setSavedSettings(clone(normalized)); setSuccess('Settings have been reset to their defaults.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to reset settings'); }
    finally { setResetting(false); }
  };

  const discard = () => { setSettings(clone(savedSettings)); setError(''); setSuccess(''); };

  if (loading) return <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center"><div className="text-center"><Loader2 className="mx-auto animate-spin text-[#1b7b68]" size={28}/><p className="mt-3 text-xs font-semibold text-slate-400">Loading HMO settings...</p></div></div>;

  return (
    <div className="min-h-full space-y-5 font-sans text-slate-800 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1b7b68] text-white shadow-sm"><Settings2 size={20}/></div><div><div className="flex items-center gap-2"><SectionLabel>HMO Portal</SectionLabel><ChevronRight size={13} className="text-slate-300"/><SectionLabel>Configuration</SectionLabel></div><h1 className="mt-1 text-2xl font-black tracking-tight text-slate-800">HMO Settings</h1><p className="mt-0.5 text-xs text-slate-400">Configure your organization, workflows, notifications and security controls.</p></div></div>
        <div className="flex flex-wrap items-center gap-2"><div className={`rounded-full border px-3 py-2 text-[10px] font-extrabold ${hasChanges ? 'border-amber-100 bg-amber-50 text-amber-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>{hasChanges ? 'Unsaved changes' : 'All settings saved'}</div><button onClick={() => void fetchSettings()} disabled={saving || resetting} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-600 shadow-sm hover:border-slate-300 disabled:opacity-50"><RefreshCw size={15}/>{'Refresh'}</button><button onClick={() => void saveSettings()} disabled={!hasChanges || saving || resetting} className="inline-flex items-center gap-2 rounded-2xl bg-[#1b7b68] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:opacity-95 disabled:opacity-50">{saving ? <Loader2 size={15} className="animate-spin"/> : <Save size={15}/>} {saving ? 'Saving...' : 'Save Changes'}</button></div>
      </div>

      {error && <div className="flex items-center gap-3 rounded-3xl border border-rose-100 bg-rose-50 p-4 text-xs text-rose-700"><AlertCircle size={17}/><div><p className="font-extrabold">Something went wrong</p><p className="mt-0.5">{error}</p></div><button onClick={() => void fetchSettings()} className="ml-auto font-bold underline">Retry</button></div>}
      {success && <div className="flex items-center gap-3 rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-xs text-emerald-700"><Check size={17}/><span className="font-extrabold">{success}</span></div>}

      <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-[10px] font-bold text-slate-400">Organization</span><Building2 size={17} className="text-[#1b7b68]"/></div><p className="mt-2 truncate text-sm font-black text-slate-800">{settings.branding.organizationName || 'HMO'}</p><p className="mt-1 text-[9px] font-semibold text-slate-400">{settings.address.city || 'Location not set'}{settings.address.state ? ` · ${settings.address.state}` : ''}</p></div><div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-[10px] font-bold text-slate-400">Claims workflow</span><SlidersHorizontal size={17} className="text-blue-600"/></div><p className="mt-2 text-sm font-black text-slate-800">{settings.claims.allowPartialApproval ? 'Partial approval enabled' : 'Full claim approval'}</p><p className="mt-1 text-[9px] font-semibold text-slate-400">Diagnosis code {settings.claims.requireDiagnosisCode ? 'required' : 'optional'}</p></div><div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-[10px] font-bold text-slate-400">Security</span><Lock size={17} className="text-violet-600"/></div><p className="mt-2 text-sm font-black text-slate-800">{settings.security.sessionTimeoutMinutes} min session</p><p className="mt-1 text-[9px] font-semibold text-slate-400">{settings.security.requireStrongPasswords ? 'Strong passwords required' : 'Standard password policy'}</p></div></div>

      <div className="lg:hidden"><button type="button" onClick={() => setMobileOpen((v) => !v)} className="flex w-full items-center justify-between rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#1b7b68]/10 text-[#1b7b68]"><activeMeta.icon size={17}/></div><div className="text-left"><p className="text-xs font-extrabold">{activeMeta.label}</p><p className="text-[9px] text-slate-400">{activeMeta.description}</p></div></div><ChevronRight size={17} className={`text-slate-400 transition-transform ${mobileOpen ? 'rotate-90' : ''}`}/></button>{mobileOpen && <div className="mt-2 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">{SECTIONS.map((section) => <button key={section.id} onClick={() => { setActiveSection(section.id); setMobileOpen(false); }} className={`flex w-full items-center gap-3 p-4 text-left ${section.id === activeSection ? 'bg-[#1b7b68]/5 text-[#1b7b68]' : 'text-slate-600'}`}><section.icon size={17}/><div><p className="text-xs font-extrabold">{section.label}</p><p className="text-[9px] text-slate-400">{section.description}</p></div></button>)}</div>}</div>

      <div className="grid gap-4 lg:grid-cols-[235px_minmax(0,1fr)]">
        <aside className="hidden lg:block"><div className="sticky top-24 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm"><div className="border-b border-slate-100 px-4 py-4"><SectionLabel>Configuration</SectionLabel></div><nav className="p-2">{SECTIONS.map((section) => { const active = section.id === activeSection; return <button key={section.id} onClick={() => setActiveSection(section.id)} className={`mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${active ? 'bg-[#e7f5f1] text-[#176653]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${active ? 'bg-white text-[#1b7b68] shadow-sm' : 'bg-slate-100 text-slate-400'}`}><section.icon size={15}/></div><div className="min-w-0"><p className="truncate text-[11px] font-extrabold">{section.label}</p><p className="mt-0.5 truncate text-[9px] text-slate-400">{section.description}</p></div></button>; })}</nav><div className="border-t border-slate-100 p-3"><button onClick={() => void resetSettings()} disabled={resetting || saving} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-50 py-2.5 text-[10px] font-extrabold text-rose-600 hover:bg-rose-100 disabled:opacity-50">{resetting ? <Loader2 size={14} className="animate-spin"/> : <RotateCcw size={14}/>} Reset Defaults</button></div></div></aside>

        <main className="min-w-0"><form onSubmit={saveSettings} className="space-y-4">
          {activeSection === 'organization' && <SettingsCard icon={Building2} title="Organization Information" description="Basic information and contact details for the HMO organization."><div className="grid gap-4 md:grid-cols-2"><Field label="Organization Name" required><input value={settings.branding.organizationName} onChange={(e) => updateNested('branding','organizationName',e.target.value)} className={inputClass} placeholder="Enter organization name"/></Field><Field label="Short Name"><input value={settings.branding.shortName ?? ''} onChange={(e) => updateNested('branding','shortName',e.target.value)} className={inputClass} placeholder="e.g. MedCare HMO"/></Field><Field label="Support Email"><input type="email" value={settings.branding.supportEmail ?? ''} onChange={(e) => updateNested('branding','supportEmail',e.target.value)} className={inputClass} placeholder="support@example.com"/></Field><Field label="Support Phone"><input value={settings.branding.supportPhone ?? ''} onChange={(e) => updateNested('branding','supportPhone',e.target.value)} className={inputClass} placeholder="+234..."/></Field></div><div className="mt-6 border-t border-slate-100 pt-6"><div className="mb-4 flex items-center gap-2"><Building2 size={15} className="text-[#1b7b68]"/><p className="text-xs font-extrabold text-slate-800">Organization Address</p></div><div className="grid gap-4 md:grid-cols-2"><div className="md:col-span-2"><Field label="Address Line 1"><input value={settings.address.addressLine1 ?? ''} onChange={(e) => updateNested('address','addressLine1',e.target.value)} className={inputClass} placeholder="Street address"/></Field></div><div className="md:col-span-2"><Field label="Address Line 2"><input value={settings.address.addressLine2 ?? ''} onChange={(e) => updateNested('address','addressLine2',e.target.value)} className={inputClass} placeholder="Suite, building, landmark..."/></Field></div><Field label="City"><input value={settings.address.city ?? ''} onChange={(e) => updateNested('address','city',e.target.value)} className={inputClass} placeholder="City"/></Field><Field label="State"><input value={settings.address.state ?? ''} onChange={(e) => updateNested('address','state',e.target.value)} className={inputClass} placeholder="State"/></Field><Field label="Country" required><input value={settings.address.country} onChange={(e) => updateNested('address','country',e.target.value)} className={inputClass} placeholder="Country"/></Field><Field label="Postal Code"><input value={settings.address.postalCode ?? ''} onChange={(e) => updateNested('address','postalCode',e.target.value)} className={inputClass} placeholder="Postal code"/></Field></div></div></SettingsCard>}

          {activeSection === 'branding' && <div className="space-y-4"><SettingsCard icon={Palette} title="Branding" description="Configure how your HMO is represented across the portal."><div className="grid gap-4 md:grid-cols-2"><Field label="Logo URL" description="Public URL for your organization logo."><input value={settings.branding.logoUrl ?? ''} onChange={(e) => updateNested('branding','logoUrl',e.target.value)} className={inputClass} placeholder="https://..."/></Field><Field label="Primary Color"><div className="flex gap-2"><input type="color" value={settings.branding.primaryColor || '#1b7b68'} onChange={(e) => updateNested('branding','primaryColor',e.target.value)} className="mt-2 h-11 w-14 cursor-pointer rounded-2xl border border-slate-200 bg-white p-1"/><input value={settings.branding.primaryColor ?? ''} onChange={(e) => updateNested('branding','primaryColor',e.target.value)} className={`${inputClass} flex-1`} placeholder="#1b7b68"/></div></Field><Field label="Secondary Color"><div className="flex gap-2"><input type="color" value={settings.branding.secondaryColor || '#0f766e'} onChange={(e) => updateNested('branding','secondaryColor',e.target.value)} className="mt-2 h-11 w-14 cursor-pointer rounded-2xl border border-slate-200 bg-white p-1"/><input value={settings.branding.secondaryColor ?? ''} onChange={(e) => updateNested('branding','secondaryColor',e.target.value)} className={`${inputClass} flex-1`} placeholder="#0f766e"/></div></Field></div></SettingsCard><SettingsCard icon={Globe2} title="Regional Settings" description="Configure currency, timezone and date formatting."><div className="grid gap-4 md:grid-cols-3"><Field label="Currency"><select value={settings.currency} onChange={(e) => update('currency',e.target.value)} className={inputClass}><option value="NGN">NGN — Nigerian Naira</option><option value="USD">USD — US Dollar</option><option value="GBP">GBP — British Pound</option><option value="EUR">EUR — Euro</option></select></Field><Field label="Timezone"><select value={settings.timezone} onChange={(e) => update('timezone',e.target.value)} className={inputClass}><option value="Africa/Lagos">Africa/Lagos</option><option value="UTC">UTC</option><option value="Africa/Accra">Africa/Accra</option><option value="Africa/Nairobi">Africa/Nairobi</option><option value="Africa/Johannesburg">Africa/Johannesburg</option></select></Field><Field label="Date Format"><select value={settings.dateFormat} onChange={(e) => update('dateFormat',e.target.value)} className={inputClass}><option value="DD/MM/YYYY">DD/MM/YYYY</option><option value="MM/DD/YYYY">MM/DD/YYYY</option><option value="YYYY-MM-DD">YYYY-MM-DD</option></select></Field></div><div className="mt-5 flex items-start gap-3 rounded-2xl bg-slate-50 p-4"><Clock3 size={17} className="mt-0.5 text-slate-400"/><div><p className="text-xs font-extrabold text-slate-700">Regional configuration</p><p className="mt-1 text-[10px] leading-5 text-slate-400">These values control how currency, timestamps and dates appear throughout the HMO portal.</p></div></div></SettingsCard></div>}

          {activeSection === 'claims' && <SettingsCard icon={SlidersHorizontal} title="Claims Processing" description="Configure how submitted claims are acknowledged and adjudicated."><div><Toggle label="Auto-acknowledge claims" description="Automatically acknowledge newly submitted claims." checked={settings.claims.autoAcknowledgeClaims} onChange={(v)=>updateNested('claims','autoAcknowledgeClaims',v)}/><Toggle label="Require diagnosis code" description="Require providers to submit a diagnosis code with claims." checked={settings.claims.requireDiagnosisCode} onChange={(v)=>updateNested('claims','requireDiagnosisCode',v)}/><Toggle label="Require provider reference" description="Require a valid provider reference before claims can be processed." checked={settings.claims.requireProviderReference} onChange={(v)=>updateNested('claims','requireProviderReference',v)}/><Toggle label="Allow partial approval" description="Allow adjudicators to approve individual claim items instead of the entire claim." checked={settings.claims.allowPartialApproval} onChange={(v)=>updateNested('claims','allowPartialApproval',v)}/></div></SettingsCard>}

          {activeSection === 'preauth' && <SettingsCard icon={ShieldCheck} title="Pre-Authorization" description="Configure the authorization request workflow and validity period."><div><Toggle label="Enable pre-authorizations" description="Allow providers to submit pre-authorization requests." checked={settings.preAuthorization.enabled} onChange={(v)=>updateNested('preAuthorization','enabled',v)}/><Toggle label="Require clinical notes" description="Require clinical notes before a request can be reviewed." checked={settings.preAuthorization.requireClinicalNotes} onChange={(v)=>updateNested('preAuthorization','requireClinicalNotes',v)}/><Toggle label="Automatically expire approvals" description="Automatically expire approved authorizations when their validity period ends." checked={settings.preAuthorization.autoExpire} onChange={(v)=>updateNested('preAuthorization','autoExpire',v)}/></div><div className="mt-5 border-t border-slate-100 pt-5"><Field label="Default validity period" description="Number of days an approved pre-authorization remains valid."><div className="flex max-w-sm items-center gap-3"><input type="number" min={1} max={365} value={settings.preAuthorization.defaultValidityDays} onChange={(e)=>updateNested('preAuthorization','defaultValidityDays',Math.min(365,Math.max(1,Number(e.target.value)||1)))} className={inputClass}/><span className="text-xs font-bold text-slate-400">days</span></div></Field></div></SettingsCard>}

          {activeSection === 'notifications' && <SettingsCard icon={Bell} title="Notification Preferences" description="Choose which operational notifications the HMO receives."><Toggle label="Email notifications" description="Receive general HMO notifications through email." checked={settings.notifications.emailNotifications} onChange={(v)=>updateNested('notifications','emailNotifications',v)}/><Toggle label="Claim notifications" description="Receive notifications when claims are submitted, reviewed, approved or rejected." checked={settings.notifications.claimNotifications} onChange={(v)=>updateNested('notifications','claimNotifications',v)}/><Toggle label="Pre-authorization notifications" description="Receive notifications for new and reviewed pre-authorization requests." checked={settings.notifications.preAuthorizationNotifications} onChange={(v)=>updateNested('notifications','preAuthorizationNotifications',v)}/><Toggle label="System notifications" description="Receive important system and administrative notifications." checked={settings.notifications.systemNotifications} onChange={(v)=>updateNested('notifications','systemNotifications',v)}/></SettingsCard>}

          {activeSection === 'security' && <SettingsCard icon={Lock} title="Security Settings" description="Configure basic HMO account security preferences."><div className="grid gap-4 md:grid-cols-2"><Field label="Session timeout" description="How long an inactive session remains active."><div className="flex items-center gap-3"><input type="number" min={5} max={1440} value={settings.security.sessionTimeoutMinutes} onChange={(e)=>updateNested('security','sessionTimeoutMinutes',Math.min(1440,Math.max(5,Number(e.target.value)||5)))} className={inputClass}/><span className="shrink-0 text-xs font-bold text-slate-400">minutes</span></div></Field><Field label="Maximum login attempts" description="Failed attempts allowed before additional protection is applied."><input type="number" min={3} max={20} value={settings.security.maxLoginAttempts} onChange={(e)=>updateNested('security','maxLoginAttempts',Math.min(20,Math.max(3,Number(e.target.value)||3)))} className={inputClass}/></Field></div><div className="mt-5 border-t border-slate-100 pt-1"><Toggle label="Require strong passwords" description="Require users to maintain stronger password requirements." checked={settings.security.requireStrongPasswords} onChange={(v)=>updateNested('security','requireStrongPasswords',v)}/></div><div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4"><AlertCircle size={17} className="mt-0.5 shrink-0 text-amber-600"/><div><p className="text-xs font-extrabold text-amber-800">Security reminder</p><p className="mt-1 text-[10px] leading-5 text-amber-700">These settings can affect users across the HMO organization. Review them carefully before saving.</p></div></div></SettingsCard>}

          <div className="flex flex-col gap-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-extrabold text-slate-800">{hasChanges ? 'You have unsaved changes' : 'All settings are saved'}</p><p className="mt-1 text-[10px] text-slate-400">Settings apply to your HMO organization.</p></div><div className="flex gap-2">{hasChanges && <button type="button" onClick={discard} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-[10px] font-extrabold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RotateCcw size={14}/> Discard</button>}<button type="submit" disabled={!hasChanges || saving} className="inline-flex items-center gap-2 rounded-2xl bg-[#1b7b68] px-5 py-2.5 text-[10px] font-extrabold text-white hover:opacity-95 disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} {saving ? 'Saving...' : 'Save Settings'}</button></div></div>
        </form></main>
      </div>
    </div>
  );
}
