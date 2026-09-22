'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  AlertCircle,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Edit3,
  Eye,
  Filter,
  Layers3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';

/**
 * =========================================================
 * HMO BENEFITS MANAGEMENT
 * =========================================================
 *
 * Backend contract:
 *
 * GET    /api/v1/benefits
 * GET    /api/v1/benefits/:id
 * POST   /api/v1/benefits
 * PATCH  /api/v1/benefits/:id
 *
 * Benefits are reusable benefit definitions.
 *
 * Health Plans are managed separately at:
 * /hmo/health-plans
 *
 * A Health Plan can associate one or more benefits.
 * =========================================================
 */

const DEFAULT_HOST =
  'https://medxverse-backend.onrender.com';

const RAW_API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  DEFAULT_HOST
)
  .trim()
  .replace(/\/+$/, '');

const API_BASE_URL = RAW_API_BASE_URL.endsWith('/api/v1')
  ? RAW_API_BASE_URL
  : `${RAW_API_BASE_URL}/api/v1`;

/* =========================================================
   TYPES
========================================================= */

type BenefitStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'ARCHIVED';

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

type LimitType =
  | 'NONE'
  | 'ANNUAL'
  | 'VISIT'
  | 'BOTH';

interface BenefitLimit {
  type?: LimitType;
  annualAmount?: number;
  annualVisits?: number;
  perVisitAmount?: number;
  perVisitVisits?: number;
}

interface BenefitExclusion {
  name: string;
  description?: string;
}

interface WaitingPeriod {
  enabled?: boolean;
  days?: number;
  description?: string;
}

interface CopayConfig {
  percentage?: number;
  fixedAmount?: number;
}

interface DeductibleConfig {
  enabled?: boolean;
  amount?: number;
  frequency?: 'ANNUAL' | 'VISIT' | 'ADMISSION';
}

interface Benefit {

  _id: string;

  hmoId?: string;

  code: string;

  name: string;

  description?: string;

  category: BenefitCategory;

  status: BenefitStatus;

  isCovered?: boolean;

  requiresPreAuth?: boolean;

  limit?: BenefitLimit;

  exclusions?: BenefitExclusion[];

  waitingPeriod?: WaitingPeriod;

  copay?: CopayConfig;

  deductible?: DeductibleConfig;

  notes?: string;

  createdAt?: string;

  updatedAt?: string;
}

interface ApiListResponse {

  benefits: Benefit[];

  total: number;

  page: number;

  limit: number;

  totalPages: number;
}

interface BenefitForm {

  code: string;

  name: string;

  description: string;

  category: BenefitCategory;

  isCovered: boolean;

  requiresPreAuth: boolean;

  limitType: LimitType;

  annualAmount: string;

  annualVisits: string;

  perVisitAmount: string;

  perVisitVisits: string;

  waitingEnabled: boolean;

  waitingDays: string;

  waitingDescription: string;

  copayPercentage: string;

  copayFixedAmount: string;

  deductibleEnabled: boolean;

  deductibleAmount: string;

  deductibleFrequency:
    | 'ANNUAL'
    | 'VISIT'
    | 'ADMISSION';

  exclusions: BenefitExclusion[];

  notes: string;
}

/* =========================================================
   CONSTANTS
========================================================= */

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

const STATUS_OPTIONS: BenefitStatus[] = [
  'DRAFT',
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED',
];

const LIMIT_OPTIONS: LimitType[] = [
  'NONE',
  'ANNUAL',
  'VISIT',
  'BOTH',
];

const EMPTY_FORM: BenefitForm = {
  code: '',
  name: '',
  description: '',
  category: 'OUTPATIENT',

  isCovered: true,
  requiresPreAuth: false,

  limitType: 'NONE',

  annualAmount: '',
  annualVisits: '',
  perVisitAmount: '',
  perVisitVisits: '',

  waitingEnabled: false,
  waitingDays: '',
  waitingDescription: '',

  copayPercentage: '',
  copayFixedAmount: '',

  deductibleEnabled: false,
  deductibleAmount: '',
  deductibleFrequency: 'ANNUAL',

  exclusions: [],

  notes: '',
};

/* =========================================================
   HELPERS
========================================================= */

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
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
}

function formatDate(value?: string): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatMoney(value?: number): string {
  if (typeof value !== 'number') {
    return 'Unlimited';
  }

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
    .map(
      (part) =>
        part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join(' ');
}

function statusClasses(status: BenefitStatus): string {
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

function categoryClasses(category: BenefitCategory): string {
  switch (category) {
    case 'INPATIENT':
      return 'bg-blue-50 text-blue-700';

    case 'MATERNITY':
      return 'bg-pink-50 text-pink-700';

    case 'DENTAL':
      return 'bg-cyan-50 text-cyan-700';

    case 'OPTICAL':
      return 'bg-indigo-50 text-indigo-700';

    case 'SURGICAL':
      return 'bg-orange-50 text-orange-700';

    case 'EMERGENCY':
      return 'bg-rose-50 text-rose-700';

    case 'PHARMACY':
      return 'bg-violet-50 text-violet-700';

    case 'PREVENTIVE':
      return 'bg-teal-50 text-teal-700';

    default:
      return 'bg-emerald-50 text-emerald-700';
  }
}

function buildLimitFromForm(
  form: BenefitForm
): BenefitLimit | undefined {
  if (form.limitType === 'NONE') {
    return undefined;
  }

  const limit: BenefitLimit = {
    type: form.limitType,
  };

  if (form.annualAmount.trim()) {
    limit.annualAmount = Number(form.annualAmount);
  }

  if (form.annualVisits.trim()) {
    limit.annualVisits = Number(form.annualVisits);
  }

  if (form.perVisitAmount.trim()) {
    limit.perVisitAmount = Number(
      form.perVisitAmount
    );
  }

  if (form.perVisitVisits.trim()) {
    limit.perVisitVisits = Number(
      form.perVisitVisits
    );
  }

  return limit;
}

/* =========================================================
   PAGE
========================================================= */

export default function BenefitsPage() {
  const [benefits, setBenefits] = useState<Benefit[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState('');

  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState<
    BenefitStatus | 'ALL'
  >('ALL');

  const [categoryFilter, setCategoryFilter] =
    useState<BenefitCategory | 'ALL'>('ALL');

  const [page, setPage] = useState(1);

  const [totalPages, setTotalPages] = useState(1);

  const [total, setTotal] = useState(0);

  const limit = 12;

  const [modalOpen, setModalOpen] =
    useState(false);

  const [viewOpen, setViewOpen] =
    useState(false);

  const [editingBenefit, setEditingBenefit] =
    useState<Benefit | null>(null);

  const [viewingBenefit, setViewingBenefit] =
    useState<Benefit | null>(null);

  const [form, setForm] =
    useState<BenefitForm>(EMPTY_FORM);

  const [saving, setSaving] = useState(false);

  const [formError, setFormError] = useState('');

  /* =========================================================
     FETCH
  ========================================================= */

  const fetchBenefits = useCallback(
    async (silent = false) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });

        if (search.trim()) {
          params.set('search', search.trim());
        }

        if (statusFilter !== 'ALL') {
          params.set('status', statusFilter);
        }

        if (categoryFilter !== 'ALL') {
          params.set('category', categoryFilter);
        }

        const response = await fetch(
          `${API_BASE_URL}/benefits?${params.toString()}`,
          {
            method: 'GET',
            headers: getAuthHeaders(),
            cache: 'no-store',
          }
        );

        const json = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            json?.message ||
              json?.error ||
              `Failed to load benefits (${response.status})`
          );
        }

        const data = json?.data ?? json;

        const result: ApiListResponse = {
          benefits: Array.isArray(data?.benefits)
            ? data.benefits
            : [],

          total: Number(data?.total || 0),

          page: Number(data?.page || page),

          limit: Number(data?.limit || limit),

          totalPages: Number(
            data?.totalPages || 1
          ),
        };

        setBenefits(result.benefits);
        setTotal(result.total);
        setTotalPages(
          Math.max(1, result.totalPages)
        );
      } catch (err: any) {
        console.error(
          'Failed to load benefits:',
          err
        );

        setBenefits([]);
        setTotal(0);
        setTotalPages(1);

        setError(
          err?.message ||
            'Unable to load benefits.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      page,
      search,
      statusFilter,
      categoryFilter,
    ]
  );

  useEffect(() => {
    fetchBenefits();
  }, [fetchBenefits]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    statusFilter,
    categoryFilter,
  ]);

  /* =========================================================
     STATS
  ========================================================= */

  const stats = useMemo(() => {
    return {
      total,

      active: benefits.filter(
        (item) => item.status === 'ACTIVE'
      ).length,

      draft: benefits.filter(
        (item) => item.status === 'DRAFT'
      ).length,

      covered: benefits.filter(
        (item) => item.isCovered !== false
      ).length,
    };
  }, [benefits, total]);

  /* =========================================================
     CREATE / EDIT
  ========================================================= */

  const openCreate = () => {
    setEditingBenefit(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (benefit: Benefit) => {
    setEditingBenefit(benefit);

    setForm({
      code: benefit.code || '',
      name: benefit.name || '',
      description: benefit.description || '',

      category:
        benefit.category || 'OUTPATIENT',

      isCovered:
        benefit.isCovered !== false,

      requiresPreAuth:
        benefit.requiresPreAuth === true,

      limitType:
        benefit.limit?.type || 'NONE',

      annualAmount:
        typeof benefit.limit?.annualAmount ===
        'number'
          ? String(
              benefit.limit.annualAmount
            )
          : '',

      annualVisits:
        typeof benefit.limit?.annualVisits ===
        'number'
          ? String(
              benefit.limit.annualVisits
            )
          : '',

      perVisitAmount:
        typeof benefit.limit?.perVisitAmount ===
        'number'
          ? String(
              benefit.limit.perVisitAmount
            )
          : '',

      perVisitVisits:
        typeof benefit.limit?.perVisitVisits ===
        'number'
          ? String(
              benefit.limit.perVisitVisits
            )
          : '',

      waitingEnabled:
        benefit.waitingPeriod?.enabled === true,

      waitingDays:
        typeof benefit.waitingPeriod?.days ===
        'number'
          ? String(
              benefit.waitingPeriod.days
            )
          : '',

      waitingDescription:
        benefit.waitingPeriod
          ?.description || '',

      copayPercentage:
        typeof benefit.copay?.percentage ===
        'number'
          ? String(
              benefit.copay.percentage
            )
          : '',

      copayFixedAmount:
        typeof benefit.copay?.fixedAmount ===
        'number'
          ? String(
              benefit.copay.fixedAmount
            )
          : '',

      deductibleEnabled:
        benefit.deductible?.enabled === true,

      deductibleAmount:
        typeof benefit.deductible?.amount ===
        'number'
          ? String(
              benefit.deductible.amount
            )
          : '',

      deductibleFrequency:
        benefit.deductible?.frequency ||
        'ANNUAL',

      exclusions:
        benefit.exclusions?.map((item) => ({
          name: item.name,
          description:
            item.description || '',
        })) || [],

      notes: benefit.notes || '',
    });

    setFormError('');
    setModalOpen(true);
  };

  /* =========================================================
     VIEW
  ========================================================= */

  const openView = async (
    benefit: Benefit
  ) => {
    setViewingBenefit(benefit);
    setViewOpen(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/benefits/${benefit._id}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
          cache: 'no-store',
        }
      );

      const json = await response
        .json()
        .catch(() => ({}));

      if (response.ok) {
        const data = json?.data ?? json;

        if (data) {
          setViewingBenefit(data);
        }
      }
    } catch (err) {
      console.error(
        'Failed to load benefit details:',
        err
      );
    }
  };

  /* =========================================================
     SAVE
  ========================================================= */

  const saveBenefit = async () => {
    setFormError('');

    const code =
      form.code.trim().toUpperCase();

    const name =
      form.name.trim();

    if (!code) {
      setFormError(
        'Benefit code is required.'
      );
      return;
    }

    if (!name) {
      setFormError(
        'Benefit name is required.'
      );
      return;
    }

    const numericFields = [
      ['Annual amount', form.annualAmount],
      ['Annual visits', form.annualVisits],
      ['Per visit amount', form.perVisitAmount],
      ['Per visit visits', form.perVisitVisits],
      ['Waiting period', form.waitingDays],
      ['Copay percentage', form.copayPercentage],
      [
        'Copay fixed amount',
        form.copayFixedAmount,
      ],
      [
        'Deductible amount',
        form.deductibleAmount,
      ],
    ];

    for (const [label, value] of numericFields) {
      if (!value.trim()) continue;

      const number = Number(value);

      if (!Number.isFinite(number) || number < 0) {
        setFormError(
          `${label} must be a non-negative number.`
        );
        return;
      }
    }

    if (
      form.copayPercentage.trim() &&
      Number(form.copayPercentage) > 100
    ) {
      setFormError(
        'Copay percentage cannot exceed 100%.'
      );
      return;
    }

    try {
      setSaving(true);

      const payload: Record<
        string,
        unknown
      > = {
        code,
        name,

        description:
          form.description.trim() || undefined,

        category: form.category,

        isCovered: form.isCovered,

        requiresPreAuth:
          form.requiresPreAuth,

        limit:
          buildLimitFromForm(form),

        waitingPeriod: form.waitingEnabled
          ? {
              enabled: true,

              days: form.waitingDays.trim()
                ? Number(form.waitingDays)
                : 0,

              description:
                form.waitingDescription.trim() ||
                undefined,
            }
          : {
              enabled: false,
            },

        copay:
          form.copayPercentage.trim() ||
          form.copayFixedAmount.trim()
            ? {
                percentage:
                  form.copayPercentage.trim()
                    ? Number(
                        form.copayPercentage
                      )
                    : undefined,

                fixedAmount:
                  form.copayFixedAmount.trim()
                    ? Number(
                        form.copayFixedAmount
                      )
                    : undefined,
              }
            : undefined,

        deductible:
          form.deductibleEnabled
            ? {
                enabled: true,

                amount:
                  form.deductibleAmount.trim()
                    ? Number(
                        form.deductibleAmount
                      )
                    : 0,

                frequency:
                  form.deductibleFrequency,
              }
            : {
                enabled: false,
            },

        exclusions:
          form.exclusions
            .filter(
              (item) => item.name.trim()
            )
            .map((item) => ({
              name: item.name.trim(),

              description:
                item.description?.trim() ||
                undefined,
            })),

        notes:
          form.notes.trim() || undefined,
      };

      const url = editingBenefit
        ? `${API_BASE_URL}/benefits/${editingBenefit._id}`
        : `${API_BASE_URL}/benefits`;

      const response = await fetch(url, {
        method: editingBenefit
          ? 'PATCH'
          : 'POST',

        headers: getAuthHeaders(),

        body: JSON.stringify(payload),
      });

      const json = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          json?.message ||
            json?.error ||
            `Failed to ${
              editingBenefit
                ? 'update'
                : 'create'
            } benefit (${response.status})`
        );
      }

      setModalOpen(false);
      setEditingBenefit(null);
      setForm({ ...EMPTY_FORM });

      await fetchBenefits(true);
    } catch (err: any) {
      console.error(
        'Failed to save benefit:',
        err
      );

      setFormError(
        err?.message ||
          `Unable to ${
            editingBenefit
              ? 'update'
              : 'create'
          } the benefit.`
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     STATUS
  ========================================================= */

  const changeStatus = async (
    benefit: Benefit,
    status: BenefitStatus
  ) => {
    if (benefit.status === status) {
      return;
    }

    try {
      setError('');

      const response = await fetch(
        `${API_BASE_URL}/benefits/${benefit._id}`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            status,
          }),
        }
      );

      const json = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          json?.message ||
            json?.error ||
            `Failed to change benefit status (${response.status})`
        );
      }

      await fetchBenefits(true);
    } catch (err: any) {
      console.error(
        'Failed to change benefit status:',
        err
      );

      setError(
        err?.message ||
          'Unable to change benefit status.'
      );
    }
  };

  /* =========================================================
     EXCLUSIONS
  ========================================================= */

  const addExclusion = () => {
    setForm((current) => ({
      ...current,

      exclusions: [
        ...current.exclusions,
        {
          name: '',
          description: '',
        },
      ],
    }));
  };

  const updateExclusion = (
    index: number,
    patch: Partial<BenefitExclusion>
  ) => {
    setForm((current) => ({
      ...current,

      exclusions:
        current.exclusions.map(
          (item, itemIndex) =>
            itemIndex === index
              ? {
                  ...item,
                  ...patch,
                }
              : item
        ),
    }));
  };

  const removeExclusion = (
    index: number
  ) => {
    setForm((current) => ({
      ...current,

      exclusions:
        current.exclusions.filter(
          (_, itemIndex) =>
            itemIndex !== index
        ),
    }));
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="min-h-full space-y-6 font-sans text-slate-800 animate-in fade-in duration-300">

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />

          <span className="font-medium">
            {error}
          </span>

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
              Benefits
            </h1>

            <span className="rounded-full bg-[#e8f5f3] px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-[#1b7b68]">
              HMO
            </span>

          </div>

          <p className="mt-1 text-xs font-medium text-slate-400">
            Define reusable healthcare benefits, coverage
            rules, limits, exclusions, waiting periods,
            copays, and deductibles.
          </p>
        </div>

        <div className="flex items-center gap-2.5">

          <button
            type="button"
            onClick={() =>
              fetchBenefits(true)
            }
            className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-slate-500 transition-all hover:bg-[#e8f5f3] hover:text-[#1b7b68]"
            title="Refresh benefits"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing
                  ? 'animate-spin'
                  : ''
              }`}
            />
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-2xl bg-[#1b7b68] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-[#145f50] hover:shadow"
          >
            <Plus className="h-4 w-4" />

            New Benefit
          </button>

        </div>
      </div>

      {/* Metrics */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <MetricCard
          label="Total Benefits"
          value={stats.total}
          icon={ClipboardList}
          description="Benefit definitions in this HMO account"
        />

        <MetricCard
          label="Active"
          value={stats.active}
          icon={ShieldCheck}
          description="Currently available for plan association"
        />

        <MetricCard
          label="Draft"
          value={stats.draft}
          icon={Layers3}
          description="Benefits still being configured"
        />

        <MetricCard
          label="Covered"
          value={stats.covered}
          icon={CheckCircle2}
          description="Benefits marked as covered"
        />

      </div>

      {/* Table */}

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">

        <div className="flex flex-col items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/30 p-5 xl:flex-row">

          <div className="relative w-full xl:w-96">

            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search benefit name or code..."
              className="w-full rounded-2xl border border-slate-200/80 bg-white py-2.5 pl-11 pr-4 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/20"
            />

          </div>

          <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto">

            <Filter className="h-4 w-4 text-slate-400" />

            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(
                  event.target.value as
                    | BenefitCategory
                    | 'ALL'
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:border-[#1b7b68]"
            >
              <option value="ALL">
                All Categories
              </option>

              {CATEGORIES.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {humanize(category)}
                  </option>
                )
              )}
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | BenefitStatus
                    | 'ALL'
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:border-[#1b7b68]"
            >
              <option value="ALL">
                All Status
              </option>

              {STATUS_OPTIONS.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {humanize(status)}
                  </option>
                )
              )}
            </select>

          </div>
        </div>

        <div className="overflow-x-auto">

          <table className="w-full border-collapse text-left">

            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">

                <th className="px-6 py-4">
                  Benefit
                </th>

                <th className="px-6 py-4">
                  Category
                </th>

                <th className="px-6 py-4">
                  Limits
                </th>

                <th className="px-6 py-4">
                  Cost Sharing
                </th>

                <th className="px-6 py-4">
                  Status
                </th>

                <th className="px-6 py-4">
                  Created
                </th>

                <th className="px-6 py-4 text-right">
                  Actions
                </th>

              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">

              {loading ? (
                <TableSkeleton />
              ) : benefits.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center"
                  >
                    <div className="mx-auto max-w-xs space-y-2">

                      <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />

                      <p className="text-sm font-semibold text-slate-600">
                        No benefits found
                      </p>

                      <p className="text-xs text-slate-400">
                        Try changing your filters
                        or create a new benefit.
                      </p>

                    </div>
                  </td>
                </tr>
              ) : (
                benefits.map(
                  (benefit) => (
                    <tr
                      key={benefit._id}
                      className="group transition-all duration-150 hover:bg-[#e8f5f3]/20"
                    >

                      <td className="px-6 py-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]">
                            <ClipboardList className="h-4 w-4" />
                          </div>

                          <div className="min-w-0">

                            <p className="truncate text-sm font-bold text-slate-800 transition-colors group-hover:text-[#1b7b68]">
                              {benefit.name}
                            </p>

                            <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                              {benefit.code}
                            </p>

                          </div>

                        </div>

                      </td>

                      <td className="px-6 py-4">

                        <span
                          className={`rounded-xl px-2.5 py-1 text-[10px] font-bold ${categoryClasses(
                            benefit.category
                          )}`}
                        >
                          {humanize(
                            benefit.category
                          )}
                        </span>

                      </td>

                      <td className="px-6 py-4">

                        <div className="space-y-1">

                          {benefit.limit
                            ?.annualAmount !==
                          undefined ? (
                            <p className="font-bold text-slate-700">
                              {formatMoney(
                                benefit.limit
                                  .annualAmount
                              )}
                              <span className="ml-1 text-[9px] font-medium text-slate-400">
                                /yr
                              </span>
                            </p>
                          ) : (
                            <p className="font-bold text-slate-600">
                              No annual cap
                            </p>
                          )}

                          {benefit.limit
                            ?.annualVisits !==
                            undefined && (
                            <p className="text-[10px] text-slate-400">
                              {
                                benefit.limit
                                  .annualVisits
                              }{' '}
                              annual visits
                            </p>
                          )}

                          {benefit.limit
                            ?.perVisitAmount !==
                            undefined && (
                            <p className="text-[10px] text-slate-400">
                              {formatMoney(
                                benefit.limit
                                  .perVisitAmount
                              )}{' '}
                              / visit
                            </p>
                          )}

                        </div>

                      </td>

                      <td className="px-6 py-4">

                        <div className="space-y-1">

                          {benefit.copay
                            ?.percentage !==
                            undefined && (
                            <p className="font-bold text-slate-700">
                              {
                                benefit.copay
                                  .percentage
                              }
                              % copay
                            </p>
                          )}

                          {benefit.copay
                            ?.fixedAmount !==
                            undefined && (
                            <p className="text-[10px] text-slate-400">
                              +
                              {formatMoney(
                                benefit.copay
                                  .fixedAmount
                              )}
                            </p>
                          )}

                          {benefit.deductible
                            ?.enabled && (
                            <p className="text-[10px] text-slate-400">
                              Deductible:{' '}
                              {formatMoney(
                                benefit
                                  .deductible
                                  .amount
                              )}
                            </p>
                          )}

                          {!benefit.copay
                            ?.percentage &&
                            !benefit.copay
                              ?.fixedAmount &&
                            !benefit.deductible
                              ?.enabled && (
                              <span className="text-slate-400">
                                None
                              </span>
                            )}

                        </div>

                      </td>

                      <td className="px-6 py-4">

                        <div className="flex flex-col items-start gap-1.5">

                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${statusClasses(
                              benefit.status
                            )}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />

                            {humanize(
                              benefit.status
                            )}
                          </span>

                          {benefit.requiresPreAuth && (
                            <span className="text-[9px] font-bold uppercase tracking-wide text-amber-600">
                              Pre-auth required
                            </span>
                          )}

                        </div>

                      </td>

                      <td className="px-6 py-4 text-[11px] font-medium text-slate-500">
                        {formatDate(
                          benefit.createdAt
                        )}
                      </td>

                      <td className="px-6 py-4">

                        <div className="flex justify-end gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              openView(benefit)
                            }
                            className="rounded-xl bg-slate-50 p-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-800"
                            title="View benefit"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openEdit(benefit)
                            }
                            className="rounded-xl bg-[#e8f5f3] p-2 text-[#1b7b68] transition-all hover:bg-[#1b7b68] hover:text-white"
                            title="Edit benefit"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          {benefit.status ===
                            'DRAFT' && (
                            <button
                              type="button"
                              onClick={() =>
                                changeStatus(
                                  benefit,
                                  'ACTIVE'
                                )
                              }
                              className="rounded-xl bg-emerald-50 px-2.5 py-2 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100"
                            >
                              Activate
                            </button>
                          )}

                          {benefit.status ===
                            'ACTIVE' && (
                            <button
                              type="button"
                              onClick={() =>
                                changeStatus(
                                  benefit,
                                  'INACTIVE'
                                )
                              }
                              className="rounded-xl bg-amber-50 px-2.5 py-2 text-[10px] font-bold text-amber-700 hover:bg-amber-100"
                            >
                              Inactivate
                            </button>
                          )}

                          {benefit.status ===
                            'INACTIVE' && (
                            <button
                              type="button"
                              onClick={() =>
                                changeStatus(
                                  benefit,
                                  'ACTIVE'
                                )
                              }
                              className="rounded-xl bg-emerald-50 px-2.5 py-2 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100"
                            >
                              Activate
                            </button>
                          )}

                          {benefit.status !==
                            'ARCHIVED' && (
                            <button
                              type="button"
                              onClick={() =>
                                changeStatus(
                                  benefit,
                                  'ARCHIVED'
                                )
                              }
                              className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                              title="Archive benefit"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          )}

                        </div>

                      </td>

                    </tr>
                  )
                )
              )}

            </tbody>

          </table>

        </div>

        {!loading &&
          totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">

              <p className="text-[11px] font-medium text-slate-400">
                Page{' '}
                <span className="font-bold text-slate-600">
                  {page}
                </span>{' '}
                of{' '}
                <span className="font-bold text-slate-600">
                  {totalPages}
                </span>
              </p>

              <div className="flex items-center gap-2">

                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage(
                      (current) =>
                        Math.max(
                          1,
                          current - 1
                        )
                    )
                  }
                  className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  disabled={
                    page >= totalPages
                  }
                  onClick={() =>
                    setPage(
                      (current) =>
                        Math.min(
                          totalPages,
                          current + 1
                        )
                    )
                  }
                  className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

              </div>

            </div>
          )}

      </div>

      {/* Editor */}

      {modalOpen && (
        <BenefitEditorModal
          editingBenefit={editingBenefit}
          form={form}
          setForm={setForm}
          saving={saving}
          error={formError}
          onClose={() => {
            if (saving) return;

            setModalOpen(false);
          }}
          onSave={saveBenefit}
          onAddExclusion={addExclusion}
          onUpdateExclusion={
            updateExclusion
          }
          onRemoveExclusion={
            removeExclusion
          }
        />
      )}

      {/* View */}

      {viewOpen &&
        viewingBenefit && (
          <BenefitViewModal
            benefit={viewingBenefit}
            onClose={() => {
              setViewOpen(false);
              setViewingBenefit(null);
            }}
            onEdit={() => {
              setViewOpen(false);
              openEdit(
                viewingBenefit
              );
            }}
          />
        )}

    </div>
  );
}

/* =========================================================
   METRIC CARD
========================================================= */

function MetricCard({
  label,
  value,
  icon: Icon,
  description,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{
    className?: string;
  }>;
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

/* =========================================================
   EDITOR MODAL
========================================================= */

function BenefitEditorModal({
  editingBenefit,
  form,
  setForm,
  saving,
  error,
  onClose,
  onSave,
  onAddExclusion,
  onUpdateExclusion,
  onRemoveExclusion,
}: {
  editingBenefit: Benefit | null;

  form: BenefitForm;

  setForm: React.Dispatch<
    React.SetStateAction<BenefitForm>
  >;

  saving: boolean;

  error: string;

  onClose: () => void;

  onSave: () => void;

  onAddExclusion: () => void;

  onUpdateExclusion: (
    index: number,
    patch: Partial<BenefitExclusion>
  ) => void;

  onRemoveExclusion: (
    index: number
  ) => void;
}) {
  const showAnnual =
    form.limitType === 'ANNUAL' ||
    form.limitType === 'BOTH';

  const showVisit =
    form.limitType === 'VISIT' ||
    form.limitType === 'BOTH';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">

      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">

          <div>

            <h3 className="text-base font-bold text-slate-900">
              {editingBenefit
                ? 'Edit Benefit'
                : 'Create Benefit'}
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Configure the reusable benefit definition
              used by your HMO health plans.
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

          {/* Identity */}

          <section className="rounded-3xl border border-slate-100 bg-slate-50/40 p-5">

            <div className="mb-4">

              <h4 className="text-sm font-extrabold text-slate-800">
                Benefit Information
              </h4>

              <p className="mt-1 text-[11px] text-slate-400">
                Define the benefit identity and clinical
                category.
              </p>

            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <Field label="Benefit Code *">
                <input
                  value={form.code}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        code: event.target.value.toUpperCase(),
                      })
                    )
                  }
                  placeholder="e.g. OP-CONSULT"
                  className={inputClass}
                />
              </Field>

              <Field label="Benefit Name *">
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        name: event.target.value,
                      })
                    )
                  }
                  placeholder="e.g. Outpatient Consultation"
                  className={inputClass}
                />
              </Field>

              <Field label="Category">
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        category:
                          event.target.value as BenefitCategory,
                      })
                    )
                  }
                  className={inputClass}
                >
                  {CATEGORIES.map(
                    (category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {humanize(category)}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <div className="flex items-end gap-2">

                <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3">

                  <input
                    type="checkbox"
                    checked={
                      form.isCovered
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          isCovered:
                            event.target.checked,
                        })
                      )
                    }
                    className="h-3.5 w-3.5 accent-[#1b7b68]"
                  />

                  <span className="text-[10px] font-bold text-slate-600">
                    Covered
                  </span>

                </label>

                <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3">

                  <input
                    type="checkbox"
                    checked={
                      form.requiresPreAuth
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          requiresPreAuth:
                            event.target.checked,
                        })
                      )
                    }
                    className="h-3.5 w-3.5 accent-[#1b7b68]"
                  />

                  <span className="text-[10px] font-bold text-slate-600">
                    Pre-authorisation
                  </span>

                </label>

              </div>

              <Field
                label="Description"
                className="md:col-span-2"
              >
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        description:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Describe what this benefit covers..."
                  className={textareaClass}
                />
              </Field>

            </div>

          </section>

          {/* Limits */}

          <section className="rounded-3xl border border-blue-100 bg-blue-50/30 p-5">

            <div className="mb-4">

              <h4 className="text-sm font-extrabold text-slate-800">
                Benefit Limits
              </h4>

              <p className="mt-1 text-[11px] text-slate-400">
                Configure annual and visit-based coverage
                limits.
              </p>

            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <Field label="Limit Type">

                <select
                  value={form.limitType}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        limitType:
                          event.target.value as LimitType,
                      })
                    )
                  }
                  className={inputClass}
                >

                  {LIMIT_OPTIONS.map(
                    (option) => (
                      <option
                        key={option}
                        value={option}
                      >
                        {humanize(option)}
                      </option>
                    )
                  )}

                </select>

              </Field>

              {showAnnual && (
                <>
                  <NumberField
                    label="Annual Amount"
                    value={
                      form.annualAmount
                    }
                    onChange={(value) =>
                      setForm(
                        (current) => ({
                          ...current,
                          annualAmount:
                            value,
                        })
                      )
                    }
                  />

                  <NumberField
                    label="Annual Visits"
                    value={
                      form.annualVisits
                    }
                    onChange={(value) =>
                      setForm(
                        (current) => ({
                          ...current,
                          annualVisits:
                            value,
                        })
                      )
                    }
                  />
                </>
              )}

              {showVisit && (
                <>
                  <NumberField
                    label="Per Visit Amount"
                    value={
                      form.perVisitAmount
                    }
                    onChange={(value) =>
                      setForm(
                        (current) => ({
                          ...current,
                          perVisitAmount:
                            value,
                        })
                      )
                    }
                  />

                  <NumberField
                    label="Per Visit Visits"
                    value={
                      form.perVisitVisits
                    }
                    onChange={(value) =>
                      setForm(
                        (current) => ({
                          ...current,
                          perVisitVisits:
                            value,
                        })
                      )
                    }
                  />
                </>
              )}

            </div>

          </section>

          {/* Waiting / Cost Sharing */}

          <section className="rounded-3xl border border-amber-100 bg-amber-50/30 p-5">

            <div className="mb-4">

              <h4 className="text-sm font-extrabold text-slate-800">
                Waiting Period & Cost Sharing
              </h4>

              <p className="mt-1 text-[11px] text-slate-400">
                Configure eligibility waiting periods,
                copays, and deductibles.
              </p>

            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <div className="flex items-end">

                <label className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3">

                  <input
                    type="checkbox"
                    checked={
                      form.waitingEnabled
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          waitingEnabled:
                            event.target.checked,
                        })
                      )
                    }
                    className="h-3.5 w-3.5 accent-[#1b7b68]"
                  />

                  <span className="text-[10px] font-bold text-slate-600">
                    Waiting period applies
                  </span>

                </label>

              </div>

              {form.waitingEnabled && (
                <>
                  <NumberField
                    label="Waiting Period (Days)"
                    value={
                      form.waitingDays
                    }
                    onChange={(value) =>
                      setForm(
                        (current) => ({
                          ...current,
                          waitingDays:
                            value,
                        })
                      )
                    }
                  />

                  <Field
                    label="Waiting Period Description"
                    className="md:col-span-2"
                  >
                    <input
                      value={
                        form.waitingDescription
                      }
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            waitingDescription:
                              event.target.value,
                          })
                        )
                      }
                      placeholder="e.g. Applies to maternity services after enrolment"
                      className={inputClass}
                    />
                  </Field>
                </>
              )}

              <NumberField
                label="Copay Percentage"
                value={
                  form.copayPercentage
                }
                max={100}
                onChange={(value) =>
                  setForm(
                    (current) => ({
                      ...current,
                      copayPercentage:
                        value,
                    })
                  )
                }
              />

              <NumberField
                label="Fixed Copay Amount"
                value={
                  form.copayFixedAmount
                }
                onChange={(value) =>
                  setForm(
                    (current) => ({
                      ...current,
                      copayFixedAmount:
                        value,
                    })
                  )
                }
              />

              <div className="flex items-end">

                <label className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3">

                  <input
                    type="checkbox"
                    checked={
                      form.deductibleEnabled
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          deductibleEnabled:
                            event.target.checked,
                        })
                      )
                    }
                    className="h-3.5 w-3.5 accent-[#1b7b68]"
                  />

                  <span className="text-[10px] font-bold text-slate-600">
                    Deductible applies
                  </span>

                </label>

              </div>

              {form.deductibleEnabled && (
                <>
                  <NumberField
                    label="Deductible Amount"
                    value={
                      form.deductibleAmount
                    }
                    onChange={(value) =>
                      setForm(
                        (current) => ({
                          ...current,
                          deductibleAmount:
                            value,
                        })
                      )
                    }
                  />

                  <Field label="Deductible Frequency">

                    <select
                      value={
                        form.deductibleFrequency
                      }
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            deductibleFrequency:
                              event.target.value as
                                | 'ANNUAL'
                                | 'VISIT'
                                | 'ADMISSION',
                          })
                        )
                      }
                      className={inputClass}
                    >

                      <option value="ANNUAL">
                        Annual
                      </option>

                      <option value="VISIT">
                        Per Visit
                      </option>

                      <option value="ADMISSION">
                        Per Admission
                      </option>

                    </select>

                  </Field>
                </>
              )}

            </div>

          </section>

          {/* Exclusions */}

          <section className="rounded-3xl border border-rose-100 bg-rose-50/20 p-5">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <h4 className="text-sm font-extrabold text-slate-800">
                  Exclusions
                </h4>

                <p className="mt-1 text-[11px] text-slate-400">
                  Record services, procedures, or conditions
                  excluded from this benefit.
                </p>

              </div>

              <button
                type="button"
                onClick={
                  onAddExclusion
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-[#1b7b68] px-3.5 py-2.5 text-[11px] font-bold text-white hover:bg-[#145f50]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Exclusion
              </button>

            </div>

            {form.exclusions.length ===
            0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">

                <Layers3 className="mx-auto h-7 w-7 text-slate-300" />

                <p className="mt-2 text-xs font-semibold text-slate-600">
                  No exclusions configured
                </p>

                <p className="mt-1 text-[10px] text-slate-400">
                  This benefit currently has no
                  recorded exclusions.
                </p>

              </div>
            ) : (
              <div className="mt-4 space-y-3">

                {form.exclusions.map(
                  (exclusion, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                    >

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

                        <Field label="Exclusion">

                          <input
                            value={
                              exclusion.name
                            }
                            onChange={(event) =>
                              onUpdateExclusion(
                                index,
                                {
                                  name: event.target.value,
                                }
                              )
                            }
                            placeholder="e.g. Cosmetic procedures"
                            className={inputClass}
                          />

                        </Field>

                        <div className="flex items-end gap-2">

                          <Field
                            label="Description"
                            className="flex-1"
                          >
                            <input
                              value={
                                exclusion.description ||
                                ''
                              }
                              onChange={(event) =>
                                onUpdateExclusion(
                                  index,
                                  {
                                    description:
                                      event.target.value,
                                  }
                                )
                              }
                              placeholder="Optional details"
                              className={inputClass}
                            />
                          </Field>

                          <button
                            type="button"
                            onClick={() =>
                              onRemoveExclusion(
                                index
                              )
                            }
                            className="mb-0 rounded-xl bg-rose-50 p-3 text-rose-600 hover:bg-rose-100"
                            title="Remove exclusion"
                          >
                            <X className="h-4 w-4" />
                          </button>

                        </div>

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

          </section>

          {/* Notes */}

          <section className="rounded-3xl border border-slate-100 bg-slate-50/40 p-5">

            <Field label="Internal Notes">

              <textarea
                rows={3}
                value={form.notes}
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      notes:
                        event.target.value,
                    })
                  )
                }
                placeholder="Optional administrative or configuration notes..."
                className={textareaClass}
              />

            </Field>

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

            {saving && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}

            {editingBenefit
              ? 'Save Changes'
              : 'Create Benefit'}

          </button>

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   VIEW MODAL
========================================================= */

function BenefitViewModal({
  benefit,
  onClose,
  onEdit,
}: {
  benefit: Benefit;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">

      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">

          <div>

            <div className="flex items-center gap-2">

              <h3 className="text-base font-bold text-slate-900">
                {benefit.name}
              </h3>

              <span
                className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase ${statusClasses(
                  benefit.status
                )}`}
              >
                {humanize(
                  benefit.status
                )}
              </span>

            </div>

            <p className="mt-1 font-mono text-[10px] text-slate-400">
              {benefit.code}
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

            <SummaryBox
              label="Category"
              value={humanize(
                benefit.category
              )}
            />

            <SummaryBox
              label="Coverage"
              value={
                benefit.isCovered === false
                  ? 'Not Covered'
                  : 'Covered'
              }
            />

            <SummaryBox
              label="Pre-authorisation"
              value={
                benefit.requiresPreAuth
                  ? 'Required'
                  : 'Not Required'
              }
            />

          </div>

          {benefit.description && (
            <div className="rounded-2xl bg-slate-50 p-4">

              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Description
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-600">
                {benefit.description}
              </p>

            </div>
          )}

          <section>

            <h4 className="text-sm font-extrabold text-slate-800">
              Coverage Configuration
            </h4>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">

              <MiniStat
                label="Annual Limit"
                value={
                  typeof benefit.limit
                    ?.annualAmount ===
                  'number'
                    ? formatMoney(
                        benefit.limit
                          .annualAmount
                      )
                    : 'Unlimited'
                }
              />

              <MiniStat
                label="Annual Visits"
                value={
                  typeof benefit.limit
                    ?.annualVisits ===
                  'number'
                    ? String(
                        benefit.limit
                          .annualVisits
                      )
                    : 'Unlimited'
                }
              />

              <MiniStat
                label="Per Visit"
                value={
                  typeof benefit.limit
                    ?.perVisitAmount ===
                  'number'
                    ? formatMoney(
                        benefit.limit
                          .perVisitAmount
                      )
                    : 'Unlimited'
                }
              />

              <MiniStat
                label="Waiting"
                value={
                  benefit.waitingPeriod
                    ?.enabled
                    ? `${benefit.waitingPeriod.days || 0} days`
                    : 'None'
                }
              />

            </div>

          </section>

          <section>

            <h4 className="text-sm font-extrabold text-slate-800">
              Cost Sharing
            </h4>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">

              <MiniStat
                label="Copay"
                value={
                  typeof benefit.copay
                    ?.percentage ===
                  'number'
                    ? `${benefit.copay.percentage}%`
                    : 'None'
                }
              />

              <MiniStat
                label="Fixed Copay"
                value={
                  typeof benefit.copay
                    ?.fixedAmount ===
                  'number'
                    ? formatMoney(
                        benefit.copay
                          .fixedAmount
                      )
                    : 'None'
                }
              />

              <MiniStat
                label="Deductible"
                value={
                  benefit.deductible
                    ?.enabled
                    ? formatMoney(
                        benefit
                          .deductible
                          .amount
                      )
                    : 'None'
                }
              />

              <MiniStat
                label="Frequency"
                value={
                  benefit.deductible
                    ?.enabled
                    ? humanize(
                        benefit
                          .deductible
                          .frequency
                      )
                    : '—'
                }
              />

            </div>

          </section>

          {benefit.exclusions &&
            benefit.exclusions.length >
              0 && (
              <section>

                <h4 className="text-sm font-extrabold text-slate-800">
                  Exclusions
                </h4>

                <div className="mt-3 space-y-2">

                  {benefit.exclusions.map(
                    (exclusion, index) => (
                      <div
                        key={`${exclusion.name}-${index}`}
                        className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4"
                      >

                        <p className="text-xs font-bold text-slate-800">
                          {exclusion.name}
                        </p>

                        {exclusion.description && (
                          <p className="mt-1 text-[10px] leading-5 text-slate-500">
                            {
                              exclusion.description
                            }
                          </p>
                        )}

                      </div>
                    )
                  )}

                </div>

              </section>
            )}

          {benefit.waitingPeriod
            ?.description && (
            <section className="rounded-2xl bg-amber-50 p-4">

              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                Waiting Period
              </p>

              <p className="mt-1 text-xs text-amber-800">
                {
                  benefit.waitingPeriod
                    .description
                }
              </p>

            </section>
          )}

          {benefit.notes && (
            <section className="rounded-2xl bg-slate-50 p-4">

              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Notes
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-600">
                {benefit.notes}
              </p>

            </section>
          )}

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

            Edit Benefit
          </button>

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function SummaryBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">

      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xs font-extrabold text-slate-700">
        {value}
      </p>

    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-2.5 py-2">

      <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-0.5 font-bold text-slate-700">
        {value}
      </p>

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
  value?: string;
  onChange: (
    value: string
  ) => void;
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
        value={value || ''}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className={inputClass}
      />

    </div>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({
        length: 6,
      }).map((_, index) => (
        <tr
          key={index}
          className="animate-pulse border-b border-slate-100"
        >

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
            <div className="h-6 w-24 rounded-xl bg-slate-200" />
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

/* =========================================================
   STYLES
========================================================= */

const inputClass =
  'h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10';

const textareaClass =
  'w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/50 px-3 py-3 text-xs font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10';