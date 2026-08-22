'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  Beaker,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Eye,
  FlaskConical,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  TestTube2,
  X,
} from 'lucide-react';

/* =========================================================
   TYPES
========================================================= */

type LabPriority = 'ROUTINE' | 'URGENT' | 'STAT';

type LabOrderStatus =
  | 'PENDING'
  | 'SAMPLE_SCHEDULED'
  | 'SAMPLE_COLLECTED'
  | 'SPECIMEN_RECEIVED'
  | 'IN_PROGRESS'
  | 'RESULTS_RECORDED'
  | 'VERIFIED'
  | 'COMPLETED'
  | 'SAMPLE_REJECTED'
  | 'RECOLLECTION_REQUIRED'
  | 'CANCELLED';

type LabDepartment =
  | 'HAEMATOLOGY'
  | 'CLINICAL_CHEMISTRY'
  | 'MICROBIOLOGY'
  | 'PARASITOLOGY'
  | 'IMMUNOLOGY_SEROLOGY'
  | 'HISTOPATHOLOGY'
  | 'CYTOLOGY'
  | 'MOLECULAR_DIAGNOSTICS'
  | 'BLOOD_BANK_TRANSFUSION'
  | 'GENETICS_GENOMIC_TESTING';

interface PopulatedEntity {
  _id?: string;
  id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  mrn?: string;
  email?: string;
}

interface LabOrder {
  _id: string;
  accessionNumber: string;

  patientId?: PopulatedEntity | string;
  doctorId?: PopulatedEntity | string;

  testName: string;
  testCategory: LabDepartment | string;
  panelName?: string;

  priority: LabPriority;
  isStat: boolean;
  status: LabOrderStatus | string;

  sampleType: string;

  sampleCollectedAt?: string;
  specimenReceivedAt?: string;
  completedAt?: string;

  predictedTatMinutes?: number;
  createdAt: string;

  criticalResultNotified?: boolean;
  duplicateTestDetected?: boolean;

  results?: unknown[];
}

interface LabOrdersResponse {
  success?: boolean;
  message?: string;
  orders?: LabOrder[];
  total?: number;
  page?: number;
  limit?: number;
  pages?: number;
  data?: {
    orders?: LabOrder[];
    total?: number;
    page?: number;
    limit?: number;
    pages?: number;
  };
}

interface CreateOrderForm {
  patientId: string;
  doctorId: string;
  testName: string;
  testCategory: LabDepartment;
  sampleType: string;
  priority: LabPriority;
  isStat: boolean;
  notes: string;
}

/* =========================================================
   CONSTANTS
========================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://medxverse-backend.onrender.com';

const LAB_API_URL = `${API_BASE_URL}/api/v1/lab`;

const INITIAL_FORM: CreateOrderForm = {
  patientId: '',
  doctorId: '',
  testName: '',
  testCategory: 'HAEMATOLOGY',
  sampleType: '',
  priority: 'ROUTINE',
  isStat: false,
  notes: '',
};

const DEPARTMENTS: {
  value: LabDepartment;
  label: string;
}[] = [
  { value: 'HAEMATOLOGY', label: 'Haematology' },
  { value: 'CLINICAL_CHEMISTRY', label: 'Clinical Chemistry' },
  { value: 'MICROBIOLOGY', label: 'Microbiology' },
  { value: 'PARASITOLOGY', label: 'Parasitology' },
  {
    value: 'IMMUNOLOGY_SEROLOGY',
    label: 'Immunology / Serology',
  },
  { value: 'HISTOPATHOLOGY', label: 'Histopathology' },
  { value: 'CYTOLOGY', label: 'Cytology' },
  {
    value: 'MOLECULAR_DIAGNOSTICS',
    label: 'Molecular Diagnostics',
  },
  {
    value: 'BLOOD_BANK_TRANSFUSION',
    label: 'Blood Bank / Transfusion',
  },
  {
    value: 'GENETICS_GENOMIC_TESTING',
    label: 'Genetics & Genomics',
  },
];

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

function getPatientName(
  patient?: PopulatedEntity | string
): string {
  if (!patient) return 'Unknown Patient';

  if (typeof patient === 'string') return patient;

  const name =
    `${patient.firstName || ''} ${
      patient.lastName || ''
    }`.trim();

  return name || patient.name || 'Unknown Patient';
}

function formatDate(date?: string): string {
  if (!date) return '—';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return '—';
  }

  return parsedDate.toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDepartment(value?: string): string {
  if (!value) return 'Unknown';

  const department = DEPARTMENTS.find(
    (item) => item.value === value
  );

  if (department) return department.label;

  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatStatus(value?: string): string {
  if (!value) return 'Unknown';

  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusClasses(status?: string): string {
  switch (status) {
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-700';

    case 'VERIFIED':
      return 'bg-teal-50 text-[#1b7b68]';

    case 'RESULTS_RECORDED':
      return 'bg-blue-50 text-blue-700';

    case 'IN_PROGRESS':
      return 'bg-amber-50 text-amber-700';

    case 'SAMPLE_COLLECTED':
    case 'SPECIMEN_RECEIVED':
      return 'bg-cyan-50 text-cyan-700';

    case 'SAMPLE_REJECTED':
    case 'RECOLLECTION_REQUIRED':
      return 'bg-rose-50 text-rose-700';

    case 'CANCELLED':
      return 'bg-slate-100 text-slate-600';

    default:
      return 'bg-slate-100 text-slate-600';
  }
}

function getPriorityClasses(priority?: string): string {
  switch (priority) {
    case 'STAT':
      return 'bg-rose-50 text-rose-700';

    case 'URGENT':
      return 'bg-orange-50 text-orange-700';

    default:
      return 'bg-slate-100 text-slate-600';
  }
}

/* =========================================================
   COMPONENT
========================================================= */

export default function LabPage() {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] =
    useState('ALL');

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [creatingOrder, setCreatingOrder] =
    useState(false);

  const [createError, setCreateError] = useState('');

  const [form, setForm] =
    useState<CreateOrderForm>(INITIAL_FORM);

  /* =========================================================
     FETCH LAB ORDERS
  ========================================================= */

  const fetchOrders = useCallback(
    async (
      requestedPage = 1,
      showRefreshState = false
    ) => {
      try {
        if (showRefreshState) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError('');

        const token = getToken();

        const params = new URLSearchParams();

        params.set('page', String(requestedPage));
        params.set('limit', '10');

        if (search.trim()) {
          params.set(
            'accessionNumber',
            search.trim()
          );
        }

        if (statusFilter !== 'ALL') {
          params.set('status', statusFilter);
        }

        if (priorityFilter !== 'ALL') {
          params.set('priority', priorityFilter);
        }

        if (departmentFilter !== 'ALL') {
          params.set(
            'department',
            departmentFilter
          );
        }

        const response = await fetch(
          `${LAB_API_URL}?${params.toString()}`,
          {
            method: 'GET',
            headers: {
              ...(token
                ? {
                    Authorization: `Bearer ${token}`,
                  }
                : {}),
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
          }
        );

        const result: LabOrdersResponse =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.message ||
              'Failed to load laboratory orders.'
          );
        }

        const responseData = result.data || result;

        setOrders(responseData.orders || []);
        setTotal(responseData.total || 0);
        setPage(responseData.page || requestedPage);
        setPages(responseData.pages || 1);
      } catch (err) {
        setOrders([]);

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load laboratory orders.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      search,
      statusFilter,
      priorityFilter,
      departmentFilter,
    ]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders(1);
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchOrders]);

  /* =========================================================
     CREATE LAB ORDER
  ========================================================= */

  const handleCreateOrder = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    try {
      setCreatingOrder(true);
      setCreateError('');

      const token = getToken();

      const payload = {
        patientId: form.patientId.trim(),
        doctorId: form.doctorId.trim() || undefined,
        testName: form.testName.trim(),
        testCategory: form.testCategory,
        sampleType: form.sampleType.trim(),
        priority: form.priority,
        isStat: form.isStat,
        notes: form.notes.trim() || undefined,
      };

      const response = await fetch(LAB_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}),
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            'Failed to create laboratory order.'
        );
      }

      setShowCreateModal(false);
      setForm(INITIAL_FORM);

      await fetchOrders(1, true);
    } catch (err) {
      setCreateError(
        err instanceof Error
          ? err.message
          : 'Unable to create laboratory order.'
      );
    } finally {
      setCreatingOrder(false);
    }
  };

  /* =========================================================
     DASHBOARD STATS
  ========================================================= */

  const stats = useMemo(() => {
    const pending = orders.filter(
      (order) =>
        ![
          'COMPLETED',
          'CANCELLED',
          'SAMPLE_REJECTED',
        ].includes(order.status)
    ).length;

    const inProgress = orders.filter((order) =>
      [
        'SAMPLE_COLLECTED',
        'SPECIMEN_RECEIVED',
        'IN_PROGRESS',
        'RESULTS_RECORDED',
      ].includes(order.status)
    ).length;

    const completed = orders.filter(
      (order) => order.status === 'COMPLETED'
    ).length;

    const critical = orders.filter(
      (order) =>
        order.criticalResultNotified ||
        order.priority === 'STAT' ||
        order.isStat
    ).length;

    return {
      pending,
      inProgress,
      completed,
      critical,
    };
  }, [orders]);

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="space-y-6 font-sans text-slate-800 animate-in fade-in duration-300">
      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />

          <span className="font-medium">{error}</span>

          <button
            type="button"
            onClick={() => setError('')}
            className="ml-auto rounded-lg p-1 transition hover:bg-rose-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
              Laboratory
            </h1>

            <span className="rounded-full bg-[#e8f5f3] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1b7b68]">
              Laboratory Management
            </span>
          </div>

          <p className="mt-0.5 text-xs text-slate-400">
            Manage laboratory orders, specimens, testing, and
            diagnostic results.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchOrders(page, true)}
            disabled={refreshing || loading}
            className="rounded-2xl border border-slate-100 bg-white p-3 text-slate-500 shadow-sm transition-all hover:bg-[#e8f5f3] hover:text-[#1b7b68] disabled:cursor-not-allowed disabled:opacity-50"
            title="Refresh laboratory orders"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? 'animate-spin' : ''
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => {
              setCreateError('');
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 rounded-2xl bg-[#1b7b68] px-4 py-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#146253]"
          >
            <Plus className="h-4 w-4" />
            New Lab Order
          </button>
        </div>
      </div>

      {/* =====================================================
          STATS
      ===================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Active Orders
              </p>

              <h2 className="mt-2 text-3xl font-extrabold text-slate-800">
                {stats.pending}
              </h2>

              <p className="mt-1 text-[11px] text-slate-400">
                Currently in workflow
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]">
              <ClipboardList className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                In Progress
              </p>

              <h2 className="mt-2 text-3xl font-extrabold text-slate-800">
                {stats.inProgress}
              </h2>

              <p className="mt-1 text-[11px] text-slate-400">
                Specimens being processed
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Activity className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Completed
              </p>

              <h2 className="mt-2 text-3xl font-extrabold text-slate-800">
                {stats.completed}
              </h2>

              <p className="mt-1 text-[11px] text-slate-400">
                Results authorized
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Priority / STAT
              </p>

              <h2 className="mt-2 text-3xl font-extrabold text-slate-800">
                {stats.critical}
              </h2>

              <p className="mt-1 text-[11px] text-slate-400">
                Requires priority attention
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          WORKLIST
      ===================================================== */}

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        {/* ===================================================
            WORKLIST HEADER
        =================================================== */}

        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-extrabold text-slate-800">
                  Laboratory Worklist
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  {total} laboratory order
                  {total === 1 ? '' : 's'} found
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
                <Clock3 className="h-3.5 w-3.5" />
                Real-time workflow monitoring
              </div>
            </div>

            {/* =================================================
                FILTERS
            ================================================= */}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="relative xl:col-span-2">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search accession number..."
                  className="h-11 w-full rounded-2xl border border-slate-100 bg-slate-50/50 pl-10 pr-4 text-xs font-medium text-slate-700 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-[#1b7b68]/30 focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="h-11 rounded-2xl border border-slate-100 bg-slate-50/50 px-3 text-xs font-medium text-slate-600 outline-none transition-all focus:border-[#1b7b68]/30 focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="SAMPLE_SCHEDULED">
                  Sample Scheduled
                </option>
                <option value="SAMPLE_COLLECTED">
                  Sample Collected
                </option>
                <option value="SPECIMEN_RECEIVED">
                  Specimen Received
                </option>
                <option value="IN_PROGRESS">
                  In Progress
                </option>
                <option value="RESULTS_RECORDED">
                  Results Recorded
                </option>
                <option value="VERIFIED">Verified</option>
                <option value="COMPLETED">Completed</option>
                <option value="SAMPLE_REJECTED">
                  Sample Rejected
                </option>
                <option value="RECOLLECTION_REQUIRED">
                  Recollection Required
                </option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(event.target.value)
                }
                className="h-11 rounded-2xl border border-slate-100 bg-slate-50/50 px-3 text-xs font-medium text-slate-600 outline-none transition-all focus:border-[#1b7b68]/30 focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
              >
                <option value="ALL">
                  All Priorities
                </option>
                <option value="ROUTINE">Routine</option>
                <option value="URGENT">Urgent</option>
                <option value="STAT">STAT</option>
              </select>

              <select
                value={departmentFilter}
                onChange={(event) =>
                  setDepartmentFilter(event.target.value)
                }
                className="h-11 rounded-2xl border border-slate-100 bg-slate-50/50 px-3 text-xs font-medium text-slate-600 outline-none transition-all focus:border-[#1b7b68]/30 focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
              >
                <option value="ALL">
                  All Departments
                </option>

                {DEPARTMENTS.map((department) => (
                  <option
                    key={department.value}
                    value={department.value}
                  >
                    {department.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ===================================================
            LOADING
        =================================================== */}

        {loading ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f5f3]">
              <Loader2 className="h-5 w-5 animate-spin text-[#1b7b68]" />
            </div>

            <p className="mt-4 text-xs text-slate-400">
              Loading laboratory worklist...
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#e8f5f3] text-[#1b7b68]">
              <TestTube2 className="h-7 w-7" />
            </div>

            <h3 className="mt-5 text-base font-extrabold text-slate-800">
              No laboratory orders found
            </h3>

            <p className="mt-2 max-w-md text-xs leading-6 text-slate-400">
              Create a new laboratory order or adjust your
              filters to view available orders.
            </p>

            <button
              type="button"
              onClick={() => {
                setCreateError('');
                setShowCreateModal(true);
              }}
              className="mt-5 flex items-center gap-2 rounded-2xl bg-[#1b7b68] px-4 py-3 text-xs font-bold text-white transition-all hover:bg-[#146253]"
            >
              <Plus className="h-4 w-4" />
              Create Lab Order
            </button>
          </div>
        ) : (
          <>
            {/* =================================================
                MOBILE CARDS
            ================================================= */}

            <div className="divide-y divide-slate-100 lg:hidden">
              {orders.map((order) => (
                <Link
                  key={order._id}
                  href={`/lab/${order._id}`}
                  className="block p-5 transition hover:bg-slate-50/60"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-700">
                        {getPatientName(order.patientId)}
                      </p>

                      <p className="mt-1 font-mono text-[10px] font-medium text-[#1b7b68]">
                        {order.accessionNumber}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${getPriorityClasses(
                        order.isStat
                          ? 'STAT'
                          : order.priority
                      )}`}
                    >
                      {order.isStat
                        ? 'STAT'
                        : order.priority}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Test
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-700">
                        {order.testName}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Department
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-700">
                        {formatDepartment(
                          order.testCategory
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${getStatusClasses(
                        order.status
                      )}`}
                    >
                      {formatStatus(order.status)}
                    </span>

                    <span className="text-[10px] text-slate-400">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* =================================================
                DESKTOP TABLE
            ================================================= */}

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1150px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Patient / Accession
                    </th>

                    <th className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Test
                    </th>

                    <th className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Department
                    </th>

                    <th className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Priority
                    </th>

                    <th className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </th>

                    <th className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      TAT
                    </th>

                    <th className="px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Ordered
                    </th>

                    <th className="px-6 py-3.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <tr
                      key={order._id}
                      className="transition-colors hover:bg-slate-50/50"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-700">
                            {getPatientName(order.patientId)}
                          </p>

                          <div className="mt-1 flex items-center gap-2">
                            <span className="font-mono text-[10px] font-medium text-[#1b7b68]">
                              {order.accessionNumber}
                            </span>

                            {typeof order.patientId ===
                              'object' &&
                              order.patientId?.mrn && (
                                <span className="text-[10px] text-slate-400">
                                  {order.patientId.mrn}
                                </span>
                              )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68]">
                            <TestTube2 className="h-4 w-4" />
                          </div>

                          <div>
                            <p className="font-bold text-slate-700">
                              {order.testName}
                            </p>

                            <p className="mt-1 text-[10px] text-slate-400">
                              {order.sampleType}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-slate-600">
                          {formatDepartment(
                            order.testCategory
                          )}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${getPriorityClasses(
                            order.isStat
                              ? 'STAT'
                              : order.priority
                          )}`}
                        >
                          {order.isStat
                            ? 'STAT'
                            : order.priority}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${getStatusClasses(
                            order.status
                          )}`}
                        >
                          {order.status ===
                            'IN_PROGRESS' && (
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                          )}

                          {formatStatus(order.status)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-slate-500">
                          {order.predictedTatMinutes
                            ? `${order.predictedTatMinutes} min`
                            : '—'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-slate-600">
                          {formatDate(order.createdAt)}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/lab/${order._id}`}
                          className="ml-auto inline-flex items-center gap-1 rounded-xl bg-[#1b7b68]/10 px-3 py-1.5 text-xs font-bold text-[#1b7b68] transition-all hover:bg-[#1b7b68] hover:text-white"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* =================================================
                PAGINATION
            ================================================= */}

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3.5">
              <span className="text-xs font-medium text-slate-500">
                Showing page{' '}
                <strong className="text-slate-800">
                  {page}
                </strong>{' '}
                of{' '}
                <strong className="text-slate-800">
                  {pages}
                </strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() =>
                    fetchOrders(page - 1)
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 bg-white text-slate-500 transition hover:bg-[#e8f5f3] hover:text-[#1b7b68] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  disabled={page >= pages || loading}
                  onClick={() =>
                    fetchOrders(page + 1)
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 bg-white text-slate-500 transition hover:bg-[#e8f5f3] hover:text-[#1b7b68] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* =====================================================
          CREATE ORDER MODAL
      ===================================================== */}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-300 sm:rounded-3xl">
            {/* MODAL HEADER */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-5 sm:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68]">
                    <FlaskConical className="h-4 w-4" />
                  </div>

                  <div>
                    <h2 className="text-base font-extrabold text-slate-800">
                      Create Laboratory Order
                    </h2>

                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Create a new digital laboratory
                      requisition.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  !creatingOrder &&
                  setShowCreateModal(false)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateOrder}
              className="p-5 sm:p-6"
            >
              {createError && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                  <p className="font-medium">
                    {createError}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* PATIENT ID */}

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-bold text-slate-700">
                    Patient ID
                  </label>

                  <input
                    required
                    value={form.patientId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        patientId: event.target.value,
                      }))
                    }
                    placeholder="Enter patient MongoDB ID"
                    className="h-11 w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-4 text-xs font-medium text-slate-700 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-[#1b7b68]/30 focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
                  />
                </div>

                {/* DOCTOR ID */}

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-bold text-slate-700">
                    Requesting Doctor ID
                    <span className="ml-1 font-normal text-slate-400">
                      (optional)
                    </span>
                  </label>

                  <input
                    value={form.doctorId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        doctorId: event.target.value,
                      }))
                    }
                    placeholder="Leave empty to use current user"
                    className="h-11 w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-4 text-xs font-medium text-slate-700 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-[#1b7b68]/30 focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
                  />
                </div>

                {/* TEST NAME */}

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-700">
                    Test Name
                  </label>

                  <input
                    required
                    value={form.testName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        testName: event.target.value,
                      }))
                    }
                    placeholder="e.g. Full Blood Count"
                    className="h-11 w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-4 text-xs font-medium text-slate-700 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-[#1b7b68]/30 focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
                  />
                </div>

                {/* SAMPLE TYPE */}

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-700">
                    Sample Type
                  </label>

                  <input
                    required
                    value={form.sampleType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sampleType: event.target.value,
                      }))
                    }
                    placeholder="e.g. EDTA Whole Blood"
                    className="h-11 w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-4 text-xs font-medium text-slate-700 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-[#1b7b68]/30 focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
                  />
                </div>

                {/* DEPARTMENT */}

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-700">
                    Laboratory Department
                  </label>

                  <select
                    value={form.testCategory}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        testCategory:
                          event.target
                            .value as LabDepartment,
                      }))
                    }
                    className="h-11 w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-4 text-xs font-medium text-slate-600 outline-none transition-all focus:border-[#1b7b68]/30 focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
                  >
                    {DEPARTMENTS.map((department) => (
                      <option
                        key={department.value}
                        value={department.value}
                      >
                        {department.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* PRIORITY */}

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-700">
                    Priority
                  </label>

                  <select
                    value={form.priority}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        priority:
                          event.target
                            .value as LabPriority,
                      }))
                    }
                    className="h-11 w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-4 text-xs font-medium text-slate-600 outline-none transition-all focus:border-[#1b7b68]/30 focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
                  >
                    <option value="ROUTINE">
                      Routine
                    </option>
                    <option value="URGENT">
                      Urgent
                    </option>
                    <option value="STAT">STAT</option>
                  </select>
                </div>

                {/* STAT */}

                <div className="sm:col-span-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-4 transition hover:bg-[#e8f5f3]/50">
                    <input
                      type="checkbox"
                      checked={form.isStat}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          isStat: event.target.checked,
                          priority: event.target.checked
                            ? 'STAT'
                            : current.priority === 'STAT'
                              ? 'ROUTINE'
                              : current.priority,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-[#1b7b68] focus:ring-[#1b7b68]"
                    />

                    <div>
                      <p className="text-xs font-bold text-slate-700">
                        Mark as STAT
                      </p>

                      <p className="mt-1 text-[11px] text-slate-400">
                        Prioritize this specimen for immediate
                        laboratory processing.
                      </p>
                    </div>
                  </label>
                </div>

                {/* NOTES */}

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-bold text-slate-700">
                    Clinical Notes
                    <span className="ml-1 font-normal text-slate-400">
                      (optional)
                    </span>
                  </label>

                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="Add relevant clinical information or instructions..."
                    className="w-full resize-none rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3 text-xs font-medium text-slate-700 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-[#1b7b68]/30 focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
                  />
                </div>
              </div>

              {/* ACTIONS */}

              <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={creatingOrder}
                  onClick={() =>
                    setShowCreateModal(false)
                  }
                  className="h-11 rounded-2xl border border-slate-100 px-5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creatingOrder}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#1b7b68] px-5 text-xs font-bold text-white transition-all hover:bg-[#146253] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingOrder ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Order...
                    </>
                  ) : (
                    <>
                      <Beaker className="h-4 w-4" />
                      Create Lab Order
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
