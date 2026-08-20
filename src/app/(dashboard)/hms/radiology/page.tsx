'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Activity,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Filter,
  ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Stethoscope,
  UserRound,
  Users,
  X,
} from 'lucide-react';

import {
  AssignmentRole,
  ExaminationQueueStatus,
  ImagingModality,
  PriorityLevel,
  RadiologyOrder,
  RadiologyOrderStatus,
} from '@/types/radiology';

import {
  RadiologyApiService,
} from '@/services/radiology.service';

import {
  PatientApiService,
} from '@/services/patient.service';

import type { IPatient } from '@/types/patient';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://medxverse-backend.onrender.com';

interface Staff {
  _id: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  department?: string;
}

const STATUS_CONFIG: Record<
  RadiologyOrderStatus,
  { label: string; className: string }
> = {
  [RadiologyOrderStatus.REQUESTED]: {
    label: 'Requested',
    className:
      'bg-blue-50 text-blue-700 border-blue-200',
  },
  [RadiologyOrderStatus.SCHEDULED]: {
    label: 'Scheduled',
    className:
      'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  [RadiologyOrderStatus.PATIENT_ARRIVED]: {
    label: 'Patient Arrived',
    className:
      'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  [RadiologyOrderStatus.PREPARING]: {
    label: 'Preparing',
    className:
      'bg-amber-50 text-amber-700 border-amber-200',
  },
  [RadiologyOrderStatus.READY_FOR_EXAM]: {
    label: 'Ready',
    className:
      'bg-teal-50 text-teal-700 border-teal-200',
  },
  [RadiologyOrderStatus.IN_PROGRESS]: {
    label: 'In Progress',
    className:
      'bg-purple-50 text-purple-700 border-purple-200',
  },
  [RadiologyOrderStatus.IMAGE_ACQUISITION_COMPLETE]: {
    label: 'Images Complete',
    className:
      'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  [RadiologyOrderStatus.REPORTING]: {
    label: 'Reporting',
    className:
      'bg-orange-50 text-orange-700 border-orange-200',
  },
  [RadiologyOrderStatus.REPORTED]: {
    label: 'Reported',
    className:
      'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  [RadiologyOrderStatus.COMPLETED]: {
    label: 'Completed',
    className:
      'bg-green-50 text-green-700 border-green-200',
  },
  [RadiologyOrderStatus.CANCELLED]: {
    label: 'Cancelled',
    className:
      'bg-rose-50 text-rose-700 border-rose-200',
  },
};

const PRIORITY_CONFIG: Record<
  PriorityLevel,
  { label: string; className: string }
> = {
  [PriorityLevel.STAT]: {
    label: 'STAT',
    className:
      'bg-rose-50 text-rose-700 border-rose-200',
  },
  [PriorityLevel.URGENT]: {
    label: 'Urgent',
    className:
      'bg-orange-50 text-orange-700 border-orange-200',
  },
  [PriorityLevel.ROUTINE]: {
    label: 'Routine',
    className:
      'bg-slate-100 text-slate-600 border-slate-200',
  },
};

function formatLabel(value?: string) {
  if (!value) return '—';

  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatDate(value?: string) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getPatient(
  order: RadiologyOrder
): IPatient | null {
  if (
    typeof order.patientId === 'object' &&
    order.patientId
  ) {
    return order.patientId as unknown as IPatient;
  }

  return null;
}

function getStaffName(
  staff: Staff | string | undefined,
  prefix = false
) {
  if (!staff) return 'Unassigned';

  if (typeof staff === 'string') {
    return 'Assigned staff';
  }

  const name =
    `${staff.firstName || ''} ${
      staff.lastName || ''
    }`.trim();

  if (!name) return 'Assigned staff';

  return prefix ? `Dr. ${name}` : name;
}

export default function RadiologyPage() {
  const [orders, setOrders] = useState<RadiologyOrder[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(
    null
  );

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] =
    useState('ALL');

  const [modalityFilter, setModalityFilter] =
    useState('ALL');

  const [priorityFilter, setPriorityFilter] =
    useState('ALL');

  const [queueFilter, setQueueFilter] =
    useState('ALL');

  const [dateFilter, setDateFilter] =
    useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] =
    useState(1);

  const [total, setTotal] = useState(0);

  const [isCreateOpen, setIsCreateOpen] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [formError, setFormError] =
    useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] =
    useState<RadiologyOrder | null>(null);

  /*
   * Patient search
   */
  const [patients, setPatients] =
    useState<IPatient[]>([]);

  const [patientSearch, setPatientSearch] =
    useState('');

  const [loadingPatients, setLoadingPatients] =
    useState(false);

  /*
   * Doctor/staff search
   */
  const [staff, setStaff] =
    useState<Staff[]>([]);

  const [doctorSearch, setDoctorSearch] =
    useState('');

  const [loadingStaff, setLoadingStaff] =
    useState(false);

  const [form, setForm] = useState({
    patientId: '',
    orderingDoctorId: '',
    modality: ImagingModality.XRAY,
    procedureName: '',
    bodyPart: '',
    clinicalIndication: '',
    priority: PriorityLevel.ROUTINE,

    scheduledDate: '',
    scheduledStartTime: '',
    scheduledEndTime: '',
    estimatedDurationMinutes: '',
    theatreOrRoom: '',

    preparationInstructions: '',
    fastingRequired: false,
    fastingHours: '',
    hydrationRequired: false,
    medicationInstructions: '',

    contrastStatus: 'NOT_REQUIRED',
    contrastName: '',
    contrastType: '',
  });

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response =
        await RadiologyApiService.getOrders({
          page,
          limit: 15,
          search: search || undefined,
          status:
            statusFilter !== 'ALL'
              ? (statusFilter as RadiologyOrderStatus)
              : undefined,
          modality:
            modalityFilter !== 'ALL'
              ? (modalityFilter as ImagingModality)
              : undefined,
          priority:
            priorityFilter !== 'ALL'
              ? (priorityFilter as PriorityLevel)
              : undefined,
          queueStatus:
            queueFilter !== 'ALL'
              ? (queueFilter as ExaminationQueueStatus)
              : undefined,
          scheduledDate:
            dateFilter || undefined,
        });

      setOrders(response.orders || []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 1);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          'Failed to load radiology orders.'
      );
    } finally {
      setLoading(false);
    }
  }, [
    page,
    search,
    statusFilter,
    modalityFilter,
    priorityFilter,
    queueFilter,
    dateFilter,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders();
    }, 300);

    return () => clearTimeout(timer);
  }, [loadOrders]);

  /*
   * Patient search
   */
  const searchPatients = useCallback(
    async (term: string) => {
      try {
        setLoadingPatients(true);

        const response =
          await PatientApiService.getPatients({
            search: term,
            limit: 10,
          });

        setPatients(response.patients || []);
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
    if (!isCreateOpen) return;

    const timer = setTimeout(() => {
      searchPatients(patientSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [
    patientSearch,
    isCreateOpen,
    searchPatients,
  ]);

  /*
   * Staff search
   */
  const searchStaff = useCallback(
    async (term: string) => {
      try {
        setLoadingStaff(true);

        const token =
          localStorage.getItem('token');

        const params = new URLSearchParams();

        params.set('isActive', 'true');

        if (term.trim()) {
          params.set('search', term.trim());
        }

        const response = await fetch(
          `${API_BASE_URL}/api/v1/staff?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const json = await response.json();

        const result =
          Array.isArray(json)
            ? json
            : Array.isArray(json?.data)
              ? json.data
              : Array.isArray(json?.data?.staff)
                ? json.data.staff
                : [];

        setStaff(result);
      } catch (err) {
        console.error(
          'Failed to search staff:',
          err
        );

        setStaff([]);
      } finally {
        setLoadingStaff(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!isCreateOpen) return;

    const timer = setTimeout(() => {
      searchStaff(doctorSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [
    doctorSearch,
    isCreateOpen,
    searchStaff,
  ]);

  const resetForm = () => {
    setForm({
      patientId: '',
      orderingDoctorId: '',
      modality: ImagingModality.XRAY,
      procedureName: '',
      bodyPart: '',
      clinicalIndication: '',
      priority: PriorityLevel.ROUTINE,

      scheduledDate: '',
      scheduledStartTime: '',
      scheduledEndTime: '',
      estimatedDurationMinutes: '',
      theatreOrRoom: '',

      preparationInstructions: '',
      fastingRequired: false,
      fastingHours: '',
      hydrationRequired: false,
      medicationInstructions: '',

      contrastStatus: 'NOT_REQUIRED',
      contrastName: '',
      contrastType: '',
    });

    setPatientSearch('');
    setDoctorSearch('');
    setPatients([]);
    setStaff([]);
    setFormError(null);
  };

  const handleCreate = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!form.patientId) {
      setFormError(
        'Please select a patient.'
      );
      return;
    }

    if (!form.procedureName.trim()) {
      setFormError(
        'Please enter the procedure name.'
      );
      return;
    }

    if (!form.bodyPart.trim()) {
      setFormError(
        'Please enter the body part.'
      );
      return;
    }

    if (!form.clinicalIndication.trim()) {
      setFormError(
        'Please enter the clinical indication.'
      );
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const payload: any = {
        patientId: form.patientId,
        orderingDoctorId:
          form.orderingDoctorId || undefined,

        modality: form.modality,
        procedureName:
          form.procedureName.trim(),

        bodyPart: form.bodyPart.trim(),

        clinicalIndication:
          form.clinicalIndication.trim(),

        priority: form.priority,
      };

      if (form.scheduledDate) {
        payload.scheduling = {
          scheduledDate:
            form.scheduledDate,

          scheduledStartTime:
            form.scheduledStartTime ||
            undefined,

          scheduledEndTime:
            form.scheduledEndTime ||
            undefined,

          estimatedDurationMinutes:
            form.estimatedDurationMinutes
              ? Number(
                  form.estimatedDurationMinutes
                )
              : undefined,

          theatreOrRoom:
            form.theatreOrRoom ||
            undefined,
        };
      }

      if (
        form.preparationInstructions ||
        form.fastingRequired ||
        form.hydrationRequired ||
        form.medicationInstructions
      ) {
        payload.patientPreparation = {
          instructions:
            form.preparationInstructions ||
            undefined,

          fastingRequired:
            form.fastingRequired,

          fastingHours:
            form.fastingRequired &&
            form.fastingHours
              ? Number(form.fastingHours)
              : undefined,

          hydrationRequired:
            form.hydrationRequired,

          medicationInstructions:
            form.medicationInstructions ||
            undefined,
        };
      }

      if (
        form.contrastStatus !==
        'NOT_REQUIRED'
      ) {
        payload.contrast = {
          status:
            form.contrastStatus,

          contrastName:
            form.contrastName ||
            undefined,

          contrastType:
            form.contrastType ||
            undefined,
        };
      }

      await RadiologyApiService.createOrder(
        payload
      );

      setIsCreateOpen(false);
      resetForm();
      setPage(1);

      await loadOrders();
    } catch (err: any) {
      setFormError(
        err?.message ||
          'Failed to create radiology order.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * Statistics
   */
  const stats = useMemo(() => {
    const waiting = orders.filter(
      (item) =>
        item.queueStatus ===
          ExaminationQueueStatus.WAITING ||
        item.status ===
          RadiologyOrderStatus.REQUESTED
    ).length;

    const inProgress = orders.filter(
      (item) =>
        item.status ===
          RadiologyOrderStatus.IN_PROGRESS ||
        item.queueStatus ===
          ExaminationQueueStatus.IN_PROGRESS
    ).length;

    const reporting = orders.filter(
      (item) =>
        item.status ===
          RadiologyOrderStatus.REPORTING
    ).length;

    const urgent = orders.filter(
      (item) =>
        item.priority === PriorityLevel.STAT ||
        item.priority === PriorityLevel.URGENT
    ).length;

    return {
      waiting,
      inProgress,
      reporting,
      urgent,
    };
  }, [orders]);

  const selectedPatient = patients.find(
    (patient) =>
      patient._id === form.patientId
  );

  return (
    <div className="space-y-6 font-sans text-slate-800 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ImageIcon className="w-5 h-5 text-[#1b7b68]" />

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Radiology
            </h1>
          </div>

          <p className="text-sm text-slate-500">
            Manage imaging requests, examinations,
            worklists and radiology workflow.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1b7b68] hover:bg-[#156354] text-white rounded-2xl font-bold text-xs shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          New Radiology Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Waiting Queue"
          value={stats.waiting}
          icon={<Clock3 className="w-5 h-5" />}
          iconClass="bg-amber-50 text-amber-600"
        />

        <StatCard
          label="In Progress"
          value={stats.inProgress}
          icon={<Activity className="w-5 h-5" />}
          iconClass="bg-purple-50 text-purple-600"
        />

        <StatCard
          label="Awaiting Report"
          value={stats.reporting}
          icon={<FileText className="w-5 h-5" />}
          iconClass="bg-orange-50 text-orange-600"
        />

        <StatCard
          label="Urgent / STAT"
          value={stats.urgent}
          icon={<ShieldAlert className="w-5 h-5" />}
          iconClass="bg-rose-50 text-rose-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
        <div className="flex flex-col xl:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search procedure, body part, indication or accession number..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(
                  event.target.value
                );
                setPage(1);
              }}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
            >
              <option value="ALL">
                All Statuses
              </option>

              {Object.values(
                RadiologyOrderStatus
              ).map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {formatLabel(status)}
                </option>
              ))}
            </select>

            <select
              value={modalityFilter}
              onChange={(event) => {
                setModalityFilter(
                  event.target.value
                );
                setPage(1);
              }}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
            >
              <option value="ALL">
                All Modalities
              </option>

              {Object.values(
                ImagingModality
              ).map((modality) => (
                <option
                  key={modality}
                  value={modality}
                >
                  {formatLabel(modality)}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(event) => {
                setPriorityFilter(
                  event.target.value
                );
                setPage(1);
              }}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
            >
              <option value="ALL">
                All Priorities
              </option>

              {Object.values(
                PriorityLevel
              ).map((priority) => (
                <option
                  key={priority}
                  value={priority}
                >
                  {formatLabel(priority)}
                </option>
              ))}
            </select>

            <button
              onClick={loadOrders}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
              title="Refresh"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  loading
                    ? 'animate-spin'
                    : ''
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Queue
            </label>

            <select
              value={queueFilter}
              onChange={(event) => {
                setQueueFilter(
                  event.target.value
                );
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
            >
              <option value="ALL">
                All Queue States
              </option>

              {Object.values(
                ExaminationQueueStatus
              ).map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {formatLabel(status)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Scheduled Date
            </label>

            <input
              type="date"
              value={dateFilter}
              onChange={(event) => {
                setDateFilter(
                  event.target.value
                );
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
            />
          </div>

          {(dateFilter ||
            statusFilter !== 'ALL' ||
            modalityFilter !== 'ALL' ||
            priorityFilter !== 'ALL' ||
            queueFilter !== 'ALL' ||
            search) && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setModalityFilter('ALL');
                setPriorityFilter('ALL');
                setQueueFilter('ALL');
                setDateFilter('');
                setPage(1);
              }}
              className="self-end text-xs font-bold text-rose-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />

          <span className="font-medium">
            {error}
          </span>

          <button
            onClick={loadOrders}
            className="ml-auto font-bold hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Worklist */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Radiology Worklist
            </h2>

            <p className="text-[11px] text-slate-400 mt-0.5">
              {total} examination
              {total === 1 ? '' : 's'} found
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CalendarDays className="w-3.5 h-3.5" />
            Examination queue
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mb-3 text-[#1b7b68]" />

            <span className="text-xs">
              Loading radiology worklist...
            </span>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center">
            <ImageIcon className="w-10 h-10 text-slate-200 mx-auto mb-3" />

            <p className="text-sm font-bold text-slate-600">
              No radiology examinations found
            </p>

            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your filters or
              create a new radiology request.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-bold">
                    Patient
                  </th>

                  <th className="px-6 py-4 font-bold">
                    Examination
                  </th>

                  <th className="px-6 py-4 font-bold">
                    Modality
                  </th>

                  <th className="px-6 py-4 font-bold">
                    Priority
                  </th>

                  <th className="px-6 py-4 font-bold">
                    Schedule
                  </th>

                  <th className="px-6 py-4 font-bold">
                    Queue
                  </th>

                  <th className="px-6 py-4 font-bold">
                    Status
                  </th>

                  <th className="px-6 py-4 font-bold text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const patient =
                    getPatient(order);

                  const status =
                    STATUS_CONFIG[
                      order.status
                    ];

                  const priority =
                    PRIORITY_CONFIG[
                      order.priority
                    ];

                  return (
                    <tr
                      key={order._id}
                      className="hover:bg-[#e8f5f3]/20 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                            <UserRound className="w-4 h-4" />
                          </div>

                          <div>
                            <p className="font-bold text-slate-800 group-hover:text-[#1b7b68]">
                              {patient
                                ? `${patient.firstName || ''} ${
                                    patient.lastName || ''
                                  }`.trim()
                                : 'Patient'}
                            </p>

                            <p className="text-[10px] text-slate-400 font-mono">
                              {patient?.mrn ||
                                'MRN unavailable'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-700">
                          {order.procedureName}
                        </p>

                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {order.bodyPart}
                        </p>

                        {order.accessionNumber && (
                          <p className="text-[9px] font-mono text-slate-400 mt-1">
                            {order.accessionNumber}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[10px]">
                          <ImageIcon className="w-3 h-3" />

                          {formatLabel(
                            order.modality
                          )}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-lg border text-[10px] font-bold ${priority.className}`}
                        >
                          {priority.label}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {order.scheduling ? (
                          <>
                            <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                              <CalendarDays className="w-3 h-3 text-slate-400" />

                              {formatDate(
                                order.scheduling
                                  .scheduledDate
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                              <Clock3 className="w-3 h-3" />

                              {order.scheduling
                                .scheduledStartTime ||
                                '--'}
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-400">
                            Not scheduled
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {order.queuePosition ? (
                          <div>
                            <span className="font-bold text-slate-700">
                              #{order.queuePosition}
                            </span>

                            <span className="block text-[9px] text-slate-400 mt-0.5">
                              {formatLabel(
                                order.queueStatus
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold ${
                            status?.className ||
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {status?.label ||
                            formatLabel(
                              order.status
                            )}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() =>
                            setSelectedOrder(
                              order
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#e8f5f3] hover:text-[#1b7b68] text-slate-700 font-bold text-[10px] transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />

                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/40">
            <p className="text-xs text-slate-500">
              Page{' '}
              <strong>{page}</strong> of{' '}
              <strong>{totalPages}</strong>
            </p>

            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() =>
                  setPage((current) =>
                    Math.max(1, current - 1)
                  )
                }
                className="p-2 rounded-xl border border-slate-200 bg-white disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) =>
                    Math.min(
                      totalPages,
                      current + 1
                    )
                  )
                }
                className="p-2 rounded-xl border border-slate-200 bg-white disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 z-10 bg-white px-6 py-5 border-b border-slate-100 flex items-center justify-between rounded-t-3xl">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  New Radiology Request
                </h2>

                <p className="text-xs text-slate-400 mt-0.5">
                  Create an imaging examination
                  request.
                </p>
              </div>

              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  resetForm();
                }}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />

                {formError}
              </div>
            )}

            <form
              onSubmit={handleCreate}
              className="p-6 space-y-6"
            >
              {/* Patient */}
              <FormSection
                title="Patient"
                icon={
                  <UserRound className="w-4 h-4" />
                }
              >
                <label className="label">
                  Search Patient *
                </label>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                  <input
                    value={patientSearch}
                    onChange={(event) =>
                      setPatientSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search by name or MRN..."
                    className="input pl-9"
                  />

                  {loadingPatients && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1b7b68] animate-spin" />
                  )}
                </div>

                {patients.length > 0 && (
                  <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
                    {patients.map(
                      (patient) => (
                        <button
                          type="button"
                          key={patient._id}
                          onClick={() => {
                            setForm({
                              ...form,
                              patientId:
                                patient._id,
                            });

                            setPatientSearch(
                              `${patient.firstName || ''} ${
                                patient.lastName || ''
                              }`.trim()
                            );

                            setPatients([]);
                          }}
                          className={`w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-[#e8f5f3]/50 ${
                            form.patientId ===
                            patient._id
                              ? 'bg-[#e8f5f3]'
                              : ''
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                            <UserRound className="w-4 h-4 text-slate-500" />
                          </div>

                          <div>
                            <p className="text-xs font-bold text-slate-700">
                              {
                                patient.firstName
                              }{' '}
                              {
                                patient.lastName
                              }
                            </p>

                            <p className="text-[10px] text-slate-400">
                              MRN:{' '}
                              {patient.mrn ||
                                'Unavailable'}
                            </p>
                          </div>

                          {form.patientId ===
                            patient._id && (
                            <CheckCircle2 className="w-4 h-4 ml-auto text-[#1b7b68]" />
                          )}
                        </button>
                      )
                    )}
                  </div>
                )}

                {selectedPatient && (
                  <div className="mt-2 p-3 rounded-xl bg-[#e8f5f3] border border-[#c7e7e1] flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#1b7b68]" />

                    <div>
                      <p className="text-xs font-bold text-[#156354]">
                        {
                          selectedPatient.firstName
                        }{' '}
                        {
                          selectedPatient.lastName
                        }
                      </p>

                      <p className="text-[10px] text-[#1b7b68]">
                        MRN:{' '}
                        {
                          selectedPatient.mrn
                        }
                      </p>
                    </div>
                  </div>
                )}
              </FormSection>

              {/* Ordering Doctor */}
              <FormSection
                title="Ordering Clinician"
                icon={
                  <Stethoscope className="w-4 h-4" />
                }
              >
                <label className="label">
                  Search Staff
                </label>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                  <input
                    value={doctorSearch}
                    onChange={(event) =>
                      setDoctorSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search staff member..."
                    className="input pl-9"
                  />

                  {loadingStaff && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1b7b68] animate-spin" />
                  )}
                </div>

                {staff.length > 0 && (
                  <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    {staff.map((member) => (
                      <button
                        type="button"
                        key={member._id}
                        onClick={() => {
                          setForm({
                            ...form,
                            orderingDoctorId:
                              member._id,
                          });

                          setDoctorSearch(
                            `${member.firstName || ''} ${
                              member.lastName || ''
                            }`.trim()
                          );

                          setStaff([]);
                        }}
                        className="w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-slate-50"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#e8f5f3] text-[#1b7b68] flex items-center justify-center">
                          <Stethoscope className="w-4 h-4" />
                        </div>

                        <div>
                          <p className="text-xs font-bold text-slate-700">
                            {member.firstName}{' '}
                            {member.lastName}
                          </p>

                          <p className="text-[10px] text-slate-400">
                            {formatLabel(
                              member.role
                            )}
                            {member.department
                              ? ` • ${member.department}`
                              : ''}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-slate-400 mt-1">
                  Leave blank to use the currently
                  authenticated clinician.
                </p>
              </FormSection>

              {/* Examination */}
              <FormSection
                title="Examination"
                icon={
                  <ImageIcon className="w-4 h-4" />
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      Modality *
                    </label>

                    <select
                      required
                      value={form.modality}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          modality:
                            event.target
                              .value as ImagingModality,
                        })
                      }
                      className="input"
                    >
                      {Object.values(
                        ImagingModality
                      ).map((item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {formatLabel(item)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">
                      Priority *
                    </label>

                    <select
                      value={form.priority}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          priority:
                            event.target
                              .value as PriorityLevel,
                        })
                      }
                      className="input"
                    >
                      {Object.values(
                        PriorityLevel
                      ).map((item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {formatLabel(item)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">
                      Procedure Name *
                    </label>

                    <input
                      required
                      value={form.procedureName}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          procedureName:
                            event.target
                              .value,
                        })
                      }
                      placeholder="e.g. CT Brain Without Contrast"
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="label">
                      Body Part *
                    </label>

                    <input
                      required
                      value={form.bodyPart}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          bodyPart:
                            event.target.value,
                        })
                      }
                      placeholder="e.g. Brain"
                      className="input"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="label">
                    Clinical Indication *
                  </label>

                  <textarea
                    required
                    rows={3}
                    value={
                      form.clinicalIndication
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        clinicalIndication:
                          event.target.value,
                      })
                    }
                    placeholder="Clinical reason for the examination..."
                    className="input resize-none"
                  />
                </div>
              </FormSection>

              {/* Scheduling */}
              <FormSection
                title="Scheduling"
                icon={
                  <CalendarDays className="w-4 h-4" />
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      Scheduled Date
                    </label>

                    <input
                      type="date"
                      value={
                        form.scheduledDate
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          scheduledDate:
                            event.target
                              .value,
                        })
                      }
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="label">
                      Room / Modality
                    </label>

                    <input
                      value={
                        form.theatreOrRoom
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          theatreOrRoom:
                            event.target
                              .value,
                        })
                      }
                      placeholder="e.g. CT Room 1"
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="label">
                      Start Time
                    </label>

                    <input
                      type="time"
                      value={
                        form.scheduledStartTime
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          scheduledStartTime:
                            event.target
                              .value,
                        })
                      }
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="label">
                      End Time
                    </label>

                    <input
                      type="time"
                      value={
                        form.scheduledEndTime
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          scheduledEndTime:
                            event.target
                              .value,
                        })
                      }
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="label">
                      Estimated Duration
                      (minutes)
                    </label>

                    <input
                      type="number"
                      min="1"
                      value={
                        form.estimatedDurationMinutes
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          estimatedDurationMinutes:
                            event.target
                              .value,
                        })
                      }
                      className="input"
                    />
                  </div>
                </div>
              </FormSection>

              {/* Preparation */}
              <FormSection
                title="Patient Preparation"
                icon={
                  <ShieldAlert className="w-4 h-4" />
                }
              >
                <div>
                  <label className="label">
                    Instructions
                  </label>

                  <textarea
                    rows={2}
                    value={
                      form.preparationInstructions
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        preparationInstructions:
                          event.target
                            .value,
                      })
                    }
                    placeholder="Patient preparation instructions..."
                    className="input resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        form.fastingRequired
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          fastingRequired:
                            event.target
                              .checked,
                        })
                      }
                      className="accent-[#1b7b68]"
                    />

                    <span className="text-xs font-semibold text-slate-700">
                      Fasting required
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        form.hydrationRequired
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          hydrationRequired:
                            event.target
                              .checked,
                        })
                      }
                      className="accent-[#1b7b68]"
                    />

                    <span className="text-xs font-semibold text-slate-700">
                      Hydration required
                    </span>
                  </label>
                </div>

                {form.fastingRequired && (
                  <div className="mt-3">
                    <label className="label">
                      Fasting Hours
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={
                        form.fastingHours
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          fastingHours:
                            event.target
                              .value,
                        })
                      }
                      className="input"
                    />
                  </div>
                )}

                <div className="mt-3">
                  <label className="label">
                    Medication Instructions
                  </label>

                  <textarea
                    rows={2}
                    value={
                      form.medicationInstructions
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        medicationInstructions:
                          event.target
                            .value,
                      })
                    }
                    className="input resize-none"
                  />
                </div>
              </FormSection>

              {/* Contrast */}
              <FormSection
                title="Contrast"
                icon={
                  <Activity className="w-4 h-4" />
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      Contrast Status
                    </label>

                    <select
                      value={
                        form.contrastStatus
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          contrastStatus:
                            event.target
                              .value,
                        })
                      }
                      className="input"
                    >
                      <option value="NOT_REQUIRED">
                        Not Required
                      </option>

                      <option value="PLANNED">
                        Planned
                      </option>

                      <option value="ADMINISTERED">
                        Administered
                      </option>

                      <option value="DECLINED">
                        Declined
                      </option>

                      <option value="CONTRAINDICATED">
                        Contraindicated
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="label">
                      Contrast Name
                    </label>

                    <input
                      value={
                        form.contrastName
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          contrastName:
                            event.target
                              .value,
                        })
                      }
                      className="input"
                      placeholder="e.g. Iohexol"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="label">
                      Contrast Type
                    </label>

                    <input
                      value={
                        form.contrastType
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          contrastType:
                            event.target
                              .value,
                        })
                      }
                      className="input"
                      placeholder="e.g. IV contrast"
                    />
                  </div>
                </div>
              </FormSection>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#1b7b68] hover:bg-[#156354] text-white text-xs font-bold disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}

                  {submitting
                    ? 'Creating...'
                    : 'Create Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Examination Details
                </h2>

                <p className="text-[10px] font-mono text-slate-400 mt-1">
                  {selectedOrder.accessionNumber ||
                    selectedOrder._id}
                </p>
              </div>

              <button
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <DetailCard
                  label="Procedure"
                  value={
                    selectedOrder.procedureName
                  }
                />

                <DetailCard
                  label="Modality"
                  value={formatLabel(
                    selectedOrder.modality
                  )}
                />

                <DetailCard
                  label="Body Part"
                  value={
                    selectedOrder.bodyPart
                  }
                />

                <DetailCard
                  label="Priority"
                  value={formatLabel(
                    selectedOrder.priority
                  )}
                />

                <DetailCard
                  label="Status"
                  value={formatLabel(
                    selectedOrder.status
                  )}
                />

                <DetailCard
                  label="Queue"
                  value={
                    selectedOrder.queuePosition
                      ? `#${selectedOrder.queuePosition}`
                      : formatLabel(
                          selectedOrder.queueStatus
                        )
                  }
                />
              </div>

              <div>
                <p className="label mb-2">
                  Clinical Indication
                </p>

                <div className="p-4 rounded-xl bg-slate-50 text-xs text-slate-600 leading-5">
                  {
                    selectedOrder.clinicalIndication
                  }
                </div>
              </div>

              <div>
                <p className="label mb-2">
                  Scheduling
                </p>

                <div className="p-4 rounded-xl border border-slate-100">
                  {selectedOrder.scheduling ? (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <DetailRow
                        label="Date"
                        value={formatDate(
                          selectedOrder
                            .scheduling
                            .scheduledDate
                        )}
                      />

                      <DetailRow
                        label="Time"
                        value={`${
                          selectedOrder
                            .scheduling
                            .scheduledStartTime ||
                          '--'
                        } - ${
                          selectedOrder
                            .scheduling
                            .scheduledEndTime ||
                          '--'
                        }`}
                      />

                      <DetailRow
                        label="Room"
                        value={
                          selectedOrder
                            .scheduling
                            .theatreOrRoom ||
                          'Not assigned'
                        }
                      />

                      <DetailRow
                        label="Duration"
                        value={
                          selectedOrder
                            .scheduling
                            .estimatedDurationMinutes
                            ? `${selectedOrder.scheduling.estimatedDurationMinutes} min`
                            : '—'
                        }
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Examination has not been
                      scheduled.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <p className="label mb-2">
                  Assigned Staff
                </p>

                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  {selectedOrder.assignments?.length ? (
                    selectedOrder.assignments.map(
                      (assignment, index) => (
                        <div
                          key={`${assignment.role}-${index}`}
                          className="px-4 py-3 flex items-center gap-3 border-b last:border-b-0 border-slate-100"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#e8f5f3] text-[#1b7b68] flex items-center justify-center">
                            <Users className="w-4 h-4" />
                          </div>

                          <div>
                            <p className="text-xs font-bold text-slate-700">
                              {getStaffName(
                                assignment.userId
                              )}
                            </p>

                            <p className="text-[10px] text-slate-400">
                              {formatLabel(
                                assignment.role
                              )}
                            </p>
                          </div>
                        </div>
                      )
                    )
                  ) : (
                    <p className="p-4 text-xs text-slate-400 text-center">
                      No staff assigned.
                    </p>
                  )}
                </div>
              </div>

              {selectedOrder.pacsMetadata
                ?.dicomViewerUrl && (
                <a
                  href={
                    selectedOrder
                      .pacsMetadata
                      .dicomViewerUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-[#1b7b68] hover:bg-[#156354] text-white text-xs font-bold"
                >
                  <ImageIcon className="w-4 h-4" />
                  Open DICOM Viewer
                </a>
              )}

              <button
                onClick={() => {
                  window.location.href = `/hms/radiology/${selectedOrder._id}`;
                }}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
              >
                Open Full Examination Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
          {label}
        </p>

        <p className="text-2xl font-bold text-slate-900 mt-1">
          {value}
        </p>
      </div>

      <div
        className={`w-11 h-11 rounded-2xl flex items-center justify-center ${iconClass}`}
      >
        {icon}
      </div>
    </div>
  );
}

function FormSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-[#e8f5f3] text-[#1b7b68] flex items-center justify-center">
          {icon}
        </div>

        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          {title}
        </h3>
      </div>

      {children}
    </section>
  );
}

function DetailCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-slate-50">
      <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">
        {label}
      </p>

      <p className="text-xs font-bold text-slate-700 mt-1">
        {value}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">
        {label}
      </p>

      <p className="text-xs font-semibold text-slate-700 mt-1">
        {value}
      </p>
    </div>
  );
}