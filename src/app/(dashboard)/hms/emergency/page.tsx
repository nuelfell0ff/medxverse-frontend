'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentType, FormEvent, ReactNode } from 'react';
import { PatientApiService } from '@/services/patient.service';
import {
  Activity,
  AlertTriangle,
  Ambulance,
  BedDouble,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  Filter,
  HeartPulse,
  Hospital,
  LayoutDashboard,
  Loader2,
  MapPin,
  PackageCheck,
  Pill,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Stethoscope,
  UserRound,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

const inputClass = 'mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-300 hover:border-slate-300 focus:border-[#1b7b68] focus:ring-4 focus:ring-[#1b7b68]/10';
const textareaClass = 'mt-2 min-h-28 w-full resize-y rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium leading-6 text-slate-700 shadow-sm outline-none transition placeholder:text-slate-300 hover:border-slate-300 focus:border-[#1b7b68] focus:ring-4 focus:ring-[#1b7b68]/10';
const selectClass = 'mt-2 h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-3.5 pr-10 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:border-slate-300 focus:border-[#1b7b68] focus:ring-4 focus:ring-[#1b7b68]/10';

type EDVisitStatus =
  | 'ARRIVED' | 'TRIAGED' | 'WAITING_FOR_BAY' | 'IN_BAY' | 'IN_TREATMENT'
  | 'AWAITING_RESULTS' | 'READY_FOR_DISPOSITION' | 'ADMITTED' | 'DISCHARGED'
  | 'TRANSFERRED' | 'DECEASED' | 'LEFT_WITHOUT_BEING_SEEN' | 'LEFT_AGAINST_MEDICAL_ADVICE';
type AcuityLevel = 1 | 2 | 3 | 4 | 5;
type TriageScale = 'ESI' | 'CTAS';
type ArrivalMode = 'AMBULANCE' | 'WALK_IN' | 'POLICE' | 'REFERRAL' | 'OTHER';
type OrderType = 'LAB' | 'IMAGING' | 'MEDICATION' | 'OTHER';
type OrderStatus = 'ORDERED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'RESULTED';
type DispositionType = 'ADMIT' | 'DISCHARGE' | 'TRANSFER' | 'DECEASED' | 'LEFT_WITHOUT_BEING_SEEN' | 'LEFT_AGAINST_MEDICAL_ADVICE';

type Patient = Record<string, any>;
type Triage = Record<string, any>;
type BayAssignment = Record<string, any>;
type Order = Record<string, any>;
type BoardItem = {
  visit: Record<string, any>;
  patient?: Patient;
  triage?: Triage | null;
  bay?: BayAssignment | null;
  orders: Order[];
  waitTimeMinutes: number;
  priorityScore: number;
};
type Bay = Record<string, any>;

const statusColumns: { key: EDVisitStatus; label: string; short: string }[] = [
  { key: 'ARRIVED', label: 'Arrived', short: 'Arrived' },
  { key: 'TRIAGED', label: 'Triaged', short: 'Triaged' },
  { key: 'WAITING_FOR_BAY', label: 'Waiting for Bay', short: 'Waiting' },
  { key: 'IN_BAY', label: 'In Bay', short: 'In Bay' },
  { key: 'IN_TREATMENT', label: 'In Treatment', short: 'Treatment' },
  { key: 'AWAITING_RESULTS', label: 'Awaiting Results', short: 'Results' },
  { key: 'READY_FOR_DISPOSITION', label: 'Ready for Disposition', short: 'Disposition' },
];

const activeStatuses = new Set(statusColumns.map((item) => item.key));

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    throw new Error(body.message || `Request failed (${response.status})`);
  }
  return body.data as T;
}

function formatTime(value?: string | Date) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(value?: string | Date) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function elapsed(minutes = 0) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

function acuityLabel(level?: number) {
  return level ? `ESI ${level}` : 'Untriaged';
}

function acuityClass(level?: number) {
  switch (level) {
    case 1: return 'bg-rose-50 text-rose-700 border-rose-100';
    case 2: return 'bg-orange-50 text-orange-700 border-orange-100';
    case 3: return 'bg-amber-50 text-amber-700 border-amber-100';
    case 4: return 'bg-sky-50 text-sky-700 border-sky-100';
    case 5: return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    default: return 'bg-slate-50 text-slate-600 border-slate-100';
  }
}

function statusClass(status?: string) {
  const value = String(status || '').toLowerCase();
  if (value.includes('treatment') || value.includes('bay')) return 'bg-teal-50 text-teal-700 border-teal-100';
  if (value.includes('result')) return 'bg-violet-50 text-violet-700 border-violet-100';
  if (value.includes('disposition')) return 'bg-amber-50 text-amber-700 border-amber-100';
  if (value === 'triaged') return 'bg-sky-50 text-sky-700 border-sky-100';
  return 'bg-slate-50 text-slate-600 border-slate-100';
}

function patientName(patient?: Patient, visit?: Record<string, any>) {
  if (patient?.firstName || patient?.lastName) return `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
  return visit?.isUnidentified ? (visit.temporaryIdentifier || 'Unidentified patient') : 'Patient not linked';
}

function orderCounts(orders: Order[]) {
  return {
    pending: orders.filter((o) => ['ORDERED', 'IN_PROGRESS'].includes(o.status)).length,
    resulted: orders.filter((o) => o.status === 'RESULTED' || o.status === 'COMPLETED').length,
  };
}

export default function EmergencyPage() {
  const [board, setBoard] = useState<BoardItem[]>([]);
  const [bays, setBays] = useState<Bay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [selected, setSelected] = useState<BoardItem | null>(null);
  const [activeModal, setActiveModal] = useState<'visit' | 'triage' | 'bay' | 'order' | 'disposition' | null>(null);
  const [search, setSearch] = useState('');
  const [acuityFilter, setAcuityFilter] = useState('ALL');
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [patientSearching, setPatientSearching] = useState(false);
  const [selectedPatientForVisit, setSelectedPatientForVisit] = useState<Patient | null>(null);

  const [visitForm, setVisitForm] = useState({ patientId: '', arrivalMode: 'WALK_IN' as ArrivalMode, chiefComplaint: '', traumaType: 'NONE', notes: '' });
  const [triageForm, setTriageForm] = useState({ scale: 'ESI' as TriageScale, acuityLevel: 3 as AcuityLevel, chiefComplaint: '', heartRateBpm: '', systolicBpMmHg: '', diastolicBpMmHg: '', respiratoryRateBpm: '', oxygenSaturationPct: '', temperatureCelsius: '', painScale: '', notes: '' });
  const [bayForm, setBayForm] = useState({ bayId: '', reason: '' });
  const [orderForm, setOrderForm] = useState({ type: 'LAB' as OrderType, name: '', notes: '' });
  const [dispositionForm, setDispositionForm] = useState({ disposition: 'DISCHARGE' as DispositionType, notes: '', wardId: '', transferFacility: '' });

  const searchPatientsForVisit = useCallback(async (term: string) => {
    const trimmed = term.trim();

    if (!trimmed) {
      setPatientResults([]);
      setPatientSearching(false);
      return;
    }

    setPatientSearching(true);

    try {
      // Use the same PatientApiService used by the Outpatient module.
      // The /patients list endpoint returns { success, patients, total, ... }
      // at the top level, not inside `data`, so the generic `api()` helper
      // cannot be used here.
      const response = await PatientApiService.getPatients({
        search: trimmed,
        page: 1,
        limit: 8,
      });

      setPatientResults(
        Array.isArray(response?.patients)
          ? (response.patients as Patient[])
          : []
      );
    } catch (err) {
      console.error('Unable to search patients:', err);
      setPatientResults([]);
    } finally {
      setPatientSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!activeModal || activeModal !== 'visit') return;
    const timer = window.setTimeout(() => searchPatientsForVisit(patientSearch), 250);
    return () => window.clearTimeout(timer);
  }, [activeModal, patientSearch, searchPatientsForVisit]);

  const loadBoard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const data = await api<{ items: BoardItem[] }>('/api/v1/emergency/board?limit=100');
      setBoard(data.items || []);
    } catch (err: any) {
      setError(err.message || 'Unable to load emergency board.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadBays = useCallback(async () => {
    try {
      const data = await api<Bay[]>('/api/v1/emergency/bays');
      setBays(data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadBoard();
    loadBays();
  }, [loadBoard, loadBays]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const wsBase = API_BASE_URL.replace(/^http/, 'ws');
    const socket = new WebSocket(`${wsBase}/ws/emergency?token=${encodeURIComponent(token)}`);
    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);
    socket.onmessage = () => loadBoard(true);
    return () => socket.close();
  }, [loadBoard]);

  useEffect(() => {
    const timer = window.setInterval(() => loadBoard(true), 30000);
    return () => window.clearInterval(timer);
  }, [loadBoard]);

  const filteredBoard = useMemo(() => {
    const term = search.trim().toLowerCase();
    return board.filter((item) => {
      const visit = item.visit;
      const patient = item.patient;
      const name = patientName(patient, visit).toLowerCase();
      const matchesSearch = !term || [name, patient?.mrn, visit?.visitNumber, visit?.chiefComplaint, item.bay?.bayCode].filter(Boolean).some((v) => String(v).toLowerCase().includes(term));
      const matchesAcuity = acuityFilter === 'ALL' || String(visit?.currentAcuityLevel) === acuityFilter;
      const matchesZone = zoneFilter === 'ALL' || String(item.bay?.zone || '') === zoneFilter;
      return matchesSearch && matchesAcuity && matchesZone;
    });
  }, [board, search, acuityFilter, zoneFilter]);

  const columns = useMemo(() => statusColumns.map((column) => ({ ...column, items: filteredBoard.filter((item) => item.visit?.status === column.key) })), [filteredBoard]);

  const metrics = useMemo(() => ({
    active: board.length,
    critical: board.filter((x) => x.visit?.currentAcuityLevel === 1 || x.visit?.currentAcuityLevel === 2).length,
    waiting: board.filter((x) => ['ARRIVED', 'TRIAGED', 'WAITING_FOR_BAY'].includes(x.visit?.status)).length,
    treatment: board.filter((x) => ['IN_TREATMENT', 'AWAITING_RESULTS'].includes(x.visit?.status)).length,
    baysOccupied: bays.filter((b) => b.status === 'OCCUPIED').length,
    baysAvailable: bays.filter((b) => b.status === 'AVAILABLE').length,
  }), [board, bays]);

  const zones = useMemo(() => Array.from(new Set(bays.map((b) => b.zone).filter(Boolean))), [bays]);

  const refresh = () => loadBoard(true);

  const openDetails = async (item: BoardItem) => {
    setSelected(item);
    setDetailLoading(true);
    try {
      const data = await api(`/api/v1/emergency/visits/${item.visit._id}`);
      setDetail(data);
    } catch (err) {
      console.error(err);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  };

  const submitVisit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api('/api/v1/emergency/visits', { method: 'POST', body: JSON.stringify({ ...visitForm, patientId: visitForm.patientId || undefined }) });
      setActiveModal(null);
      setVisitForm({ patientId: '', arrivalMode: 'WALK_IN', chiefComplaint: '', traumaType: 'NONE', notes: '' });
      setPatientSearch('');
      setPatientResults([]);
      setSelectedPatientForVisit(null);
      notify('ED visit registered successfully.');
      await loadBoard(true);
    } catch (err: any) { notify(err.message || 'Unable to register ED visit.'); }
    finally { setSubmitting(false); }
  };

  const submitTriage = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    const vitals = Object.fromEntries(Object.entries({
      heartRateBpm: triageForm.heartRateBpm, systolicBpMmHg: triageForm.systolicBpMmHg, diastolicBpMmHg: triageForm.diastolicBpMmHg,
      respiratoryRateBpm: triageForm.respiratoryRateBpm, oxygenSaturationPct: triageForm.oxygenSaturationPct, temperatureCelsius: triageForm.temperatureCelsius, painScale: triageForm.painScale,
    }).filter(([, value]) => value !== '').map(([key, value]) => [key, Number(value)]));
    try {
      await api(`/api/v1/emergency/visits/${selected.visit._id}/triage`, { method: 'POST', body: JSON.stringify({ scale: triageForm.scale, acuityLevel: triageForm.acuityLevel, chiefComplaint: triageForm.chiefComplaint || undefined, vitals, notes: triageForm.notes }) });
      setActiveModal(null); notify('Triage assessment saved.'); await loadBoard(true);
    } catch (err: any) { notify(err.message || 'Unable to save triage.'); }
    finally { setSubmitting(false); }
  };

  const submitBay = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      await api(`/api/v1/emergency/visits/${selected.visit._id}/bay`, { method: 'POST', body: JSON.stringify({ bayId: bayForm.bayId || undefined, reason: bayForm.reason }) });
      setActiveModal(null); notify('Bay assigned successfully.'); await Promise.all([loadBoard(true), loadBays()]);
    } catch (err: any) { notify(err.message || 'Unable to assign bay.'); }
    finally { setSubmitting(false); }
  };

  const submitOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      await api(`/api/v1/emergency/visits/${selected.visit._id}/orders`, { method: 'POST', body: JSON.stringify(orderForm) });
      setActiveModal(null); setOrderForm({ type: 'LAB', name: '', notes: '' }); notify('ED order created.'); await loadBoard(true);
    } catch (err: any) { notify(err.message || 'Unable to create order.'); }
    finally { setSubmitting(false); }
  };

  const submitDisposition = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      await api(`/api/v1/emergency/visits/${selected.visit._id}/disposition`, { method: 'POST', body: JSON.stringify({ ...dispositionForm, wardId: dispositionForm.wardId || undefined, transferFacility: dispositionForm.transferFacility || undefined }) });
      setActiveModal(null); notify('Disposition recorded and downstream workflow triggered.'); await loadBoard(true);
    } catch (err: any) { notify(err.message || 'Unable to record disposition.'); }
    finally { setSubmitting(false); }
  };

  const updateStatus = async (status: EDVisitStatus) => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await api(`/api/v1/emergency/visits/${selected.visit._id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      notify(`Patient moved to ${status.replaceAll('_', ' ').toLowerCase()}.`); await loadBoard(true); await openDetails({ ...selected, visit: { ...selected.visit, status } });
    } catch (err: any) { notify(err.message || 'Unable to update status.'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-full space-y-6 font-sans text-slate-800 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1b7b68] text-white shadow-sm"><HeartPulse size={20} /></div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">Emergency Department</h1>
              <p className="mt-0.5 text-xs text-slate-400">Real-time emergency patient flow, triage, bays, orders and disposition</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${connected ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-amber-100 bg-amber-50 text-amber-700'}`}>
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {connected ? 'Live board' : 'Polling / degraded'}
          </div>
          <button onClick={refresh} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-slate-300">
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => setActiveModal('visit')} className="inline-flex items-center gap-2 rounded-2xl bg-[#1b7b68] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:opacity-95">
            <Plus size={16} /> Register ED Visit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          ['Active Patients', metrics.active, Users, 'text-[#1b7b68]'],
          ['Critical', metrics.critical, ShieldAlert, 'text-rose-600'],
          ['Waiting', metrics.waiting, Clock3, 'text-amber-600'],
          ['Treatment', metrics.treatment, Stethoscope, 'text-sky-600'],
          ['Bays Occupied', metrics.baysOccupied, BedDouble, 'text-violet-600'],
          ['Bays Available', metrics.baysAvailable, CheckCircle2, 'text-emerald-600'],
        ].map(([label, value, Icon, color]) => {
          const IconComponent = Icon as ComponentType<{ size?: number; className?: string }>;
          return <div key={String(label)} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between"><span className="text-[11px] font-semibold text-slate-400">{String(label)}</span><IconComponent size={17} className={String(color)} /></div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-800">{String(value)}</p>
          </div>;
        })}
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient, MRN, ED visit, complaint or bay..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-xs outline-none transition focus:border-[#1b7b68] focus:bg-white" />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-slate-400" />
            <select value={acuityFilter} onChange={(e) => setAcuityFilter(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 outline-none">
              <option value="ALL">All acuity</option><option value="1">ESI 1</option><option value="2">ESI 2</option><option value="3">ESI 3</option><option value="4">ESI 4</option><option value="5">ESI 5</option>
            </select>
            <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 outline-none">
              <option value="ALL">All zones</option>{zones.map((zone) => <option key={String(zone)} value={String(zone)}>{String(zone)}</option>)}
            </select>
          </div>
        </div>
      </div>

      {error && <div className="flex items-center gap-3 rounded-3xl border border-rose-100 bg-rose-50 p-4 text-xs text-rose-700"><AlertTriangle size={17} /><span>{error}</span><button onClick={() => loadBoard()} className="ml-auto font-bold underline">Retry</button></div>}

      {loading ? <div className="flex min-h-105 items-center justify-center rounded-3xl border border-slate-100 bg-white"><div className="text-center"><Loader2 className="mx-auto animate-spin text-[#1b7b68]" size={28} /><p className="mt-3 text-xs font-semibold text-slate-400">Loading emergency tracking board...</p></div></div> :
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-375 grid-cols-7 gap-3">
            {columns.map((column) => <div key={column.key} className="min-w-0 rounded-3xl border border-slate-100 bg-slate-50/70 p-2.5">
              <div className="mb-2 flex items-center justify-between px-1.5 py-1">
                <div><p className="text-[11px] font-extrabold text-slate-700">{column.label}</p><p className="text-[10px] text-slate-400">{column.items.length} patient{column.items.length === 1 ? '' : 's'}</p></div>
                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-extrabold text-slate-500 shadow-sm">{column.items.length}</span>
              </div>
              <div className="space-y-2">
                {column.items.map((item) => {
                  const counts = orderCounts(item.orders || []);
                  return <button key={String(item.visit._id)} onClick={() => openDetails(item)} className="w-full rounded-2xl border border-slate-100 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0"><p className="truncate text-xs font-extrabold text-slate-800">{patientName(item.patient, item.visit)}</p><p className="mt-0.5 truncate text-[10px] text-slate-400">{item.patient?.mrn || item.visit?.visitNumber}</p></div>
                      <span className={`shrink-0 rounded-lg border px-1.5 py-1 text-[9px] font-extrabold ${acuityClass(item.visit?.currentAcuityLevel)}`}>{acuityLabel(item.visit?.currentAcuityLevel)}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-slate-500">{item.visit?.chiefComplaint || 'No chief complaint recorded'}</p>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-2 text-[9px] font-semibold text-slate-400">
                      <span className="flex items-center gap-1"><Clock3 size={12} /> {elapsed(item.waitTimeMinutes)}</span>
                      <span className="flex items-center gap-1">{item.bay?.bayCode ? <><MapPin size={11} /> {item.bay.bayCode}</> : 'No bay'}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {counts.pending > 0 && <span className="rounded-md bg-amber-50 px-1.5 py-1 text-[9px] font-bold text-amber-700">{counts.pending} pending order{counts.pending > 1 ? 's' : ''}</span>}
                      {counts.resulted > 0 && <span className="rounded-md bg-emerald-50 px-1.5 py-1 text-[9px] font-bold text-emerald-700">{counts.resulted} completed</span>}
                      {item.visit?.arrivalMode === 'AMBULANCE' && <span className="rounded-md bg-rose-50 px-1.5 py-1 text-[9px] font-bold text-rose-700"><Ambulance className="mr-1 inline" size={11} />Ambulance</span>}
                    </div>
                  </button>;
                })}
                {!column.items.length && <div className="rounded-2xl border border-dashed border-slate-200 bg-white/50 p-5 text-center"><p className="text-[10px] font-semibold text-slate-400">No patients</p></div>}
              </div>
            </div>)}
          </div>
        </div>}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold text-slate-800">Bay Availability</h2><p className="mt-0.5 text-[10px] text-slate-400">Current emergency treatment spaces</p></div><BedDouble size={18} className="text-[#1b7b68]" /></div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {bays.map((bay) => <div key={String(bay._id)} className="rounded-2xl border border-slate-100 bg-slate-50 p-3"><div className="flex items-center justify-between"><span className="text-xs font-extrabold text-slate-700">{bay.bayCode}</span><span className={`h-2 w-2 rounded-full ${bay.status === 'AVAILABLE' ? 'bg-emerald-500' : bay.status === 'OCCUPIED' ? 'bg-rose-500' : 'bg-amber-500'}`} /></div><p className="mt-1 text-[10px] text-slate-400">{bay.zone || 'General'} · {String(bay.status || '').replaceAll('_', ' ')}</p></div>)}
            {!bays.length && <p className="col-span-full py-6 text-center text-xs text-slate-400">No ED bays configured yet.</p>}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold text-slate-800">Operational Notes</h2><p className="mt-0.5 text-[10px] text-slate-400">Live board safeguards</p></div><LayoutDashboard size={18} className="text-[#1b7b68]" /></div><div className="mt-4 space-y-3 text-[10px] leading-5 text-slate-500"><p className="rounded-2xl bg-slate-50 p-3">Patients are prioritized using acuity and waiting time rather than arrival order alone.</p><p className="rounded-2xl bg-slate-50 p-3">The board listens for real-time updates and falls back to polling when the WebSocket is unavailable.</p><p className="rounded-2xl bg-slate-50 p-3">Every ED status transition is retained by the backend audit history.</p></div></div>
      </div>

      {selected && <div className="fixed inset-0 z-50 flex items-end justify-end bg-slate-900/20 backdrop-blur-[1px]" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
        <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl sm:rounded-l-3xl">
          <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><span className={`rounded-lg border px-2 py-1 text-[9px] font-extrabold ${acuityClass(selected.visit?.currentAcuityLevel)}`}>{acuityLabel(selected.visit?.currentAcuityLevel)}</span><span className={`rounded-lg border px-2 py-1 text-[9px] font-bold ${statusClass(selected.visit?.status)}`}>{String(selected.visit?.status || '').replaceAll('_', ' ')}</span></div><h2 className="mt-3 text-xl font-extrabold text-slate-800">{patientName(selected.patient, selected.visit)}</h2><p className="mt-1 text-xs text-slate-400">{selected.patient?.mrn || selected.visit?.visitNumber} · Arrived {formatDateTime(selected.visit?.arrivalAt)}</p></div><button onClick={() => setSelected(null)} className="rounded-xl bg-slate-50 p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div>

          <div className="mt-5 grid grid-cols-2 gap-2"><div className="rounded-2xl bg-slate-50 p-3"><p className="text-[9px] font-bold text-slate-400">Chief Complaint</p><p className="mt-1 text-xs font-bold text-slate-700">{selected.visit?.chiefComplaint || '—'}</p></div><div className="rounded-2xl bg-slate-50 p-3"><p className="text-[9px] font-bold text-slate-400">Bay</p><p className="mt-1 text-xs font-bold text-slate-700">{selected.bay?.bayCode || 'Not assigned'}</p></div></div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><button onClick={() => setActiveModal('triage')} className="rounded-2xl border border-slate-200 bg-white p-3 text-left hover:border-[#1b7b68]"><ClipboardList size={17} className="text-[#1b7b68]" /><p className="mt-2 text-[10px] font-extrabold">Triage</p></button><button onClick={() => setActiveModal('bay')} className="rounded-2xl border border-slate-200 bg-white p-3 text-left hover:border-[#1b7b68]"><BedDouble size={17} className="text-[#1b7b68]" /><p className="mt-2 text-[10px] font-extrabold">Assign Bay</p></button><button onClick={() => setActiveModal('order')} className="rounded-2xl border border-slate-200 bg-white p-3 text-left hover:border-[#1b7b68]"><PackageCheck size={17} className="text-[#1b7b68]" /><p className="mt-2 text-[10px] font-extrabold">Add Order</p></button><button onClick={() => setActiveModal('disposition')} className="rounded-2xl border border-slate-200 bg-white p-3 text-left hover:border-[#1b7b68]"><Hospital size={17} className="text-[#1b7b68]" /><p className="mt-2 text-[10px] font-extrabold">Disposition</p></button></div>

          {detailLoading ? <div className="py-12 text-center"><Loader2 className="mx-auto animate-spin text-[#1b7b68]" size={22} /></div> : <>
            <section className="mt-5"><h3 className="text-xs font-extrabold text-slate-800">Orders & Results</h3><div className="mt-2 space-y-2">{(detail?.orders || selected.orders || []).map((order: Order) => <div key={String(order._id)} className="flex items-center justify-between rounded-2xl border border-slate-100 p-3"><div className="flex min-w-0 items-center gap-2"><div className="rounded-xl bg-slate-50 p-2">{order.type === 'MEDICATION' ? <Pill size={15} /> : order.type === 'IMAGING' ? <Activity size={15} /> : <ClipboardList size={15} />}</div><div className="min-w-0"><p className="truncate text-[11px] font-bold text-slate-700">{order.name}</p><p className="text-[9px] text-slate-400">{order.type} · {formatTime(order.orderedAt)}</p></div></div><span className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-500">{String(order.status).replaceAll('_', ' ')}</span></div>)}{!(detail?.orders || selected.orders || []).length && <p className="rounded-2xl bg-slate-50 p-4 text-center text-[10px] text-slate-400">No orders recorded.</p>}</div></section>
            <section className="mt-5"><h3 className="text-xs font-extrabold text-slate-800">Triage History</h3><div className="mt-2 space-y-2">{(detail?.triages || []).map((triage: Triage) => <div key={String(triage._id)} className="rounded-2xl border border-slate-100 p-3"><div className="flex items-center justify-between"><span className={`rounded-lg border px-2 py-1 text-[9px] font-extrabold ${acuityClass(triage.acuityLevel)}`}>{triage.scale} {triage.acuityLevel}</span><span className="text-[9px] text-slate-400">{formatDateTime(triage.assessedAt)}</span></div>{triage.notes && <p className="mt-2 text-[10px] text-slate-500">{triage.notes}</p>}</div>)}{!(detail?.triages || []).length && <p className="rounded-2xl bg-slate-50 p-4 text-center text-[10px] text-slate-400">No triage assessment yet.</p>}</div></section>
            <section className="mt-5"><h3 className="text-xs font-extrabold text-slate-800">Status Transition</h3><div className="mt-2 flex flex-wrap gap-2">{statusColumns.map((status) => <button key={status.key} disabled={submitting || !activeStatuses.has(status.key)} onClick={() => updateStatus(status.key)} className={`rounded-xl border px-2.5 py-2 text-[9px] font-bold ${selected.visit.status === status.key ? 'border-[#1b7b68] bg-[#1b7b68] text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>{status.short}</button>)}</div></section>
            <section className="mt-5"><h3 className="text-xs font-extrabold text-slate-800">Patient Information</h3><div className="mt-2 grid grid-cols-2 gap-2 text-[10px]"><div className="rounded-2xl bg-slate-50 p-3"><span className="text-slate-400">Gender</span><p className="mt-1 font-bold">{selected.patient?.gender || '—'}</p></div><div className="rounded-2xl bg-slate-50 p-3"><span className="text-slate-400">Phone</span><p className="mt-1 font-bold">{selected.patient?.phone || '—'}</p></div><div className="rounded-2xl bg-slate-50 p-3"><span className="text-slate-400">Blood Group</span><p className="mt-1 font-bold">{selected.patient?.bloodGroup || '—'}</p></div><div className="rounded-2xl bg-slate-50 p-3"><span className="text-slate-400">Arrival Mode</span><p className="mt-1 font-bold">{selected.visit?.arrivalMode || '—'}</p></div></div></section>
          </>}
        </div>
      </div>}

      {activeModal && (
        <Modal
          title={activeModal === 'visit' ? 'Register Emergency Visit' : activeModal === 'triage' ? 'Structured Triage Assessment' : activeModal === 'bay' ? 'Assign Emergency Bay' : activeModal === 'order' ? 'Create ED Order' : 'Record Disposition'}
          eyebrow={activeModal === 'visit' ? 'Patient intake' : activeModal === 'triage' ? 'Clinical assessment' : activeModal === 'bay' ? 'Capacity management' : activeModal === 'order' ? 'Clinical orders' : 'Care transition'}
          description={activeModal === 'visit' ? 'Start a new emergency encounter and capture the reason for presentation.' : activeModal === 'triage' ? 'Record acuity and vital signs for emergency prioritization.' : activeModal === 'bay' ? 'Choose an available treatment space for this patient.' : activeModal === 'order' ? 'Create a laboratory, imaging, medication or other ED order.' : 'Record the patient’s next destination and trigger the appropriate downstream workflow.'}
          onClose={() => !submitting && setActiveModal(null)}
          icon={activeModal === 'visit' ? <Plus size={19} /> : activeModal === 'triage' ? <ClipboardList size={19} /> : activeModal === 'bay' ? <BedDouble size={19} /> : activeModal === 'order' ? <PackageCheck size={19} /> : <Hospital size={19} />}
        >
          {activeModal === 'visit' && (
            <form onSubmit={submitVisit} className="space-y-5">
              <FormSection title="Presentation" description="Basic information captured at ED arrival.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Patient" hint="Optional — leave blank for an unidentified / unregistered arrival">
                    {selectedPatientForVisit ? (
                      <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#1b7b68] shadow-sm"><UserCheck size={17} /></div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-800">{patientName(selectedPatientForVisit, {})}</p>
                            <p className="text-[11px] font-medium text-slate-500">{selectedPatientForVisit.mrn || 'No MRN'} · {selectedPatientForVisit.phone || 'No phone'}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => { setSelectedPatientForVisit(null); setVisitForm({ ...visitForm, patientId: '' }); setPatientSearch(''); }} className="shrink-0 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-500 hover:bg-white hover:text-slate-800">Change</button>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="relative">
                          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            className={`${inputClass} pl-10`}
                            value={patientSearch}
                            onChange={(e) => setPatientSearch(e.target.value)}
                            placeholder="Search name, MRN or phone…"
                          />
                        </div>
                        {patientSearch.trim() && (
                          <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                            {patientSearching ? (
                              <div className="flex items-center gap-2 px-4 py-4 text-xs font-semibold text-slate-500"><Loader2 size={15} className="animate-spin" /> Searching patients…</div>
                            ) : patientResults.length ? (
                              <div className="max-h-64 overflow-y-auto py-1">
                                {patientResults.map((patient) => (
                                  <button
                                    key={patient._id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedPatientForVisit(patient);
                                      setVisitForm((current) => ({ ...current, patientId: String(patient._id) }));
                                      setPatientSearch('');
                                      setPatientResults([]);
                                    }}
                                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                                  >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><UserRound size={16} /></div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-bold text-slate-800">{patientName(patient, {})}</p>
                                      <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">MRN: {patient.mrn || '—'} · {patient.phone || 'No phone'}</p>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#1b7b68]">Select</span>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="px-4 py-4">
                                <p className="text-xs font-bold text-slate-700">No matching patient found</p>
                                <p className="mt-1 text-[11px] text-slate-400">You can leave the patient blank and continue the emergency registration.</p>
                              </div>
                            )}
                          </div>
                        )}
                        {!patientSearch.trim() && (
                          <p className="mt-2 text-[11px] font-medium text-slate-400">Search the patient registry, or leave this field empty for an unidentified or unregistered arrival.</p>
                        )}
                      </div>
                    )}
                  </Field>
                  <Field label="Arrival Mode">
                    <Select value={visitForm.arrivalMode} onChange={(value) => setVisitForm({ ...visitForm, arrivalMode: value as ArrivalMode })} options={['WALK_IN','AMBULANCE','POLICE','REFERRAL','OTHER']} />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Chief Complaint" required>
                    <input required className={inputClass} value={visitForm.chiefComplaint} onChange={(e) => setVisitForm({ ...visitForm, chiefComplaint: e.target.value })} placeholder="Reason for emergency presentation" />
                  </Field>
                  <Field label="Trauma Type">
                    <Select value={visitForm.traumaType} onChange={(value) => setVisitForm({ ...visitForm, traumaType: value })} options={['NONE','BLUNT','PENETRATING','THERMAL','CHEMICAL','MULTI_SYSTEM']} />
                  </Field>
                </div>
              </FormSection>
              <FormSection title="Clinical notes" description="Add any immediate information useful to the receiving team.">
                <Field label="Notes">
                  <textarea className={textareaClass} value={visitForm.notes} onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })} placeholder="Optional arrival notes..." />
                </Field>
              </FormSection>
              <ModalFooter onCancel={() => setActiveModal(null)} loading={submitting} submitLabel="Register Visit" />
            </form>
          )}

          {activeModal === 'triage' && (
            <form onSubmit={submitTriage} className="space-y-5">
              <FormSection title="Acuity assessment" description="Use the selected scale to classify emergency priority.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Triage Scale"><Select value={triageForm.scale} onChange={(value) => setTriageForm({ ...triageForm, scale: value as TriageScale })} options={['ESI','CTAS']} /></Field>
                  <Field label="Acuity Level"><Select value={String(triageForm.acuityLevel)} onChange={(value) => setTriageForm({ ...triageForm, acuityLevel: Number(value) as AcuityLevel })} options={['1','2','3','4','5']} labels={{ '1': 'Level 1 — Resuscitation', '2': 'Level 2 — Emergent', '3': 'Level 3 — Urgent', '4': 'Level 4 — Less urgent', '5': 'Level 5 — Non-urgent' }} /></Field>
                </div>
                <Field label="Chief Complaint"><input className={inputClass} value={triageForm.chiefComplaint} onChange={(e) => setTriageForm({ ...triageForm, chiefComplaint: e.target.value })} placeholder="Clinical complaint at triage" /></Field>
              </FormSection>
              <FormSection title="Vital signs" description="Enter only values available at the time of triage.">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {[
                    ['Heart Rate', 'heartRateBpm', 'bpm'], ['Systolic BP', 'systolicBpMmHg', 'mmHg'], ['Diastolic BP', 'diastolicBpMmHg', 'mmHg'],
                    ['Respiratory Rate', 'respiratoryRateBpm', '/min'], ['SpO₂', 'oxygenSaturationPct', '%'], ['Temperature', 'temperatureCelsius', '°C'], ['Pain Scale', 'painScale', '/10'],
                  ].map(([label, key, unit]) => (
                    <Field key={key} label={label} hint={unit}>
                      <input type="number" step="any" className={inputClass} value={(triageForm as any)[key]} onChange={(e) => setTriageForm({ ...triageForm, [key]: e.target.value } as any)} placeholder="—" />
                    </Field>
                  ))}
                </div>
              </FormSection>
              <FormSection title="Assessment notes">
                <Field label="Notes"><textarea className={textareaClass} value={triageForm.notes} onChange={(e) => setTriageForm({ ...triageForm, notes: e.target.value })} placeholder="Clinical observations, risk factors or escalation notes..." /></Field>
              </FormSection>
              <ModalFooter onCancel={() => setActiveModal(null)} loading={submitting} submitLabel="Save Triage" />
            </form>
          )}

          {activeModal === 'bay' && (
            <form onSubmit={submitBay} className="space-y-5">
              <FormSection title="Treatment space" description="Available bays are listed based on current capacity.">
                <Field label="Available Bay" required>
                  <Select required value={bayForm.bayId} onChange={(value) => setBayForm({ ...bayForm, bayId: value })} options={['', ...bays.filter((b) => b.status === 'AVAILABLE').map((b) => String(b._id))]} labels={Object.fromEntries(bays.map((b) => [String(b._id), `${b.bayCode}${b.zone ? ` · ${b.zone}` : ''}`]))} placeholder="Select an available bay" />
                </Field>
                {!bays.some((b) => b.status === 'AVAILABLE') && <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-xs font-semibold text-amber-700">No bays are currently marked available.</div>}
                <Field label="Assignment reason" hint="Optional"><textarea className={textareaClass} value={bayForm.reason} onChange={(e) => setBayForm({ ...bayForm, reason: e.target.value })} placeholder="Optional assignment note..." /></Field>
              </FormSection>
              <ModalFooter onCancel={() => setActiveModal(null)} loading={submitting} submitLabel="Assign Bay" disabled={!bays.some((b) => b.status === 'AVAILABLE')} />
            </form>
          )}

          {activeModal === 'order' && (
            <form onSubmit={submitOrder} className="space-y-5">
              <FormSection title="Order details" description="Create a visible order for the ED care team.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Order Type"><Select value={orderForm.type} onChange={(value) => setOrderForm({ ...orderForm, type: value as OrderType })} options={['LAB','IMAGING','MEDICATION','OTHER']} /></Field>
                  <Field label="Order Name" required><input required className={inputClass} value={orderForm.name} onChange={(e) => setOrderForm({ ...orderForm, name: e.target.value })} placeholder="e.g. CBC, CT Head, IV medication" /></Field>
                </div>
                <Field label="Notes"><textarea className={textareaClass} value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} placeholder="Instructions or clinical context..." /></Field>
              </FormSection>
              <ModalFooter onCancel={() => setActiveModal(null)} loading={submitting} submitLabel="Create Order" />
            </form>
          )}

          {activeModal === 'disposition' && (
            <form onSubmit={submitDisposition} className="space-y-5">
              <FormSection title="Care destination" description="Choose the final disposition and provide the information required for the transition.">
                <Field label="Disposition"><Select value={dispositionForm.disposition} onChange={(value) => setDispositionForm({ ...dispositionForm, disposition: value as DispositionType })} options={['DISCHARGE','ADMIT','TRANSFER','DECEASED','LEFT_WITHOUT_BEING_SEEN','LEFT_AGAINST_MEDICAL_ADVICE']} labels={{ DISCHARGE: 'Discharge', ADMIT: 'Admit', TRANSFER: 'Transfer', DECEASED: 'Deceased', LEFT_WITHOUT_BEING_SEEN: 'Left without being seen', LEFT_AGAINST_MEDICAL_ADVICE: 'Left against medical advice' }} /></Field>
                {dispositionForm.disposition === 'ADMIT' && <Field label="Ward ID" required><input required className={inputClass} value={dispositionForm.wardId} onChange={(e) => setDispositionForm({ ...dispositionForm, wardId: e.target.value })} placeholder="Receiving ward ID" /></Field>}
                {dispositionForm.disposition === 'TRANSFER' && <Field label="Transfer Facility" required><input required className={inputClass} value={dispositionForm.transferFacility} onChange={(e) => setDispositionForm({ ...dispositionForm, transferFacility: e.target.value })} placeholder="Receiving facility" /></Field>}
                <Field label="Disposition notes"><textarea className={textareaClass} value={dispositionForm.notes} onChange={(e) => setDispositionForm({ ...dispositionForm, notes: e.target.value })} placeholder="Clinical handoff or disposition notes..." /></Field>
              </FormSection>
              <ModalFooter onCancel={() => setActiveModal(null)} loading={submitting} submitLabel="Record Disposition" danger={['DECEASED','LEFT_AGAINST_MEDICAL_ADVICE'].includes(dispositionForm.disposition)} />
            </form>
          )}
        </Modal>
      )}

      {toast && <div className="fixed bottom-5 right-5 z-60 flex max-w-sm items-center gap-2 rounded-2xl bg-slate-800 px-4 py-3 text-xs font-semibold text-white shadow-xl"><CheckCircle2 size={16} className="text-emerald-400" />{toast}</div>}
    </div>
  );
}

function Field({ label, children, hint, required }: { label: string; children: ReactNode; hint?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3 text-[11px] font-extrabold uppercase tracking-[0.06em] text-slate-500">
        <span>{label}{required && <span className="ml-1 text-rose-500">*</span>}</span>
        {hint && <span className="normal-case tracking-normal text-[10px] font-semibold text-slate-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Select({ value, onChange, options, labels, placeholder, required }: { value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string>; placeholder?: string; required?: boolean }) {
  return (
    <div className="relative">
      <select required={required} value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => <option key={option} value={option}>{labels?.[option] || option.replaceAll('_', ' ')}</option>)}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 mt-0.5 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="text-sm font-extrabold text-slate-800">{title}</h3>
        {description && <p className="mt-1 text-[11px] leading-5 text-slate-400">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function SubmitButton({ loading, children }: { loading: boolean; children: ReactNode }) {
  return <button disabled={loading} type="submit" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1b7b68] px-4 py-3 text-xs font-extrabold text-white disabled:opacity-60">{loading && <Loader2 size={15} className="animate-spin" />}{children}</button>;
}

function ModalFooter({ onCancel, loading, submitLabel, disabled, danger }: { onCancel: () => void; loading: boolean; submitLabel: string; disabled?: boolean; danger?: boolean }) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
      <button type="button" disabled={loading} onClick={onCancel} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-extrabold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">Cancel</button>
      <button type="submit" disabled={loading || disabled} className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-xs font-extrabold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#1b7b68] hover:bg-[#176b5b]'}`}>
        {loading && <Loader2 size={15} className="animate-spin" />}
        {submitLabel}
      </button>
    </div>
  );
}

function Modal({ title, eyebrow, description, icon, onClose, children }: { title: string; eyebrow: string; description: string; icon: ReactNode; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)] sm:max-h-[calc(100dvh-2.5rem)]">
        <div className="shrink-0 border-b border-slate-100 bg-white px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1b7b68]/10 text-[#1b7b68]">{icon}</div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#1b7b68]">{eyebrow}</p>
              <h2 className="mt-0.5 text-lg font-extrabold tracking-tight text-slate-800 sm:text-xl">{title}</h2>
              <p className="mt-1 text-[11px] leading-5 text-slate-400">{description}</p>
            </div>
            <button type="button" onClick={onClose} className="shrink-0 rounded-xl border border-slate-100 bg-slate-50 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close modal">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">{children}</div>
      </div>
    </div>
  );
}
