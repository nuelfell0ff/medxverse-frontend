"use client";

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileWarning,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
  Zap,
} from "lucide-react";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ||
  "https://medxverse-backend.onrender.com/api/v1"
).replace(/\/$/, "");

const BASE_URL = `${API_BASE}/hmo-utilization`;

type Tab = "overview" | "events" | "alerts" | "cases" | "rules";

type Summary = {
  utilization: {
    eventCount: number;
    totalAmount: number;
    totalQuantity: number;
    byCategory: Array<{ _id: string; count: number; amount: number }>;
    topProviders: Array<{ _id: string; count: number; amount: number }>;
  };
  fraud: {
    openAlerts: number;
    highRiskAlerts: number;
    openCases: number;
    confirmedCases: number;
    estimatedLoss: number;
    recoveredAmount: number;
  };
};

type ListResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type UtilizationEvent = {
  _id: string;
  memberId: string;
  providerId?: string;
  claimId?: string;
  preAuthorizationId?: string;
  serviceCode?: string;
  serviceName?: string;
  category: string;
  sourceType: string;
  serviceDate: string;
  quantity: number;
  amount: number;
  diagnosisCodes?: string[];
};

type FraudAlert = {
  _id: string;
  ruleId: string;
  status: string;
  severity: string;
  title: string;
  description?: string;
  entityType: string;
  memberId?: string;
  providerId?: string;
  claimIds?: string[];
  evidence?: Record<string, any>;
  score: number;
  createdAt: string;
  reviewedAt?: string;
  reviewNote?: string;
};

type FraudCase = {
  _id: string;
  caseNumber: string;
  alertId?: string;
  title: string;
  description?: string;
  status: string;
  severity: string;
  entityType: string;
  memberId?: string;
  providerId?: string;
  claimIds?: string[];
  estimatedLoss: number;
  recoveredAmount: number;
  assignedTo?: string;
  finding?: string;
  notes?: string;
  openedAt: string;
  resolvedAt?: string;
};

type FraudRule = {
  _id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  entityType: string;
  severity: string;
  enabled: boolean;
  threshold: number;
  operator: string;
  windowDays: number;
  action: "ALERT" | "CASE";
};

const categories = ["VISIT", "ADMISSION", "PROCEDURE", "PHARMACY", "LABORATORY", "IMAGING", "OTHER"];
const sourceTypes = ["CLAIM", "PRE_AUTH", "ELIGIBILITY", "BILLING", "MANUAL"];
const severities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const alertStatuses = ["OPEN", "ACKNOWLEDGED", "INVESTIGATING", "RESOLVED", "DISMISSED"];
const caseStatuses = ["OPEN", "INVESTIGATING", "CONFIRMED", "DISMISSED", "RECOVERED", "CLOSED"];
const entityTypes = ["MEMBER", "PROVIDER", "CLAIM", "BILLING", "MULTIPLE"];
const operators = ["GT", "GTE", "LT", "LTE", "EQ", "NEQ"];

function unwrap<T = any>(json: any): T {
  return (json?.data ?? json?.result ?? json) as T;
}

function listFrom<T>(json: any, keys: string[]): ListResponse<T> {
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

  const finalItems = items.length || Array.isArray(data)
    ? (Array.isArray(data) ? data : items)
    : [];

  return {
    items: finalItems as T[],
    total: Number(data?.total ?? json?.total ?? finalItems.length),
    page: Number(data?.page ?? json?.page ?? 1),
    limit: Number(data?.limit ?? json?.limit ?? 15),
    totalPages: Number(data?.totalPages ?? json?.totalPages ?? 1),
  };
}

function money(value?: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function shortId(value?: string) {
  if (!value) return "—";
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-7)}` : value;
}

function dateTime(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

function badgeClass(value: string) {
  const v = String(value || "").toUpperCase();

  if (["CRITICAL", "HIGH"].includes(v)) return "border-rose-200 bg-rose-50 text-rose-700";
  if (["MEDIUM", "INVESTIGATING", "ACKNOWLEDGED"].includes(v)) return "border-amber-200 bg-amber-50 text-amber-700";
  if (["LOW", "OPEN"].includes(v)) return "border-sky-200 bg-sky-50 text-sky-700";
  if (["RESOLVED", "DISMISSED", "RECOVERED", "CLOSED", "CONFIRMED"].includes(v)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("accessToken") || localStorage.getItem("token") || localStorage.getItem("authToken") || "";
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `Request failed with status ${res.status}`);
  }

  return json as T;
}

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#1b7b68]/40 focus:ring-4 focus:ring-[#1b7b68]/10";

const textareaClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#1b7b68]/40 focus:ring-4 focus:ring-[#1b7b68]/10";

const primaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1b7b68] px-4 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#156654] disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-600 transition hover:border-[#1b7b68]/25 hover:bg-[#e8f5f3]/30";

function Modal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-100 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-black text-slate-900">{title}</h2>
            {subtitle && <p className="mt-1 text-[10px] leading-5 text-slate-400">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  required,
  hint,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <div className="mb-1.5 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
        <span>
          {label}
          {required && <span className="text-rose-500"> *</span>}
        </span>
        {hint && <span className="font-medium normal-case tracking-normal text-slate-400">· {hint}</span>}
      </div>
      {children}
    </label>
  );
}

function Badge({ value }: { value: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-extrabold ${badgeClass(value)}`}>
      {value}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center">
      <Activity className="mx-auto h-5 w-5 text-slate-300" />
      <p className="mt-2 text-[10px] font-bold text-slate-400">{text}</p>
    </div>
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
  subtitle: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <span className="rounded-2xl bg-[#e8f5f3] p-2.5 text-[#1b7b68]">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div>
            <h2 className="text-sm font-black text-slate-800">{title}</h2>
            <p className="mt-0.5 text-[10px] text-slate-400">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 grid gap-3 rounded-2xl bg-slate-50/80 p-3 sm:grid-cols-2 xl:grid-cols-4">
      {children}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 text-[10px] font-semibold text-slate-400 sm:flex-row sm:items-center sm:justify-between">
      <span>{total.toLocaleString()} total records</span>
      <div className="flex items-center gap-2">
        <button className={secondaryButton} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous
        </button>
        <span className="min-w-[90px] text-center">
          Page {page} of {Math.max(1, totalPages)}
        </span>
        <button className={secondaryButton} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function DataTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  empty: string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100">
      <table className="min-w-[1050px] w-full text-left">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70">
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.length ? (
            rows.map((row, i) => (
              <tr key={i} className="transition hover:bg-slate-50/60">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-3.5 align-top text-xs text-slate-600">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={headers.length}>
                <Empty text={empty} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function HMOUtilizationPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [events, setEvents] = useState<ListResponse<UtilizationEvent>>({ items: [], total: 0, page: 1, limit: 15, totalPages: 1 });
  const [alerts, setAlerts] = useState<ListResponse<FraudAlert>>({ items: [], total: 0, page: 1, limit: 15, totalPages: 1 });
  const [cases, setCases] = useState<ListResponse<FraudCase>>({ items: [], total: 0, page: 1, limit: 15, totalPages: 1 });
  const [rules, setRules] = useState<FraudRule[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [eventPage, setEventPage] = useState(1);
  const [alertPage, setAlertPage] = useState(1);
  const [casePage, setCasePage] = useState(1);

  const [eventFilters, setEventFilters] = useState({
    search: "",
    category: "",
    sourceType: "",
    memberId: "",
    providerId: "",
    fromDate: "",
    toDate: "",
  });

  const [alertFilters, setAlertFilters] = useState({
    status: "",
    severity: "",
    memberId: "",
    providerId: "",
  });

  const [caseFilters, setCaseFilters] = useState({
    status: "",
    severity: "",
    entityType: "",
    search: "",
  });

  const [modal, setModal] = useState<"event" | "rule" | "case" | "alert" | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [selectedCase, setSelectedCase] = useState<FraudCase | null>(null);

  const [eventForm, setEventForm] = useState({
    memberId: "",
    providerId: "",
    claimId: "",
    preAuthorizationId: "",
    serviceCode: "",
    serviceName: "",
    category: "VISIT",
    sourceType: "MANUAL",
    serviceDate: new Date().toISOString().slice(0, 10),
    quantity: "1",
    amount: "0",
    diagnosisCodes: "",
  });

  const [ruleForm, setRuleForm] = useState({
    code: "",
    name: "",
    description: "",
    category: "HIGH_FREQUENCY_MEMBER",
    entityType: "MEMBER",
    severity: "MEDIUM",
    enabled: true,
    threshold: "5",
    operator: "GTE",
    windowDays: "30",
    action: "ALERT",
  });

  const [caseForm, setCaseForm] = useState({
    title: "",
    description: "",
    severity: "MEDIUM",
    entityType: "MULTIPLE",
    memberId: "",
    providerId: "",
    estimatedLoss: "0",
    notes: "",
  });

  const [alertReview, setAlertReview] = useState({ status: "ACKNOWLEDGED", note: "" });

  const [caseEdit, setCaseEdit] = useState({
    status: "INVESTIGATING",
    severity: "MEDIUM",
    assignedTo: "",
    finding: "",
    recoveredAmount: "0",
    notes: "",
  });

  const loadSummary = useCallback(async () => {
    const json = await api<any>("/summary");
    setSummary(unwrap<Summary>(json));
  }, []);

  const loadEvents = useCallback(async () => {
    const params = new URLSearchParams({ page: String(eventPage), limit: "15" });
    Object.entries(eventFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    const json = await api<any>(`/events?${params.toString()}`);
    setEvents(listFrom<UtilizationEvent>(json, ["items", "events"]));
  }, [eventPage, eventFilters]);

  const loadAlerts = useCallback(async () => {
    const params = new URLSearchParams({ page: String(alertPage), limit: "15" });
    Object.entries(alertFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    const json = await api<any>(`/alerts?${params.toString()}`);
    setAlerts(listFrom<FraudAlert>(json, ["items", "alerts"]));
  }, [alertPage, alertFilters]);

  const loadCases = useCallback(async () => {
    const params = new URLSearchParams({ page: String(casePage), limit: "15" });
    Object.entries(caseFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    const json = await api<any>(`/cases?${params.toString()}`);
    setCases(listFrom<FraudCase>(json, ["items", "cases"]));
  }, [casePage, caseFilters]);

  const loadRules = useCallback(async () => {
    const json = await api<any>("/rules");
    const data = unwrap<any>(json);
    setRules(Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []);
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadSummary(), loadEvents(), loadAlerts(), loadCases(), loadRules()]);
    } catch (e: any) {
      setError(e?.message || "Unable to load utilization data.");
    } finally {
      setLoading(false);
    }
  }, [loadSummary, loadEvents, loadAlerts, loadCases, loadRules]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!loading) void loadEvents().catch((e) => setError(e?.message || "Unable to load utilization events."));
  }, [eventPage, eventFilters, loadEvents, loading]);

  useEffect(() => {
    if (!loading) void loadAlerts().catch((e) => setError(e?.message || "Unable to load fraud alerts."));
  }, [alertPage, alertFilters, loadAlerts, loading]);

  useEffect(() => {
    if (!loading) void loadCases().catch((e) => setError(e?.message || "Unable to load fraud cases."));
  }, [casePage, caseFilters, loadCases, loading]);

  const runRules = async () => {
    setActionLoading(true);
    setError("");
    try {
      await api("/rules/run", { method: "POST", body: JSON.stringify({}) });
      await Promise.all([loadSummary(), loadAlerts(), loadCases()]);
      setTab("alerts");
      setNotice("Fraud detection rules completed successfully.");
    } catch (e: any) {
      setError(e?.message || "Unable to run fraud rules.");
    } finally {
      setActionLoading(false);
    }
  };

  const submitEvent = async (e: FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api("/events", {
        method: "POST",
        body: JSON.stringify({
          memberId: eventForm.memberId,
          providerId: eventForm.providerId || undefined,
          claimId: eventForm.claimId || undefined,
          preAuthorizationId: eventForm.preAuthorizationId || undefined,
          serviceCode: eventForm.serviceCode || undefined,
          serviceName: eventForm.serviceName || undefined,
          category: eventForm.category,
          sourceType: eventForm.sourceType,
          serviceDate: eventForm.serviceDate,
          quantity: Number(eventForm.quantity),
          amount: Number(eventForm.amount),
          diagnosisCodes: eventForm.diagnosisCodes.split(",").map((v) => v.trim()).filter(Boolean),
        }),
      });
      setModal(null);
      await Promise.all([loadSummary(), loadEvents()]);
      setNotice("Utilization event recorded.");
    } catch (e: any) {
      setError(e?.message || "Unable to create utilization event.");
    } finally {
      setActionLoading(false);
    }
  };

  const submitRule = async (e: FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api("/rules", {
        method: "POST",
        body: JSON.stringify({
          ...ruleForm,
          threshold: Number(ruleForm.threshold),
          windowDays: Number(ruleForm.windowDays),
        }),
      });
      setModal(null);
      await loadRules();
      setNotice("Fraud detection rule created.");
    } catch (e: any) {
      setError(e?.message || "Unable to create fraud rule.");
    } finally {
      setActionLoading(false);
    }
  };

  const submitCase = async (e: FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api("/cases", {
        method: "POST",
        body: JSON.stringify({
          title: caseForm.title,
          description: caseForm.description || undefined,
          severity: caseForm.severity,
          entityType: caseForm.entityType,
          memberId: caseForm.memberId || undefined,
          providerId: caseForm.providerId || undefined,
          estimatedLoss: Number(caseForm.estimatedLoss),
          notes: caseForm.notes || undefined,
        }),
      });
      setModal(null);
      await Promise.all([loadCases(), loadSummary()]);
      setNotice("Investigation case created.");
    } catch (e: any) {
      setError(e?.message || "Unable to create fraud case.");
    } finally {
      setActionLoading(false);
    }
  };

  const reviewAlert = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;
    setActionLoading(true);
    try {
      await api(`/alerts/${selectedAlert._id}/review`, {
        method: "PATCH",
        body: JSON.stringify(alertReview),
      });
      setModal(null);
      await Promise.all([loadAlerts(), loadSummary()]);
      setNotice("Fraud alert review saved.");
    } catch (e: any) {
      setError(e?.message || "Unable to review alert.");
    } finally {
      setActionLoading(false);
    }
  };

  const updateCase = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    setActionLoading(true);
    try {
      await api(`/cases/${selectedCase._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: caseEdit.status,
          severity: caseEdit.severity,
          assignedTo: caseEdit.assignedTo || undefined,
          finding: caseEdit.finding || undefined,
          recoveredAmount: Number(caseEdit.recoveredAmount),
          notes: caseEdit.notes || undefined,
        }),
      });
      setModal(null);
      await Promise.all([loadCases(), loadSummary()]);
      setNotice("Investigation case updated.");
    } catch (e: any) {
      setError(e?.message || "Unable to update fraud case.");
    } finally {
      setActionLoading(false);
    }
  };

  const categoryMax = useMemo(
    () => Math.max(1, ...(summary?.utilization.byCategory || []).map((x) => Number(x.amount || 0))),
    [summary],
  );

  const exposureRecovery = useMemo(() => {
    const estimated = Number(summary?.fraud.estimatedLoss || 0);
    const recovered = Number(summary?.fraud.recoveredAmount || 0);
    return estimated > 0 ? Math.min(100, Math.round((recovered / estimated) * 100)) : 0;
  }, [summary]);

  const tabs: Array<{ key: Tab; label: string; icon: React.ElementType }> = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "events", label: "Utilization Events", icon: Activity },
    { key: "alerts", label: "Fraud Alerts", icon: ShieldAlert },
    { key: "cases", label: "Investigation Cases", icon: FileWarning },
    { key: "rules", label: "Detection Rules", icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-[#f6f9f8] text-slate-800">
      <div className="mx-auto max-w-[1500px] px-4 py-5 md:px-6 lg:px-0">
        <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#1b7b68]">
              <span>HMO</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-400">UTILIZATION & FRAUD</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Utilization & Fraud Management
            </h1>
            <p className="mt-1.5 max-w-3xl text-xs leading-5 text-slate-500 sm:text-sm">
              Monitor healthcare utilization, identify abnormal patterns, review fraud alerts,
              and manage investigations from one operational workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className={secondaryButton} onClick={() => void refreshAll()} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button className={secondaryButton} onClick={() => setModal("event")}>
              <Plus className="h-3.5 w-3.5" />
              Utilization Event
            </button>
            <button className={primaryButton} onClick={runRules} disabled={actionLoading}>
              <Zap className="h-3.5 w-3.5" />
              {actionLoading ? "Running…" : "Run Fraud Rules"}
            </button>
          </div>
        </header>

        {(error || notice) && (
          <div className={`mb-5 flex items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold ${
            error
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}>
            {error ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            <span className="flex-1">{error || notice}</span>
            <button
              onClick={() => {
                setError("");
                setNotice("");
              }}
              className="rounded-lg p-1 opacity-70 hover:bg-white/60"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="mb-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  <Kpi label="Utilization Events" value={summary?.utilization.eventCount ?? 0} detail={`${summary?.utilization.totalQuantity ?? 0} total units`} icon={Activity} />
                  <Kpi label="Utilization Value" value={money(summary?.utilization.totalAmount)} detail="Recorded service amount" icon={BarChart3} />
                  <Kpi label="Open Alerts" value={summary?.fraud.openAlerts ?? 0} detail="Awaiting review" icon={AlertTriangle} tone="amber" />
                  <Kpi label="High-Risk Alerts" value={summary?.fraud.highRiskAlerts ?? 0} detail="High / critical" icon={ShieldAlert} tone="red" />
                  <Kpi label="Open Cases" value={summary?.fraud.openCases ?? 0} detail="Active investigations" icon={FileWarning} tone="blue" />
                  <Kpi label="Recovered" value={money(summary?.fraud.recoveredAmount)} detail={`${exposureRecovery}% of exposure recovered`} icon={ShieldCheck} tone="green" />
                </div>
        </div>

        <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-1.5 shadow-sm">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-[10px] font-extrabold transition ${
                tab === key
                  ? "bg-[#1b7b68] text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-20 text-center shadow-sm">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#1b7b68]" />
            <p className="mt-3 text-xs font-semibold text-slate-400">Loading utilization intelligence…</p>
          </div>
        ) : (
          <>
            {tab === "overview" && (
              <div className="space-y-5">
                

                <div className="grid gap-5 xl:grid-cols-3">
                  <SectionCard
                    title="Utilization by Category"
                    subtitle="Recorded service amount across the HMO"
                    icon={BarChart3}
                    action={<button className={secondaryButton} onClick={() => setTab("events")}>View events</button>}
                  >
                    <div className="space-y-4">
                      {(summary?.utilization.byCategory || []).length ? (
                        summary!.utilization.byCategory.map((item) => (
                          <div key={item._id}>
                            <div className="mb-1.5 flex items-center justify-between gap-3">
                              <span className="text-[10px] font-extrabold text-slate-700">{item._id}</span>
                              <span className="text-[10px] font-semibold text-slate-400">{money(item.amount)} · {item.count}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-[#1b7b68]"
                                style={{ width: `${Math.max(4, (Number(item.amount) / categoryMax) * 100)}%` }}
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <Empty text="No utilization category data yet." />
                      )}
                    </div>
                  </SectionCard>

                  <SectionCard
                    title="Fraud Risk Snapshot"
                    subtitle="Current investigation workload"
                    icon={ShieldAlert}
                    action={<button className={secondaryButton} onClick={() => setTab("alerts")}>Review alerts</button>}
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <RiskMetric label="Open alerts" value={summary?.fraud.openAlerts ?? 0} tone="amber" />
                      <RiskMetric label="High-risk alerts" value={summary?.fraud.highRiskAlerts ?? 0} tone="red" />
                      <RiskMetric label="Open cases" value={summary?.fraud.openCases ?? 0} tone="blue" />
                      <RiskMetric label="Confirmed / recovered" value={summary?.fraud.confirmedCases ?? 0} tone="green" />
                    </div>

                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-500">Estimated exposure</span>
                        <strong className="text-slate-900">{money(summary?.fraud.estimatedLoss)}</strong>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-500">Recovered</span>
                        <strong className="text-emerald-700">{money(summary?.fraud.recoveredAmount)}</strong>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-[#1b7b68]" style={{ width: `${exposureRecovery}%` }} />
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard
                    title="Operational Controls"
                    subtitle="Actions used by the utilization team"
                    icon={ShieldCheck}
                  >
                    <div className="space-y-2">
                      {[
                        [Activity, "Review utilization events", () => setTab("events")],
                        [ShieldAlert, "Review fraud alerts", () => setTab("alerts")],
                        [FileWarning, "Manage investigations", () => setTab("cases")],
                        [Zap, "Run detection rules", runRules],
                      ].map(([Icon, label, action]: any) => (
                        <button
                          key={label}
                          onClick={action}
                          className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 p-3 text-left transition hover:border-[#1b7b68]/20 hover:bg-[#e8f5f3]/30"
                        >
                          <span className="rounded-xl bg-slate-50 p-2 text-[#1b7b68]">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="text-[10px] font-extrabold text-slate-700">{label}</span>
                          <ChevronRight className="ml-auto h-4 w-4 text-slate-300" />
                        </button>
                      ))}
                    </div>
                  </SectionCard>
                </div>

                <SectionCard
                  title="Top Providers by Utilization"
                  subtitle="Highest recorded utilization amount"
                  icon={Users}
                  action={<button className={secondaryButton} onClick={() => setTab("events")}>View events</button>}
                >
                  {summary?.utilization.topProviders?.length ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                      {summary.utilization.topProviders.slice(0, 10).map((provider, index) => (
                        <div key={`${provider._id}-${index}`} className="rounded-2xl bg-slate-50 p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#1b7b68]">Provider</span>
                            <span className="text-[9px] font-black text-slate-400">#{index + 1}</span>
                          </div>
                          <div className="mt-2 truncate font-mono text-[10px] font-bold text-slate-700">{shortId(provider._id)}</div>
                          <div className="mt-3 text-base font-black text-slate-900">{money(provider.amount)}</div>
                          <div className="mt-0.5 text-[9px] font-semibold text-slate-400">{provider.count} utilization events</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty text="No provider utilization data yet." />
                  )}
                </SectionCard>
              </div>
            )}

            {tab === "events" && (
              <SectionCard
                title="Utilization Events"
                subtitle="Search and review services feeding the utilization engine."
                icon={Activity}
                action={<button className={primaryButton} onClick={() => setModal("event")}><Plus className="h-3.5 w-3.5" /> Add event</button>}
              >
                <FilterBar>
                  <Field label="Search">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                      <input className={`${inputClass} pl-9`} placeholder="Service code or name" value={eventFilters.search} onChange={(e) => { setEventPage(1); setEventFilters({ ...eventFilters, search: e.target.value }); }} />
                    </div>
                  </Field>
                  <Field label="Category">
                    <select className={inputClass} value={eventFilters.category} onChange={(e) => { setEventPage(1); setEventFilters({ ...eventFilters, category: e.target.value }); }}>
                      <option value="">All categories</option>
                      {categories.map((v) => <option key={v}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Source">
                    <select className={inputClass} value={eventFilters.sourceType} onChange={(e) => { setEventPage(1); setEventFilters({ ...eventFilters, sourceType: e.target.value }); }}>
                      <option value="">All sources</option>
                      {sourceTypes.map((v) => <option key={v}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Member ID">
                    <input className={inputClass} placeholder="Member ID" value={eventFilters.memberId} onChange={(e) => setEventFilters({ ...eventFilters, memberId: e.target.value })} />
                  </Field>
                  <Field label="Provider ID">
                    <input className={inputClass} placeholder="Provider ID" value={eventFilters.providerId} onChange={(e) => setEventFilters({ ...eventFilters, providerId: e.target.value })} />
                  </Field>
                  <Field label="From date">
                    <input className={inputClass} type="date" value={eventFilters.fromDate} onChange={(e) => setEventFilters({ ...eventFilters, fromDate: e.target.value })} />
                  </Field>
                  <Field label="To date">
                    <input className={inputClass} type="date" value={eventFilters.toDate} onChange={(e) => setEventFilters({ ...eventFilters, toDate: e.target.value })} />
                  </Field>
                  <div className="flex items-end">
                    <button className={`${secondaryButton} w-full`} onClick={() => setEventFilters({ search: "", category: "", sourceType: "", memberId: "", providerId: "", fromDate: "", toDate: "" })}>
                      <Filter className="h-3.5 w-3.5" />
                      Clear filters
                    </button>
                  </div>
                </FilterBar>

                <DataTable
                  headers={["Service", "Category", "Source", "Member", "Provider", "Date", "Qty", "Amount"]}
                  rows={events.items.map((item) => [
                    <div key="service"><div className="font-extrabold text-slate-800">{item.serviceName || "Unnamed service"}</div><div className="mt-0.5 text-[9px] font-mono text-slate-400">{item.serviceCode || "No code"}</div></div>,
                    <Badge key="category" value={item.category} />,
                    <Badge key="source" value={item.sourceType} />,
                    <span key="member" className="font-mono text-[10px]">{shortId(item.memberId)}</span>,
                    <span key="provider" className="font-mono text-[10px]">{shortId(item.providerId)}</span>,
                    <span key="date" className="text-[10px]">{dateTime(item.serviceDate)}</span>,
                    <span key="qty" className="font-bold">{item.quantity}</span>,
                    <strong key="amount" className="font-black text-slate-800">{money(item.amount)}</strong>,
                  ])}
                  empty="No utilization events found."
                />
                <Pagination page={events.page} totalPages={events.totalPages} total={events.total} onPage={setEventPage} />
              </SectionCard>
            )}

            {tab === "alerts" && (
              <SectionCard
                title="Fraud Alerts"
                subtitle="Review automated risk signals generated by enabled fraud rules."
                icon={ShieldAlert}
                action={<button className={primaryButton} onClick={runRules} disabled={actionLoading}><Zap className="h-3.5 w-3.5" /> {actionLoading ? "Running…" : "Run rules"}</button>}
              >
                <FilterBar>
                  <Field label="Status">
                    <select className={inputClass} value={alertFilters.status} onChange={(e) => { setAlertPage(1); setAlertFilters({ ...alertFilters, status: e.target.value }); }}>
                      <option value="">All statuses</option>{alertStatuses.map((v) => <option key={v}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Severity">
                    <select className={inputClass} value={alertFilters.severity} onChange={(e) => { setAlertPage(1); setAlertFilters({ ...alertFilters, severity: e.target.value }); }}>
                      <option value="">All severity</option>{severities.map((v) => <option key={v}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Member ID">
                    <input className={inputClass} placeholder="Member ID" value={alertFilters.memberId} onChange={(e) => setAlertFilters({ ...alertFilters, memberId: e.target.value })} />
                  </Field>
                  <Field label="Provider ID">
                    <input className={inputClass} placeholder="Provider ID" value={alertFilters.providerId} onChange={(e) => setAlertFilters({ ...alertFilters, providerId: e.target.value })} />
                  </Field>
                </FilterBar>

                <DataTable
                  headers={["Alert", "Severity", "Status", "Entity", "Score", "Member / Provider", "Created", "Action"]}
                  rows={alerts.items.map((item) => [
                    <div key="title"><div className="font-extrabold text-slate-800">{item.title}</div><div className="mt-0.5 max-w-[260px] truncate text-[9px] text-slate-400">{item.description || "No description"}</div></div>,
                    <Badge key="severity" value={item.severity} />,
                    <Badge key="status" value={item.status} />,
                    <Badge key="entity" value={item.entityType} />,
                    <span key="score" className="font-black text-slate-800">{item.score}</span>,
                    <div key="entities" className="text-[9px]"><div className="font-mono">{shortId(item.memberId)}</div><div className="mt-0.5 font-mono text-slate-400">{shortId(item.providerId)}</div></div>,
                    <span key="created" className="text-[10px]">{dateTime(item.createdAt)}</span>,
                    <button key="action" className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-[9px] font-extrabold text-slate-600 hover:bg-slate-50" onClick={() => { setSelectedAlert(item); setAlertReview({ status: item.status, note: item.reviewNote || "" }); setModal("alert"); }}>
                      Review
                    </button>,
                  ])}
                  empty="No fraud alerts found."
                />
                <Pagination page={alerts.page} totalPages={alerts.totalPages} total={alerts.total} onPage={setAlertPage} />
              </SectionCard>
            )}

            {tab === "cases" && (
              <SectionCard
                title="Fraud Investigation Cases"
                subtitle="Track investigations, findings, losses, recovery, and closure."
                icon={FileWarning}
                action={<button className={primaryButton} onClick={() => setModal("case")}><Plus className="h-3.5 w-3.5" /> New case</button>}
              >
                <FilterBar>
                  <Field label="Search">
                    <input className={inputClass} placeholder="Case number or title" value={caseFilters.search} onChange={(e) => { setCasePage(1); setCaseFilters({ ...caseFilters, search: e.target.value }); }} />
                  </Field>
                  <Field label="Status">
                    <select className={inputClass} value={caseFilters.status} onChange={(e) => { setCasePage(1); setCaseFilters({ ...caseFilters, status: e.target.value }); }}>
                      <option value="">All statuses</option>{caseStatuses.map((v) => <option key={v}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Severity">
                    <select className={inputClass} value={caseFilters.severity} onChange={(e) => { setCasePage(1); setCaseFilters({ ...caseFilters, severity: e.target.value }); }}>
                      <option value="">All severity</option>{severities.map((v) => <option key={v}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Entity">
                    <select className={inputClass} value={caseFilters.entityType} onChange={(e) => { setCasePage(1); setCaseFilters({ ...caseFilters, entityType: e.target.value }); }}>
                      <option value="">All entities</option>{entityTypes.map((v) => <option key={v}>{v}</option>)}
                    </select>
                  </Field>
                </FilterBar>

                <DataTable
                  headers={["Case", "Severity", "Status", "Entity", "Estimated Loss", "Recovered", "Opened", "Action"]}
                  rows={cases.items.map((item) => [
                    <div key="case"><div className="font-extrabold text-slate-800">{item.caseNumber}</div><div className="mt-0.5 max-w-[220px] truncate text-[9px] text-slate-400">{item.title}</div></div>,
                    <Badge key="severity" value={item.severity} />,
                    <Badge key="status" value={item.status} />,
                    <Badge key="entity" value={item.entityType} />,
                    <strong key="loss" className="font-black text-slate-800">{money(item.estimatedLoss)}</strong>,
                    <span key="recovered" className="font-extrabold text-emerald-700">{money(item.recoveredAmount)}</span>,
                    <span key="opened" className="text-[10px]">{dateTime(item.openedAt)}</span>,
                    <button key="action" className="rounded-xl border border-slate-200 px-3 py-2 text-[9px] font-extrabold text-slate-600 hover:bg-slate-50" onClick={() => { setSelectedCase(item); setCaseEdit({ status: item.status, severity: item.severity, assignedTo: item.assignedTo || "", finding: item.finding || "", recoveredAmount: String(item.recoveredAmount || 0), notes: item.notes || "" }); setModal("case"); }}>
                      Manage
                    </button>,
                  ])}
                  empty="No investigation cases found."
                />
                <Pagination page={cases.page} totalPages={cases.totalPages} total={cases.total} onPage={setCasePage} />
              </SectionCard>
            )}

            {tab === "rules" && (
              <SectionCard
                title="Fraud Detection Rules"
                subtitle="Configure thresholds used by the rule runner."
                icon={ShieldCheck}
                action={<button className={primaryButton} onClick={() => setModal("rule")}><Plus className="h-3.5 w-3.5" /> New rule</button>}
              >
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[#cce9e2] bg-[#e8f5f3] p-4">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1b7b68]" />
                  <div>
                    <p className="text-[10px] font-extrabold text-[#176b5a]">Rule engine safeguards</p>
                    <p className="mt-1 text-[9px] leading-5 text-slate-500">
                      Built-in detectors include high-frequency member, high-frequency provider and high-value service patterns.
                      Rules are scoped to the current HMO.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="min-w-[950px] w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70">
                        {["Code", "Name", "Category", "Severity", "Threshold", "Window", "Action", "Enabled"].map((h) => (
                          <th key={h} className="px-4 py-3 text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {rules.length ? rules.map((rule) => (
                        <tr key={rule._id} className="transition hover:bg-slate-50/60">
                          <td className="px-4 py-3.5 font-mono text-[9px] font-bold text-slate-700">{rule.code}</td>
                          <td className="px-4 py-3.5">
                            <div className="text-xs font-extrabold text-slate-800">{rule.name}</div>
                            <div className="mt-0.5 max-w-[220px] truncate text-[9px] text-slate-400">{rule.description || "—"}</div>
                          </td>
                          <td className="px-4 py-3.5"><Badge value={rule.category} /></td>
                          <td className="px-4 py-3.5"><Badge value={rule.severity} /></td>
                          <td className="px-4 py-3.5 text-xs font-black">{rule.operator} {rule.threshold}</td>
                          <td className="px-4 py-3.5 text-xs">{rule.windowDays} days</td>
                          <td className="px-4 py-3.5"><Badge value={rule.action} /></td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-extrabold ${rule.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                              {rule.enabled ? "Enabled" : "Disabled"}
                            </span>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={8}><Empty text="No fraud rules configured yet." /></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            )}
          </>
        )}
      </div>

      {modal === "event" && (
        <Modal title="Record Utilization Event" subtitle="Add a service event to the HMO utilization ledger." onClose={() => setModal(null)}>
          <form onSubmit={submitEvent} className="grid gap-4 sm:grid-cols-2">
            <Field label="Member ID" required><input required className={inputClass} value={eventForm.memberId} onChange={(e) => setEventForm({ ...eventForm, memberId: e.target.value })} /></Field>
            <Field label="Provider ID"><input className={inputClass} value={eventForm.providerId} onChange={(e) => setEventForm({ ...eventForm, providerId: e.target.value })} /></Field>
            <Field label="Claim ID"><input className={inputClass} value={eventForm.claimId} onChange={(e) => setEventForm({ ...eventForm, claimId: e.target.value })} /></Field>
            <Field label="Pre-Authorization ID"><input className={inputClass} value={eventForm.preAuthorizationId} onChange={(e) => setEventForm({ ...eventForm, preAuthorizationId: e.target.value })} /></Field>
            <Field label="Service Name"><input className={inputClass} value={eventForm.serviceName} onChange={(e) => setEventForm({ ...eventForm, serviceName: e.target.value })} /></Field>
            <Field label="Service Code"><input className={inputClass} value={eventForm.serviceCode} onChange={(e) => setEventForm({ ...eventForm, serviceCode: e.target.value })} /></Field>
            <Field label="Category"><select className={inputClass} value={eventForm.category} onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}>{categories.map((v) => <option key={v}>{v}</option>)}</select></Field>
            <Field label="Source"><select className={inputClass} value={eventForm.sourceType} onChange={(e) => setEventForm({ ...eventForm, sourceType: e.target.value })}>{sourceTypes.map((v) => <option key={v}>{v}</option>)}</select></Field>
            <Field label="Service Date" required><input required type="date" className={inputClass} value={eventForm.serviceDate} onChange={(e) => setEventForm({ ...eventForm, serviceDate: e.target.value })} /></Field>
            <Field label="Quantity"><input type="number" min="0" step="1" className={inputClass} value={eventForm.quantity} onChange={(e) => setEventForm({ ...eventForm, quantity: e.target.value })} /></Field>
            <Field label="Amount (NGN)"><input type="number" min="0" step="0.01" className={inputClass} value={eventForm.amount} onChange={(e) => setEventForm({ ...eventForm, amount: e.target.value })} /></Field>
            <Field label="Diagnosis Codes" hint="comma separated"><input className={inputClass} value={eventForm.diagnosisCodes} onChange={(e) => setEventForm({ ...eventForm, diagnosisCodes: e.target.value })} /></Field>
            <div className="flex justify-end gap-2 pt-2 sm:col-span-2"><button type="button" className={secondaryButton} onClick={() => setModal(null)}>Cancel</button><button className={primaryButton} disabled={actionLoading}>{actionLoading ? "Saving…" : "Save event"}</button></div>
          </form>
        </Modal>
      )}

      {modal === "rule" && (
        <Modal title="Create Fraud Detection Rule" subtitle="Define a threshold for automated utilization risk detection." onClose={() => setModal(null)}>
          <form onSubmit={submitRule} className="grid gap-4 sm:grid-cols-2">
            <Field label="Rule Code" required><input required className={inputClass} value={ruleForm.code} onChange={(e) => setRuleForm({ ...ruleForm, code: e.target.value })} placeholder="HIGH_FREQUENCY_MEMBER_30D" /></Field>
            <Field label="Rule Name" required><input required className={inputClass} value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} /></Field>
            <Field label="Category" required><select className={inputClass} value={ruleForm.category} onChange={(e) => setRuleForm({ ...ruleForm, category: e.target.value })}><option>HIGH_FREQUENCY_MEMBER</option><option>HIGH_FREQUENCY_PROVIDER</option><option>HIGH_VALUE_SERVICE</option></select></Field>
            <Field label="Entity Type"><select className={inputClass} value={ruleForm.entityType} onChange={(e) => setRuleForm({ ...ruleForm, entityType: e.target.value })}>{entityTypes.map((v) => <option key={v}>{v}</option>)}</select></Field>
            <Field label="Severity"><select className={inputClass} value={ruleForm.severity} onChange={(e) => setRuleForm({ ...ruleForm, severity: e.target.value })}>{severities.map((v) => <option key={v}>{v}</option>)}</select></Field>
            <Field label="Operator"><select className={inputClass} value={ruleForm.operator} onChange={(e) => setRuleForm({ ...ruleForm, operator: e.target.value })}>{operators.map((v) => <option key={v}>{v}</option>)}</select></Field>
            <Field label="Threshold"><input type="number" min="0" className={inputClass} value={ruleForm.threshold} onChange={(e) => setRuleForm({ ...ruleForm, threshold: e.target.value })} /></Field>
            <Field label="Window (days)"><input type="number" min="1" max="365" className={inputClass} value={ruleForm.windowDays} onChange={(e) => setRuleForm({ ...ruleForm, windowDays: e.target.value })} /></Field>
            <Field label="Action"><select className={inputClass} value={ruleForm.action} onChange={(e) => setRuleForm({ ...ruleForm, action: e.target.value })}><option>ALERT</option><option>CASE</option></select></Field>
            <Field label="Description" hint="optional"><textarea className={`${textareaClass} min-h-24`} value={ruleForm.description} onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 sm:col-span-2"><input type="checkbox" checked={ruleForm.enabled} onChange={(e) => setRuleForm({ ...ruleForm, enabled: e.target.checked })} /> Rule enabled</label>
            <div className="flex justify-end gap-2 pt-2 sm:col-span-2"><button type="button" className={secondaryButton} onClick={() => setModal(null)}>Cancel</button><button className={primaryButton} disabled={actionLoading}>{actionLoading ? "Saving…" : "Create rule"}</button></div>
          </form>
        </Modal>
      )}

      {modal === "alert" && selectedAlert && (
        <Modal title="Review Fraud Alert" subtitle="Record the adjudicator's review decision and notes." onClose={() => setModal(null)}>
          <div className="mb-5 rounded-2xl bg-slate-50 p-4">
            <div className="flex flex-wrap gap-2"><Badge value={selectedAlert.severity} /><Badge value={selectedAlert.status} /><Badge value={selectedAlert.entityType} /></div>
            <h3 className="mt-3 text-sm font-black text-slate-900">{selectedAlert.title}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">{selectedAlert.description || "No description provided."}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Info label="Risk score" value={String(selectedAlert.score)} />
              <Info label="Member" value={shortId(selectedAlert.memberId)} mono />
              <Info label="Provider" value={shortId(selectedAlert.providerId)} mono />
            </div>
          </div>
          <form onSubmit={reviewAlert} className="space-y-4">
            <Field label="Review status"><select className={inputClass} value={alertReview.status} onChange={(e) => setAlertReview({ ...alertReview, status: e.target.value })}>{alertStatuses.map((v) => <option key={v}>{v}</option>)}</select></Field>
            <Field label="Review note"><textarea className={`${textareaClass} min-h-28`} value={alertReview.note} onChange={(e) => setAlertReview({ ...alertReview, note: e.target.value })} placeholder="Record what was reviewed or why the alert was resolved/dismissed." /></Field>
            <div className="flex justify-end gap-2"><button type="button" className={secondaryButton} onClick={() => setModal(null)}>Cancel</button><button className={primaryButton} disabled={actionLoading}>{actionLoading ? "Saving…" : "Save review"}</button></div>
          </form>
        </Modal>
      )}

      {modal === "case" && !selectedCase && (
        <Modal title="Create Investigation Case" subtitle="Open a structured fraud/waste investigation." onClose={() => setModal(null)}>
          <form onSubmit={submitCase} className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" required><input required className={inputClass} value={caseForm.title} onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })} /></Field>
            <Field label="Severity"><select className={inputClass} value={caseForm.severity} onChange={(e) => setCaseForm({ ...caseForm, severity: e.target.value })}>{severities.map((v) => <option key={v}>{v}</option>)}</select></Field>
            <Field label="Entity Type"><select className={inputClass} value={caseForm.entityType} onChange={(e) => setCaseForm({ ...caseForm, entityType: e.target.value })}>{entityTypes.map((v) => <option key={v}>{v}</option>)}</select></Field>
            <Field label="Member ID"><input className={inputClass} value={caseForm.memberId} onChange={(e) => setCaseForm({ ...caseForm, memberId: e.target.value })} /></Field>
            <Field label="Provider ID"><input className={inputClass} value={caseForm.providerId} onChange={(e) => setCaseForm({ ...caseForm, providerId: e.target.value })} /></Field>
            <Field label="Estimated Loss (NGN)"><input type="number" min="0" className={inputClass} value={caseForm.estimatedLoss} onChange={(e) => setCaseForm({ ...caseForm, estimatedLoss: e.target.value })} /></Field>
            <Field label="Description"><textarea className={`${textareaClass} min-h-24`} value={caseForm.description} onChange={(e) => setCaseForm({ ...caseForm, description: e.target.value })} /></Field>
            <Field label="Notes"><textarea className={`${textareaClass} min-h-24`} value={caseForm.notes} onChange={(e) => setCaseForm({ ...caseForm, notes: e.target.value })} /></Field>
            <div className="flex justify-end gap-2 pt-2 sm:col-span-2"><button type="button" className={secondaryButton} onClick={() => setModal(null)}>Cancel</button><button className={primaryButton} disabled={actionLoading}>{actionLoading ? "Saving…" : "Create case"}</button></div>
          </form>
        </Modal>
      )}

      {modal === "case" && selectedCase && (
        <Modal title={`Manage Case ${selectedCase.caseNumber}`} subtitle="Update investigation status, findings and recovery." onClose={() => setModal(null)}>
          <div className="mb-5 rounded-2xl bg-slate-50 p-4">
            <h3 className="text-sm font-black text-slate-900">{selectedCase.title}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">{selectedCase.description || "No description."}</p>
            <div className="mt-3 flex flex-wrap gap-2"><Badge value={selectedCase.status} /><Badge value={selectedCase.severity} /><Badge value={selectedCase.entityType} /></div>
          </div>
          <form onSubmit={updateCase} className="grid gap-4 sm:grid-cols-2">
            <Field label="Status"><select className={inputClass} value={caseEdit.status} onChange={(e) => setCaseEdit({ ...caseEdit, status: e.target.value })}>{caseStatuses.map((v) => <option key={v}>{v}</option>)}</select></Field>
            <Field label="Severity"><select className={inputClass} value={caseEdit.severity} onChange={(e) => setCaseEdit({ ...caseEdit, severity: e.target.value })}>{severities.map((v) => <option key={v}>{v}</option>)}</select></Field>
            <Field label="Assigned User ID"><input className={inputClass} value={caseEdit.assignedTo} onChange={(e) => setCaseEdit({ ...caseEdit, assignedTo: e.target.value })} /></Field>
            <Field label="Recovered Amount (NGN)"><input type="number" min="0" className={inputClass} value={caseEdit.recoveredAmount} onChange={(e) => setCaseEdit({ ...caseEdit, recoveredAmount: e.target.value })} /></Field>
            <Field label="Finding"><textarea className={`${textareaClass} min-h-28`} value={caseEdit.finding} onChange={(e) => setCaseEdit({ ...caseEdit, finding: e.target.value })} /></Field>
            <Field label="Notes"><textarea className={`${textareaClass} min-h-28`} value={caseEdit.notes} onChange={(e) => setCaseEdit({ ...caseEdit, notes: e.target.value })} /></Field>
            <div className="flex justify-end gap-2 pt-2 sm:col-span-2"><button type="button" className={secondaryButton} onClick={() => setModal(null)}>Cancel</button><button className={primaryButton} disabled={actionLoading}>{actionLoading ? "Saving…" : "Update case"}</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  detail,
  icon: Icon,
  tone = "teal",
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ElementType;
  tone?: "teal" | "red" | "amber" | "blue" | "green";
}) {
  const styles = {
    teal: "bg-[#e8f5f3] text-[#1b7b68]",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-sky-50 text-sky-700",
  }[tone];

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-xl p-2 ${styles}`}><Icon className="h-4 w-4" /></span>
        <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-300">HMO</span>
      </div>
      <div className="mt-4 text-xl font-black tracking-tight text-slate-900">{value}</div>
      <div className="mt-1 text-[9px] font-extrabold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-[9px] font-medium text-slate-400">{detail}</div>
    </div>
  );
}

function RiskMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "teal" | "red" | "amber" | "blue" | "green";
}) {
  const dot = {
    teal: "bg-[#1b7b68]",
    green: "bg-emerald-500",
    red: "bg-rose-500",
    amber: "bg-amber-500",
    blue: "bg-sky-500",
  }[tone];

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3.5">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
      <div>
        <div className="text-[9px] font-bold text-slate-400">{label}</div>
        <div className="mt-0.5 text-lg font-black text-slate-800">{value}</div>
      </div>
    </div>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <div className={`mt-1 text-xs font-bold text-slate-800 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
