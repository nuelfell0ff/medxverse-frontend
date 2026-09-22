"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Edit3,
  Eye,
  Filter,
  HeartPulse,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";

type PlanStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
type PlanType = "INDIVIDUAL" | "FAMILY" | "CORPORATE" | "GROUP";
type PremiumFrequency = "MONTHLY" | "QUARTERLY" | "ANNUAL";

interface Premium {
  individual?: number;
  family?: number;
  corporate?: number;
  currency: string;
  frequency: PremiumFrequency;
}

interface Benefit {
  _id: string;
  code: string;
  name: string;
  category?: string;
  status?: string;
}

interface HealthPlan {
  _id: string;
  hmoId: string;
  code: string;
  name: string;
  description?: string;
  type: PlanType;
  status: PlanStatus;
  tier?: string;
  currency: string;
  premium?: Premium;
  defaultWaitingPeriodDays: number;
  annualUtilizationLimit?: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  benefitIds: Benefit[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PlanStats {
  total: number;
  draft: number;
  active: number;
  inactive: number;
  archived: number;
}

interface PaginatedPlans {
  plans: HealthPlan[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface PlanForm {
  code: string;
  name: string;
  description: string;
  type: PlanType;
  tier: string;
  currency: string;
  frequency: PremiumFrequency;
  individualPremium: string;
  familyPremium: string;
  corporatePremium: string;
  defaultWaitingPeriodDays: string;
  annualUtilizationLimit: string;
  effectiveFrom: string;
  effectiveTo: string;
  notes: string;
}

const RAW_API = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://medxverse-backend.onrender.com/api/v1"
).trim().replace(/\/+$/, "");
const API_BASE = RAW_API.endsWith("/api/v1") ? RAW_API : `${RAW_API}/api/v1`;
const PLANS_API = `${API_BASE}/health-plans`;

const PLAN_TYPES: PlanType[] = ["INDIVIDUAL", "FAMILY", "CORPORATE", "GROUP"];
const STATUSES: PlanStatus[] = ["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"];

const emptyForm: PlanForm = {
  code: "",
  name: "",
  description: "",
  type: "INDIVIDUAL",
  tier: "",
  currency: "NGN",
  frequency: "MONTHLY",
  individualPremium: "",
  familyPremium: "",
  corporatePremium: "",
  defaultWaitingPeriodDays: "0",
  annualUtilizationLimit: "",
  effectiveFrom: "",
  effectiveTo: "",
  notes: "",
};

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const keys = ["accessToken", "access_token", "token", "jwt", "authToken", "medxverse_access_token"];
  for (const key of keys) {
    const value = window.localStorage.getItem(key);
    if (value) return value.replace(/^Bearer\s+/i, "");
  }
  return null;
}

function authHeaders(json = false): HeadersInit {
  const token = getToken();
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const json = (await response.json().catch(() => ({}))) as ApiResponse<T>;
  if (!response.ok) {
    throw new Error(json?.message || json?.error || `Request failed with status ${response.status}`);
  }
  return json && "data" in json ? (json.data as T) : (json as T);
}

function formatCurrency(value?: number, currency = "NGN") {
  if (value === undefined || value === null) return "—";
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function typeLabel(type: PlanType) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function statusMeta(status: PlanStatus) {
  const map: Record<PlanStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    ACTIVE: { label: "Active", cls: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: <CheckCircle2 className="h-3 w-3" /> },
    DRAFT: { label: "Draft", cls: "bg-amber-50 text-amber-700 border-amber-100", icon: <Clock3 className="h-3 w-3" /> },
    INACTIVE: { label: "Inactive", cls: "bg-slate-100 text-slate-600 border-slate-200", icon: <XCircle className="h-3 w-3" /> },
    ARCHIVED: { label: "Archived", cls: "bg-rose-50 text-rose-700 border-rose-100", icon: <XCircle className="h-3 w-3" /> },
  };
  return map[status];
}

function toInputDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function toForm(plan: HealthPlan): PlanForm {
  return {
    code: plan.code || "",
    name: plan.name || "",
    description: plan.description || "",
    type: plan.type || "INDIVIDUAL",
    tier: plan.tier || "",
    currency: plan.currency || "NGN",
    frequency: plan.premium?.frequency || "MONTHLY",
    individualPremium: plan.premium?.individual === undefined ? "" : String(plan.premium.individual),
    familyPremium: plan.premium?.family === undefined ? "" : String(plan.premium.family),
    corporatePremium: plan.premium?.corporate === undefined ? "" : String(plan.premium.corporate),
    defaultWaitingPeriodDays: String(plan.defaultWaitingPeriodDays ?? 0),
    annualUtilizationLimit: plan.annualUtilizationLimit === undefined ? "" : String(plan.annualUtilizationLimit),
    effectiveFrom: toInputDate(plan.effectiveFrom),
    effectiveTo: toInputDate(plan.effectiveTo),
    notes: plan.notes || "",
  };
}

function buildPayload(form: PlanForm) {
  const premium: Premium = {
    currency: form.currency.trim().toUpperCase() || "NGN",
    frequency: form.frequency,
  };
  if (form.individualPremium !== "") premium.individual = Number(form.individualPremium);
  if (form.familyPremium !== "") premium.family = Number(form.familyPremium);
  if (form.corporatePremium !== "") premium.corporate = Number(form.corporatePremium);

  return {
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    type: form.type,
    tier: form.tier.trim() || undefined,
    currency: form.currency.trim().toUpperCase() || "NGN",
    premium,
    defaultWaitingPeriodDays: Number(form.defaultWaitingPeriodDays || 0),
    ...(form.annualUtilizationLimit !== "" ? { annualUtilizationLimit: Number(form.annualUtilizationLimit) } : {}),
    effectiveFrom: form.effectiveFrom,
    ...(form.effectiveTo ? { effectiveTo: form.effectiveTo } : {}),
    notes: form.notes.trim() || undefined,
  };
}

function Field({ label, value, onChange, placeholder = "", type = "text", required = false, disabled = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
        {label}{required ? " *" : ""}
      </span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-700 outline-none transition focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/10 disabled:bg-slate-100 disabled:text-slate-400"
      />
    </label>
  );
}

function SelectField({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/10">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function Modal({ open, title, subtitle, onClose, children, wide = false }: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm">
      <div className={`max-h-[92vh] w-full overflow-hidden rounded-[28px] bg-white shadow-2xl ${wide ? "max-w-5xl" : "max-w-3xl"}`}>
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-800">{title}</h2>
            {subtitle && <p className="mt-1 text-[11px] font-medium text-slate-400">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function HealthPlansPage() {
  const [plans, setPlans] = useState<HealthPlan[]>([]);
  const [stats, setStats] = useState<PlanStats>({ total: 0, draft: 0, active: 0, inactive: 0, archived: 0 });
  const [page, setPage] = useState(1);
  const limit = 12;
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PlanStatus | "">("");
  const [type, setType] = useState<PlanType | "">("");
  const [tier, setTier] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [statsError, setStatsError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<HealthPlan | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<HealthPlan | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (tier.trim()) params.set("tier", tier.trim());
    if (effectiveDate) params.set("effectiveDate", effectiveDate);
    return params.toString();
  }, [effectiveDate, page, search, status, tier, type]);

  const fetchStats = useCallback(async () => {
    setStatsError("");
    try {
      const response = await fetch(`${PLANS_API}/stats`, { headers: authHeaders(), credentials: "include", cache: "no-store" });
      setStats(await parseResponse<PlanStats>(response));
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : "Unable to load plan statistics");
    }
  }, []);

  const fetchPlans = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const response = await fetch(`${PLANS_API}?${queryString}`, { headers: authHeaders(), credentials: "include", cache: "no-store" });
      const result = await parseResponse<PaginatedPlans>(response);
      setPlans(Array.isArray(result?.plans) ? result.plans : []);
      setTotal(Number(result?.total || 0));
      setTotalPages(Math.max(1, Number(result?.totalPages || 1)));
    } catch (err) {
      setPlans([]);
      setTotal(0);
      setTotalPages(1);
      setError(err instanceof Error ? err.message : "Unable to load health plans");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [queryString]);

  useEffect(() => { void fetchStats(); }, [fetchStats]);
  useEffect(() => { void fetchPlans(); }, [fetchPlans]);
  useEffect(() => { setPage(1); }, [search, status, type, tier, effectiveDate]);

  function openCreate() {
    setEditingPlan(null);
    setForm({ ...emptyForm, effectiveFrom: new Date().toISOString().slice(0, 10) });
    setFormError("");
    setShowForm(true);
  }

  function openEdit(plan: HealthPlan) {
    setEditingPlan(plan);
    setForm(toForm(plan));
    setFormError("");
    setShowForm(true);
  }

  async function openDetails(plan: HealthPlan) {
    setSelectedPlan(plan);
    setDetailsLoading(true);
    try {
      const response = await fetch(`${PLANS_API}/${encodeURIComponent(plan._id)}`, { headers: authHeaders(), credentials: "include", cache: "no-store" });
      setSelectedPlan(await parseResponse<HealthPlan>(response));
    } catch {
      // Keep the already-loaded row as a safe fallback.
    } finally {
      setDetailsLoading(false);
    }
  }

  function validateForm() {
    if (!form.code.trim()) return "Plan code is required.";
    if (!form.name.trim()) return "Plan name is required.";
    if (!form.effectiveFrom) return "Effective from date is required.";
    if (form.effectiveTo && new Date(form.effectiveTo) <= new Date(form.effectiveFrom)) return "Effective to must be after effective from.";
    if (!form.currency.trim()) return "Currency is required.";
    const numbers: Array<[string, string]> = [
      ["Individual premium", form.individualPremium],
      ["Family premium", form.familyPremium],
      ["Corporate premium", form.corporatePremium],
      ["Waiting period", form.defaultWaitingPeriodDays],
      ["Annual utilization limit", form.annualUtilizationLimit],
    ];
    for (const [label, value] of numbers) {
      if (value === "") continue;
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 0) return `${label} must be a non-negative number.`;
    }
    return null;
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) { setFormError(validationError); return; }
    setSaving(true);
    setFormError("");
    try {
      const endpoint = editingPlan ? `${PLANS_API}/${encodeURIComponent(editingPlan._id)}` : PLANS_API;
      const response = await fetch(endpoint, {
        method: editingPlan ? "PATCH" : "POST",
        headers: authHeaders(true),
        credentials: "include",
        body: JSON.stringify(buildPayload(form)),
      });
      await parseResponse<HealthPlan>(response);
      setShowForm(false);
      setEditingPlan(null);
      setForm(emptyForm);
      await Promise.all([fetchPlans(true), fetchStats()]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to save health plan");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(plan: HealthPlan, nextStatus: PlanStatus) {
    if (plan.status === nextStatus) return;
    setStatusUpdatingId(plan._id);
    setError("");
    try {
      const response = await fetch(`${PLANS_API}/${encodeURIComponent(plan._id)}/status`, {
        method: "PATCH",
        headers: authHeaders(true),
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      });
      await parseResponse<HealthPlan>(response);
      await Promise.all([fetchPlans(true), fetchStats()]);
      if (selectedPlan?._id === plan._id) setSelectedPlan((current) => current ? { ...current, status: nextStatus } : current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update plan status");
    } finally {
      setStatusUpdatingId(null);
    }
  }

  function clearFilters() {
    setSearch(""); setStatus(""); setType(""); setTier(""); setEffectiveDate(""); setPage(1);
  }

  const statCards = useMemo(() => [
    { label: "Total Plans", value: stats.total, icon: <CreditCard className="h-4 w-4" />, cls: "bg-[#e8f5f3] text-[#1b7b68]" },
    { label: "Active Plans", value: stats.active, icon: <BadgeCheck className="h-4 w-4" />, cls: "bg-emerald-50 text-emerald-700" },
    { label: "Draft Plans", value: stats.draft, icon: <Clock3 className="h-4 w-4" />, cls: "bg-amber-50 text-amber-700" },
    { label: "Inactive", value: stats.inactive, icon: <XCircle className="h-4 w-4" />, cls: "bg-slate-100 text-slate-600" },
    { label: "Archived", value: stats.archived, icon: <ShieldCheck className="h-4 w-4" />, cls: "bg-rose-50 text-rose-700" },
  ], [stats]);

  return (
    <div className="min-h-full space-y-6 font-sans text-slate-800 animate-in fade-in duration-300">
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="font-medium">{error}</span>
          <button type="button" onClick={() => setError("")} className="ml-auto rounded-lg p-1 hover:bg-rose-100"><X className="h-4 w-4" /></button>
        </div>
      )}

      <section className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-800">Health Plans</h1>
            <span className="rounded-full bg-[#e8f5f3] px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-[#1b7b68]">HMO</span>
          </div>
          <p className="mt-1 max-w-2xl text-xs font-medium leading-5 text-slate-400">Create and manage insurance plans, premiums, coverage periods, waiting periods and utilization limits.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => { void Promise.all([fetchPlans(true), fetchStats()]); }} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-slate-500 transition hover:bg-[#e8f5f3] hover:text-[#1b7b68]" title="Refresh">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-2xl bg-[#1b7b68] px-4 py-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#166b5b]">
            <Plus className="h-4 w-4" /> Create Health Plan
          </button>
        </div>
      </section>

      {statsError && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-700">{statsError}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className={`rounded-xl p-2 ${card.cls}`}>{card.icon}</span>
              <span className="text-2xl font-black text-slate-800">{loading ? "—" : card.value}</span>
            </div>
            <p className="mt-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{card.label}</p>
          </div>
        ))}
      </div>

      <section className="rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search plan code, name or description..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-xs font-medium outline-none transition focus:border-[#1b7b68] focus:bg-white" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-slate-400"><Filter className="h-3.5 w-3.5" /> Filters</div>
            <select value={status} onChange={(event) => setStatus(event.target.value as PlanStatus | "")} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 outline-none"><option value="">All Statuses</option>{STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <select value={type} onChange={(event) => setType(event.target.value as PlanType | "")} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 outline-none"><option value="">All Types</option>{PLAN_TYPES.map((item) => <option key={item} value={item}>{typeLabel(item)}</option>)}</select>
            <input value={tier} onChange={(event) => setTier(event.target.value)} placeholder="Tier" className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium outline-none focus:border-[#1b7b68]" />
            <input type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-600 outline-none focus:border-[#1b7b68]" />
            <button type="button" onClick={clearFilters} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50">Clear</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Health Plan</th><th className="px-6 py-4">Type</th><th className="px-6 py-4">Premium</th><th className="px-6 py-4">Coverage</th><th className="px-6 py-4">Benefits</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => <tr key={index}><td colSpan={7} className="px-6 py-5"><div className="h-12 animate-pulse rounded-2xl bg-slate-100" /></td></tr>)
              ) : plans.length === 0 ? (
                <tr><td colSpan={7} className="py-20 text-center"><CreditCard className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm font-bold text-slate-600">No health plans found</p><p className="mt-1 text-xs text-slate-400">Create a plan or adjust your filters.</p><button type="button" onClick={openCreate} className="mt-4 rounded-2xl bg-[#1b7b68] px-4 py-2.5 text-xs font-extrabold text-white">Create Health Plan</button></td></tr>
              ) : plans.map((plan) => {
                const meta = statusMeta(plan.status);
                return (
                  <tr key={plan._id} className="border-b border-slate-50 transition hover:bg-[#e8f5f3]/20">
                    <td className="px-6 py-4">
                      <button type="button" onClick={() => void openDetails(plan)} className="text-left">
                        <div className="font-bold text-slate-800 hover:text-[#1b7b68]">{plan.name}</div>
                        <div className="mt-0.5 text-[10px] text-slate-400">{plan.code}{plan.tier ? ` • ${plan.tier}` : ""}</div>
                      </button>
                    </td>
                    <td className="px-6 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{typeLabel(plan.type)}</span></td>
                    <td className="px-6 py-4"><div className="text-xs font-bold text-slate-700">{formatCurrency(plan.premium?.individual, plan.currency)}</div><div className="mt-0.5 text-[10px] text-slate-400">{plan.premium?.frequency || "Not set"}</div></td>
                    <td className="px-6 py-4"><div className="text-xs font-semibold text-slate-700">{formatDate(plan.effectiveFrom)}</div><div className="mt-0.5 text-[10px] text-slate-400">to {formatDate(plan.effectiveTo)}</div></td>
                    <td className="px-6 py-4"><div className="flex items-center gap-2"><span className="rounded-xl bg-[#e8f5f3] p-2 text-[#1b7b68]"><HeartPulse className="h-3.5 w-3.5" /></span><div><div className="text-xs font-bold text-slate-700">{Array.isArray(plan.benefitIds) ? plan.benefitIds.length : 0}</div><div className="text-[10px] text-slate-400">attached</div></div></div></td>
                    <td className="px-6 py-4"><span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${meta.cls}`}>{meta.icon}{meta.label}</span></td>
                    <td className="px-6 py-4 text-right"><div className="flex justify-end gap-1.5"><button type="button" onClick={() => void openDetails(plan)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-[#e8f5f3] hover:text-[#1b7b68]" title="View"><Eye className="h-3.5 w-3.5" /></button><button type="button" onClick={() => openEdit(plan)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-[#e8f5f3] hover:text-[#1b7b68]" title="Edit"><Edit3 className="h-3.5 w-3.5" /></button>{plan.status !== "ARCHIVED" && <select value="" disabled={statusUpdatingId === plan._id} onChange={(event) => { const next = event.target.value as PlanStatus; if (next) void changeStatus(plan, next); }} className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-[10px] font-bold text-slate-500 outline-none"><option value="">{statusUpdatingId === plan._id ? "..." : "Status"}</option>{STATUSES.filter((item) => item !== plan.status).map((item) => <option key={item} value={item}>{item}</option>)}</select>}</div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] font-medium text-slate-400">Showing {plans.length} of {total} health plans</p>
          <div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-xl border border-slate-200 p-2 text-slate-500 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-600">Page {page} of {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-xl border border-slate-200 p-2 text-slate-500 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div>
        </div>
      </section>

      <Modal open={showForm} title={editingPlan ? "Edit Health Plan" : "Create Health Plan"} subtitle="Configure plan identity, premiums, coverage rules and lifecycle dates." onClose={() => !saving && setShowForm(false)} wide>
        <form onSubmit={submitForm}>
          <div className="max-h-[76vh] space-y-5 overflow-y-auto p-6">
            {formError && <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{formError}</span></div>}
            <section className="rounded-3xl border border-slate-100 bg-slate-50/50 p-5">
              <h3 className="text-sm font-extrabold text-slate-800">Plan Identity</h3>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="Plan Code" required value={form.code} disabled={!!editingPlan} onChange={(value) => setForm((f) => ({ ...f, code: value.toUpperCase() }))} placeholder="GOLD-001" />
                <Field label="Plan Name" required value={form.name} onChange={(value) => setForm((f) => ({ ...f, name: value }))} placeholder="Gold Comprehensive" />
                <SelectField label="Plan Type" value={form.type} options={PLAN_TYPES.map((item) => ({ value: item, label: typeLabel(item) }))} onChange={(value) => setForm((f) => ({ ...f, type: value as PlanType }))} />
                <Field label="Tier" value={form.tier} onChange={(value) => setForm((f) => ({ ...f, tier: value }))} placeholder="Gold" />
                <Field label="Currency" required value={form.currency} onChange={(value) => setForm((f) => ({ ...f, currency: value.toUpperCase() }))} placeholder="NGN" />
                <Field label="Description" value={form.description} onChange={(value) => setForm((f) => ({ ...f, description: value }))} placeholder="Plan overview" />
              </div>
            </section>

            <section className="rounded-3xl border border-emerald-100 bg-emerald-50/30 p-5">
              <h3 className="text-sm font-extrabold text-slate-800">Premium Configuration</h3>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                <SelectField label="Billing Frequency" value={form.frequency} options={["MONTHLY", "QUARTERLY", "ANNUAL"].map((item) => ({ value: item, label: item }))} onChange={(value) => setForm((f) => ({ ...f, frequency: value as PremiumFrequency }))} />
                <Field label="Individual Premium" type="number" value={form.individualPremium} onChange={(value) => setForm((f) => ({ ...f, individualPremium: value }))} placeholder="0.00" />
                <Field label="Family Premium" type="number" value={form.familyPremium} onChange={(value) => setForm((f) => ({ ...f, familyPremium: value }))} placeholder="0.00" />
                <Field label="Corporate Premium" type="number" value={form.corporatePremium} onChange={(value) => setForm((f) => ({ ...f, corporatePremium: value }))} placeholder="0.00" />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-slate-50/50 p-5">
              <h3 className="text-sm font-extrabold text-slate-800">Coverage & Lifecycle</h3>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                <Field label="Effective From" required type="date" value={form.effectiveFrom} onChange={(value) => setForm((f) => ({ ...f, effectiveFrom: value }))} />
                <Field label="Effective To" type="date" value={form.effectiveTo} onChange={(value) => setForm((f) => ({ ...f, effectiveTo: value }))} />
                <Field label="Waiting Period (Days)" type="number" value={form.defaultWaitingPeriodDays} onChange={(value) => setForm((f) => ({ ...f, defaultWaitingPeriodDays: value }))} />
                <Field label="Annual Utilization Limit" type="number" value={form.annualUtilizationLimit} onChange={(value) => setForm((f) => ({ ...f, annualUtilizationLimit: value }))} />
                <label className="block md:col-span-4"><span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Notes</span><textarea rows={4} value={form.notes} onChange={(event) => setForm((f) => ({ ...f, notes: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/10" placeholder="Internal plan notes" /></label>
              </div>
            </section>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4"><button type="button" disabled={saving} onClick={() => setShowForm(false)} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cancel</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-[#1b7b68] px-5 py-2.5 text-xs font-extrabold text-white disabled:opacity-60">{saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{editingPlan ? "Save Changes" : "Create Health Plan"}</button></div>
        </form>
      </Modal>

      <Modal open={Boolean(selectedPlan)} title={selectedPlan?.name || "Health Plan Details"} subtitle={selectedPlan ? `${selectedPlan.code} · ${typeLabel(selectedPlan.type)}${selectedPlan.tier ? ` · ${selectedPlan.tier}` : ""}` : undefined} onClose={() => setSelectedPlan(null)} wide>
        {selectedPlan && (
          <div className="max-h-[78vh] overflow-y-auto p-6">
            {detailsLoading && <div className="mb-4 flex items-center gap-2 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin text-[#1b7b68]" /> Loading latest plan details...</div>}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <section className="rounded-3xl border border-slate-100 bg-slate-50/50 p-5 lg:col-span-2">
                <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]"><CreditCard className="h-6 w-6" /></div><div><h3 className="font-black text-slate-800">{selectedPlan.name}</h3><p className="text-[10px] font-medium text-slate-400">{selectedPlan.code} · {typeLabel(selectedPlan.type)}</p></div></div><span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusMeta(selectedPlan.status).cls}`}>{statusMeta(selectedPlan.status).icon}{statusMeta(selectedPlan.status).label}</span></div>
                <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4"><div><p className="text-[9px] font-extrabold uppercase text-slate-400">Tier</p><p className="mt-1 text-xs font-bold text-slate-700">{selectedPlan.tier || "—"}</p></div><div><p className="text-[9px] font-extrabold uppercase text-slate-400">Currency</p><p className="mt-1 text-xs font-bold text-slate-700">{selectedPlan.currency}</p></div><div><p className="text-[9px] font-extrabold uppercase text-slate-400">Waiting Period</p><p className="mt-1 text-xs font-bold text-slate-700">{selectedPlan.defaultWaitingPeriodDays} days</p></div><div><p className="text-[9px] font-extrabold uppercase text-slate-400">Annual Limit</p><p className="mt-1 text-xs font-bold text-slate-700">{selectedPlan.annualUtilizationLimit?.toLocaleString() || "Unlimited"}</p></div></div>
                {selectedPlan.description && <p className="mt-5 rounded-2xl bg-white p-4 text-xs leading-5 text-slate-500">{selectedPlan.description}</p>}
              </section>
              <section className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-5"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" /><h3 className="text-sm font-extrabold text-slate-800">Plan Status</h3></div><p className="mt-4 text-2xl font-black text-emerald-700">{statusMeta(selectedPlan.status).label}</p><p className="mt-1 text-[10px] text-slate-500">Effective {formatDate(selectedPlan.effectiveFrom)}{selectedPlan.effectiveTo ? ` to ${formatDate(selectedPlan.effectiveTo)}` : " · no end date"}.</p></section>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-[#1b7b68]" /><h3 className="text-sm font-extrabold text-slate-800">Premiums</h3></div><div className="mt-4 space-y-3 text-xs"><div className="flex justify-between gap-4"><span className="text-slate-400">Individual</span><strong className="text-slate-700">{formatCurrency(selectedPlan.premium?.individual, selectedPlan.currency)}</strong></div><div className="flex justify-between gap-4"><span className="text-slate-400">Family</span><strong className="text-slate-700">{formatCurrency(selectedPlan.premium?.family, selectedPlan.currency)}</strong></div><div className="flex justify-between gap-4"><span className="text-slate-400">Corporate</span><strong className="text-slate-700">{formatCurrency(selectedPlan.premium?.corporate, selectedPlan.currency)}</strong></div><div className="flex justify-between gap-4"><span className="text-slate-400">Frequency</span><strong className="text-slate-700">{selectedPlan.premium?.frequency || "—"}</strong></div></div></section>
              <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#1b7b68]" /><h3 className="text-sm font-extrabold text-slate-800">Coverage Period</h3></div><div className="mt-4 space-y-3 text-xs"><div className="flex justify-between gap-4"><span className="text-slate-400">Starts</span><strong className="text-slate-700">{formatDate(selectedPlan.effectiveFrom)}</strong></div><div className="flex justify-between gap-4"><span className="text-slate-400">Ends</span><strong className="text-slate-700">{formatDate(selectedPlan.effectiveTo)}</strong></div><div className="flex justify-between gap-4"><span className="text-slate-400">Benefits attached</span><strong className="text-slate-700">{selectedPlan.benefitIds?.length || 0}</strong></div><div className="flex justify-between gap-4"><span className="text-slate-400">Updated</span><strong className="text-slate-700">{formatDate(selectedPlan.updatedAt)}</strong></div></div></section>
            </div>

            <section className="mt-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><HeartPulse className="h-4 w-4 text-[#1b7b68]" /><h3 className="text-sm font-extrabold text-slate-800">Attached Benefits</h3></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">{selectedPlan.benefitIds?.length || 0}</span></div><div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">{selectedPlan.benefitIds?.length ? selectedPlan.benefitIds.map((benefit) => <div key={benefit._id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-3"><div><p className="text-xs font-bold text-slate-700">{benefit.name}</p><p className="text-[10px] text-slate-400">{benefit.code}{benefit.category ? ` · ${benefit.category}` : ""}</p></div><span className="rounded-full bg-[#e8f5f3] px-2 py-1 text-[9px] font-extrabold text-[#1b7b68]">{benefit.status || "DEFINED"}</span></div>) : <p className="col-span-full py-5 text-center text-xs text-slate-400">No benefits are attached to this plan yet.</p>}</div></section>

            {selectedPlan.notes && <section className="mt-4 rounded-3xl border border-slate-100 bg-slate-50/60 p-5"><h3 className="text-sm font-extrabold text-slate-800">Notes</h3><p className="mt-2 text-xs leading-5 text-slate-500">{selectedPlan.notes}</p></section>}

            <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => openEdit(selectedPlan)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"><Edit3 className="h-3.5 w-3.5" /> Edit</button>{selectedPlan.status === "DRAFT" && <button type="button" onClick={() => void changeStatus(selectedPlan, "ACTIVE")} className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white">Activate</button>}{selectedPlan.status === "ACTIVE" && <button type="button" onClick={() => void changeStatus(selectedPlan, "INACTIVE")} className="rounded-2xl bg-orange-500 px-4 py-2.5 text-xs font-extrabold text-white">Deactivate</button>}{selectedPlan.status !== "ARCHIVED" && <button type="button" onClick={() => void changeStatus(selectedPlan, "ARCHIVED")} className="rounded-2xl bg-rose-600 px-4 py-2.5 text-xs font-extrabold text-white">Archive</button>}</div>
          </div>
        )}
      </Modal>
    </div>
  );
}
