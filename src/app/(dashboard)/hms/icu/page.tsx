'use client';

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  HeartPulse,
  Loader2,
  MessageSquare,
  MonitorSmartphone,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Stethoscope,
  Thermometer,
  UserRound,
  Users,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ComponentType, type FormEvent, type ReactNode } from 'react';

const RAW_API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://medxverse-backend.onrender.com/api/v1';
const API_BASE_URL = /\/api\/v1$/i.test(RAW_API_URL.replace(/\/$/, ''))
  ? RAW_API_URL.replace(/\/$/, '')
  : `${RAW_API_URL.replace(/\/$/, '')}/api/v1`;

const ICU_BASE = '/icu';

const inputClass =
  'mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-[#1b7b68] focus:ring-4 focus:ring-[#1b7b68]/10';
const selectClass = `${inputClass} appearance-none pr-8`;
const textareaClass =
  'mt-1 min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium leading-5 text-slate-700 outline-none transition focus:border-[#1b7b68] focus:ring-4 focus:ring-[#1b7b68]/10';

interface PatientRef {
  _id?: string;
  universalPatientId?: string;
  firstName?: string;
  lastName?: string;
  mrn?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  phone?: string;
}
interface StaffRef { _id?: string; firstName?: string; lastName?: string; role?: string; email?: string; staffId?: string }
interface WardRef { _id?: string; name?: string; code?: string; department?: string; }

interface ICUAdmission {
  _id: string;
  hospitalId: string;
  patientId: string | PatientRef;
  wardId?: string | { _id?: string; name?: string; code?: string };
  bedNumber: string;
  careLevel: string;
  primaryDiagnosis: string;
  attendingPhysicianId?: string | StaffRef;
  admittedById?: string | StaffRef;
  status: string;
  admittedAt: string;
  dischargedAt?: string;
  dispositionNotes?: string;
  vitals?: Record<string, unknown>;
  ventilatorSettings?: Record<string, unknown>;
}
interface DeviceMeasurement { parameter: string; value: number | string | boolean; unit?: string }
interface DeviceReading {
  _id: string;
  deviceId: string;
  deviceType?: string;
  protocol?: string;
  manufacturer?: string;
  model?: string;
  recordedAt: string;
  quality: string;
  measurements: DeviceMeasurement[];
}
interface FlowsheetEntry {
  _id: string;
  recordedAt: string;
  category: string;
  parameter: string;
  value: number | string | boolean;
  unit?: string;
  source: string;
  status: string;
  annotation?: string;
}
interface ScoreComponent { name: string; value?: number; points?: number; unit?: string; source?: string; missing?: boolean }
interface ICUScore {
  _id: string;
  scoreType: string;
  score: number;
  status: string;
  calculatedAt: string;
  components: ScoreComponent[];
  calculationVersion?: string;
}
interface FamilyCommunication {
  _id: string;
  communicatedAt?: string;
  createdAt?: string;
  contactName: string;
  relationship?: string;
  contactMethod: string;
  topics?: string[];
  summary: string;
  questionsOrConcerns?: string;
  followUpRequired?: boolean;
  followUpPlan?: string;
  communicatedById?: string | StaffRef;
}
interface Dashboard {
  admission: ICUAdmission;
  latestReadings: DeviceReading[];
  recentFlowsheet: FlowsheetEntry[];
  latestScores: Array<ICUScore | string>;
  familyCommunications: FamilyCommunication[];
}
interface ApiResult<T> { success?: boolean; data?: T; message?: string; error?: string }

type Tab = 'overview' | 'monitoring' | 'flowsheet' | 'scores' | 'family';

function idOf(value: unknown) { return value ? String(value) : ''; }
function isICUScore(value: ICUScore | string): value is ICUScore {
  return typeof value === 'object' && value !== null && 'score' in value && 'status' in value;
}

function scoreRecords(scores: Array<ICUScore | string> | undefined): ICUScore[] {
  return (scores || []).filter(isICUScore);
}

function patientName(patient: ICUAdmission['patientId']) {
  if (typeof patient === 'string') return `Patient ${patient}`;
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown patient';
}
function staffName(staff?: string | StaffRef) {
  if (!staff) return '—';
  if (typeof staff === 'string') return staff;
  return `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || staff.role || '—';
}
function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}
function formatDateTime(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
}
function label(value: string) { return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()); }
function ageFromDob(value?: string) {
  if (!value) return '—';
  const dob = new Date(value); if (Number.isNaN(dob.getTime())) return '—';
  const now = new Date(); let age = now.getFullYear() - dob.getFullYear();
  if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) age--;
  return `${Math.max(0, age)}y`;
}
function statusClass(status: string) {
  if (status === 'ADMITTED') return 'bg-blue-50 text-blue-700 border-blue-100';
  if (status === 'STABILIZED') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (status === 'DECEASED') return 'bg-slate-100 text-slate-700 border-slate-200';
  return 'bg-amber-50 text-amber-700 border-amber-100';
}
function patientVitals(vitals?: Record<string, unknown>, flowsheet?: FlowsheetEntry[]) {
  const source = vitals || {};
  const numeric = (...values: unknown[]) => {
    for (const value of values) {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
    }
    return undefined;
  };
  const latest = (names: string[]) => {
    for (const entry of flowsheet || []) {
      const parameter = String(entry.parameter || '').trim().toLowerCase();
      if (names.some(name => parameter === name.toLowerCase())) return numeric(entry.value);
    }
    return undefined;
  };

  const heartRate = numeric(source.heartRateBpm, source.heartRate, source.heartrate, source.pulse) ?? latest(['Heart rate', 'Heartrate', 'heartRateBpm']);
  const systolic = numeric(source.systolicBpMmHg, source.systolicBp, source.bloodPressure, source.bloodpressure, source.bp) ?? latest(['Systolic BP', 'Bloodpressure', 'bloodPressure', 'systolicBpMmHg']);
  const diastolic = numeric(source.diastolicBpMmHg, source.diastolicBp) ?? latest(['Diastolic BP', 'diastolicBpMmHg']);
  const spo2 = numeric(source.oxygenSaturationPct, source.spo2, source.SpO2, source.oxygenSaturation) ?? latest(['SpO2', 'Spo2', 'oxygenSaturationPct']);
  const temperature = numeric(source.temperatureCelsius, source.temperature, source.temp) ?? latest(['Temperature', 'temperatureCelsius']);
  const respiratoryRate = numeric(source.respiratoryRateBpm, source.respiratoryRate, source.respiratoryrate, source.respRate) ?? latest(['Respiratory rate', 'Respiratoryrate', 'respiratoryRateBpm']);
  const gcs = numeric(source.glasgowComaScale, source.gcs, source.Gcs) ?? latest(['GCS', 'Gcs', 'glasgowComaScale']);
  const map = numeric(source.meanArterialPressureMmHg, source.map, source.meanArterialPressure) ?? latest(['MAP', 'meanArterialPressureMmHg']);

  const bloodPressure = systolic !== undefined
    ? diastolic !== undefined ? `${systolic}/${diastolic}` : String(systolic)
    : undefined;

  return [
    ['Heart rate', heartRate, 'bpm', HeartPulse],
    ['Blood pressure', bloodPressure, 'mmHg', Activity],
    ['SpO₂', spo2, '%', Zap],
    ['Temperature', temperature, '°C', Thermometer],
    ['Respiratory rate', respiratoryRate, '/min', Wind],
    ['GCS', gcs, 'score', Stethoscope],
  ] as const;
}

function Modal({ open, title, description, onClose, children }: { open: boolean; title: string; description?: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-80 flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-4xl bg-white shadow-2xl sm:rounded-4xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5">
          <div><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#1b7b68]">ICU workflow</p><h2 className="mt-1 text-xl font-black text-slate-800">{title}</h2>{description && <p className="mt-1 text-xs text-slate-400">{description}</p>}</div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-50"><X size={18}/></button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export default function ICUPage() {
  const [admissions, setAdmissions] = useState<ICUAdmission[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<'admission' | 'vitals' | 'ventilator' | 'status' | 'family' | null>(null);

  const [admissionForm, setAdmissionForm] = useState({ patientId: '', wardId: '', bedNumber: '', careLevel: 'LEVEL_1_ICU', primaryDiagnosis: '', admissionReason: '', attendingPhysicianId: '', encounterId: '' });
  const [wardResults, setWardResults] = useState<WardRef[]>([]);
  const [selectedWard, setSelectedWard] = useState<WardRef | null>(null);
  const [wardSearch, setWardSearch] = useState('');
  const [searchingWards, setSearchingWards] = useState(false);
  const [showWardResults, setShowWardResults] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<PatientRef[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRef | null>(null);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [showPatientResults, setShowPatientResults] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [staffResults, setStaffResults] = useState<StaffRef[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffRef | null>(null);
  const [searchingStaff, setSearchingStaff] = useState(false);
  const [showStaffResults, setShowStaffResults] = useState(false);
  const [vitalsForm, setVitalsForm] = useState<Record<string, string>>({ heartRate: '', bloodPressure: '', spo2: '', temperature: '', respiratoryRate: '', gcs: '' });
  const [ventilatorForm, setVentilatorForm] = useState<Record<string, string>>({ mode: '', fio2: '', peep: '', tidalVolume: '', respiratoryRate: '', pressureSupport: '' });
  const [statusForm, setStatusForm] = useState({ status: 'STABILIZED', dispositionNotes: '' });
  const [familyForm, setFamilyForm] = useState({ contactName: '', relationship: '', contactMethod: 'PHONE', topics: '', summary: '', questionsOrConcerns: '', followUpRequired: false, followUpPlan: '' });

  const api = useCallback(async <T,>(path: string, options: RequestInit = {}) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } });
    const payload = await response.json().catch(() => ({})) as ApiResult<T> & { message?: string; error?: string };
    if (!response.ok || payload.success === false) throw new Error(payload.message || payload.error || `Request failed (${response.status})`);
    return payload as T;
  }, []);

  const searchPatients = useCallback(async (query: string) => {
    const term = query.trim();
    if (term.length < 2) {
      setPatientResults([]);
      setShowPatientResults(false);
      return;
    }

    setSearchingPatients(true);
    try {
      const params = new URLSearchParams({ search: term, page: '1', limit: '8' });
      const raw = await api<unknown>(`/patients?${params.toString()}`);
      const payload = (raw as { data?: unknown })?.data ?? raw;
      const rows = Array.isArray(payload)
        ? payload
        : (payload as { patients?: unknown[]; items?: unknown[]; results?: unknown[] } | null)?.patients
          ?? (payload as { items?: unknown[] } | null)?.items
          ?? (payload as { results?: unknown[] } | null)?.results
          ?? [];
      setPatientResults(Array.isArray(rows) ? rows as PatientRef[] : []);
      setShowPatientResults(true);
    } catch (err) {
      console.error('Failed to search ICU patients:', err);
      setPatientResults([]);
      setShowPatientResults(false);
    } finally {
      setSearchingPatients(false);
    }
  }, [api]);

  const searchStaff = useCallback(async (query: string) => {
    const term = query.trim();
    if (term.length < 2) {
      setStaffResults([]);
      setShowStaffResults(false);
      return;
    }

    setSearchingStaff(true);
    try {
      const params = new URLSearchParams({ isActive: 'true', role: 'DOCTOR', search: term, page: '1', limit: '8' });
      const raw = await api<unknown>(`/staff?${params.toString()}`);
      const payload = (raw as { data?: unknown })?.data ?? raw;
      const rows = Array.isArray(payload)
        ? payload
        : (payload as { staff?: unknown[]; items?: unknown[]; results?: unknown[] } | null)?.staff
          ?? (payload as { items?: unknown[] } | null)?.items
          ?? (payload as { results?: unknown[] } | null)?.results
          ?? [];
      setStaffResults(Array.isArray(rows) ? rows as StaffRef[] : []);
      setShowStaffResults(true);
    } catch (err) {
      console.error('Failed to search ICU staff:', err);
      setStaffResults([]);
      setShowStaffResults(false);
    } finally {
      setSearchingStaff(false);
    }
  }, [api]);

  const searchWards = useCallback(async (query: string) => {
    const term = query.trim();
    if (term.length < 1) { setWardResults([]); setShowWardResults(false); return; }
    setSearchingWards(true);
    try {
      const params = new URLSearchParams({ search: term, page: '1', limit: '20' });
      const raw = await api<unknown>(`/bed-ward/wards?${params.toString()}`);
      const payload = (raw as { data?: unknown })?.data ?? raw;
      const rows = Array.isArray(payload) ? payload : (payload as { wards?: unknown[]; items?: unknown[]; results?: unknown[] } | null)?.wards ?? (payload as { items?: unknown[] } | null)?.items ?? (payload as { results?: unknown[] } | null)?.results ?? [];
      setWardResults(Array.isArray(rows) ? rows as WardRef[] : []);
      setShowWardResults(true);
    } catch (err) {
      console.error('Failed to search ICU wards:', err);
      setWardResults([]); setShowWardResults(false);
    } finally { setSearchingWards(false); }
  }, [api]);

  useEffect(() => {
    if (modal !== 'admission' || selectedWard || wardSearch.trim().length < 1) {
      setWardResults([]); setShowWardResults(false); return;
    }
    const timer = window.setTimeout(() => void searchWards(wardSearch), 250);
    return () => window.clearTimeout(timer);
  }, [modal, wardSearch, selectedWard, searchWards]);

  useEffect(() => {
    if (modal !== 'admission' || selectedPatient || patientSearch.trim().length < 2) {
      setPatientResults([]);
      setShowPatientResults(false);
      return;
    }
    const timer = window.setTimeout(() => void searchPatients(patientSearch), 300);
    return () => window.clearTimeout(timer);
  }, [modal, patientSearch, selectedPatient, searchPatients]);

  useEffect(() => {
    if (modal !== 'admission' || selectedStaff || staffSearch.trim().length < 2) {
      setStaffResults([]);
      setShowStaffResults(false);
      return;
    }
    const timer = window.setTimeout(() => void searchStaff(staffSearch), 300);
    return () => window.clearTimeout(timer);
  }, [modal, staffSearch, selectedStaff, searchStaff]);

  const resetAdmissionSearch = useCallback(() => {
    setPatientSearch('');
    setPatientResults([]);
    setSelectedPatient(null);
    setShowPatientResults(false);
    setStaffSearch('');
    setStaffResults([]);
    setSelectedStaff(null);
    setShowStaffResults(false);
    setWardSearch('');
    setWardResults([]);
    setSelectedWard(null);
    setShowWardResults(false);
  }, []);

  const loadAdmissions = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const raw = await api<{ admissions: ICUAdmission[] } | ApiResult<{ admissions: ICUAdmission[] }>>(`${ICU_BASE}/admissions?page=1&limit=100`);
      const response = ('data' in raw && raw.data ? raw.data : raw) as { admissions: ICUAdmission[] };
      const items = response.admissions || [];
      setAdmissions(items);
      setSelectedId(current => current && items.some(item => item._id === current) ? current : items[0]?._id || '');
      setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load ICU admissions.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [api]);

  const loadDashboard = useCallback(async (admissionId: string) => {
    if (!admissionId) { setDashboard(null); return; }
    try {
      const raw = await api<Dashboard | ApiResult<Dashboard>>(`${ICU_BASE}/admissions/${admissionId}/dashboard`);
      const response = ('data' in raw && raw.data ? raw.data : raw) as Dashboard;
      setDashboard(response?.admission ? response : null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load ICU dashboard.'); }
  }, [api]);

  useEffect(() => { void loadAdmissions(); }, [loadAdmissions]);
  useEffect(() => { void loadDashboard(selectedId); }, [selectedId, loadDashboard]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(null), 3500); return () => window.clearTimeout(timer); }, [toast]);

  const filteredAdmissions = useMemo(() => admissions.filter(item => {
    const term = search.trim().toLowerCase();
    const name = patientName(item.patientId).toLowerCase();
    const mrn = typeof item.patientId === 'object' ? (item.patientId.mrn || '').toLowerCase() : '';
    return (!term || name.includes(term) || mrn.includes(term) || item.bedNumber.toLowerCase().includes(term) || item.primaryDiagnosis.toLowerCase().includes(term)) && (statusFilter === 'ALL' || item.status === statusFilter);
  }), [admissions, search, statusFilter]);

  const selected = dashboard?.admission || admissions.find(item => item._id === selectedId) || null;
  const activeCount = admissions.filter(item => ['ADMITTED', 'STABILIZED'].includes(item.status)).length;
  const criticalCount = admissions.filter(item => item.careLevel === 'LEVEL_1_ICU' && ['ADMITTED', 'STABILIZED'].includes(item.status)).length;
  const pendingReviews = dashboard?.recentFlowsheet.filter(item => item.status === 'PENDING_REVIEW').length || 0;
  const normalizedScores = useMemo(() => scoreRecords(dashboard?.latestScores), [dashboard?.latestScores]);
  const latestSOFA = normalizedScores.find(item => item.scoreType === 'SOFA');
  const latestApache = normalizedScores.find(item => item.scoreType === 'APACHE_II');

  const refresh = async () => { await loadAdmissions(true); if (selectedId) await loadDashboard(selectedId); };
  const runAction = async (request: () => Promise<void>, success: string) => {
    setWorking(true);
    try { await request(); setToast(success); setModal(null); await loadAdmissions(true); if (selectedId) await loadDashboard(selectedId); }
    catch (err) { setToast(err instanceof Error ? err.message : 'Action failed.'); }
    finally { setWorking(false); }
  };

  const submitVitals = async (event: FormEvent) => {
    event.preventDefault(); if (!selected) return;
    const vitals = Object.fromEntries(Object.entries(vitalsForm).filter(([, v]) => v.trim() !== '').map(([k, v]) => [k, Number(v)]));
    await runAction(() => api(`${ICU_BASE}/admissions/${selected._id}/vitals`, { method: 'PATCH', body: JSON.stringify({ vitals }) }).then(() => undefined), 'ICU vitals updated.');
  };
  const submitVentilator = async (event: FormEvent) => {
    event.preventDefault(); if (!selected) return;
    const ventilatorSettings = Object.fromEntries(Object.entries(ventilatorForm).filter(([, v]) => v.trim() !== '').map(([k, v]) => [k, ['mode'].includes(k) ? v : Number(v)]));
    await runAction(() => api(`${ICU_BASE}/admissions/${selected._id}/ventilator`, { method: 'PATCH', body: JSON.stringify({ ventilatorSettings }) }).then(() => undefined), 'Ventilator settings updated.');
  };
  const submitStatus = async (event: FormEvent) => {
    event.preventDefault(); if (!selected) return;
    await runAction(() => api(`${ICU_BASE}/admissions/${selected._id}/status`, { method: 'PATCH', body: JSON.stringify(statusForm) }).then(() => undefined), `ICU status changed to ${label(statusForm.status)}.`);
  };
  const submitFamily = async (event: FormEvent) => {
    event.preventDefault(); if (!selected) return;
    await runAction(() => api(`${ICU_BASE}/family-communications`, { method: 'POST', body: JSON.stringify({ admissionId: selected._id, ...familyForm, topics: familyForm.topics.split(',').map(v => v.trim()).filter(Boolean) }) }).then(() => undefined), 'Family communication recorded.');
  };
  const recalculate = async () => {
    if (!selected) return;
    await runAction(() => api(`${ICU_BASE}/scores/recalculate-underlying/${selected._id}`, { method: 'POST' }).then(() => undefined), 'SOFA and APACHE II recalculated from underlying data.');
  };
  const confirmFlow = async (entryId: string) => {
    await runAction(() => api(`${ICU_BASE}/flowsheet/${entryId}/confirm`, { method: 'PATCH', body: JSON.stringify({}) }).then(() => undefined), 'Flowsheet entry confirmed.');
  };

  const openVitals = () => {
    const v = selected?.vitals || {};
    setVitalsForm({ heartRate: String(v.heartRate ?? v.pulse ?? ''), bloodPressure: String(v.bloodPressure ?? v.bp ?? ''), spo2: String(v.spo2 ?? v.oxygenSaturation ?? ''), temperature: String(v.temperature ?? v.temp ?? ''), respiratoryRate: String(v.respiratoryRate ?? v.respRate ?? ''), gcs: String(v.gcs ?? '') });
    setModal('vitals');
  };
  const openVentilator = () => {
    const v = selected?.ventilatorSettings || {};
    setVentilatorForm({ mode: String(v.mode ?? ''), fio2: String(v.fio2 ?? ''), peep: String(v.peep ?? ''), tidalVolume: String(v.tidalVolume ?? ''), respiratoryRate: String(v.respiratoryRate ?? ''), pressureSupport: String(v.pressureSupport ?? '') });
    setModal('ventilator');
  };

  return (
    <div className="min-h-full space-y-5 font-sans text-slate-800 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1b7b68] text-white shadow-sm"><Activity size={22}/></div><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-black tracking-tight">ICU Command Center</h1><span className="rounded-full bg-[#e8f5f3] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-[#1b7b68]">Critical care</span></div><p className="mt-1 text-xs text-slate-400">Patient surveillance, device telemetry, flowsheets, severity scoring and family communication.</p></div></div>
        <div className="flex flex-wrap gap-2"><button onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''}/> Refresh</button><button onClick={() => { resetAdmissionSearch(); setAdmissionForm({ patientId: '', wardId: '', bedNumber: '', careLevel: 'LEVEL_1_ICU', primaryDiagnosis: '', admissionReason: '', attendingPhysicianId: '', encounterId: '' }); setModal('admission'); }} className="inline-flex items-center gap-2 rounded-2xl bg-[#1b7b68] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm"><Plus size={15}/> New ICU admission</button></div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {([
          { name: 'Active admissions', value: activeCount, icon: Users, color: 'text-blue-600' },
          { name: 'Level 1 care', value: criticalCount, icon: ShieldAlert, color: 'text-rose-600' },
          { name: 'Pending reviews', value: pendingReviews, icon: Clock3, color: 'text-amber-600' },
          { name: 'Device readings', value: dashboard?.latestReadings.length ?? '—', icon: MonitorSmartphone, color: 'text-[#1b7b68]' },
        ] as Array<{ name: string; value: number | string; icon: ComponentType<{ size?: number; className?: string }>; color: string }>).map(({ name, value, icon: Icon, color }) => (
          <div key={name} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-400">{name}</span>
              <Icon size={17} className={color} />
            </div>
            <p className="mt-2 text-2xl font-black">{String(value)}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-3 shadow-sm"><div className="flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient, MRN, bed or diagnosis..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#1b7b68] focus:bg-white"/></div><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 outline-none"><option value="ALL">All statuses</option><option value="ADMITTED">Admitted</option><option value="STABILIZED">Stabilized</option><option value="TRANSFERRED_OUT">Transferred out</option><option value="DISCHARGED">Discharged</option><option value="DECEASED">Deceased</option></select></div></div>

      {error && <div className="flex items-center gap-3 rounded-3xl border border-rose-100 bg-rose-50 p-4 text-xs font-semibold text-rose-700"><AlertTriangle size={17}/><span>{error}</span><button onClick={() => void loadAdmissions()} className="ml-auto underline">Retry</button></div>}

      {loading ? <div className="flex min-h-80 items-center justify-center rounded-3xl border border-slate-100 bg-white"><div className="text-center"><Loader2 size={28} className="mx-auto animate-spin text-[#1b7b68]"/><p className="mt-3 text-xs font-semibold text-slate-400">Loading ICU command center…</p></div></div> : <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-xs font-black">ICU census</h2><p className="mt-0.5 text-[9px] text-slate-400">Select a patient to open the chart</p></div><span className="rounded-full bg-[#e8f5f3] px-2 py-1 text-[9px] font-black text-[#1b7b68]">{filteredAdmissions.length}</span></div><div className="mt-3 space-y-2">{filteredAdmissions.map(item => <button key={item._id} onClick={() => { setSelectedId(item._id); setTab('overview'); }} className={`w-full rounded-2xl border p-3 text-left transition ${selectedId === item._id ? 'border-[#1b7b68]/30 bg-[#e8f5f3]/60 shadow-sm' : 'border-slate-100 bg-slate-50 hover:bg-white'}`}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-black">{patientName(item.patientId)}</p><p className="mt-1 text-[9px] font-semibold text-slate-400">Bed {item.bedNumber} · {item.careLevel}</p></div><span className={`rounded-full border px-2 py-1 text-[8px] font-extrabold ${statusClass(item.status)}`}>{label(item.status)}</span></div><p className="mt-2 truncate text-[9px] font-semibold text-slate-500">{item.primaryDiagnosis}</p></button>)}{!filteredAdmissions.length && <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center"><Stethoscope size={22} className="mx-auto text-slate-300"/><p className="mt-2 text-xs font-bold text-slate-500">No ICU admissions found.</p></div>}</div></section>

        {!selected ? <section className="flex min-h-80 items-center justify-center rounded-3xl border border-slate-100 bg-white shadow-sm"><div className="text-center"><Activity size={32} className="mx-auto text-slate-200"/><p className="mt-3 text-sm font-black text-slate-500">Select an ICU patient</p><p className="mt-1 text-xs text-slate-400">The patient-specific critical care dashboard will appear here.</p></div></section> : <section className="min-w-0 rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="flex items-start gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]"><UserRound size={22}/></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black">{patientName(selected.patientId)}</h2><span className={`rounded-full border px-2.5 py-1 text-[9px] font-extrabold ${statusClass(selected.status)}`}>{label(selected.status)}</span></div><p className="mt-1 text-xs text-slate-400">Bed {selected.bedNumber} · {label(selected.careLevel)} · admitted {formatDateTime(selected.admittedAt)}</p><p className="mt-1 max-w-2xl text-xs font-semibold text-slate-600">{selected.primaryDiagnosis}</p></div></div><div className="flex flex-wrap gap-2"><button onClick={openVitals} className="rounded-2xl bg-[#1b7b68]/5 px-3 py-2 text-[10px] font-extrabold text-[#1b7b68]">Update vitals</button><button onClick={openVentilator} className="rounded-2xl border border-slate-200 px-3 py-2 text-[10px] font-extrabold text-slate-600">Ventilator</button><button onClick={() => { setStatusForm({ status: selected.status === 'ADMITTED' ? 'STABILIZED' : 'DISCHARGED', dispositionNotes: '' }); setModal('status'); }} className="rounded-2xl border border-slate-200 px-3 py-2 text-[10px] font-extrabold text-slate-600">Status</button></div></div>
            <div className="mt-4 flex gap-1 overflow-x-auto rounded-2xl bg-slate-50 p-1">{([['overview','Overview'],['monitoring','Monitoring'],['flowsheet','Flowsheet'],['scores','Scores'],['family','Family communication']] as const).map(([key, text]) => <button key={key} onClick={() => setTab(key)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-[10px] font-extrabold ${tab === key ? 'bg-white text-[#1b7b68] shadow-sm' : 'text-slate-400'}`}>{text}</button>)}</div></div>

          <div className="p-5">
            {tab === 'overview' && <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{patientVitals(selected.vitals, dashboard?.recentFlowsheet).map(([name, value, unit, Icon]) => <div key={name} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center justify-between"><span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">{name}</span><Icon size={15} className="text-[#1b7b68]"/></div><p className="mt-2 text-xl font-black">{value !== undefined && value !== null && value !== '' ? String(value) : '—'} <span className="text-[10px] font-bold text-slate-400">{unit}</span></p></div>)}</div><div className="grid gap-4 lg:grid-cols-2"><div className="rounded-3xl border border-slate-100 p-4"><div className="flex items-center justify-between"><div><h3 className="text-xs font-black">Severity snapshot</h3><p className="mt-0.5 text-[9px] text-slate-400">Latest stored clinical scores</p></div><ShieldAlert size={17} className="text-[#1b7b68]"/></div><div className="mt-4 grid grid-cols-2 gap-3">{([['SOFA', latestSOFA], ['APACHE II', latestApache]] as Array<[string, ICUScore | undefined]>).map(([name, score]) => <div key={name} className="rounded-2xl bg-slate-50 p-3"><p className="text-[9px] font-extrabold text-slate-400">{name}</p><p className="mt-1 text-2xl font-black">{score?.score ?? '—'}</p><span className="text-[9px] font-bold text-slate-500">{score ? label(score.status) : 'Not calculated'}</span></div>)}</div><button onClick={() => void recalculate()} disabled={working} className="mt-3 w-full rounded-2xl bg-[#1b7b68] py-2.5 text-[10px] font-extrabold text-white">{working ? 'Recalculating…' : 'Recalculate from underlying data'}</button></div><div className="rounded-3xl border border-slate-100 p-4"><div className="flex items-center justify-between"><div><h3 className="text-xs font-black">Patient context</h3><p className="mt-0.5 text-[9px] text-slate-400">Identity and care-team details</p></div><Users size={17} className="text-[#1b7b68]"/></div><div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><span className="text-[9px] font-semibold text-slate-400">MRN</span><p className="mt-1 font-black">{typeof selected.patientId === 'object' ? selected.patientId.mrn || '—' : '—'}</p></div><div><span className="text-[9px] font-semibold text-slate-400">Age</span><p className="mt-1 font-black">{typeof selected.patientId === 'object' ? ageFromDob(selected.patientId.dateOfBirth) : '—'}</p></div><div><span className="text-[9px] font-semibold text-slate-400">Blood group</span><p className="mt-1 font-black">{typeof selected.patientId === 'object' ? selected.patientId.bloodGroup || '—' : '—'}</p></div><div><span className="text-[9px] font-semibold text-slate-400">Attending</span><p className="mt-1 truncate font-black">{staffName(selected.attendingPhysicianId)}</p></div></div></div></div></div>}

            {tab === 'monitoring' && <div className="space-y-4">
              <div className="rounded-3xl border border-slate-100 p-4">
                <div className="flex items-center justify-between"><div><h3 className="text-xs font-black">Ventilator</h3><p className="mt-0.5 text-[9px] text-slate-400">Current ventilator settings recorded for this ICU admission</p></div><Wind size={17} className="text-[#1b7b68]"/></div>
                {selected.ventilatorSettings && Object.keys(selected.ventilatorSettings).length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(selected.ventilatorSettings).map(([key, value]) => <div key={key} className="rounded-2xl bg-slate-50 p-3"><p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">{label(key)}</p><p className="mt-1 text-lg font-black">{value === null || value === undefined || value === '' ? '—' : String(value)}</p></div>)}</div> : <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs font-semibold text-slate-400">No ventilator settings recorded for this admission.</div>}
              </div>
              <div className="flex items-center justify-between"><div><h3 className="text-xs font-black">Device telemetry</h3><p className="mt-0.5 text-[9px] text-slate-400">Latest normalized readings from connected ICU devices</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-extrabold text-emerald-700">{dashboard?.latestReadings.length || 0} readings</span></div><div className="overflow-x-auto rounded-2xl border border-slate-100"><table className="w-full min-w-190 text-left"><thead><tr className="border-b border-slate-100 bg-slate-50 text-[9px] font-extrabold uppercase tracking-wider text-slate-400"><th className="px-4 py-3">Time</th><th className="px-4 py-3">Device</th><th className="px-4 py-3">Protocol</th><th className="px-4 py-3">Measurements</th><th className="px-4 py-3">Quality</th></tr></thead><tbody className="divide-y divide-slate-100">{dashboard?.latestReadings.map(reading => <tr key={reading._id} className="hover:bg-slate-50/60"><td className="px-4 py-3 text-[10px] text-slate-500">{formatDateTime(reading.recordedAt)}</td><td className="px-4 py-3"><p className="text-[10px] font-black">{reading.deviceId}</p><p className="text-[9px] text-slate-400">{reading.deviceType || 'Device'}</p></td><td className="px-4 py-3 text-[10px] font-semibold text-slate-500">{reading.protocol || '—'}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-1.5">{reading.measurements.map((m, i) => <span key={`${m.parameter}-${i}`} className="rounded-full bg-[#e8f5f3] px-2 py-1 text-[9px] font-bold text-[#1b7b68]">{label(m.parameter)}: {String(m.value)}{m.unit ? ` ${m.unit}` : ''}</span>)}</div></td><td className="px-4 py-3 text-[9px] font-extrabold">{label(reading.quality)}</td></tr>)}</tbody></table></div>{!dashboard?.latestReadings.length && <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-xs font-semibold text-slate-400">No device readings recorded for this admission.</div>}</div>}

            {tab === 'flowsheet' && <div className="space-y-4"><div className="flex items-center justify-between"><div><h3 className="text-xs font-black">Nurse flowsheet</h3><p className="mt-0.5 text-[9px] text-slate-400">Manual and device-generated observations with review status</p></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-extrabold text-amber-700">{pendingReviews} pending review</span></div><div className="overflow-x-auto rounded-2xl border border-slate-100"><table className="w-full min-w-190 text-left"><thead><tr className="border-b border-slate-100 bg-slate-50 text-[9px] font-extrabold uppercase tracking-wider text-slate-400"><th className="px-4 py-3">Recorded</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Parameter</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"/></tr></thead><tbody className="divide-y divide-slate-100">{dashboard?.recentFlowsheet.map(entry => <tr key={entry._id}><td className="px-4 py-3 text-[10px] text-slate-500">{formatDateTime(entry.recordedAt)}</td><td className="px-4 py-3 text-[9px] font-extrabold text-[#1b7b68]">{label(entry.category)}</td><td className="px-4 py-3 text-[10px] font-black">{label(entry.parameter)}</td><td className="px-4 py-3 text-[10px] font-bold">{String(entry.value)} {entry.unit || ''}</td><td className="px-4 py-3 text-[9px] font-semibold text-slate-400">{label(entry.source)}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[8px] font-extrabold ${entry.status === 'PENDING_REVIEW' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{label(entry.status)}</span></td><td className="px-4 py-3 text-right">{entry.status === 'PENDING_REVIEW' && <button onClick={() => void confirmFlow(entry._id)} disabled={working} className="rounded-xl bg-[#1b7b68] px-2.5 py-1.5 text-[9px] font-extrabold text-white">Confirm</button>}</td></tr>)}</tbody></table></div>{!dashboard?.recentFlowsheet.length && <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-xs font-semibold text-slate-400">No flowsheet entries recorded.</div>}</div>}

            {tab === 'scores' && <div className="space-y-4"><div className="flex items-center justify-between"><div><h3 className="text-xs font-black">Clinical severity scoring</h3><p className="mt-0.5 text-[9px] text-slate-400">Versioned, auditable SOFA and APACHE II calculations</p></div><button onClick={() => void recalculate()} disabled={working} className="inline-flex items-center gap-2 rounded-2xl bg-[#1b7b68] px-3 py-2 text-[10px] font-extrabold text-white"><RefreshCw size={13}/> Recalculate</button></div><div className="grid gap-4 lg:grid-cols-2">{normalizedScores.filter((score, index, arr) => arr.findIndex(s => s.scoreType === score.scoreType) === index).map(score => <div key={score._id} className="rounded-3xl border border-slate-100 p-4"><div className="flex items-start justify-between"><div><p className="text-[9px] font-extrabold uppercase tracking-wider text-[#1b7b68]">{label(score.scoreType)}</p><p className="mt-1 text-3xl font-black">{score.score}</p></div><span className={`rounded-full px-2.5 py-1 text-[9px] font-extrabold ${score.status === 'COMPLETE' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{label(score.status)}</span></div><p className="mt-1 text-[9px] text-slate-400">Calculated {formatDateTime(score.calculatedAt)} · v{score.calculationVersion || '1.0.0'}</p><div className="mt-4 space-y-1.5">{score.components.map(component => <div key={component.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span className="text-[9px] font-semibold text-slate-500">{label(component.name)}</span><span className="text-[9px] font-black">{component.points ?? '—'} pts {component.missing ? '· missing' : ''}</span></div>)}</div></div>)}{!dashboard?.latestScores.length && <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-xs font-semibold text-slate-400 lg:col-span-2">No scores stored yet. Recalculate to generate an auditable result.</div>}</div></div>}

            {tab === 'family' && <div className="space-y-4"><div className="flex items-center justify-between"><div><h3 className="text-xs font-black">Family communication log</h3><p className="mt-0.5 text-[9px] text-slate-400">Document updates, concerns, follow-up and contact method</p></div><button onClick={() => setModal('family')} className="inline-flex items-center gap-2 rounded-2xl bg-[#1b7b68] px-3 py-2 text-[10px] font-extrabold text-white"><MessageSquare size={13}/> Record communication</button></div><div className="space-y-3">{dashboard?.familyCommunications.map(item => <div key={item._id} className="rounded-3xl border border-slate-100 p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-black">{item.contactName}</p><p className="mt-1 text-[9px] font-semibold text-slate-400">{item.relationship || 'Family contact'} · {label(item.contactMethod)} · {formatDateTime(item.communicatedAt || item.createdAt)}</p></div>{item.followUpRequired && <span className="rounded-full bg-amber-50 px-2 py-1 text-[8px] font-extrabold text-amber-700">Follow-up required</span>}</div><p className="mt-3 text-xs leading-5 text-slate-600">{item.summary}</p>{item.topics?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{item.topics.map(topic => <span key={topic} className="rounded-full bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-500">{topic}</span>)}</div> : null}{item.questionsOrConcerns && <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-[10px] font-semibold text-amber-800">Concerns: {item.questionsOrConcerns}</p>}</div>)}{!dashboard?.familyCommunications.length && <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-xs font-semibold text-slate-400">No family communications recorded for this admission.</div>}</div></div>}
          </div>
        </section>}
      </div>}

      <Modal open={modal === 'vitals'} title="Update ICU vitals" description="Manual vital-sign entry also creates auditable flowsheet entries." onClose={() => setModal(null)}><form onSubmit={submitVitals} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[['heartRate','Heart rate'],['bloodPressure','Blood pressure'],['spo2','SpO₂'],['temperature','Temperature'],['respiratoryRate','Respiratory rate'],['gcs','GCS']].map(([key, name]) => <label key={key} className="text-[10px] font-extrabold text-slate-600">{name}<input type="number" value={vitalsForm[key]} onChange={e => setVitalsForm({ ...vitalsForm, [key]: e.target.value })} className={inputClass}/></label>)}</div><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setModal(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Cancel</button><button disabled={working} className="rounded-xl bg-[#1b7b68] px-5 py-2 text-xs font-extrabold text-white">{working ? 'Saving…' : 'Save vitals'}</button></div></form></Modal>

      <Modal open={modal === 'ventilator'} title="Ventilator settings" description="Update the current ventilator configuration for this ICU admission." onClose={() => setModal(null)}><form onSubmit={submitVentilator} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[['mode','Mode'],['fio2','FiO₂'],['peep','PEEP'],['tidalVolume','Tidal volume'],['respiratoryRate','Respiratory rate'],['pressureSupport','Pressure support']].map(([key, name]) => <label key={key} className="text-[10px] font-extrabold text-slate-600">{name}<input type={key === 'mode' ? 'text' : 'number'} value={ventilatorForm[key]} onChange={e => setVentilatorForm({ ...ventilatorForm, [key]: e.target.value })} className={inputClass}/></label>)}</div><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setModal(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Cancel</button><button disabled={working} className="rounded-xl bg-[#1b7b68] px-5 py-2 text-xs font-extrabold text-white">{working ? 'Saving…' : 'Save settings'}</button></div></form></Modal>

      <Modal open={modal === 'status'} title="Update ICU status" description="The backend state machine controls which transitions are allowed." onClose={() => setModal(null)}><form onSubmit={submitStatus} className="space-y-4"><label className="text-[10px] font-extrabold text-slate-600">Next status<div className="relative"><select value={statusForm.status} onChange={e => setStatusForm({ ...statusForm, status: e.target.value })} className={selectClass}><option value="ADMITTED">Admitted</option><option value="STABILIZED">Stabilized</option><option value="TRANSFERRED_OUT">Transferred out</option><option value="DISCHARGED">Discharged</option><option value="DECEASED">Deceased</option></select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-4 text-slate-400"/></div></label><label className="text-[10px] font-extrabold text-slate-600">Disposition notes<textarea value={statusForm.dispositionNotes} onChange={e => setStatusForm({ ...statusForm, dispositionNotes: e.target.value })} className={textareaClass}/></label><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setModal(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Cancel</button><button disabled={working} className="rounded-xl bg-[#1b7b68] px-5 py-2 text-xs font-extrabold text-white">{working ? 'Updating…' : 'Apply status'}</button></div></form></Modal>

      <Modal open={modal === 'family'} title="Record family communication" description="Create a traceable communication record for the current ICU admission." onClose={() => setModal(null)}><form onSubmit={submitFamily} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-[10px] font-extrabold text-slate-600">Contact name<input required value={familyForm.contactName} onChange={e => setFamilyForm({ ...familyForm, contactName: e.target.value })} className={inputClass}/></label><label className="text-[10px] font-extrabold text-slate-600">Relationship<input value={familyForm.relationship} onChange={e => setFamilyForm({ ...familyForm, relationship: e.target.value })} className={inputClass}/></label><label className="text-[10px] font-extrabold text-slate-600">Contact method<select value={familyForm.contactMethod} onChange={e => setFamilyForm({ ...familyForm, contactMethod: e.target.value })} className={selectClass}><option>PHONE</option><option>IN_PERSON</option><option>VIDEO</option><option>EMAIL</option><option>SMS</option></select></label><label className="text-[10px] font-extrabold text-slate-600">Topics<input value={familyForm.topics} onChange={e => setFamilyForm({ ...familyForm, topics: e.target.value })} className={inputClass} placeholder="Condition, prognosis, treatment"/></label></div><label className="block text-[10px] font-extrabold text-slate-600">Summary<textarea required value={familyForm.summary} onChange={e => setFamilyForm({ ...familyForm, summary: e.target.value })} className={textareaClass}/></label><label className="block text-[10px] font-extrabold text-slate-600">Questions / concerns<textarea value={familyForm.questionsOrConcerns} onChange={e => setFamilyForm({ ...familyForm, questionsOrConcerns: e.target.value })} className={textareaClass}/></label><label className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3 text-[10px] font-bold text-slate-600"><input type="checkbox" checked={familyForm.followUpRequired} onChange={e => setFamilyForm({ ...familyForm, followUpRequired: e.target.checked })} className="accent-[#1b7b68]"/> Follow-up required</label>{familyForm.followUpRequired && <label className="block text-[10px] font-extrabold text-slate-600">Follow-up plan<textarea value={familyForm.followUpPlan} onChange={e => setFamilyForm({ ...familyForm, followUpPlan: e.target.value })} className={textareaClass}/></label>}<div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setModal(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Cancel</button><button disabled={working} className="rounded-xl bg-[#1b7b68] px-5 py-2 text-xs font-extrabold text-white">{working ? 'Saving…' : 'Record communication'}</button></div></form></Modal>

      <Modal open={modal === 'admission'} title="Create ICU admission" description="Search and select the patient, ICU ward, and attending physician instead of entering raw IDs." onClose={() => { setModal(null); resetAdmissionSearch(); }}>
        <form onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!admissionForm.patientId) { setError('Please select a patient from the search results.'); return; }
          if (!admissionForm.wardId) { setError('Please select an ICU ward from the search results.'); return; }
          if (!admissionForm.admissionReason.trim()) { setError('Please provide the admission reason.'); return; }
          const payload = {
            patientId: admissionForm.patientId,
            wardId: admissionForm.wardId,
            bedNumber: admissionForm.bedNumber.trim(),
            careLevel: admissionForm.careLevel,
            primaryDiagnosis: admissionForm.primaryDiagnosis.trim(),
            admissionReason: admissionForm.admissionReason.trim(),
            ...(admissionForm.attendingPhysicianId ? { attendingPhysicianId: admissionForm.attendingPhysicianId } : {}),
            ...(admissionForm.encounterId ? { encounterId: admissionForm.encounterId } : {}),
          };
          void runAction(() => api('/admissions', { method: 'POST', body: JSON.stringify(payload) }).then(() => undefined), 'ICU admission created.');
        }} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="relative text-[10px] font-extrabold text-slate-600">
              <label>Patient</label>
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  value={patientSearch}
                  onChange={e => { setPatientSearch(e.target.value); setSelectedPatient(null); setAdmissionForm({ ...admissionForm, patientId: '' }); setShowPatientResults(true); }}
                  onFocus={() => { if (patientResults.length) setShowPatientResults(true); }}
                  className={`${inputClass} pl-9 pr-9`}
                  placeholder="Search name, MRN or phone"
                  autoComplete="off"
                />
                {searchingPatients && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
                {!searchingPatients && patientSearch && <button type="button" onClick={() => { setPatientSearch(''); setSelectedPatient(null); setAdmissionForm({ ...admissionForm, patientId: '' }); setPatientResults([]); setShowPatientResults(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={13}/></button>}
              </div>
              {showPatientResults && patientSearch.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
                  {patientResults.length ? patientResults.map(patient => (
                    <button key={patient._id} type="button" onClick={() => {
                      setSelectedPatient(patient);
                      setPatientSearch(`${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.mrn || patient._id || '');
                      setAdmissionForm({ ...admissionForm, patientId: patient._id || '' });
                      setPatientResults([]); setShowPatientResults(false); setError(null);
                    }} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-slate-50">
                      <span><span className="block text-xs font-extrabold text-slate-700">{`${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unnamed patient'}</span><span className="block text-[9px] font-semibold text-slate-400">{patient.mrn || patient.universalPatientId || 'No MRN'} · {patient.phone || 'No phone'}</span></span><CheckCircle2 size={15} className="text-slate-300" />
                    </button>
                  )) : !searchingPatients ? <div className="px-3 py-4 text-[10px] font-semibold text-slate-400">No matching patients found.</div> : <div className="px-3 py-4 text-[10px] font-semibold text-slate-400">Searching patients…</div>}
                </div>
              )}
              {selectedPatient && <p className="mt-1 text-[9px] font-bold text-emerald-600">Selected: {patientName(selectedPatient)}</p>}
            </div>

            <div className="relative text-[10px] font-extrabold text-slate-600">
              <label>ICU ward</label>
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input required value={wardSearch} onChange={e => { setWardSearch(e.target.value); setSelectedWard(null); setAdmissionForm({ ...admissionForm, wardId: '' }); setShowWardResults(true); }} onFocus={() => { if (wardResults.length) setShowWardResults(true); }} className={`${inputClass} pl-9 pr-9`} placeholder="Search ICU ward" autoComplete="off" />
                {searchingWards && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
              </div>
              {showWardResults && wardSearch.trim().length >= 1 && <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
                {wardResults.length ? wardResults.map(ward => <button key={ward._id} type="button" onClick={() => { setSelectedWard(ward); setWardSearch(ward.name || ward.code || ward._id || ''); setAdmissionForm({ ...admissionForm, wardId: ward._id || '' }); setWardResults([]); setShowWardResults(false); setError(null); }} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-slate-50"><span><span className="block text-xs font-extrabold text-slate-700">{ward.name || 'Unnamed ward'}</span><span className="block text-[9px] font-semibold text-slate-400">{ward.code || 'No code'} · {ward.department || 'ICU'}</span></span><CheckCircle2 size={15} className="text-slate-300" /></button>) : !searchingWards ? <div className="px-3 py-4 text-[10px] font-semibold text-slate-400">No matching wards found.</div> : <div className="px-3 py-4 text-[10px] font-semibold text-slate-400">Searching wards…</div>}
              </div>}
              {selectedWard && <p className="mt-1 text-[9px] font-bold text-emerald-600">Selected: {selectedWard.name || selectedWard.code}</p>}
            </div>

            <label className="text-[10px] font-extrabold text-slate-600">Bed number<input required value={admissionForm.bedNumber} onChange={e => setAdmissionForm({ ...admissionForm, bedNumber: e.target.value })} className={inputClass} placeholder="ICU-01"/></label>
            <label className="text-[10px] font-extrabold text-slate-600">Care level<select value={admissionForm.careLevel} onChange={e => setAdmissionForm({ ...admissionForm, careLevel: e.target.value })} className={selectClass}><option value="LEVEL_1_ICU">Level 1 ICU</option><option value="LEVEL_2_ICU">Level 2 ICU</option><option value="LEVEL_3_ICU">Level 3 ICU</option></select></label>

            <div className="relative text-[10px] font-extrabold text-slate-600">
              <label>Attending physician</label>
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={staffSearch}
                  onChange={e => { setStaffSearch(e.target.value); setSelectedStaff(null); setAdmissionForm({ ...admissionForm, attendingPhysicianId: '' }); setShowStaffResults(true); }}
                  onFocus={() => { if (staffResults.length) setShowStaffResults(true); }}
                  className={`${inputClass} pl-9 pr-9`}
                  placeholder="Search doctor by name or staff ID"
                  autoComplete="off"
                />
                {searchingStaff && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
                {!searchingStaff && staffSearch && <button type="button" onClick={() => { setStaffSearch(''); setSelectedStaff(null); setAdmissionForm({ ...admissionForm, attendingPhysicianId: '' }); setStaffResults([]); setShowStaffResults(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={13}/></button>}
              </div>
              {showStaffResults && staffSearch.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
                  {staffResults.length ? staffResults.map(staff => (
                    <button key={staff._id} type="button" onClick={() => {
                      setSelectedStaff(staff);
                      setStaffSearch(`${staff.firstName || ''} ${staff.lastName || ''}`.trim() || staff.email || staff.staffId || staff._id || '');
                      setAdmissionForm({ ...admissionForm, attendingPhysicianId: staff._id || '' });
                      setStaffResults([]); setShowStaffResults(false); setError(null);
                    }} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-slate-50">
                      <span><span className="block text-xs font-extrabold text-slate-700">{`${staff.firstName || ''} ${staff.lastName || ''}`.trim() || 'Unnamed staff'}</span><span className="block text-[9px] font-semibold text-slate-400">{staff.role || 'DOCTOR'} · {staff.staffId || staff.email || 'Staff ID unavailable'}</span></span><CheckCircle2 size={15} className="text-slate-300" />
                    </button>
                  )) : !searchingStaff ? <div className="px-3 py-4 text-[10px] font-semibold text-slate-400">No matching doctors found.</div> : <div className="px-3 py-4 text-[10px] font-semibold text-slate-400">Searching staff…</div>}
                </div>
              )}
              {selectedStaff && <p className="mt-1 text-[9px] font-bold text-emerald-600">Selected: {staffName(selectedStaff)}</p>}
            </div>

            <label className="text-[10px] font-extrabold text-slate-600 sm:col-span-2">Encounter ID (optional)<input value={admissionForm.encounterId} onChange={e => setAdmissionForm({ ...admissionForm, encounterId: e.target.value })} className={inputClass} placeholder="Optional encounter reference"/></label>
          </div>
          <label className="block text-[10px] font-extrabold text-slate-600">Admission reason<textarea required value={admissionForm.admissionReason} onChange={e => setAdmissionForm({ ...admissionForm, admissionReason: e.target.value })} className={textareaClass} placeholder="Reason for ICU admission" /></label>
          <label className="block text-[10px] font-extrabold text-slate-600">Primary diagnosis<textarea required value={admissionForm.primaryDiagnosis} onChange={e => setAdmissionForm({ ...admissionForm, primaryDiagnosis: e.target.value })} className={textareaClass}/></label>
          <p className="rounded-2xl bg-emerald-50 p-3 text-[9px] font-semibold leading-4 text-emerald-800">Select the patient and attending physician from the search results. Their MongoDB IDs are stored automatically; you do not need to copy or paste raw IDs.</p>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => { setModal(null); resetAdmissionSearch(); }} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Cancel</button><button disabled={working || !admissionForm.patientId} className="rounded-xl bg-[#1b7b68] px-5 py-2 text-xs font-extrabold text-white disabled:opacity-50">{working ? 'Creating…' : 'Create admission'}</button></div>
        </form>
      </Modal>

      {toast && <div className="fixed bottom-5 right-5 z-100 flex max-w-sm items-start gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-2xl"><CheckCircle2 size={16} className="mt-0.5 text-emerald-400"/><span>{toast}</span></div>}
    </div>
  );
}
