'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  FlaskConical,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  TestTube2,
  X,
  Zap,
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

interface Patient {
  _id: string;
  firstName?: string;
  lastName?: string;
  mrn?: string;
  gender?: string;
}

interface Doctor {
  _id: string;
  name?: string;
  email?: string;
}

interface LabOrder {
  _id: string;
  accessionNumber: string;
  patientId: Patient | string;
  doctorId: Doctor | string;
  testName: string;
  testCategory: LabDepartment;
  panelName?: string;
  priority: LabPriority;
  isStat: boolean;
  status: LabOrderStatus;
  sampleType: string;
  sampleCollectedAt?: string;
  specimenReceivedAt?: string;
  predictedTatMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

interface LabOrdersResponse {
  success?: boolean;
  orders: LabOrder[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface LabStats {
  total: number;
  pending: number;
  inProgress: number;
  urgent: number;
  completed: number;
}

/* =========================================================
   CONSTANTS
========================================================= */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const statusOptions: LabOrderStatus[] = [
  'PENDING',
  'SAMPLE_SCHEDULED',
  'SAMPLE_COLLECTED',
  'SPECIMEN_RECEIVED',
  'IN_PROGRESS',
  'RESULTS_RECORDED',
  'VERIFIED',
  'COMPLETED',
  'SAMPLE_REJECTED',
  'RECOLLECTION_REQUIRED',
  'CANCELLED',
];

const departmentOptions: LabDepartment[] = [
  'HAEMATOLOGY',
  'CLINICAL_CHEMISTRY',
  'MICROBIOLOGY',
  'PARASITOLOGY',
  'IMMUNOLOGY_SEROLOGY',
  'HISTOPATHOLOGY',
  'CYTOLOGY',
  'MOLECULAR_DIAGNOSTICS',
  'BLOOD_BANK_TRANSFUSION',
  'GENETICS_GENOMIC_TESTING',
];

const priorityOptions: LabPriority[] = [
  'ROUTINE',
  'URGENT',
  'STAT',
];

/* =========================================================
   HELPERS
========================================================= */

const formatLabel = (value?: string) => {
  if (!value) return '—';

  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatDate = (date?: string) => {
  if (!date) return '—';

  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

const getPatientName = (patient: Patient | string) => {
  if (!patient || typeof patient === 'string') {
    return 'Unknown Patient';
  }

  return (
    `${patient.firstName || ''} ${patient.lastName || ''}`.trim() ||
    'Unknown Patient'
  );
};

const getDoctorName = (doctor: Doctor | string) => {
  if (!doctor || typeof doctor === 'string') {
    return '—';
  }

  return doctor.name || doctor.email || '—';
};

const getStatusClasses = (status: LabOrderStatus) => {
  switch (status) {
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';

    case 'VERIFIED':
      return 'bg-blue-50 text-blue-700 border-blue-200';

    case 'RESULTS_RECORDED':
      return 'bg-violet-50 text-violet-700 border-violet-200';

    case 'IN_PROGRESS':
    case 'SPECIMEN_RECEIVED':
      return 'bg-amber-50 text-amber-700 border-amber-200';

    case 'SAMPLE_COLLECTED':
    case 'SAMPLE_SCHEDULED':
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';

    case 'SAMPLE_REJECTED':
    case 'RECOLLECTION_REQUIRED':
    case 'CANCELLED':
      return 'bg-red-50 text-red-700 border-red-200';

    case 'PENDING':
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const getPriorityClasses = (priority: LabPriority) => {
  switch (priority) {
    case 'STAT':
      return 'bg-red-50 text-red-700 border-red-200';

    case 'URGENT':
      return 'bg-orange-50 text-orange-700 border-orange-200';

    case 'ROUTINE':
    default:
      return 'bg-blue-50 text-blue-700 border-blue-200';
  }
};

/* =========================================================
   COMPONENT
========================================================= */

export default function LabPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');
  const [priority, setPriority] = useState('');
  const [statOnly, setStatOnly] = useState(false);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const [showFilters, setShowFilters] = useState(false);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);

  const stats = useMemo<LabStats>(() => {
    return {
      total,
      pending: orders.filter(
        (order) =>
          order.status === 'PENDING' ||
          order.status === 'SAMPLE_SCHEDULED'
      ).length,
      inProgress: orders.filter((order) =>
        [
          'SAMPLE_COLLECTED',
          'SPECIMEN_RECEIVED',
          'IN_PROGRESS',
          'RESULTS_RECORDED',
        ].includes(order.status)
      ).length,
      urgent: orders.filter(
        (order) =>
          order.priority === 'URGENT' ||
          order.priority === 'STAT' ||
          order.isStat
      ).length,
      completed: orders.filter(
        (order) => order.status === 'COMPLETED'
      ).length,
    };
  }, [orders, total]);

  /* =========================================================
     FETCH ORDERS
  ========================================================= */

  const fetchOrders = useCallback(
    async (showRefreshState = false) => {
      try {
        if (showRefreshState) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError('');

        const params = new URLSearchParams();

        params.set('page', String(page));
        params.set('limit', String(limit));

        if (status) {
          params.set('status', status);
        }

        if (department) {
          params.set('department', department);
        }

        if (priority) {
          params.set('priority', priority);
        }

        if (statOnly) {
          params.set('isStat', 'true');
        }

        const token =
          typeof window !== 'undefined'
            ? localStorage.getItem('token')
            : null;

        const response = await fetch(
          `${API_URL}/lab?${params.toString()}`,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(token
                ? {
                    Authorization: `Bearer ${token}`,
                  }
                : {}),
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || 'Failed to load laboratory orders.'
          );
        }

        setOrders(data.orders || []);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load laboratory orders.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      page,
      limit,
      status,
      department,
      priority,
      statOnly,
    ]
  );

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /* =========================================================
     FILTERED SEARCH RESULTS
     
     Backend already handles main filters. Search is done
     client-side so this works even if your backend query DTO
     does not yet include a generic search field.
  ========================================================= */

  const filteredOrders = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    if (!searchTerm) {
      return orders;
    }

    return orders.filter((order) => {
      const patientName = getPatientName(
        order.patientId
      ).toLowerCase();

      const mrn =
        typeof order.patientId === 'string'
          ? ''
          : order.patientId?.mrn?.toLowerCase() || '';

      return (
        order.accessionNumber
          .toLowerCase()
          .includes(searchTerm) ||
        order.testName
          .toLowerCase()
          .includes(searchTerm) ||
        patientName.includes(searchTerm) ||
        mrn.includes(searchTerm)
      );
    });
  }, [orders, search]);

  /* =========================================================
     HANDLERS
  ========================================================= */

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setDepartment('');
    setPriority('');
    setStatOnly(false);
    setPage(1);
  };

  const handleFilterChange = (
    setter: (value: string) => void,
    value: string
  ) => {
    setter(value);
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(search) ||
    Boolean(status) ||
    Boolean(department) ||
    Boolean(priority) ||
    statOnly;

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-[1700px] space-y-6 px-4 py-5 sm:px-6 lg:px-8">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#08345a] shadow-sm">
                <FlaskConical className="h-5 w-5 text-white" />
              </div>

              <span className="text-sm font-semibold uppercase tracking-[0.16em] text-[#2e7fc1]">
                MedxVerse Laboratory
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Laboratory
            </h1>

            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              Manage laboratory orders, specimens, testing and
              diagnostic results.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchOrders(true)}
              disabled={refreshing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? 'animate-spin' : ''
                }`}
              />
              Refresh
            </button>

            <button
              onClick={() => setShowNewOrderModal(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#08345a] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#062945]"
            >
              <Plus className="h-4 w-4" />
              New Lab Order
            </button>
          </div>
        </div>

        {/* =====================================================
            STATS
        ===================================================== */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Total Orders"
            value={stats.total}
            icon={<ClipboardList className="h-5 w-5" />}
            iconClass="bg-blue-50 text-[#2e7fc1]"
          />

          <StatCard
            label="Pending"
            value={stats.pending}
            icon={<Clock3 className="h-5 w-5" />}
            iconClass="bg-slate-100 text-slate-600"
          />

          <StatCard
            label="In Progress"
            value={stats.inProgress}
            icon={<Activity className="h-5 w-5" />}
            iconClass="bg-amber-50 text-amber-600"
          />

          <StatCard
            label="STAT / Urgent"
            value={stats.urgent}
            icon={<Zap className="h-5 w-5" />}
            iconClass="bg-red-50 text-red-600"
          />

          <StatCard
            label="Completed"
            value={stats.completed}
            icon={<CheckCircle2 className="h-5 w-5" />}
            iconClass="bg-emerald-50 text-emerald-600"
          />
        </div>

        {/* =====================================================
            WORKLIST
        ===================================================== */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* CARD HEADER */}

          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Laboratory Worklist
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Track and manage all laboratory requests and
                  specimen workflows.
                </p>
              </div>

              <div className="text-sm text-slate-500">
                {total} laboratory order
                {total === 1 ? '' : 's'}
              </div>
            </div>

            {/* SEARCH AND FILTERS */}

            <div className="mt-5 flex flex-col gap-3 xl:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search by patient, MRN, test or accession number..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2e7fc1] focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <button
                onClick={() =>
                  setShowFilters((current) => !current)
                }
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                  showFilters || hasActiveFilters
                    ? 'border-[#2e7fc1] bg-blue-50 text-[#08345a]'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters

                {hasActiveFilters && (
                  <span className="ml-1 h-2 w-2 rounded-full bg-[#2e7fc1]" />
                )}
              </button>
            </div>

            {/* FILTER PANEL */}

            {showFilters && (
              <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 xl:grid-cols-5">
                <select
                  value={status}
                  onChange={(event) =>
                    handleFilterChange(
                      setStatus,
                      event.target.value
                    )
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2e7fc1] focus:ring-4 focus:ring-blue-50"
                >
                  <option value="">All Statuses</option>

                  {statusOptions.map((item) => (
                    <option key={item} value={item}>
                      {formatLabel(item)}
                    </option>
                  ))}
                </select>

                <select
                  value={department}
                  onChange={(event) =>
                    handleFilterChange(
                      setDepartment,
                      event.target.value
                    )
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2e7fc1] focus:ring-4 focus:ring-blue-50"
                >
                  <option value="">All Departments</option>

                  {departmentOptions.map((item) => (
                    <option key={item} value={item}>
                      {formatLabel(item)}
                    </option>
                  ))}
                </select>

                <select
                  value={priority}
                  onChange={(event) =>
                    handleFilterChange(
                      setPriority,
                      event.target.value
                    )
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2e7fc1] focus:ring-4 focus:ring-blue-50"
                >
                  <option value="">All Priorities</option>

                  {priorityOptions.map((item) => (
                    <option key={item} value={item}>
                      {formatLabel(item)}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    setStatOnly((current) => !current);
                    setPage(1);
                  }}
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                    statOnly
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Zap className="h-4 w-4" />
                  STAT Only
                </button>

                <button
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          {/* ERROR */}

          {error && (
            <div className="m-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <div className="flex-1">
                <p className="font-semibold">
                  Unable to load laboratory orders
                </p>

                <p className="mt-1 text-red-600">
                  {error}
                </p>
              </div>

              <button
                onClick={() => fetchOrders()}
                className="font-semibold underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* LOADING */}

          {loading ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#2e7fc1]" />

              <p className="text-sm font-medium text-slate-500">
                Loading laboratory worklist...
              </p>
            </div>
          ) : filteredOrders.length === 0 ? (
            /* EMPTY STATE */

            <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                <TestTube2 className="h-8 w-8 text-[#2e7fc1]" />
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-900">
                No laboratory orders found
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                {hasActiveFilters
                  ? 'No laboratory orders match your current search or filters.'
                  : 'There are currently no laboratory orders in the worklist.'}
              </p>

              {hasActiveFilters ? (
                <button
                  onClick={clearFilters}
                  className="mt-5 text-sm font-semibold text-[#2e7fc1] hover:text-[#08345a]"
                >
                  Clear all filters
                </button>
              ) : (
                <button
                  onClick={() =>
                    setShowNewOrderModal(true)
                  }
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#08345a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#062945]"
                >
                  <Plus className="h-4 w-4" />
                  Create Lab Order
                </button>
              )}
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1150px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Accession
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Patient
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Test
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Department
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Priority
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Status
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Created
                      </th>

                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr
                        key={order._id}
                        onClick={() =>
                          router.push(`/lab/${order._id}`)
                        }
                        className="cursor-pointer border-b border-slate-100 transition last:border-0 hover:bg-slate-50/80"
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-[#08345a]">
                            {order.accessionNumber}
                          </div>

                          <div className="mt-1 text-xs text-slate-400">
                            {order.sampleType}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800">
                            {getPatientName(
                              order.patientId
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {typeof order.patientId !== 'string'
                              ? order.patientId?.mrn || 'No MRN'
                              : 'Patient ID unavailable'}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-800">
                            {order.testName}
                          </p>

                          {order.panelName && (
                            <p className="mt-1 text-xs text-slate-500">
                              {order.panelName}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">
                            {formatLabel(
                              order.testCategory
                            )}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${
                              getPriorityClasses(
                                order.priority
                              )
                            }`}
                          >
                            {order.isStat && (
                              <Zap className="h-3 w-3" />
                            )}

                            {formatLabel(
                              order.priority
                            )}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-bold ${
                              getStatusClasses(
                                order.status
                              )
                            }`}
                          >
                            {formatLabel(
                              order.status
                            )}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-500">
                          {formatDate(
                            order.createdAt
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();

                              router.push(
                                `/lab/${order._id}`
                              );
                            }}
                            className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold text-[#2e7fc1] transition hover:bg-blue-50 hover:text-[#08345a]"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE / TABLET CARDS */}

              <div className="divide-y divide-slate-100 lg:hidden">
                {filteredOrders.map((order) => (
                  <button
                    key={order._id}
                    onClick={() =>
                      router.push(`/lab/${order._id}`)
                    }
                    className="block w-full px-5 py-5 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-[#08345a]">
                          {order.accessionNumber}
                        </p>

                        <p className="mt-1 font-semibold text-slate-800">
                          {getPatientName(
                            order.patientId
                          )}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {order.testName}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-bold ${
                          getStatusClasses(
                            order.status
                          )
                        }`}
                      >
                        {formatLabel(order.status)}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {formatLabel(
                          order.testCategory
                        )}
                      </span>

                      <span
                        className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${
                          getPriorityClasses(
                            order.priority
                          )
                        }`}
                      >
                        {formatLabel(
                          order.priority
                        )}
                      </span>
                    </div>

                    <p className="mt-4 text-xs text-slate-400">
                      {formatDate(order.createdAt)}
                    </p>
                  </button>
                ))}
              </div>

              {/* PAGINATION */}

              {pages > 1 && (
                <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 px-5 py-4 sm:flex-row sm:px-6">
                  <p className="text-sm text-slate-500">
                    Page{' '}
                    <span className="font-semibold text-slate-700">
                      {page}
                    </span>{' '}
                    of{' '}
                    <span className="font-semibold text-slate-700">
                      {pages}
                    </span>
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setPage((current) =>
                          Math.max(1, current - 1)
                        )
                      }
                      disabled={page === 1}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>

                    <button
                      onClick={() =>
                        setPage((current) =>
                          Math.min(pages, current + 1)
                        )
                      }
                      disabled={page === pages}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* =====================================================
          NEW ORDER MODAL PLACEHOLDER
          
          We will connect this to your patient and consultation
          APIs after the main laboratory page is confirmed.
      ===================================================== */}

      {showNewOrderModal && (
        <NewLabOrderModal
          onClose={() =>
            setShowNewOrderModal(false)
          }
          onSuccess={() => {
            setShowNewOrderModal(false);
            fetchOrders(true);
          }}
        />
      )}
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  label,
  value,
  icon,
  iconClass,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   NEW LAB ORDER MODAL
========================================================= */

function NewLabOrderModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [submitting, setSubmitting] =
    useState(false);

  const [form, setForm] = useState({
    patientId: '',
    testName: '',
    testCategory: 'HAEMATOLOGY',
    sampleType: '',
    priority: 'ROUTINE',
    isStat: false,
    notes: '',
  });

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      !form.patientId.trim() ||
      !form.testName.trim() ||
      !form.sampleType.trim()
    ) {
      alert(
        'Patient ID, test name and sample type are required.'
      );
      return;
    }

    try {
      setSubmitting(true);

      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('token')
          : null;

      const response = await fetch(
        `${API_URL}/lab`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Failed to create laboratory order.'
        );
      }

      onSuccess();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : 'Failed to create laboratory order.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* MODAL HEADER */}

        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              New Laboratory Order
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Create a new electronic laboratory requisition.
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={submitting}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* FORM */}

        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-6"
        >
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Patient ID
            </label>

            <input
              value={form.patientId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  patientId: event.target.value,
                }))
              }
              placeholder="Enter patient ID"
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#2e7fc1] focus:ring-4 focus:ring-blue-50"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Test Name
            </label>

            <input
              value={form.testName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  testName: event.target.value,
                }))
              }
              placeholder="e.g. Full Blood Count"
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#2e7fc1] focus:ring-4 focus:ring-blue-50"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Department
              </label>

              <select
                value={form.testCategory}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    testCategory: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#2e7fc1] focus:ring-4 focus:ring-blue-50"
              >
                {departmentOptions.map((item) => (
                  <option key={item} value={item}>
                    {formatLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Sample Type
              </label>

              <input
                value={form.sampleType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sampleType: event.target.value,
                  }))
                }
                placeholder="e.g. Whole Blood"
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#2e7fc1] focus:ring-4 focus:ring-blue-50"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Priority
              </label>

              <select
                value={form.priority}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priority: event.target.value,
                    isStat:
                      event.target.value === 'STAT',
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#2e7fc1] focus:ring-4 focus:ring-blue-50"
              >
                {priorityOptions.map((item) => (
                  <option key={item} value={item}>
                    {formatLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex h-11 cursor-pointer items-center gap-3 self-end rounded-xl border border-slate-200 px-4">
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
                className="h-4 w-4 rounded border-slate-300 text-[#2e7fc1] focus:ring-[#2e7fc1]"
              />

              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Zap className="h-4 w-4 text-red-500" />
                Mark as STAT
              </span>
            </label>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Notes
              <span className="ml-1 font-normal text-slate-400">
                (Optional)
              </span>
            </label>

            <textarea
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              placeholder="Add any clinical notes or special instructions..."
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#2e7fc1] focus:ring-4 focus:ring-blue-50"
            />
          </div>

          {/* FOOTER */}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#08345a] px-5 text-sm font-semibold text-white transition hover:bg-[#062945] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}

              {submitting
                ? 'Creating Order...'
                : 'Create Lab Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}