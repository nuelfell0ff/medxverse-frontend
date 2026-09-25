'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileCheck,
  FileText,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  TrendingUp,
  Users,
  WalletCards,
  XCircle,
  Receipt,
  ChartNoAxesCombined,
  Settings,
  ClipboardCheck,
  Megaphone,
  Globe2,
} from 'lucide-react';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'https://medxverse-backend.onrender.com/api/v1';

/* =========================================================
   TYPES
   ========================================================= */

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
};

type Stats = {
  total?: number;
  newRequests?: number;
  pending?: number;
  approvedToday?: number;
  declined?: number;
  submitted?: number;
  underReview?: number;
  approved?: number;
  rejected?: number;
  paid?: number;
  cancelled?: number;
  draft?: number;
  active?: number;
  inactive?: number;
  archived?: number;
  generated?: number;
  completed?: number;
  failed?: number;
  expired?: number;
};

type DashboardData = {
  claims: Stats;
  preAuth: Stats;
  enrollees: Stats;
  benefits: Stats;
  tariffs: Stats;
  billing: Stats;
  utilization: Stats;
  analytics: Stats;
};

type ActivityItem = {
  label: string;
  value: number;
  href: string;
  icon: React.ElementType;
  tone: string;
};

type KpiItem = {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ElementType;
  href: string;
  tone: string;
};

/* =========================================================
   AUTH / API HELPERS
   ========================================================= */

function getToken(): string | null {
  if (typeof window === 'undefined') return null;

  for (const key of [
    'token',
    'accessToken',
    'access_token',
    'authToken',
    'jwt',
  ]) {
    const raw = window.localStorage.getItem(key);

    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);

      if (typeof parsed === 'string') {
        return parsed;
      }

      if (parsed?.accessToken) {
        return parsed.accessToken;
      }

      if (parsed?.token) {
        return parsed.token;
      }
    } catch {
      return raw;
    }
  }

  return null;
}

function getHeaders(): HeadersInit {
  const token = getToken();

  return {
    Accept: 'application/json',
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    cache: 'no-store',
    headers: getHeaders(),
    credentials: 'include',
  });

  const json = (await response
    .json()
    .catch(() => ({}))) as ApiEnvelope<T> | T;

  if (!response.ok) {
    const errorBody = json as ApiEnvelope<T>;

    throw new Error(
      errorBody?.message ||
        errorBody?.error ||
        `Request failed with status ${response.status}`,
    );
  }

  const envelope = json as ApiEnvelope<T>;

  return (envelope?.data ?? json) as T;
}

/* =========================================================
   DATA NORMALIZATION
   ========================================================= */

function asNumber(value: unknown): number {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function extractStats(value: unknown): Stats {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const source = value as Record<string, unknown>;

  const nested =
    (source.stats as Record<string, unknown> | undefined) ??
    (source.summary as Record<string, unknown> | undefined) ??
    source;

  return {
    total: asNumber(
      nested.total ??
        nested.totalCount ??
        nested.count,
    ),

    newRequests: asNumber(
      nested.newRequests,
    ),

    pending: asNumber(
      nested.pending ??
        nested.pendingCount,
    ),

    approvedToday: asNumber(
      nested.approvedToday,
    ),

    declined: asNumber(
      nested.declined ??
        nested.declinedCount,
    ),

    submitted: asNumber(
      nested.submitted,
    ),

    underReview: asNumber(
      nested.underReview,
    ),

    approved: asNumber(
      nested.approved,
    ),

    rejected: asNumber(
      nested.rejected,
    ),

    paid: asNumber(
      nested.paid,
    ),

    cancelled: asNumber(
      nested.cancelled,
    ),

    draft: asNumber(
      nested.draft,
    ),

    active: asNumber(
      nested.active ??
        nested.activeCount,
    ),

    inactive: asNumber(
      nested.inactive ??
        nested.inactiveCount,
    ),

    archived: asNumber(
      nested.archived,
    ),

    generated: asNumber(
      nested.generated,
    ),

    completed: asNumber(
      nested.completed,
    ),

    failed: asNumber(
      nested.failed,
    ),

    expired: asNumber(
      nested.expired,
    ),
  };
}

async function safeStats(
  path: string,
): Promise<Stats> {
  try {
    const result = await request<unknown>(path);

    return extractStats(result);
  } catch {
    return {};
  }
}

/* =========================================================
   FORMATTERS
   ========================================================= */

function formatNumber(value: number): string {
  return new Intl.NumberFormat(
    'en-NG',
  ).format(value);
}

function formatTime(value: Date | null): string {
  if (!value) {
    return 'Loading live data…';
  }

  return `Last updated ${value.toLocaleTimeString(
    [],
    {
      hour: '2-digit',
      minute: '2-digit',
    },
  )}`;
}

/* =========================================================
   REUSABLE UI
   ========================================================= */

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  loading,
  tone,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ElementType;
  href: string;
  loading: boolean;
  tone: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            {title}
          </p>

          <div className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
            {loading ? (
              <Loader2
                className={`h-7 w-7 animate-spin ${tone}`}
              />
            ) : (
              formatNumber(value)
            )}
          </div>

          <p className="mt-1 text-xs font-medium text-slate-400">
            {subtitle}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f5f3] ${tone}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-1 text-[11px] font-extrabold text-[#1b7b68]">
        Open module
        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]">
              <Icon className="h-4.5 w-4.5" />
            </div>
          )}

          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-1 text-xs text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {action}
      </div>

      <div className="mt-5">
        {children}
      </div>
    </section>
  );
}

/* =========================================================
   DASHBOARD
   ========================================================= */

export default function HMODashboardPage() {
  const [dashboard, setDashboard] =
    useState<DashboardData>({
      claims: {},
      preAuth: {},
      enrollees: {},
      benefits: {},
      tariffs: {},
      billing: {},
      utilization: {},
      analytics: {},
    });

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  const [error, setError] =
    useState('');

  /* =========================================================
     LOAD DASHBOARD
     ========================================================= */

  const loadDashboard = useCallback(
    async (manual = false) => {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        /*
         * The dashboard consumes existing HMO module endpoints.
         *
         * Each endpoint is isolated through safeStats(), so an
         * unavailable optional module does not break the entire
         * dashboard.
         */

        const [
          claimsStats,
          preAuthStats,
          enrolleesStats,
          benefitsStats,
          tariffsStats,
          billingStats,
          utilizationStats,
          analyticsStats,
        ] = await Promise.all([
          safeStats('/claims/stats'),

          safeStats(
            '/pre-auth/stats',
          ),

          safeStats(
            '/enrollees/stats',
          ),

          safeStats(
            '/benefits/stats',
          ),

          safeStats(
            '/tariffs/stats',
          ),

          safeStats(
            '/billings/summary',
          ),

          safeStats(
            '/utilization/stats',
          ),

          safeStats(
            '/analytics/summary',
          ),
        ]);

        setDashboard({
          claims: claimsStats,
          preAuth: preAuthStats,
          enrollees: enrolleesStats,
          benefits: benefitsStats,
          tariffs: tariffsStats,
          billing: billingStats,
          utilization: utilizationStats,
          analytics: analyticsStats,
        });

        setLastUpdated(new Date());
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load HMO dashboard.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  /* =========================================================
     KPI DATA
     ========================================================= */

  const kpis: KpiItem[] = useMemo(
    () => [
      {
        title: 'Enrollees',
        value:
          dashboard.enrollees.total ??
          dashboard.enrollees.active ??
          0,
        subtitle:
          'Members under HMO management',
        icon: Users,
        href: '/hmo/enrollees',
        tone: 'text-[#1b7b68]',
      },

      {
        title: 'Claims Attention',
        value:
          dashboard.claims.pending ??
          dashboard.claims.underReview ??
          dashboard.claims.submitted ??
          0,
        subtitle:
          'Claims requiring attention',
        icon: FileCheck,
        href: '/hmo/claims',
        tone: 'text-blue-600',
      },

      {
        title: 'Pre-Authorizations',
        value:
          dashboard.preAuth.pending ??
          dashboard.preAuth.newRequests ??
          0,
        subtitle:
          'Requests awaiting review',
        icon: ShieldCheck,
        href: '/hmo/pre-auth',
        tone: 'text-amber-600',
      },

      {
        title: 'Active Tariffs',
        value:
          dashboard.tariffs.active ??
          0,
        subtitle:
          'Currently configured rates',
        icon: CreditCard,
        href: '/hmo/tariffs',
        tone: 'text-purple-600',
      },
    ],
    [dashboard],
  );

  /* =========================================================
     OPERATIONAL ACTIVITY
     ========================================================= */

  const activity: ActivityItem[] =
    useMemo(
      () => [
        {
          label: 'Submitted claims',
          value:
            dashboard.claims.submitted ??
            0,
          href: '/hmo/claims',
          icon: FileCheck,
          tone:
            'bg-blue-50 text-blue-700',
        },

        {
          label: 'Claims under review',
          value:
            dashboard.claims.underReview ??
            dashboard.claims.pending ??
            0,
          href: '/hmo/claims',
          icon: Clock3,
          tone:
            'bg-amber-50 text-amber-700',
        },

        {
          label: 'Approved claims',
          value:
            dashboard.claims.approved ??
            0,
          href: '/hmo/claims',
          icon: CheckCircle2,
          tone:
            'bg-emerald-50 text-emerald-700',
        },

        {
          label: 'Declined authorizations',
          value:
            dashboard.preAuth.declined ??
            0,
          href:
            '/hmo/pre-auth',
          icon: XCircle,
          tone:
            'bg-rose-50 text-rose-700',
        },
      ],
      [dashboard],
    );

  /* =========================================================
     HMO OVERVIEW
     ========================================================= */

  const overview = useMemo(
    () => [
      {
        label: 'Active enrollees',
        value:
          dashboard.enrollees.active ??
          dashboard.enrollees.total ??
          0,
        icon: Users,
      },

      {
        label: 'Active benefits',
        value:
          dashboard.benefits.active ??
          dashboard.benefits.total ??
          0,
        icon: WalletCards,
      },

      {
        label: 'Active tariffs',
        value:
          dashboard.tariffs.active ??
          0,
        icon: CreditCard,
      },

      {
        label: 'Paid claims',
        value:
          dashboard.claims.paid ??
          0,
        icon: CheckCircle2,
      },

      {
        label: 'Utilization records',
        value:
          dashboard.utilization.total ??
          dashboard.utilization.completed ??
          0,
        icon: ChartNoAxesCombined,
      },

      {
        label: 'Billing records',
        value:
          dashboard.billing.total ??
          dashboard.billing.completed ??
          0,
        icon: Receipt,
      },
    ],
    [dashboard],
  );

  /* =========================================================
     MODULES
     ========================================================= */

  const operationalModules = [
    {
      title: 'Claims Adjudication',
      description:
        'Review, approve, reject and monitor submitted claims.',
      href: '/hmo/claims',
      icon: FileCheck,
    },

    {
      title: 'Pre-Authorizations',
      description:
        'Manage clinical requests and authorization decisions.',
      href: '/hmo/pre-auth',
      icon: ShieldCheck,
    },

    {
      title: 'Enrollee Registry',
      description:
        'Maintain enrollee records, plans and eligibility.',
      href: '/hmo/enrollees',
      icon: Users,
    },

    {
      title: 'Eligibility',
      description:
        'Verify member coverage and review eligibility checks.',
      href: '/hmo/eligibility',
      icon: ClipboardCheck,
    },

    {
      title: 'Benefits',
      description:
        'Manage covered services, limits and benefit rules.',
      href: '/hmo/benefits',
      icon: WalletCards,
    },

    {
      title: 'HMO Billing',
      description:
        'Manage invoices, payments, settlements and billing operations.',
      href: '/hmo/billings',
      icon: Receipt,
    },

    {
      title: 'Utilization',
      description:
        'Monitor utilization activity, trends and healthcare consumption.',
      href: '/hmo/utilization',
      icon: ChartNoAxesCombined,
    },

    {
      title: 'Analytics',
      description:
        'Review HMO performance, reports, audits and compliance.',
      href: '/hmo/analytics',
      icon: BarChart3,
    },
  ];

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="min-h-full space-y-6 font-sans text-slate-800 animate-in fade-in duration-300">
      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#e8f5f3]">
              <BarChart3 className="h-4.5 w-4.5 text-[#1b7b68]" />
            </div>

            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#1b7b68]">
              MedXVerse HMO
            </span>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            HMO Command Center
          </h1>

          <p className="mt-1.5 max-w-3xl text-sm text-slate-500">
            Monitor enrollee coverage, claims,
            authorizations, benefits, tariffs,
            billing, utilization and HMO
            operations from one live dashboard.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            HMO services online
          </div>

          <button
            type="button"
            onClick={() =>
              void loadDashboard(true)
            }
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw
              className={`h-3.5 w-3.5 ${
                refreshing
                  ? 'animate-spin'
                  : ''
              }`}
            />

            {refreshing
              ? 'Refreshing'
              : 'Refresh'}
          </button>

          <Link
            href="/hmo/settings"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </Link>
        </div>
      </div>

      {/* =====================================================
          ERROR
          ===================================================== */}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
          <Activity className="mt-0.5 h-4 w-4 shrink-0" />

          <div>
            <p className="font-bold">
              Dashboard data could not be fully loaded.
            </p>

            <p className="mt-0.5 text-xs">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* =====================================================
          KPI CARDS
          ===================================================== */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <KpiCard
            key={item.title}
            title={item.title}
            value={item.value}
            subtitle={item.subtitle}
            icon={item.icon}
            href={item.href}
            loading={loading}
            tone={item.tone}
          />
        ))}
      </section>

      {/* =====================================================
          MAIN GRID
          ===================================================== */}

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        {/* Activity */}

        <SectionCard
          title="Claims & Authorization Activity"
          subtitle="Current operational workload across the HMO."
          icon={TrendingUp}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {activity.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-slate-200 hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.tone}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs font-extrabold text-slate-700">
                        {item.label}
                      </p>

                      <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                        Open module
                      </p>
                    </div>
                  </div>

                  <span className="ml-3 text-lg font-extrabold text-slate-900">
                    {loading
                      ? '—'
                      : formatNumber(
                          item.value,
                        )}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-[#d8eee9] bg-[#f4fbf9] p-4">
            <div className="flex items-start gap-3">
              <Activity className="mt-0.5 h-4 w-4 text-[#1b7b68]" />

              <div>
                <p className="text-xs font-extrabold text-slate-800">
                  Operational snapshot
                </p>

                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  Monitor queues requiring attention
                  and move directly into the relevant
                  HMO workflow.
                </p>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Overview */}

        <SectionCard
          title="HMO Overview"
          subtitle="Coverage, financial and operational activity at a glance."
          icon={Building2}
        >
          <div className="space-y-3">
            {overview.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#1b7b68] shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>

                    <span className="text-xs font-bold text-slate-600">
                      {item.label}
                    </span>
                  </div>

                  <span className="text-sm font-extrabold text-slate-900">
                    {loading
                      ? '—'
                      : formatNumber(
                          item.value,
                        )}
                  </span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </section>

      {/* =====================================================
          MANAGEMENT SNAPSHOT
          ===================================================== */}

      <section className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          title="Billing Snapshot"
          subtitle="Current HMO financial activity."
          icon={Receipt}
          action={
            <Link
              href="/hmo/billings"
              className="text-[11px] font-extrabold text-[#1b7b68] hover:underline"
            >
              Open billing
            </Link>
          }
        >
          <div className="space-y-3">
            <MetricRow
              label="Total records"
              value={
                dashboard.billing.total ??
                0
              }
              loading={loading}
            />

            <MetricRow
              label="Completed"
              value={
                dashboard.billing.completed ??
                dashboard.billing.paid ??
                0
              }
              loading={loading}
            />

            <MetricRow
              label="Pending"
              value={
                dashboard.billing.pending ??
                0
              }
              loading={loading}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Utilization Snapshot"
          subtitle="Healthcare consumption and utilization activity."
          icon={ChartNoAxesCombined}
          action={
            <Link
              href="/hmo/utilization"
              className="text-[11px] font-extrabold text-[#1b7b68] hover:underline"
            >
              Open utilization
            </Link>
          }
        >
          <div className="space-y-3">
            <MetricRow
              label="Total utilization"
              value={
                dashboard.utilization.total ??
                0
              }
              loading={loading}
            />

            <MetricRow
              label="Completed"
              value={
                dashboard.utilization.completed ??
                0
              }
              loading={loading}
            />

            <MetricRow
              label="Pending"
              value={
                dashboard.utilization.pending ??
                0
              }
              loading={loading}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Analytics"
          subtitle="Performance, audits and compliance."
          icon={BarChart3}
          action={
            <Link
              href="/hmo/analytics"
              className="text-[11px] font-extrabold text-[#1b7b68] hover:underline"
            >
              Open analytics
            </Link>
          }
        >
          <div className="space-y-3">
            <MetricRow
              label="Reports"
              value={
                dashboard.analytics.total ??
                dashboard.analytics.generated ??
                0
              }
              loading={loading}
            />

            <MetricRow
              label="Completed"
              value={
                dashboard.analytics.completed ??
                dashboard.analytics.approved ??
                0
              }
              loading={loading}
            />

            <MetricRow
              label="Pending"
              value={
                dashboard.analytics.pending ??
                0
              }
              loading={loading}
            />
          </div>
        </SectionCard>
      </section>

      {/* =====================================================
          OPERATIONS
          ===================================================== */}

      <SectionCard
        title="HMO Operations"
        subtitle="Access the core HMO workflows."
        icon={Activity}
        action={
          <Link
            href="/hmo/settings"
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#1b7b68] hover:underline"
          >
            HMO settings
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {operationalModules.map(
            (module) => {
              const Icon = module.icon;

              return (
                <Link
                  key={module.href}
                  href={module.href}
                  className="group rounded-2xl border border-slate-100 p-4 transition hover:border-[#cfe8e2] hover:bg-[#f7fcfb]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68]">
                    <Icon className="h-4 w-4" />
                  </div>

                  <h3 className="mt-4 text-xs font-extrabold text-slate-800">
                    {module.title}
                  </h3>

                  <p className="mt-1.5 text-[10px] leading-4 text-slate-400">
                    {module.description}
                  </p>

                  <div className="mt-4 flex items-center gap-1 text-[10px] font-extrabold text-[#1b7b68]">
                    View
                    <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            },
          )}
        </div>
      </SectionCard>

      {/* =====================================================
          QUICK ACCESS
          ===================================================== */}

      <section className="grid gap-4 md:grid-cols-3">
        <QuickAction
          href="/hmo/eligibility"
          icon={ClipboardCheck}
          title="Verify Eligibility"
          description="Check member coverage and eligibility status."
        />

        <QuickAction
          href="/hmo/hms-reports"
          icon={FileText}
          title="Generate Reports"
          description="Open operational and management reports."
        />

        <QuickAction
          href="/hmo/hms-notifications"
          icon={Bell}
          title="View Notifications"
          description="Review alerts and HMO operational messages."
        />
      </section>

      {/* =====================================================
          FOOTER STATUS
          ===================================================== */}

      <div className="flex flex-col justify-between gap-2 border-t border-slate-100 pt-2 text-[10px] font-medium text-slate-400 sm:flex-row sm:items-center">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          <Bell className="h-3.5 w-3.5" />
          Dashboard uses live HMO module data.
        </span>

        <span>
          {formatTime(lastUpdated)}
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
   ========================================================= */

function MetricRow({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3.5 py-3">
      <span className="text-xs font-bold text-slate-600">
        {label}
      </span>

      <span className="text-sm font-extrabold text-slate-900">
        {loading
          ? '—'
          : formatNumber(value)}
      </span>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#cfe8e2] hover:bg-[#f7fcfb] hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-extrabold text-slate-900">
            {title}
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            {description}
          </p>

          <div className="mt-4 flex items-center gap-1 text-[10px] font-extrabold text-[#1b7b68]">
            Open
            <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}