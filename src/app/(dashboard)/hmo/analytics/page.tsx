'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  BadgeCheck,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  History,
  LayoutDashboard,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  UserCheck,
  UserCog,
  X,
  XCircle,
} from 'lucide-react';

/* =========================================================
   MEDXVERSE HMO ANALYTICS & REPORTING

   Backend contract:
   GET    /api/v1/analytics/summary
   POST   /api/v1/analytics/reports
   GET    /api/v1/analytics/reports
   GET    /api/v1/analytics/reports/:id

   GET    /api/v1/analytics/audit

   GET    /api/v1/analytics/consents
   POST   /api/v1/analytics/consents
   PATCH  /api/v1/analytics/consents/:id/revoke

   GET    /api/v1/analytics/compliance
   POST   /api/v1/analytics/compliance
   PATCH  /api/v1/analytics/compliance/:id/status

   The page intentionally tolerates data/result/items wrappers
   because the rest of the MedXVerse frontend does the same.
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

const ANALYTICS_URL = `${API_BASE_URL}/analytics`;

const TEAL = '#1b7b68';
const SOFT_TEAL = '#e8f5f3';

type Tab =
  | 'overview'
  | 'reports'
  | 'audit'
  | 'consents'
  | 'compliance';

type Range = '7d' | '30d' | '90d' | '12m';

type ReportType =
  | 'FULL'
  | 'CLAIMS'
  | 'FINANCIAL'
  | 'ENROLLEE'
  | 'PROVIDER_PERFORMANCE'
  | 'COMPLIANCE_AUDIT'
  | 'UTILIZATION';

type ReportFormat = 'JSON' | 'CSV';

type ComplianceStatus =
  | 'DRAFT'
  | 'READY'
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'REJECTED';

interface AnalyticsSummary {
  period: {
    from: string;
    to: string;
  };

  enrolment: {
    total: number;
    active: number;
    suspended: number;
    expired: number;
    newInPeriod: number;
  };

  claims: {
    total: number;
    submitted: number;
    underReview: number;
    approved: number;
    rejected: number;
    paid: number;
    claimedAmount: number;
    approvedAmount: number;
    payableAmount: number;
    paidAmount: number;
    approvalRate: number;
    rejectionRate: number;
    duplicateRiskCount: number;

    monthly: Array<{
      month: string;
      count: number;
      claimed: number;
      approved: number;
      paid: number;
    }>;

    byStatus: Array<{
      _id: string;
      count: number;
      amount: number;
    }>;

    topProviders: Array<{
      _id: string;
      count: number;
      amount: number;
    }>;
  };

  authorization: {
    total: number;
    pending: number;
    approved: number;
    declined: number;
    requestedAmount: number;
    approvedAmount: number;
  };

  finance: {
    invoiceCount: number;
    invoicedAmount: number;
    paymentCount: number;
    receivedAmount: number;
    settlementCount: number;
    settledAmount: number;
  };

  providers: {
    total: number;
    active: number;
  };

  plans: {
    total: number;
    active: number;
  };

  security: {
    auditEvents: number;
    accessEvents: number;
    failedAccessEvents: number;
    consentGrants: number;
    consentRevocations: number;
  };
}

interface AnalyticsReport {
  _id: string;
  reportNumber: string;
  type: ReportType | string;
  format: ReportFormat;
  status: 'GENERATED' | 'FAILED';
  periodFrom: string;
  periodTo: string;
  generatedBy?: string;
  parameters?: Record<string, unknown>;
  payload?: unknown;
  csv?: string;
  error?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AuditLog {
  _id: string;
  actorId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  success: boolean;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

interface Consent {
  _id: string;
  subjectType: 'MEMBER' | 'PROVIDER' | 'USER';
  subjectId: string;
  purpose: string;
  version: string;
  status: 'GRANTED' | 'REVOKED' | 'EXPIRED';
  source?: string;
  grantedAt?: string;
  revokedAt?: string;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ComplianceReport {
  _id: string;
  reportNumber: string;
  type: string;
  periodFrom: string;
  periodTo: string;
  status: ComplianceStatus;
  generatedBy?: string;
  submittedAt?: string;
  submittedBy?: string;
  findings: Array<Record<string, unknown>>;
  metrics?: Record<string, unknown>;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/* =========================================================
   HELPERS
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
    const value = window.localStorage.getItem(key);

    if (!value) continue;

    try {
      const parsed = JSON.parse(value);

      if (typeof parsed === 'string') return parsed;
      if (parsed?.accessToken) return parsed.accessToken;
      if (parsed?.token) return parsed.token;
    } catch {
      return value;
    }
  }

  return null;
}

function headers(): HeadersInit {
  const token = getToken();

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseResponse<T = any>(response: Response): Promise<T> {
  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      json?.message ||
        json?.error ||
        `Request failed with status ${response.status}`,
    );
  }

  return json as T;
}

function unwrap<T>(json: any): T {
  return (json?.data ?? json?.result ?? json) as T;
}

function listFrom<T>(
  json: any,
  keys: string[],
): ListResponse<T> {
  const data = json?.data ?? json?.result ?? json;

  const items = keys.reduce<any[]>(
    (found, key) =>
      Array.isArray(found) && found.length
        ? found
        : Array.isArray(data?.[key])
          ? data[key]
          : [],
    [],
  );

  const finalItems =
    items.length || Array.isArray(data)
      ? Array.isArray(data)
        ? data
        : items
      : [];

  return {
    items: finalItems as T[],
    total: Number(
      data?.total ??
        json?.total ??
        finalItems.length,
    ),
    page: Number(data?.page ?? json?.page ?? 1),
    limit: Number(
      data?.limit ??
        json?.limit ??
        (finalItems.length || 20),
    ),
    totalPages: Number(
      data?.totalPages ??
        json?.totalPages ??
        1,
    ),
  };
}

function money(
  value?: number,
  currency = 'NGN',
) {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch {
    return `${currency} ${Number(value || 0).toLocaleString()}`;
  }
}

function number(value?: number) {
  return Number(value || 0).toLocaleString();
}

function date(value?: string) {
  if (!value) return '—';

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return '—';

  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

function dateTime(value?: string) {
  if (!value) return '—';

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return '—';

  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function humanize(value?: string) {
  if (!value) return '—';

  return value
    .toLowerCase()
    .split('_')
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(' ');
}

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return String(value ?? '');
  }
}

function statusClass(value?: string) {
  switch (value) {
    case 'GENERATED':
    case 'ACCEPTED':
    case 'GRANTED':
    case 'APPROVED':
      return 'border-emerald-100 bg-emerald-50 text-emerald-700';

    case 'READY':
    case 'SUBMITTED':
    case 'PENDING':
      return 'border-amber-100 bg-amber-50 text-amber-700';

    case 'REJECTED':
    case 'FAILED':
    case 'EXPIRED':
      return 'border-rose-100 bg-rose-50 text-rose-700';

    case 'REVOKED':
      return 'border-slate-200 bg-slate-100 text-slate-600';

    default:
      return 'border-purple-100 bg-purple-50 text-purple-700';
  }
}

/* =========================================================
   UI COMPONENTS
   ========================================================= */

function StatusBadge({
  value,
}: {
  value?: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide ${statusClass(value)}`}
    >
      {humanize(value)}
    </span>
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
  icon?: React.ComponentType<{
    className?: string;
  }>;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="rounded-2xl bg-[#e8f5f3] p-2.5 text-[#1b7b68]">
              <Icon className="h-4 w-4" />
            </div>
          )}

          <div>
            <h2 className="text-sm font-black text-slate-800">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-1 text-[10px] text-slate-400">
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

function Kpi({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'teal',
  moneyValue = false,
}: {
  label: string;
  value: number;
  detail: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  tone?: 'teal' | 'amber' | 'red' | 'blue' | 'green';
  moneyValue?: boolean;
}) {
  const toneClasses = {
    teal: 'bg-[#e8f5f3] text-[#1b7b68]',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-rose-50 text-rose-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
  };

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
            {label}
          </p>

          <p className="mt-2 truncate text-xl font-black text-slate-900">
            {moneyValue
              ? money(value)
              : number(value)}
          </p>

          <p className="mt-1 text-[9px] font-semibold text-slate-400">
            {detail}
          </p>
        </div>

        <div
          className={`rounded-2xl p-3 ${toneClasses[tone]}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function Empty({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
      <p className="text-xs font-semibold text-slate-400">
        {text}
      </p>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-slate-50 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="text-base font-black text-slate-800">
            {title}
          </h2>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-64px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#1b7b68]/50 focus:ring-2 focus:ring-[#1b7b68]/10';

const textareaClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#1b7b68]/50 focus:ring-2 focus:ring-[#1b7b68]/10';

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
      <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

/* =========================================================
   PAGE
   ========================================================= */

export default function HMOAnalyticsPage() {
  const [tab, setTab] =
    useState<Tab>('overview');

  const [range, setRange] =
    useState<Range>('30d');

  const [summary, setSummary] =
    useState<AnalyticsSummary | null>(null);

  const [reports, setReports] =
    useState<AnalyticsReport[]>([]);

  const [auditLogs, setAuditLogs] =
    useState<AuditLog[]>([]);

  const [consents, setConsents] =
    useState<Consent[]>([]);

  const [compliance, setCompliance] =
    useState<ComplianceReport[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [reportPage, setReportPage] =
    useState(1);

  const [auditPage, setAuditPage] =
    useState(1);

  const [consentPage, setConsentPage] =
    useState(1);

  const [compliancePage, setCompliancePage] =
    useState(1);

  const [reportPages, setReportPages] =
    useState(1);

  const [auditPages, setAuditPages] =
    useState(1);

  const [consentPages, setConsentPages] =
    useState(1);

  const [compliancePages, setCompliancePages] =
    useState(1);

  const [reportType, setReportType] =
    useState<ReportType>('FULL');

  const [reportFormat, setReportFormat] =
    useState<ReportFormat>('JSON');

  const [reportModal, setReportModal] =
    useState(false);

  const [reportDetails, setReportDetails] =
    useState<AnalyticsReport | null>(null);

  const [complianceModal, setComplianceModal] =
    useState(false);

  const [complianceForm, setComplianceForm] =
    useState({
      type: 'REGULATORY',
      from: '',
      to: '',
      notes: '',
    });

  const [workingId, setWorkingId] =
    useState<string | null>(null);

  const clearFeedback = () => {
    setError('');
    setSuccess('');
  };

  const request = useCallback(
    async (
      path: string,
      options: RequestInit = {},
    ) => {
      const response = await fetch(
        `${ANALYTICS_URL}${path}`,
        {
          ...options,
          headers: {
            ...headers(),
            ...(options.headers || {}),
          },
          credentials: 'include',
          cache: 'no-store',
        },
      );

      return parseResponse(response);
    },
    [],
  );

  const loadSummary = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);

      clearFeedback();

      try {
        const params = new URLSearchParams({
          range,
        });

        const response = await request(
          `/summary?${params.toString()}`,
        );

        setSummary(unwrap<AnalyticsSummary>(response));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load analytics summary.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [range, request],
  );

  const loadReports = useCallback(async () => {
    try {
      const response = await request(
        `/reports?page=${reportPage}&limit=12`,
      );

      const result =
        listFrom<AnalyticsReport>(
          response,
          ['reports', 'items', 'results'],
        );

      setReports(result.items);
      setReportPages(result.totalPages || 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load reports.',
      );
    }
  }, [reportPage, request]);

  const loadAudit = useCallback(async () => {
    try {
      const response = await request(
        `/audit?page=${auditPage}&limit=15`,
      );

      const result =
        listFrom<AuditLog>(
          response,
          ['audit', 'items', 'logs', 'results'],
        );

      setAuditLogs(result.items);
      setAuditPages(result.totalPages || 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load audit logs.',
      );
    }
  }, [auditPage, request]);

  const loadConsents = useCallback(async () => {
    try {
      const response = await request(
        `/consents?page=${consentPage}&limit=15`,
      );

      const result =
        listFrom<Consent>(
          response,
          ['consents', 'items', 'results'],
        );

      setConsents(result.items);
      setConsentPages(result.totalPages || 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load consent records.',
      );
    }
  }, [consentPage, request]);

  const loadCompliance = useCallback(async () => {
    try {
      const response = await request(
        `/compliance?page=${compliancePage}&limit=12`,
      );

      const result =
        listFrom<ComplianceReport>(
          response,
          ['compliance', 'reports', 'items', 'results'],
        );

      setCompliance(result.items);
      setCompliancePages(result.totalPages || 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load compliance reports.',
      );
    }
  }, [compliancePage, request]);

  const loadAll = useCallback(
    async (silent = false) => {
      await Promise.all([
        loadSummary(silent),
        loadReports(),
        loadAudit(),
        loadConsents(),
        loadCompliance(),
      ]);
    },
    [
      loadSummary,
      loadReports,
      loadAudit,
      loadConsents,
      loadCompliance,
    ],
  );

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (tab === 'reports') void loadReports();
  }, [tab, loadReports]);

  useEffect(() => {
    if (tab === 'audit') void loadAudit();
  }, [tab, loadAudit]);

  useEffect(() => {
    if (tab === 'consents') void loadConsents();
  }, [tab, loadConsents]);

  useEffect(() => {
    if (tab === 'compliance') void loadCompliance();
  }, [tab, loadCompliance]);

  const generateReport = async () => {
    setWorkingId('generate');
    clearFeedback();

    try {
      const response = await request('/reports', {
        method: 'POST',
        body: JSON.stringify({
          type: reportType,
          format: reportFormat,
          range,
        }),
      });

      const report =
        unwrap<AnalyticsReport>(response);

      setReportModal(false);
      setSuccess(
        `Report ${report?.reportNumber || ''} generated successfully.`,
      );

      setReportPage(1);
      await Promise.all([
        loadReports(),
        loadSummary(true),
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to generate report.',
      );
    } finally {
      setWorkingId(null);
    }
  };

  const openReport = async (id: string) => {
    clearFeedback();
    setWorkingId(id);

    try {
      const response =
        await request(`/reports/${id}`);

      setReportDetails(
        unwrap<AnalyticsReport>(response),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load report.',
      );
    } finally {
      setWorkingId(null);
    }
  };

  const downloadCsv = (
    report: AnalyticsReport,
  ) => {
    if (!report.csv) {
      setError(
        'This report does not contain CSV data.',
      );
      return;
    }

    const blob = new Blob(
      [report.csv],
      { type: 'text/csv;charset=utf-8;' },
    );

    const url =
      window.URL.createObjectURL(blob);

    const anchor =
      document.createElement('a');

    anchor.href = url;
    anchor.download =
      `${report.reportNumber || 'analytics-report'}.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.URL.revokeObjectURL(url);
  };

  const createCompliance = async () => {
    if (
      !complianceForm.from ||
      !complianceForm.to
    ) {
      setError(
        'Select both the start and end dates.',
      );
      return;
    }

    setWorkingId('compliance-create');
    clearFeedback();

    try {
      await request('/compliance', {
        method: 'POST',
        body: JSON.stringify(
          complianceForm,
        ),
      });

      setComplianceModal(false);
      setSuccess(
        'Compliance report generated successfully.',
      );

      await Promise.all([
        loadCompliance(),
        loadSummary(true),
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create compliance report.',
      );
    } finally {
      setWorkingId(null);
    }
  };

  const changeComplianceStatus = async (
    id: string,
    status: ComplianceStatus,
  ) => {
    setWorkingId(id);
    clearFeedback();

    try {
      await request(
        `/compliance/${id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status,
          }),
        },
      );

      setSuccess(
        `Compliance report marked ${humanize(status)}.`,
      );

      await loadCompliance();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update compliance status.',
      );
    } finally {
      setWorkingId(null);
    }
  };

  const revokeConsent = async (
    id: string,
  ) => {
    if (
      !window.confirm(
        'Revoke this consent record?',
      )
    ) {
      return;
    }

    setWorkingId(id);
    clearFeedback();

    try {
      await request(
        `/consents/${id}/revoke`,
        {
          method: 'PATCH',
        },
      );

      setSuccess(
        'Consent revoked successfully.',
      );

      await Promise.all([
        loadConsents(),
        loadSummary(true),
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to revoke consent.',
      );
    } finally {
      setWorkingId(null);
    }
  };

  const claimsMax = useMemo(() => {
    const monthly =
      summary?.claims.monthly || [];

    return Math.max(
      1,
      ...monthly.map(
        (item) => Number(item.claimed || 0),
      ),
    );
  }, [summary]);

  const statusMax = useMemo(() => {
    const statuses =
      summary?.claims.byStatus || [];

    return Math.max(
      1,
      ...statuses.map(
        (item) => Number(item.count || 0),
      ),
    );
  }, [summary]);

  const kpis = useMemo(() => {
    if (!summary) return [];

    return [
      {
        label: 'Total enrollees',
        value: summary.enrolment.total,
        detail: `${summary.enrolment.active.toLocaleString()} active`,
        icon: Users,
        tone: 'teal' as const,
      },
      {
        label: 'Claims',
        value: summary.claims.total,
        detail: `${summary.claims.approvalRate}% approval rate`,
        icon: FileCheck2,
        tone: 'blue' as const,
      },
      {
        label: 'Claims value',
        value: summary.claims.claimedAmount,
        detail: `${money(summary.claims.paidAmount)} paid`,
        icon: Banknote,
        tone: 'teal' as const,
        moneyValue: true,
      },
      {
        label: 'Authorizations',
        value: summary.authorization.total,
        detail: `${summary.authorization.pending} pending`,
        icon: ShieldCheck,
        tone: 'amber' as const,
      },
      {
        label: 'Providers',
        value: summary.providers.total,
        detail: `${summary.providers.active} active`,
        icon: Building2Icon,
        tone: 'green' as const,
      },
      {
        label: 'Security events',
        value: summary.security.auditEvents,
        detail: `${summary.security.failedAccessEvents} failed access`,
        icon: Lock,
        tone: 'red' as const,
      },
    ];
  }, [summary]);

  const tabs: Array<{
    id: Tab;
    label: string;
    icon: React.ComponentType<{
      className?: string;
    }>;
  }> = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      icon: History,
    },
    {
      id: 'consents',
      label: 'Consent',
      icon: ShieldCheck,
    },
    {
      id: 'compliance',
      label: 'Compliance',
      icon: BadgeCheck,
    },
  ];

  if (loading && !summary) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#1b7b68]" />

          <p className="mt-3 text-xs font-semibold text-slate-400">
            Loading HMO analytics...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f9f8] text-slate-800">
      <div className="mx-auto max-w-375 p-4 md:p-6 lg:p-1">

        {/* HEADER */}
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1b7b68]">
              HMO ANALYTICS
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
              Analytics & Reports
            </h1>

            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Monitor enrolment, claims, utilization, financial
              performance, provider activity, security events and
              compliance from one HMO intelligence workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={range}
              onChange={(event) => {
                setRange(
                  event.target.value as Range,
                );
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-600 outline-none focus:border-[#1b7b68]/40"
            >
              <option value="7d">
                Last 7 days
              </option>
              <option value="30d">
                Last 30 days
              </option>
              <option value="90d">
                Last 90 days
              </option>
              <option value="12m">
                Last 12 months
              </option>
            </select>

            <button
              onClick={() =>
                void loadAll(true)
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-600 hover:border-[#1b7b68]/30"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </button>

            <button
              onClick={() => {
                clearFeedback();
                setReportModal(true);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1b7b68] px-4 text-xs font-extrabold text-white shadow-sm hover:bg-[#166653]"
            >
              <FileText className="h-4 w-4" />
              Generate report
            </button>
          </div>
        </header>

        {/* FEEDBACK */}
        {(error || success) && (
          <div
            className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 text-sm ${
              error
                ? 'border-rose-100 bg-rose-50 text-rose-700'
                : 'border-emerald-100 bg-emerald-50 text-emerald-700'
            }`}
          >
            <div className="mt-0.5">
              {error ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </div>

            <div className="flex-1">
              {error || success}
            </div>

            <button
              onClick={clearFeedback}
              className="rounded-lg hover:bg-black/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* KPI CARDS */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {kpis.map((item) => (
            <Kpi
              key={item.label}
              {...item}
            />
          ))}
        </div>

        {/* TABS */}
        <nav className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-1.5 shadow-sm">
          {tabs.map(
            ({
              id,
              label,
              icon: Icon,
            }) => (
              <button
                key={id}
                onClick={() => {
                  clearFeedback();
                  setTab(id);
                }}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition ${
                  tab === id
                    ? 'bg-[#1b7b68] text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ),
          )}
        </nav>

        {/* OVERVIEW */}
        {tab === 'overview' && summary && (
          <div className="space-y-5">

            {/* Claim + financial snapshot */}
            <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
              <SectionCard
                title="Claims performance"
                subtitle={`${date(summary.period.from)} — ${date(summary.period.to)}`}
                icon={Activity}
                action={
                  <span className="rounded-full bg-[#e8f5f3] px-2.5 py-1 text-[9px] font-extrabold text-[#1b7b68]">
                    {summary.claims.approvalRate}% approval
                  </span>
                }
              >
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    [
                      'Submitted',
                      summary.claims.submitted,
                    ],
                    [
                      'Under review',
                      summary.claims.underReview,
                    ],
                    [
                      'Approved',
                      summary.claims.approved,
                    ],
                    [
                      'Paid',
                      summary.claims.paid,
                    ],
                  ].map(
                    ([label, value]) => (
                      <div
                        key={String(label)}
                        className="rounded-2xl bg-slate-50 p-4"
                      >
                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                          {label}
                        </p>

                        <p className="mt-2 text-xl font-black text-slate-800">
                          {number(
                            Number(value),
                          )}
                        </p>
                      </div>
                    ),
                  )}
                </div>

                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                      Monthly claimed value
                    </p>

                    <p className="text-[10px] font-bold text-slate-400">
                      {money(
                        summary.claims.claimedAmount,
                      )}
                    </p>
                  </div>

                  <div className="flex h-44 items-end gap-2 overflow-hidden rounded-2xl bg-slate-50 px-4 py-4">
                    {summary.claims.monthly.length ? (
                      summary.claims.monthly.map(
                        (item) => {
                          const height =
                            Math.max(
                              8,
                              (Number(
                                item.claimed || 0,
                              ) /
                                claimsMax) *
                                100,
                            );

                          return (
                            <div
                              key={item.month}
                              className="flex h-full flex-1 flex-col justify-end gap-2"
                            >
                              <div
                                className="w-full rounded-t-lg bg-[#1b7b68]/80 transition hover:bg-[#1b7b68]"
                                style={{
                                  height: `${height}%`,
                                }}
                                title={`${item.month}: ${money(item.claimed)}`}
                              />

                              <span className="text-center text-[8px] font-bold text-slate-400">
                                {item.month.slice(
                                  5,
                                )}
                              </span>
                            </div>
                          );
                        },
                      )
                    ) : (
                      <div className="flex w-full items-center justify-center">
                        <p className="text-xs font-semibold text-slate-400">
                          No monthly claim data for this period.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Financial snapshot"
                subtitle="HMO financial activity"
                icon={Banknote}
              >
                <div className="space-y-3">
                  {[
                    [
                      'Invoiced',
                      summary.finance.invoicedAmount,
                    ],
                    [
                      'Received',
                      summary.finance.receivedAmount,
                    ],
                    [
                      'Settled',
                      summary.finance.settledAmount,
                    ],
                  ].map(
                    ([label, value]) => (
                      <div
                        key={String(label)}
                        className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"
                      >
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                          {label}
                        </span>

                        <span className="text-sm font-black text-slate-800">
                          {money(
                            Number(value),
                          )}
                        </span>
                      </div>
                    ),
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-100 p-4">
                      <p className="text-[9px] font-bold text-slate-400">
                        Payments
                      </p>

                      <p className="mt-1 text-lg font-black">
                        {number(
                          summary.finance.paymentCount,
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 p-4">
                      <p className="text-[9px] font-bold text-slate-400">
                        Settlements
                      </p>

                      <p className="mt-1 text-lg font-black">
                        {number(
                          summary.finance.settlementCount,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* Second row */}
            <div className="grid gap-5 xl:grid-cols-3">

              <SectionCard
                title="Claims by status"
                subtitle="Current distribution"
                icon={BarChart3}
              >
                <div className="space-y-4">
                  {summary.claims.byStatus.length ? (
                    summary.claims.byStatus.map(
                      (item) => (
                        <div key={item._id}>
                          <div className="mb-1.5 flex items-center justify-between gap-3">
                            <span className="text-[10px] font-extrabold text-slate-700">
                              {humanize(
                                item._id,
                              )}
                            </span>

                            <span className="text-[10px] font-semibold text-slate-400">
                              {number(
                                item.count,
                              )}
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-[#1b7b68]"
                              style={{
                                width: `${Math.max(
                                  4,
                                  (item.count /
                                    statusMax) *
                                    100,
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      ),
                    )
                  ) : (
                    <Empty text="No claim status data yet." />
                  )}
                </div>
              </SectionCard>

              <SectionCard
                title="Authorization activity"
                subtitle="Pre-authorization workflow"
                icon={ShieldCheck}
              >
                <div className="grid grid-cols-2 gap-3">
                  {[
                    [
                      'Total',
                      summary.authorization.total,
                    ],
                    [
                      'Pending',
                      summary.authorization.pending,
                    ],
                    [
                      'Approved',
                      summary.authorization.approved,
                    ],
                    [
                      'Declined',
                      summary.authorization.declined,
                    ],
                  ].map(
                    ([label, value]) => (
                      <div
                        key={String(label)}
                        className="rounded-2xl bg-slate-50 p-4"
                      >
                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                          {label}
                        </p>

                        <p className="mt-2 text-xl font-black text-slate-800">
                          {number(
                            Number(value),
                          )}
                        </p>
                      </div>
                    ),
                  )}
                </div>

                <div className="mt-4 rounded-2xl border border-[#1b7b68]/10 bg-[#e8f5f3]/50 p-4">
                  <p className="text-[9px] font-extrabold uppercase tracking-wide text-[#1b7b68]">
                    Approved value
                  </p>

                  <p className="mt-1 text-lg font-black text-slate-800">
                    {money(
                      summary.authorization
                        .approvedAmount,
                    )}
                  </p>
                </div>
              </SectionCard>

              <SectionCard
                title="Security & privacy"
                subtitle="Audit and consent posture"
                icon={Lock}
              >
                <div className="space-y-3">
                  {[
                    [
                      'Audit events',
                      summary.security.auditEvents,
                    ],
                    [
                      'Access events',
                      summary.security.accessEvents,
                    ],
                    [
                      'Failed access',
                      summary.security.failedAccessEvents,
                    ],
                    [
                      'Consent grants',
                      summary.security.consentGrants,
                    ],
                    [
                      'Consent revocations',
                      summary.security.consentRevocations,
                    ],
                  ].map(
                    ([label, value]) => (
                      <div
                        key={String(label)}
                        className="flex items-center justify-between rounded-2xl border border-slate-100 p-3"
                      >
                        <span className="text-[10px] font-bold text-slate-500">
                          {label}
                        </span>

                        <span className="text-sm font-black text-slate-800">
                          {number(
                            Number(value),
                          )}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </SectionCard>
            </div>

            {/* Provider + enrollee + plans */}
            <div className="grid gap-5 lg:grid-cols-3">
              <SectionCard
                title="Enrolment"
                subtitle="Membership position"
                icon={Users}
              >
                <div className="grid grid-cols-2 gap-3">
                  <MetricBox
                    label="Total"
                    value={summary.enrolment.total}
                  />
                  <MetricBox
                    label="Active"
                    value={summary.enrolment.active}
                  />
                  <MetricBox
                    label="Suspended"
                    value={summary.enrolment.suspended}
                  />
                  <MetricBox
                    label="New"
                    value={summary.enrolment.newInPeriod}
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="Providers"
                subtitle="Network footprint"
                icon={Building2Icon}
              >
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-5">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                      Total providers
                    </p>

                    <p className="mt-2 text-2xl font-black text-slate-900">
                      {number(
                        summary.providers.total,
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#e8f5f3] p-3 text-[#1b7b68]">
                    <UserCheck className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-[9px] font-bold text-emerald-600">
                    ACTIVE NETWORK
                  </p>

                  <p className="mt-1 text-xl font-black text-emerald-800">
                    {number(
                      summary.providers.active,
                    )}
                  </p>
                </div>
              </SectionCard>

              <SectionCard
                title="Health plans"
                subtitle="Configured benefit plans"
                icon={ClipboardCheck}
              >
                <div className="grid grid-cols-2 gap-3">
                  <MetricBox
                    label="Total plans"
                    value={summary.plans.total}
                  />
                  <MetricBox
                    label="Active plans"
                    value={summary.plans.active}
                  />
                </div>

                <button
                  onClick={() =>
                    setTab('reports')
                  }
                  className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-slate-100 p-3 text-left hover:border-[#1b7b68]/20 hover:bg-[#e8f5f3]/30"
                >
                  <span className="rounded-xl bg-slate-50 p-2 text-[#1b7b68]">
                    <FileText className="h-4 w-4" />
                  </span>

                  <span className="text-xs font-extrabold text-slate-700">
                    Generate plan performance report
                  </span>

                  <ChevronRight className="ml-auto h-4 w-4 text-slate-300" />
                </button>
              </SectionCard>
            </div>

            {/* Top providers */}
            <SectionCard
              title="Top providers by claims"
              subtitle="Highest claim value in the selected period"
              icon={UserCog}
              action={
                <span className="text-[9px] font-bold text-slate-400">
                  Top 10
                </span>
              }
            >
              {summary.claims.topProviders.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-162.5 text-left">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-[9px] font-black uppercase tracking-wide text-slate-400">
                        <th className="px-4 py-3">
                          Provider
                        </th>
                        <th className="px-4 py-3">
                          Claims
                        </th>
                        <th className="px-4 py-3">
                          Claimed value
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {summary.claims.topProviders.map(
                        (provider, index) => (
                          <tr
                            key={provider._id}
                            className="hover:bg-slate-50/60"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e8f5f3] text-[10px] font-black text-[#1b7b68]">
                                  {index + 1}
                                </span>

                                <span className="text-xs font-black text-slate-800">
                                  {provider._id}
                                </span>
                              </div>
                            </td>

                            <td className="px-4 py-3 text-xs font-bold text-slate-600">
                              {number(
                                provider.count,
                              )}
                            </td>

                            <td className="px-4 py-3 text-xs font-black text-slate-800">
                              {money(
                                provider.amount,
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty text="No provider claim data yet." />
              )}
            </SectionCard>
          </div>
        )}

        {/* REPORTS */}
        {tab === 'reports' && (
          <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-black">
                  Generated reports
                </h2>

                <p className="mt-1 text-[10px] text-slate-400">
                  Analytics reports generated from the HMO reporting backend.
                </p>
              </div>

              <button
                onClick={() => {
                  clearFeedback();
                  setReportModal(true);
                }}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#1b7b68] px-3 text-xs font-extrabold text-white"
              >
                <FileText className="h-3.5 w-3.5" />
                New report
              </button>
            </div>

            {reports.length === 0 ? (
              <div className="p-10">
                <Empty text="No generated reports yet." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-225 text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[9px] font-black uppercase tracking-wide text-slate-400">
                      <th className="px-4 py-3">
                        Report
                      </th>
                      <th className="px-4 py-3">
                        Type
                      </th>
                      <th className="px-4 py-3">
                        Format
                      </th>
                      <th className="px-4 py-3">
                        Period
                      </th>
                      <th className="px-4 py-3">
                        Status
                      </th>
                      <th className="px-4 py-3">
                        Created
                      </th>
                      <th className="px-4 py-3">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {reports.map((report) => (
                      <tr
                        key={report._id}
                        className="hover:bg-slate-50/60"
                      >
                        <td className="px-4 py-3">
                          <p className="text-xs font-black text-slate-800">
                            {report.reportNumber}
                          </p>

                          <p className="mt-1 text-[9px] text-slate-400">
                            {report._id}
                          </p>
                        </td>

                        <td className="px-4 py-3 text-xs font-bold">
                          {humanize(report.type)}
                        </td>

                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">
                            {report.format}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-[10px] font-semibold text-slate-500">
                          {date(report.periodFrom)} —{' '}
                          {date(report.periodTo)}
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge
                            value={report.status}
                          />
                        </td>

                        <td className="px-4 py-3 text-[10px] text-slate-500">
                          {dateTime(report.createdAt)}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                void openReport(
                                  report._id,
                                )
                              }
                              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            {report.format === 'CSV' && (
                              <button
                                onClick={() =>
                                  void openReport(
                                    report._id,
                                  )
                                }
                                className="rounded-lg p-2 text-[#1b7b68] hover:bg-[#e8f5f3]"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              page={reportPage}
              totalPages={reportPages}
              setPage={setReportPage}
            />
          </section>
        )}

        {/* AUDIT */}
        {tab === 'audit' && (
          <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4">
              <h2 className="text-sm font-black">
                Security & audit trail
              </h2>

              <p className="mt-1 text-[10px] text-slate-400">
                Append-only analytics security events recorded by the backend.
              </p>
            </div>

            {auditLogs.length === 0 ? (
              <div className="p-10">
                <Empty text="No audit events found." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-237.5 text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[9px] font-black uppercase tracking-wide text-slate-400">
                      <th className="px-4 py-3">
                        Time
                      </th>
                      <th className="px-4 py-3">
                        Action
                      </th>
                      <th className="px-4 py-3">
                        Resource
                      </th>
                      <th className="px-4 py-3">
                        Actor
                      </th>
                      <th className="px-4 py-3">
                        IP
                      </th>
                      <th className="px-4 py-3">
                        Result
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr
                        key={log._id}
                        className="hover:bg-slate-50/60"
                      >
                        <td className="px-4 py-3 text-[10px] font-semibold text-slate-500">
                          {dateTime(log.createdAt)}
                        </td>

                        <td className="px-4 py-3">
                          <p className="text-xs font-black text-slate-800">
                            {humanize(log.action)}
                          </p>
                        </td>

                        <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                          {humanize(log.resource)}
                        </td>

                        <td className="px-4 py-3 text-[10px] text-slate-500">
                          {log.actorId || 'System'}
                        </td>

                        <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                          {log.ip || '—'}
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge
                            value={
                              log.success
                                ? 'SUCCESS'
                                : 'FAILED'
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              page={auditPage}
              totalPages={auditPages}
              setPage={setAuditPage}
            />
          </section>
        )}

        {/* CONSENTS */}
        {tab === 'consents' && (
          <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4">
              <h2 className="text-sm font-black">
                Consent & privacy records
              </h2>

              <p className="mt-1 text-[10px] text-slate-400">
                Track privacy consent grants, revocations, versions and expiry.
              </p>
            </div>

            {consents.length === 0 ? (
              <div className="p-10">
                <Empty text="No consent records found." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-237.5 text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[9px] font-black uppercase tracking-wide text-slate-400">
                      <th className="px-4 py-3">
                        Subject
                      </th>
                      <th className="px-4 py-3">
                        Purpose
                      </th>
                      <th className="px-4 py-3">
                        Version
                      </th>
                      <th className="px-4 py-3">
                        Status
                      </th>
                      <th className="px-4 py-3">
                        Granted
                      </th>
                      <th className="px-4 py-3">
                        Expires
                      </th>
                      <th className="px-4 py-3">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {consents.map((consent) => (
                      <tr
                        key={consent._id}
                        className="hover:bg-slate-50/60"
                      >
                        <td className="px-4 py-3">
                          <p className="text-xs font-black text-slate-800">
                            {humanize(
                              consent.subjectType,
                            )}
                          </p>

                          <p className="mt-1 font-mono text-[9px] text-slate-400">
                            {consent.subjectId}
                          </p>
                        </td>

                        <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                          {consent.purpose}
                        </td>

                        <td className="px-4 py-3 text-xs font-bold">
                          v{consent.version}
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge
                            value={consent.status}
                          />
                        </td>

                        <td className="px-4 py-3 text-[10px] text-slate-500">
                          {dateTime(
                            consent.grantedAt,
                          )}
                        </td>

                        <td className="px-4 py-3 text-[10px] text-slate-500">
                          {dateTime(
                            consent.expiresAt,
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {consent.status ===
                            'GRANTED' && (
                            <button
                              disabled={
                                workingId ===
                                consent._id
                              }
                              onClick={() =>
                                void revokeConsent(
                                  consent._id,
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-1.5 text-[9px] font-extrabold text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                            >
                              {workingId ===
                              consent._id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <XCircle className="h-3 w-3" />
                              )}
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              page={consentPage}
              totalPages={consentPages}
              setPage={setConsentPage}
            />
          </section>
        )}

        {/* COMPLIANCE */}
        {tab === 'compliance' && (
          <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-black">
                  Compliance & regulatory reports
                </h2>

                <p className="mt-1 text-[10px] text-slate-400">
                  Generate compliance findings and move reports through the submission lifecycle.
                </p>
              </div>

              <button
                onClick={() => {
                  clearFeedback();

                  const now =
                    new Date();

                  const prior =
                    new Date(now);

                  prior.setDate(
                    prior.getDate() - 30,
                  );

                  setComplianceForm({
                    type: 'REGULATORY',
                    from: prior
                      .toISOString()
                      .slice(0, 10),
                    to: now
                      .toISOString()
                      .slice(0, 10),
                    notes: '',
                  });

                  setComplianceModal(true);
                }}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#1b7b68] px-3 text-xs font-extrabold text-white"
              >
                <BadgeCheck className="h-3.5 w-3.5" />
                New compliance report
              </button>
            </div>

            {compliance.length === 0 ? (
              <div className="p-10">
                <Empty text="No compliance reports generated yet." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-250 text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[9px] font-black uppercase tracking-wide text-slate-400">
                      <th className="px-4 py-3">
                        Report
                      </th>
                      <th className="px-4 py-3">
                        Type
                      </th>
                      <th className="px-4 py-3">
                        Period
                      </th>
                      <th className="px-4 py-3">
                        Findings
                      </th>
                      <th className="px-4 py-3">
                        Status
                      </th>
                      <th className="px-4 py-3">
                        Created
                      </th>
                      <th className="px-4 py-3">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {compliance.map(
                      (report) => (
                        <tr
                          key={report._id}
                          className="hover:bg-slate-50/60"
                        >
                          <td className="px-4 py-3">
                            <p className="text-xs font-black text-slate-800">
                              {report.reportNumber}
                            </p>

                            <p className="mt-1 text-[9px] text-slate-400">
                              {report._id}
                            </p>
                          </td>

                          <td className="px-4 py-3 text-xs font-bold">
                            {humanize(
                              report.type,
                            )}
                          </td>

                          <td className="px-4 py-3 text-[10px] font-semibold text-slate-500">
                            {date(
                              report.periodFrom,
                            )}{' '}
                            —{' '}
                            {date(
                              report.periodTo,
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">
                              {report.findings?.length ||
                                0}{' '}
                              finding
                              {report.findings
                                ?.length === 1
                                ? ''
                                : 's'}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <StatusBadge
                              value={
                                report.status
                              }
                            />
                          </td>

                          <td className="px-4 py-3 text-[10px] text-slate-500">
                            {dateTime(
                              report.createdAt,
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <select
                              disabled={
                                workingId ===
                                report._id
                              }
                              value={
                                report.status
                              }
                              onChange={(event) =>
                                void changeComplianceStatus(
                                  report._id,
                                  event.target
                                    .value as ComplianceStatus,
                                )
                              }
                              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[9px] font-bold text-slate-600 outline-none focus:border-[#1b7b68]/40"
                            >
                              <option value="DRAFT">
                                Draft
                              </option>
                              <option value="READY">
                                Ready
                              </option>
                              <option value="SUBMITTED">
                                Submitted
                              </option>
                              <option value="ACCEPTED">
                                Accepted
                              </option>
                              <option value="REJECTED">
                                Rejected
                              </option>
                            </select>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              page={compliancePage}
              totalPages={compliancePages}
              setPage={setCompliancePage}
            />
          </section>
        )}

        {/* REPORT GENERATION MODAL */}
        {reportModal && (
          <Modal
            title="Generate analytics report"
            onClose={() =>
              setReportModal(false)
            }
          >
            <div className="space-y-5 p-6">
              <div className="rounded-2xl border border-[#1b7b68]/10 bg-[#e8f5f3] p-4">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-4 w-4 text-[#1b7b68]" />

                  <div>
                    <p className="text-xs font-black text-[#1b7b68]">
                      HMO reporting engine
                    </p>

                    <p className="mt-1 text-[10px] leading-5 text-slate-500">
                      Generate an auditable report for the selected analytics period.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Report type">
                  <select
                    className={inputClass}
                    value={reportType}
                    onChange={(event) =>
                      setReportType(
                        event.target
                          .value as ReportType,
                      )
                    }
                  >
                    <option value="FULL">
                      Full analytics
                    </option>
                    <option value="CLAIMS">
                      Claims
                    </option>
                    <option value="FINANCIAL">
                      Financial
                    </option>
                    <option value="ENROLLEE">
                      Enrolment
                    </option>
                    <option value="PROVIDER_PERFORMANCE">
                      Provider performance
                    </option>
                    <option value="COMPLIANCE_AUDIT">
                      Compliance audit
                    </option>
                    <option value="UTILIZATION">
                      Utilization
                    </option>
                  </select>
                </Field>

                <Field label="Format">
                  <select
                    className={inputClass}
                    value={reportFormat}
                    onChange={(event) =>
                      setReportFormat(
                        event.target
                          .value as ReportFormat,
                      )
                    }
                  >
                    <option value="JSON">
                      JSON
                    </option>
                    <option value="CSV">
                      CSV
                    </option>
                  </select>
                </Field>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">
                  Selected period
                </p>

                <p className="mt-1 text-sm font-black text-slate-800">
                  {humanize(range)}
                </p>

                <p className="mt-1 text-[10px] text-slate-400">
                  {summary
                    ? `${date(summary.period.from)} — ${date(summary.period.to)}`
                    : 'Current analytics range'}
                </p>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  onClick={() =>
                    setReportModal(false)
                  }
                  className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>

                <button
                  disabled={
                    workingId === 'generate'
                  }
                  onClick={() =>
                    void generateReport()
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1b7b68] px-5 text-xs font-extrabold text-white disabled:opacity-50"
                >
                  {workingId ===
                  'generate' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}

                  Generate report
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* REPORT DETAILS */}
        {reportDetails && (
          <Modal
            title={`${reportDetails.reportNumber} details`}
            onClose={() =>
              setReportDetails(null)
            }
          >
            <div className="space-y-5 p-6">
              <div className="grid gap-3 md:grid-cols-4">
                <MetricBox
                  label="Type"
                  valueLabel={humanize(
                    reportDetails.type,
                  )}
                />

                <MetricBox
                  label="Format"
                  valueLabel={
                    reportDetails.format
                  }
                />

                <MetricBox
                  label="Status"
                  valueLabel={humanize(
                    reportDetails.status,
                  )}
                />

                <MetricBox
                  label="Created"
                  valueLabel={dateTime(
                    reportDetails.createdAt,
                  )}
                />
              </div>

              {reportDetails.format ===
                'CSV' &&
                reportDetails.csv && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-black">
                        CSV output
                      </p>

                      <button
                        onClick={() =>
                          downloadCsv(
                            reportDetails,
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-[#1b7b68] px-3 py-2 text-[10px] font-extrabold text-white"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download CSV
                      </button>
                    </div>

                    <pre className="max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-[10px] leading-5 text-slate-200">
                      {reportDetails.csv}
                    </pre>
                  </div>
                )}

              {Boolean(reportDetails.payload) && (
                <div>
                  <p className="mb-2 text-xs font-black">
                    Report data
                  </p>

                  <pre className="max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-[10px] leading-5 text-slate-200">
                    {formatJson(reportDetails.payload)}
                  </pre>
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* COMPLIANCE MODAL */}
        {complianceModal && (
          <Modal
            title="Generate compliance report"
            onClose={() =>
              setComplianceModal(false)
            }
          >
            <div className="space-y-5 p-6">
              <div className="rounded-2xl border border-[#1b7b68]/10 bg-[#e8f5f3] p-4">
                <p className="text-xs font-black text-[#1b7b68]">
                  Regulatory compliance
                </p>

                <p className="mt-1 text-[10px] leading-5 text-slate-500">
                  The backend will evaluate the selected period for claim rejection,
                  duplicate-risk claims and security access findings.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Report type">
                  <select
                    className={inputClass}
                    value={
                      complianceForm.type
                    }
                    onChange={(event) =>
                      setComplianceForm({
                        ...complianceForm,
                        type: event.target.value,
                      })
                    }
                  >
                    <option value="REGULATORY">
                      Regulatory
                    </option>
                    <option value="INTERNAL">
                      Internal
                    </option>
                    <option value="SECURITY">
                      Security
                    </option>
                    <option value="CLAIMS">
                      Claims compliance
                    </option>
                  </select>
                </Field>

                <Field label="Start date">
                  <input
                    type="date"
                    className={inputClass}
                    value={
                      complianceForm.from
                    }
                    onChange={(event) =>
                      setComplianceForm({
                        ...complianceForm,
                        from: event.target.value,
                      })
                    }
                  />
                </Field>

                <Field label="End date">
                  <input
                    type="date"
                    className={inputClass}
                    value={complianceForm.to}
                    onChange={(event) =>
                      setComplianceForm({
                        ...complianceForm,
                        to: event.target.value,
                      })
                    }
                  />
                </Field>

                <Field label="Notes">
                  <textarea
                    rows={3}
                    className={textareaClass}
                    value={
                      complianceForm.notes
                    }
                    onChange={(event) =>
                      setComplianceForm({
                        ...complianceForm,
                        notes: event.target.value,
                      })
                    }
                  />
                </Field>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  onClick={() =>
                    setComplianceModal(false)
                  }
                  className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>

                <button
                  disabled={
                    workingId ===
                    'compliance-create'
                  }
                  onClick={() =>
                    void createCompliance()
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1b7b68] px-5 text-xs font-extrabold text-white disabled:opacity-50"
                >
                  {workingId ===
                  'compliance-create' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <BadgeCheck className="h-4 w-4" />
                  )}

                  Generate compliance report
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
   ========================================================= */

function MetricBox({
  label,
  value,
  valueLabel,
}: {
  label: string;
  value?: number;
  valueLabel?: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-lg font-black text-slate-800">
        {valueLabel ??
          number(value || 0)}
      </p>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  setPage,
}: {
  page: number;
  totalPages: number;
  setPage: React.Dispatch<
    React.SetStateAction<number>
  >;
}) {
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
      <p className="text-[10px] font-semibold text-slate-400">
        Page {page} of {totalPages}
      </p>

      <div className="flex gap-1">
        <button
          disabled={page <= 1}
          onClick={() =>
            setPage((current) =>
              Math.max(1, current - 1),
            )
          }
          className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        <button
          disabled={page >= totalPages}
          onClick={() =>
            setPage((current) =>
              Math.min(
                totalPages,
                current + 1,
              ),
            )
          }
          className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function Building2Icon({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 21h18" />
      <path d="M6 21V3h12v18" />
      <path d="M9 7h2" />
      <path d="M13 7h2" />
      <path d="M9 11h2" />
      <path d="M13 11h2" />
      <path d="M9 15h2" />
      <path d="M13 15h2" />
    </svg>
  );
}