'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Edit3,
  Eye,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
  Archive,
  Ban,
} from 'lucide-react';

/* =========================================================
   HMO TARIFF MANAGEMENT
   Backend contract:
   GET    /api/v1/tariffs
   GET    /api/v1/tariffs/stats
   GET    /api/v1/tariffs/:id
   POST   /api/v1/tariffs
   PATCH  /api/v1/tariffs/:id
   PATCH  /api/v1/tariffs/:id/status
   POST   /api/v1/tariffs/quote
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
const TARIFFS_URL = `${API_BASE_URL}/tariffs`;

type TariffStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
type TariffCategory =
  | 'CONSULTATION'
  | 'LABORATORY'
  | 'RADIOLOGY'
  | 'PHARMACY'
  | 'PROCEDURE'
  | 'SURGERY'
  | 'INPATIENT'
  | 'OUTPATIENT'
  | 'EMERGENCY'
  | 'MATERNITY'
  | 'DENTAL'
  | 'OPTICAL'
  | 'OTHER';

interface ProviderRate {
  providerId: string;
  amount: number;
  notes?: string;
}

interface Tariff {
  _id: string;
  hmoId?: string;
  code: string;
  name: string;
  description?: string;
  category: TariffCategory;
  status: TariffStatus;
  baseAmount: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string;
  unit?: string;
  providerRates: ProviderRate[];
  requiresPreAuth: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface TariffStats {
  total: number;
  draft: number;
  active: number;
  inactive: number;
  archived: number;
}

interface ApiListResponse {
  tariffs: Tariff[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface TariffForm {
  code: string;
  name: string;
  description: string;
  category: TariffCategory;
  baseAmount: string;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string;
  unit: string;
  providerRates: ProviderRateForm[];
  requiresPreAuth: boolean;
  notes: string;
}

interface ProviderRateForm {
  providerId: string;
  amount: string;
  notes: string;
}

interface QuoteResult {
  tariffId: string;
  code: string;
  name: string;
  unitAmount: number;
  quantity: number;
  totalAmount: number;
  currency: string;
  requiresPreAuth: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
}

const CATEGORIES: TariffCategory[] = [
  'CONSULTATION',
  'LABORATORY',
  'RADIOLOGY',
  'PHARMACY',
  'PROCEDURE',
  'SURGERY',
  'INPATIENT',
  'OUTPATIENT',
  'EMERGENCY',
  'MATERNITY',
  'DENTAL',
  'OPTICAL',
  'OTHER',
];

const STATUS_OPTIONS: TariffStatus[] = [
  'DRAFT',
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED',
];

const EMPTY_PROVIDER_RATE = (): ProviderRateForm => ({
  providerId: '',
  amount: '',
  notes: '',
});

const EMPTY_FORM: TariffForm = {
  code: '',
  name: '',
  description: '',
  category: 'CONSULTATION',
  baseAmount: '',
  currency: 'NGN',
  effectiveFrom: '',
  effectiveTo: '',
  unit: 'SERVICE',
  providerRates: [],
  requiresPreAuth: false,
  notes: '',
};

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('authToken')
  );
}

function getAuthHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      json?.message ||
        json?.error ||
        `Request failed with status ${response.status}`
    );
  }
  return json as T;
}

function unwrap<T>(json: any): T {
  return (json?.data ?? json) as T;
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatDateTimeLocalValue(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatMoney(value: number, currency = 'NGN'): string {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${Number(value || 0).toLocaleString()}`;
  }
}

function humanize(value?: string): string {
  if (!value) return '—';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function statusClasses(status: TariffStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'border-emerald-100 bg-emerald-50 text-emerald-700';
    case 'INACTIVE':
      return 'border-amber-100 bg-amber-50 text-amber-700';
    case 'ARCHIVED':
      return 'border-slate-200 bg-slate-100 text-slate-600';
    default:
      return 'border-purple-100 bg-purple-50 text-purple-700';
  }
}

function categoryClasses(category: TariffCategory): string {
  if (category === 'EMERGENCY' || category === 'SURGERY') {
    return 'bg-rose-50 text-rose-700';
  }
  if (category === 'LABORATORY' || category === 'RADIOLOGY') {
    return 'bg-indigo-50 text-indigo-700';
  }
  if (category === 'PHARMACY') return 'bg-cyan-50 text-cyan-700';
  return 'bg-slate-100 text-slate-600';
}

export default function TariffsPage() {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [stats, setStats] = useState<TariffStats>({
    total: 0,
    draft: 0,
    active: 0,
    inactive: 0,
    archived: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TariffStatus | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<TariffCategory | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [modal, setModal] = useState<'form' | 'details' | 'quote' | null>(null);
  const [editingTariff, setEditingTariff] = useState<Tariff | null>(null);
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);
  const [form, setForm] = useState<TariffForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [workingStatus, setWorkingStatus] = useState<string | null>(null);

  const [quoteQuantity, setQuoteQuantity] = useState('1');
  const [quoteProviderId, setQuoteProviderId] = useState('');
  const [quoteDate, setQuoteDate] = useState('');
  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null);
  const [quoting, setQuoting] = useState(false);

  const clearFeedback = () => {
    setError('');
    setSuccess('');
  };

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${TARIFFS_URL}/stats`, {
        headers: getAuthHeaders(),
        cache: 'no-store',
      });
      const json = await parseResponse<any>(response);
      setStats(unwrap<TariffStats>(json));
    } catch (err: any) {
      console.error('Failed to load tariff stats:', err);
    }
  }, []);

  const fetchTariffs = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', '20');
        if (search.trim()) params.set('search', search.trim());
        if (statusFilter !== 'ALL') params.set('status', statusFilter);
        if (categoryFilter !== 'ALL') params.set('category', categoryFilter);

        const response = await fetch(`${TARIFFS_URL}?${params.toString()}`, {
          headers: getAuthHeaders(),
          cache: 'no-store',
        });
        const json = await parseResponse<any>(response);
        const data = unwrap<ApiListResponse>(json);
        setTariffs(Array.isArray(data?.tariffs) ? data.tariffs : []);
        setTotalPages(Math.max(1, Number(data?.totalPages) || 1));
        setError('');
      } catch (err: any) {
        console.error('Failed to load tariffs:', err);
        setError(err?.message || 'Unable to load tariffs.');
        setTariffs([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, search, statusFilter, categoryFilter]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchTariffs();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [fetchTariffs]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, providerRates: [] });
    setFormError('');
    setEditingTariff(null);
  };

  const openCreate = () => {
    clearFeedback();
    resetForm();
    setModal('form');
  };

  const openEdit = (tariff: Tariff) => {
    clearFeedback();
    setEditingTariff(tariff);
    setForm({
      code: tariff.code || '',
      name: tariff.name || '',
      description: tariff.description || '',
      category: tariff.category,
      baseAmount: String(tariff.baseAmount ?? ''),
      currency: tariff.currency || 'NGN',
      effectiveFrom: formatDateTimeLocalValue(tariff.effectiveFrom),
      effectiveTo: formatDateTimeLocalValue(tariff.effectiveTo),
      unit: tariff.unit || 'SERVICE',
      providerRates: (tariff.providerRates || []).map((rate) => ({
        providerId: String(rate.providerId),
        amount: String(rate.amount ?? ''),
        notes: rate.notes || '',
      })),
      requiresPreAuth: Boolean(tariff.requiresPreAuth),
      notes: tariff.notes || '',
    });
    setFormError('');
    setModal('form');
  };

  const openDetails = async (tariff: Tariff) => {
    clearFeedback();
    setSelectedTariff(tariff);
    setModal('details');

    try {
      const response = await fetch(`${TARIFFS_URL}/${tariff._id}`, {
        headers: getAuthHeaders(),
        cache: 'no-store',
      });
      const json = await parseResponse<any>(response);
      const detail = unwrap<Tariff>(json);
      if (detail?._id) setSelectedTariff(detail);
    } catch (err: any) {
      setError(err?.message || 'Unable to load tariff details.');
    }
  };

  const openQuote = (tariff: Tariff) => {
    clearFeedback();
    setSelectedTariff(tariff);
    setQuoteQuantity('1');
    setQuoteProviderId('');
    setQuoteDate('');
    setQuoteResult(null);
    setModal('quote');
  };

  const validateForm = (): boolean => {
    const code = form.code.trim();
    const name = form.name.trim();
    const baseAmount = Number(form.baseAmount);

    if (!code) return setFormError('Tariff code is required.'), false;
    if (!name) return setFormError('Tariff name is required.'), false;
    if (!Number.isFinite(baseAmount) || baseAmount < 0) {
      return setFormError('Base amount must be a non-negative number.'), false;
    }
    if (!form.effectiveFrom) {
      return setFormError('Effective from date is required.'), false;
    }
    if (form.effectiveTo && form.effectiveTo < form.effectiveFrom) {
      return setFormError('Effective to cannot be earlier than effective from.'), false;
    }
    if (!form.currency.trim()) {
      return setFormError('Currency is required.'), false;
    }

    const seen = new Set<string>();
    for (const rate of form.providerRates) {
      const providerId = rate.providerId.trim();
      if (!providerId) return setFormError('Every provider rate needs a provider ID.'), false;
      if (seen.has(providerId)) {
        return setFormError(`Duplicate provider rate for ${providerId}.`), false;
      }
      seen.add(providerId);
      const amount = Number(rate.amount);
      if (!Number.isFinite(amount) || amount < 0) {
        return setFormError(`Invalid provider amount for ${providerId}.`), false;
      }
    }

    return true;
  };

  const saveTariff = async () => {
    clearFeedback();
    setFormError('');
    if (!validateForm()) return;

    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      category: form.category,
      baseAmount: Number(form.baseAmount),
      currency: form.currency.trim().toUpperCase(),
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo || undefined,
      unit: form.unit.trim() || 'SERVICE',
      providerRates: form.providerRates.map((rate) => ({
        providerId: rate.providerId.trim(),
        amount: Number(rate.amount),
        notes: rate.notes.trim() || undefined,
      })),
      requiresPreAuth: form.requiresPreAuth,
      notes: form.notes.trim() || undefined,
    };

    try {
      setSaving(true);
      const response = await fetch(
        editingTariff ? `${TARIFFS_URL}/${editingTariff._id}` : TARIFFS_URL,
        {
          method: editingTariff ? 'PATCH' : 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );
      await parseResponse<any>(response);
      setModal(null);
      setSuccess(editingTariff ? 'Tariff updated successfully.' : 'Tariff created successfully.');
      await Promise.all([fetchTariffs(true), fetchStats()]);
    } catch (err: any) {
      console.error('Failed to save tariff:', err);
      setFormError(err?.message || 'Unable to save tariff.');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (tariff: Tariff, status: TariffStatus) => {
    if (tariff.status === status) return;
    clearFeedback();
    try {
      setWorkingStatus(tariff._id);
      const response = await fetch(`${TARIFFS_URL}/${tariff._id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      await parseResponse<any>(response);
      setSuccess(`Tariff status changed to ${humanize(status)}.`);
      await Promise.all([fetchTariffs(true), fetchStats()]);
    } catch (err: any) {
      console.error('Failed to change tariff status:', err);
      setError(err?.message || 'Unable to change tariff status.');
    } finally {
      setWorkingStatus(null);
    }
  };

  const runQuote = async () => {
    if (!selectedTariff) return;
    clearFeedback();
    const quantity = Number(quoteQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Quantity must be greater than 0.');
      return;
    }

    try {
      setQuoting(true);
      const response = await fetch(`${TARIFFS_URL}/quote`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          tariffId: selectedTariff._id,
          providerId: quoteProviderId.trim() || undefined,
          quantity,
          date: quoteDate || undefined,
        }),
      });
      const json = await parseResponse<any>(response);
      setQuoteResult(unwrap<QuoteResult>(json));
    } catch (err: any) {
      console.error('Failed to quote tariff:', err);
      setError(err?.message || 'Unable to calculate tariff quote.');
    } finally {
      setQuoting(false);
    }
  };

  const addProviderRate = () => {
    setForm((current) => ({
      ...current,
      providerRates: [...current.providerRates, EMPTY_PROVIDER_RATE()],
    }));
  };

  const removeProviderRate = (index: number) => {
    setForm((current) => ({
      ...current,
      providerRates: current.providerRates.filter((_, i) => i !== index),
    }));
  };

  const filteredStats = useMemo(
    () => [
      { label: 'Total tariffs', value: stats.total, icon: ClipboardList, tone: 'text-slate-700', bg: 'bg-slate-50' },
      { label: 'Active', value: stats.active, icon: CheckCircle2, tone: 'text-emerald-700', bg: 'bg-emerald-50' },
      { label: 'Draft', value: stats.draft, icon: Edit3, tone: 'text-purple-700', bg: 'bg-purple-50' },
      { label: 'Inactive', value: stats.inactive, icon: Ban, tone: 'text-amber-700', bg: 'bg-amber-50' },
      { label: 'Archived', value: stats.archived, icon: Archive, tone: 'text-slate-600', bg: 'bg-slate-100' },
    ],
    [stats]
  );

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="ml-auto rounded-lg p-1 hover:bg-rose-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess('')} className="ml-auto rounded-lg p-1 hover:bg-emerald-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-slate-800">Tariffs & Plans</h1>
                  <span className="rounded-full bg-[#e8f5f3] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1b7b68]">
                    HMO pricing control
                  </span>
                </div>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
                  Configure service tariffs, provider-specific rates, effective periods and pre-authorisation requirements used by the HMO for pricing and quotation.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void Promise.all([fetchTariffs(true), fetchStats()])}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-600 transition hover:border-[#1b7b68]/30 hover:bg-[#e8f5f3]/40 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#1b7b68] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#176957]"
            >
              <Plus className="h-4 w-4" />
              New tariff
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {filteredStats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.bg} ${item.tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xl font-black text-slate-800">{item.value}</span>
              </div>
              <p className="mt-3 text-[9px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search tariff code, name or description..."
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 text-xs font-medium text-slate-800 outline-none transition focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400">
              <Filter className="h-3.5 w-3.5" /> Filters
            </div>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as TariffStatus | 'ALL');
                setPage(1);
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 outline-none focus:border-[#1b7b68]"
            >
              <option value="ALL">All statuses</option>
              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
            </select>
            <select
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value as TariffCategory | 'ALL');
                setPage(1);
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 outline-none focus:border-[#1b7b68]"
            >
              <option value="ALL">All categories</option>
              {CATEGORIES.map((category) => <option key={category} value={category}>{humanize(category)}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Tariff</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Base amount</th>
                <th className="px-6 py-4">Effective period</th>
                <th className="px-6 py-4">Provider rates</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <TableSkeleton />
              ) : tariffs.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={<ClipboardList className="h-6 w-6" />}
                      title="No tariffs found"
                      description="Create a tariff or adjust the current search and filters."
                      action={<button type="button" onClick={openCreate} className="rounded-xl bg-[#1b7b68] px-3.5 py-2 text-[10px] font-extrabold text-white"><Plus className="mr-1.5 inline h-3.5 w-3.5" /> New tariff</button>}
                    />
                  </td>
                </tr>
              ) : (
                tariffs.map((tariff) => (
                  <tr key={tariff._id} className="transition hover:bg-[#e8f5f3]/20">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]">
                          <ClipboardList className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-slate-800">{tariff.name}</p>
                          <p className="mt-1 font-mono text-[9px] font-bold text-slate-400">{tariff.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${categoryClasses(tariff.category)}`}>{humanize(tariff.category)}</span>
                      {tariff.requiresPreAuth && <div className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-bold text-amber-600"><ShieldCheck className="h-3 w-3" /> Pre-auth</div>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-black text-slate-800">{formatMoney(tariff.baseAmount, tariff.currency)}</p>
                      <p className="mt-1 text-[9px] font-semibold text-slate-400">per {tariff.unit || 'SERVICE'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[10px] font-bold text-slate-700">{formatDate(tariff.effectiveFrom)}</p>
                      <p className="mt-1 text-[9px] text-slate-400">to {tariff.effectiveTo ? formatDate(tariff.effectiveTo) : 'No expiry'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-xl bg-slate-50 px-2.5 py-1.5 text-[10px] font-extrabold text-slate-600">{tariff.providerRates?.length || 0} override{(tariff.providerRates?.length || 0) === 1 ? '' : 's'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold ${statusClasses(tariff.status)}`}>{humanize(tariff.status)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" onClick={() => openDetails(tariff)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" title="View"><Eye className="h-4 w-4" /></button>
                        <button type="button" onClick={() => openEdit(tariff)} className="rounded-xl p-2 text-[#1b7b68] hover:bg-[#e8f5f3]" title="Edit"><Edit3 className="h-4 w-4" /></button>
                        <button type="button" onClick={() => openQuote(tariff)} disabled={tariff.status !== 'ACTIVE'} className="rounded-xl p-2 text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-30" title="Quote"><Calculator className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] font-semibold text-slate-400">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="rounded-xl border border-slate-200 p-2 text-slate-500 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <span className="min-w-10 text-center text-[10px] font-extrabold text-slate-600">{page}</span>
            <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className="rounded-xl border border-slate-200 p-2 text-slate-500 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </section>

      {modal === 'form' && (
        <Modal title={editingTariff ? 'Edit tariff' : 'Create tariff'} onClose={() => setModal(null)} wide>
          <div className="space-y-5 overflow-y-auto p-6">
            {formError && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700"><AlertCircle className="mr-2 inline h-4 w-4" />{formError}</div>}

            <section className="rounded-3xl border border-slate-100 bg-slate-50/40 p-5">
              <div className="mb-4"><h4 className="text-sm font-extrabold text-slate-800">Tariff information</h4><p className="mt-1 text-[11px] text-slate-400">Define the service, category, base price and effective period.</p></div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Tariff Code *"><input value={form.code} onChange={(e) => setForm((c) => ({ ...c, code: e.target.value.toUpperCase() }))} placeholder="e.g. CONS-001" className={inputClass} /></Field>
                <Field label="Tariff Name *"><input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} placeholder="e.g. Specialist Consultation" className={inputClass} /></Field>
                <Field label="Category *"><select value={form.category} onChange={(e) => setForm((c) => ({ ...c, category: e.target.value as TariffCategory }))} className={inputClass}>{CATEGORIES.map((category) => <option key={category} value={category}>{humanize(category)}</option>)}</select></Field>
                <Field label="Unit"><input value={form.unit} onChange={(e) => setForm((c) => ({ ...c, unit: e.target.value }))} placeholder="SERVICE" className={inputClass} /></Field>
                <Field label="Base Amount *"><input type="number" min="0" step="0.01" value={form.baseAmount} onChange={(e) => setForm((c) => ({ ...c, baseAmount: e.target.value }))} placeholder="0.00" className={inputClass} /></Field>
                <Field label="Currency *"><input value={form.currency} onChange={(e) => setForm((c) => ({ ...c, currency: e.target.value.toUpperCase() }))} placeholder="NGN" maxLength={3} className={inputClass} /></Field>
                <Field label="Effective From *"><input type="date" value={form.effectiveFrom} onChange={(e) => setForm((c) => ({ ...c, effectiveFrom: e.target.value }))} className={inputClass} /></Field>
                <Field label="Effective To"><input type="date" value={form.effectiveTo} onChange={(e) => setForm((c) => ({ ...c, effectiveTo: e.target.value }))} className={inputClass} /></Field>
                <Field label="Description" className="md:col-span-2"><textarea rows={3} value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} placeholder="Describe the service covered by this tariff..." className={textareaClass} /></Field>
                <Field label="Internal Notes" className="md:col-span-2"><textarea rows={2} value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} placeholder="Optional operational notes..." className={textareaClass} /></Field>
                <label className="md:col-span-2 flex cursor-pointer items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-3.5">
                  <input type="checkbox" checked={form.requiresPreAuth} onChange={(e) => setForm((c) => ({ ...c, requiresPreAuth: e.target.checked }))} className="h-4 w-4 accent-[#1b7b68]" />
                  <span><span className="block text-xs font-extrabold text-slate-700">Requires pre-authorisation</span><span className="mt-0.5 block text-[10px] text-slate-400">Flag this tariff for pre-authorisation workflows.</span></span>
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-[#1b7b68]/10 bg-[#e8f5f3]/30 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><h4 className="text-sm font-extrabold text-slate-800">Provider-specific rates</h4><p className="mt-1 text-[11px] text-slate-400">Optional overrides for individual providers. Provider IDs must match your provider records.</p></div>
                <button type="button" onClick={addProviderRate} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[10px] font-extrabold text-[#1b7b68] shadow-sm ring-1 ring-[#1b7b68]/10"><Plus className="h-3.5 w-3.5" /> Add rate</button>
              </div>

              {form.providerRates.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white/60 p-5 text-center text-[10px] font-semibold text-slate-400">No provider overrides. The base tariff applies.</div>
              ) : (
                <div className="mt-4 space-y-3">
                  {form.providerRates.map((rate, index) => (
                    <div key={index} className="rounded-2xl border border-slate-100 bg-white p-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1fr_1.4fr_auto] md:items-end">
                        <Field label="Provider ID"><input value={rate.providerId} onChange={(e) => setForm((c) => ({ ...c, providerRates: c.providerRates.map((r, i) => i === index ? { ...r, providerId: e.target.value } : r) }))} placeholder="MongoDB provider ID" className={inputClass} /></Field>
                        <Field label="Provider Amount"><input type="number" min="0" step="0.01" value={rate.amount} onChange={(e) => setForm((c) => ({ ...c, providerRates: c.providerRates.map((r, i) => i === index ? { ...r, amount: e.target.value } : r) }))} placeholder="0.00" className={inputClass} /></Field>
                        <Field label="Notes"><input value={rate.notes} onChange={(e) => setForm((c) => ({ ...c, providerRates: c.providerRates.map((r, i) => i === index ? { ...r, notes: e.target.value } : r) }))} placeholder="Optional" className={inputClass} /></Field>
                        <button type="button" onClick={() => removeProviderRate(index)} className="mb-0.5 rounded-xl p-2.5 text-rose-500 hover:bg-rose-50"><X className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4">
            <button type="button" onClick={() => setModal(null)} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-extrabold text-slate-600">Cancel</button>
            <button type="button" onClick={() => void saveTariff()} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-[#1b7b68] px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{editingTariff ? 'Save changes' : 'Create tariff'}</button>
          </div>
        </Modal>
      )}

      {modal === 'details' && selectedTariff && (
        <Modal title="Tariff details" onClose={() => setModal(null)} wide>
          <div className="space-y-5 overflow-y-auto p-6">
            <section className="rounded-3xl border border-slate-100 bg-slate-50/40 p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black text-slate-800">{selectedTariff.name}</h3><span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold ${statusClasses(selectedTariff.status)}`}>{humanize(selectedTariff.status)}</span></div><p className="mt-1 font-mono text-[10px] font-bold text-slate-400">{selectedTariff.code}</p></div>
                <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${categoryClasses(selectedTariff.category)}`}>{humanize(selectedTariff.category)}</span>
              </div>
              {selectedTariff.description && <p className="mt-4 text-xs leading-5 text-slate-500">{selectedTariff.description}</p>}
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                <SummaryBox label="Base amount" value={formatMoney(selectedTariff.baseAmount, selectedTariff.currency)} />
                <SummaryBox label="Unit" value={selectedTariff.unit || 'SERVICE'} />
                <SummaryBox label="Effective from" value={formatDate(selectedTariff.effectiveFrom)} />
                <SummaryBox label="Effective to" value={selectedTariff.effectiveTo ? formatDate(selectedTariff.effectiveTo) : 'No expiry'} />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-5">
              <div className="flex items-center justify-between"><div><h4 className="text-sm font-extrabold text-slate-800">Provider rates</h4><p className="mt-1 text-[10px] text-slate-400">Provider-specific overrides for this tariff.</p></div><span className="rounded-xl bg-slate-50 px-2.5 py-1.5 text-[10px] font-extrabold text-slate-500">{selectedTariff.providerRates?.length || 0}</span></div>
              <div className="mt-4 space-y-2">{selectedTariff.providerRates?.length ? selectedTariff.providerRates.map((rate, index) => <div key={`${String(rate.providerId)}-${index}`} className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-[10px] font-bold text-slate-700">{String(rate.providerId)}</p>{rate.notes && <p className="mt-1 text-[9px] text-slate-400">{rate.notes}</p>}</div><span className="text-sm font-black text-slate-800">{formatMoney(rate.amount, selectedTariff.currency)}</span></div>) : <p className="rounded-2xl bg-slate-50 p-4 text-center text-[10px] font-semibold text-slate-400">No provider-specific rates configured.</p>}</div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-5">
              <div className="flex flex-wrap gap-2">
                {selectedTariff.requiresPreAuth && <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[9px] font-bold text-amber-700"><ShieldCheck className="h-3.5 w-3.5" /> Requires pre-authorisation</span>}
                {!selectedTariff.requiresPreAuth && <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[9px] font-bold text-emerald-700">Pre-authorisation not required</span>}
              </div>
              {selectedTariff.notes && <p className="mt-4 text-xs leading-5 text-slate-500">{selectedTariff.notes}</p>}
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-5">
              <h4 className="text-sm font-extrabold text-slate-800">Lifecycle</h4>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {STATUS_OPTIONS.map((status) => (
                  <button key={status} type="button" disabled={workingStatus === selectedTariff._id || selectedTariff.status === status} onClick={() => void changeStatus(selectedTariff, status)} className={`rounded-2xl border px-3 py-3 text-[10px] font-extrabold transition ${selectedTariff.status === status ? statusClasses(status) : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-[#1b7b68]/20 hover:bg-[#e8f5f3]/30'} disabled:opacity-50`}>{workingStatus === selectedTariff._id && selectedTariff.status !== status ? 'Updating...' : humanize(status)}</button>
                ))}
              </div>
            </section>
          </div>
        </Modal>
      )}

      {modal === 'quote' && selectedTariff && (
        <Modal title="Calculate tariff quote" onClose={() => setModal(null)}>
          <div className="space-y-5 p-6">
            <div className="rounded-3xl bg-[#e8f5f3] p-5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#1b7b68]">Selected tariff</p>
              <h3 className="mt-1 text-lg font-black text-slate-800">{selectedTariff.name}</h3>
              <p className="mt-1 font-mono text-[10px] font-bold text-slate-400">{selectedTariff.code}</p>
            </div>
            <Field label="Quantity"><input type="number" min="0.01" step="0.01" value={quoteQuantity} onChange={(e) => setQuoteQuantity(e.target.value)} className={inputClass} /></Field>
            <Field label="Provider ID (optional)"><input value={quoteProviderId} onChange={(e) => setQuoteProviderId(e.target.value)} placeholder="Use provider-specific rate when available" className={inputClass} /></Field>
            <Field label="Quote date (optional)"><input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} className={inputClass} /></Field>
            <button type="button" onClick={() => void runQuote()} disabled={quoting} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1b7b68] px-4 py-3 text-xs font-extrabold text-white disabled:opacity-50">{quoting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />} Calculate quote</button>
            {quoteResult && <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5"><div className="grid grid-cols-2 gap-3"><SummaryBox label="Unit amount" value={formatMoney(quoteResult.unitAmount, quoteResult.currency)} /><SummaryBox label="Quantity" value={String(quoteResult.quantity)} /><SummaryBox label="Total amount" value={formatMoney(quoteResult.totalAmount, quoteResult.currency)} /><SummaryBox label="Pre-authorisation" value={quoteResult.requiresPreAuth ? 'Required' : 'Not required'} /></div></div>}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl ${wide ? 'max-w-5xl' : 'max-w-lg'}`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-black text-slate-800">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">{icon}</div>
      <p className="mt-3 text-sm font-extrabold text-slate-700">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-[10px] font-semibold leading-5 text-slate-400">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-xs font-extrabold text-slate-700">{value}</p>
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[10px] font-extrabold text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={index} className="animate-pulse border-b border-slate-100">
          <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-2xl bg-slate-200" /><div><div className="mb-1.5 h-4 w-32 rounded-lg bg-slate-200" /><div className="h-3 w-20 rounded-lg bg-slate-100" /></div></div></td>
          <td className="px-6 py-4"><div className="h-6 w-24 rounded-xl bg-slate-200" /></td>
          <td className="px-6 py-4"><div className="h-4 w-24 rounded-lg bg-slate-200" /></td>
          <td className="px-6 py-4"><div className="h-4 w-28 rounded-lg bg-slate-200" /></td>
          <td className="px-6 py-4"><div className="h-6 w-20 rounded-xl bg-slate-200" /></td>
          <td className="px-6 py-4"><div className="h-6 w-20 rounded-full bg-slate-200" /></td>
          <td className="px-6 py-4"><div className="ml-auto h-8 w-24 rounded-xl bg-slate-200" /></td>
        </tr>
      ))}
    </>
  );
}

const inputClass = 'h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10';
const textareaClass = 'w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/50 px-3 py-3 text-xs font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10';
