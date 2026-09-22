'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  Eye,
  Filter,
  HeartPulse,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
  XCircle,
} from 'lucide-react';

/* =========================================================
   HMO ENROLLEE REGISTRY
   Backend contract: /api/v1/enrollees
   ========================================================= */

const DEFAULT_HOST = 'https://medxverse-backend.onrender.com';
const RAW_API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  DEFAULT_HOST
).trim().replace(/\/+$/, '');
const API_BASE_URL = RAW_API_BASE_URL.endsWith('/api/v1')
  ? RAW_API_BASE_URL
  : `${RAW_API_BASE_URL}/api/v1`;
const ENROLLEES_API = `${API_BASE_URL}/enrollees`;
const BENEFITS_API = `${API_BASE_URL}/benefits`;


type Status = 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'PENDING';
type Gender = 'MALE' | 'FEMALE' | 'OTHER';
type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
type Relationship = 'PRIMARY' | 'SPOUSE' | 'CHILD' | 'DEPENDENT';

interface BenefitRef {
  _id: string;
  code?: string;
  name?: string;
  category?: string;
  status?: string;
}

interface ProviderRef {
  _id: string;
  name?: string;
  code?: string;
  state?: string;
}

interface PrimaryRef {
  _id: string;
  firstName?: string;
  lastName?: string;
  policyNumber?: string;
  email?: string;
  phone?: string;
  status?: string;
}

interface Enrollee {
  _id: string;
  policyNumber: string;
  firstName: string;
  lastName: string;
  otherNames?: string;
  email: string;
  phone: string;
  gender: Gender;
  dateOfBirth: string;
  maritalStatus?: MaritalStatus;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  benefitPlanId: BenefitRef | string;
  primaryProviderId?: ProviderRef | string;
  relationship: Relationship;
  primaryMemberId?: PrimaryRef | string;
  status: Status;
  startDate: string;
  endDate?: string;
  photoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Stats {
  total: number;
  active: number;
  pending: number;
  suspended: number;
  terminated: number;
  primaryMembers: number;
  dependents: number;
  expiringSoon: number;
}

interface ListResult {
  enrollees: Enrollee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Eligibility {
  eligible: boolean;
  status: Status;
  policyNumber: string;
  enrolleeId: string;
  benefitPlanId: string;
  coverageStartDate: string;
  coverageEndDate?: string;
  reason?: string;
}

interface FormState {
  policyNumber: string;
  firstName: string;
  lastName: string;
  otherNames: string;
  email: string;
  phone: string;
  gender: Gender;
  dateOfBirth: string;
  maritalStatus: MaritalStatus | '';
  street: string;
  city: string;
  state: string;
  country: string;
  benefitPlanId: string;
  primaryProviderId: string;
  relationship: Relationship;
  primaryMemberId: string;
  status: Status;
  startDate: string;
  endDate: string;
  photoUrl: string;
}

const EMPTY_STATS: Stats = {
  total: 0,
  active: 0,
  pending: 0,
  suspended: 0,
  terminated: 0,
  primaryMembers: 0,
  dependents: 0,
  expiringSoon: 0,
};

const EMPTY_FORM: FormState = {
  policyNumber: '',
  firstName: '',
  lastName: '',
  otherNames: '',
  email: '',
  phone: '',
  gender: 'MALE',
  dateOfBirth: '',
  maritalStatus: '',
  street: '',
  city: '',
  state: '',
  country: 'Nigeria',
  benefitPlanId: '',
  primaryProviderId: '',
  relationship: 'PRIMARY',
  primaryMemberId: '',
  status: 'ACTIVE',
  startDate: '',
  endDate: '',
  photoUrl: '',
};

function getAuthHeaders(json = false): HeadersInit {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('authToken')
    : null;

  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(Boolean(options?.body)),
      ...(options?.headers || {}),
    },
    cache: 'no-store',
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.message || json?.error || `Request failed (${response.status})`);
  }
  return json as T;
}

function moneyDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fullName(enrollee: Enrollee) {
  return `${enrollee.firstName} ${enrollee.lastName}`.trim();
}

function benefitName(value: Enrollee['benefitPlanId']) {
  if (typeof value === 'string') return value;
  return value?.name || value?.code || 'No benefit plan';
}

function benefitCode(value: Enrollee['benefitPlanId']) {
  if (typeof value === 'string') return '';
  return value?.code || '';
}

function primaryName(value?: Enrollee['primaryMemberId']) {
  if (!value) return '—';
  if (typeof value === 'string') return value;
  return `${value.firstName || ''} ${value.lastName || ''}`.trim() || value.policyNumber || '—';
}

function providerName(value?: Enrollee['primaryProviderId']) {
  if (!value) return '—';
  if (typeof value === 'string') return value;
  return value.name || value.code || '—';
}

function statusMeta(status: Status) {
  const map: Record<Status, { label: string; cls: string; icon: React.ReactNode }> = {
    ACTIVE: {
      label: 'Active',
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    PENDING: {
      label: 'Pending',
      cls: 'bg-amber-50 text-amber-700 border-amber-100',
      icon: <Clock3 className="h-3 w-3" />,
    },
    SUSPENDED: {
      label: 'Suspended',
      cls: 'bg-orange-50 text-orange-700 border-orange-100',
      icon: <XCircle className="h-3 w-3" />,
    },
    TERMINATED: {
      label: 'Terminated',
      cls: 'bg-rose-50 text-rose-700 border-rose-100',
      icon: <XCircle className="h-3 w-3" />,
    },
  };
  return map[status];
}

function relationshipLabel(value: Relationship) {
  return value === 'PRIMARY'
    ? 'Primary Member'
    : value.charAt(0) + value.slice(1).toLowerCase();
}

function toInputDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-700 outline-none transition focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/10';

const selectClass = inputClass;

function Modal({
  open,
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm">
      <div
        className={`max-h-[92vh] w-full overflow-hidden rounded-[28px] bg-white shadow-2xl ${
          wide ? 'max-w-5xl' : 'max-w-3xl'
        }`}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-800">{title}</h2>
            {subtitle && <p className="mt-1 text-[11px] font-medium text-slate-400">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function EnrolleesPage() {
  const [enrollees, setEnrollees] = useState<Enrollee[]>([]);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [benefits, setBenefits] = useState<BenefitRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Status>('ALL');
  const [relationshipFilter, setRelationshipFilter] = useState<'ALL' | Relationship>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 12;

  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editing, setEditing] = useState<Enrollee | null>(null);
  const [selected, setSelected] = useState<Enrollee | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [dependents, setDependents] = useState<Enrollee[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const loadBenefits = useCallback(async () => {
    try {
      const response = await apiJson<any>(`${BENEFITS_API}?page=1&limit=100`);
      const data = response?.data ?? response;
      setBenefits(Array.isArray(data?.packages) ? data.packages : Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Unable to load benefit packages:', err);
      setBenefits([]);
    }
  }, []);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (relationshipFilter !== 'ALL') params.set('relationship', relationshipFilter);

      const [listResponse, statsResponse] = await Promise.all([
        apiJson<{ success: boolean; data: ListResult }>(`${ENROLLEES_API}?${params.toString()}`),
        apiJson<{ success: boolean; data: Stats }>(`${ENROLLEES_API}/stats`),
      ]);

      const list = listResponse?.data;
      setEnrollees(Array.isArray(list?.enrollees) ? list.enrollees : []);
      setTotal(Number(list?.total || 0));
      setTotalPages(Math.max(1, Number(list?.totalPages || 1)));
      setStats(statsResponse?.data || EMPTY_STATS);
    } catch (err: any) {
      setEnrollees([]);
      setTotal(0);
      setTotalPages(1);
      setError(err?.message || 'Unable to load enrollee registry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, relationshipFilter, search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadBenefits();
  }, [loadBenefits]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, relationshipFilter]);

  const cards = useMemo(
    () => [
      { label: 'Total Enrollees', value: stats.total, icon: <Users className="h-4 w-4" />, cls: 'bg-[#e8f5f3] text-[#1b7b68]' },
      { label: 'Active Coverage', value: stats.active, icon: <BadgeCheck className="h-4 w-4" />, cls: 'bg-emerald-50 text-emerald-700' },
      { label: 'Primary Members', value: stats.primaryMembers, icon: <UserRound className="h-4 w-4" />, cls: 'bg-blue-50 text-blue-700' },
      { label: 'Dependants', value: stats.dependents, icon: <Users className="h-4 w-4" />, cls: 'bg-violet-50 text-violet-700' },
      { label: 'Expiring ≤30 Days', value: stats.expiringSoon, icon: <Clock3 className="h-4 w-4" />, cls: 'bg-amber-50 text-amber-700' },
    ],
    [stats]
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, startDate: toInputDate(new Date().toISOString()) });
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (item: Enrollee) => {
    setEditing(item);
    setForm({
      policyNumber: item.policyNumber || '',
      firstName: item.firstName || '',
      lastName: item.lastName || '',
      otherNames: item.otherNames || '',
      email: item.email || '',
      phone: item.phone || '',
      gender: item.gender || 'MALE',
      dateOfBirth: toInputDate(item.dateOfBirth),
      maritalStatus: item.maritalStatus || '',
      street: item.address?.street || '',
      city: item.address?.city || '',
      state: item.address?.state || '',
      country: item.address?.country || 'Nigeria',
      benefitPlanId: typeof item.benefitPlanId === 'string' ? item.benefitPlanId : item.benefitPlanId?._id || '',
      primaryProviderId: typeof item.primaryProviderId === 'string' ? item.primaryProviderId : item.primaryProviderId?._id || '',
      relationship: item.relationship || 'PRIMARY',
      primaryMemberId: typeof item.primaryMemberId === 'string' ? item.primaryMemberId : item.primaryMemberId?._id || '',
      status: item.status || 'ACTIVE',
      startDate: toInputDate(item.startDate),
      endDate: toInputDate(item.endDate),
      photoUrl: item.photoUrl || '',
    });
    setFormError('');
    setFormOpen(true);
  };

  const openView = async (item: Enrollee) => {
    setSelected(item);
    setEligibility(null);
    setDependents([]);
    setViewOpen(true);
    setDetailsLoading(true);

    try {
      const [detailResponse, eligibilityResponse, dependentsResponse] = await Promise.all([
        apiJson<{ success: boolean; data: Enrollee }>(`${ENROLLEES_API}/${item._id}`),
        apiJson<{ success: boolean; data: Eligibility }>(`${ENROLLEES_API}/${item._id}/eligibility`),
        item.relationship === 'PRIMARY'
          ? apiJson<{ success: boolean; data: Enrollee[] }>(`${ENROLLEES_API}/${item._id}/dependents`)
          : Promise.resolve(null),
      ]);

      setSelected(detailResponse?.data || item);
      setEligibility(eligibilityResponse?.data || null);
      setDependents(dependentsResponse?.data || []);
    } catch (err) {
      console.warn('Unable to load enrollee details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const saveEnrollee = async () => {
    setFormError('');

    if (!editing && !form.policyNumber.trim()) return setFormError('Policy number is required.');
    if (!form.firstName.trim()) return setFormError('First name is required.');
    if (!form.lastName.trim()) return setFormError('Last name is required.');
    if (!form.email.trim()) return setFormError('Email is required.');
    if (!form.phone.trim()) return setFormError('Phone number is required.');
    if (!form.dateOfBirth) return setFormError('Date of birth is required.');
    if (!form.benefitPlanId) return setFormError('Benefit plan is required.');
    if (form.relationship !== 'PRIMARY' && !form.primaryMemberId.trim()) {
      return setFormError('A primary member is required for a dependent enrollee.');
    }

    const payload: Record<string, unknown> = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      otherNames: form.otherNames.trim() || undefined,
      email: form.email.trim(),
      phone: form.phone.trim(),
      gender: form.gender,
      dateOfBirth: form.dateOfBirth,
      maritalStatus: form.maritalStatus || undefined,
      address: {
        street: form.street.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        country: form.country.trim() || undefined,
      },
      benefitPlanId: form.benefitPlanId,
      primaryProviderId: form.primaryProviderId.trim() || undefined,
      relationship: form.relationship,
      primaryMemberId: form.relationship === 'PRIMARY' ? undefined : form.primaryMemberId.trim(),
      status: form.status,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      photoUrl: form.photoUrl.trim() || undefined,
    };

    if (!editing) payload.policyNumber = form.policyNumber.trim().toUpperCase();

    try {
      setSaving(true);
      const response = await apiJson<{ success: boolean; data: Enrollee }>(
        editing ? `${ENROLLEES_API}/${editing._id}` : ENROLLEES_API,
        {
          method: editing ? 'PATCH' : 'POST',
          headers: getAuthHeaders(true),
          body: JSON.stringify(payload),
        }
      );

      setFormOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await load(true);
      if (response?.data) setSelected(response.data);
    } catch (err: any) {
      setFormError(err?.message || 'Unable to save enrollee.');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (item: Enrollee, status: Status) => {
    try {
      await apiJson(`${ENROLLEES_API}/${item._id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ status }),
      });
      await load(true);
      if (selected?._id === item._id) {
        setSelected({ ...item, status });
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to update enrollee status.');
    }
  };

  return (
    <div className="min-h-full space-y-6 font-sans text-slate-800 animate-in fade-in duration-300">
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="font-medium">{error}</span>
          <button type="button" onClick={() => setError('')} className="ml-auto rounded-lg p-1 hover:bg-rose-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-800">Enrollee Registry</h1>
            <span className="rounded-full bg-[#e8f5f3] px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-[#1b7b68]">HMO</span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-400">
            Manage members, dependants, coverage, benefit plans and eligibility.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => load(true)}
            className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-slate-500 transition hover:bg-[#e8f5f3] hover:text-[#1b7b68]"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#1b7b68] px-4 py-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#166b5b]"
          >
            <Plus className="h-4 w-4" />
            Add Enrollee
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className={`rounded-xl p-2 ${card.cls}`}>{card.icon}</span>
              <span className="text-2xl font-black text-slate-800">{card.value}</span>
            </div>
            <p className="mt-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search policy number, name, email or phone..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-xs font-medium outline-none transition focus:border-[#1b7b68] focus:bg-white"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-slate-400">
              <Filter className="h-3.5 w-3.5" /> Filters
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 outline-none">
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="TERMINATED">Terminated</option>
            </select>
            <select value={relationshipFilter} onChange={(e) => setRelationshipFilter(e.target.value as typeof relationshipFilter)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 outline-none">
              <option value="ALL">All Relationships</option>
              <option value="PRIMARY">Primary</option>
              <option value="SPOUSE">Spouse</option>
              <option value="CHILD">Child</option>
              <option value="DEPENDENT">Dependent</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Enrollee</th>
                <th className="px-6 py-4">Policy</th>
                <th className="px-6 py-4">Benefit Plan</th>
                <th className="px-6 py-4">Relationship</th>
                <th className="px-6 py-4">Coverage</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-20 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-[#1b7b68]" /><p className="mt-2 text-xs font-semibold text-slate-400">Loading enrollee registry...</p></td></tr>
              ) : enrollees.length === 0 ? (
                <tr><td colSpan={7} className="py-20 text-center"><Users className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm font-bold text-slate-600">No enrollees found</p><p className="mt-1 text-xs text-slate-400">Try changing your filters or add a new enrollee.</p></td></tr>
              ) : (
                enrollees.map((item) => {
                  const status = statusMeta(item.status);
                  return (
                    <tr key={item._id} className="border-b border-slate-50 transition hover:bg-[#e8f5f3]/20">
                      <td className="px-6 py-4">
                        <button type="button" onClick={() => openView(item)} className="text-left">
                          <div className="font-bold text-slate-800 hover:text-[#1b7b68]">{fullName(item)}</div>
                          <div className="mt-0.5 text-[10px] text-slate-400">{item.email}</div>
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-700">{item.policyNumber}</div>
                        <div className="mt-0.5 text-[10px] text-slate-400">{item.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-[180px] truncate font-semibold text-slate-700">{benefitName(item.benefitPlanId)}</div>
                        <div className="mt-0.5 text-[10px] text-slate-400">{benefitCode(item.benefitPlanId)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{relationshipLabel(item.relationship)}</span>
                        {item.relationship !== 'PRIMARY' && <div className="mt-1 text-[10px] text-slate-400">{primaryName(item.primaryMemberId)}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-semibold text-slate-700">{moneyDate(item.startDate)}</div>
                        <div className="mt-0.5 text-[10px] text-slate-400">to {item.endDate ? moneyDate(item.endDate) : 'Open-ended'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${status.cls}`}>{status.icon}{status.label}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button type="button" onClick={() => openView(item)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-[#e8f5f3] hover:text-[#1b7b68]" title="View">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => openEdit(item)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-[#e8f5f3] hover:text-[#1b7b68]" title="Edit">
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] font-medium text-slate-400">Showing {enrollees.length} of {total} enrollees</p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-xl border border-slate-200 p-2 text-slate-500 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <span className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-600">Page {page} of {totalPages}</span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-xl border border-slate-200 p-2 text-slate-500 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <Modal open={formOpen} title={editing ? 'Edit Enrollee' : 'Add New Enrollee'} subtitle="Maintain the member's demographic, coverage and benefit information." onClose={() => !saving && setFormOpen(false)} wide>
        <div className="max-h-[76vh] space-y-5 overflow-y-auto p-6">
          {formError && <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{formError}</span></div>}

          <section className="rounded-3xl border border-slate-100 bg-slate-50/50 p-5">
            <h3 className="text-sm font-extrabold text-slate-800">Identity & Contact</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Policy Number *"><input disabled={!!editing} value={form.policyNumber} onChange={(e) => setForm((f) => ({ ...f, policyNumber: e.target.value.toUpperCase() }))} className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-400`} placeholder="HMO-000123" /></Field>
              <Field label="First Name *"><input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className={inputClass} /></Field>
              <Field label="Last Name *"><input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className={inputClass} /></Field>
              <Field label="Other Names"><input value={form.otherNames} onChange={(e) => setForm((f) => ({ ...f, otherNames: e.target.value }))} className={inputClass} /></Field>
              <Field label="Email *"><input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputClass} /></Field>
              <Field label="Phone *"><input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputClass} /></Field>
              <Field label="Gender *"><select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as Gender }))} className={selectClass}><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></Field>
              <Field label="Date of Birth *"><input type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} className={inputClass} /></Field>
              <Field label="Marital Status"><select value={form.maritalStatus} onChange={(e) => setForm((f) => ({ ...f, maritalStatus: e.target.value as FormState['maritalStatus'] }))} className={selectClass}><option value="">Not specified</option><option value="SINGLE">Single</option><option value="MARRIED">Married</option><option value="DIVORCED">Divorced</option><option value="WIDOWED">Widowed</option></select></Field>
            </div>
          </section>

          <section className="rounded-3xl border border-emerald-100 bg-emerald-50/30 p-5">
            <h3 className="text-sm font-extrabold text-slate-800">Coverage & Membership</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Benefit Plan *"><select value={form.benefitPlanId} onChange={(e) => setForm((f) => ({ ...f, benefitPlanId: e.target.value }))} className={selectClass}><option value="">Select benefit plan</option>{benefits.map((plan) => <option key={plan._id} value={plan._id}>{plan.code ? `${plan.code} — ` : ''}{plan.name || plan._id}</option>)}</select>{benefits.length === 0 && <span className="mt-1 block text-[10px] text-amber-600">No benefit plans were returned. Create a plan in Benefits first.</span>}</Field>
              <Field label="Relationship"><select value={form.relationship} onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value as Relationship, primaryMemberId: e.target.value === 'PRIMARY' ? '' : f.primaryMemberId }))} className={selectClass}><option value="PRIMARY">Primary Member</option><option value="SPOUSE">Spouse</option><option value="CHILD">Child</option><option value="DEPENDENT">Dependent</option></select></Field>
              <Field label="Status"><select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Status }))} className={selectClass}><option value="ACTIVE">Active</option><option value="PENDING">Pending</option><option value="SUSPENDED">Suspended</option><option value="TERMINATED">Terminated</option></select></Field>
              {form.relationship !== 'PRIMARY' && <Field label="Primary Member ID *"><input value={form.primaryMemberId} onChange={(e) => setForm((f) => ({ ...f, primaryMemberId: e.target.value }))} className={inputClass} placeholder="MongoDB member ID" /></Field>}
              <Field label="Provider ID"><input value={form.primaryProviderId} onChange={(e) => setForm((f) => ({ ...f, primaryProviderId: e.target.value }))} className={inputClass} placeholder="Optional provider ID" /></Field>
              <Field label="Coverage Start"><input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} className={inputClass} /></Field>
              <Field label="Coverage End"><input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} className={inputClass} /></Field>
              <Field label="Photo URL" className="md:col-span-2"><input value={form.photoUrl} onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))} className={inputClass} placeholder="Optional profile photo URL" /></Field>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-100 bg-slate-50/50 p-5">
            <h3 className="text-sm font-extrabold text-slate-800">Address</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
              <Field label="Street" className="md:col-span-2"><input value={form.street} onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))} className={inputClass} /></Field>
              <Field label="City"><input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className={inputClass} /></Field>
              <Field label="State"><input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className={inputClass} /></Field>
              <Field label="Country"><input value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} className={inputClass} /></Field>
            </div>
          </section>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4">
          <button type="button" disabled={saving} onClick={() => setFormOpen(false)} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cancel</button>
          <button type="button" disabled={saving} onClick={saveEnrollee} className="inline-flex items-center gap-2 rounded-2xl bg-[#1b7b68] px-5 py-2.5 text-xs font-extrabold text-white disabled:opacity-60">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {editing ? 'Save Changes' : 'Create Enrollee'}
          </button>
        </div>
      </Modal>

      <Modal open={viewOpen} title={selected ? fullName(selected) : 'Enrollee Details'} subtitle={selected ? `${selected.policyNumber} · ${relationshipLabel(selected.relationship)}` : undefined} onClose={() => setViewOpen(false)} wide>
        {selected && (
          <div className="max-h-[78vh] overflow-y-auto p-6">
            {detailsLoading && <div className="mb-4 flex items-center gap-2 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin text-[#1b7b68]" /> Loading latest registry details...</div>}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <section className="rounded-3xl border border-slate-100 bg-slate-50/50 p-5 lg:col-span-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]"><UserRound className="h-6 w-6" /></div>
                    <div><h3 className="font-black text-slate-800">{fullName(selected)}</h3><p className="text-[10px] font-medium text-slate-400">{selected.email} · {selected.phone}</p></div>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusMeta(selected.status).cls}`}>{statusMeta(selected.status).icon}{statusMeta(selected.status).label}</span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div><p className="text-[9px] font-extrabold uppercase text-slate-400">Date of Birth</p><p className="mt-1 text-xs font-bold text-slate-700">{moneyDate(selected.dateOfBirth)}</p></div>
                  <div><p className="text-[9px] font-extrabold uppercase text-slate-400">Gender</p><p className="mt-1 text-xs font-bold text-slate-700">{selected.gender}</p></div>
                  <div><p className="text-[9px] font-extrabold uppercase text-slate-400">Relationship</p><p className="mt-1 text-xs font-bold text-slate-700">{relationshipLabel(selected.relationship)}</p></div>
                  <div><p className="text-[9px] font-extrabold uppercase text-slate-400">Policy</p><p className="mt-1 text-xs font-bold text-slate-700">{selected.policyNumber}</p></div>
                </div>
              </section>

              <section className={`rounded-3xl border p-5 ${eligibility?.eligible ? 'border-emerald-100 bg-emerald-50/50' : 'border-rose-100 bg-rose-50/50'}`}>
                <div className="flex items-center gap-2"><ShieldCheck className={`h-5 w-5 ${eligibility?.eligible ? 'text-emerald-600' : 'text-rose-500'}`} /><h3 className="text-sm font-extrabold text-slate-800">Eligibility</h3></div>
                {eligibility ? <><p className={`mt-4 text-2xl font-black ${eligibility.eligible ? 'text-emerald-700' : 'text-rose-700'}`}>{eligibility.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}</p><p className="mt-1 text-[10px] font-medium text-slate-500">{eligibility.reason || 'Coverage is active for the selected date.'}</p><div className="mt-4 text-[10px] text-slate-500">Coverage: <strong>{moneyDate(eligibility.coverageStartDate)}</strong> — <strong>{eligibility.coverageEndDate ? moneyDate(eligibility.coverageEndDate) : 'Open-ended'}</strong></div></> : <p className="mt-4 text-xs text-slate-400">Eligibility information unavailable.</p>}
              </section>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2"><HeartPulse className="h-4 w-4 text-[#1b7b68]" /><h3 className="text-sm font-extrabold text-slate-800">Coverage</h3></div>
                <div className="mt-4 space-y-3 text-xs"><div className="flex justify-between gap-4"><span className="text-slate-400">Benefit plan</span><strong className="text-right text-slate-700">{benefitName(selected.benefitPlanId)}</strong></div><div className="flex justify-between gap-4"><span className="text-slate-400">Provider</span><strong className="text-right text-slate-700">{providerName(selected.primaryProviderId)}</strong></div><div className="flex justify-between gap-4"><span className="text-slate-400">Start</span><strong className="text-slate-700">{moneyDate(selected.startDate)}</strong></div><div className="flex justify-between gap-4"><span className="text-slate-400">End</span><strong className="text-slate-700">{selected.endDate ? moneyDate(selected.endDate) : 'Open-ended'}</strong></div></div>
              </section>

              <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#1b7b68]" /><h3 className="text-sm font-extrabold text-slate-800">Membership</h3></div>
                <div className="mt-4 space-y-3 text-xs"><div className="flex justify-between gap-4"><span className="text-slate-400">Primary member</span><strong className="text-right text-slate-700">{primaryName(selected.primaryMemberId)}</strong></div><div className="flex justify-between gap-4"><span className="text-slate-400">Created</span><strong className="text-slate-700">{moneyDate(selected.createdAt)}</strong></div><div className="flex justify-between gap-4"><span className="text-slate-400">Marital status</span><strong className="text-slate-700">{selected.maritalStatus || '—'}</strong></div><div className="flex justify-between gap-4"><span className="text-slate-400">Address</span><strong className="max-w-[65%] text-right text-slate-700">{[selected.address?.street, selected.address?.city, selected.address?.state].filter(Boolean).join(', ') || '—'}</strong></div></div>
                </section>
              </div>

            {selected.relationship === 'PRIMARY' && (
              <section className="mt-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-[#1b7b68]" /><h3 className="text-sm font-extrabold text-slate-800">Dependants</h3></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">{dependents.length}</span></div>
                <div className="mt-4 overflow-x-auto">{dependents.length ? <table className="w-full text-left"><tbody>{dependents.map((dependent) => <tr key={dependent._id} className="border-b border-slate-50 last:border-0"><td className="py-3"><div className="text-xs font-bold text-slate-700">{fullName(dependent)}</div><div className="text-[10px] text-slate-400">{dependent.policyNumber}</div></td><td className="py-3 text-xs text-slate-500">{relationshipLabel(dependent.relationship)}</td><td className="py-3 text-right"><span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${statusMeta(dependent.status).cls}`}>{statusMeta(dependent.status).label}</span></td></tr>)}</tbody></table> : <p className="py-5 text-center text-xs text-slate-400">No dependants linked to this member.</p>}</div>
              </section>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => openEdit(selected)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"><Edit3 className="h-3.5 w-3.5" /> Edit</button>
              {selected.status !== 'ACTIVE' && <button type="button" onClick={() => changeStatus(selected, 'ACTIVE')} className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white">Activate</button>}
              {selected.status === 'ACTIVE' && <button type="button" onClick={() => changeStatus(selected, 'SUSPENDED')} className="rounded-2xl bg-orange-500 px-4 py-2.5 text-xs font-extrabold text-white">Suspend</button>}
              {selected.status !== 'TERMINATED' && <button type="button" onClick={() => changeStatus(selected, 'TERMINATED')} className="rounded-2xl bg-rose-600 px-4 py-2.5 text-xs font-extrabold text-white">Terminate</button>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
