'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'https://medxverse-backend.onrender.com/api/v1';

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
};

type DashboardData = {
  claims: Stats;
  preAuth: Stats;
  enrollees: Stats;
  benefits: Stats;
  tariffs: Stats;
};

type ActivityItem = {
  label: string;
  value: number;
  href: string;
  icon: React.ElementType;
  tone: string;
};

function getToken(): string | null {
  if (typeof window === 'undefined') return null;

  for (const key of ['token', 'accessToken', 'access_token', 'authToken', 'jwt']) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') return parsed;
      if (parsed?.accessToken) return parsed.accessToken;
      if (parsed?.token) return parsed.token;
    } catch {
      return raw;
    }
  }

  return null;
}

async function request<T>(path: string): Promise<T> {
  const token = getToken();

  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });

  const json = (await response.json().catch(() => ({}))) as ApiEnvelope<T> | T;

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

function asNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function extractStats(value: unknown): Stats {
  if (!value || typeof value !== 'object') return {};

  const source = value as Record<string, unknown>;
  const nested =
    (source.stats as Record<string, unknown> | undefined) ??
    (source.summary as Record<string, unknown> | undefined) ??
    source;

  return {
    total: asNumber(nested.total ?? nested.totalCount ?? nested.count),
    newRequests: asNumber(nested.newRequests),
    pending: asNumber(nested.pending ?? nested.pendingCount),
    approvedToday: asNumber(nested.approvedToday),
    declined: asNumber(nested.declined ?? nested.declinedCount),
    submitted: asNumber(nested.submitted),
    underReview: asNumber(nested.underReview),
    approved: asNumber(nested.approved),
    rejected: asNumber(nested.rejected),
    paid: asNumber(nested.paid),
    cancelled: asNumber(nested.cancelled),
    draft: asNumber(nested.draft),
    active: asNumber(nested.active ?? nested.activeCount),
    inactive: asNumber(nested.inactive ?? nested.inactiveCount),
  };
}

async function safeStats(path: string): Promise<Stats> {
  try {
    const result = await request<unknown>(path);
    return extractStats(result);
  } catch {
    return {};
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-NG').format(value);
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  loading,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ElementType;
  href: string;
  loading: boolean;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            {title}
          </p>

          <div className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
            {loading ? (
              <Loader2 className="h-7 w-7 animate-spin text-[#1b7b68]" />
            ) : (
              formatNumber(value)
            )}
          </div>

          <p className="mt-1 text-xs font-medium text-slate-400">{subtitle}</p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]">
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

export default function HMODashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData>({
    claims: {},
    preAuth: {},
    enrollees: {},
    benefits: {},
    tariffs: {},
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);

    setError('');

    try {
      /*
       * The HMO dashboard deliberately consumes the already-built module
       * endpoints instead of inventing a second source of truth.
       *
       * Stats endpoints are used where the module exposes one. For modules
       * that only expose list endpoints, the list response is normalized.
       */
      const [
        claimsStats,
        preAuthStats,
        enrolleesStats,
        benefitsStats,
        tariffsStats,
      ] = await Promise.all([
        safeStats('/claims/stats'),
        safeStats('/pre-authorizations/stats'),
        safeStats('/enrollees/stats'),
        safeStats('/benefits/stats'),
        safeStats('/tariffs/stats'),
      ]);

      setDashboard({
        claims: claimsStats,
        preAuth: preAuthStats,
        enrollees: enrolleesStats,
        benefits: benefitsStats,
        tariffs: tariffsStats,
      });

      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load HMO dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const kpis = useMemo(
    () => [
      {
        title: 'Enrollees',
        value: dashboard.enrollees.total ?? dashboard.enrollees.active ?? 0,
        subtitle: 'Members under HMO management',
        icon: Users,
        href: '/hmo/enrollees',
      },
      {
        title: 'Pending Claims',
        value:
          dashboard.claims.pending ??
          dashboard.claims.underReview ??
          dashboard.claims.submitted ??
          0,
        subtitle: 'Claims requiring attention',
        icon: FileCheck,
        href: '/hmo/claims',
      },
      {
        title: 'Pre-Authorizations',
        value:
          dashboard.preAuth.pending ??
          dashboard.preAuth.newRequests ??
          0,
        subtitle: 'Requests awaiting review',
        icon: ShieldCheck,
        href: '/hmo/pre-auth',
      },
      {
        title: 'Active Tariffs',
        value: dashboard.tariffs.active ?? 0,
        subtitle: 'Currently configured rates',
        icon: CreditCard,
        href: '/hmo/tariffs',
      },
    ],
    [dashboard],
  );

  const activity: ActivityItem[] = [
    {
      label: 'Submitted claims',
      value: dashboard.claims.submitted ?? 0,
      href: '/hmo/claims',
      icon: FileCheck,
      tone: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Claims under review',
      value: dashboard.claims.underReview ?? dashboard.claims.pending ?? 0,
      href: '/hmo/claims',
      icon: Clock3,
      tone: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Approved claims',
      value: dashboard.claims.approved ?? 0,
      href: '/hmo/claims',
      icon: CheckCircle2,
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Declined authorizations',
      value: dashboard.preAuth.declined ?? 0,
      href: '/hmo/pre-auth',
      icon: XCircle,
      tone: 'bg-rose-50 text-rose-700',
    },
  ];

  const operationalModules = [
    {
      title: 'Claims Adjudication',
      description: 'Review, approve, reject and monitor submitted claims.',
      href: '/hmo/claims',
      icon: FileCheck,
    },
    {
      title: 'Pre-Authorizations',
      description: 'Manage clinical requests and authorization decisions.',
      href: '/hmo/pre-auth',
      icon: ShieldCheck,
    },
    {
      title: 'Enrollee Registry',
      description: 'Maintain enrollee records, plans and eligibility.',
      href: '/hmo/enrollees',
      icon: Users,
    },
    {
      title: 'Benefits',
      description: 'Manage covered services, limits and benefit rules.',
      href: '/hmo/benefits',
      icon: WalletCards,
    },
    {
      title: 'Tariffs & Plans',
      description: 'Maintain service tariffs, provider rates and pricing.',
      href: '/hmo/tariffs',
      icon: CreditCard,
    },
  ];

  return (
    <div className="min-h-full space-y-6 font-sans text-slate-800 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#e8f5f3]">
              <BarChart3 className="h-4.5 w-4.5 text-[#1b7b68]" />
            </div>

            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#1b7b68]">
              MedxVerse HMO
            </span>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            HMO Hub
          </h1>

          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            Monitor enrollee coverage, claims, pre-authorizations, benefits and
            provider pricing from one operational dashboard.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            HMO services online
          </div>

          <button
            type="button"
            onClick={() => void loadDashboard(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
          <Activity className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-bold">Dashboard data could not be fully loaded.</p>
            <p className="mt-0.5 text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* KPI cards */}
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
          />
        ))}
      </section>

      {/* Main dashboard grid */}
      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Claims & Authorization Activity
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Current operational workload across the HMO.
              </p>
            </div>

            <TrendingUp className="h-5 w-5 text-[#1b7b68]" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {activity.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-slate-200 hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.tone}`}>
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
                    {loading ? '—' : formatNumber(item.value)}
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
                  Use the cards above to move directly from the dashboard into
                  the queue that needs attention.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                HMO Overview
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Coverage and configuration at a glance.
              </p>
            </div>
            <Building2 className="h-5 w-5 text-[#1b7b68]" />
          </div>

          <div className="mt-5 space-y-3">
            {[
              {
                label: 'Active enrollees',
                value: dashboard.enrollees.active ?? dashboard.enrollees.total ?? 0,
                icon: Users,
              },
              {
                label: 'Active benefits',
                value: dashboard.benefits.active ?? dashboard.benefits.total ?? 0,
                icon: WalletCards,
              },
              {
                label: 'Active tariffs',
                value: dashboard.tariffs.active ?? 0,
                icon: CreditCard,
              },
              {
                label: 'Paid claims',
                value: dashboard.claims.paid ?? 0,
                icon: CheckCircle2,
              },
            ].map((item) => {
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
                    {loading ? '—' : formatNumber(item.value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              HMO Operations
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Access the core HMO workflows.
            </p>
          </div>

          <Link
            href="/hmo/settings"
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#1b7b68] hover:underline"
          >
            HMO settings
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {operationalModules.map((module) => {
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
          })}
        </div>
      </section>

      {/* Footer status */}
      <div className="flex flex-col justify-between gap-2 border-t border-slate-100 pt-2 text-[10px] font-medium text-slate-400 sm:flex-row sm:items-center">
        <span className="inline-flex items-center gap-1.5">
          <Bell className="h-3.5 w-3.5" />
          Dashboard uses live HMO module data.
        </span>

        <span>
          {lastUpdated
            ? `Last updated ${lastUpdated.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}`
            : 'Loading live data…'}
        </span>
      </div>
    </div>
  );
}
