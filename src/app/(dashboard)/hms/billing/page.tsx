'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertCircle,
  ArrowDownToLine,
  Banknote,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileCheck2,
  FileText,
  Loader2,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Tags,
  Pencil,
  History,
  Power,
  SlidersHorizontal,
  User,
  WalletCards,
  X,
} from 'lucide-react';

import { PatientApiService } from '@/services/patient.service';

/* ========================================================================== */
/* TYPES                                                                      */
/* ========================================================================== */

type TabId =
  | 'overview'
  | 'charges'
  | 'payments'
  | 'catalogue'
  | 'refunds'
  | 'plans';

type Patient = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  mrn?: string;
};

type PatientRef =
  | string
  | Patient
  | null
  | undefined;

type Charge = {
  _id: string;
  patientId?: PatientRef;
  billingAccountId?: string;
  serviceCode?: string;
  description?: string;
  category?: string;
  sourceModule?: string;
  departmentName?: string;
  quantity?: number;
  cataloguePrice?: number;
  catalogueVersion?: number;
  unitPrice?: number;
  grossAmount?: number;
  discountAmount?: number;
  taxAmount?: number;
  netAmount?: number;
  amountPaid?: number;
  status?: string;
  currency?: string;
  chargeDate?: string;
  notes?: string;
};

type Payment = {
  _id: string;
  patientId?: PatientRef;
  billingAccountId?: string;
  receiptNumber?: string;
  amount?: number;
  method?: string;
  status?: string;
  reference?: string;
  provider?: string;
  providerTransactionId?: string;
  paidAt?: string;
  reconciliationStatus?: string;
  refundedAmount?: number;
  notes?: string;
};

type CatalogueItem = {
  _id: string;
  code: string;
  name: string;
  category?: string;
  departmentId?: string;
  departmentName?: string;
  price: number;
  currency?: string;
  version?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive?: boolean;
  description?: string;
};

type Refund = {
  _id: string;
  paymentId?: string;
  patientId?: PatientRef;
  amount?: number;
  reason?: string;
  status?: string;
  requestedAt?: string;
  approvedAt?: string;
  completedAt?: string;
  rejectionReason?: string;
};

type PaymentPlan = {
  _id: string;
  patientId?: PatientRef;
  billingAccountId?: string;
  totalAmount?: number;
  installmentAmount?: number;
  frequency?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  installments?: Array<{
    dueDate?: string;
    amount?: number;
    paidAmount?: number;
    status?: string;
  }>;
  notes?: string;
};

type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
};

type BillingSummary = {
  totalCharges?: number;
  totalPayments?: number;
  outstandingBalance?: number;
  totalDiscounts?: number;
  totalTax?: number;
  totalRefunds?: number;
};

/* ========================================================================== */
/* CONSTANTS                                                                  */
/* ========================================================================== */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://medxverse-backend.onrender.com';

/* ========================================================================== */
/* HELPERS                                                                    */
/* ========================================================================== */

const formatLabel = (
  value?: string | null
) =>
  !value
    ? 'N/A'
    : value
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());

const formatMoney = (
  value?: number | string | null,
  currency = 'NGN'
) => {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return '₦0.00';
  }

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (
  value?: string | null
) => {
  if (!value) return 'N/A';

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return 'N/A';
  }

  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatDateTime = (
  value?: string | null
) => {
  if (!value) return 'N/A';

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return 'N/A';
  }

  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getPatientName = (
  patient?: PatientRef
) => {
  if (!patient) {
    return 'Unknown patient';
  }

  if (typeof patient === 'string') {
    return patient;
  }

  return (
    `${patient.firstName || ''} ${
      patient.lastName || ''
    }`.trim() || 'Unknown patient'
  );
};

const getPatientMeta = (
  patient?: PatientRef
) => {
  if (
    !patient ||
    typeof patient === 'string'
  ) {
    return '';
  }

  return patient.mrn
    ? `MRN: ${patient.mrn}`
    : '';
};

const statusClasses = (
  status?: string
) => {
  switch (
    (status || '').toUpperCase()
  ) {
    case 'PAID':
    case 'CONFIRMED':
    case 'COMPLETED':
    case 'APPROVED':
    case 'RECONCILED':
    case 'ACTIVE':
    case 'POSTED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';

    case 'PARTIALLY_PAID':
    case 'PARTIALLY_REFUNDED':
    case 'PENDING':
    case 'UNRECONCILED':
      return 'bg-amber-50 text-amber-700 border-amber-200';

    case 'VOIDED':
    case 'REJECTED':
    case 'CANCELLED':
    case 'FAILED':
    case 'CLOSED':
      return 'bg-rose-50 text-rose-700 border-rose-200';

    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
};

const unwrap = <T,>(
  json: any
): T =>
  (json?.data ?? json) as T;

const emptyPage = <T,>(): PageResult<T> => ({
  items: [],
  total: 0,
  page: 1,
  totalPages: 1,
});

/* ========================================================================== */
/* SHARED UI                                                                  */
/* ========================================================================== */

function StatusBadge({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${className}`}
    >
      {children}
    </span>
  );
}

function SectionCard({
  title,
  subtitle,
  icon,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-9 h-9 rounded-xl bg-[#1b7b68]/10 text-[#1b7b68] flex items-center justify-center">
              {icon}
            </div>
          )}

          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {title}
            </h2>

            {subtitle && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {action}
      </div>

      <div className="p-5">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
        {label}
      </p>

      <div className="text-sm font-semibold text-slate-800">
        {value ?? 'N/A'}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1.5">
        {label} {required && '*'}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{
    value: string;
    label: string;
  }>;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1.5">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68] bg-white"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  width = 'max-w-lg',
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`bg-white w-full ${width} rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col`}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {title}
            </h2>

            {subtitle && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

function ModalActions({
  onCancel,
  onSubmit,
  submitting,
  submitLabel,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  return (
    <div className="flex items-center justify-end gap-2 pt-5 border-t border-slate-100 mt-5">
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        Cancel
      </button>

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="px-4 py-2.5 rounded-xl bg-[#1b7b68] text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50"
      >
        {submitting && (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        )}

        {submitLabel}
      </button>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
      <p className="text-[10px] text-slate-400">
        Page {page} of {Math.max(1, totalPages)}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={page <= 1}
          className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={page >= totalPages}
          className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* PATIENT SELECTOR                                                           */
/* ========================================================================== */

function PatientSelector({
  label,
  required = false,
  selectedPatient,
  onOpen,
  onChange,
}: {
  label: string;
  required?: boolean;
  selectedPatient: Patient | null;
  onOpen: () => void;
  onChange: () => void;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1.5">
        {label} {required && '*'}
      </label>

      {selectedPatient ? (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#1b7b68]/20 bg-[#1b7b68]/5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 text-[#1b7b68] flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">
                {selectedPatient.firstName || ''}{' '}
                {selectedPatient.lastName || ''}
              </p>

              <p className="text-[10px] text-slate-400 mt-0.5">
                {selectedPatient.mrn
                  ? `MRN: ${selectedPatient.mrn}`
                  : 'No MRN'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onChange}
            className="text-[10px] font-bold text-[#1b7b68] hover:underline shrink-0"
          >
            Change
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-left flex items-center gap-3 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center shrink-0">
            <Search className="w-3.5 h-3.5" />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-700">
              Search for patient
            </p>

            <p className="text-[10px] text-slate-400 mt-0.5">
              Search by patient name or MRN
            </p>
          </div>
        </button>
      )}
    </div>
  );
}

/* ========================================================================== */
/* PAGE                                                                       */
/* ========================================================================== */

export default function BillingPage() {
  const [activeTab, setActiveTab] =
    useState<TabId>('overview');

  const [charges, setCharges] =
    useState<Charge[]>([]);

  const [payments, setPayments] =
    useState<Payment[]>([]);

  const [catalogue, setCatalogue] =
    useState<CatalogueItem[]>([]);

  const [refunds, setRefunds] =
    useState<Refund[]>([]);

  const [plans, setPlans] =
    useState<PaymentPlan[]>([]);

  const [chargesMeta, setChargesMeta] =
    useState<PageResult<Charge>>(
      emptyPage()
    );

  const [paymentsMeta, setPaymentsMeta] =
    useState<PageResult<Payment>>(
      emptyPage()
    );

  const [catalogueMeta, setCatalogueMeta] =
    useState<PageResult<CatalogueItem>>(
      emptyPage()
    );

  const [catalogueDepartmentFilter, setCatalogueDepartmentFilter] =
    useState('');
  const [catalogueStatusFilter, setCatalogueStatusFilter] =
    useState('ACTIVE');
  const [catalogueCategoryFilter, setCatalogueCategoryFilter] =
    useState('');

  const [selectedCatalogue, setSelectedCatalogue] =
    useState<CatalogueItem | null>(null);
  const [showCatalogueEditModal, setShowCatalogueEditModal] =
    useState(false);
  const [showCatalogueHistoryModal, setShowCatalogueHistoryModal] =
    useState(false);
  const [catalogueHistory, setCatalogueHistory] =
    useState<any[]>([]);
  const [loadingCatalogueHistory, setLoadingCatalogueHistory] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [summary, setSummary] =
    useState<BillingSummary>({});

  const [chargePage, setChargePage] =
    useState(1);

  const [paymentPage, setPaymentPage] =
    useState(1);

  const [cataloguePage, setCataloguePage] =
    useState(1);

  const [chargeSearch, setChargeSearch] =
    useState('');

  const [paymentSearch, setPaymentSearch] =
    useState('');

  const [catalogueSearch, setCatalogueSearch] =
    useState('');

  const [showChargeModal, setShowChargeModal] =
    useState(false);

  const [showPaymentModal, setShowPaymentModal] =
    useState(false);

  const [showCatalogueModal, setShowCatalogueModal] =
    useState(false);

  const [showRefundModal, setShowRefundModal] =
    useState(false);

  const [showPlanModal, setShowPlanModal] =
    useState(false);

  /* ------------------------------------------------------------------------ */
  /* PATIENT SEARCH                                                           */
  /* ------------------------------------------------------------------------ */

  const [patientSearch, setPatientSearch] =
    useState('');

  const [patients, setPatients] =
    useState<Patient[]>([]);

  const [loadingPatients, setLoadingPatients] =
    useState(false);

  const [patientSearchContext, setPatientSearchContext] =
    useState<
      'charge' | 'payment' | 'plan' | null
    >(null);

  const [selectedChargePatient, setSelectedChargePatient] =
    useState<Patient | null>(null);

  const [selectedPaymentPatient, setSelectedPaymentPatient] =
    useState<Patient | null>(null);

  const [selectedPlanPatient, setSelectedPlanPatient] =
    useState<Patient | null>(null);

  const [chargeForm, setChargeForm] =
    useState({
      patientId: '',
      serviceCode: '',
      description: '',
      category: 'MISCELLANEOUS',
      departmentName: '',
      quantity: '1',
      unitPrice: '',
      discountAmount: '0',
      taxAmount: '0',
      notes: '',
    });

  const [paymentForm, setPaymentForm] =
    useState({
      patientId: '',
      billingAccountId: '',
      amount: '',
      method: 'CASH',
      reference: '',
      provider: '',
      providerTransactionId: '',
      notes: '',
      paidAt: '',
    });

  const [catalogueForm, setCatalogueForm] =
    useState({
      code: '',
      name: '',
      category: 'MISCELLANEOUS',
      departmentName: '',
      price: '',
      currency: 'NGN',
      effectiveFrom: '',
      effectiveTo: '',
      description: '',
    });

  const [refundForm, setRefundForm] =
    useState({
      paymentId: '',
      amount: '',
      reason: '',
    });

  const [planForm, setPlanForm] =
    useState({
      patientId: '',
      billingAccountId: '',
      totalAmount: '',
      installmentAmount: '',
      frequency: 'MONTHLY',
      startDate: '',
      endDate: '',
      notes: '',
    });

  /* ------------------------------------------------------------------------ */
  /* AUTH / REQUEST                                                           */
  /* ------------------------------------------------------------------------ */

  const getAuthHeaders =
    useCallback((): HeadersInit => {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('token')
          : null;

      return {
        'Content-Type': 'application/json',
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      };
    }, []);

  const request = useCallback(
    async <T,>(
      path: string,
      options: RequestInit = {}
    ): Promise<T> => {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/billing${path}`,
        {
          ...options,
          headers: {
            ...getAuthHeaders(),
            ...(options.headers || {}),
          },
        }
      );

      const json =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          json?.message ||
            json?.error ||
            'Billing request failed.'
        );
      }

      return unwrap<T>(json);
    },
    [getAuthHeaders]
  );

  /* ------------------------------------------------------------------------ */
  /* PATIENT SEARCH                                                           */
  /* ------------------------------------------------------------------------ */

  const searchPatients = useCallback(
    async (queryTerm: string = '') => {
      try {
        setLoadingPatients(true);

        const response =
          await PatientApiService.getPatients({
            search: queryTerm,
            limit: 10,
          });

        setPatients(
          (response?.patients || []) as Patient[]
        );
      } catch (err) {
        console.error(
          'Failed to search patients:',
          err
        );

        setPatients([]);
      } finally {
        setLoadingPatients(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!patientSearchContext) {
      return;
    }

    const timer = setTimeout(() => {
      searchPatients(patientSearch);
    }, 300);

    return () =>
      clearTimeout(timer);
  }, [
    patientSearch,
    patientSearchContext,
    searchPatients,
  ]);

  const openPatientSearch = (
    context:
      | 'charge'
      | 'payment'
      | 'plan'
  ) => {
    setPatientSearchContext(context);
    setPatientSearch('');
    setPatients([]);
  };

  const closePatientSearch = () => {
    setPatientSearchContext(null);
    setPatientSearch('');
    setPatients([]);
  };

  const selectPatient = (
    patient: Patient
  ) => {
    if (!patient._id) {
      return;
    }

    if (
      patientSearchContext === 'charge'
    ) {
      setSelectedChargePatient(patient);

      setChargeForm((previous) => ({
        ...previous,
        patientId: patient._id || '',
      }));
    }

    if (
      patientSearchContext === 'payment'
    ) {
      setSelectedPaymentPatient(patient);

      setPaymentForm((previous) => ({
        ...previous,
        patientId: patient._id || '',
      }));
    }

    if (
      patientSearchContext === 'plan'
    ) {
      setSelectedPlanPatient(patient);

      setPlanForm((previous) => ({
        ...previous,
        patientId: patient._id || '',
      }));
    }

    closePatientSearch();
  };

  /* ------------------------------------------------------------------------ */
  /* DATA LOADING                                                             */
  /* ------------------------------------------------------------------------ */

  const loadOverviewExtras =
    useCallback(async () => {
      const [
        refundResult,
        planResult,
      ] = await Promise.all([
        request<PageResult<Refund>>(
          '/refunds?page=1&limit=12'
        ).catch(() =>
          emptyPage<Refund>()
        ),

        request<PageResult<PaymentPlan>>(
          '/payment-plans?page=1&limit=12'
        ).catch(() =>
          emptyPage<PaymentPlan>()
        ),
      ]);

      const rp = Array.isArray(
        (refundResult as any)?.items
      )
        ? (refundResult as PageResult<Refund>)
        : emptyPage<Refund>();

      const pp = Array.isArray(
        (planResult as any)?.items
      )
        ? (planResult as PageResult<PaymentPlan>)
        : emptyPage<PaymentPlan>();

      setRefunds(rp.items);
      setPlans(pp.items);
    }, [request]);

  const loadData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const [
          chargeResult,
          paymentResult,
          catalogueResult,
        ] = await Promise.all([
          request<PageResult<Charge>>(
            `/charges?page=${chargePage}&limit=12${
              chargeSearch.trim()
                ? `&search=${encodeURIComponent(
                    chargeSearch.trim()
                  )}`
                : ''
            }`
          ),

          request<PageResult<Payment>>(
            `/payments?page=${paymentPage}&limit=12${
              paymentSearch.trim()
                ? `&search=${encodeURIComponent(
                    paymentSearch.trim()
                  )}`
                : ''
            }`
          ),

          request<PageResult<CatalogueItem>>(
            `/catalogue?page=${cataloguePage}&limit=12${
              catalogueSearch.trim()
                ? `&search=${encodeURIComponent(
                    catalogueSearch.trim()
                  )}`
                : ''
            }${
              catalogueCategoryFilter
                ? `&category=${encodeURIComponent(catalogueCategoryFilter)}`
                : ''
            }`
          ),
        ]);

        const c =
          chargeResult ||
          emptyPage<Charge>();

        const p =
          paymentResult ||
          emptyPage<Payment>();

        const ct =
          catalogueResult ||
          emptyPage<CatalogueItem>();

        setChargesMeta(c);
        setPaymentsMeta(p);
        setCatalogueMeta(ct);

        setCharges(c.items || []);
        setPayments(p.items || []);
        setCatalogue(ct.items || []);

        const chargeTotal =
          (c.items || []).reduce(
            (sum, item) =>
              sum +
              Number(item.netAmount || 0),
            0
          );

        const paymentTotal =
          (p.items || []).reduce(
            (sum, item) =>
              sum +
              Number(item.amount || 0),
            0
          );

        setSummary((previous) => ({
          ...previous,
          totalCharges:
            previous.totalCharges ??
            chargeTotal,
          totalPayments:
            previous.totalPayments ??
            paymentTotal,
          outstandingBalance:
            previous.outstandingBalance ??
            Math.max(
              0,
              chargeTotal - paymentTotal
            ),
        }));
      } catch (err: any) {
        setError(
          err?.message ||
            'Failed to load billing information.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      chargePage,
      chargeSearch,
      paymentPage,
      paymentSearch,
      cataloguePage,
      catalogueSearch,
      catalogueCategoryFilter,
      request,
    ]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadOverviewExtras();
  }, [loadOverviewExtras]);

  /* ------------------------------------------------------------------------ */
  /* SUMMARY                                                                  */
  /* ------------------------------------------------------------------------ */

  const computedSummary = useMemo(() => {
    const chargeTotal =
      charges.reduce(
        (sum, item) =>
          sum +
          Number(item.netAmount || 0),
        0
      );

    const paymentTotal =
      payments.reduce(
        (sum, item) =>
          sum +
          Number(item.amount || 0),
        0
      );

    const refundTotal =
      refunds.reduce(
        (sum, item) =>
          sum +
          Number(item.amount || 0),
        0
      );

    return {
      totalCharges:
        summary.totalCharges ??
        chargeTotal,

      totalPayments:
        summary.totalPayments ??
        paymentTotal,

      outstandingBalance:
        summary.outstandingBalance ??
        Math.max(
          0,
          chargeTotal - paymentTotal
        ),

      totalRefunds:
        summary.totalRefunds ??
        refundTotal,
    };
  }, [
    charges,
    payments,
    refunds,
    summary,
  ]);

  const filteredCatalogue = useMemo(() => {
    return catalogue.filter((item) => {
      const matchesDepartment =
        !catalogueDepartmentFilter ||
        (item.departmentName || '').toLowerCase() ===
          catalogueDepartmentFilter.toLowerCase();

      const matchesStatus =
        !catalogueStatusFilter ||
        catalogueStatusFilter === 'ALL' ||
        (catalogueStatusFilter === 'ACTIVE'
          ? item.isActive !== false
          : item.isActive === false);

      return matchesDepartment && matchesStatus;
    });
  }, [
    catalogue,
    catalogueDepartmentFilter,
    catalogueStatusFilter,
  ]);

  const catalogueDepartments = useMemo(() => {
    return Array.from(
      new Set(
        catalogue
          .map((item) => item.departmentName?.trim())
          .filter(Boolean) as string[]
      )
    ).sort();
  }, [catalogue]);

  /* ------------------------------------------------------------------------ */
  /* MUTATIONS                                                                */
  /* ------------------------------------------------------------------------ */

  const runMutation = async (
    path: string,
    method: string,
    body: Record<string, unknown>,
    message: string
  ) => {
    try {
      setSubmitting(true);
      setError(null);

      await request(path, {
        method,
        body: JSON.stringify(body),
      });

      setSuccessMessage(message);

      setTimeout(() => {
        setSuccessMessage(null);
      }, 3500);

      await Promise.all([
        loadData(true),
        loadOverviewExtras(),
      ]);

      return true;
    } catch (err: any) {
      setError(
        err?.message ||
          'The requested action failed.'
      );

      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCharge =
    async () => {
      if (
        !chargeForm.patientId.trim() ||
        !chargeForm.description.trim() ||
        !chargeForm.unitPrice.trim()
      ) {
        setError(
          'Please select a patient, enter a description and enter a unit price.'
        );

        return;
      }

      const ok =
        await runMutation(
          '/charges',
          'POST',
          {
            patientId:
              chargeForm.patientId.trim(),

            description:
              chargeForm.description.trim(),

            category:
              chargeForm.category,

            departmentName:
              chargeForm.departmentName.trim() ||
              undefined,

            quantity:
              Number(
                chargeForm.quantity || 1
              ),

            unitPrice:
              Number(
                chargeForm.unitPrice
              ),

            discountAmount:
              Number(
                chargeForm.discountAmount ||
                  0
              ),

            taxAmount:
              Number(
                chargeForm.taxAmount || 0
              ),

            notes:
              chargeForm.notes.trim() ||
              undefined,
          },
          'Charge posted successfully.'
        );

      if (ok) {
        setShowChargeModal(false);
        setSelectedChargePatient(null);

        setChargeForm({
          patientId: '',
          serviceCode: '',
          description: '',
          category: 'MISCELLANEOUS',
          departmentName: '',
          quantity: '1',
          unitPrice: '',
          discountAmount: '0',
          taxAmount: '0',
          notes: '',
        });
      }
    };

  const handleCreatePayment =
    async () => {
      if (
        !paymentForm.patientId.trim() ||
        !paymentForm.amount.trim()
      ) {
        setError(
          'Please select a patient and enter the payment amount.'
        );

        return;
      }

      const ok =
        await runMutation(
          '/payments',
          'POST',
          {
            patientId:
              paymentForm.patientId.trim(),

            billingAccountId:
              paymentForm.billingAccountId.trim() ||
              undefined,

            amount:
              Number(
                paymentForm.amount
              ),

            method:
              paymentForm.method,

            reference:
              paymentForm.reference.trim() ||
              undefined,

            provider:
              paymentForm.provider.trim() ||
              undefined,

            providerTransactionId:
              paymentForm.providerTransactionId.trim() ||
              undefined,

            notes:
              paymentForm.notes.trim() ||
              undefined,

            paidAt:
              paymentForm.paidAt ||
              undefined,
          },
          'Payment recorded successfully.'
        );

      if (ok) {
        setShowPaymentModal(false);
        setSelectedPaymentPatient(null);

        setPaymentForm({
          patientId: '',
          billingAccountId: '',
          amount: '',
          method: 'CASH',
          reference: '',
          provider: '',
          providerTransactionId: '',
          notes: '',
          paidAt: '',
        });
      }
    };

  const handleCreateCatalogue = async () => {
    const planName = catalogueForm.name.trim();
    const rawPrice = String(catalogueForm.price ?? '').trim();
    const price = Number(rawPrice);
    const effectiveFrom = String(catalogueForm.effectiveFrom ?? '').trim();

    if (!planName) {
      setError('Pricing plan name is required.');
      return;
    }

    if (!rawPrice || !Number.isFinite(price) || price < 0) {
      setError('Please provide a valid price.');
      return;
    }

    if (!effectiveFrom) {
      setError('Effective-from date is required.');
      return;
    }

    const ok = await runMutation(
      '/catalogue',
      'POST',
      {
        // The backend now derives the canonical service code from the
        // selected department. Do not require the administrator to enter it.
        name: planName,
        category: catalogueForm.category,
        departmentName:
          catalogueForm.departmentName.trim() || undefined,
        price,
        currency: catalogueForm.currency,
        effectiveFrom,
        effectiveTo:
          catalogueForm.effectiveTo.trim() || undefined,
        description:
          catalogueForm.description.trim() || undefined,
      },
      'Pricing catalogue item created successfully.'
    );

    if (ok) {
      setShowCatalogueModal(false);

      setCatalogueForm({
        code: '',
        name: '',
        category: 'MISCELLANEOUS',
        departmentName: '',
        price: '',
        currency: 'NGN',
        effectiveFrom: '',
        effectiveTo: '',
        description: '',
      });
    }
  };

  const openCatalogueEdit = (item: CatalogueItem) => {
    setSelectedCatalogue(item);
    setCatalogueForm({
      code: item.code || '',
      name: item.name || '',
      category: item.category || 'MISCELLANEOUS',
      departmentName: item.departmentName || '',
      price: String(item.price ?? ''),
      currency: item.currency || 'NGN',
      effectiveFrom: item.effectiveFrom
        ? new Date(item.effectiveFrom).toISOString().slice(0, 10)
        : '',
      effectiveTo: item.effectiveTo
        ? new Date(item.effectiveTo).toISOString().slice(0, 10)
        : '',
      description: item.description || '',
    });
    setShowCatalogueEditModal(true);
  };

  const handleUpdateCatalogue = async () => {
    if (!selectedCatalogue) return;

    if (
      !catalogueForm.code.trim() ||
      !catalogueForm.name.trim() ||
      !catalogueForm.price.trim() ||
      !catalogueForm.effectiveFrom
    ) {
      setError('Code, pricing plan name, price and effective-from date are required.');
      return;
    }

    const ok = await runMutation(
      `/catalogue/${selectedCatalogue._id}`,
      'PATCH',
      {
        code: catalogueForm.code.trim().toUpperCase(),
        name: catalogueForm.name.trim(),
        category: catalogueForm.category,
        departmentName: catalogueForm.departmentName.trim() || undefined,
        price: Number(catalogueForm.price),
        currency: catalogueForm.currency,
        effectiveFrom: catalogueForm.effectiveFrom,
        effectiveTo: catalogueForm.effectiveTo || undefined,
        description: catalogueForm.description.trim() || undefined,
      },
      'Pricing catalogue updated successfully.'
    );

    if (ok) {
      setShowCatalogueEditModal(false);
      setSelectedCatalogue(null);
    }
  };

  const toggleCatalogueStatus = async (item: CatalogueItem) => {
    await runMutation(
      `/catalogue/${item._id}`,
      'PATCH',
      { isActive: item.isActive === false },
      item.isActive === false
        ? 'Pricing plan activated successfully.'
        : 'Pricing plan deactivated successfully.'
    );
  };

  const openCatalogueHistory = async (item: CatalogueItem) => {
    setSelectedCatalogue(item);
    setShowCatalogueHistoryModal(true);
    setLoadingCatalogueHistory(true);
    setCatalogueHistory([]);

    try {
      const result = await request<any>(
        `/catalogue/${item._id}/history`
      );
      setCatalogueHistory(
        Array.isArray(result?.history)
          ? result.history
          : []
      );
    } catch (err: any) {
      setError(
        err?.message ||
          'Failed to load pricing history.'
      );
    } finally {
      setLoadingCatalogueHistory(false);
    }
  };

  const handleCreateRefund =
    async () => {
      if (
        !refundForm.paymentId.trim() ||
        !refundForm.amount.trim() ||
        !refundForm.reason.trim()
      ) {
        setError(
          'Payment ID, refund amount and reason are required.'
        );

        return;
      }

      const ok =
        await runMutation(
          '/refunds',
          'POST',
          {
            paymentId:
              refundForm.paymentId.trim(),

            amount:
              Number(
                refundForm.amount
              ),

            reason:
              refundForm.reason.trim(),
          },
          'Refund request created successfully.'
        );

      if (ok) {
        setShowRefundModal(false);

        setRefundForm({
          paymentId: '',
          amount: '',
          reason: '',
        });
      }
    };

  const handleCreatePlan =
    async () => {
      if (
        !planForm.patientId.trim() ||
        !planForm.totalAmount.trim() ||
        !planForm.installmentAmount.trim() ||
        !planForm.startDate
      ) {
        setError(
          'Please select a patient, enter the total amount, installment amount and start date.'
        );

        return;
      }

      const ok =
        await runMutation(
          '/payment-plans',
          'POST',
          {
            patientId:
              planForm.patientId.trim(),

            billingAccountId:
              planForm.billingAccountId.trim() ||
              undefined,

            totalAmount:
              Number(
                planForm.totalAmount
              ),

            installmentAmount:
              Number(
                planForm.installmentAmount
              ),

            frequency:
              planForm.frequency,

            startDate:
              planForm.startDate,

            endDate:
              planForm.endDate ||
              undefined,

            notes:
              planForm.notes.trim() ||
              undefined,
          },
          'Payment plan created successfully.'
        );

      if (ok) {
        setShowPlanModal(false);
        setSelectedPlanPatient(null);

        setPlanForm({
          patientId: '',
          billingAccountId: '',
          totalAmount: '',
          installmentAmount: '',
          frequency: 'MONTHLY',
          startDate: '',
          endDate: '',
          notes: '',
        });
      }
    };

  const handleReconcile =
    async (id: string) => {
      await runMutation(
        `/payments/${id}/reconcile`,
        'PATCH',
        {},
        'Payment reconciliation updated successfully.'
      );
    };

  const exportCurrentView = () => {
    const rows =
      activeTab === 'payments'
        ? payments
        : activeTab === 'catalogue'
          ? catalogue
          : activeTab === 'refunds'
            ? refunds
            : activeTab === 'plans'
              ? plans
              : charges;

    const blob = new Blob(
      [
        JSON.stringify(
          {
            generatedAt:
              new Date().toISOString(),
            module:
              'Patient Billing & Charges',
            section: activeTab,
            rows,
          },
          null,
          2
        ),
      ],
      {
        type: 'application/json',
      }
    );

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement('a');

    a.href = url;

    a.download =
      `billing-${activeTab}-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;

    a.click();

    URL.revokeObjectURL(url);
  };

  /* ======================================================================== */
  /* LOADING                                                                   */
  /* ======================================================================== */

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-7 h-7 animate-spin text-[#1b7b68] mx-auto" />

          <p className="text-xs text-slate-400 mt-3">
            Loading billing workspace...
          </p>
        </div>
      </div>
    );
  }

  /* ======================================================================== */
  /* RENDER                                                                    */
  /* ======================================================================== */

  return (
    <div className="p-6 max-w-full mx-auto space-y-6 font-sans pb-12">
      {/* ==================================================================== */}
      {/* HEADER                                                                */}
      {/* ==================================================================== */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#1b7b68]/10 text-[#1b7b68] flex items-center justify-center shrink-0">
            <CircleDollarSign className="w-5 h-5" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Patient Billing
              </h1>

              <StatusBadge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                Centralized Billing
              </StatusBadge>
            </div>

            <p className="text-sm text-slate-500 mt-1">
              Manage patient accounts, charges,
              payments, receipts, refunds and
              service pricing.
            </p>

            <p className="text-[11px] text-slate-400 mt-1">
              Clinical modules use centralized
              service pricing instead of
              hard-coded amounts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={exportCurrentView}
            className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 flex items-center gap-2"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            Export
          </button>

          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                refreshing
                  ? 'animate-spin'
                  : ''
              }`}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={() =>
              setShowPaymentModal(true)
            }
            className="px-3 py-2.5 rounded-xl bg-[#1b7b68] hover:bg-[#176c5c] text-white text-xs font-bold flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Record Payment
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* ALERTS                                                                */}
      {/* ==================================================================== */}

      {(error || successMessage) && (
        <div
          className={`rounded-2xl border p-4 flex items-start gap-3 ${
            error
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          {error ? (
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          )}

          <div className="flex-1">
            <p className="text-xs font-semibold">
              {error || successMessage}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setSuccessMessage(null);
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUMMARY CARDS                                                         */}
      {/* ==================================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: 'Charges',
            value:
              computedSummary.totalCharges,
            icon: FileText,
            bg: 'bg-blue-50',
            text: 'text-blue-600',
            note: 'Posted patient charges',
          },
          {
            label: 'Payments',
            value:
              computedSummary.totalPayments,
            icon: Banknote,
            bg: 'bg-emerald-50',
            text: 'text-emerald-600',
            note: 'Confirmed payments received',
          },
          {
            label: 'Outstanding',
            value:
              computedSummary.outstandingBalance,
            icon: WalletCards,
            bg: 'bg-amber-50',
            text: 'text-amber-600',
            note: 'Balance still owed',
          },
          {
            label: 'Refunds',
            value:
              computedSummary.totalRefunds,
            icon: RotateCcw,
            bg: 'bg-violet-50',
            text: 'text-violet-600',
            note: 'Refund activity',
          },
        ].map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-9 h-9 rounded-xl ${card.bg} ${card.text} flex items-center justify-center`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  {card.label}
                </span>
              </div>

              <h3 className="text-xl font-black text-slate-900">
                {formatMoney(card.value)}
              </h3>

              <p className="text-xs text-slate-400 mt-1">
                {card.note}
              </p>
            </div>
          );
        })}
      </div>

      {/* ==================================================================== */}
      {/* NAVIGATION                                                            */}
      {/* ==================================================================== */}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {[
          {
            id: 'overview',
            label: 'Overview',
            icon: BarChart3,
          },
          {
            id: 'charges',
            label: 'Charges',
            icon: FileText,
          },
          {
            id: 'payments',
            label: 'Payments & Receipts',
            icon: Receipt,
          },
          {
            id: 'catalogue',
            label: 'Pricing Catalogue',
            icon: Tags,
          },
          {
            id: 'refunds',
            label: 'Refunds',
            icon: RotateCcw,
          },
          {
            id: 'plans',
            label: 'Payment Plans',
            icon: CalendarDays,
          },
        ].map((tab) => {
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setActiveTab(
                  tab.id as TabId
                )
              }
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'bg-[#1b7b68] text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ==================================================================== */}
      {/* OVERVIEW                                                              */}
      {/* ==================================================================== */}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SectionCard
            title="Recent Charges"
            subtitle="Latest patient charges captured across clinical modules"
            icon={
              <FileCheck2 className="w-4 h-4" />
            }
            action={
              <button
                type="button"
                onClick={() =>
                  setActiveTab('charges')
                }
                className="text-[11px] font-bold text-[#1b7b68] hover:underline"
              >
                View all
              </button>
            }
          >
            <div className="space-y-3">
              {charges.slice(0, 5).length ===
              0 ? (
                <div className="py-8 text-center">
                  <FileText className="w-7 h-7 text-slate-300 mx-auto" />

                  <p className="text-xs text-slate-400 mt-2">
                    No charges found
                  </p>
                </div>
              ) : (
                charges
                  .slice(0, 5)
                  .map((charge) => (
                    <div
                      key={charge._id}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            {charge.description ||
                              'Patient charge'}
                          </p>

                          <p className="text-[10px] text-slate-400 mt-1">
                            {getPatientName(
                              charge.patientId
                            )}

                            {getPatientMeta(
                              charge.patientId
                            )
                              ? ` • ${getPatientMeta(
                                  charge.patientId
                                )}`
                              : ''}
                          </p>

                          <p className="text-[10px] text-[#1b7b68] font-semibold mt-1">
                            {charge.serviceCode ||
                              formatLabel(
                                charge.category
                              )}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-black text-slate-900">
                            {formatMoney(
                              charge.netAmount,
                              charge.currency
                            )}
                          </p>

                          <StatusBadge
                            className={`mt-1 ${statusClasses(
                              charge.status
                            )}`}
                          >
                            {formatLabel(
                              charge.status
                            )}
                          </StatusBadge>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Recent Payments"
            subtitle="Latest payments and receipt activity"
            icon={
              <Receipt className="w-4 h-4" />
            }
            action={
              <button
                type="button"
                onClick={() =>
                  setActiveTab('payments')
                }
                className="text-[11px] font-bold text-[#1b7b68] hover:underline"
              >
                View all
              </button>
            }
          >
            <div className="space-y-3">
              {payments.slice(0, 5).length ===
              0 ? (
                <div className="py-8 text-center">
                  <Receipt className="w-7 h-7 text-slate-300 mx-auto" />

                  <p className="text-xs text-slate-400 mt-2">
                    No payments found
                  </p>
                </div>
              ) : (
                payments
                  .slice(0, 5)
                  .map((payment) => (
                    <div
                      key={payment._id}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            {payment.receiptNumber ||
                              'Payment receipt'}
                          </p>

                          <p className="text-[10px] text-slate-400 mt-1">
                            {getPatientName(
                              payment.patientId
                            )}

                            {getPatientMeta(
                              payment.patientId
                            )
                              ? ` • ${getPatientMeta(
                                  payment.patientId
                                )}`
                              : ''}
                          </p>

                          <p className="text-[10px] text-slate-400 mt-1">
                            {formatDateTime(
                              payment.paidAt
                            )}{' '}
                            •{' '}
                            {formatLabel(
                              payment.method
                            )}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-black text-slate-900">
                            {formatMoney(
                              payment.amount
                            )}
                          </p>

                          <StatusBadge
                            className={`mt-1 ${statusClasses(
                              payment.reconciliationStatus ||
                                payment.status
                            )}`}
                          >
                            {formatLabel(
                              payment.reconciliationStatus ||
                                payment.status
                            )}
                          </StatusBadge>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Billing Controls"
            subtitle="Quick access to operational billing workflows"
            icon={
              <Settings2 className="w-4 h-4" />
            }
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: 'Post Charge',
                  icon: Plus,
                  onClick: () =>
                    setShowChargeModal(true),
                },
                {
                  label: 'Record Payment',
                  icon: Banknote,
                  onClick: () =>
                    setShowPaymentModal(true),
                },
                {
                  label: 'Add Price',
                  icon: Tags,
                  onClick: () =>
                    setShowCatalogueModal(true),
                },
                {
                  label: 'Refund',
                  icon: RotateCcw,
                  onClick: () =>
                    setShowRefundModal(true),
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-[#1b7b68]/5 hover:border-[#1b7b68]/20 text-left"
                  >
                    <Icon className="w-4 h-4 text-[#1b7b68]" />

                    <p className="text-xs font-bold text-slate-800 mt-3">
                      {item.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard
            title="Pricing Governance"
            subtitle="Centralized pricing keeps clinical modules independent of hard-coded prices"
            icon={
              <ShieldCheck className="w-4 h-4" />
            }
          >
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Catalogue items"
                value={catalogueMeta.total}
              />

              <Field
                label="Active prices"
                value={
                  catalogue.filter(
                    (item) =>
                      item.isActive !== false
                  ).length
                }
              />

              <Field
                label="Latest version"
                value={
                  catalogue.length
                    ? Math.max(
                        ...catalogue.map(
                          (item) =>
                            Number(
                              item.version || 1
                            )
                        )
                      )
                    : '—'
                }
              />

              <Field
                label="Currency"
                value="NGN"
              />
            </div>
          </SectionCard>
        </div>
      )}

      {/* ==================================================================== */}
      {/* CHARGES                                                               */}
      {/* ==================================================================== */}

      {activeTab === 'charges' && (
        <SectionCard
          title="Patient Charges"
          subtitle="Charges posted by Radiology, Laboratory, Pharmacy, Surgery, Outpatient and other modules"
          icon={
            <FileText className="w-4 h-4" />
          }
          action={
            <button
              type="button"
              onClick={() =>
                setShowChargeModal(true)
              }
              className="px-3 py-2 rounded-xl bg-[#1b7b68] text-white text-[11px] font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Manual Charge
            </button>
          }
        >
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />

            <input
              value={chargeSearch}
              onChange={(e) => {
                setChargeSearch(
                  e.target.value
                );
                setChargePage(1);
              }}
              placeholder="Search charges..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-100">
                  {[
                    'Patient',
                    'Service',
                    'Department',
                    'Amount',
                    'Paid',
                    'Status',
                    'Date',
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="text-left py-3 px-3 text-[10px] uppercase tracking-wider font-bold text-slate-400"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {charges.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-10 text-center text-xs text-slate-400"
                    >
                      No charges found.
                    </td>
                  </tr>
                ) : (
                  charges.map(
                    (charge) => (
                      <tr
                        key={charge._id}
                        className="border-b border-slate-50 hover:bg-slate-50/60"
                      >
                        <td className="py-3 px-3">
                          <p className="text-xs font-bold text-slate-800">
                            {getPatientName(
                              charge.patientId
                            )}
                          </p>

                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {getPatientMeta(
                              charge.patientId
                            )}
                          </p>
                        </td>

                        <td className="py-3 px-3">
                          <p className="text-xs font-semibold text-slate-700">
                            {charge.description ||
                              'Charge'}
                          </p>

                          <p className="text-[10px] text-[#1b7b68] mt-0.5">
                            {charge.serviceCode ||
                              'Manual'}
                          </p>
                        </td>

                        <td className="py-3 px-3 text-xs text-slate-600">
                          {charge.departmentName ||
                            formatLabel(
                              charge.sourceModule
                            )}
                        </td>

                        <td className="py-3 px-3 text-xs font-black text-slate-800">
                          {formatMoney(
                            charge.netAmount,
                            charge.currency
                          )}
                        </td>

                        <td className="py-3 px-3 text-xs font-semibold text-slate-600">
                          {formatMoney(
                            charge.amountPaid
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <StatusBadge
                            className={statusClasses(
                              charge.status
                            )}
                          >
                            {formatLabel(
                              charge.status
                            )}
                          </StatusBadge>
                        </td>

                        <td className="py-3 px-3 text-xs text-slate-500">
                          {formatDate(
                            charge.chargeDate
                          )}
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={chargesMeta.page}
            totalPages={
              chargesMeta.totalPages
            }
            onPrevious={() =>
              setChargePage((page) =>
                Math.max(1, page - 1)
              )
            }
            onNext={() =>
              setChargePage((page) =>
                Math.min(
                  chargesMeta.totalPages,
                  page + 1
                )
              )
            }
          />
        </SectionCard>
      )}

      {/* ==================================================================== */}
      {/* PAYMENTS                                                              */}
      {/* ==================================================================== */}

      {activeTab === 'payments' && (
        <SectionCard
          title="Payments & Receipts"
          subtitle="Cash, card, transfer and online payment activity with reconciliation status"
          icon={
            <Receipt className="w-4 h-4" />
          }
          action={
            <button
              type="button"
              onClick={() =>
                setShowPaymentModal(true)
              }
              className="px-3 py-2 rounded-xl bg-[#1b7b68] text-white text-[11px] font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Record Payment
            </button>
          }
        >
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />

            <input
              value={paymentSearch}
              onChange={(e) => {
                setPaymentSearch(
                  e.target.value
                );
                setPaymentPage(1);
              }}
              placeholder="Search payments..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b border-slate-100">
                  {[
                    'Receipt',
                    'Patient',
                    'Amount',
                    'Method',
                    'Payment Status',
                    'Reconciliation',
                    'Paid At',
                    'Action',
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="text-left py-3 px-3 text-[10px] uppercase tracking-wider font-bold text-slate-400"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {payments.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-10 text-center text-xs text-slate-400"
                    >
                      No payments found.
                    </td>
                  </tr>
                ) : (
                  payments.map(
                    (payment) => (
                      <tr
                        key={payment._id}
                        className="border-b border-slate-50 hover:bg-slate-50/60"
                      >
                        <td className="py-3 px-3">
                          <p className="text-xs font-bold text-slate-800">
                            {payment.receiptNumber ||
                              'Receipt'}
                          </p>

                          <p className="text-[10px] text-slate-400">
                            {payment.reference ||
                              'No reference'}
                          </p>
                        </td>

                        <td className="py-3 px-3">
                          <p className="text-xs font-bold text-slate-800">
                            {getPatientName(
                              payment.patientId
                            )}
                          </p>

                          <p className="text-[10px] text-slate-400">
                            {getPatientMeta(
                              payment.patientId
                            )}
                          </p>
                        </td>

                        <td className="py-3 px-3 text-xs font-black text-slate-800">
                          {formatMoney(
                            payment.amount
                          )}
                        </td>

                        <td className="py-3 px-3 text-xs text-slate-600">
                          {formatLabel(
                            payment.method
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <StatusBadge
                            className={statusClasses(
                              payment.status
                            )}
                          >
                            {formatLabel(
                              payment.status
                            )}
                          </StatusBadge>
                        </td>

                        <td className="py-3 px-3">
                          <StatusBadge
                            className={statusClasses(
                              payment.reconciliationStatus
                            )}
                          >
                            {formatLabel(
                              payment.reconciliationStatus
                            )}
                          </StatusBadge>
                        </td>

                        <td className="py-3 px-3 text-xs text-slate-500">
                          {formatDateTime(
                            payment.paidAt
                          )}
                        </td>

                        <td className="py-3 px-3">
                          {payment.reconciliationStatus !==
                            'RECONCILED' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleReconcile(
                                  payment._id
                                )
                              }
                              className="text-[10px] font-bold text-[#1b7b68] hover:underline"
                            >
                              Reconcile
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={paymentsMeta.page}
            totalPages={
              paymentsMeta.totalPages
            }
            onPrevious={() =>
              setPaymentPage((page) =>
                Math.max(1, page - 1)
              )
            }
            onNext={() =>
              setPaymentPage((page) =>
                Math.min(
                  paymentsMeta.totalPages,
                  page + 1
                )
              )
            }
          />
        </SectionCard>
      )}

      {/* ==================================================================== */}
      {/* CATALOGUE                                                             */}
      {/* ==================================================================== */}

      {activeTab === 'catalogue' && (
        <SectionCard
          title="Service & Procedure Pricing Catalogue"
          subtitle="Central source of truth for service prices and department-specific pricing"
          icon={
            <Tags className="w-4 h-4" />
          }
          action={
            <button
              type="button"
              onClick={() =>
                setShowCatalogueModal(true)
              }
              className="px-3 py-2 rounded-xl bg-[#1b7b68] text-white text-[11px] font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Price
            </button>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-5">
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={catalogueSearch}
                onChange={(e) => {
                  setCatalogueSearch(e.target.value);
                  setCataloguePage(1);
                }}
                placeholder="Search by service code, plan name or department..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
              />
            </div>

            <Select
              label="Department"
              value={catalogueDepartmentFilter}
              onChange={setCatalogueDepartmentFilter}
              options={[
                { value: '', label: 'All departments' },
                ...catalogueDepartments.map((department) => ({
                  value: department,
                  label: department,
                })),
              ]}
            />

            <Select
              label="Status"
              value={catalogueStatusFilter}
              onChange={setCatalogueStatusFilter}
              options={[
                { value: 'ACTIVE', label: 'Active plans' },
                { value: 'INACTIVE', label: 'Inactive plans' },
                { value: 'ALL', label: 'All plans' },
              ]}
            />
          </div>

          <div className="flex items-center gap-2 mb-5 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#1b7b68]" />
            <p className="text-[10px] text-slate-500">
              Clinical modules will only use active pricing plans assigned to their department.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCatalogue.length ===
            0 ? (
              <div className="md:col-span-2 xl:col-span-3 py-12 text-center">
                <Tags className="w-8 h-8 text-slate-300 mx-auto" />

                <p className="text-xs text-slate-400 mt-3">
                  No pricing catalogue
                  items found.
                </p>
              </div>
            ) : (
              filteredCatalogue.map((item) => (
                <div
                  key={item._id}
                  className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold text-[#1b7b68] uppercase tracking-wider">
                        {item.code}
                      </p>

                      <h3 className="text-sm font-bold text-slate-900 mt-1">
                        {item.name}
                      </h3>

                      <p className="text-[10px] text-slate-400 mt-1">
                        {formatLabel(
                          item.category
                        )}

                        {item.departmentName
                          ? ` • ${item.departmentName}`
                          : ' • Global price'}
                      </p>
                    </div>

                    <StatusBadge
                      className={
                        item.isActive ===
                        false
                          ? 'bg-slate-50 text-slate-500 border-slate-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }
                    >
                      {item.isActive ===
                      false
                        ? 'Inactive'
                        : 'Active'}
                    </StatusBadge>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => openCatalogueEdit(item)}
                      className="flex-1 py-2 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit Price
                    </button>
                    <button
                      type="button"
                      onClick={() => openCatalogueHistory(item)}
                      className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 flex items-center justify-center"
                      title="View price history"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCatalogueStatus(item)}
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center ${
                        item.isActive === false
                          ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                          : 'border-rose-200 text-rose-500 hover:bg-rose-50'
                      }`}
                      title={item.isActive === false ? 'Activate plan' : 'Deactivate plan'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-end justify-between mt-5">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                        Current Price
                      </p>

                      <p className="text-xl font-black text-slate-900 mt-1">
                        {formatMoney(
                          item.price,
                          item.currency
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">
                        Version{' '}
                        {item.version || 1}
                      </p>

                      <p className="text-[10px] text-slate-400 mt-1">
                        From{' '}
                        {formatDate(
                          item.effectiveFrom
                        )}
                      </p>
                    </div>
                  </div>

                  {item.description && (
                    <p className="text-[10px] text-slate-500 mt-4 pt-3 border-t border-slate-100">
                      {item.description}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          <Pagination
            page={catalogueMeta.page}
            totalPages={
              catalogueMeta.totalPages
            }
            onPrevious={() =>
              setCataloguePage((page) =>
                Math.max(1, page - 1)
              )
            }
            onNext={() =>
              setCataloguePage((page) =>
                Math.min(
                  catalogueMeta.totalPages,
                  page + 1
                )
              )
            }
          />
        </SectionCard>
      )}

      {/* ==================================================================== */}
      {/* REFUNDS                                                               */}
      {/* ==================================================================== */}

      {activeTab === 'refunds' && (
        <SectionCard
          title="Refund Management"
          subtitle="Create refund requests and track approval and completion"
          icon={
            <RotateCcw className="w-4 h-4" />
          }
          action={
            <button
              type="button"
              onClick={() =>
                setShowRefundModal(true)
              }
              className="px-3 py-2 rounded-xl bg-[#1b7b68] text-white text-[11px] font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Request Refund
            </button>
          }
        >
          <div className="space-y-3">
            {refunds.length ===
            0 ? (
              <div className="py-12 text-center">
                <RotateCcw className="w-8 h-8 text-slate-300 mx-auto" />

                <p className="text-xs text-slate-400 mt-3">
                  No refund activity found.
                </p>
              </div>
            ) : (
              refunds.map((refund) => (
                <div
                  key={refund._id}
                  className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {getPatientName(
                          refund.patientId
                        )}
                      </p>

                      <p className="text-[10px] text-slate-400 mt-1">
                        Payment:{' '}
                        {refund.paymentId ||
                          'N/A'}
                      </p>

                      <p className="text-[10px] text-slate-500 mt-2">
                        {refund.reason ||
                          'No reason recorded'}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-base font-black text-slate-900">
                        {formatMoney(
                          refund.amount
                        )}
                      </p>

                      <StatusBadge
                        className={`mt-1 ${statusClasses(
                          refund.status
                        )}`}
                      >
                        {formatLabel(
                          refund.status
                        )}
                      </StatusBadge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-3 border-t border-slate-100">
                    <Field
                      label="Requested"
                      value={formatDateTime(
                        refund.requestedAt
                      )}
                    />

                    <Field
                      label="Approved"
                      value={formatDateTime(
                        refund.approvedAt
                      )}
                    />

                    <Field
                      label="Completed"
                      value={formatDateTime(
                        refund.completedAt
                      )}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      )}

      {/* ==================================================================== */}
      {/* PAYMENT PLANS                                                         */}
      {/* ==================================================================== */}

      {activeTab === 'plans' && (
        <SectionCard
          title="Payment Plans"
          subtitle="Structured installment arrangements for outstanding balances"
          icon={
            <CalendarDays className="w-4 h-4" />
          }
          action={
            <button
              type="button"
              onClick={() =>
                setShowPlanModal(true)
              }
              className="px-3 py-2 rounded-xl bg-[#1b7b68] text-white text-[11px] font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Plan
            </button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {plans.length ===
            0 ? (
              <div className="md:col-span-2 xl:col-span-3 py-12 text-center">
                <CalendarDays className="w-8 h-8 text-slate-300 mx-auto" />

                <p className="text-xs text-slate-400 mt-3">
                  No payment plans found.
                </p>
              </div>
            ) : (
              plans.map((plan) => (
                <div
                  key={plan._id}
                  className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {getPatientName(
                          plan.patientId
                        )}
                      </p>

                      <p className="text-[10px] text-slate-400 mt-1">
                        {formatLabel(
                          plan.frequency
                        )}
                      </p>
                    </div>

                    <StatusBadge
                      className={statusClasses(
                        plan.status
                      )}
                    >
                      {formatLabel(
                        plan.status
                      )}
                    </StatusBadge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-5">
                    <Field
                      label="Total"
                      value={formatMoney(
                        plan.totalAmount
                      )}
                    />

                    <Field
                      label="Installment"
                      value={formatMoney(
                        plan.installmentAmount
                      )}
                    />

                    <Field
                      label="Start"
                      value={formatDate(
                        plan.startDate
                      )}
                    />

                    <Field
                      label="End"
                      value={formatDate(
                        plan.endDate
                      )}
                    />
                  </div>

                  {plan.installments
                    ?.length ? (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">
                        Installments
                      </p>

                      <div className="space-y-2 max-h-36 overflow-y-auto">
                        {plan.installments
                          .slice(0, 5)
                          .map(
                            (
                              installment,
                              index
                            ) => (
                              <div
                                key={`${plan._id}-${index}`}
                                className="flex items-center justify-between text-[10px]"
                              >
                                <span className="text-slate-500">
                                  {formatDate(
                                    installment.dueDate
                                  )}
                                </span>

                                <span className="font-bold text-slate-700">
                                  {formatMoney(
                                    installment.paidAmount
                                  )}{' '}
                                  /{' '}
                                  {formatMoney(
                                    installment.amount
                                  )}
                                </span>
                              </div>
                            )
                          )}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </SectionCard>
      )}

      {/* ==================================================================== */}
      {/* MANUAL CHARGE MODAL                                                   */}
      {/* ==================================================================== */}

      <Modal
        open={showChargeModal}
        title="Post Manual Charge"
        subtitle="Use this when a clinical module has not already generated the charge."
        onClose={() =>
          setShowChargeModal(false)
        }
      >
        <div className="space-y-4">
          <PatientSelector
            label="Patient"
            required
            selectedPatient={
              selectedChargePatient
            }
            onOpen={() =>
              openPatientSearch('charge')
            }
            onChange={() => {
              setSelectedChargePatient(
                null
              );

              setChargeForm(
                (previous) => ({
                  ...previous,
                  patientId: '',
                })
              );

              openPatientSearch(
                'charge'
              );
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Service Code"
              value={
                chargeForm.serviceCode
              }
              onChange={(value) =>
                setChargeForm(
                  (previous) => ({
                    ...previous,
                    serviceCode: value,
                  })
                )
              }
              placeholder="Optional for manual charges"
            />

            <Select
              label="Category"
              value={
                chargeForm.category
              }
              onChange={(value) =>
                setChargeForm(
                  (previous) => ({
                    ...previous,
                    category: value,
                  })
                )
              }
              options={[
                [
                  'MISCELLANEOUS',
                  'Miscellaneous',
                ],
                [
                  'CONSULTATION',
                  'Consultation',
                ],
                [
                  'LABORATORY',
                  'Laboratory',
                ],
                [
                  'RADIOLOGY',
                  'Radiology',
                ],
                [
                  'PHARMACY',
                  'Pharmacy',
                ],
                [
                  'SURGERY',
                  'Surgery',
                ],
                [
                  'WARD',
                  'Ward / Bed',
                ],
                [
                  'EMERGENCY',
                  'Emergency',
                ],
              ].map(
                ([value, label]) => ({
                  value,
                  label,
                })
              )}
            />
          </div>

          <Input
            label="Description"
            required
            value={
              chargeForm.description
            }
            onChange={(value) =>
              setChargeForm(
                (previous) => ({
                  ...previous,
                  description: value,
                })
              )
            }
            placeholder="Describe the service or charge"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Quantity"
              value={
                chargeForm.quantity
              }
              onChange={(value) =>
                setChargeForm(
                  (previous) => ({
                    ...previous,
                    quantity: value,
                  })
                )
              }
              type="number"
            />

            <Input
              label="Unit Price"
              required
              value={
                chargeForm.unitPrice
              }
              onChange={(value) =>
                setChargeForm(
                  (previous) => ({
                    ...previous,
                    unitPrice: value,
                  })
                )
              }
              type="number"
            />

            <Input
              label="Department"
              value={
                chargeForm.departmentName
              }
              onChange={(value) =>
                setChargeForm(
                  (previous) => ({
                    ...previous,
                    departmentName: value,
                  })
                )
              }
              placeholder="Optional"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Discount"
              value={
                chargeForm.discountAmount
              }
              onChange={(value) =>
                setChargeForm(
                  (previous) => ({
                    ...previous,
                    discountAmount: value,
                  })
                )
              }
              type="number"
            />

            <Input
              label="Tax"
              value={
                chargeForm.taxAmount
              }
              onChange={(value) =>
                setChargeForm(
                  (previous) => ({
                    ...previous,
                    taxAmount: value,
                  })
                )
              }
              type="number"
            />
          </div>

          <Input
            label="Notes"
            value={
              chargeForm.notes
            }
            onChange={(value) =>
              setChargeForm(
                (previous) => ({
                  ...previous,
                  notes: value,
                })
              )
            }
            placeholder="Optional notes"
          />

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-[10px] text-amber-700">
            Radiology, Laboratory,
            Surgery, Outpatient and
            Pharmacy should normally send
            service codes so Billing resolves
            the price centrally.
          </div>

          <ModalActions
            onCancel={() =>
              setShowChargeModal(false)
            }
            onSubmit={
              handleCreateCharge
            }
            submitting={submitting}
            submitLabel="Post Charge"
          />
        </div>
      </Modal>

      {/* ==================================================================== */}
      {/* PAYMENT MODAL                                                         */}
      {/* ==================================================================== */}

      <Modal
        open={showPaymentModal}
        title="Record Payment"
        subtitle="Record a patient payment and allocate it to outstanding charges."
        onClose={() =>
          setShowPaymentModal(false)
        }
      >
        <div className="space-y-4">
          <PatientSelector
            label="Patient"
            required
            selectedPatient={
              selectedPaymentPatient
            }
            onOpen={() =>
              openPatientSearch('payment')
            }
            onChange={() => {
              setSelectedPaymentPatient(
                null
              );

              setPaymentForm(
                (previous) => ({
                  ...previous,
                  patientId: '',
                })
              );

              openPatientSearch(
                'payment'
              );
            }}
          />

          <Input
            label="Billing Account ID"
            value={
              paymentForm.billingAccountId
            }
            onChange={(value) =>
              setPaymentForm(
                (previous) => ({
                  ...previous,
                  billingAccountId:
                    value,
                })
              )
            }
            placeholder="Optional — resolved automatically"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Amount"
              required
              value={
                paymentForm.amount
              }
              onChange={(value) =>
                setPaymentForm(
                  (previous) => ({
                    ...previous,
                    amount: value,
                  })
                )
              }
              type="number"
            />

            <Select
              label="Payment Method"
              value={
                paymentForm.method
              }
              onChange={(value) =>
                setPaymentForm(
                  (previous) => ({
                    ...previous,
                    method: value,
                  })
                )
              }
              options={[
                'CASH',
                'CARD',
                'BANK_TRANSFER',
                'ONLINE',
                'MOBILE_MONEY',
                'OTHER',
              ].map((value) => ({
                value,
                label:
                  formatLabel(value),
              }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Reference"
              value={
                paymentForm.reference
              }
              onChange={(value) =>
                setPaymentForm(
                  (previous) => ({
                    ...previous,
                    reference: value,
                  })
                )
              }
              placeholder="Receipt/reference"
            />

            <Input
              label="Payment Date"
              value={
                paymentForm.paidAt
              }
              onChange={(value) =>
                setPaymentForm(
                  (previous) => ({
                    ...previous,
                    paidAt: value,
                  })
                )
              }
              type="datetime-local"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Provider"
              value={
                paymentForm.provider
              }
              onChange={(value) =>
                setPaymentForm(
                  (previous) => ({
                    ...previous,
                    provider: value,
                  })
                )
              }
              placeholder="Bank / gateway"
            />

            <Input
              label="Provider Transaction ID"
              value={
                paymentForm.providerTransactionId
              }
              onChange={(value) =>
                setPaymentForm(
                  (previous) => ({
                    ...previous,
                    providerTransactionId:
                      value,
                  })
                )
              }
              placeholder="Optional"
            />
          </div>

          <Input
            label="Notes"
            value={
              paymentForm.notes
            }
            onChange={(value) =>
              setPaymentForm(
                (previous) => ({
                  ...previous,
                  notes: value,
                })
              )
            }
            placeholder="Optional notes"
          />

          <ModalActions
            onCancel={() =>
              setShowPaymentModal(false)
            }
            onSubmit={
              handleCreatePayment
            }
            submitting={submitting}
            submitLabel="Record Payment"
          />
        </div>
      </Modal>

      {/* ==================================================================== */}
      {/* CATALOGUE MODAL                                                       */}
      {/* ==================================================================== */}

      <Modal
        open={showCatalogueModal}
        title="Add Pricing Catalogue Item"
        subtitle="Create a versioned centralized price for a clinical service."
        onClose={() =>
          setShowCatalogueModal(false)
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                Service Code
              </p>
              <p className="mt-1 text-xs font-semibold text-emerald-900">
                Automatically generated from the selected department
              </p>
              <p className="mt-0.5 text-[10px] text-emerald-700">
                You do not need to enter a service code manually.
              </p>
            </div>

            <Input
              label="Pricing Plan Name"
              required
              value={
                catalogueForm.name
              }
              onChange={(value) =>
                setCatalogueForm(
                  (previous) => ({
                    ...previous,
                    name: value,
                  })
                )
              }
              placeholder="CT Brain"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Category"
              value={
                catalogueForm.category
              }
              onChange={(value) =>
                setCatalogueForm(
                  (previous) => ({
                    ...previous,
                    category: value,
                  })
                )
              }
              options={[
                'CONSULTATION',
                'LABORATORY',
                'RADIOLOGY',
                'PHARMACY',
                'SURGERY',
                'ICU',
                'WARD',
                'PROFESSIONAL_FEE',
                'ANAESTHESIA',
                'CONSUMABLE',
                'IMPLANT',
                'ACCOMMODATION',
                'EMERGENCY',
                'MISCELLANEOUS',
              ].map((value) => ({
                value,
                label:
                  formatLabel(value),
              }))}
            />

            <Select
              label="Department / Module"
              value={catalogueForm.departmentName}
              onChange={(value) =>
                setCatalogueForm((previous) => ({
                  ...previous,
                  departmentName: value,
                }))
              }
              options={[
                { value: '', label: 'Global / All departments' },
                { value: 'Outpatient', label: 'Outpatient' },
                { value: 'Laboratory', label: 'Laboratory' },
                { value: 'Radiology', label: 'Radiology' },
                { value: 'Surgery', label: 'Surgery' },
                { value: 'Pharmacy', label: 'Pharmacy' },
                { value: 'Ward', label: 'Ward' },
                { value: 'ICU', label: 'ICU' },
                { value: 'Emergency', label: 'Emergency' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Price"
              required
              value={
                catalogueForm.price
              }
              onChange={(value) =>
                setCatalogueForm(
                  (previous) => ({
                    ...previous,
                    price: value,
                  })
                )
              }
              type="number"
            />

            <Select
              label="Currency"
              value={
                catalogueForm.currency
              }
              onChange={(value) =>
                setCatalogueForm(
                  (previous) => ({
                    ...previous,
                    currency: value,
                  })
                )
              }
              options={[
                {
                  value: 'NGN',
                  label:
                    'NGN — Nigerian Naira',
                },
                {
                  value: 'USD',
                  label:
                    'USD — US Dollar',
                },
                {
                  value: 'GBP',
                  label:
                    'GBP — Pound Sterling',
                },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Effective From"
              required
              value={
                catalogueForm.effectiveFrom
              }
              onChange={(value) =>
                setCatalogueForm(
                  (previous) => ({
                    ...previous,
                    effectiveFrom:
                      value,
                  })
                )
              }
              type="date"
            />

            <Input
              label="Effective To"
              value={
                catalogueForm.effectiveTo
              }
              onChange={(value) =>
                setCatalogueForm(
                  (previous) => ({
                    ...previous,
                    effectiveTo: value,
                  })
                )
              }
              type="date"
            />
          </div>

          <Input
            label="Description"
            value={
              catalogueForm.description
            }
            onChange={(value) =>
              setCatalogueForm(
                (previous) => ({
                  ...previous,
                  description:
                    value,
                })
              )
            }
            placeholder="Pricing notes or service description"
          />

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-[10px] text-emerald-700">
            Create a department-specific pricing plan here. Radiology, Laboratory, Surgery, Outpatient and Pharmacy can later select the active plan when creating their clinical order. Historical versions remain auditable.
          </div>

          <ModalActions
            onCancel={() =>
              setShowCatalogueModal(false)
            }
            onSubmit={
              handleCreateCatalogue
            }
            submitting={submitting}
            submitLabel="Create Price"
          />
        </div>
      </Modal>

      {/* ==================================================================== */}
      {/* EDIT PRICING CATALOGUE MODAL                                         */}
      {/* ==================================================================== */}
      <Modal
        open={showCatalogueEditModal}
        title="Edit Pricing Plan"
        subtitle="Update the current price while preserving its version history."
        onClose={() => {
          setShowCatalogueEditModal(false);
          setSelectedCatalogue(null);
        }}
        width="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Current plan
            </p>
            <p className="text-sm font-bold text-slate-800 mt-1">
              {selectedCatalogue?.name || 'Pricing plan'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {selectedCatalogue?.code || '—'} • Version {selectedCatalogue?.version || 1}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Service Code" required value={catalogueForm.code} onChange={(value) => setCatalogueForm((previous) => ({ ...previous, code: value }))} />
            <Input label="Pricing Plan Name" required value={catalogueForm.name} onChange={(value) => setCatalogueForm((previous) => ({ ...previous, name: value }))} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Department / Module" value={catalogueForm.departmentName} onChange={(value) => setCatalogueForm((previous) => ({ ...previous, departmentName: value }))} options={[
              { value: '', label: 'Global / All departments' },
              { value: 'Outpatient', label: 'Outpatient' },
              { value: 'Laboratory', label: 'Laboratory' },
              { value: 'Radiology', label: 'Radiology' },
              { value: 'Surgery', label: 'Surgery' },
              { value: 'Pharmacy', label: 'Pharmacy' },
              { value: 'Ward', label: 'Ward' },
              { value: 'ICU', label: 'ICU' },
              { value: 'Emergency', label: 'Emergency' },
            ]} />
            <Select label="Category" value={catalogueForm.category} onChange={(value) => setCatalogueForm((previous) => ({ ...previous, category: value }))} options={['CONSULTATION','LABORATORY','RADIOLOGY','PHARMACY','SURGERY','ICU','WARD','EMERGENCY','PROFESSIONAL_FEE','ANAESTHESIA','CONSUMABLE','IMPLANT','ACCOMMODATION','MISCELLANEOUS'].map((value) => ({ value, label: formatLabel(value) }))} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Price" required value={catalogueForm.price} onChange={(value) => setCatalogueForm((previous) => ({ ...previous, price: value }))} type="number" />
            <Select label="Currency" value={catalogueForm.currency} onChange={(value) => setCatalogueForm((previous) => ({ ...previous, currency: value }))} options={[{ value: 'NGN', label: 'NGN — Nigerian Naira' }, { value: 'USD', label: 'USD — US Dollar' }, { value: 'GBP', label: 'GBP — Pound Sterling' }]} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Effective From" required value={catalogueForm.effectiveFrom} onChange={(value) => setCatalogueForm((previous) => ({ ...previous, effectiveFrom: value }))} type="date" />
            <Input label="Effective To" value={catalogueForm.effectiveTo} onChange={(value) => setCatalogueForm((previous) => ({ ...previous, effectiveTo: value }))} type="date" />
          </div>

          <Input label="Description" value={catalogueForm.description} onChange={(value) => setCatalogueForm((previous) => ({ ...previous, description: value }))} placeholder="Pricing notes or service description" />

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-[10px] text-amber-700">
            Changing the price creates a new catalogue version. Existing patient charges keep their original price snapshot.
          </div>

          <ModalActions onCancel={() => setShowCatalogueEditModal(false)} onSubmit={handleUpdateCatalogue} submitting={submitting} submitLabel="Save Pricing Plan" />
        </div>
      </Modal>

      {/* ==================================================================== */}
      {/* PRICING HISTORY MODAL                                                */}
      {/* ==================================================================== */}
      <Modal
        open={showCatalogueHistoryModal}
        title="Pricing Version History"
        subtitle="Audit previous prices and effective periods for this service."
        onClose={() => {
          setShowCatalogueHistoryModal(false);
          setSelectedCatalogue(null);
        }}
        width="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold text-[#1b7b68] uppercase tracking-wider">
                  {selectedCatalogue?.code || 'SERVICE'}
                </p>
                <p className="text-sm font-bold text-slate-900 mt-1">
                  {selectedCatalogue?.name || 'Pricing plan'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {selectedCatalogue?.departmentName || 'Global'}
                </p>
              </div>
              <p className="text-lg font-black text-slate-900">
                {formatMoney(selectedCatalogue?.price, selectedCatalogue?.currency)}
              </p>
            </div>
          </div>

          {loadingCatalogueHistory ? (
            <div className="py-10 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#1b7b68] mx-auto" />
              <p className="text-xs text-slate-400 mt-2">Loading pricing history...</p>
            </div>
          ) : catalogueHistory.length === 0 ? (
            <div className="py-10 text-center">
              <History className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600 mt-3">No previous versions</p>
              <p className="text-[10px] text-slate-400 mt-1">This pricing plan has no archived versions yet.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {catalogueHistory.map((version, index) => (
                <div key={`${selectedCatalogue?._id}-${version.version || index}`} className="p-3 rounded-xl border border-slate-100 bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Version {version.version}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {formatDate(version.effectiveFrom)}{version.effectiveTo ? ` → ${formatDate(version.effectiveTo)}` : ' → Open ended'}
                      </p>
                    </div>
                    <p className="text-sm font-black text-slate-900">
                      {formatMoney(version.price, version.currency)}
                    </p>
                  </div>
                  {version.changedAt && (
                    <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
                      Archived {formatDateTime(version.changedAt)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* ==================================================================== */}
      {/* REFUND MODAL                                                          */}
      {/* ==================================================================== */}

      <Modal
        open={showRefundModal}
        title="Request Refund"
        subtitle="Create a refund request against an existing payment."
        onClose={() =>
          setShowRefundModal(false)
        }
      >
        <div className="space-y-4">
          <Input
            label="Payment ID"
            required
            value={
              refundForm.paymentId
            }
            onChange={(value) =>
              setRefundForm(
                (previous) => ({
                  ...previous,
                  paymentId: value,
                })
              )
            }
            placeholder="Enter payment ID"
          />

          <Input
            label="Refund Amount"
            required
            value={
              refundForm.amount
            }
            onChange={(value) =>
              setRefundForm(
                (previous) => ({
                  ...previous,
                  amount: value,
                })
              )
            }
            type="number"
          />

          <Input
            label="Reason"
            required
            value={
              refundForm.reason
            }
            onChange={(value) =>
              setRefundForm(
                (previous) => ({
                  ...previous,
                  reason: value,
                })
              )
            }
            placeholder="Why is this payment being refunded?"
          />

          <ModalActions
            onCancel={() =>
              setShowRefundModal(false)
            }
            onSubmit={
              handleCreateRefund
            }
            submitting={submitting}
            submitLabel="Request Refund"
          />
        </div>
      </Modal>

      {/* ==================================================================== */}
      {/* PAYMENT PLAN MODAL                                                    */}
      {/* ==================================================================== */}

      <Modal
        open={showPlanModal}
        title="Create Payment Plan"
        subtitle="Set up installments for an outstanding patient balance."
        onClose={() =>
          setShowPlanModal(false)
        }
      >
        <div className="space-y-4">
          <PatientSelector
            label="Patient"
            required
            selectedPatient={
              selectedPlanPatient
            }
            onOpen={() =>
              openPatientSearch('plan')
            }
            onChange={() => {
              setSelectedPlanPatient(
                null
              );

              setPlanForm(
                (previous) => ({
                  ...previous,
                  patientId: '',
                })
              );

              openPatientSearch(
                'plan'
              );
            }}
          />

          <Input
            label="Billing Account ID"
            value={
              planForm.billingAccountId
            }
            onChange={(value) =>
              setPlanForm(
                (previous) => ({
                  ...previous,
                  billingAccountId:
                    value,
                })
              )
            }
            placeholder="Optional billing account ID"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Total Amount"
              required
              value={
                planForm.totalAmount
              }
              onChange={(value) =>
                setPlanForm(
                  (previous) => ({
                    ...previous,
                    totalAmount:
                      value,
                  })
                )
              }
              type="number"
            />

            <Input
              label="Installment Amount"
              required
              value={
                planForm.installmentAmount
              }
              onChange={(value) =>
                setPlanForm(
                  (previous) => ({
                    ...previous,
                    installmentAmount:
                      value,
                  })
                )
              }
              type="number"
            />
          </div>

          <Select
            label="Frequency"
            value={
              planForm.frequency
            }
            onChange={(value) =>
              setPlanForm(
                (previous) => ({
                  ...previous,
                  frequency: value,
                })
              )
            }
            options={[
              'WEEKLY',
              'BIWEEKLY',
              'MONTHLY',
            ].map((value) => ({
              value,
              label:
                formatLabel(value),
            }))}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              required
              value={
                planForm.startDate
              }
              onChange={(value) =>
                setPlanForm(
                  (previous) => ({
                    ...previous,
                    startDate: value,
                  })
                )
              }
              type="date"
            />

            <Input
              label="End Date"
              value={
                planForm.endDate
              }
              onChange={(value) =>
                setPlanForm(
                  (previous) => ({
                    ...previous,
                    endDate: value,
                  })
                )
              }
              type="date"
            />
          </div>

          <Input
            label="Notes"
            value={
              planForm.notes
            }
            onChange={(value) =>
              setPlanForm(
                (previous) => ({
                  ...previous,
                  notes: value,
                })
              )
            }
            placeholder="Optional notes"
          />

          <ModalActions
            onCancel={() =>
              setShowPlanModal(false)
            }
            onSubmit={
              handleCreatePlan
            }
            submitting={submitting}
            submitLabel="Create Payment Plan"
          />
        </div>
      </Modal>

      {/* ==================================================================== */}
      {/* PATIENT SEARCH MODAL                                                  */}
      {/* ==================================================================== */}

      <Modal
        open={
          patientSearchContext !== null
        }
        title="Select Patient"
        subtitle="Search hospital patients by name or MRN."
        onClose={closePatientSearch}
        width="max-w-xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Patient
            </label>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

              <input
                autoFocus
                value={
                  patientSearch
                }
                onChange={(event) =>
                  setPatientSearch(
                    event.target.value
                  )
                }
                placeholder="Search patient by name or MRN..."
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
              />

              {loadingPatients && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1b7b68] animate-spin" />
              )}
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto space-y-2">
            {!patientSearch.trim() ? (
              <div className="py-10 text-center">
                <Search className="w-8 h-8 text-slate-300 mx-auto" />

                <p className="text-xs font-semibold text-slate-600 mt-3">
                  Search for a patient
                </p>

                <p className="text-[10px] text-slate-400 mt-1">
                  Enter a patient name or
                  MRN to begin.
                </p>
              </div>
            ) : loadingPatients ? (
              <div className="py-10 text-center">
                <Loader2 className="w-6 h-6 text-[#1b7b68] animate-spin mx-auto" />

                <p className="text-xs text-slate-400 mt-2">
                  Searching patients...
                </p>
              </div>
            ) : patients.length ===
              0 ? (
              <div className="py-10 text-center">
                <User className="w-8 h-8 text-slate-300 mx-auto" />

                <p className="text-xs font-semibold text-slate-600 mt-3">
                  No patients found
                </p>

                <p className="text-[10px] text-slate-400 mt-1">
                  Try another name or MRN.
                </p>
              </div>
            ) : (
              patients.map(
                (patient) => (
                  <button
                    key={patient._id}
                    type="button"
                    onClick={() =>
                      selectPatient(
                        patient
                      )
                    }
                    className="w-full p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-[#1b7b68]/5 hover:border-[#1b7b68]/20 text-left flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {patient.firstName ||
                            ''}{' '}
                          {patient.lastName ||
                            ''}
                        </p>

                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {patient.mrn
                            ? `MRN: ${patient.mrn}`
                            : 'No MRN'}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold text-[#1b7b68] shrink-0">
                      Select
                    </span>
                  </button>
                )
              )
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}