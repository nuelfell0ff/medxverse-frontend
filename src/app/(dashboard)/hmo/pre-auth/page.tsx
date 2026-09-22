'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileCheck2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://medxverse-backend.onrender.com';
// This follows the routes exposed by the pre-authorizations module itself.
// If your backend mounts the router at another prefix, change only this constant.
const PRE_AUTH_API = `${API_BASE_URL}/api/v1/pre-authorizations`;

type Status = 'NEW_REQUEST' | 'PENDING' | 'APPROVED' | 'DECLINED' | 'CANCELLED';
type Priority = 'ROUTINE' | 'URGENT' | 'EMERGENCY';

interface ProcedureItem {
  code: string;
  description: string;
  requestedAmount: number;
  approvedAmount?: number;
}

interface MemberRef {
  _id: string;
  firstName?: string;
  lastName?: string;
  policyNumber?: string;
  email?: string;
}

interface ProviderRef {
  _id: string;
  name?: string;
  code?: string;
  category?: string;
}

interface PreAuth {
  _id: string;
  requestNumber: string;
  memberId: MemberRef | string;
  providerId: ProviderRef | string;
  diagnosisCode: string;
  diagnosisDescription: string;
  priority: Priority;
  status: Status;
  procedures: ProcedureItem[];
  totalRequestedAmount: number;
  totalApprovedAmount: number;
  clinicalNotes?: string;
  decisionReason?: string;
  reviewedBy?: { firstName?: string; lastName?: string; email?: string } | string;
  reviewedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  newRequests: number;
  pending: number;
  approvedToday: number;
  declined: number;
  total: number;
}

interface ListResult {
  requests: PreAuth[];
  total: number;
  page: number;
  totalPages: number;
}

const emptyStats: Stats = { newRequests: 0, pending: 0, approvedToday: 0, declined: 0, total: 0 };

function authHeaders(json = false): HeadersInit {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('authToken')
    : null;
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { ...authHeaders(Boolean(options?.body)), ...(options?.headers || {}) }, cache: 'no-store' });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.message || json?.error || `Request failed (${response.status})`);
  return json as T;
}

function money(value?: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(value || 0);
}

function memberName(member: PreAuth['memberId']) {
  if (typeof member === 'string') return member;
  return `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unknown member';
}

function providerName(provider: PreAuth['providerId']) {
  if (typeof provider === 'string') return provider;
  return provider.name || provider.code || 'Unknown provider';
}

function dateTime(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}

function statusMeta(status: Status) {
  const map: Record<Status, { label: string; cls: string; icon: React.ReactNode }> = {
    NEW_REQUEST: { label: 'New Request', cls: 'bg-purple-50 text-purple-700 border-purple-100', icon: <FileCheck2 className="w-3 h-3" /> },
    PENDING: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-100', icon: <Clock3 className="w-3 h-3" /> },
    APPROVED: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: <CheckCircle2 className="w-3 h-3" /> },
    DECLINED: { label: 'Declined', cls: 'bg-rose-50 text-rose-700 border-rose-100', icon: <XCircle className="w-3 h-3" /> },
    CANCELLED: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-600 border-slate-200', icon: <X className="w-3 h-3" /> },
  };
  return map[status];
}

function priorityMeta(priority: Priority) {
  const map: Record<Priority, { label: string; cls: string }> = {
    ROUTINE: { label: 'Routine', cls: 'bg-slate-100 text-slate-600' },
    URGENT: { label: 'Urgent', cls: 'bg-amber-50 text-amber-700' },
    EMERGENCY: { label: 'Emergency', cls: 'bg-rose-50 text-rose-700' },
  };
  return map[priority];
}

export default function PreAuthorizationsPage() {
  const [requests, setRequests] = useState<PreAuth[]>([]);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | Status>('ALL');
  const [priority, setPriority] = useState<'ALL' | Priority>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<PreAuth | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status !== 'ALL') params.set('status', status);
      if (priority !== 'ALL') params.set('priority', priority);
      if (search.trim()) params.set('search', search.trim());

      const [list, statsResponse] = await Promise.all([
        apiJson<{ success: boolean; data: ListResult }>(`${PRE_AUTH_API}?${params.toString()}`),
        apiJson<{ success: boolean; data: Stats }>(`${PRE_AUTH_API}/stats`),
      ]);
      setRequests(list.data?.requests || []);
      setTotalPages(Math.max(1, list.data?.totalPages || 1));
      setStats(statsResponse.data || emptyStats);
    } catch (error: any) {
      setActionError(error?.message || 'Unable to load pre-authorizations.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [page, priority, search, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, status, priority]);

  const cards = useMemo(() => [
    { label: 'New Requests', value: stats.newRequests, icon: <FileCheck2 className="w-4 h-4" />, cls: 'bg-purple-50 text-purple-700' },
    { label: 'Pending Review', value: stats.pending, icon: <Clock3 className="w-4 h-4" />, cls: 'bg-amber-50 text-amber-700' },
    { label: 'Approved Today', value: stats.approvedToday, icon: <CheckCircle2 className="w-4 h-4" />, cls: 'bg-emerald-50 text-emerald-700' },
    { label: 'Declined', value: stats.declined, icon: <XCircle className="w-4 h-4" />, cls: 'bg-rose-50 text-rose-700' },
  ], [stats]);

  return (
    <div className="min-h-full space-y-6 font-sans text-slate-800 animate-in fade-in duration-300">
      {actionError && <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3"><AlertCircle className="w-4 h-4 shrink-0" /><span className="font-medium">{actionError}</span><button onClick={() => setActionError(null)} className="ml-auto"><X className="w-4 h-4" /></button></div>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2"><h1 className="text-2xl font-black tracking-tight text-slate-800">Pre-Authorizations</h1><span className="bg-[#e8f5f3] text-[#1b7b68] text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">HMO</span></div>
          <p className="text-xs text-slate-400 mt-1 font-medium">Review and authorize requested healthcare services before treatment.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={load} className="p-3 rounded-2xl border border-slate-100 bg-slate-50 text-slate-500 hover:text-[#1b7b68] hover:bg-[#e8f5f3] transition-all" title="Refresh"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button onClick={() => setCreateOpen(true)} className="px-5 py-3 bg-[#1b7b68] hover:bg-[#145f50] text-white text-xs font-bold uppercase tracking-wider rounded-2xl shadow-sm flex items-center gap-2"><Plus className="w-4 h-4" /> New Pre-Authorization</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(card => <div key={card.label} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5"><div className="flex items-center justify-between"><div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.cls}`}>{card.icon}</div><span className="text-2xl font-black text-slate-800">{card.value}</span></div><p className="text-xs font-bold text-slate-500 mt-4">{card.label}</p></div>)}
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col xl:flex-row items-center justify-between gap-4 bg-slate-50/30">
          <div className="relative w-full xl:w-96"><Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search request, diagnosis or ICD code..." className="w-full pl-11 pr-4 py-2.5 text-xs rounded-2xl border border-slate-200/80 bg-white focus:outline-none focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68]" /></div>
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            <select value={status} onChange={e => setStatus(e.target.value as any)} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-none"><option value="ALL">All statuses</option><option value="NEW_REQUEST">New Request</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="DECLINED">Declined</option><option value="CANCELLED">Cancelled</option></select>
            <select value={priority} onChange={e => setPriority(e.target.value as any)} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-none"><option value="ALL">All priorities</option><option value="ROUTINE">Routine</option><option value="URGENT">Urgent</option><option value="EMERGENCY">Emergency</option></select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50"><th className="py-4 px-6">Request</th><th className="py-4 px-6">Member</th><th className="py-4 px-6">Provider</th><th className="py-4 px-6">Diagnosis</th><th className="py-4 px-6">Priority</th><th className="py-4 px-6">Amount</th><th className="py-4 px-6">Status</th><th className="py-4 px-6 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? <RowsSkeleton /> : requests.length === 0 ? <tr><td colSpan={8} className="py-16 text-center text-slate-400"><ShieldCheck className="w-8 h-8 mx-auto text-slate-300" /><p className="text-sm font-semibold text-slate-600 mt-2">No pre-authorizations found</p><p className="text-xs mt-1">Try changing your filters or create a new request.</p></td></tr> : requests.map(request => {
                const s = statusMeta(request.status); const p = priorityMeta(request.priority);
                return <tr key={request._id} className="hover:bg-[#e8f5f3]/20 transition-colors">
                  <td className="py-4 px-6"><button onClick={() => setSelected(request)} className="font-bold text-slate-800 hover:text-[#1b7b68]">{request.requestNumber}</button><div className="text-[10px] text-slate-400 mt-1">{dateTime(request.createdAt)}</div></td>
                  <td className="py-4 px-6"><div className="font-semibold text-slate-800">{memberName(request.memberId)}</div><div className="text-[10px] text-slate-400">{typeof request.memberId !== 'string' ? request.memberId.policyNumber || 'No policy number' : 'Member ID unavailable'}</div></td>
                  <td className="py-4 px-6"><div className="font-semibold">{providerName(request.providerId)}</div><div className="text-[10px] text-slate-400">{typeof request.providerId !== 'string' ? request.providerId.category || request.providerId.code || '' : ''}</div></td>
                  <td className="py-4 px-6 max-w-xs"><div className="font-bold text-slate-700">{request.diagnosisCode}</div><div className="text-[10px] text-slate-400 line-clamp-1">{request.diagnosisDescription}</div></td>
                  <td className="py-4 px-6"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${p.cls}`}>{p.label}</span></td>
                  <td className="py-4 px-6"><div className="font-bold text-slate-800">{money(request.totalRequestedAmount)}</div><div className="text-[10px] text-emerald-600">Approved: {money(request.totalApprovedAmount)}</div></td>
                  <td className="py-4 px-6"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${s.cls}`}>{s.icon}{s.label}</span></td>
                  <td className="py-4 px-6 text-right"><button onClick={() => setSelected(request)} className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-[#e8f5f3] hover:text-[#1b7b68]">Review</button></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between"><span className="text-[11px] text-slate-400">Page {page} of {totalPages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-xl border border-slate-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button><button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-xl border border-slate-200 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button></div></div>
      </div>

      {selected && <DetailModal request={selected} onClose={() => setSelected(null)} onReview={() => setReviewOpen(true)} />}
      {reviewOpen && selected && <ReviewModal request={selected} onClose={() => setReviewOpen(false)} onDone={() => { setReviewOpen(false); setSelected(null); load(); }} />}
      {createOpen && <CreateModal onClose={() => setCreateOpen(false)} onDone={() => { setCreateOpen(false); setPage(1); load(); }} />}
    </div>
  );
}

function DetailModal({ request, onClose, onReview }: { request: PreAuth; onClose: () => void; onReview: () => void }) {
  const s = statusMeta(request.status); const canReview = !['APPROVED', 'DECLINED', 'CANCELLED'].includes(request.status);
  return <div className="fixed inset-0 z-100 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between"><div><h3 className="text-base font-black">{request.requestNumber}</h3><p className="text-xs text-slate-400 mt-1">Created {dateTime(request.createdAt)}</p></div><button onClick={onClose} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
    <div className="p-6 overflow-y-auto space-y-5"><div className="flex flex-wrap gap-2"><span className={`px-3 py-1.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${s.cls}`}>{s.icon}{s.label}</span><span className={`px-3 py-1.5 rounded-full text-[10px] font-bold ${priorityMeta(request.priority).cls}`}>{priorityMeta(request.priority).label}</span></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Info label="Member" value={memberName(request.memberId)} sub={typeof request.memberId !== 'string' ? request.memberId.policyNumber : undefined} /><Info label="Provider" value={providerName(request.providerId)} sub={typeof request.providerId !== 'string' ? request.providerId.category || request.providerId.code : undefined} /><Info label="Diagnosis" value={request.diagnosisCode} sub={request.diagnosisDescription} /></div>
      <div className="rounded-2xl border border-slate-100 overflow-hidden"><div className="px-4 py-3 bg-slate-50 text-xs font-bold">Requested Services</div><table className="w-full text-xs"><thead><tr className="text-[10px] text-slate-400 uppercase border-b"><th className="p-3 text-left">Code</th><th className="p-3 text-left">Description</th><th className="p-3 text-right">Requested</th><th className="p-3 text-right">Approved</th></tr></thead><tbody>{request.procedures.map(p => <tr key={p.code} className="border-b last:border-0"><td className="p-3 font-bold">{p.code}</td><td className="p-3">{p.description}</td><td className="p-3 text-right">{money(p.requestedAmount)}</td><td className="p-3 text-right text-emerald-600 font-bold">{money(p.approvedAmount)}</td></tr>)}</tbody><tfoot><tr className="font-black"><td colSpan={2} className="p-3">Totals</td><td className="p-3 text-right">{money(request.totalRequestedAmount)}</td><td className="p-3 text-right text-emerald-600">{money(request.totalApprovedAmount)}</td></tr></tfoot></table></div>
      {request.clinicalNotes && <Info label="Clinical Notes" value={request.clinicalNotes} />}{request.decisionReason && <Info label="Decision Reason" value={request.decisionReason} />}{request.expiresAt && <Info label="Authorization Expiry" value={dateTime(request.expiresAt)} />}
    </div>
    <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2"><button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold">Close</button>{canReview && <button onClick={onReview} className="px-4 py-2.5 rounded-xl bg-[#1b7b68] text-white text-xs font-bold">Review Request</button>}</div>
  </div></div>;
}

function ReviewModal({ request, onClose, onDone }: { request: PreAuth; onClose: () => void; onDone: () => void }) {
  const [decision, setDecision] = useState<'APPROVED' | 'PENDING' | 'DECLINED' | 'CANCELLED'>('APPROVED');
  const [amounts, setAmounts] = useState<Record<string, string>>(() => Object.fromEntries(request.procedures.map(p => [p.code, String(p.requestedAmount)])));
  const [reason, setReason] = useState(request.decisionReason || '');
  const [days, setDays] = useState('30'); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  const submit = async () => { setError(null); if (decision === 'DECLINED' && !reason.trim()) { setError('A decision reason is required when declining.'); return; } try { setSaving(true); const body: any = { status: decision, decisionReason: reason.trim() || undefined }; if (decision === 'APPROVED') body.expiresInDays = Number(days) || 30; if (decision === 'APPROVED' || decision === 'PENDING') body.procedures = request.procedures.map(p => ({ code: p.code, approvedAmount: Math.max(0, Number(amounts[p.code]) || 0) })); await apiJson(`${PRE_AUTH_API}/${request._id}/review`, { method: 'PATCH', body: JSON.stringify(body) }); onDone(); } catch (e: any) { setError(e?.message || 'Unable to review request.'); } finally { setSaving(false); } };
  return <div className="fixed inset-0 z-[110] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl max-h-[92vh] flex flex-col"><div className="px-6 py-5 border-b flex justify-between"><div><h3 className="font-black">Review {request.requestNumber}</h3><p className="text-xs text-slate-400 mt-1">Set the decision and approved amounts.</p></div><button onClick={onClose}><X className="w-4 h-4" /></button></div><div className="p-6 overflow-y-auto space-y-5">{error && <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}<div className="grid grid-cols-2 md:grid-cols-4 gap-2">{(['APPROVED','PENDING','DECLINED','CANCELLED'] as const).map(d => <button key={d} onClick={() => setDecision(d)} className={`p-3 rounded-xl border text-xs font-bold ${decision === d ? 'border-[#1b7b68] bg-[#e8f5f3] text-[#1b7b68]' : 'border-slate-200'}`}>{statusMeta(d).label}</button>)}</div>{(decision === 'APPROVED' || decision === 'PENDING') && <div className="space-y-2"><p className="text-xs font-bold">Approved amounts</p>{request.procedures.map(p => <div key={p.code} className="grid grid-cols-[1fr_150px] gap-3 items-center p-3 rounded-xl bg-slate-50"><div><p className="text-xs font-bold">{p.code}</p><p className="text-[10px] text-slate-400">Requested {money(p.requestedAmount)}</p></div><input type="number" min="0" max={p.requestedAmount} step="0.01" value={amounts[p.code]} onChange={e => setAmounts(a => ({ ...a, [p.code]: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white" /></div>)}</div>}{decision === 'APPROVED' && <div><label className="text-xs font-bold">Authorization validity (days)</label><input type="number" min="1" max="365" value={days} onChange={e => setDays(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs" /></div>}<div><label className="text-xs font-bold">Decision reason / notes</label><textarea rows={4} value={reason} onChange={e => setReason(e.target.value)} placeholder={decision === 'DECLINED' ? 'Required reason for decline...' : 'Optional review notes...'} className="mt-1 w-full px-3 py-3 rounded-xl border border-slate-200 text-xs resize-none" /></div></div><div className="px-6 py-4 border-t flex justify-end gap-2"><button onClick={onClose} disabled={saving} className="px-4 py-2.5 rounded-xl border text-xs font-bold">Cancel</button><button onClick={submit} disabled={saving} className="px-4 py-2.5 rounded-xl bg-[#1b7b68] text-white text-xs font-bold flex items-center gap-2">{saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Save Decision</button></div></div></div>;
}

function CreateModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [memberId, setMemberId] = useState(''); const [providerId, setProviderId] = useState(''); const [diagnosisCode, setDiagnosisCode] = useState(''); const [diagnosisDescription, setDiagnosisDescription] = useState(''); const [priority, setPriority] = useState<Priority>('ROUTINE'); const [clinicalNotes, setClinicalNotes] = useState(''); const [procedures, setProcedures] = useState<ProcedureItem[]>([{ code: '', description: '', requestedAmount: 0 }]); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  const updateProcedure = (i: number, key: keyof ProcedureItem, value: string) => setProcedures(ps => ps.map((p, idx) => idx === i ? { ...p, [key]: key === 'requestedAmount' ? Number(value) : value } : p));
  const submit = async () => { setError(null); if (!memberId.trim() || !providerId.trim() || !diagnosisCode.trim() || !diagnosisDescription.trim() || procedures.some(p => !p.code.trim() || !p.description.trim() || !Number.isFinite(p.requestedAmount) || p.requestedAmount < 0)) { setError('Complete all required fields and add at least one valid procedure.'); return; } try { setSaving(true); await apiJson(`${PRE_AUTH_API}`, { method: 'POST', body: JSON.stringify({ memberId: memberId.trim(), providerId: providerId.trim(), diagnosisCode: diagnosisCode.trim(), diagnosisDescription: diagnosisDescription.trim(), priority, clinicalNotes: clinicalNotes.trim() || undefined, procedures: procedures.map(p => ({ code: p.code.trim(), description: p.description.trim(), requestedAmount: p.requestedAmount })) }) }); onDone(); } catch (e: any) { setError(e?.message || 'Unable to create pre-authorization.'); } finally { setSaving(false); } };
  return <div className="fixed inset-0 z-100 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl max-h-[92vh] flex flex-col"><div className="px-6 py-5 border-b flex justify-between"><div><h3 className="font-black">New Pre-Authorization</h3><p className="text-xs text-slate-400 mt-1">Create a service authorization request.</p></div><button onClick={onClose}><X className="w-4 h-4" /></button></div><div className="p-6 overflow-y-auto space-y-4">{error && <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}<div className="grid md:grid-cols-2 gap-4"><Field label="Member ID *" value={memberId} onChange={setMemberId} placeholder="MongoDB member ID" /><Field label="Provider ID *" value={providerId} onChange={setProviderId} placeholder="MongoDB provider ID" /><Field label="Diagnosis code *" value={diagnosisCode} onChange={setDiagnosisCode} placeholder="e.g. J18.9" /><div><label className="text-xs font-bold">Priority</label><select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"><option value="ROUTINE">Routine</option><option value="URGENT">Urgent</option><option value="EMERGENCY">Emergency</option></select></div></div><Field label="Diagnosis description *" value={diagnosisDescription} onChange={setDiagnosisDescription} placeholder="Describe the diagnosis" /><div><label className="text-xs font-bold">Requested procedures *</label><div className="mt-2 space-y-2">{procedures.map((p, i) => <div key={i} className="grid md:grid-cols-[130px_1fr_150px_40px] gap-2"><input value={p.code} onChange={e => updateProcedure(i, 'code', e.target.value)} placeholder="Code" className="px-3 py-2.5 rounded-xl border text-xs" /><input value={p.description} onChange={e => updateProcedure(i, 'description', e.target.value)} placeholder="Description" className="px-3 py-2.5 rounded-xl border text-xs" /><input type="number" min="0" value={p.requestedAmount} onChange={e => updateProcedure(i, 'requestedAmount', e.target.value)} placeholder="Amount" className="px-3 py-2.5 rounded-xl border text-xs" /><button onClick={() => setProcedures(ps => ps.length === 1 ? ps : ps.filter((_, idx) => idx !== i))} className="rounded-xl border text-slate-400 hover:text-rose-600"><X className="w-4 h-4 mx-auto" /></button></div>)}</div><button onClick={() => setProcedures(ps => [...ps, { code: '', description: '', requestedAmount: 0 }])} className="mt-2 text-xs font-bold text-[#1b7b68]">+ Add procedure</button></div><div><label className="text-xs font-bold">Clinical notes</label><textarea rows={4} value={clinicalNotes} onChange={e => setClinicalNotes(e.target.value)} className="mt-1 w-full px-3 py-3 rounded-xl border border-slate-200 text-xs resize-none" placeholder="Clinical justification or supporting notes" /></div></div><div className="px-6 py-4 border-t flex justify-end gap-2"><button onClick={onClose} disabled={saving} className="px-4 py-2.5 rounded-xl border text-xs font-bold">Cancel</button><button onClick={submit} disabled={saving} className="px-4 py-2.5 rounded-xl bg-[#1b7b68] text-white text-xs font-bold flex items-center gap-2">{saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Create Request</button></div></div></div>;
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) { return <div><label className="text-xs font-bold">{label}</label><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]" /></div>; }
function Info({ label, value, sub }: { label: string; value: string; sub?: string }) { return <div className="p-4 rounded-2xl bg-slate-50"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="text-xs font-bold text-slate-800 mt-1 break-words">{value}</p>{sub && <p className="text-[10px] text-slate-400 mt-1 break-words">{sub}</p>}</div>; }
function RowsSkeleton() { return <>{Array.from({ length: 7 }).map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={8} className="py-5 px-6"><div className="h-4 bg-slate-100 rounded w-full" /></td></tr>)}</>; }
