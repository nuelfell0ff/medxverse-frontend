'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Edit3,
  Filter,
  Layers3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
  Eye,
  Ban,
} from 'lucide-react';

/* =========================================================
   HMO BENEFITS MANAGEMENT
   Backend contract:
   GET    /api/v1/benefits
   GET    /api/v1/benefits/:id
   POST   /api/v1/benefits
   PATCH  /api/v1/benefits/:id
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

type PackageStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

type BenefitCategory =
  | 'OUTPATIENT'
  | 'INPATIENT'
  | 'MATERNITY'
  | 'DENTAL'
  | 'OPTICAL'
  | 'SURGICAL'
  | 'EMERGENCY'
  | 'PHARMACY'
  | 'PREVENTIVE';

interface BenefitRule {
  category: BenefitCategory;
  isCovered: boolean;
  annualLimit?: number;
  perVisitLimit?: number;
  copayPercentage?: number;
  copayAmount?: number;
  requiresPreAuth: boolean;
  notes?: string;
}

interface BenefitPackage {
  _id: string;
  hmoId?: string;
  code: string;
  name: string;
  description?: string;
  tier?: string;
  annualMaxBenefit?: number;
  status: PackageStatus;
  rules: BenefitRule[];
  createdAt?: string;
  updatedAt?: string;
}

interface ApiListResponse {
  packages: BenefitPackage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PackageForm {
  code: string;
  name: string;
  description: string;
  tier: string;
  annualMaxBenefit: string;
  rules: BenefitRule[];
}

const CATEGORIES: BenefitCategory[] = [
  'OUTPATIENT',
  'INPATIENT',
  'MATERNITY',
  'DENTAL',
  'OPTICAL',
  'SURGICAL',
  'EMERGENCY',
  'PHARMACY',
  'PREVENTIVE',
];

const STATUS_OPTIONS: PackageStatus[] = [
  'DRAFT',
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED',
];

const EMPTY_RULE = (): BenefitRule => ({
  category: 'OUTPATIENT',
  isCovered: true,
  annualLimit: undefined,
  perVisitLimit: undefined,
  copayPercentage: 0,
  copayAmount: 0,
  requiresPreAuth: false,
  notes: '',
});

const EMPTY_FORM: PackageForm = {
  code: '',
  name: '',
  description: '',
  tier: '',
  annualMaxBenefit: '',
  rules: [],
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

function formatMoney(value?: number): string {
  if (typeof value !== 'number') return 'No annual maximum';

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);
}

function humanize(value?: string): string {
  if (!value) return '—';

  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function statusClasses(status: PackageStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case 'INACTIVE':
      return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'ARCHIVED':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-purple-50 text-purple-700 border-purple-100';
  }
}

function ruleSummary(pkg: BenefitPackage): string {
  const covered = pkg.rules.filter((rule) => rule.isCovered).length;
  return `${covered}/${pkg.rules.length} covered categories`;
}

export default function BenefitsPage() {
  const [packages, setPackages] = useState<BenefitPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PackageStatus | 'ALL'>('ALL');
  const [tierFilter, setTierFilter] = useState('ALL');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 12;

  const [modalOpen, setModalOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<BenefitPackage | null>(null);
  const [viewingPackage, setViewingPackage] = useState<BenefitPackage | null>(null);

  const [form, setForm] = useState<PackageForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchPackages = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    setError('');

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (tierFilter !== 'ALL') params.set('tier', tierFilter);

      const response = await fetch(
        `${API_BASE_URL}/benefits?${params.toString()}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
          cache: 'no-store',
        }
      );

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          json?.message ||
            json?.error ||
            `Failed to load benefit packages (${response.status})`
        );
      }

      const data = json?.data ?? json;

      const result: ApiListResponse = {
        packages: Array.isArray(data?.packages) ? data.packages : [],
        total: Number(data?.total || 0),
        page: Number(data?.page || page),
        limit: Number(data?.limit || limit),
        totalPages: Number(data?.totalPages || 1),
      };

      setPackages(result.packages);
      setTotal(result.total);
      setTotalPages(Math.max(1, result.totalPages));
    } catch (err: any) {
      console.error('Failed to load benefit packages:', err);
      setPackages([]);
      setTotal(0);
      setTotalPages(1);
      setError(err?.message || 'Unable to load benefit packages.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, search, statusFilter, tierFilter]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, tierFilter]);

  const tiers = useMemo(() => {
    const values = Array.from(
      new Set(
        packages
          .map((item) => item.tier?.trim())
          .filter(Boolean) as string[]
      )
    );

    return values.sort((a, b) => a.localeCompare(b));
  }, [packages]);

  const stats = useMemo(() => {
    return {
      total,
      active: packages.filter((item) => item.status === 'ACTIVE').length,
      draft: packages.filter((item) => item.status === 'DRAFT').length,
      inactive: packages.filter((item) => item.status === 'INACTIVE').length,
    };
  }, [packages, total]);

  const openCreate = () => {
    setEditingPackage(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (pkg: BenefitPackage) => {
    setEditingPackage(pkg);
    setForm({
      code: pkg.code || '',
      name: pkg.name || '',
      description: pkg.description || '',
      tier: pkg.tier || '',
      annualMaxBenefit:
        typeof pkg.annualMaxBenefit === 'number'
          ? String(pkg.annualMaxBenefit)
          : '',
      rules: pkg.rules?.map((rule) => ({ ...rule })) || [],
    });
    setFormError('');
    setModalOpen(true);
  };

  const openView = async (pkg: BenefitPackage) => {
    setViewingPackage(pkg);
    setViewOpen(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/benefits/${pkg._id}`,
        {
          headers: getAuthHeaders(),
          cache: 'no-store',
        }
      );

      const json = await response.json().catch(() => ({}));

      if (response.ok && json?.data) {
        setViewingPackage(json.data);
      }
    } catch (err) {
      console.error('Failed to load benefit package details:', err);
    }
  };

  const savePackage = async () => {
    setFormError('');

    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();

    if (!code) {
      setFormError('Benefit package code is required.');
      return;
    }

    if (!name) {
      setFormError('Benefit package name is required.');
      return;
    }

    if (
      form.annualMaxBenefit.trim() &&
      (!Number.isFinite(Number(form.annualMaxBenefit)) ||
        Number(form.annualMaxBenefit) < 0)
    ) {
      setFormError('Annual maximum benefit must be a non-negative number.');
      return;
    }

    const duplicateCategories = form.rules
      .map((rule) => rule.category)
      .filter((category, index, list) => list.indexOf(category) !== index);

    if (duplicateCategories.length) {
      setFormError(
        `Each benefit category can only appear once: ${duplicateCategories[0]}.`
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        code,
        name,
        description: form.description.trim() || undefined,
        tier: form.tier.trim() || undefined,
        annualMaxBenefit: form.annualMaxBenefit.trim()
          ? Number(form.annualMaxBenefit)
          : undefined,
        ...(editingPackage
          ? {
              rules: form.rules,
            }
          : {
              rules: form.rules,
            }),
      };

      const response = await fetch(
        editingPackage
          ? `${API_BASE_URL}/benefits/${editingPackage._id}`
          : `${API_BASE_URL}/benefits`,
        {
          method: editingPackage ? 'PATCH' : 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          json?.message ||
            json?.error ||
            `Failed to ${editingPackage ? 'update' : 'create'} benefit package (${response.status})`
        );
      }

      setModalOpen(false);
      setEditingPackage(null);
      setForm(EMPTY_FORM);

      await fetchPackages(true);
    } catch (err: any) {
      console.error('Failed to save benefit package:', err);
      setFormError(
        err?.message ||
          `Unable to ${editingPackage ? 'update' : 'create'} the benefit package.`
      );
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (
    pkg: BenefitPackage,
    status: PackageStatus
  ) => {
    if (pkg.status === status) return;

    try {
      setError('');

      const response = await fetch(
        `${API_BASE_URL}/benefits/${pkg._id}`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status }),
        }
      );

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          json?.message ||
            json?.error ||
            `Failed to change package status (${response.status})`
        );
      }

      await fetchPackages(true);
    } catch (err: any) {
      console.error('Failed to change benefit package status:', err);
      setError(err?.message || 'Unable to change package status.');
    }
  };

  const addRule = () => {
    const available = CATEGORIES.find(
      (category) => !form.rules.some((rule) => rule.category === category)
    );

    if (!available) {
      setFormError('All benefit categories have already been added.');
      return;
    }

    setFormError('');
    setForm((current) => ({
      ...current,
      rules: [
        ...current.rules,
        {
          ...EMPTY_RULE(),
          category: available,
        },
      ],
    }));
  };

  const updateRule = (
    index: number,
    patch: Partial<BenefitRule>
  ) => {
    setForm((current) => ({
      ...current,
      rules: current.rules.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, ...patch } : rule
      ),
    }));
  };

  const removeRule = (index: number) => {
    setForm((current) => ({
      ...current,
      rules: current.rules.filter((_, ruleIndex) => ruleIndex !== index),
    }));
  };

  return (
    <div className="min-h-full space-y-6 font-sans text-slate-800 animate-in fade-in duration-300">
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="font-medium">{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            className="ml-auto rounded-lg p-1 hover:bg-rose-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-800">
              Benefit Packages
            </h1>
            <span className="rounded-full bg-[#e8f5f3] px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-[#1b7b68]">
              HMO
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-400">
            Define, manage, and maintain the benefit plans offered by your HMO.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchPackages(true)}
            className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-slate-500 transition-all hover:bg-[#e8f5f3] hover:text-[#1b7b68]"
            title="Refresh benefit packages"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-2xl bg-[#1b7b68] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-[#145f50] hover:shadow"
          >
            <Plus className="h-4 w-4" />
            New Benefit Package
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Packages"
          value={stats.total}
          icon={ClipboardList}
          description="Packages in this HMO account"
        />
        <MetricCard
          label="Active"
          value={stats.active}
          icon={ShieldCheck}
          description="Active packages in current view"
        />
        <MetricCard
          label="Draft"
          value={stats.draft}
          icon={Layers3}
          description="Packages still being configured"
        />
        <MetricCard
          label="Inactive"
          value={stats.inactive}
          icon={Ban}
          description="Temporarily unavailable packages"
        />
      </div>

      {/* Main table */}
      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/30 p-5 xl:flex-row">
          <div className="relative w-full xl:w-96">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search package name or code..."
              className="w-full rounded-2xl border border-slate-200/80 bg-white py-2.5 pl-11 pr-4 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/20"
            />
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto">
            <Filter className="h-4 w-4 text-slate-400" />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as PackageStatus | 'ALL')
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:border-[#1b7b68]"
            >
              <option value="ALL">All Status</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {humanize(status)}
                </option>
              ))}
            </select>

            <select
              value={tierFilter}
              onChange={(event) => setTierFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:border-[#1b7b68]"
            >
              <option value="ALL">All Tiers</option>
              {tiers.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Package</th>
                <th className="px-6 py-4">Tier</th>
                <th className="px-6 py-4">Annual Maximum</th>
                <th className="px-6 py-4">Coverage Rules</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <TableSkeleton />
              ) : packages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="mx-auto max-w-xs space-y-2">
                      <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">
                        No benefit packages found
                      </p>
                      <p className="text-xs text-slate-400">
                        Try changing your filters or create a new benefit package.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                packages.map((pkg) => (
                  <tr
                    key={pkg._id}
                    className="group transition-all duration-150 hover:bg-[#e8f5f3]/20"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]">
                          <ClipboardList className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-800 transition-colors group-hover:text-[#1b7b68]">
                            {pkg.name}
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                            {pkg.code}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {pkg.tier ? (
                        <span className="rounded-xl bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                          {pkg.tier}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-700">
                        {formatMoney(pkg.annualMaxBenefit)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-slate-700">
                          {ruleSummary(pkg)}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {pkg.rules?.length || 0} configured categor
                          {(pkg.rules?.length || 0) === 1 ? 'y' : 'ies'}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${statusClasses(
                          pkg.status
                        )}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {humanize(pkg.status)}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-[11px] font-medium text-slate-500">
                      {formatDate(pkg.createdAt)}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openView(pkg)}
                          className="rounded-xl bg-slate-50 p-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-800"
                          title="View package"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => openEdit(pkg)}
                          className="rounded-xl bg-[#e8f5f3] p-2 text-[#1b7b68] transition-all hover:bg-[#1b7b68] hover:text-white"
                          title="Edit package"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>

                        {pkg.status === 'DRAFT' && (
                          <button
                            type="button"
                            onClick={() => changeStatus(pkg, 'ACTIVE')}
                            className="rounded-xl bg-emerald-50 px-2.5 py-2 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100"
                          >
                            Activate
                          </button>
                        )}

                        {pkg.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => changeStatus(pkg, 'INACTIVE')}
                            className="rounded-xl bg-amber-50 px-2.5 py-2 text-[10px] font-bold text-amber-700 hover:bg-amber-100"
                          >
                            Inactivate
                          </button>
                        )}

                        {pkg.status === 'INACTIVE' && (
                          <button
                            type="button"
                            onClick={() => changeStatus(pkg, 'ACTIVE')}
                            className="rounded-xl bg-emerald-50 px-2.5 py-2 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100"
                          >
                            Activate
                          </button>
                        )}

                        {pkg.status !== 'ARCHIVED' && (
                          <button
                            type="button"
                            onClick={() => changeStatus(pkg, 'ARCHIVED')}
                            className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                            title="Archive package"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
            <p className="text-[11px] font-medium text-slate-400">
              Page <span className="font-bold text-slate-600">{page}</span> of{' '}
              <span className="font-bold text-slate-600">{totalPages}</span>
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit modal */}
      {modalOpen && (
        <PackageEditorModal
          editingPackage={editingPackage}
          form={form}
          setForm={setForm}
          saving={saving}
          error={formError}
          onClose={() => {
            if (saving) return;
            setModalOpen(false);
          }}
          onSave={savePackage}
          onAddRule={addRule}
          onUpdateRule={updateRule}
          onRemoveRule={removeRule}
        />
      )}

      {/* View modal */}
      {viewOpen && viewingPackage && (
        <PackageViewModal
          pkg={viewingPackage}
          onClose={() => {
            setViewOpen(false);
            setViewingPackage(null);
          }}
          onEdit={() => {
            setViewOpen(false);
            openEdit(viewingPackage);
          }}
        />
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  description,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-800">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-4 text-[10px] font-medium text-slate-400">
        {description}
      </p>
    </div>
  );
}

function PackageEditorModal({
  editingPackage,
  form,
  setForm,
  saving,
  error,
  onClose,
  onSave,
  onAddRule,
  onUpdateRule,
  onRemoveRule,
}: {
  editingPackage: BenefitPackage | null;
  form: PackageForm;
  setForm: React.Dispatch<React.SetStateAction<PackageForm>>;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: () => void;
  onAddRule: () => void;
  onUpdateRule: (index: number, patch: Partial<BenefitRule>) => void;
  onRemoveRule: (index: number) => void;
}) {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {editingPackage ? 'Edit Benefit Package' : 'Create Benefit Package'}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Configure package identity, limits, and covered benefit categories.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-6">
          {error && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <section className="rounded-3xl border border-slate-100 bg-slate-50/40 p-5">
            <div className="mb-4">
              <h4 className="text-sm font-extrabold text-slate-800">
                Package Information
              </h4>
              <p className="mt-1 text-[11px] text-slate-400">
                The code must be unique within this HMO account.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Package Code *">
                <input
                  value={form.code}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      code: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="e.g. GOLD-2026"
                  className={inputClass}
                />
              </Field>

              <Field label="Package Name *">
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. Gold Health Plan"
                  className={inputClass}
                />
              </Field>

              <Field label="Tier">
                <input
                  value={form.tier}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      tier: event.target.value,
                    }))
                  }
                  placeholder="e.g. Gold, Silver, Corporate"
                  className={inputClass}
                />
              </Field>

              <Field label="Annual Maximum Benefit">
                <input
                  type="number"
                  min="0"
                  value={form.annualMaxBenefit}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      annualMaxBenefit: event.target.value,
                    }))
                  }
                  placeholder="e.g. 500000"
                  className={inputClass}
                />
              </Field>

              <Field label="Description" className="md:col-span-2">
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Describe who the package is designed for and its major coverage features..."
                  className={textareaClass}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-3xl border border-emerald-100 bg-emerald-50/30 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">
                  Benefit Rules
                </h4>
                <p className="mt-1 text-[11px] text-slate-400">
                  Set coverage, annual/per-visit limits, copays, and pre-authorisation requirements.
                </p>
              </div>

              <button
                type="button"
                onClick={onAddRule}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#1b7b68] px-3.5 py-2.5 text-[11px] font-bold text-white hover:bg-[#145f50]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Benefit Rule
              </button>
            </div>

            {form.rules.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                <Layers3 className="mx-auto h-7 w-7 text-slate-300" />
                <p className="mt-2 text-xs font-semibold text-slate-600">
                  No benefit rules configured
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  Add categories such as outpatient, inpatient, maternity, dental, or pharmacy.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {form.rules.map((rule, index) => {
                  const selectedCategories = new Set(
                    form.rules.map((item) => item.category)
                  );

                  return (
                    <div
                      key={`${rule.category}-${index}`}
                      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                    >
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-6">
                        <div className="lg:col-span-2">
                          <label className="mb-1.5 block text-[10px] font-extrabold text-slate-600">
                            Category
                          </label>
                          <select
                            value={rule.category}
                            onChange={(event) =>
                              onUpdateRule(index, {
                                category: event.target.value as BenefitCategory,
                              })
                            }
                            className={inputClass}
                          >
                            {CATEGORIES.map((category) => (
                              <option
                                key={category}
                                value={category}
                                disabled={
                                  selectedCategories.has(category) &&
                                  category !== rule.category
                                }
                              >
                                {humanize(category)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <NumberField
                          label="Annual Limit"
                          value={rule.annualLimit}
                          onChange={(value) =>
                            onUpdateRule(index, { annualLimit: value })
                          }
                        />

                        <NumberField
                          label="Per Visit Limit"
                          value={rule.perVisitLimit}
                          onChange={(value) =>
                            onUpdateRule(index, { perVisitLimit: value })
                          }
                        />

                        <NumberField
                          label="Copay %"
                          value={rule.copayPercentage}
                          onChange={(value) =>
                            onUpdateRule(index, { copayPercentage: value })
                          }
                          max={100}
                        />

                        <NumberField
                          label="Copay Amount"
                          value={rule.copayAmount}
                          onChange={(value) =>
                            onUpdateRule(index, { copayAmount: value })
                          }
                        />

                        <div className="flex items-end gap-2 lg:col-span-2">
                          <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={rule.isCovered}
                              onChange={(event) =>
                                onUpdateRule(index, {
                                  isCovered: event.target.checked,
                                })
                              }
                              className="h-3.5 w-3.5 accent-[#1b7b68]"
                            />
                            <span className="text-[10px] font-bold text-slate-600">
                              Covered
                            </span>
                          </label>

                          <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={rule.requiresPreAuth}
                              onChange={(event) =>
                                onUpdateRule(index, {
                                  requiresPreAuth: event.target.checked,
                                })
                              }
                              className="h-3.5 w-3.5 accent-[#1b7b68]"
                            />
                            <span className="text-[10px] font-bold text-slate-600">
                              Pre-auth
                            </span>
                          </label>

                          <button
                            type="button"
                            onClick={() => onRemoveRule(index)}
                            className="rounded-xl bg-rose-50 p-2.5 text-rose-600 hover:bg-rose-100"
                            title="Remove rule"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="lg:col-span-6">
                          <label className="mb-1.5 block text-[10px] font-extrabold text-slate-600">
                            Notes
                          </label>
                          <input
                            value={rule.notes || ''}
                            onChange={(event) =>
                              onUpdateRule(index, {
                                notes: event.target.value,
                              })
                            }
                            placeholder="Optional coverage notes or restrictions..."
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[#1b7b68] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#145f50] disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {editingPackage ? 'Save Changes' : 'Create Package'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PackageViewModal({
  pkg,
  onClose,
  onEdit,
}: {
  pkg: BenefitPackage;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">{pkg.name}</h3>
              <span
                className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase ${statusClasses(
                  pkg.status
                )}`}
              >
                {humanize(pkg.status)}
              </span>
            </div>
            <p className="mt-1 font-mono text-[10px] text-slate-400">
              {pkg.code}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryBox label="Tier" value={pkg.tier || 'Not specified'} />
            <SummaryBox
              label="Annual Maximum"
              value={formatMoney(pkg.annualMaxBenefit)}
            />
            <SummaryBox
              label="Coverage Rules"
              value={`${pkg.rules?.length || 0} categories`}
            />
          </div>

          {pkg.description && (
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Description
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-600">
                {pkg.description}
              </p>
            </div>
          )}

          <div>
            <div className="mb-3">
              <h4 className="text-sm font-extrabold text-slate-800">
                Coverage Rules
              </h4>
              <p className="mt-1 text-[10px] text-slate-400">
                The coverage configuration currently stored for this package.
              </p>
            </div>

            <div className="space-y-2">
              {pkg.rules?.length ? (
                pkg.rules.map((rule) => (
                  <div
                    key={rule.category}
                    className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-extrabold text-slate-800">
                            {humanize(rule.category)}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                              rule.isCovered
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {rule.isCovered ? 'Covered' : 'Not Covered'}
                          </span>
                        </div>

                        {rule.notes && (
                          <p className="mt-1 text-[10px] text-slate-400">
                            {rule.notes}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
                        <MiniStat
                          label="Annual"
                          value={
                            typeof rule.annualLimit === 'number'
                              ? formatMoney(rule.annualLimit)
                              : 'Unlimited'
                          }
                        />
                        <MiniStat
                          label="Per Visit"
                          value={
                            typeof rule.perVisitLimit === 'number'
                              ? formatMoney(rule.perVisitLimit)
                              : 'Unlimited'
                          }
                        />
                        <MiniStat
                          label="Copay"
                          value={
                            typeof rule.copayPercentage === 'number'
                              ? `${rule.copayPercentage}%`
                              : '0%'
                          }
                        />
                        <MiniStat
                          label="Pre-auth"
                          value={rule.requiresPreAuth ? 'Required' : 'No'}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-xs text-slate-400">
                  No benefit rules configured.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-2 rounded-xl bg-[#1b7b68] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#145f50]"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit Package
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xs font-extrabold text-slate-700">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2.5 py-2">
      <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 font-bold text-slate-700">{value}</p>
    </div>
  );
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
    <div className={className}>
      <label className="mb-1.5 block text-[10px] font-extrabold text-slate-600">
        {label}
      </label>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  max?: number;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-extrabold text-slate-600">
        {label}
      </label>
      <input
        type="number"
        min="0"
        max={max}
        value={typeof value === 'number' ? value : ''}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw === '' ? undefined : Number(raw));
        }}
        className={inputClass}
      />
    </div>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={index} className="animate-pulse border-b border-slate-100">
          <td className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-slate-200" />
              <div>
                <div className="mb-1.5 h-4 w-32 rounded-lg bg-slate-200" />
                <div className="h-3 w-20 rounded-lg bg-slate-100" />
              </div>
            </div>
          </td>
          <td className="px-6 py-4">
            <div className="h-6 w-20 rounded-xl bg-slate-200" />
          </td>
          <td className="px-6 py-4">
            <div className="h-4 w-28 rounded-lg bg-slate-200" />
          </td>
          <td className="px-6 py-4">
            <div className="h-4 w-24 rounded-lg bg-slate-200" />
          </td>
          <td className="px-6 py-4">
            <div className="h-6 w-20 rounded-full bg-slate-200" />
          </td>
          <td className="px-6 py-4">
            <div className="h-4 w-20 rounded-lg bg-slate-200" />
          </td>
          <td className="px-6 py-4">
            <div className="ml-auto h-8 w-28 rounded-xl bg-slate-200" />
          </td>
        </tr>
      ))}
    </>
  );
}

const inputClass =
  'h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10';

const textareaClass =
  'w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/50 px-3 py-3 text-xs font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10';