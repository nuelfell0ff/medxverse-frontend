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
  Filter,
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
  { value: 'IMMUNOLOGY_SEROLOGY', label: 'Immunology / Serology' },
  { value: 'HISTOPATHOLOGY', label: 'Histopathology' },
  { value: 'CYTOLOGY', label: 'Cytology' },
  { value: 'MOLECULAR_DIAGNOSTICS', label: 'Molecular Diagnostics' },
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

function getEntityId(entity?: PopulatedEntity | string): string {
  if (!entity) return '';

  if (typeof entity === 'string') return entity;

  return entity._id || entity.id || '';
}

function getPatientName(patient?: PopulatedEntity | string): string {
  if (!patient) return 'Unknown Patient';

  if (typeof patient === 'string') return patient;

  const name = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();

  return name || patient.name || 'Unknown Patient';
}

function getDoctorName(doctor?: PopulatedEntity | string): string {
  if (!doctor) return '—';

  if (typeof doctor === 'string') return doctor;

  return doctor.name || doctor.email || '—';
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
      return 'border-emerald-100 bg-emerald-50 text-emerald-700';

    case 'VERIFIED':
      return 'border-blue-100 bg-blue-50 text-blue-700';

    case 'RESULTS_RECORDED':
      return 'border-indigo-100 bg-indigo-50 text-indigo-700';

    case 'IN_PROGRESS':
      return 'border-amber-100 bg-amber-50 text-amber-700';

    case 'SAMPLE_COLLECTED':
    case 'SPECIMEN_RECEIVED':
      return 'border-cyan-100 bg-cyan-50 text-cyan-700';

    case 'SAMPLE_REJECTED':
    case 'RECOLLECTION_REQUIRED':
      return 'border-red-100 bg-red-50 text-red-700';

    case 'CANCELLED':
      return 'border-slate-200 bg-slate-100 text-slate-600';

    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

function getPriorityClasses(priority?: string): string {
  switch (priority) {
    case 'STAT':
      return 'border-red-200 bg-red-50 text-red-700';

    case 'URGENT':
      return 'border-orange-200 bg-orange-50 text-orange-700';

    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
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
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [creatingOrder, setCreatingOrder] =
    useState(false);

  const [createError, setCreateError] =
    useState('');

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
          params.set('accessionNumber', search.trim());
        }

        if (statusFilter !== 'ALL') {
          params.set('status', statusFilter);
        }

        if (priorityFilter !== 'ALL') {
          params.set('priority', priorityFilter);
        }

        if (departmentFilter !== 'ALL') {
          params.set('department', departmentFilter);
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
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#08345a]">
                <FlaskConical className="h-5 w-5 text-white" />
              </div>

              <span className="text-sm font-medium text-[#2e7fc1]">
                MedxVerse Laboratory
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Laboratory Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage laboratory orders, specimens, testing,
              results, and diagnostic workflows.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fetchOrders(page, true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? 'animate-spin' : ''
                }`}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => {
                setCreateError('');
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#08345a] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#062a49]"
            >
              <Plus className="h-4 w-4" />
              New Lab Order
            </button>
          </div>
        </div>

        {/* =====================================================
            STATS
        ===================================================== */}

        <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Active Orders
                </p>

                <h2 className="mt-2 text-3xl font-bold text-slate-900">
                  {stats.pending}
                </h2>

                <p className="mt-2 text-xs text-slate-400">
                  Currently in workflow
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 p-3">
                <ClipboardList className="h-5 w-5 text-[#2e7fc1]" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  In Progress
                </p>

                <h2 className="mt-2 text-3xl font-bold text-slate-900">
                  {stats.inProgress}
                </h2>

                <p className="mt-2 text-xs text-slate-400">
                  Specimens being processed
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 p-3">
                <Activity className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Completed
                </p>

                <h2 className="mt-2 text-3xl font-bold text-slate-900">
                  {stats.completed}
                </h2>

                <p className="mt-2 text-xs text-slate-400">
                  Results authorized
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Priority / STAT
                </p>

                <h2 className="mt-2 text-3xl font-bold text-slate-900">
                  {stats.critical}
                </h2>

                <p className="mt-2 text-xs text-slate-400">
                  Requires priority attention
                </p>
              </div>

              <div className="rounded-xl bg-red-50 p-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            WORKLIST
        ===================================================== */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* WORKLIST HEADER */}

          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Laboratory Worklist
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {total} laboratory order
                    {total === 1 ? '' : 's'} found
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock3 className="h-4 w-4" />
                  Real-time workflow monitoring
                </div>
              </div>

              {/* FILTERS */}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div className="relative xl:col-span-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search accession number..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2e7fc1] focus:ring-4 focus:ring-[#2e7fc1]/10"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2e7fc1] focus:ring-4 focus:ring-[#2e7fc1]/10"
                >
                  <option value="ALL">
                    All Statuses
                  </option>

                  <option value="PENDING">
                    Pending
                  </option>

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

                  <option value="VERIFIED">
                    Verified
                  </option>

                  <option value="COMPLETED">
                    Completed
                  </option>

                  <option value="SAMPLE_REJECTED">
                    Sample Rejected
                  </option>

                  <option value="RECOLLECTION_REQUIRED">
                    Recollection Required
                  </option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(event) =>
                    setPriorityFilter(event.target.value)
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2e7fc1] focus:ring-4 focus:ring-[#2e7fc1]/10"
                >
                  <option value="ALL">
                    All Priorities
                  </option>

                  <option value="ROUTINE">
                    Routine
                  </option>

                  <option value="URGENT">
                    Urgent
                  </option>

                  <option value="STAT">
                    STAT
                  </option>
                </select>

                <select
                  value={departmentFilter}
                  onChange={(event) =>
                    setDepartmentFilter(event.target.value)
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2e7fc1] focus:ring-4 focus:ring-[#2e7fc1]/10"
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

          {/* ERROR */}

          {error && (
            <div className="mx-5 mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:mx-6">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="font-semibold">
                  Unable to load laboratory orders
                </p>

                <p className="mt-1 text-red-600">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* LOADING */}

          {loading ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#2e7fc1]" />

              <p className="mt-4 text-sm text-slate-500">
                Loading laboratory worklist...
              </p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <TestTube2 className="h-7 w-7 text-slate-400" />
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-900">
                No laboratory orders found
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Create a new laboratory order or adjust your
                filters to view available orders.
              </p>

              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#08345a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#062a49]"
              >
                <Plus className="h-4 w-4" />
                Create Lab Order
              </button>
            </div>
          ) : (
            <>
              {/* MOBILE CARDS */}

              <div className="divide-y divide-slate-100 lg:hidden">
                {orders.map((order) => (
                  <Link
                    key={order._id}
                    href={`/lab/${order._id}`}
                    className="block p-5 transition hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {getPatientName(order.patientId)}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {order.accessionNumber}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getPriorityClasses(
                          order.priority
                        )}`}
                      >
                        {order.isStat
                          ? 'STAT'
                          : order.priority}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-slate-400">
                          Test
                        </p>

                        <p className="mt-1 font-medium text-slate-700">
                          {order.testName}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Department
                        </p>

                        <p className="mt-1 font-medium text-slate-700">
                          {formatDepartment(
                            order.testCategory
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusClasses(
                          order.status
                        )}`}
                      >
                        {formatStatus(order.status)}
                      </span>

                      <span className="text-xs text-slate-400">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {/* DESKTOP TABLE */}

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1150px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70">
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Patient / Accession
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Test
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Department
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Priority
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        TAT
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Ordered
                      </th>

                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {orders.map((order) => (
                      <tr
                        key={order._id}
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {getPatientName(
                                order.patientId
                              )}
                            </p>

                            <div className="mt-1 flex items-center gap-2">
                              <span className="font-mono text-xs text-[#2e7fc1]">
                                {order.accessionNumber}
                              </span>

                              {typeof order.patientId ===
                                'object' &&
                                order.patientId?.mrn && (
                                  <span className="text-xs text-slate-400">
                                    {order.patientId.mrn}
                                  </span>
                                )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-800">
                            {order.testName}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {order.sampleType}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-sm text-slate-600">
                            {formatDepartment(
                              order.testCategory
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getPriorityClasses(
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

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                              order.status
                            )}`}
                          >
                            {formatStatus(order.status)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-sm text-slate-600">
                            {order.predictedTatMinutes
                              ? `${order.predictedTatMinutes} min`
                              : '—'}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-sm text-slate-600">
                            {formatDate(order.createdAt)}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/lab/${order._id}`}
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#2e7fc1] transition hover:bg-blue-50"
                          >
                            View
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}

              <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-sm text-slate-500">
                  Page {page} of {pages}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => fetchOrders(page - 1)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    disabled={page >= pages || loading}
                    onClick={() => fetchOrders(page + 1)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* =====================================================
          CREATE ORDER MODAL
      ===================================================== */}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Create Laboratory Order
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Create a digital laboratory requisition.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  !creatingOrder &&
                  setShowCreateModal(false)
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateOrder}
              className="p-5 sm:p-6"
            >
              {createError && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                  <p>{createError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* PATIENT ID */}

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2e7fc1] focus:ring-4 focus:ring-[#2e7fc1]/10"
                  />
                </div>

                {/* DOCTOR ID */}

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2e7fc1] focus:ring-4 focus:ring-[#2e7fc1]/10"
                  />
                </div>

                {/* TEST NAME */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2e7fc1] focus:ring-4 focus:ring-[#2e7fc1]/10"
                  />
                </div>

                {/* SAMPLE TYPE */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2e7fc1] focus:ring-4 focus:ring-[#2e7fc1]/10"
                  />
                </div>

                {/* DEPARTMENT */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2e7fc1] focus:ring-4 focus:ring-[#2e7fc1]/10"
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
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2e7fc1] focus:ring-4 focus:ring-[#2e7fc1]/10"
                  >
                    <option value="ROUTINE">
                      Routine
                    </option>

                    <option value="URGENT">
                      Urgent
                    </option>

                    <option value="STAT">
                      STAT
                    </option>
                  </select>
                </div>

                {/* STAT */}

                <div className="sm:col-span-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
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
                      className="h-4 w-4 rounded border-slate-300 text-[#08345a] focus:ring-[#2e7fc1]"
                    />

                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Mark as STAT
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        Prioritize this specimen for immediate
                        laboratory processing.
                      </p>
                    </div>
                  </label>
                </div>

                {/* NOTES */}

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2e7fc1] focus:ring-4 focus:ring-[#2e7fc1]/10"
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
                  className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creatingOrder}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#08345a] px-5 text-sm font-semibold text-white transition hover:bg-[#062a49] disabled:cursor-not-allowed disabled:opacity-60"
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
