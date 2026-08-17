'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PatientApiService } from '@/services/patient.service';
import {
  Activity,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Filter,
  Hospital,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://medxverse-backend.onrender.com';

enum SurgeryStatus {
  SCHEDULED = 'SCHEDULED',
  PRE_OP_PREPARATION = 'PRE_OP_PREPARATION',
  IN_PROGRESS = 'IN_PROGRESS',
  RECOVERY = 'RECOVERY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  POSTPONED = 'POSTPONED',
}

enum UrgencyLevel {
  ELECTIVE = 'ELECTIVE',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

enum AnesthesiaType {
  GENERAL = 'GENERAL',
  REGIONAL = 'REGIONAL',
  LOCAL = 'LOCAL',
  SPINAL = 'SPINAL',
  EPIDURAL = 'EPIDURAL',
  SEDATION = 'SEDATION',
  COMBINED = 'COMBINED',
}

enum SurgicalRole {
  PRIMARY_SURGEON = 'PRIMARY_SURGEON',
  ASSISTING_SURGEON = 'ASSISTING_SURGEON',
  ANAESTHETIST = 'ANAESTHETIST',
  SCRUB_NURSE = 'SCRUB_NURSE',
  CIRCULATING_NURSE = 'CIRCULATING_NURSE',
  THEATRE_TECHNICIAN = 'THEATRE_TECHNICIAN',
}

interface Patient {
  _id?: string;
  firstName?: string;
  lastName?: string;
  mrn?: string;
  gender?: string;
  dateOfBirth?: string;
}

interface Staff {
  _id?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  department?: string;
  isActive?: boolean;
}

interface SurgicalTeamMember {
  userId: Staff | string;
  role: string;
  credentialVerified?: boolean;
  notes?: string;
}

interface SurgicalTeamDraft {
  userId: string;
  role: SurgicalRole | string;
}

interface SurgeryCase {
  _id: string;
  patientId: Patient | string;
  leadSurgeonId: Staff | string;
  theatreId: string;
  procedureName: string;
  icdCode?: string;
  urgency: UrgencyLevel;
  status: SurgeryStatus;
  scheduledStartTime: string;
  scheduledEndTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  anesthesiaType: AnesthesiaType;
  surgicalTeam?: SurgicalTeamMember[];
  preOpAssessment?: {
    clearedForSurgery?: boolean;
    asaClassification?: string;
  };
  whoChecklist?: {
    signIn?: { completed?: boolean };
    timeOut?: { completed?: boolean };
    signOut?: { completed?: boolean };
  };
}

interface SurgeryResponse {
  cases: SurgeryCase[];
  total: number;
  page: number;
  totalPages: number;
}

const statusConfig: Record<
  SurgeryStatus,
  { label: string; className: string }
> = {
  [SurgeryStatus.SCHEDULED]: {
    label: 'Scheduled',
    className: 'bg-blue-50 text-blue-700',
  },
  [SurgeryStatus.PRE_OP_PREPARATION]: {
    label: 'Pre-Op',
    className: 'bg-amber-50 text-amber-700',
  },
  [SurgeryStatus.IN_PROGRESS]: {
    label: 'In Progress',
    className: 'bg-purple-50 text-purple-700',
  },
  [SurgeryStatus.RECOVERY]: {
    label: 'Recovery',
    className: 'bg-cyan-50 text-cyan-700',
  },
  [SurgeryStatus.COMPLETED]: {
    label: 'Completed',
    className: 'bg-emerald-50 text-emerald-700',
  },
  [SurgeryStatus.CANCELLED]: {
    label: 'Cancelled',
    className: 'bg-rose-50 text-rose-700',
  },
  [SurgeryStatus.POSTPONED]: {
    label: 'Postponed',
    className: 'bg-slate-100 text-slate-600',
  },
};

const urgencyConfig: Record<
  UrgencyLevel,
  { label: string; className: string }
> = {
  [UrgencyLevel.ELECTIVE]: {
    label: 'Elective',
    className: 'bg-slate-100 text-slate-600',
  },
  [UrgencyLevel.URGENT]: {
    label: 'Urgent',
    className: 'bg-orange-50 text-orange-700',
  },
  [UrgencyLevel.EMERGENCY]: {
    label: 'Emergency',
    className: 'bg-rose-50 text-rose-700',
  },
};

function getStaffName(person?: Staff | null) {
  return person
    ? `${person.firstName || ''} ${person.lastName || ''}`.trim() ||
        'Unnamed Staff'
    : 'Unnamed Staff';
}

function formatLabel(value?: string) {
  if (!value) return 'N/A';

  return value
    .toLowerCase()
    .split('_')
    .map(
      (word) => word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(' ');
}

export default function SurgeryPage() {
  const [cases, setCases] = useState<SurgeryCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCases, setTotalCases] = useState(0);

  const [selectedCase, setSelectedCase] = useState<SurgeryCase | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const [scheduleForm, setScheduleForm] = useState({
    patientId: '',
    leadSurgeonId: '',
    theatreId: '',
    procedureName: '',
    icdCode: '',
    urgency: UrgencyLevel.ELECTIVE,
    scheduledStartTime: '',
    scheduledEndTime: '',
    anesthesiaType: AnesthesiaType.GENERAL,
  });

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [surgicalTeam, setSurgicalTeam] = useState<SurgicalTeamDraft[]>([]);

  const fetchPatients = useCallback(async (queryTerm: string = '') => {
    try {
      setLoadingPatients(true);
      const res = await PatientApiService.getPatients({
        search: queryTerm,
        limit: 10,
      });
      setPatients(res.patients || []);
    } catch (error) {
      console.error('Failed to search patients:', error);
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  const fetchStaff = useCallback(async (queryTerm: string = '') => {
    try {
      setLoadingStaff(true);

      const params = new URLSearchParams();
      params.set('isActive', 'true');
      if (queryTerm.trim()) params.set('search', queryTerm.trim());

      const token = localStorage.getItem('token');

      const res = await fetch(
        `${API_BASE_URL}/staff?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const json = await res.json().catch(() => ({}));

      const data = json?.data || json;
      setStaff(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to search staff:', error);
      setStaff([]);
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  useEffect(() => {
    if (!isScheduleOpen) return;

    const timer = setTimeout(() => {
      fetchPatients(patientSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [patientSearch, isScheduleOpen, fetchPatients]);

  useEffect(() => {
    if (!isScheduleOpen) return;

    const timer = setTimeout(() => {
      fetchStaff(staffSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [staffSearch, isScheduleOpen, fetchStaff]);

  const resetScheduleForm = () => {
    setScheduleForm({
      patientId: '',
      leadSurgeonId: '',
      theatreId: '',
      procedureName: '',
      icdCode: '',
      urgency: UrgencyLevel.ELECTIVE,
      scheduledStartTime: '',
      scheduledEndTime: '',
      anesthesiaType: AnesthesiaType.GENERAL,
    });
    setPatients([]);
    setPatientSearch('');
    setSelectedPatient(null);
    setStaff([]);
    setStaffSearch('');
    setSelectedStaff(null);
    setSurgicalTeam([]);
    setActionError(null);
  };

  const addStaffToTeam = () => {
    if (!selectedStaff?._id) return;

    if (surgicalTeam.some((member) => member.userId === selectedStaff._id)) {
      return;
    }

    const role =
      surgicalTeam.length === 0
        ? SurgicalRole.PRIMARY_SURGEON
        : SurgicalRole.ASSISTING_SURGEON;

    setSurgicalTeam((current) => [
      ...current,
      {
        userId: selectedStaff._id!,
        role,
      },
    ]);

    if (role === SurgicalRole.PRIMARY_SURGEON) {
      setScheduleForm((prev) => ({
        ...prev,
        leadSurgeonId: selectedStaff._id!,
      }));
    }

    setSelectedStaff(null);
    setStaffSearch('');
  };

  const removeStaffFromTeam = (userId: string) => {
    setSurgicalTeam((current) => {
      const remaining = current.filter((member) => member.userId !== userId);

      const primary = remaining.find(
        (member) => member.role === SurgicalRole.PRIMARY_SURGEON
      );

      if (primary) {
        setScheduleForm((prev) => ({
          ...prev,
          leadSurgeonId: primary.userId,
        }));
      } else {
        setScheduleForm((prev) => ({
          ...prev,
          leadSurgeonId: '',
        }));
      }

      return remaining;
    });
  };

  const updateTeamRole = (userId: string, role: SurgicalRole) => {
    setSurgicalTeam((current) => {
      let next = current;

      if (role === SurgicalRole.PRIMARY_SURGEON) {
        next = current.map((member) => {
          if (member.userId === userId) {
            return {
              ...member,
              role: SurgicalRole.PRIMARY_SURGEON,
            };
          }

          return member.role === SurgicalRole.PRIMARY_SURGEON
            ? {
                ...member,
                role: SurgicalRole.ASSISTING_SURGEON,
              }
            : member;
        });
      } else {
        next = current.map((member) =>
          member.userId === userId ? { ...member, role } : member
        );
      }

      const primary = next.find(
        (member) => member.role === SurgicalRole.PRIMARY_SURGEON
      );

      setScheduleForm((prev) => ({
        ...prev,
        leadSurgeonId: primary?.userId || '',
      }));

      return next;
    });
  };

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setActionError(null);

    try {
      const token = localStorage.getItem('token');

      const params = new URLSearchParams();

      params.set('page', String(page));
      params.set('limit', '20');

      if (statusFilter !== 'ALL') {
        params.set('status', statusFilter);
      }

      if (dateFilter) {
        params.set('date', dateFilter);
      }

      const res = await fetch(
        `${API_BASE_URL}/api/v1/surgery?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.message || 'Failed to load surgical cases.');
      }

      const responseData: SurgeryResponse =
        json?.data ||
        json || {
          cases: [],
          total: 0,
          page: 1,
          totalPages: 1,
        };

      setCases(Array.isArray(responseData.cases) ? responseData.cases : []);
      setTotalCases(responseData.total || 0);
      setTotalPages(responseData.totalPages || 1);
    } catch (error: any) {
      console.error('Failed to fetch surgical cases:', error);
      setCases([]);
      setActionError(
        error?.message || 'Unable to load surgical cases.'
      );
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, dateFilter]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const filteredCases = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return cases.filter((surgery) => {
      const patient =
        typeof surgery.patientId === 'object'
          ? surgery.patientId
          : undefined;

      const surgeon =
        typeof surgery.leadSurgeonId === 'object'
          ? surgery.leadSurgeonId
          : undefined;

      const patientName = `${patient?.firstName || ''} ${
        patient?.lastName || ''
      }`.toLowerCase();

      const mrn = patient?.mrn?.toLowerCase() || '';

      const surgeonName = `${surgeon?.firstName || ''} ${
        surgeon?.lastName || ''
      }`.toLowerCase();

      const procedure = surgery.procedureName?.toLowerCase() || '';
      const theatre = surgery.theatreId?.toLowerCase() || '';

      const matchesSearch =
        !query ||
        patientName.includes(query) ||
        mrn.includes(query) ||
        surgeonName.includes(query) ||
        procedure.includes(query) ||
        theatre.includes(query);

      const matchesUrgency =
        urgencyFilter === 'ALL' || surgery.urgency === urgencyFilter;

      return matchesSearch && matchesUrgency;
    });
  }, [cases, searchTerm, urgencyFilter]);

  const stats = useMemo(() => {
    return {
      scheduled: cases.filter(
        (item) => item.status === SurgeryStatus.SCHEDULED
      ).length,

      preOp: cases.filter(
        (item) => item.status === SurgeryStatus.PRE_OP_PREPARATION
      ).length,

      inProgress: cases.filter(
        (item) => item.status === SurgeryStatus.IN_PROGRESS
      ).length,

      completed: cases.filter(
        (item) => item.status === SurgeryStatus.COMPLETED
      ).length,

      emergency: cases.filter(
        (item) => item.urgency === UrgencyLevel.EMERGENCY
      ).length,
    };
  }, [cases]);

  const handleScheduleSurgery = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setActionError(null);

    try {
      const token = localStorage.getItem('token');

      if (!scheduleForm.patientId) {
        throw new Error('Please select a patient.');
      }

      if (!scheduleForm.leadSurgeonId) {
        throw new Error('Please add a primary surgeon to the surgical team.');
      }

      if (!surgicalTeam.length) {
        throw new Error('Please add at least one staff member to the surgical team.');
      }

      const payload = {
        patientId: scheduleForm.patientId,
        leadSurgeonId: scheduleForm.leadSurgeonId,
        surgicalTeam,
        theatreId: scheduleForm.theatreId,
        procedureName: scheduleForm.procedureName,
        icdCode: scheduleForm.icdCode || undefined,
        urgency: scheduleForm.urgency,
        scheduledStartTime: new Date(
          scheduleForm.scheduledStartTime
        ).toISOString(),
        scheduledEndTime: new Date(
          scheduleForm.scheduledEndTime
        ).toISOString(),
        anesthesiaType: scheduleForm.anesthesiaType,
      };

      const res = await fetch(`${API_BASE_URL}/api/v1/surgery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          json?.message || 'Failed to schedule surgical case.'
        );
      }

      setIsScheduleOpen(false);
      resetScheduleForm();
      fetchCases();
    } catch (error: any) {
      console.error('Failed to schedule surgery:', error);

      setActionError(
        error?.message || 'Failed to schedule surgical case.'
      );
    }
  };

  const formatTime = (value?: string) => {
    if (!value) return '--';

    return new Date(value).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (value?: string) => {
    if (!value) return '--';

    return new Date(value).toLocaleDateString([], {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getPatientName = (surgery: SurgeryCase) => {
    if (typeof surgery.patientId === 'string') {
      return 'Patient';
    }

    return `${surgery.patientId?.firstName || 'Unknown'} ${
      surgery.patientId?.lastName || 'Patient'
    }`;
  };

  const getPatientMrn = (surgery: SurgeryCase) => {
    if (typeof surgery.patientId === 'string') {
      return 'MRN unavailable';
    }

    return surgery.patientId?.mrn || 'MRN unavailable';
  };

  const getSurgeonName = (surgery: SurgeryCase) => {
    if (typeof surgery.leadSurgeonId === 'string') {
      return 'Assigned Surgeon';
    }

    return `Dr. ${surgery.leadSurgeonId?.firstName || ''} ${
      surgery.leadSurgeonId?.lastName || ''
    }`.trim();
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 animate-in fade-in duration-300">
      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{actionError}</span>

          <button
            onClick={() => setActionError(null)}
            className="ml-auto p-1 rounded-lg hover:bg-rose-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
              Operating Theatre
            </h1>

            <span className="bg-[#e8f5f3] text-[#1b7b68] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Surgical Management
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-0.5">
            Schedule, monitor, and manage surgical procedures across hospital theatres.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchCases}
            className="p-3 rounded-2xl border border-slate-100 bg-white text-slate-500 hover:text-[#1b7b68] hover:bg-[#e8f5f3] transition-all"
            title="Refresh surgical cases"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                loading ? 'animate-spin' : ''
              }`}
            />
          </button>

          <button
            onClick={() => {
              setActionError(null);
              setIsScheduleOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1b7b68] hover:bg-[#146253] text-white text-xs font-bold rounded-2xl shadow-md shadow-[#1b7b68]/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Surgery</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          icon={<CalendarDays className="w-5 h-5" />}
          label="Scheduled"
          value={stats.scheduled}
          iconClass="bg-blue-50 text-blue-600"
        />

        <MetricCard
          icon={<Clock3 className="w-5 h-5" />}
          label="Pre-Op"
          value={stats.preOp}
          iconClass="bg-amber-50 text-amber-600"
        />

        <MetricCard
          icon={<Activity className="w-5 h-5" />}
          label="In Progress"
          value={stats.inProgress}
          iconClass="bg-purple-50 text-purple-600"
        />

        <MetricCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Completed"
          value={stats.completed}
          iconClass="bg-emerald-50 text-emerald-600"
        />

        <MetricCard
          icon={<ShieldAlert className="w-5 h-5" />}
          label="Emergency"
          value={stats.emergency}
          iconClass="bg-rose-50 text-rose-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-extrabold text-slate-800">
                Theatre Overview
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Today's scheduled operating room activity
              </p>
            </div>

            <div className="w-10 h-10 rounded-2xl bg-[#e8f5f3] flex items-center justify-center text-[#1b7b68]">
              <Hospital className="w-5 h-5" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['Theatre 1', 'Theatre 2', 'Theatre 3', 'Theatre 4'].map(
              (theatre) => {
                const theatreCases = cases.filter(
                  (item) =>
                    item.theatreId?.toLowerCase() ===
                    theatre.toLowerCase()
                );

                const activeCase = theatreCases.find(
                  (item) =>
                    item.status === SurgeryStatus.IN_PROGRESS
                );

                return (
                  <div
                    key={theatre}
                    className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">
                        {theatre}
                      </span>

                      <span
                        className={`w-2 h-2 rounded-full ${
                          activeCase
                            ? 'bg-purple-500 animate-pulse'
                            : 'bg-emerald-500'
                        }`}
                      />
                    </div>

                    <p className="text-[10px] text-slate-400 mt-2">
                      {activeCase
                        ? 'Procedure in progress'
                        : `${theatreCases.length} scheduled case${
                            theatreCases.length === 1 ? '' : 's'
                          }`}
                    </p>

                    <p
                      className={`text-[11px] font-bold mt-2 ${
                        activeCase
                          ? 'text-purple-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {activeCase ? 'Occupied' : 'Available'}
                    </p>
                  </div>
                );
              }
            )}
          </div>
        </div>

        <div className="bg-[#1b7b68] rounded-3xl shadow-sm p-5 text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <Stethoscope className="w-4 h-4" />
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-white/80">
                Theatre Status
              </span>
            </div>

            <p className="text-3xl font-extrabold tracking-tight">
              {totalCases}
            </p>

            <p className="text-xs text-white/70 mt-1">
              Surgical cases in current view
            </p>

            <div className="mt-6 flex items-center gap-2 text-[11px] font-medium text-white/80">
              <CheckCircle2 className="w-4 h-4" />
              Theatre management system active
            </div>
          </div>

          <div className="absolute -right-10 -bottom-10 w-36 h-36 rounded-full border-[24px] border-white/5" />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col xl:flex-row items-center justify-between gap-4 bg-slate-50/30">
          <div className="relative w-full xl:w-96">
            <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search patient, MRN, procedure, surgeon..."
              className="w-full pl-11 pr-4 py-2.5 text-xs rounded-2xl border border-slate-200/80 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68] transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-600 focus:outline-none focus:border-[#1b7b68]"
            >
              <option value="ALL">All Status</option>
              <option value={SurgeryStatus.SCHEDULED}>
                Scheduled
              </option>
              <option value={SurgeryStatus.PRE_OP_PREPARATION}>
                Pre-Op
              </option>
              <option value={SurgeryStatus.IN_PROGRESS}>
                In Progress
              </option>
              <option value={SurgeryStatus.RECOVERY}>
                Recovery
              </option>
              <option value={SurgeryStatus.COMPLETED}>
                Completed
              </option>
              <option value={SurgeryStatus.CANCELLED}>
                Cancelled
              </option>
            </select>

            <select
              value={urgencyFilter}
              onChange={(e) => {
                setUrgencyFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-600 focus:outline-none focus:border-[#1b7b68]"
            >
              <option value="ALL">All Priority</option>
              <option value={UrgencyLevel.ELECTIVE}>
                Elective
              </option>
              <option value={UrgencyLevel.URGENT}>Urgent</option>
              <option value={UrgencyLevel.EMERGENCY}>
                Emergency
              </option>
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-600 focus:outline-none focus:border-[#1b7b68]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-4 px-6">Patient</th>
                <th className="py-4 px-6">Procedure</th>
                <th className="py-4 px-6">Theatre</th>
                <th className="py-4 px-6">Surgeon</th>
                <th className="py-4 px-6">Schedule</th>
                <th className="py-4 px-6">Priority</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <TableSkeleton />
              ) : filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Hospital className="w-8 h-8 text-slate-300 mx-auto" />

                      <p className="text-sm font-semibold text-slate-600">
                        No surgical cases found
                      </p>

                      <p className="text-xs text-slate-400">
                        Try adjusting your filters or schedule a new
                        surgical procedure.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCases.map((surgery) => {
                  const patientName = getPatientName(surgery);
                  const patientMrn = getPatientMrn(surgery);
                  const surgeonName = getSurgeonName(surgery);

                  const status =
                    statusConfig[surgery.status] ||
                    statusConfig[SurgeryStatus.SCHEDULED];

                  const urgency =
                    urgencyConfig[surgery.urgency] ||
                    urgencyConfig[UrgencyLevel.ELECTIVE];

                  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                    patientName
                  )}`;

                  return (
                    <tr
                      key={surgery._id}
                      className="hover:bg-[#e8f5f3]/20 transition-all duration-150 group"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={avatarUrl}
                            alt={patientName}
                            className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200/60 shrink-0"
                          />

                          <div>
                            <div className="font-bold text-slate-800 text-sm group-hover:text-[#1b7b68] transition-colors">
                              {patientName}
                            </div>

                            <div className="text-[11px] font-mono text-slate-400">
                              MRN: {patientMrn}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 max-w-[220px]">
                        <div className="font-bold text-slate-700 line-clamp-2">
                          {surgery.procedureName}
                        </div>

                        {surgery.icdCode && (
                          <div className="text-[10px] text-slate-400 mt-1">
                            ICD: {surgery.icdCode}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                            <Hospital className="w-4 h-4" />
                          </div>

                          <span className="font-bold text-slate-700">
                            {surgery.theatreId}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-[#e8f5f3] text-[#1b7b68] flex items-center justify-center">
                            <Stethoscope className="w-4 h-4" />
                          </div>

                          <div>
                            <p className="font-bold text-slate-700 whitespace-nowrap">
                              {surgeonName}
                            </p>

                            <p className="text-[10px] text-slate-400">
                              {surgery.surgicalTeam?.length || 0}{' '}
                              team members
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-700 whitespace-nowrap">
                          {formatTime(surgery.scheduledStartTime)} —{' '}
                          {formatTime(surgery.scheduledEndTime)}
                        </div>

                        <div className="text-[10px] text-slate-400 mt-1">
                          {formatDate(surgery.scheduledStartTime)}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${urgency.className}`}
                        >
                          {surgery.urgency ===
                            UrgencyLevel.EMERGENCY && (
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                          )}

                          {urgency.label}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${status.className}`}
                        >
                          {surgery.status ===
                            SurgeryStatus.IN_PROGRESS && (
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                          )}

                          {status.label}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setSelectedCase(surgery)}
                          className="flex items-center gap-1 px-3 py-1.5 ml-auto bg-[#1b7b68]/10 hover:bg-[#1b7b68] text-[#1b7b68] hover:text-white rounded-xl text-xs font-bold transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>
            Showing page{' '}
            <strong className="text-slate-800">{page}</strong>{' '}
            of{' '}
            <strong className="text-slate-800">
              {totalPages}
            </strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() =>
                setPage((current) => Math.max(current - 1, 1))
              }
              className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) =>
                  Math.min(current + 1, totalPages)
                )
              }
              className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {selectedCase && (
        <SurgeryDetailsModal
          surgery={selectedCase}
          onClose={() => setSelectedCase(null)}
          formatTime={formatTime}
          formatDate={formatDate}
          getPatientName={getPatientName}
          getPatientMrn={getPatientMrn}
          getSurgeonName={getSurgeonName}
        />
      )}

      {isScheduleOpen && (
        <ScheduleSurgeryModal
          form={scheduleForm}
          setForm={setScheduleForm}
          onClose={() => setIsScheduleOpen(false)}
          onSubmit={handleScheduleSurgery}
          patients={patients}
          patientSearch={patientSearch}
          setPatientSearch={setPatientSearch}
          loadingPatients={loadingPatients}
          selectedPatient={selectedPatient}
          setSelectedPatient={setSelectedPatient}
          setPatients={setPatients}
          staff={staff}
          staffSearch={staffSearch}
          setStaffSearch={setStaffSearch}
          loadingStaff={loadingStaff}
          selectedStaff={selectedStaff}
          setSelectedStaff={setSelectedStaff}
          surgicalTeam={surgicalTeam}
          addStaffToTeam={addStaffToTeam}
          removeStaffFromTeam={removeStaffFromTeam}
          updateTeamRole={updateTeamRole}
        />
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  iconClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  iconClass: string;
}) {
  return (
    <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center ${iconClass}`}
      >
        {icon}
      </div>

      <div>
        <p className="text-xs text-slate-400 font-medium">
          {label}
        </p>

        <p className="text-xl font-extrabold text-slate-800 tracking-tight">
          {value}
        </p>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr
          key={index}
          className="animate-pulse border-b border-slate-100"
        >
          <td className="py-4 px-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-200" />

              <div>
                <div className="h-4 bg-slate-200 rounded-lg w-28 mb-1.5" />
                <div className="h-3 bg-slate-100 rounded-lg w-20" />
              </div>
            </div>
          </td>

          <td className="py-4 px-6">
            <div className="h-4 bg-slate-200 rounded-lg w-40" />
          </td>

          <td className="py-4 px-6">
            <div className="h-8 bg-slate-100 rounded-xl w-24" />
          </td>

          <td className="py-4 px-6">
            <div className="h-4 bg-slate-200 rounded-lg w-28" />
          </td>

          <td className="py-4 px-6">
            <div className="h-4 bg-slate-200 rounded-lg w-32 mb-1" />
            <div className="h-3 bg-slate-100 rounded-lg w-20" />
          </td>

          <td className="py-4 px-6">
            <div className="h-6 bg-slate-200 rounded-full w-20" />
          </td>

          <td className="py-4 px-6">
            <div className="h-6 bg-slate-200 rounded-full w-24" />
          </td>

          <td className="py-4 px-6">
            <div className="h-8 bg-slate-200 rounded-xl w-16 ml-auto" />
          </td>
        </tr>
      ))}
    </>
  );
}

function SurgeryDetailsModal({
  surgery,
  onClose,
  formatTime,
  formatDate,
  getPatientName,
  getPatientMrn,
  getSurgeonName,
}: {
  surgery: SurgeryCase;
  onClose: () => void;
  formatTime: (value?: string) => string;
  formatDate: (value?: string) => string;
  getPatientName: (surgery: SurgeryCase) => string;
  getPatientMrn: (surgery: SurgeryCase) => string;
  getSurgeonName: (surgery: SurgeryCase) => string;
}) {
  const status =
    statusConfig[surgery.status] ||
    statusConfig[SurgeryStatus.SCHEDULED];

  const urgency =
    urgencyConfig[surgery.urgency] ||
    urgencyConfig[UrgencyLevel.ELECTIVE];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl my-8 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-800">
                Surgical Case
              </h2>

              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${status.className}`}
              >
                {status.label}
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-1">
              Case ID: {surgery._id}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoCard
              label="Patient"
              value={getPatientName(surgery)}
              secondary={getPatientMrn(surgery)}
            />

            <InfoCard
              label="Procedure"
              value={surgery.procedureName}
              secondary={
                surgery.icdCode
                  ? `ICD: ${surgery.icdCode}`
                  : 'No ICD code'
              }
            />

            <InfoCard
              label="Lead Surgeon"
              value={getSurgeonName(surgery)}
              secondary="Lead surgeon"
            />

            <InfoCard
              label="Theatre"
              value={surgery.theatreId}
              secondary={`${formatDate(
                surgery.scheduledStartTime
              )} • ${formatTime(
                surgery.scheduledStartTime
              )} - ${formatTime(surgery.scheduledEndTime)}`}
            />

            <InfoCard
              label="Anaesthesia"
              value={surgery.anesthesiaType}
              secondary="Planned anaesthesia"
            />

            <InfoCard
              label="Priority"
              value={urgency.label}
              secondary="Surgical urgency"
            />
          </div>

          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
              Surgical Team
            </h3>

            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              {surgery.surgicalTeam &&
              surgery.surgicalTeam.length > 0 ? (
                surgery.surgicalTeam.map((member, index) => {
                  const staff =
                    typeof member.userId === 'object'
                      ? member.userId
                      : undefined;

                  const name =
                    typeof member.userId === 'string'
                      ? 'Assigned Staff'
                      : `${staff?.firstName || ''} ${
                          staff?.lastName || ''
                        }`.trim();

                  return (
                    <div
                      key={`${member.role}-${index}`}
                      className="px-4 py-3 border-b last:border-b-0 border-slate-100 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#e8f5f3] text-[#1b7b68] flex items-center justify-center">
                          <Users className="w-4 h-4" />
                        </div>

                        <div>
                          <p className="text-xs font-bold text-slate-700">
                            {name || 'Assigned Staff'}
                          </p>

                          <p className="text-[10px] text-slate-400">
                            {member.role.replaceAll('_', ' ')}
                          </p>
                        </div>
                      </div>

                      {member.credentialVerified && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                          Verified
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-5 text-xs text-slate-400 text-center">
                  No additional surgical team members assigned.
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
              Surgical Readiness
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ReadinessItem
                label="Pre-Op Assessment"
                completed={
                  surgery.preOpAssessment?.clearedForSurgery === true
                }
              />

              <ReadinessItem
                label="WHO Sign In"
                completed={
                  surgery.whoChecklist?.signIn?.completed === true
                }
              />

              <ReadinessItem
                label="WHO Time Out"
                completed={
                  surgery.whoChecklist?.timeOut?.completed === true
                }
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="text-sm font-extrabold text-slate-800 mt-1">
        {value}
      </p>

      {secondary && (
        <p className="text-[10px] text-slate-400 mt-1">
          {secondary}
        </p>
      )}
    </div>
  );
}

function ReadinessItem({
  label,
  completed,
}: {
  label: string;
  completed: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        completed
          ? 'bg-emerald-50 border-emerald-100'
          : 'bg-amber-50 border-amber-100'
      }`}
    >
      <div className="flex items-center gap-2">
        {completed ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        ) : (
          <Clock3 className="w-4 h-4 text-amber-600" />
        )}

        <span
          className={`text-xs font-bold ${
            completed ? 'text-emerald-700' : 'text-amber-700'
          }`}
        >
          {completed ? 'Complete' : 'Pending'}
        </span>
      </div>

      <p className="text-[10px] font-medium text-slate-500 mt-2">
        {label}
      </p>
    </div>
  );
}

function ScheduleSurgeryModal({
  form,
  setForm,
  onClose,
  onSubmit,
  patients,
  patientSearch,
  setPatientSearch,
  loadingPatients,
  selectedPatient,
  setSelectedPatient,
  setPatients,
  staff,
  staffSearch,
  setStaffSearch,
  loadingStaff,
  selectedStaff,
  setSelectedStaff,
  surgicalTeam,
  addStaffToTeam,
  removeStaffFromTeam,
  updateTeamRole,
}: {
  form: {
    patientId: string;
    leadSurgeonId: string;
    theatreId: string;
    procedureName: string;
    icdCode: string;
    urgency: UrgencyLevel;
    scheduledStartTime: string;
    scheduledEndTime: string;
    anesthesiaType: AnesthesiaType;
  };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  patients: Patient[];
  patientSearch: string;
  setPatientSearch: React.Dispatch<React.SetStateAction<string>>;
  loadingPatients: boolean;
  selectedPatient: Patient | null;
  setSelectedPatient: React.Dispatch<React.SetStateAction<Patient | null>>;
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
  staff: Staff[];
  staffSearch: string;
  setStaffSearch: React.Dispatch<React.SetStateAction<string>>;
  loadingStaff: boolean;
  selectedStaff: Staff | null;
  setSelectedStaff: React.Dispatch<React.SetStateAction<Staff | null>>;
  surgicalTeam: SurgicalTeamDraft[];
  addStaffToTeam: () => void;
  removeStaffFromTeam: (userId: string) => void;
  updateTeamRole: (userId: string, role: SurgicalRole) => void;
}) {
  const selectedTeamStaff = surgicalTeam
    .map((member) => staff.find((person) => person._id === member.userId))
    .filter(Boolean) as Staff[];

  const displayStaff = staff.filter(
    (person) =>
      person._id &&
      !surgicalTeam.some((member) => member.userId === person._id)
  );

  const getPersonName = (person?: Patient | Staff | null) =>
    person
      ? `${person.firstName || ''} ${person.lastName || ''}`.trim() ||
        'Unnamed Person'
      : '';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl my-8 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-800">
                Schedule Surgery
              </h2>
              <span className="bg-[#e8f5f3] text-[#1b7b68] px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">
                Surgical Team
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Select the patient and build the complete operating theatre team.
            </p>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-5">
          {/* Patient search */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Patient *
            </label>

            {selectedPatient ? (
              <div className="flex items-center justify-between p-3 rounded-2xl border border-[#1b7b68]/30 bg-[#e8f5f3]/50">
                <div>
                  <p className="text-xs font-extrabold text-slate-800">
                    {getPersonName(selectedPatient)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    MRN: {selectedPatient.mrn || 'N/A'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatient(null);
                    setForm((prev) => ({ ...prev, patientId: '' }));
                    setPatientSearch('');
                  }}
                  className="text-[10px] font-bold text-rose-600 hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Search patient by name or MRN..."
                    className={`${inputClass} pl-9 pr-20`}
                  />
                  {loadingPatients && (
                    <span className="absolute right-3 top-2.5 text-[10px] text-slate-400">
                      Searching...
                    </span>
                  )}
                </div>

                {patientSearch.trim() && (
                  <div className="mt-2 border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm max-h-48 overflow-y-auto">
                    {patients.length ? (
                      patients.map((patient) => (
                        <button
                          type="button"
                          key={patient._id}
                          onClick={() => {
                            setSelectedPatient(patient);
                            setForm((prev) => ({
                              ...prev,
                              patientId: patient._id || '',
                            }));
                            setPatientSearch('');
                            setPatients([]);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-[#e8f5f3]/60 border-b last:border-b-0 border-slate-100"
                        >
                          <p className="text-xs font-bold text-slate-700">
                            {patient.firstName} {patient.lastName}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            MRN: {patient.mrn || 'N/A'}
                          </p>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-[10px] text-slate-400">
                        {loadingPatients
                          ? 'Searching patients...'
                          : 'No patients found.'}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Surgical team */}
          <div className="border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Surgical Team *
                </label>
                <p className="text-[10px] text-slate-400 mt-1">
                  Add as many staff members as required. One member must be the lead surgeon.
                </p>
              </div>

              <span className="text-[10px] font-bold text-[#1b7b68] bg-[#e8f5f3] px-2.5 py-1 rounded-lg">
                {surgicalTeam.length} member{surgicalTeam.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="Search all staff by name, role or department..."
                className={`${inputClass} pl-9 pr-20`}
              />
              {loadingStaff && (
                <span className="absolute right-3 top-2.5 text-[10px] text-slate-400">
                  Searching...
                </span>
              )}
            </div>

            {staffSearch.trim() && (
              <div className="mt-2 border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm max-h-56 overflow-y-auto">
                {displayStaff.length ? (
                  displayStaff.map((person) => (
                    <button
                      type="button"
                      key={person._id}
                      onClick={() => setSelectedStaff(person)}
                      className={`w-full text-left px-4 py-3 border-b last:border-b-0 border-slate-100 hover:bg-[#e8f5f3]/60 ${
                        selectedStaff?._id === person._id
                          ? 'bg-[#e8f5f3]/60'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-slate-700">
                            {getPersonName(person)}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {person.role || 'Staff'}
                            {person.department
                              ? ` • ${person.department}`
                              : ''}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-[#1b7b68]">
                          Add
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-[10px] text-slate-400">
                    {loadingStaff ? 'Searching staff...' : 'No staff found.'}
                  </div>
                )}
              </div>
            )}

            {selectedStaff && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 p-3 rounded-2xl border border-[#1b7b68]/30 bg-[#e8f5f3]/40">
                  <p className="text-xs font-bold text-slate-700">
                    {getStaffName(selectedStaff)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {selectedStaff.role || 'Staff'}
                    {selectedStaff.department
                      ? ` • ${selectedStaff.department}`
                      : ''}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addStaffToTeam}
                  className="px-4 py-2.5 bg-[#1b7b68] text-white rounded-xl text-xs font-bold hover:bg-[#146253]"
                >
                  Add to Team
                </button>
              </div>
            )}

            {surgicalTeam.length > 0 && (
              <div className="mt-4 space-y-2">
                {surgicalTeam.map((member, index) => {
                  const person = staff.find(
                    (item) => item._id === member.userId
                  );

                  return (
                    <div
                      key={member.userId}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50/60"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-[#e8f5f3] text-[#1b7b68] flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4" />
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">
                            {getPersonName(person)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {person?.department || person?.role || 'Staff'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={member.role}
                          onChange={(e) =>
                            updateTeamRole(
                              member.userId,
                              e.target.value as SurgicalRole
                            )
                          }
                          className="px-3 py-2 text-[10px] font-bold rounded-xl border border-slate-200 bg-white text-slate-600 focus:outline-none focus:border-[#1b7b68]"
                        >
                          {Object.values(SurgicalRole).map((role) => (
                            <option key={role} value={role}>
                              {role.replaceAll('_', ' ')}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => removeStaffFromTeam(member.userId)}
                          className="px-3 py-2 rounded-xl bg-rose-50 text-rose-600 text-[10px] font-bold hover:bg-rose-100"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Theatre">
              <input
                required
                value={form.theatreId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    theatreId: e.target.value,
                  }))
                }
                placeholder="e.g. Theatre 1"
                className={inputClass}
              />
            </FormField>

            <FormField label="Procedure">
              <input
                required
                value={form.procedureName}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    procedureName: e.target.value,
                  }))
                }
                placeholder="e.g. Appendectomy"
                className={inputClass}
              />
            </FormField>

            <FormField label="ICD Code">
              <input
                value={form.icdCode}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    icdCode: e.target.value,
                  }))
                }
                placeholder="Optional"
                className={inputClass}
              />
            </FormField>

            <FormField label="Urgency">
              <select
                value={form.urgency}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    urgency: e.target.value as UrgencyLevel,
                  }))
                }
                className={inputClass}
              >
                <option value={UrgencyLevel.ELECTIVE}>Elective</option>
                <option value={UrgencyLevel.URGENT}>Urgent</option>
                <option value={UrgencyLevel.EMERGENCY}>Emergency</option>
              </select>
            </FormField>

            <FormField label="Start Time">
              <input
                required
                type="datetime-local"
                value={form.scheduledStartTime}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    scheduledStartTime: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </FormField>

            <FormField label="End Time">
              <input
                required
                type="datetime-local"
                value={form.scheduledEndTime}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    scheduledEndTime: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </FormField>

            <FormField label="Anaesthesia Type">
              <select
                value={form.anesthesiaType}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    anesthesiaType: e.target.value as AnesthesiaType,
                  }))
                }
                className={inputClass}
              >
                {Object.values(AnesthesiaType).map((type) => (
                  <option key={type} value={type}>
                    {formatLabel(type)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#1b7b68] hover:bg-[#146253] text-white text-xs font-bold shadow-sm transition-all"
            >
              Schedule Surgery
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>

      {children}
    </label>
  );
}

const inputClass =
  'w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68] transition-all';
