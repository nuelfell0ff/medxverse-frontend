'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
  FlaskConical,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  TestTube2,
  UserRound,
  Users,
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

interface Patient {
  _id: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  mrn?: string;
  email?: string;
  phone?: string;
}

interface Staff {
  _id: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  role?: string;
  jobTitle?: string;
  designation?: string;
  accountType?: string;
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
  totalPages?: number;

  data?: {
    orders?: LabOrder[];
    total?: number;
    page?: number;
    limit?: number;
    pages?: number;
    totalPages?: number;
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

const API_V1_URL = `${API_BASE_URL}/api/v1`;

const LAB_API_URL = `${API_V1_URL}/lab`;
const PATIENTS_API_URL = `${API_V1_URL}/patients`;
const STAFF_API_URL = `${API_V1_URL}/staff`;

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
  {
    value: 'HAEMATOLOGY',
    label: 'Haematology',
  },
  {
    value: 'CLINICAL_CHEMISTRY',
    label: 'Clinical Chemistry',
  },
  {
    value: 'MICROBIOLOGY',
    label: 'Microbiology',
  },
  {
    value: 'PARASITOLOGY',
    label: 'Parasitology',
  },
  {
    value: 'IMMUNOLOGY_SEROLOGY',
    label: 'Immunology / Serology',
  },
  {
    value: 'HISTOPATHOLOGY',
    label: 'Histopathology',
  },
  {
    value: 'CYTOLOGY',
    label: 'Cytology',
  },
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

function getAuthHeaders(): HeadersInit {
  const token = getToken();

  return {
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
}

function getEntityId(entity?: PopulatedEntity | string): string {
  if (!entity) return '';

  if (typeof entity === 'string') return entity;

  return entity._id || entity.id || '';
}

function getPatientName(patient?: PopulatedEntity | string): string {
  if (!patient) return 'Unknown Patient';

  if (typeof patient === 'string') return patient;

  const fullName =
    `${patient.firstName || ''} ${patient.lastName || ''}`.trim();

  return fullName || patient.name || 'Unknown Patient';
}

function getDoctorName(doctor?: PopulatedEntity | string): string {
  if (!doctor) return '—';

  if (typeof doctor === 'string') return doctor;

  const fullName =
    `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim();

  return fullName || doctor.name || doctor.email || '—';
}

function getPatientDisplayName(patient: Patient): string {
  const fullName =
    `${patient.firstName || ''} ${patient.lastName || ''}`.trim();

  return fullName || patient.name || 'Unnamed Patient';
}

function getStaffDisplayName(staff: Staff): string {
  const fullName =
    `${staff.firstName || ''} ${staff.lastName || ''}`.trim();

  return fullName || staff.name || staff.email || 'Unnamed Staff';
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
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';

    case 'VERIFIED':
      return 'bg-teal-50 text-teal-700 border-teal-100';

    case 'RESULTS_RECORDED':
      return 'bg-blue-50 text-blue-700 border-blue-100';

    case 'IN_PROGRESS':
      return 'bg-amber-50 text-amber-700 border-amber-100';

    case 'SAMPLE_COLLECTED':
    case 'SPECIMEN_RECEIVED':
      return 'bg-cyan-50 text-cyan-700 border-cyan-100';

    case 'SAMPLE_REJECTED':
    case 'RECOLLECTION_REQUIRED':
      return 'bg-rose-50 text-rose-700 border-rose-100';

    case 'CANCELLED':
      return 'bg-slate-100 text-slate-600 border-slate-200';

    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

function getPriorityClasses(priority?: string): string {
  switch (priority) {
    case 'STAT':
      return 'bg-rose-50 text-rose-700 border-rose-100';

    case 'URGENT':
      return 'bg-orange-50 text-orange-700 border-orange-100';

    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
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

  /*
   * Patient selection
   */
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [loadingPatients, setLoadingPatients] =
    useState(false);
  const [selectedPatient, setSelectedPatient] =
    useState<Patient | null>(null);

  /*
   * Doctor / staff selection
   */
  const [staff, setStaff] = useState<Staff[]>([]);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [loadingStaff, setLoadingStaff] =
    useState(false);
  const [selectedDoctor, setSelectedDoctor] =
    useState<Staff | null>(null);

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
              ...getAuthHeaders(),
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
          }
        );

        const result: LabOrdersResponse =
          await response.json().catch(() => ({}));

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

        setPages(
          responseData.pages ||
            responseData.totalPages ||
            1
        );
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
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchOrders]);

  /* =========================================================
     FETCH PATIENTS
  ========================================================= */

  const fetchPatients = useCallback(
    async (queryTerm = '') => {
      try {
        setLoadingPatients(true);

        const params = new URLSearchParams();

        params.set('limit', '10');

        if (queryTerm.trim()) {
          params.set('search', queryTerm.trim());
        }

        const response = await fetch(
          `${PATIENTS_API_URL}?${params.toString()}`,
          {
            headers: getAuthHeaders(),
          }
        );

        const json = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            json?.message ||
              'Failed to load patients.'
          );
        }

        const data = json?.data || json;

        const patientRows =
          data?.patients ||
          data?.items ||
          data?.results ||
          (Array.isArray(data) ? data : []);

        setPatients(
          Array.isArray(patientRows)
            ? patientRows
            : []
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

  /* =========================================================
     FETCH DOCTORS FROM STAFF
  ========================================================= */

  const fetchDoctors = useCallback(
    async (queryTerm = '') => {
      try {
        setLoadingStaff(true);

        const params = new URLSearchParams();

        params.set('isActive', 'true');

        /*
         * This matches the appointment/surgery pattern
         * and asks the backend for doctors.
         */
        params.set('role', 'DOCTOR');

        if (queryTerm.trim()) {
          params.set('search', queryTerm.trim());
        }

        const response = await fetch(
          `${STAFF_API_URL}?${params.toString()}`,
          {
            headers: getAuthHeaders(),
          }
        );

        const json = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            json?.message ||
              'Failed to load doctors.'
          );
        }

        const data = json?.data || json;

        const staffRows =
          data?.staff ||
          data?.items ||
          data?.results ||
          (Array.isArray(data) ? data : []);

        setStaff(
          Array.isArray(staffRows)
            ? staffRows
            : []
        );
      } catch (err) {
        console.error(
          'Failed to search doctors:',
          err
        );

        setStaff([]);
      } finally {
        setLoadingStaff(false);
      }
    },
    []
  );

  /*
   * Search patients only while modal is open
   */
  useEffect(() => {
    if (!showCreateModal) return;

    const timer = setTimeout(() => {
      fetchPatients(patientSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [
    patientSearch,
    showCreateModal,
    fetchPatients,
  ]);

  /*
   * Search doctors only while modal is open
   */
  useEffect(() => {
    if (!showCreateModal) return;

    const timer = setTimeout(() => {
      fetchDoctors(doctorSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [
    doctorSearch,
    showCreateModal,
    fetchDoctors,
  ]);

  /* =========================================================
     MODAL HELPERS
  ========================================================= */

  const openCreateModal = () => {
    setCreateError('');
    setForm(INITIAL_FORM);

    setPatients([]);
    setPatientSearch('');
    setSelectedPatient(null);

    setStaff([]);
    setDoctorSearch('');
    setSelectedDoctor(null);

    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (creatingOrder) return;

    setShowCreateModal(false);
    setCreateError('');

    setPatients([]);
    setPatientSearch('');
    setSelectedPatient(null);

    setStaff([]);
    setDoctorSearch('');
    setSelectedDoctor(null);
  };

  const selectPatient = (patient: Patient) => {
    const patientId = patient._id || patient.id || '';

    setSelectedPatient(patient);

    setForm((current) => ({
      ...current,
      patientId,
    }));

    setPatientSearch('');
    setPatients([]);
  };

  const selectDoctor = (doctor: Staff) => {
    const doctorId = doctor._id || doctor.id || '';

    setSelectedDoctor(doctor);

    setForm((current) => ({
      ...current,
      doctorId,
    }));

    setDoctorSearch('');
    setStaff([]);
  };

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

      if (!form.patientId) {
        throw new Error(
          'Please select a patient.'
        );
      }

      const payload = {
        patientId: form.patientId,
        doctorId: form.doctorId || undefined,
        testName: form.testName.trim(),
        testCategory: form.testCategory,
        sampleType: form.sampleType.trim(),
        priority: form.isStat
          ? 'STAT'
          : form.priority,
        isStat: form.isStat,
        notes: form.notes.trim() || undefined,
      };

      const response = await fetch(
        LAB_API_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message ||
            'Failed to create laboratory order.'
        );
      }

      setShowCreateModal(false);
      setForm(INITIAL_FORM);

      setPatients([]);
      setPatientSearch('');
      setSelectedPatient(null);

      setStaff([]);
      setDoctorSearch('');
      setSelectedDoctor(null);

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
      (order) =>
        order.status === 'COMPLETED'
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
          HEADER
      ===================================================== */}

      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#e8f5f3]">
              <FlaskConical className="h-4.5 w-4.5 text-[#1b7b68]" />
            </div>

            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#1b7b68]">
              MedxVerse Laboratory
            </span>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Laboratory Management
          </h1>

          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            Manage laboratory orders, specimens,
            testing, results and diagnostic workflows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              fetchOrders(page, true)
            }
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing
                  ? 'animate-spin'
                  : ''
              }`}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#1b7b68] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#146253]"
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
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Active Orders
              </p>

              <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
                {stats.pending}
              </h2>

              <p className="mt-2 text-xs font-medium text-slate-400">
                Currently in workflow
              </p>
            </div>

            <div className="rounded-2xl bg-[#e8f5f3] p-3">
              <ClipboardList className="h-5 w-5 text-[#1b7b68]" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                In Progress
              </p>

              <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
                {stats.inProgress}
              </h2>

              <p className="mt-2 text-xs font-medium text-slate-400">
                Specimens being processed
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50 p-3">
              <Activity className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Completed
              </p>

              <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
                {stats.completed}
              </h2>

              <p className="mt-2 text-xs font-medium text-slate-400">
                Results authorized
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Priority / STAT
              </p>

              <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
                {stats.critical}
              </h2>

              <p className="mt-2 text-xs font-medium text-slate-400">
                Requires priority attention
              </p>
            </div>

            <div className="rounded-2xl bg-rose-50 p-3">
              <AlertCircle className="h-5 w-5 text-rose-600" />
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          WORKLIST
      ===================================================== */}

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        {/* HEADER + FILTERS */}

        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Laboratory Worklist
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  {total} laboratory order
                  {total === 1 ? '' : 's'} found
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <Clock3 className="h-4 w-4 text-[#1b7b68]" />
                Real-time workflow monitoring
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="relative xl:col-span-2">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search accession number..."
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="h-11 rounded-2xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-600 outline-none transition-all focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
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

                <option value="CANCELLED">
                  Cancelled
                </option>
              </select>

              <select
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(
                    event.target.value
                  )
                }
                className="h-11 rounded-2xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-600 outline-none transition-all focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
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
                  setDepartmentFilter(
                    event.target.value
                  )
                }
                className="h-11 rounded-2xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-600 outline-none transition-all focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
              >
                <option value="ALL">
                  All Departments
                </option>

                {DEPARTMENTS.map(
                  (department) => (
                    <option
                      key={department.value}
                      value={department.value}
                    >
                      {department.label}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="m-5 flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-xs text-rose-700 sm:m-6">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-bold">
                Unable to load laboratory orders
              </p>

              <p className="mt-1 text-rose-600">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* LOADING */}

        {loading ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f5f3]">
              <Loader2 className="h-5 w-5 animate-spin text-[#1b7b68]" />
            </div>

            <p className="mt-4 text-xs font-medium text-slate-400">
              Loading laboratory worklist...
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#e8f5f3]">
              <TestTube2 className="h-7 w-7 text-[#1b7b68]" />
            </div>

            <h3 className="mt-5 text-base font-extrabold text-slate-900">
              No laboratory orders found
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
              Create a new laboratory order or
              adjust your filters to view
              available orders.
            </p>

            <button
              type="button"
              onClick={openCreateModal}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#1b7b68] px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-[#146253]"
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
                  className="block p-5 transition-all hover:bg-slate-50/70"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {getPatientName(
                          order.patientId
                        )}
                      </p>

                      <p className="mt-1 font-mono text-[11px] font-medium text-[#1b7b68]">
                        {order.accessionNumber}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                        getPriorityClasses(
                          order.isStat
                            ? 'STAT'
                            : order.priority
                        )
                      }`}
                    >
                      {order.isStat
                        ? 'STAT'
                        : order.priority}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Test
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-700">
                        {order.testName}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Department
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-700">
                        {formatDepartment(
                          order.testCategory
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${getStatusClasses(
                        order.status
                      )}`}
                    >
                      {formatStatus(order.status)}
                    </span>

                    <span className="text-[11px] text-slate-400">
                      {formatDate(
                        order.createdAt
                      )}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* DESKTOP TABLE */}

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1150px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                      Patient / Accession
                    </th>

                    <th className="px-5 py-4 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                      Test
                    </th>

                    <th className="px-5 py-4 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                      Department
                    </th>

                    <th className="px-5 py-4 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                      Priority
                    </th>

                    <th className="px-5 py-4 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-4 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                      TAT
                    </th>

                    <th className="px-5 py-4 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                      Ordered
                    </th>

                    <th className="px-6 py-4 text-right text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <tr
                      key={order._id}
                      className="transition-all hover:bg-slate-50/70"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {getPatientName(
                              order.patientId
                            )}
                          </p>

                          <div className="mt-1 flex items-center gap-2">
                            <span className="font-mono text-[11px] font-semibold text-[#1b7b68]">
                              {order.accessionNumber}
                            </span>

                            {typeof order.patientId ===
                              'object' &&
                              order.patientId?.mrn && (
                                <span className="text-[11px] text-slate-400">
                                  {order.patientId.mrn}
                                </span>
                              )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-xs font-bold text-slate-800">
                          {order.testName}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400">
                          {order.sampleType}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-xs font-medium text-slate-600">
                          {formatDepartment(
                            order.testCategory
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${getPriorityClasses(
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
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${getStatusClasses(
                            order.status
                          )}`}
                        >
                          {formatStatus(
                            order.status
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-xs font-medium text-slate-500">
                          {order.predictedTatMinutes
                            ? `${order.predictedTatMinutes} min`
                            : '—'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-xs font-medium text-slate-500">
                          {formatDate(
                            order.createdAt
                          )}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/lab/${order._id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-[#1b7b68] transition-all hover:bg-[#e8f5f3]"
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

            <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs font-medium text-slate-400">
                Showing page{' '}
                <strong className="text-slate-700">
                  {page}
                </strong>{' '}
                of{' '}
                <strong className="text-slate-700">
                  {pages}
                </strong>
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={
                    page <= 1 || loading
                  }
                  onClick={() =>
                    fetchOrders(page - 1)
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  disabled={
                    page >= pages || loading
                  }
                  onClick={() =>
                    fetchOrders(page + 1)
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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
          <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] bg-white shadow-2xl sm:rounded-3xl">
            {/* MODAL HEADER */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-5 sm:px-6">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#e8f5f3]">
                    <Beaker className="h-4 w-4 text-[#1b7b68]" />
                  </div>

                  <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#1b7b68]">
                    New Requisition
                  </span>
                </div>

                <h2 className="text-lg font-extrabold text-slate-900">
                  Create Laboratory Order
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Create a digital laboratory
                  requisition and assign a patient.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                disabled={creatingOrder}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateOrder}
              className="p-5 sm:p-6"
            >
              {createError && (
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-xs text-rose-700">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                  <div>
                    <p className="font-bold">
                      Unable to create laboratory
                      order
                    </p>

                    <p className="mt-1">
                      {createError}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* =========================================
                    PATIENT SELECTION
                ========================================= */}

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#e8f5f3]">
                      <UserRound className="h-4 w-4 text-[#1b7b68]" />
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800">
                        Patient
                      </h3>

                      <p className="text-[11px] text-slate-400">
                        Search and select the patient
                        for this laboratory order.
                      </p>
                    </div>
                  </div>

                  {selectedPatient ? (
                    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#1b7b68]/15 bg-[#e8f5f3]/60 p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1b7b68] text-white">
                          <UserRound className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-xs font-extrabold text-slate-800">
                            {getPatientDisplayName(
                              selectedPatient
                            )}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-500">
                            {selectedPatient.mrn
                              ? `MRN: ${selectedPatient.mrn}`
                              : selectedPatient.email ||
                                'Selected patient'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatient(null);

                          setForm((current) => ({
                            ...current,
                            patientId: '',
                          }));
                        }}
                        className="rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-rose-600 shadow-sm transition-all hover:bg-rose-50"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          autoFocus
                          value={patientSearch}
                          onChange={(event) =>
                            setPatientSearch(
                              event.target.value
                            )
                          }
                          placeholder="Search patient by name, MRN or other details..."
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 text-xs font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
                        />

                        {loadingPatients && (
                          <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#1b7b68]" />
                        )}
                      </div>

                      {(loadingPatients ||
                        patients.length > 0) && (
                        <div className="mt-2 max-h-56 overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-lg">
                          {loadingPatients &&
                          patients.length === 0 ? (
                            <div className="flex items-center gap-2 p-4 text-xs text-slate-400">
                              <Loader2 className="h-4 w-4 animate-spin text-[#1b7b68]" />
                              Searching patients...
                            </div>
                          ) : (
                            patients.map(
                              (patient) => (
                                <button
                                  key={
                                    patient._id ||
                                    patient.id
                                  }
                                  type="button"
                                  onClick={() =>
                                    selectPatient(
                                      patient
                                    )
                                  }
                                  className="flex w-full items-center gap-3 border-b border-slate-50 p-4 text-left transition-all last:border-0 hover:bg-[#e8f5f3]/60"
                                >
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                    <UserRound className="h-4 w-4" />
                                  </div>

                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-bold text-slate-800">
                                      {getPatientDisplayName(
                                        patient
                                      )}
                                    </p>

                                    <p className="mt-1 truncate text-[11px] text-slate-400">
                                      {patient.mrn
                                        ? `MRN: ${patient.mrn}`
                                        : patient.email ||
                                          patient.phone ||
                                          'Patient record'}
                                    </p>
                                  </div>
                                </button>
                              )
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* =========================================
                    REQUESTING DOCTOR
                ========================================= */}

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#e8f5f3]">
                      <Users className="h-4 w-4 text-[#1b7b68]" />
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800">
                        Requesting Doctor
                        <span className="ml-1 font-medium text-slate-400">
                          (optional)
                        </span>
                      </h3>

                      <p className="text-[11px] text-slate-400">
                        Search active doctors from the
                        hospital staff directory.
                      </p>
                    </div>
                  </div>

                  {selectedDoctor ? (
                    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#1b7b68]/15 bg-[#e8f5f3]/60 p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1b7b68] text-white">
                          <Users className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-xs font-extrabold text-slate-800">
                            {getStaffDisplayName(
                              selectedDoctor
                            )}
                          </p>

                          <p className="mt-1 truncate text-[11px] text-slate-500">
                            {selectedDoctor.role ||
                              selectedDoctor.jobTitle ||
                              selectedDoctor.designation ||
                              selectedDoctor.email ||
                              'Hospital staff'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDoctor(null);

                          setForm((current) => ({
                            ...current,
                            doctorId: '',
                          }));
                        }}
                        className="rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-rose-600 shadow-sm transition-all hover:bg-rose-50"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          value={doctorSearch}
                          onChange={(event) =>
                            setDoctorSearch(
                              event.target.value
                            )
                          }
                          placeholder="Search doctors..."
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 text-xs font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
                        />

                        {loadingStaff && (
                          <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#1b7b68]" />
                        )}
                      </div>

                      {(loadingStaff ||
                        staff.length > 0) && (
                        <div className="mt-2 max-h-56 overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-lg">
                          {loadingStaff &&
                          staff.length === 0 ? (
                            <div className="flex items-center gap-2 p-4 text-xs text-slate-400">
                              <Loader2 className="h-4 w-4 animate-spin text-[#1b7b68]" />
                              Searching doctors...
                            </div>
                          ) : (
                            staff.map((person) => (
                              <button
                                key={
                                  person._id ||
                                  person.id
                                }
                                type="button"
                                onClick={() =>
                                  selectDoctor(
                                    person
                                  )
                                }
                                className="flex w-full items-center gap-3 border-b border-slate-50 p-4 text-left transition-all last:border-0 hover:bg-[#e8f5f3]/60"
                              >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                  <Users className="h-4 w-4" />
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate text-xs font-bold text-slate-800">
                                    {getStaffDisplayName(
                                      person
                                    )}
                                  </p>

                                  <p className="mt-1 truncate text-[11px] text-slate-400">
                                    {person.role ||
                                      person.jobTitle ||
                                      person.designation ||
                                      person.email ||
                                      'Hospital staff'}
                                  </p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* =========================================
                    TEST INFORMATION
                ========================================= */}

                <div>
                  <div className="mb-4">
                    <h3 className="text-sm font-extrabold text-slate-800">
                      Test Information
                    </h3>

                    <p className="mt-1 text-[11px] text-slate-400">
                      Specify the requested laboratory
                      investigation.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-bold text-slate-600">
                        Test Name
                      </label>

                      <input
                        required
                        value={form.testName}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            testName:
                              event.target.value,
                          }))
                        }
                        placeholder="e.g. Full Blood Count"
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-bold text-slate-600">
                        Sample Type
                      </label>

                      <input
                        required
                        value={form.sampleType}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            sampleType:
                              event.target.value,
                          }))
                        }
                        placeholder="e.g. EDTA Whole Blood"
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-bold text-slate-600">
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
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-700 outline-none transition-all focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
                      >
                        {DEPARTMENTS.map(
                          (department) => (
                            <option
                              key={
                                department.value
                              }
                              value={
                                department.value
                              }
                            >
                              {
                                department.label
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-bold text-slate-600">
                        Priority
                      </label>

                      <select
                        value={form.priority}
                        onChange={(event) => {
                          const priority =
                            event.target
                              .value as LabPriority;

                          setForm((current) => ({
                            ...current,
                            priority,
                            isStat:
                              priority === 'STAT',
                          }));
                        }}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-700 outline-none transition-all focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
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
                  </div>
                </div>

                {/* =========================================
                    STAT ORDER
                ========================================= */}

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:border-[#1b7b68]/20 hover:bg-[#e8f5f3]/40">
                  <input
                    type="checkbox"
                    checked={form.isStat}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        isStat:
                          event.target.checked,
                        priority:
                          event.target.checked
                            ? 'STAT'
                            : current.priority ===
                                'STAT'
                              ? 'ROUTINE'
                              : current.priority,
                      }))
                    }
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#1b7b68] focus:ring-[#1b7b68]"
                  />

                  <div>
                    <p className="text-xs font-extrabold text-slate-700">
                      Mark as STAT
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-slate-400">
                      Prioritize this specimen for
                      immediate laboratory processing.
                    </p>
                  </div>
                </label>

                {/* =========================================
                    NOTES
                ========================================= */}

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    Clinical Notes
                    <span className="ml-1 font-medium text-slate-400">
                      (optional)
                    </span>
                  </label>

                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        notes:
                          event.target.value,
                      }))
                    }
                    placeholder="Add relevant clinical information or instructions..."
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/50 px-3 py-3 text-xs font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
                  />
                </div>
              </div>

              {/* ACTIONS */}

              <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={creatingOrder}
                  onClick={closeCreateModal}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    creatingOrder ||
                    !form.patientId
                  }
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
