'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileCheck,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  X,
  Ban,
  CreditCard,
  ClipboardCheck,
} from 'lucide-react';

const RAW_API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://medxverse-backend.onrender.com/api/v1';

const API_BASE_URL = /\/api\/v1$/i.test(RAW_API_URL.replace(/\/$/, ''))
  ? RAW_API_URL.replace(/\/$/, '')
  : `${RAW_API_URL.replace(/\/$/, '')}/api/v1`;

const CLAIMS_API = '/claims';

const STATUS_OPTIONS = [
  'ALL',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'PAID',
  'CANCELLED',
] as const;

type ClaimStatus = Exclude<(typeof STATUS_OPTIONS)[number], 'ALL'>;
type ClaimItemCategory =
  | 'PROCEDURE'
  | 'DRUG'
  | 'LAB_TEST'
  | 'CONSULTATION'
  | 'ACCOMMODATION'
  | 'OTHER';

interface EntityRef {
  _id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  code?: string;
  policyNumber?: string;
  email?: string;
  phone?: string;
  state?: string;
}

interface ClaimItem {
  code?: string;
  description: string;
  category: ClaimItemCategory;
  quantity: number;
  unitPrice: number;
  claimedAmount: number;
  approvedAmount?: number;
}

interface Claim {
  _id: string;
  claimNumber: string;
  memberId: EntityRef | string;
  providerId: EntityRef | string;
  diagnosis: string;
  icdCode?: string;
  treatmentDate: string;
  submissionDate: string;
  items: ClaimItem[];
  totalClaimedAmount: number;
  totalApprovedAmount?: number;
  status: ClaimStatus;
  rejectionReason?: string;
  adjudicatedBy?: EntityRef | string;
  adjudicatedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface ClaimsResponse {
  claims: Claim[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

interface CreateItem {
  code: string;
  description: string;
  category: ClaimItemCategory;
  quantity: number;
  unitPrice: number;
}

const emptyItem = (): CreateItem => ({
  code: '',
  description: '',
  category: 'CONSULTATION',
  quantity: 1,
  unitPrice: 0,
});

const inputClass =
  'mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-[#1b7b68] focus:ring-4 focus:ring-[#1b7b68]/10';
const selectClass = `${inputClass} appearance-none`;
const textareaClass =
  'mt-1 min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium leading-5 text-slate-700 outline-none transition focus:border-[#1b7b68] focus:ring-4 focus:ring-[#1b7b68]/10';

function token() {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('authToken')
  );
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...(options.headers || {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T> & {
    error?: string;
  };

  if (!response.ok || payload.success === false) {
    throw new Error(
      payload.message || payload.error || `Request failed (${response.status})`
    );
  }

  return (payload.data ?? payload) as T;
}

function entityName(value?: EntityRef | string, fallback = '—') {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (value.name) return value.name;
  const full = `${value.firstName || ''} ${value.lastName || ''}`.trim();
  return full || value.code || fallback;
}

function money(value?: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function dateTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function dateOnly(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function statusLabel(status: ClaimStatus) {
  return status.replace(/_/g, ' ');
}

function StatusBadge({ status }: { status: ClaimStatus }) {
  const config: Record<ClaimStatus, string> = {
    SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-100',
    UNDER_REVIEW: 'bg-amber-50 text-amber-700 border-amber-100',
    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-100',
    PAID: 'bg-violet-50 text-violet-700 border-violet-100',
    CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const icon =
    status === 'APPROVED' || status === 'PAID' ? (
      <CheckCircle2 className="h-3.5 w-3.5" />
    ) : status === 'REJECTED' || status === 'CANCELLED' ? (
      <Ban className="h-3.5 w-3.5" />
    ) : status === 'UNDER_REVIEW' ? (
      <Clock3 className="h-3.5 w-3.5" />
    ) : (
      <FileCheck className="h-3.5 w-3.5" />
    );

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${config[status]}`}
    >
      {icon}
      {statusLabel(status)}
    </span>
  );
}

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusModal, setStatusModal] = useState<Claim | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchClaims = useCallback(async (targetPage = page, silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setActionError(null);

    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: '20' });
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const result = await api<ClaimsResponse>(`${CLAIMS_API}?${params.toString()}`);
      setClaims(Array.isArray(result.claims) ? result.claims : []);
      setTotal(Number(result.total || 0));
      setPage(Number(result.page || targetPage));
      setTotalPages(Math.max(1, Number(result.totalPages || 1)));
    } catch (error) {
      console.error('Failed to load claims:', error);
      setClaims([]);
      setActionError(error instanceof Error ? error.message : 'Unable to load claims.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, statusFilter, searchTerm, startDate, endDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchClaims(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [statusFilter, searchTerm, startDate, endDate]);

  useEffect(() => {
    void fetchClaims(page);
    // Initial page fetch only. Filter changes are handled above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    return {
      total,
      submitted: claims.filter((c) => c.status === 'SUBMITTED').length,
      review: claims.filter((c) => c.status === 'UNDER_REVIEW').length,
      approved: claims.filter((c) => c.status === 'APPROVED').length,
      rejected: claims.filter((c) => c.status === 'REJECTED').length,
      claimed: claims.reduce((sum, c) => sum + Number(c.totalClaimedAmount || 0), 0),
      approvedAmount: claims.reduce((sum, c) => sum + Number(c.totalApprovedAmount || 0), 0),
    };
  }, [claims, total]);

  const openClaim = async (claim: Claim) => {
    setSelectedClaim(claim);
    setDetailLoading(true);
    try {
      const fresh = await api<Claim>(`${CLAIMS_API}/${claim._id}`);
      setSelectedClaim(fresh);
    } catch (error) {
      console.error('Failed to load claim:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusUpdated = () => {
    setStatusModal(null);
    setSelectedClaim(null);
    void fetchClaims(page, true);
  };

  return (
    <div className="min-h-full space-y-6 font-sans text-slate-800">
      {actionError && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">{actionError}</div>
          <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-rose-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-800">Claims Adjudication</h1>
            <span className="rounded-full bg-[#e8f5f3] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1b7b68]">
              HMO Operations
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-400">
            Review submitted claims, assess payable amounts, and record adjudication decisions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => void fetchClaims(page, true)}
            className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-slate-500 transition-all hover:bg-[#e8f5f3] hover:text-[#1b7b68]"
            title="Refresh claims"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-[#1b7b68] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-[#145f50]"
          >
            <Plus className="h-4 w-4" /> Submit Claim
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<FileCheck />} label="Total Claims" value={stats.total.toLocaleString()} tone="teal" />
        <StatCard icon={<Clock3 />} label="Under Review" value={stats.review.toLocaleString()} tone="amber" />
        <StatCard icon={<CheckCircle2 />} label="Approved" value={stats.approved.toLocaleString()} tone="green" />
        <StatCard icon={<Ban />} label="Rejected" value={stats.rejected.toLocaleString()} tone="rose" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Claimed Amount · Current Page</p>
          <p className="mt-2 text-2xl font-black text-slate-800">{money(stats.claimed)}</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Approved Amount · Current Page</p>
          <p className="mt-2 text-2xl font-black text-[#1b7b68]">{money(stats.approvedAmount)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/30 p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-md">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search claim number, diagnosis, ICD code..."
              className="w-full rounded-2xl border border-slate-200/80 bg-white py-2.5 pl-11 pr-4 text-xs text-slate-800 outline-none transition-all focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="ml-1 h-4 w-4 text-slate-400" />
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wide transition-all ${
                  statusFilter === status
                    ? 'bg-[#1b7b68] text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {status === 'ALL' ? 'All' : statusLabel(status)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-100 bg-white p-5 sm:flex-row sm:items-end">
          <div className="w-full sm:max-w-[180px]">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Treatment From</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
          </div>
          <div className="w-full sm:max-w-[180px]">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Treatment To</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
          </div>
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="h-10 rounded-xl px-3 text-xs font-bold text-slate-500 hover:bg-slate-50"
            >
              Clear dates
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Claim</th>
                <th className="px-5 py-4">Member</th>
                <th className="px-5 py-4">Provider</th>
                <th className="px-5 py-4">Treatment</th>
                <th className="px-5 py-4">Claimed</th>
                <th className="px-5 py-4">Approved</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <TableSkeleton />
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <FileCheck className="mx-auto h-9 w-9 text-slate-300" />
                    <p className="mt-3 text-sm font-semibold text-slate-600">No claims found</p>
                    <p className="mt-1 text-xs text-slate-400">Try a different search or status filter.</p>
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr key={claim._id} className="group transition-all hover:bg-[#e8f5f3]/20">
                    <td className="px-6 py-4">
                      <div className="font-bold text-sm text-slate-800 group-hover:text-[#1b7b68]">{claim.claimNumber}</div>
                      <div className="mt-1 text-[10px] text-slate-400 line-clamp-1">{claim.diagnosis}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-xs font-bold text-slate-700">{entityName(claim.memberId)}</div>
                      {typeof claim.memberId !== 'string' && claim.memberId?.policyNumber && (
                        <div className="mt-1 text-[10px] text-slate-400">{claim.memberId.policyNumber}</div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-xs font-medium text-slate-600">{entityName(claim.providerId)}</div>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-500">{dateOnly(claim.treatmentDate)}</td>
                    <td className="px-5 py-4 text-xs font-bold text-slate-700">{money(claim.totalClaimedAmount)}</td>
                    <td className="px-5 py-4 text-xs font-bold text-[#1b7b68]">
                      {claim.totalApprovedAmount === undefined ? '—' : money(claim.totalApprovedAmount)}
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={claim.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => void openClaim(claim)}
                          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-[#1b7b68] transition-all hover:bg-[#e8f5f3]"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                        {['SUBMITTED', 'UNDER_REVIEW'].includes(claim.status) && (
                          <button
                            type="button"
                            onClick={() => setStatusModal(claim)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1b7b68] px-3 py-2 text-xs font-bold text-white transition-all hover:bg-[#145f50]"
                          >
                            <ClipboardCheck className="h-3.5 w-3.5" /> Adjudicate
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

        <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs font-medium text-slate-400">
            Showing page <strong className="text-slate-700">{page}</strong> of <strong className="text-slate-700">{totalPages}</strong> · {total.toLocaleString()} total claims
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => void fetchClaims(page - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => void fetchClaims(page + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {selectedClaim && (
        <ClaimDetailModal
          claim={selectedClaim}
          loading={detailLoading}
          onClose={() => setSelectedClaim(null)}
          onAdjudicate={() => {
            setSelectedClaim(null);
            setStatusModal(selectedClaim);
          }}
        />
      )}

      {statusModal && (
        <AdjudicationModal
          claim={statusModal}
          onClose={() => setStatusModal(null)}
          onUpdated={handleStatusUpdated}
          setError={setActionError}
        />
      )}

      {createOpen && (
        <CreateClaimModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            void fetchClaims(1, true);
          }}
          setError={setActionError}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'teal' | 'amber' | 'green' | 'rose' }) {
  const tones = {
    teal: 'bg-[#e8f5f3] text-[#1b7b68]',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-emerald-50 text-emerald-700',
    rose: 'bg-rose-50 text-rose-700',
  };
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl ${tones[tone]}`}>{icon}</div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-800">{value}</p>
    </div>
  );
}

function ClaimDetailModal({ claim, loading, onClose, onAdjudicate }: { claim: Claim; loading: boolean; onClose: () => void; onAdjudicate: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-t-[2rem] bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">Claim {claim.claimNumber}</h2>
              <StatusBadge status={claim.status} />
            </div>
            <p className="mt-1 text-xs text-slate-400">Submitted {dateTime(claim.submissionDate)}</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-5 p-6">
          {loading && <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Refreshing claim details...</div>}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Info label="Member" value={entityName(claim.memberId)} />
            <Info label="Provider" value={entityName(claim.providerId)} />
            <Info label="Treatment Date" value={dateOnly(claim.treatmentDate)} />
            <Info label="ICD Code" value={claim.icdCode || '—'} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Diagnosis</p><p className="mt-1 text-sm font-bold text-slate-800">{claim.diagnosis}</p></div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Claimed</p><p className="mt-1 text-lg font-black text-slate-800">{money(claim.totalClaimedAmount)}</p></div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Approved</p><p className="mt-1 text-lg font-black text-[#1b7b68]">{claim.totalApprovedAmount === undefined ? 'Pending' : money(claim.totalApprovedAmount)}</p></div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Claim Items</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead><tr className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-400"><th className="px-4 py-3">Description</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Unit</th><th className="px-4 py-3">Claimed</th><th className="px-4 py-3">Approved</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{claim.items.map((item, index) => <tr key={`${item.description}-${index}`} className="text-xs"><td className="px-4 py-3 font-semibold text-slate-700">{item.description}</td><td className="px-4 py-3 text-slate-500">{item.category.replace(/_/g, ' ')}</td><td className="px-4 py-3 text-slate-500">{item.quantity}</td><td className="px-4 py-3 text-slate-500">{money(item.unitPrice)}</td><td className="px-4 py-3 font-bold text-slate-700">{money(item.claimedAmount)}</td><td className="px-4 py-3 font-bold text-[#1b7b68]">{item.approvedAmount === undefined ? '—' : money(item.approvedAmount)}</td></tr>)}</tbody>
              </table>
            </div>
          </div>

          {claim.rejectionReason && <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Rejection Reason</p><p className="mt-1 text-xs font-medium text-rose-700">{claim.rejectionReason}</p></div>}
          {claim.notes && <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Notes</p><p className="mt-1 text-xs font-medium leading-5 text-slate-600">{claim.notes}</p></div>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          {['SUBMITTED', 'UNDER_REVIEW'].includes(claim.status) && <button onClick={onAdjudicate} className="rounded-xl bg-[#1b7b68] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#145f50]">Open Adjudication</button>}
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Close</button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-100 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 truncate text-xs font-bold text-slate-700">{value}</p></div>;
}

function AdjudicationModal({ claim, onClose, onUpdated, setError }: { claim: Claim; onClose: () => void; onUpdated: () => void; setError: (value: string | null) => void }) {
  const [decision, setDecision] = useState<ClaimStatus>(claim.status === 'SUBMITTED' ? 'UNDER_REVIEW' : 'APPROVED');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [approvedItems, setApprovedItems] = useState<number[]>(claim.items.map((item) => item.claimedAmount));
  const [saving, setSaving] = useState(false);

  const updateAmount = (index: number, value: string) => {
    const numeric = Math.max(0, Number(value) || 0);
    setApprovedItems((current) => current.map((amount, i) => (i === index ? Math.min(numeric, claim.items[index].claimedAmount) : amount)));
  };

  const submit = async () => {
    setError(null);
    if (decision === 'REJECTED' && !reason.trim()) {
      setError('A rejection reason is required.');
      return;
    }
    if (!['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(decision)) {
      setError('Select a valid adjudication decision.');
      return;
    }

    try {
      setSaving(true);
      const body: Record<string, unknown> = { status: decision, notes: notes.trim() || undefined };
      if (decision === 'REJECTED') body.rejectionReason = reason.trim();
      if (decision === 'APPROVED') {
        body.approvedItems = approvedItems.map((approvedAmount, itemIndex) => ({ itemIndex, approvedAmount }));
      }
      await api(`${CLAIMS_API}/${claim._id}/status`, { method: 'PATCH', body: JSON.stringify(body) });
      onUpdated();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to update claim status.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5"><div><h2 className="text-lg font-black text-slate-900">Adjudicate {claim.claimNumber}</h2><p className="mt-1 text-xs text-slate-400">Choose the next valid claim status and, when approving, set payable amounts per item.</p></div><button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
        <div className="space-y-5 p-6">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold text-slate-800">{claim.diagnosis}</p><p className="mt-1 text-[10px] text-slate-400">Claimed {money(claim.totalClaimedAmount)}</p></div><StatusBadge status={claim.status} /></div></div>
          <div><label className="text-xs font-bold text-slate-700">Decision</label><select value={decision} onChange={(e) => setDecision(e.target.value as ClaimStatus)} className={selectClass}><option value="UNDER_REVIEW">Move to Under Review</option><option value="APPROVED">Approve</option><option value="REJECTED">Reject</option><option value="CANCELLED">Cancel</option></select></div>

          {decision === 'APPROVED' && (
            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Approved amounts</p><p className="mt-1 text-[10px] text-slate-400">Set each payable amount. Values are capped at the claimed amount.</p></div>
              <div className="divide-y divide-slate-100">{claim.items.map((item, index) => <div key={`${item.description}-${index}`} className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[1fr_180px] sm:items-center"><div><p className="text-xs font-bold text-slate-700">{item.description}</p><p className="mt-1 text-[10px] text-slate-400">Claimed {money(item.claimedAmount)} · {item.category.replace(/_/g, ' ')}</p></div><input type="number" min="0" max={item.claimedAmount} step="0.01" value={approvedItems[index]} onChange={(e) => updateAmount(index, e.target.value)} className={inputClass} /></div>)}</div>
            </div>
          )}

          {decision === 'REJECTED' && <div><label className="text-xs font-bold text-slate-700">Rejection reason *</label><textarea value={reason} onChange={(e) => setReason(e.target.value)} className={textareaClass} placeholder="Explain why this claim is being rejected..." /></div>}
          <div><label className="text-xs font-bold text-slate-700">Adjudication notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={textareaClass} placeholder="Optional internal notes..." /></div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4"><button onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button><button onClick={() => void submit()} disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#1b7b68] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#145f50] disabled:opacity-50">{saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Save Decision</button></div>
      </div>
    </div>
  );
}

function CreateClaimModal({ onClose, onCreated, setError }: { onClose: () => void; onCreated: () => void; setError: (value: string | null) => void }) {
  const [claimNumber, setClaimNumber] = useState('');
  const [memberId, setMemberId] = useState('');
  const [providerId, setProviderId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [icdCode, setIcdCode] = useState('');
  const [treatmentDate, setTreatmentDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<CreateItem[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);

  const total = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);

  const updateItem = <K extends keyof CreateItem>(index: number, key: K, value: CreateItem[K]) => {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const submit = async () => {
    setError(null);
    if (!claimNumber.trim() || !memberId.trim() || !providerId.trim() || !diagnosis.trim() || !treatmentDate) {
      setError('Claim number, member ID, provider ID, diagnosis, and treatment date are required.');
      return;
    }
    if (items.some((item) => !item.description.trim() || item.quantity < 1 || item.unitPrice < 0)) {
      setError('Every claim item needs a description, positive quantity, and valid unit price.');
      return;
    }
    try {
      setSaving(true);
      await api(CLAIMS_API, {
        method: 'POST',
        body: JSON.stringify({
          claimNumber: claimNumber.trim(),
          memberId: memberId.trim(),
          providerId: providerId.trim(),
          diagnosis: diagnosis.trim(),
          icdCode: icdCode.trim() || undefined,
          treatmentDate,
          notes: notes.trim() || undefined,
          items: items.map((item) => ({ ...item, code: item.code.trim() || undefined, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) })),
        }),
      });
      onCreated();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to submit claim.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-t-[2rem] bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5"><div><h2 className="text-lg font-black text-slate-900">Submit Claim</h2><p className="mt-1 text-xs text-slate-400">Create a claim using the exact member and provider IDs known to the HMO backend.</p></div><button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
        <div className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2"><Field label="Claim Number *" value={claimNumber} onChange={setClaimNumber} placeholder="CLM-2026-0001" /><Field label="Treatment Date *" type="date" value={treatmentDate} onChange={setTreatmentDate} /><Field label="Member ID *" value={memberId} onChange={setMemberId} placeholder="MongoDB member ObjectId" /><Field label="Provider ID *" value={providerId} onChange={setProviderId} placeholder="MongoDB provider ObjectId" /><Field label="Diagnosis *" value={diagnosis} onChange={setDiagnosis} placeholder="Primary diagnosis" /><Field label="ICD Code" value={icdCode} onChange={setIcdCode} placeholder="Optional ICD-10 code" /></div>

          <div className="overflow-hidden rounded-2xl border border-slate-100"><div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Claim Items</p><p className="mt-1 text-[10px] text-slate-400">The backend calculates claimed totals from quantity × unit price.</p></div><button type="button" onClick={() => setItems((current) => [...current, emptyItem()])} className="flex items-center gap-1.5 rounded-xl bg-[#e8f5f3] px-3 py-2 text-[10px] font-bold text-[#1b7b68]"><Plus className="h-3.5 w-3.5" /> Add Item</button></div><div className="divide-y divide-slate-100">{items.map((item, index) => <div key={index} className="space-y-3 p-4"><div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_120px_120px_40px]"><div><label className="text-[10px] font-bold text-slate-500">Description *</label><input value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} className={inputClass} /></div><div><label className="text-[10px] font-bold text-slate-500">Category *</label><select value={item.category} onChange={(e) => updateItem(index, 'category', e.target.value as ClaimItemCategory)} className={selectClass}><option>PROCEDURE</option><option>DRUG</option><option>LAB_TEST</option><option>CONSULTATION</option><option>ACCOMMODATION</option><option>OTHER</option></select></div><div><label className="text-[10px] font-bold text-slate-500">Quantity</label><input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))} className={inputClass} /></div><div><label className="text-[10px] font-bold text-slate-500">Unit Price</label><input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))} className={inputClass} /></div><button type="button" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, i) => i !== index))} className="mt-6 flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"><X className="h-4 w-4" /></button></div><div><label className="text-[10px] font-bold text-slate-500">Item Code</label><input value={item.code} onChange={(e) => updateItem(index, 'code', e.target.value)} className={inputClass} placeholder="Optional service/drug code" /></div></div>)}</div><div className="flex justify-end border-t border-slate-100 bg-slate-50/40 px-4 py-3"><span className="text-xs font-bold text-slate-700">Estimated total: <strong className="text-[#1b7b68]">{money(total)}</strong></span></div></div>

          <div><label className="text-xs font-bold text-slate-700">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={textareaClass} placeholder="Optional claim notes..." /></div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4"><button onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button><button onClick={() => void submit()} disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#1b7b68] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#145f50] disabled:opacity-50">{saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Submit Claim</button></div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <div><label className="text-xs font-bold text-slate-700">{label}</label><input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputClass} /></div>;
}

function TableSkeleton() {
  return <>{Array.from({ length: 6 }).map((_, index) => <tr key={index} className="animate-pulse"><td className="px-6 py-5"><div className="h-4 w-28 rounded bg-slate-200" /><div className="mt-2 h-3 w-36 rounded bg-slate-100" /></td><td className="px-5 py-5"><div className="h-4 w-24 rounded bg-slate-200" /></td><td className="px-5 py-5"><div className="h-4 w-20 rounded bg-slate-100" /></td><td className="px-5 py-5"><div className="h-4 w-16 rounded bg-slate-100" /></td><td className="px-5 py-5"><div className="h-4 w-20 rounded bg-slate-200" /></td><td className="px-5 py-5"><div className="h-4 w-20 rounded bg-slate-100" /></td><td className="px-5 py-5"><div className="h-6 w-24 rounded-full bg-slate-200" /></td><td className="px-6 py-5"><div className="ml-auto h-8 w-24 rounded-xl bg-slate-200" /></td></tr>)}</>;
}
