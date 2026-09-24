'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  Banknote,
  Calculator,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  Eye,
  FileText,
  Filter,
  History,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';

/* =========================================================
   MEDXVERSE HMO BILLING, PREMIUM & PAYMENT MANAGEMENT

   Backend contract:
   GET    /api/v1/hmo-billing/summary
   GET    /api/v1/hmo-billing/invoices
   POST   /api/v1/hmo-billing/invoices
   GET    /api/v1/hmo-billing/invoices/:id
   PATCH  /api/v1/hmo-billing/invoices/:id
   PATCH  /api/v1/hmo-billing/invoices/:id/status

   GET    /api/v1/hmo-billing/settlements
   POST   /api/v1/hmo-billing/settlements
   POST   /api/v1/hmo-billing/settlements/capitation
   GET    /api/v1/hmo-billing/settlements/:id
   PATCH  /api/v1/hmo-billing/settlements/:id/status

   GET    /api/v1/hmo-billing/payments
   POST   /api/v1/hmo-billing/payments
   GET    /api/v1/hmo-billing/payments/:id
   PATCH  /api/v1/hmo-billing/payments/:id/status

   POST   /api/v1/hmo-billing/reconciliation
   POST   /api/v1/hmo-billing/tariffs/quote

   The normalizers below intentionally tolerate data / items / results
   wrappers so the page remains compatible with the backend response
   envelope used elsewhere in MedXVerse.
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
const BILLING_URL = `${API_BASE_URL}/hmo-billing`;

const TEAL = '#1b7b68';
const SOFT_TEAL = '#e8f5f3';

type Tab = 'overview' | 'invoices' | 'settlements' | 'payments' | 'reconciliation' | 'quote';
type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
type SettlementStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'REJECTED' | 'CANCELLED';
type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REVERSED' | 'CANCELLED';
type SettlementType = 'CAPITATION' | 'FEE_FOR_SERVICE' | 'CLAIM' | 'OTHER';

interface Invoice {
  _id: string;
  invoiceNumber?: string;
  invoiceNo?: string;
  type?: string;
  category?: string;
  payerType?: string;
  payerId?: string;
  payerName?: string;
  enrolleeId?: string;
  providerId?: string;
  providerName?: string;
  description?: string;
  periodStart?: string;
  periodEnd?: string;
  dueDate?: string;
  issuedAt?: string;
  currency?: string;
  subtotal?: number;
  tax?: number;
  discount?: number;
  totalAmount?: number;
  amount?: number;
  paidAmount?: number;
  balance?: number;
  status: InvoiceStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  lineItems?: Array<{ description?: string; quantity?: number; unitAmount?: number; amount?: number }>;
}

interface Settlement {
  _id: string;
  settlementNumber?: string;
  reference?: string;
  settlementType?: SettlementType;
  providerId?: string;
  providerName?: string;
  claimId?: string;
  invoiceId?: string;
  periodStart?: string;
  periodEnd?: string;
  currency?: string;
  grossAmount?: number;
  deductions?: number;
  netAmount?: number;
  amount?: number;
  status: SettlementStatus;
  paymentMethod?: string;
  paidAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  memberCount?: number;
  perMemberRate?: number;
}

interface Payment {
  _id: string;
  paymentNumber?: string;
  reference?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  settlementId?: string;
  payerId?: string;
  payerName?: string;
  payeeId?: string;
  payeeName?: string;
  amount?: number;
  currency?: string;
  method?: string;
  channel?: string;
  transactionReference?: string;
  status: PaymentStatus;
  paidAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Summary {
  totalInvoices?: number;
  outstandingInvoices?: number;
  overdueInvoices?: number;
  invoicedAmount?: number;
  collectedAmount?: number;
  outstandingAmount?: number;
  totalSettlements?: number;
  pendingSettlements?: number;
  settlementAmount?: number;
  totalPayments?: number;
  successfulPayments?: number;
  paymentAmount?: number;
  failedPayments?: number;
  premiumBilled?: number;
  premiumCollected?: number;
  claimsPaid?: number;
  capitationPaid?: number;
  currency?: string;
}

interface QuoteResult {
  tariffId?: string;
  code?: string;
  name?: string;
  unitAmount?: number;
  quantity?: number;
  totalAmount?: number;
  currency?: string;
  requiresPreAuth?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  providerId?: string;
}

interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const EMPTY_INVOICE = {
  invoiceNumber: '', payerType: 'CORPORATE', payerId: '', payerName: '', enrolleeId: '', providerId: '', providerName: '',
  description: '', periodStart: '', periodEnd: '', dueDate: '', currency: 'NGN', subtotal: '', tax: '', discount: '',
  totalAmount: '', notes: '',
};

const EMPTY_SETTLEMENT = {
  settlementType: 'FEE_FOR_SERVICE' as SettlementType, providerId: '', providerName: '', claimId: '', invoiceId: '',
  periodStart: '', periodEnd: '', currency: 'NGN', grossAmount: '', deductions: '', netAmount: '', paymentMethod: '', notes: '',
};

const EMPTY_CAPITATION = {
  providerId: '', providerName: '', periodStart: '', periodEnd: '', currency: 'NGN', memberCount: '', perMemberRate: '', notes: '',
};

const EMPTY_PAYMENT = {
  invoiceId: '', settlementId: '', payerId: '', payerName: '', payeeId: '', payeeName: '', amount: '', currency: 'NGN',
  method: 'BANK_TRANSFER', channel: 'BANK', transactionReference: '', paidAt: '', notes: '',
};

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  for (const key of ['token', 'accessToken', 'access_token', 'authToken', 'jwt']) {
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
    throw new Error(json?.message || json?.error || `Request failed with status ${response.status}`);
  }
  return json as T;
}

function unwrap<T>(json: any): T {
  return (json?.data ?? json?.result ?? json) as T;
}

function listFrom<T>(json: any, keys: string[]): ListResponse<T> {
  const data = json?.data ?? json?.result ?? json;
  const items = keys.reduce<any[]>((found, key) => Array.isArray(found) && found.length ? found : (Array.isArray(data?.[key]) ? data[key] : []), []);
  const finalItems = items.length || Array.isArray(data) ? (Array.isArray(data) ? data : items) : [];
  return {
    items: finalItems as T[],
    total: Number(data?.total ?? json?.total ?? finalItems.length),
    page: Number(data?.page ?? json?.page ?? 1),
    limit: Number(data?.limit ?? json?.limit ?? (finalItems.length || 20)),
    totalPages: Number(data?.totalPages ?? json?.totalPages ?? 1),
  };
}

function money(value?: number, currency = 'NGN') {
  try {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0));
  } catch {
    return `${currency} ${Number(value || 0).toLocaleString()}`;
  }
}

function date(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

function humanize(value?: string) {
  if (!value) return '—';
  return value.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function statusClass(value?: string) {
  switch (value) {
    case 'PAID': case 'SUCCESS': case 'APPROVED': case 'ISSUED': return 'border-emerald-100 bg-emerald-50 text-emerald-700';
    case 'PENDING': case 'PROCESSING': case 'PARTIALLY_PAID': return 'border-amber-100 bg-amber-50 text-amber-700';
    case 'OVERDUE': case 'FAILED': case 'REJECTED': return 'border-rose-100 bg-rose-50 text-rose-700';
    case 'CANCELLED': case 'REVERSED': return 'border-slate-200 bg-slate-100 text-slate-600';
    default: return 'border-purple-100 bg-purple-50 text-purple-700';
  }
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{label}</span>{children}</label>;
}

const inputClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#1b7b68]/50 focus:ring-2 focus:ring-[#1b7b68]/10';
const textareaClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#1b7b68]/50 focus:ring-2 focus:ring-[#1b7b68]/10';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-slate-50 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4"><h2 className="text-base font-black text-slate-800">{title}</h2><button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button></div>
      <div className="max-h-[calc(92vh-64px)] overflow-y-auto">{children}</div>
    </div>
  </div>;
}

function StatusBadge({ value }: { value?: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide ${statusClass(value)}`}>{humanize(value)}</span>;
}

export default function HMOBillingPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [summary, setSummary] = useState<Summary>({});
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [invoicePages, setInvoicePages] = useState(1);
  const [settlementPages, setSettlementPages] = useState(1);
  const [paymentPages, setPaymentPages] = useState(1);
  const [modal, setModal] = useState<'invoice' | 'settlement' | 'capitation' | 'payment' | 'details' | 'quote' | 'reconcile' | null>(null);
  const [details, setDetails] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [invoiceForm, setInvoiceForm] = useState(EMPTY_INVOICE);
  const [settlementForm, setSettlementForm] = useState(EMPTY_SETTLEMENT);
  const [capitationForm, setCapitationForm] = useState(EMPTY_CAPITATION);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT);
  const [quoteForm, setQuoteForm] = useState({ tariffId: '', providerId: '', quantity: '1', date: '' });
  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null);
  const [reconcileForm, setReconcileForm] = useState({ reference: '', amount: '', currency: 'NGN', date: '', notes: '' });

  const clearFeedback = () => { setError(''); setSuccess(''); };

  const loadAll = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    clearFeedback();
    try {
      const query = new URLSearchParams({ page: String(page), limit: '12' });
      if (search.trim()) query.set('search', search.trim());
      if (statusFilter) query.set('status', statusFilter);
      const [summaryRes, invoicesRes, settlementsRes, paymentsRes] = await Promise.all([
        fetch(`${BILLING_URL}/summary`, { headers: headers(), cache: 'no-store' }),
        fetch(`${BILLING_URL}/invoices?${query}`, { headers: headers(), cache: 'no-store' }),
        fetch(`${BILLING_URL}/settlements?${query}`, { headers: headers(), cache: 'no-store' }),
        fetch(`${BILLING_URL}/payments?${query}`, { headers: headers(), cache: 'no-store' }),
      ]);
      const [summaryJson, invoicesJson, settlementsJson, paymentsJson] = await Promise.all([
        parseResponse(summaryRes), parseResponse(invoicesRes), parseResponse(settlementsRes), parseResponse(paymentsRes),
      ]);
      setSummary(unwrap<Summary>(summaryJson) || {});
      const i = listFrom<Invoice>(invoicesJson, ['invoices', 'items', 'results']);
      const s = listFrom<Settlement>(settlementsJson, ['settlements', 'items', 'results']);
      const p = listFrom<Payment>(paymentsJson, ['payments', 'items', 'results']);
      setInvoices(i.items); setInvoicePages(i.totalPages || 1);
      setSettlements(s.items); setSettlementPages(s.totalPages || 1);
      setPayments(p.items); setPaymentPages(p.totalPages || 1);
    } catch (err: any) {
      setError(err?.message || 'Unable to load HMO billing data.');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { const t = window.setTimeout(() => void loadAll(), 250); return () => window.clearTimeout(t); }, [loadAll]);

  const openCreateInvoice = () => { clearFeedback(); setInvoiceForm(EMPTY_INVOICE); setModal('invoice'); };
  const openCreateSettlement = () => { clearFeedback(); setSettlementForm(EMPTY_SETTLEMENT); setModal('settlement'); };
  const openCreateCapitation = () => { clearFeedback(); setCapitationForm(EMPTY_CAPITATION); setModal('capitation'); };
  const openCreatePayment = () => { clearFeedback(); setPaymentForm(EMPTY_PAYMENT); setModal('payment'); };
  const openQuote = () => { clearFeedback(); setQuoteForm({ tariffId: '', providerId: '', quantity: '1', date: '' }); setQuoteResult(null); setModal('quote'); };

  const createInvoice = async () => {
    if (!invoiceForm.description.trim() && !invoiceForm.payerName.trim()) return setError('Provide an invoice description or payer name.');
    setSaving(true); clearFeedback();
    try {
      const payload = {
        invoiceNumber: invoiceForm.invoiceNumber.trim() || undefined,
        payerType: invoiceForm.payerType,
        payerId: invoiceForm.payerId.trim() || undefined,
        payerName: invoiceForm.payerName.trim() || undefined,
        enrolleeId: invoiceForm.enrolleeId.trim() || undefined,
        providerId: invoiceForm.providerId.trim() || undefined,
        providerName: invoiceForm.providerName.trim() || undefined,
        description: invoiceForm.description.trim() || undefined,
        periodStart: invoiceForm.periodStart || undefined,
        periodEnd: invoiceForm.periodEnd || undefined,
        dueDate: invoiceForm.dueDate || undefined,
        currency: invoiceForm.currency.toUpperCase(),
        subtotal: invoiceForm.subtotal === '' ? undefined : Number(invoiceForm.subtotal),
        tax: invoiceForm.tax === '' ? undefined : Number(invoiceForm.tax),
        discount: invoiceForm.discount === '' ? undefined : Number(invoiceForm.discount),
        totalAmount: invoiceForm.totalAmount === '' ? undefined : Number(invoiceForm.totalAmount),
        notes: invoiceForm.notes.trim() || undefined,
      };
      await parseResponse(await fetch(`${BILLING_URL}/invoices`, { method: 'POST', headers: headers(), body: JSON.stringify(payload) }));
      setModal(null); setSuccess('Invoice created successfully.'); await loadAll(true);
    } catch (err: any) { setError(err?.message || 'Unable to create invoice.'); } finally { setSaving(false); }
  };

  const createSettlement = async (capitation = false) => {
    setSaving(true); clearFeedback();
    try {
      const payload = capitation ? {
        providerId: capitationForm.providerId.trim(), providerName: capitationForm.providerName.trim() || undefined,
        periodStart: capitationForm.periodStart || undefined, periodEnd: capitationForm.periodEnd || undefined,
        currency: capitationForm.currency.toUpperCase(), memberCount: Number(capitationForm.memberCount),
        perMemberRate: Number(capitationForm.perMemberRate), notes: capitationForm.notes.trim() || undefined,
      } : {
        settlementType: settlementForm.settlementType,
        providerId: settlementForm.providerId.trim() || undefined, providerName: settlementForm.providerName.trim() || undefined,
        claimId: settlementForm.claimId.trim() || undefined, invoiceId: settlementForm.invoiceId.trim() || undefined,
        periodStart: settlementForm.periodStart || undefined, periodEnd: settlementForm.periodEnd || undefined,
        currency: settlementForm.currency.toUpperCase(), grossAmount: Number(settlementForm.grossAmount),
        deductions: settlementForm.deductions === '' ? undefined : Number(settlementForm.deductions),
        netAmount: settlementForm.netAmount === '' ? undefined : Number(settlementForm.netAmount),
        paymentMethod: settlementForm.paymentMethod.trim() || undefined, notes: settlementForm.notes.trim() || undefined,
      };
      const endpoint = capitation ? `${BILLING_URL}/settlements/capitation` : `${BILLING_URL}/settlements`;
      await parseResponse(await fetch(endpoint, { method: 'POST', headers: headers(), body: JSON.stringify(payload) }));
      setModal(null); setSuccess(capitation ? 'Capitation settlement created.' : 'Settlement created successfully.'); await loadAll(true);
    } catch (err: any) { setError(err?.message || 'Unable to create settlement.'); } finally { setSaving(false); }
  };

  const createPayment = async () => {
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) return setError('Payment amount must be greater than zero.');
    setSaving(true); clearFeedback();
    try {
      const payload = {
        invoiceId: paymentForm.invoiceId.trim() || undefined, settlementId: paymentForm.settlementId.trim() || undefined,
        payerId: paymentForm.payerId.trim() || undefined, payerName: paymentForm.payerName.trim() || undefined,
        payeeId: paymentForm.payeeId.trim() || undefined, payeeName: paymentForm.payeeName.trim() || undefined,
        amount: Number(paymentForm.amount), currency: paymentForm.currency.toUpperCase(), method: paymentForm.method,
        channel: paymentForm.channel, transactionReference: paymentForm.transactionReference.trim() || undefined,
        paidAt: paymentForm.paidAt || undefined, notes: paymentForm.notes.trim() || undefined,
      };
      await parseResponse(await fetch(`${BILLING_URL}/payments`, { method: 'POST', headers: headers(), body: JSON.stringify(payload) }));
      setModal(null); setSuccess('Payment recorded successfully.'); await loadAll(true);
    } catch (err: any) { setError(err?.message || 'Unable to record payment.'); } finally { setSaving(false); }
  };

  const changeStatus = async (kind: 'invoice' | 'settlement' | 'payment', id: string, status: string) => {
    setWorkingId(id); clearFeedback();
    try {
      await parseResponse(await fetch(`${BILLING_URL}/${kind === 'invoice' ? 'invoices' : kind === 'settlement' ? 'settlements' : 'payments'}/${id}/status`, {
        method: 'PATCH', headers: headers(), body: JSON.stringify({ status }),
      }));
      setSuccess(`${humanize(kind)} status changed to ${humanize(status)}.`); await loadAll(true);
    } catch (err: any) { setError(err?.message || 'Unable to update status.'); } finally { setWorkingId(null); }
  };

  const openDetails = async (kind: 'invoice' | 'settlement' | 'payment', id: string) => {
    clearFeedback(); setDetails(null); setModal('details');
    try {
      const endpoint = kind === 'invoice' ? 'invoices' : kind === 'settlement' ? 'settlements' : 'payments';
      const json = await parseResponse(await fetch(`${BILLING_URL}/${endpoint}/${id}`, { headers: headers(), cache: 'no-store' }));
      setDetails({ kind, value: unwrap<any>(json) });
    } catch (err: any) { setError(err?.message || 'Unable to load record details.'); }
  };

  const runQuote = async () => {
    if (!quoteForm.tariffId.trim()) return setError('Tariff ID is required.');
    const quantity = Number(quoteForm.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) return setError('Quantity must be greater than zero.');
    setSaving(true); clearFeedback();
    try {
      const json = await parseResponse(await fetch(`${BILLING_URL}/tariffs/quote`, {
        method: 'POST', headers: headers(), body: JSON.stringify({ tariffId: quoteForm.tariffId.trim(), providerId: quoteForm.providerId.trim() || undefined, quantity, date: quoteForm.date || undefined }),
      }));
      setQuoteResult(unwrap<QuoteResult>(json));
    } catch (err: any) { setError(err?.message || 'Unable to calculate tariff quote.'); } finally { setSaving(false); }
  };

  const reconcile = async () => {
    setSaving(true); clearFeedback();
    try {
      await parseResponse(await fetch(`${BILLING_URL}/reconciliation`, { method: 'POST', headers: headers(), body: JSON.stringify({ reference: reconcileForm.reference.trim(), amount: Number(reconcileForm.amount), currency: reconcileForm.currency.toUpperCase(), date: reconcileForm.date || undefined, notes: reconcileForm.notes.trim() || undefined }) }));
      setModal(null); setSuccess('Reconciliation completed successfully.'); await loadAll(true);
    } catch (err: any) { setError(err?.message || 'Unable to complete reconciliation.'); } finally { setSaving(false); }
  };

  const currentRows = tab === 'invoices' ? invoices : tab === 'settlements' ? settlements : payments;
  const totalPages = tab === 'invoices' ? invoicePages : tab === 'settlements' ? settlementPages : paymentPages;

  const kpis = useMemo(() => [
    { label: 'Premium billed', value: summary.premiumBilled ?? summary.invoicedAmount, icon: FileText, sub: 'Invoices raised' },
    { label: 'Premium collected', value: summary.premiumCollected ?? summary.collectedAmount ?? summary.paymentAmount, icon: CreditCard, sub: 'Successful receipts' },
    { label: 'Outstanding', value: summary.outstandingAmount ?? ((summary.invoicedAmount || 0) - (summary.collectedAmount || 0)), icon: Banknote, sub: `${summary.overdueInvoices || 0} overdue invoices` },
    { label: 'Provider settlements', value: summary.settlementAmount, icon: ClipboardCheck, sub: `${summary.pendingSettlements || 0} pending` },
  ], [summary]);

  const tabs: Array<{ id: Tab; label: string; icon: typeof FileText }> = [
    { id: 'overview', label: 'Overview', icon: History },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'settlements', label: 'Settlements', icon: ClipboardCheck },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'reconciliation', label: 'Reconciliation', icon: RotateCcw },
    { id: 'quote', label: 'Tariff Quote', icon: Calculator },
  ];

  return <div className="min-h-screen bg-[#f6f9f8] text-slate-800">
    <div className="mx-auto max-w-[1500px] px-2 py-5 md:px-6 lg:px-0">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1b7b68]">HMO FINANCE</p><h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Billing, Premium & Payment Management</h1><p className="mt-2 max-w-3xl text-sm text-slate-500">Manage premium invoicing, provider settlements, receipts, capitation, reconciliation and tariff-based financial calculations from one workspace.</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={() => void loadAll(true)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-600 hover:border-[#1b7b68]/30">{refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh</button><button onClick={openCreateInvoice} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1b7b68] px-4 text-xs font-extrabold text-white shadow-sm hover:bg-[#166653]"><Plus className="h-4 w-4" /> New invoice</button></div>
      </header>

      {(error || success) && <div className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 text-sm ${error ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}><div className="mt-0.5">{error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}</div><div className="flex-1">{error || success}</div><button onClick={clearFeedback}><X className="h-4 w-4" /></button></div>}

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, sub }) => <div key={label} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-slate-900">{money(value, summary.currency || 'NGN')}</p><p className="mt-1 text-[10px] font-semibold text-slate-400">{sub}</p></div><div className="rounded-2xl bg-[#e8f5f3] p-3 text-[#1b7b68]"><Icon className="h-5 w-5" /></div></div></div>)}
      </div>

      <nav className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-1.5 shadow-sm">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setTab(id); if (id === 'reconciliation' || id === 'quote') clearFeedback(); }} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition ${tab === id ? 'bg-[#1b7b68] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}
      </nav>

      {tab === 'overview' && <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-sm font-black">Financial activity</h2><p className="mt-1 text-[10px] text-slate-400">Current HMO billing workload</p></div><BadgeCheck className="h-5 w-5 text-[#1b7b68]" /></div><div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">{[
          ['Invoices', summary.totalInvoices], ['Overdue', summary.overdueInvoices], ['Payments', summary.successfulPayments ?? summary.totalPayments], ['Settlements', summary.totalSettlements],
        ].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-2 text-xl font-black text-slate-800">{Number(value || 0).toLocaleString()}</p></div>)}</div><div className="mt-5 grid gap-3 md:grid-cols-2"><button onClick={() => setTab('invoices')} className="rounded-2xl border border-slate-100 p-4 text-left hover:border-[#1b7b68]/20"><p className="text-xs font-black">Premium invoicing</p><p className="mt-1 text-[10px] text-slate-400">Create, review and update corporate/member invoices.</p></button><button onClick={() => setTab('settlements')} className="rounded-2xl border border-slate-100 p-4 text-left hover:border-[#1b7b68]/20"><p className="text-xs font-black">Provider settlement</p><p className="mt-1 text-[10px] text-slate-400">Manage fee-for-service and capitation obligations.</p></button></div></section>
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="text-sm font-black">Quick actions</h2><div className="mt-4 space-y-2">{[[FileText, 'Create invoice', openCreateInvoice], [ClipboardCheck, 'Create settlement', openCreateSettlement], [Banknote, 'Record payment', openCreatePayment], [Calculator, 'Calculate tariff quote', openQuote], [RotateCcw, 'Run reconciliation', () => setModal('reconcile')]].map(([Icon, label, action]: any) => <button key={label} onClick={action} className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 p-3 text-left hover:border-[#1b7b68]/20 hover:bg-[#e8f5f3]/30"><span className="rounded-xl bg-slate-50 p-2 text-[#1b7b68]"><Icon className="h-4 w-4" /></span><span className="text-xs font-extrabold text-slate-700">{label}</span><ChevronRight className="ml-auto h-4 w-4 text-slate-300" /></button>)}</div></section>
      </div>}

      {tab === 'reconciliation' && <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"><div className="max-w-2xl"><div className="flex items-center gap-3"><div className="rounded-2xl bg-[#e8f5f3] p-3 text-[#1b7b68]"><RotateCcw className="h-5 w-5" /></div><div><h2 className="text-base font-black">Payment reconciliation</h2><p className="text-[10px] text-slate-400">Match an external bank/payment reference against HMO financial records.</p></div></div><div className="mt-6 grid gap-4 md:grid-cols-2"><Field label="External reference *"><input className={inputClass} value={reconcileForm.reference} onChange={e => setReconcileForm({ ...reconcileForm, reference: e.target.value })} placeholder="BANK-REF-001" /></Field><Field label="Amount *"><input type="number" className={inputClass} value={reconcileForm.amount} onChange={e => setReconcileForm({ ...reconcileForm, amount: e.target.value })} placeholder="0.00" /></Field><Field label="Currency"><input className={inputClass} value={reconcileForm.currency} onChange={e => setReconcileForm({ ...reconcileForm, currency: e.target.value.toUpperCase() })} /></Field><Field label="Transaction date"><input type="date" className={inputClass} value={reconcileForm.date} onChange={e => setReconcileForm({ ...reconcileForm, date: e.target.value })} /></Field><Field label="Notes" className="md:col-span-2"><textarea rows={4} className={textareaClass} value={reconcileForm.notes} onChange={e => setReconcileForm({ ...reconcileForm, notes: e.target.value })} /></Field></div><button onClick={reconcile} disabled={saving} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[#1b7b68] px-5 text-xs font-extrabold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Reconcile transaction</button></div></section>}

      {tab === 'quote' && <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"><div className="max-w-3xl"><div className="flex items-center gap-3"><div className="rounded-2xl bg-[#e8f5f3] p-3 text-[#1b7b68]"><Calculator className="h-5 w-5" /></div><div><h2 className="text-base font-black">Tariff quote</h2><p className="text-[10px] text-slate-400">Use an active tariff and optional provider override to calculate the payable service amount.</p></div></div><div className="mt-6 grid gap-4 md:grid-cols-2"><Field label="Tariff ID *"><input className={inputClass} value={quoteForm.tariffId} onChange={e => setQuoteForm({ ...quoteForm, tariffId: e.target.value })} placeholder="Tariff MongoDB ID" /></Field><Field label="Provider ID"><input className={inputClass} value={quoteForm.providerId} onChange={e => setQuoteForm({ ...quoteForm, providerId: e.target.value })} placeholder="Optional provider ID" /></Field><Field label="Quantity *"><input type="number" min="0.01" step="0.01" className={inputClass} value={quoteForm.quantity} onChange={e => setQuoteForm({ ...quoteForm, quantity: e.target.value })} /></Field><Field label="Service date"><input type="date" className={inputClass} value={quoteForm.date} onChange={e => setQuoteForm({ ...quoteForm, date: e.target.value })} /></Field></div><button onClick={runQuote} disabled={saving} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[#1b7b68] px-5 text-xs font-extrabold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />} Calculate quote</button>{quoteResult && <div className="mt-6 rounded-3xl border border-[#1b7b68]/10 bg-[#e8f5f3]/50 p-5"><p className="text-[9px] font-extrabold uppercase tracking-wider text-[#1b7b68]">Quote result</p><div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4"><div><p className="text-[9px] text-slate-400">Tariff</p><p className="mt-1 text-xs font-black">{quoteResult.code || quoteResult.name || quoteResult.tariffId || '—'}</p></div><div><p className="text-[9px] text-slate-400">Unit amount</p><p className="mt-1 text-xs font-black">{money(quoteResult.unitAmount, quoteResult.currency || 'NGN')}</p></div><div><p className="text-[9px] text-slate-400">Quantity</p><p className="mt-1 text-xs font-black">{quoteResult.quantity ?? '—'}</p></div><div><p className="text-[9px] text-slate-400">Total</p><p className="mt-1 text-lg font-black text-[#1b7b68]">{money(quoteResult.totalAmount, quoteResult.currency || 'NGN')}</p></div></div></div>}</div></section>}

      {['invoices', 'settlements', 'payments'].includes(tab) && <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between"><div><h2 className="text-sm font-black">{humanize(tab)}</h2><p className="mt-1 text-[10px] text-slate-400">Live records from the HMO billing backend.</p></div><div className="flex flex-wrap gap-2"><div className="relative"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-300" /><input value={search} onChange={e => { setPage(1); setSearch(e.target.value); }} placeholder="Search..." className="h-9 w-52 rounded-xl border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-[#1b7b68]/40" /></div><select value={statusFilter} onChange={e => { setPage(1); setStatusFilter(e.target.value); }} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600"><option value="">All status</option>{(tab === 'invoices' ? ['DRAFT','ISSUED','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED'] : tab === 'settlements' ? ['DRAFT','PENDING','APPROVED','PROCESSING','PAID','REJECTED','CANCELLED'] : ['PENDING','PROCESSING','SUCCESS','FAILED','REVERSED','CANCELLED']).map(s => <option key={s}>{s}</option>)}</select><button onClick={tab === 'invoices' ? openCreateInvoice : tab === 'settlements' ? openCreateSettlement : openCreatePayment} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#1b7b68] px-3 text-xs font-extrabold text-white"><Plus className="h-3.5 w-3.5" /> New</button></div></div>{loading ? <div className="flex h-64 items-center justify-center text-sm text-slate-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead><tr className="border-b border-slate-100 bg-slate-50/70 text-[9px] font-black uppercase tracking-wide text-slate-400">{tab === 'invoices' ? <><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Payer</th><th className="px-4 py-3">Period</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Balance</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></> : tab === 'settlements' ? <><th className="px-4 py-3">Settlement</th><th className="px-4 py-3">Provider</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Period</th><th className="px-4 py-3">Net amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></> : <><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Paid at</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></>}</tr></thead><tbody className="divide-y divide-slate-100">{currentRows.length === 0 ? <tr><td colSpan={7} className="px-4 py-16 text-center text-xs font-semibold text-slate-400">No records found.</td></tr> : currentRows.map((row: any) => tab === 'invoices' ? <tr key={row._id} className="hover:bg-slate-50/60"><td className="px-4 py-3"><p className="text-xs font-black text-slate-800">{row.invoiceNumber || row.invoiceNo || row._id.slice(-8)}</p><p className="mt-1 max-w-[190px] truncate text-[9px] text-slate-400">{row.description || 'HMO invoice'}</p></td><td className="px-4 py-3"><p className="text-xs font-bold">{row.payerName || row.payerId || '—'}</p><p className="text-[9px] text-slate-400">{humanize(row.payerType)}</p></td><td className="px-4 py-3 text-[10px] font-semibold text-slate-500">{date(row.periodStart)} — {date(row.periodEnd)}</td><td className="px-4 py-3 text-xs font-black">{money(row.totalAmount ?? row.amount, row.currency || 'NGN')}</td><td className="px-4 py-3 text-xs font-black text-slate-600">{money(row.balance ?? ((row.totalAmount ?? row.amount ?? 0) - (row.paidAmount ?? 0)), row.currency || 'NGN')}</td><td className="px-4 py-3"><StatusBadge value={row.status} /></td><td className="px-4 py-3"><div className="flex items-center gap-1"><button onClick={() => void openDetails('invoice', row._id)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Eye className="h-3.5 w-3.5" /></button>{row.status !== 'PAID' && row.status !== 'CANCELLED' && <button disabled={workingId === row._id} onClick={() => void changeStatus('invoice', row._id, row.status === 'DRAFT' ? 'ISSUED' : 'PAID')} className="rounded-lg p-2 text-[#1b7b68] hover:bg-[#e8f5f3]">{workingId === row._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}</button>}</div></td></tr> : tab === 'settlements' ? <tr key={row._id} className="hover:bg-slate-50/60"><td className="px-4 py-3"><p className="text-xs font-black">{row.settlementNumber || row.reference || row._id.slice(-8)}</p><p className="text-[9px] text-slate-400">{date(row.createdAt)}</p></td><td className="px-4 py-3 text-xs font-bold">{row.providerName || row.providerId || '—'}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">{humanize(row.settlementType)}</span></td><td className="px-4 py-3 text-[10px] text-slate-500">{date(row.periodStart)} — {date(row.periodEnd)}</td><td className="px-4 py-3 text-xs font-black">{money(row.netAmount ?? row.amount, row.currency || 'NGN')}</td><td className="px-4 py-3"><StatusBadge value={row.status} /></td><td className="px-4 py-3"><div className="flex items-center gap-1"><button onClick={() => void openDetails('settlement', row._id)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><Eye className="h-3.5 w-3.5" /></button>{row.status !== 'PAID' && row.status !== 'CANCELLED' && <button disabled={workingId === row._id} onClick={() => void changeStatus('settlement', row._id, row.status === 'DRAFT' ? 'APPROVED' : 'PAID')} className="rounded-lg p-2 text-[#1b7b68] hover:bg-[#e8f5f3]">{workingId === row._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}</button>}</div></td></tr> : <tr key={row._id} className="hover:bg-slate-50/60"><td className="px-4 py-3"><p className="text-xs font-black">{row.paymentNumber || row._id.slice(-8)}</p><p className="text-[9px] text-slate-400">{date(row.createdAt)}</p></td><td className="px-4 py-3 text-xs font-semibold">{row.transactionReference || row.reference || row.invoiceNumber || '—'}</td><td className="px-4 py-3 text-xs font-black">{money(row.amount, row.currency || 'NGN')}</td><td className="px-4 py-3"><span className="text-[10px] font-bold text-slate-600">{humanize(row.method || row.channel)}</span></td><td className="px-4 py-3 text-[10px] text-slate-500">{date(row.paidAt)}</td><td className="px-4 py-3"><StatusBadge value={row.status} /></td><td className="px-4 py-3"><div className="flex items-center gap-1"><button onClick={() => void openDetails('payment', row._id)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><Eye className="h-3.5 w-3.5" /></button>{row.status === 'PENDING' && <button disabled={workingId === row._id} onClick={() => void changeStatus('payment', row._id, 'SUCCESS')} className="rounded-lg p-2 text-[#1b7b68] hover:bg-[#e8f5f3]">{workingId === row._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}</button>}</div></td></tr>)}</tbody></table></div>}<div className="flex items-center justify-between border-t border-slate-100 px-4 py-3"><p className="text-[10px] font-semibold text-slate-400">Page {page} of {totalPages}</p><div className="flex gap-1"><button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /></button><button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronRight className="h-3.5 w-3.5" /></button></div></div></section>}

      {tab === 'settlements' && <div className="mt-3 flex justify-end gap-2"><button onClick={openCreateCapitation} className="inline-flex items-center gap-2 rounded-xl border border-[#1b7b68]/20 bg-[#e8f5f3] px-4 py-2 text-xs font-extrabold text-[#1b7b68]"><UsersIcon /> Create capitation</button></div>}

      {modal === 'invoice' && <Modal title="Create HMO invoice" onClose={() => setModal(null)}><div className="space-y-5 p-6"><div className="grid gap-4 md:grid-cols-2"><Field label="Invoice number"><input className={inputClass} value={invoiceForm.invoiceNumber} onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })} placeholder="Auto-generate if blank" /></Field><Field label="Payer type"><select className={inputClass} value={invoiceForm.payerType} onChange={e => setInvoiceForm({ ...invoiceForm, payerType: e.target.value })}><option>CORPORATE</option><option>MEMBER</option><option>EMPLOYER</option><option>OTHER</option></select></Field><Field label="Payer ID"><input className={inputClass} value={invoiceForm.payerId} onChange={e => setInvoiceForm({ ...invoiceForm, payerId: e.target.value })} /></Field><Field label="Payer name"><input className={inputClass} value={invoiceForm.payerName} onChange={e => setInvoiceForm({ ...invoiceForm, payerName: e.target.value })} /></Field><Field label="Enrollee ID"><input className={inputClass} value={invoiceForm.enrolleeId} onChange={e => setInvoiceForm({ ...invoiceForm, enrolleeId: e.target.value })} /></Field><Field label="Provider ID"><input className={inputClass} value={invoiceForm.providerId} onChange={e => setInvoiceForm({ ...invoiceForm, providerId: e.target.value })} /></Field><Field label="Provider name"><input className={inputClass} value={invoiceForm.providerName} onChange={e => setInvoiceForm({ ...invoiceForm, providerName: e.target.value })} /></Field><Field label="Currency"><input className={inputClass} value={invoiceForm.currency} onChange={e => setInvoiceForm({ ...invoiceForm, currency: e.target.value.toUpperCase() })} /></Field><Field label="Period start"><input type="date" className={inputClass} value={invoiceForm.periodStart} onChange={e => setInvoiceForm({ ...invoiceForm, periodStart: e.target.value })} /></Field><Field label="Period end"><input type="date" className={inputClass} value={invoiceForm.periodEnd} onChange={e => setInvoiceForm({ ...invoiceForm, periodEnd: e.target.value })} /></Field><Field label="Due date"><input type="date" className={inputClass} value={invoiceForm.dueDate} onChange={e => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} /></Field><Field label="Description"><input className={inputClass} value={invoiceForm.description} onChange={e => setInvoiceForm({ ...invoiceForm, description: e.target.value })} /></Field><Field label="Subtotal"><input type="number" className={inputClass} value={invoiceForm.subtotal} onChange={e => setInvoiceForm({ ...invoiceForm, subtotal: e.target.value })} /></Field><Field label="Tax"><input type="number" className={inputClass} value={invoiceForm.tax} onChange={e => setInvoiceForm({ ...invoiceForm, tax: e.target.value })} /></Field><Field label="Discount"><input type="number" className={inputClass} value={invoiceForm.discount} onChange={e => setInvoiceForm({ ...invoiceForm, discount: e.target.value })} /></Field><Field label="Total amount"><input type="number" className={inputClass} value={invoiceForm.totalAmount} onChange={e => setInvoiceForm({ ...invoiceForm, totalAmount: e.target.value })} /></Field><Field label="Notes" className="md:col-span-2"><textarea rows={3} className={textareaClass} value={invoiceForm.notes} onChange={e => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} /></Field></div><div className="flex justify-end gap-2"><button onClick={() => setModal(null)} className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold">Cancel</button><button onClick={() => void createInvoice()} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1b7b68] px-5 text-xs font-extrabold text-white disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Create invoice</button></div></div></Modal>}

      {modal === 'settlement' && <Modal title="Create provider settlement" onClose={() => setModal(null)}><div className="space-y-5 p-6"><div className="grid gap-4 md:grid-cols-2"><Field label="Settlement type"><select className={inputClass} value={settlementForm.settlementType} onChange={e => setSettlementForm({ ...settlementForm, settlementType: e.target.value as SettlementType })}><option>FEE_FOR_SERVICE</option><option>CLAIM</option><option>OTHER</option></select></Field><Field label="Provider ID"><input className={inputClass} value={settlementForm.providerId} onChange={e => setSettlementForm({ ...settlementForm, providerId: e.target.value })} /></Field><Field label="Provider name"><input className={inputClass} value={settlementForm.providerName} onChange={e => setSettlementForm({ ...settlementForm, providerName: e.target.value })} /></Field><Field label="Claim ID"><input className={inputClass} value={settlementForm.claimId} onChange={e => setSettlementForm({ ...settlementForm, claimId: e.target.value })} /></Field><Field label="Invoice ID"><input className={inputClass} value={settlementForm.invoiceId} onChange={e => setSettlementForm({ ...settlementForm, invoiceId: e.target.value })} /></Field><Field label="Currency"><input className={inputClass} value={settlementForm.currency} onChange={e => setSettlementForm({ ...settlementForm, currency: e.target.value.toUpperCase() })} /></Field><Field label="Period start"><input type="date" className={inputClass} value={settlementForm.periodStart} onChange={e => setSettlementForm({ ...settlementForm, periodStart: e.target.value })} /></Field><Field label="Period end"><input type="date" className={inputClass} value={settlementForm.periodEnd} onChange={e => setSettlementForm({ ...settlementForm, periodEnd: e.target.value })} /></Field><Field label="Gross amount"><input type="number" className={inputClass} value={settlementForm.grossAmount} onChange={e => setSettlementForm({ ...settlementForm, grossAmount: e.target.value })} /></Field><Field label="Deductions"><input type="number" className={inputClass} value={settlementForm.deductions} onChange={e => setSettlementForm({ ...settlementForm, deductions: e.target.value })} /></Field><Field label="Net amount"><input type="number" className={inputClass} value={settlementForm.netAmount} onChange={e => setSettlementForm({ ...settlementForm, netAmount: e.target.value })} /></Field><Field label="Payment method"><input className={inputClass} value={settlementForm.paymentMethod} onChange={e => setSettlementForm({ ...settlementForm, paymentMethod: e.target.value })} placeholder="BANK_TRANSFER" /></Field><Field label="Notes" className="md:col-span-2"><textarea rows={3} className={textareaClass} value={settlementForm.notes} onChange={e => setSettlementForm({ ...settlementForm, notes: e.target.value })} /></Field></div><div className="flex justify-end gap-2"><button onClick={() => setModal(null)} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold">Cancel</button><button onClick={() => void createSettlement(false)} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1b7b68] px-5 text-xs font-extrabold text-white">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Create settlement</button></div></div></Modal>}

      {modal === 'capitation' && <Modal title="Create capitation settlement" onClose={() => setModal(null)}><div className="space-y-5 p-6"><div className="rounded-2xl border border-[#1b7b68]/10 bg-[#e8f5f3] p-4"><p className="text-xs font-black text-[#1b7b68]">Capitation</p><p className="mt-1 text-[10px] text-slate-500">Calculates the settlement from covered member count × agreed per-member rate.</p></div><div className="grid gap-4 md:grid-cols-2"><Field label="Provider ID *"><input className={inputClass} value={capitationForm.providerId} onChange={e => setCapitationForm({ ...capitationForm, providerId: e.target.value })} /></Field><Field label="Provider name"><input className={inputClass} value={capitationForm.providerName} onChange={e => setCapitationForm({ ...capitationForm, providerName: e.target.value })} /></Field><Field label="Period start"><input type="date" className={inputClass} value={capitationForm.periodStart} onChange={e => setCapitationForm({ ...capitationForm, periodStart: e.target.value })} /></Field><Field label="Period end"><input type="date" className={inputClass} value={capitationForm.periodEnd} onChange={e => setCapitationForm({ ...capitationForm, periodEnd: e.target.value })} /></Field><Field label="Member count *"><input type="number" min="0" className={inputClass} value={capitationForm.memberCount} onChange={e => setCapitationForm({ ...capitationForm, memberCount: e.target.value })} /></Field><Field label="Per-member rate *"><input type="number" min="0" step="0.01" className={inputClass} value={capitationForm.perMemberRate} onChange={e => setCapitationForm({ ...capitationForm, perMemberRate: e.target.value })} /></Field><Field label="Currency"><input className={inputClass} value={capitationForm.currency} onChange={e => setCapitationForm({ ...capitationForm, currency: e.target.value.toUpperCase() })} /></Field><Field label="Notes"><input className={inputClass} value={capitationForm.notes} onChange={e => setCapitationForm({ ...capitationForm, notes: e.target.value })} /></Field></div><div className="flex justify-end gap-2"><button onClick={() => setModal(null)} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold">Cancel</button><button onClick={() => void createSettlement(true)} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1b7b68] px-5 text-xs font-extrabold text-white">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Create capitation</button></div></div></Modal>}

      {modal === 'payment' && <Modal title="Record payment" onClose={() => setModal(null)}><div className="space-y-5 p-6"><div className="grid gap-4 md:grid-cols-2"><Field label="Invoice ID"><input className={inputClass} value={paymentForm.invoiceId} onChange={e => setPaymentForm({ ...paymentForm, invoiceId: e.target.value })} /></Field><Field label="Settlement ID"><input className={inputClass} value={paymentForm.settlementId} onChange={e => setPaymentForm({ ...paymentForm, settlementId: e.target.value })} /></Field><Field label="Payer name"><input className={inputClass} value={paymentForm.payerName} onChange={e => setPaymentForm({ ...paymentForm, payerName: e.target.value })} /></Field><Field label="Payee name"><input className={inputClass} value={paymentForm.payeeName} onChange={e => setPaymentForm({ ...paymentForm, payeeName: e.target.value })} /></Field><Field label="Amount *"><input type="number" min="0" step="0.01" className={inputClass} value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} /></Field><Field label="Currency"><input className={inputClass} value={paymentForm.currency} onChange={e => setPaymentForm({ ...paymentForm, currency: e.target.value.toUpperCase() })} /></Field><Field label="Method"><select className={inputClass} value={paymentForm.method} onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}><option>BANK_TRANSFER</option><option>CARD</option><option>USSD</option><option>CASH</option><option>DIRECT_DEBIT</option><option>OTHER</option></select></Field><Field label="Channel"><input className={inputClass} value={paymentForm.channel} onChange={e => setPaymentForm({ ...paymentForm, channel: e.target.value })} placeholder="BANK" /></Field><Field label="Transaction reference"><input className={inputClass} value={paymentForm.transactionReference} onChange={e => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })} /></Field><Field label="Paid at"><input type="datetime-local" className={inputClass} value={paymentForm.paidAt} onChange={e => setPaymentForm({ ...paymentForm, paidAt: e.target.value })} /></Field><Field label="Notes" className="md:col-span-2"><textarea rows={3} className={textareaClass} value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} /></Field></div><div className="flex justify-end gap-2"><button onClick={() => setModal(null)} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold">Cancel</button><button onClick={() => void createPayment()} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1b7b68] px-5 text-xs font-extrabold text-white">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Record payment</button></div></div></Modal>}

      {modal === 'details' && <Modal title={`${humanize(details?.kind)} details`} onClose={() => setModal(null)}><div className="p-6">{!details ? <div className="flex h-40 items-center justify-center text-sm text-slate-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</div> : <div className="space-y-4">{Object.entries(details.value || {}).filter(([key]) => !['__v', 'lineItems'].includes(key)).map(([key, value]) => <div key={key} className="flex items-start justify-between gap-6 rounded-xl bg-slate-50 p-3"><span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{humanize(key)}</span><span className="max-w-[60%] text-right text-xs font-bold text-slate-700">{typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '—')}</span></div>)}</div>}</div></Modal>}

      {modal === 'quote' && tab !== 'quote' && <Modal title="Calculate tariff quote" onClose={() => setModal(null)}><div className="space-y-5 p-6"><p className="text-xs text-slate-500">Use this quick action to quote a tariff without leaving the billing page.</p><div className="grid gap-4 md:grid-cols-2"><Field label="Tariff ID *"><input className={inputClass} value={quoteForm.tariffId} onChange={e => setQuoteForm({ ...quoteForm, tariffId: e.target.value })} /></Field><Field label="Provider ID"><input className={inputClass} value={quoteForm.providerId} onChange={e => setQuoteForm({ ...quoteForm, providerId: e.target.value })} /></Field><Field label="Quantity *"><input type="number" className={inputClass} value={quoteForm.quantity} onChange={e => setQuoteForm({ ...quoteForm, quantity: e.target.value })} /></Field><Field label="Date"><input type="date" className={inputClass} value={quoteForm.date} onChange={e => setQuoteForm({ ...quoteForm, date: e.target.value })} /></Field></div>{quoteResult && <div className="rounded-2xl bg-[#e8f5f3] p-4 text-sm font-black text-[#1b7b68]">Total: {money(quoteResult.totalAmount, quoteResult.currency || 'NGN')}</div>}<div className="flex justify-end"><button onClick={() => void runQuote()} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1b7b68] px-5 text-xs font-extrabold text-white">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Quote</button></div></div></Modal>}

      {modal === 'reconcile' && tab !== 'reconciliation' && <Modal title="Run reconciliation" onClose={() => setModal(null)}><div className="space-y-5 p-6"><p className="text-xs text-slate-500">Submit an external transaction reference and amount for backend reconciliation.</p><div className="grid gap-4 md:grid-cols-2"><Field label="Reference *"><input className={inputClass} value={reconcileForm.reference} onChange={e => setReconcileForm({ ...reconcileForm, reference: e.target.value })} /></Field><Field label="Amount *"><input type="number" className={inputClass} value={reconcileForm.amount} onChange={e => setReconcileForm({ ...reconcileForm, amount: e.target.value })} /></Field><Field label="Currency"><input className={inputClass} value={reconcileForm.currency} onChange={e => setReconcileForm({ ...reconcileForm, currency: e.target.value.toUpperCase() })} /></Field><Field label="Date"><input type="date" className={inputClass} value={reconcileForm.date} onChange={e => setReconcileForm({ ...reconcileForm, date: e.target.value })} /></Field></div><div className="flex justify-end"><button onClick={() => void reconcile()} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1b7b68] px-5 text-xs font-extrabold text-white">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Reconcile</button></div></div></Modal>}
    </div>
  </div>;
}

function UsersIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
