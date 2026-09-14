'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
  Search,
  Users,
  ListOrdered,
  Bell,
  Settings2,
  UserCheck,
  UserX,
  ArrowRightLeft,
  Activity,
  ShieldAlert,
  CheckCircle2,
  Phone,
  Mail,
  Video,
  Zap,
} from 'lucide-react';

import { AppointmentApiService, API_BASE_URL, getAuthHeaders, getAccessToken } from '@/services/appointment.service';
import { PatientApiService } from '@/services/patient.service';
import {
  IAppointment,
  AppointmentStatus,
  AppointmentType,
  CreateAppointmentDTO,
  IPopulatedPatient,
  IPopulatedDoctor,
  IQueueTicket,
  QueuePriority,
  QueueTicketStatus,
} from '@/types/appointment';
import { IPatient } from '@/types/patient';



interface SmartCreateAppointmentDTO extends CreateAppointmentDTO {
  department?: string;
  priority?: QueuePriority;
  source?: string;
  reminderPolicyMinutes?: number[];
}

interface ScheduleAvailability {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface ScheduleBlockedTime {
  startAt: string;
  endAt: string;
  reason?: string;
}

interface ScheduleRule {
  type: AppointmentType;
  durationMinutes: number;
  bufferMinutes?: number;
}

interface QueueRules {
  appointmentWeight: number;
  arrivalWeight: number;
  priorityWeight: number;
  delayWeight: number;
}

interface CreateScheduleDTO {
  providerId: string;
  department?: string;
  timezone?: string;
  availability: ScheduleAvailability[];
  blockedTimes: ScheduleBlockedTime[];
  rules: ScheduleRule[];
  queueRules: QueueRules;
  reminderMinutes: number[];
  active: boolean;
}

// --- Helpers ---

// Safe local YYYY-MM-DD date generator
const getLocalDateString = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Safe display formatter preventing UTC timezone shift
const formatDateDisplay = (dateString?: string | null): string => {
  if (!dateString) return 'N/A';
  // Handles YYYY-MM-DD safely without timezone rollback
  const [year, month, day] = dateString.split('T')[0].split('-');
  if (year && month && day) {
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  return new Date(dateString).toLocaleDateString();
};

const STATUS_BADGE_STYLES: Record<AppointmentStatus, string> = {
  [AppointmentStatus.SCHEDULED]: 'bg-blue-50 text-blue-700 border-blue-200',
  [AppointmentStatus.CHECKED_IN]: 'bg-purple-50 text-purple-700 border-purple-200',
  [AppointmentStatus.IN_PROGRESS]: 'bg-amber-50 text-amber-700 border-amber-200',
  [AppointmentStatus.COMPLETED]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  [AppointmentStatus.CANCELLED]: 'bg-rose-50 text-rose-700 border-rose-200',
  [AppointmentStatus.NO_SHOW]: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<IAppointment[]>([]);
  const [queue, setQueue] = useState<IQueueTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueLoading, setQueueLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'calendar' | 'queue'>('calendar');

  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [queuePriority, setQueuePriority] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<IAppointment | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<IQueueTicket | null>(null);

  const [patients, setPatients] = useState<IPatient[]>([]);
  const [doctors, setDoctors] = useState<IPopulatedDoctor[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [authWarning, setAuthWarning] = useState<string | null>(null);

  const [bookForm, setBookForm] = useState<SmartCreateAppointmentDTO>({
    patientId: '',
    doctorId: '',
    appointmentDate: selectedDate,
    startTime: '09:00',
    endTime: '',
    type: AppointmentType.CONSULTATION,
    department: '',
    priority: QueuePriority.ROUTINE,
    source: 'FRONT_DESK',
    reminderPolicyMinutes: [1440, 120],
    reason: '',
    notes: '',
  } as SmartCreateAppointmentDTO);

  const [statusForm, setStatusForm] = useState({
    status: AppointmentStatus.SCHEDULED,
    notes: '',
  });

  const [checkInForm, setCheckInForm] = useState({
    priority: QueuePriority.ROUTINE,
    notes: '',
  });

  const [scheduleForm, setScheduleForm] = useState<CreateScheduleDTO>({
    providerId: '',
    department: '',
    timezone: 'Africa/Lagos',
    availability: [
      { dayOfWeek: 1, startTime: '08:00', endTime: '17:00' },
      { dayOfWeek: 2, startTime: '08:00', endTime: '17:00' },
      { dayOfWeek: 3, startTime: '08:00', endTime: '17:00' },
      { dayOfWeek: 4, startTime: '08:00', endTime: '17:00' },
      { dayOfWeek: 5, startTime: '08:00', endTime: '17:00' },
    ],
    blockedTimes: [],
    rules: [
      { type: AppointmentType.CONSULTATION, durationMinutes: 30, bufferMinutes: 0 },
      { type: AppointmentType.FOLLOW_UP, durationMinutes: 20, bufferMinutes: 0 },
    ],
    queueRules: { appointmentWeight: 1, arrivalWeight: 1, priorityWeight: 10, delayWeight: 2 },
    reminderMinutes: [1440, 120],
    active: true,
  } as CreateScheduleDTO);

  const [delayMinutes, setDelayMinutes] = useState(0);

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const query: Record<string, unknown> = { page, limit: 25 };
      if (selectedStatus !== 'ALL') query.status = selectedStatus;
      if (selectedDate) query.date = selectedDate;
      if (selectedDepartment) query.department = selectedDepartment;
      if (selectedDoctor) query.doctorId = selectedDoctor;
      const res = await AppointmentApiService.getAppointments(query as any);
      const safeAppointments = Array.isArray(res?.appointments) ? res.appointments : [];
      setAppointments(safeAppointments);
      setTotalPages(Number(res?.pages) > 0 ? Number(res.pages) : 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [page, selectedStatus, selectedDate, selectedDepartment, selectedDoctor]);

  const loadQueue = useCallback(async () => {
    try {
      setQueueLoading(true);
      setQueueError(null);
      const params = new URLSearchParams();
      params.set('date', selectedDate);
      if (selectedDepartment) params.set('department', selectedDepartment);
      if (selectedDoctor) params.set('providerId', selectedDoctor);

      const tickets = await AppointmentApiService.getQueue({
        date: selectedDate,
        department: selectedDepartment || undefined,
        providerId: selectedDoctor || undefined,
      });
      setQueue(Array.isArray(tickets) ? tickets : []);
    } catch (err: any) {
      setQueueError(err.message || 'Failed to load queue');
    } finally {
      setQueueLoading(false);
    }
  }, [selectedDate, selectedDepartment, selectedDoctor]);

  useEffect(() => {
    if (!getAccessToken()) {
      setAuthWarning('Your session is not ready. Please sign in again if appointment data does not load.');
    } else {
      setAuthWarning(null);
    }
    void loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Live queue/appointment events. REST remains the source of truth; events trigger a targeted refresh.
  useEffect(() => {
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      try {
        const raw = API_BASE_URL.replace(/\/api\/v1$/i, '');
        const wsOrigin = raw.replace(/^http/, 'ws');
        const token = getAccessToken();
        if (!token) {
          setLiveConnected(false);
          return;
        }
        const url = `${wsOrigin}/ws/appointments?token=${encodeURIComponent(token)}`;
        socket = new WebSocket(url);

        socket.onopen = () => setLiveConnected(true);
        socket.onclose = () => {
          setLiveConnected(false);
          if (!stopped) retry = setTimeout(connect, 5000);
        };
        socket.onerror = () => {
          setLiveConnected(false);
          // REST remains fully functional when WebSocket is unavailable.
        };
        socket.onmessage = () => {
          void Promise.all([loadAppointments(), loadQueue()]);
        };
      } catch {
        setLiveConnected(false);
        retry = setTimeout(connect, 5000);
      }
    };

    connect();
    return () => {
      stopped = true;
      if (retry) clearTimeout(retry);
      socket?.close();
    };
  }, [loadAppointments, loadQueue]);

  const fetchDoctors = useCallback(async (queryTerm = '') => {
    try {
      setLoadingDoctors(true);
      const queryParams = new URLSearchParams({
        role: 'DOCTOR',
        isActive: 'true',
        ...(queryTerm ? { search: queryTerm } : {}),
      });
      const response = await fetch(`${API_BASE_URL}/staff?${queryParams.toString()}`, {
        headers: getAuthHeaders(),
      });
      const json = await response.json();
      const data = json?.data ?? json;
      setDoctors(Array.isArray(data) ? data : []);
    } catch {
      setDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  }, []);

  const fetchPatients = useCallback(async (queryTerm = '') => {
    try {
      setLoadingPatients(true);
      const res = await PatientApiService.getPatients({ search: queryTerm, limit: 15 });
      setPatients(res.patients || []);
    } catch {
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  useEffect(() => {
    if (!isBookModalOpen && !isScheduleModalOpen) return;
    const timer = setTimeout(() => {
      void fetchDoctors(doctorSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [doctorSearch, isBookModalOpen, isScheduleModalOpen, fetchDoctors]);

  useEffect(() => {
    if (!isBookModalOpen) return;
    const timer = setTimeout(() => {
      void fetchPatients(patientSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch, isBookModalOpen, fetchPatients]);

  const resetBookForm = () => {
    setBookForm({
      patientId: '',
      doctorId: '',
      appointmentDate: selectedDate,
      startTime: '09:00',
      endTime: '',
      type: AppointmentType.CONSULTATION,
      department: '',
      priority: QueuePriority.ROUTINE,
      source: 'FRONT_DESK',
      reminderPolicyMinutes: [1440, 120],
      reason: '',
      notes: '',
    } as SmartCreateAppointmentDTO);
    setPatients([]);
    setPatientSearch('');
    setDoctorSearch('');
    setFormError(null);
  };

  const [formError, setFormError] = useState<string | null>(null);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const payload = Object.fromEntries(
        Object.entries(bookForm).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
      ) as SmartCreateAppointmentDTO;
      await AppointmentApiService.createAppointment(payload);
      setIsBookModalOpen(false);
      resetBookForm();
      await Promise.all([loadAppointments(), loadQueue()]);
    } catch (err: any) {
      setFormError(err.message || 'Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (status: AppointmentStatus) => {
    if (!selectedAppointment) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await AppointmentApiService.updateAppointmentStatus(selectedAppointment._id, {
        status,
        notes: statusForm.notes,
      });
      setIsStatusModalOpen(false);
      setSelectedAppointment(null);
      await loadAppointments();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const checkIn = async () => {
    if (!selectedAppointment) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await AppointmentApiService.checkIn(selectedAppointment._id, checkInForm);
      setIsCheckInModalOpen(false);
      setSelectedAppointment(null);
      await Promise.all([loadAppointments(), loadQueue()]);
    } catch (err: any) {
      setFormError(err.message || 'Check-in failed');
    } finally {
      setSubmitting(false);
    }
  };

  const updateQueueTicket = async (ticket: IQueueTicket, status: QueueTicketStatus) => {
    setSubmitting(true);
    try {
      await AppointmentApiService.updateQueueTicket(ticket._id, status);
      await loadQueue();
    } catch (err: any) {
      setQueueError(err.message || 'Queue update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const createWalkIn = async () => {
    setSubmitting(true);
    try {
      await AppointmentApiService.createWalkIn({
        patientId: bookForm.patientId,
        providerId: bookForm.doctorId || undefined,
        department: bookForm.department || undefined,
        priority: QueuePriority.PRIORITY,
        notes: bookForm.notes,
      });
      await loadQueue();
    } catch (err: any) {
      setQueueError(err.message || 'Walk-in creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const saveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await AppointmentApiService.createProviderSchedule(scheduleForm);
      setIsScheduleModalOpen(false);
      setFormError(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save provider schedule');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredQueue = useMemo(
    () => queue.filter((ticket) => queuePriority === 'ALL' || ticket.priority === queuePriority),
    [queue, queuePriority]
  );

  const metrics = useMemo(() => {
    const today = appointments.filter(
      (a) => formatDateDisplay(a.appointmentDate) === formatDateDisplay(selectedDate)
    );
    return {
      total: today.length,
      scheduled: today.filter((a) => a.status === AppointmentStatus.SCHEDULED).length,
      checkedIn: today.filter((a) => a.status === AppointmentStatus.CHECKED_IN).length,
      inProgress: today.filter((a) => a.status === AppointmentStatus.IN_PROGRESS).length,
      noShow: today.filter((a) => a.status === AppointmentStatus.NO_SHOW).length,
      highRisk: today.filter((a: any) => a.noShowRiskLevel === 'HIGH').length,
      waiting: queue.filter((q) => q.status === QueueTicketStatus.WAITING).length,
    };
  }, [appointments, queue, selectedDate]);

  const departments = useMemo(() => {
    const values = appointments.map((a: any) => a.department).filter(Boolean);
    return [...new Set(values)] as string[];
  }, [appointments]);

  const priorityClass = (priority: QueuePriority) => {
    if (priority === QueuePriority.EMERGENCY) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (priority === QueuePriority.URGENT) return 'bg-orange-50 text-orange-700 border-orange-200';
    if (priority === QueuePriority.PRIORITY) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const renderStatusBadge = (status: AppointmentStatus) => (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
      STATUS_BADGE_STYLES[status] || 'bg-slate-100 text-slate-600 border-slate-200'
    }`}>
      {status.replace(/_/g, ' ')}
    </span>
  );

  return (
    <div className="min-h-full space-y-6 font-sans text-slate-800 animate-in fade-in duration-300">
      {authWarning && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
          {authWarning}
        </div>
      )}

      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Smart Appointments</h1>
          <p className="text-sm text-slate-500">
            Provider calendars, self-service booking, reminders and a live resequenced queue
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold border ${
            liveConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${liveConnected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {liveConnected ? 'LIVE' : 'RECONNECTING'}
          </span>
          <button onClick={() => setIsScheduleModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white text-slate-700 font-semibold rounded-2xl shadow-sm hover:bg-slate-50 text-xs">
            <Settings2 className="w-4 h-4" /> Provider Rules
          </button>
          <button onClick={() => { resetBookForm(); setIsBookModalOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-[#1b7b68] hover:bg-[#156354] text-white font-semibold rounded-2xl shadow-sm text-xs">
            <Plus className="w-4 h-4" /> New Appointment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
        {([
          ['Today', metrics.total, CalendarIcon],
          ['Scheduled', metrics.scheduled, Clock],
          ['Checked In', metrics.checkedIn, UserCheck],
          ['In Progress', metrics.inProgress, Activity],
          ['Waiting', metrics.waiting, ListOrdered],
          ['High Risk', metrics.highRisk, ShieldAlert],
          ['No Shows', metrics.noShow, UserX],
        ] as Array<[string, number, React.ElementType]>).map(([label, value, Icon]) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
              <Icon className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex gap-1 bg-slate-50 p-1 rounded-xl">
          <button onClick={() => setActiveView('calendar')} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeView === 'calendar' ? 'bg-white text-[#1b7b68] shadow-sm' : 'text-slate-500'}`}>
            <CalendarIcon className="inline w-3.5 h-3.5 mr-1.5" /> Calendar
          </button>
          <button onClick={() => setActiveView('queue')} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeView === 'queue' ? 'bg-white text-[#1b7b68] shadow-sm' : 'text-slate-500'}`}>
            <ListOrdered className="inline w-3.5 h-3.5 mr-1.5" /> Live Queue
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setPage(1); setBookForm((f) => ({ ...f, appointmentDate: e.target.value })); }} className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700" />
          <select value={selectedDoctor} onChange={(e) => { setSelectedDoctor(e.target.value); setPage(1); }} className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 min-w-40">
            <option value="">All providers</option>
            {doctors.map((doc) => <option key={doc._id} value={doc._id}>Dr. {doc.firstName} {doc.lastName}</option>)}
          </select>
          <select value={selectedDepartment} onChange={(e) => { setSelectedDepartment(e.target.value); setPage(1); }} className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700">
            <option value="">All departments</option>
            {departments.map((department) => <option key={department} value={department}>{department}</option>)}
          </select>
          <button onClick={() => { void loadAppointments(); void loadQueue(); }} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {activeView === 'queue' ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900">Live Queue</h2>
              <p className="text-[11px] text-slate-400">Weighted by appointment time, arrival age, priority and provider delay</p>
            </div>
            <div className="flex items-center gap-2">
              <select value={queuePriority} onChange={(e) => setQueuePriority(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-xs">
                <option value="ALL">All priorities</option>
                {Object.values(QueuePriority).map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <button onClick={() => { resetBookForm(); setIsBookModalOpen(true); }} className="px-3 py-2 bg-[#1b7b68] text-white rounded-xl text-xs font-bold">
                <Plus className="inline w-3.5 h-3.5 mr-1" /> Walk-in / Appointment
              </button>
            </div>
          </div>
          {queueError && <div className="m-4 p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs">{queueError}</div>}
          {queueLoading ? <div className="p-12 text-center text-slate-400 text-sm">Loading live queue...</div> : filteredQueue.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">No active queue tickets for this filter.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredQueue.map((ticket, index) => {
                const patient = typeof ticket.patientId === 'object' ? ticket.patientId as any : null;
                return (
                  <div key={ticket._id} className="px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-4 hover:bg-slate-50/60">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] text-slate-400 font-bold">#{ticket.position || index + 1}</span>
                      <span className="text-sm font-black text-slate-800">{ticket.ticketNumber?.slice(-3)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-800">{patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${priorityClass(ticket.priority)}`}>{ticket.priority}</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-50 text-slate-500 border border-slate-200">{ticket.status.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-[10px] text-slate-400 mt-1.5">
                        <span><Users className="inline w-3 h-3 mr-1" />{ticket.department || 'Department'}</span>
                        <span><Clock className="inline w-3 h-3 mr-1" />Delay {ticket.delayMinutes || 0}m</span>
                        <span><Zap className="inline w-3 h-3 mr-1" />Score {Number(ticket.sequenceScore || 0).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {ticket.status === QueueTicketStatus.WAITING && (
                        <button onClick={() => void updateQueueTicket(ticket, QueueTicketStatus.CALLED)} className="px-3 py-2 bg-[#1b7b68] text-white rounded-xl text-[10px] font-bold">Call</button>
                      )}
                      {ticket.status === QueueTicketStatus.CALLED && (
                        <button onClick={() => void updateQueueTicket(ticket, QueueTicketStatus.IN_SERVICE)} className="px-3 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-bold">Start</button>
                      )}
                      {ticket.status === QueueTicketStatus.IN_SERVICE && (
                        <button onClick={() => void updateQueueTicket(ticket, QueueTicketStatus.COMPLETED)} className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-bold">Complete</button>
                      )}
                      <button onClick={() => setSelectedTicket(ticket)} className="px-3 py-2 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600">Details</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Provider Calendar</h2>
              <p className="text-[11px] text-slate-400">Concurrent booking is validated by provider schedule and locked slot keys</p>
            </div>
            <span className="text-[10px] text-slate-400">{appointments.length} shown</span>
          </div>
          {loading ? <div className="p-12 text-center text-slate-400 text-sm">Loading appointments...</div> : error ? (
            <div className="p-8 text-center text-rose-600 text-sm">{error}</div>
          ) : appointments.length === 0 ? <div className="p-12 text-center text-slate-400 text-sm">No appointments found.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Time</th>
                    <th className="px-5 py-4 font-semibold">Patient</th>
                    <th className="px-5 py-4 font-semibold">Provider</th>
                    <th className="px-5 py-4 font-semibold">Type</th>
                    <th className="px-5 py-4 font-semibold">Priority</th>
                    <th className="px-5 py-4 font-semibold">Risk</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.map((item) => {
                    const patient = typeof item.patientId === 'object' ? item.patientId as IPopulatedPatient : null;
                    const doctor = typeof item.doctorId === 'object' ? item.doctorId as IPopulatedDoctor : null;
                    const risk = (item as any).noShowRiskLevel;
                    return (
                      <tr key={item._id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-800">{item.startTime}–{item.endTime || '—'}</div>
                          <div className="text-[10px] text-slate-400">{formatDateDisplay(item.appointmentDate)}</div>
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-800">
                          {patient ? `${patient.firstName} ${patient.lastName}` : 'N/A'}
                          <span className="block text-[10px] text-slate-400 font-normal">{patient?.mrn || 'No MRN'}</span>
                        </td>
                        <td className="px-5 py-4 font-medium">{doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : 'Unassigned'}</td>
                        <td className="px-5 py-4">{item.type.replace(/_/g, ' ')}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-1 rounded-full border text-[9px] font-bold ${priorityClass((item as any).priority || QueuePriority.ROUTINE)}`}>
                            {(item as any).priority || QueuePriority.ROUTINE}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-[10px] font-bold ${risk === 'HIGH' ? 'text-rose-600' : risk === 'MEDIUM' ? 'text-amber-600' : 'text-slate-500'}`}>
                            {risk || 'LOW'}
                          </span>
                        </td>
                        <td className="px-5 py-4">{renderStatusBadge(item.status)}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {item.status === AppointmentStatus.SCHEDULED && (
                              <button onClick={() => { setSelectedAppointment(item); setCheckInForm({ priority: (item as any).priority || QueuePriority.ROUTINE, notes: '' }); setFormError(null); setIsCheckInModalOpen(true); }} className="px-2.5 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-[10px] font-bold">Check In</button>
                            )}
                            <button onClick={() => { setSelectedAppointment(item); setStatusForm({ status: item.status, notes: item.notes || '' }); setFormError(null); setIsStatusModalOpen(true); }} className="px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold">Status</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/50">
              <span className="text-xs text-slate-500">Page <b>{page}</b> of <b>{totalPages}</b></span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-start">
              <div><p className="text-[10px] text-slate-400 uppercase font-bold">Queue ticket</p><h2 className="text-xl font-bold text-slate-900 mt-1">{selectedTicket.ticketNumber}</h2></div>
              <button onClick={() => setSelectedTicket(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="p-3 rounded-xl bg-slate-50"><span className="text-[10px] text-slate-400">Position</span><p className="font-bold">{selectedTicket.position}</p></div>
              <div className="p-3 rounded-xl bg-slate-50"><span className="text-[10px] text-slate-400">Priority</span><p className="font-bold">{selectedTicket.priority}</p></div>
              <div className="p-3 rounded-xl bg-slate-50"><span className="text-[10px] text-slate-400">Delay</span><p className="font-bold">{selectedTicket.delayMinutes || 0} min</p></div>
              <div className="p-3 rounded-xl bg-slate-50"><span className="text-[10px] text-slate-400">Score</span><p className="font-bold">{Number(selectedTicket.sequenceScore || 0).toFixed(2)}</p></div>
            </div>
            <div className="mt-5 flex gap-2">
              {selectedTicket.status === QueueTicketStatus.WAITING && <button onClick={() => { void updateQueueTicket(selectedTicket, QueueTicketStatus.CALLED); setSelectedTicket(null); }} className="flex-1 py-2.5 bg-[#1b7b68] text-white rounded-xl text-xs font-bold">Call Patient</button>}
              {selectedTicket.status === QueueTicketStatus.CALLED && <button onClick={() => { void updateQueueTicket(selectedTicket, QueueTicketStatus.IN_SERVICE); setSelectedTicket(null); }} className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-bold">Start Service</button>}
              {selectedTicket.status === QueueTicketStatus.IN_SERVICE && <button onClick={() => { void updateQueueTicket(selectedTicket, QueueTicketStatus.COMPLETED); setSelectedTicket(null); }} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold">Complete</button>}
            </div>
          </div>
        </div>
      )}

      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5"><div><h2 className="text-lg font-bold text-slate-900">Smart Booking</h2><p className="text-[11px] text-slate-400">Schedule validation, slot locking, reminders and no-show scoring run on the server.</p></div><button onClick={() => { setIsBookModalOpen(false); resetBookForm(); }}><X className="w-5 h-5 text-slate-400" /></button></div>
            {formError && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs"><AlertCircle className="inline w-4 h-4 mr-1" />{formError}</div>}
            <form onSubmit={handleCreateSubmit} className="grid md:grid-cols-2 gap-4 text-xs">
              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Patient *</label>
                <input placeholder="Search name or MRN..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl mb-2" />
                <select required value={bookForm.patientId} onChange={(e) => setBookForm({ ...bookForm, patientId: e.target.value })} className="w-full px-3 py-2 border border-[#1b7b68] rounded-xl">
                  <option value="">Choose patient</option>{patients.map((p) => <option key={p._id} value={p._id}>{p.firstName} {p.lastName} ({p.mrn})</option>)}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Provider *</label>
                <input placeholder="Search provider..." value={doctorSearch} onChange={(e) => setDoctorSearch(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl mb-2" />
                <select required value={bookForm.doctorId} onChange={(e) => { const doctor = doctors.find((d) => d._id === e.target.value); setBookForm({ ...bookForm, doctorId: e.target.value, department: doctor?.department || bookForm.department }); }} className="w-full px-3 py-2 border border-[#1b7b68] rounded-xl">
                  <option value="">Choose provider</option>{doctors.map((d) => <option key={d._id} value={d._id}>Dr. {d.firstName} {d.lastName}{d.department ? ` — ${d.department}` : ''}</option>)}
                </select>
              </div>
              <div><label className="block font-bold text-slate-700 mb-1">Department</label><input value={(bookForm as any).department || ''} onChange={(e) => setBookForm({ ...bookForm, department: e.target.value } as SmartCreateAppointmentDTO)} className="w-full px-3 py-2 border border-slate-200 rounded-xl" /></div>
              <div><label className="block font-bold text-slate-700 mb-1">Date *</label><input type="date" required value={bookForm.appointmentDate} onChange={(e) => setBookForm({ ...bookForm, appointmentDate: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" /></div>
              <div><label className="block font-bold text-slate-700 mb-1">Start *</label><input type="time" required value={bookForm.startTime} onChange={(e) => setBookForm({ ...bookForm, startTime: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" /></div>
              <div><label className="block font-bold text-slate-700 mb-1">End (optional)</label><input type="time" value={(bookForm as any).endTime || ''} onChange={(e) => setBookForm({ ...bookForm, endTime: e.target.value } as SmartCreateAppointmentDTO)} className="w-full px-3 py-2 border border-slate-200 rounded-xl" /><p className="text-[9px] text-slate-400 mt-1">Leave blank to use provider rule duration.</p></div>
              <div><label className="block font-bold text-slate-700 mb-1">Type *</label><select value={bookForm.type} onChange={(e) => setBookForm({ ...bookForm, type: e.target.value as AppointmentType })} className="w-full px-3 py-2 border border-slate-200 rounded-xl">{Object.values(AppointmentType).map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}</select></div>
              <div><label className="block font-bold text-slate-700 mb-1">Priority</label><select value={(bookForm as any).priority || QueuePriority.ROUTINE} onChange={(e) => setBookForm({ ...bookForm, priority: e.target.value as QueuePriority } as SmartCreateAppointmentDTO)} className="w-full px-3 py-2 border border-slate-200 rounded-xl">{Object.values(QueuePriority).map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
              <div><label className="block font-bold text-slate-700 mb-1">Reminder 1</label><select value={String(((bookForm as any).reminderPolicyMinutes || [1440,120])[0])} onChange={(e) => { const v = Number(e.target.value); const current = (bookForm as any).reminderPolicyMinutes || [1440,120]; setBookForm({ ...bookForm, reminderPolicyMinutes: [v, current[1]] } as CreateAppointmentDTO); }} className="w-full px-3 py-2 border border-slate-200 rounded-xl"><option value="1440">24 hours</option><option value="720">12 hours</option><option value="240">4 hours</option><option value="120">2 hours</option></select></div>
              <div><label className="block font-bold text-slate-700 mb-1">Reminder 2</label><select value={String(((bookForm as any).reminderPolicyMinutes || [1440,120])[1])} onChange={(e) => { const v = Number(e.target.value); const current = (bookForm as any).reminderPolicyMinutes || [1440,120]; setBookForm({ ...bookForm, reminderPolicyMinutes: [current[0], v] } as CreateAppointmentDTO); }} className="w-full px-3 py-2 border border-slate-200 rounded-xl"><option value="120">2 hours</option><option value="60">1 hour</option><option value="30">30 minutes</option><option value="0">At appointment time</option></select></div>
              <div className="md:col-span-2"><label className="block font-bold text-slate-700 mb-1">Reason</label><textarea rows={2} value={bookForm.reason || ''} onChange={(e) => setBookForm({ ...bookForm, reason: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" /></div>
              <div className="md:col-span-2"><label className="block font-bold text-slate-700 mb-1">Notes</label><textarea rows={2} value={bookForm.notes || ''} onChange={(e) => setBookForm({ ...bookForm, notes: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" /></div>
              <div className="md:col-span-2 flex justify-end gap-2 pt-2"><button type="button" onClick={() => { setIsBookModalOpen(false); resetBookForm(); }} className="px-4 py-2 border border-slate-200 rounded-xl font-bold">Cancel</button><button disabled={submitting} className="px-4 py-2 bg-[#1b7b68] text-white rounded-xl font-bold disabled:opacity-50">{submitting ? 'Saving...' : 'Book Appointment'}</button></div>
            </form>
          </div>
        </div>
      )}

      {isCheckInModalOpen && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex justify-between"><div><h2 className="text-lg font-bold">Check In Patient</h2><p className="text-[11px] text-slate-400">{selectedAppointment.startTime} · queue ticket will be created</p></div><button onClick={() => setIsCheckInModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
            {formError && <div className="my-4 p-3 bg-rose-50 text-rose-700 rounded-xl text-xs">{formError}</div>}
            <div className="space-y-4 mt-5 text-xs">
              <div><label className="block font-bold mb-1">Queue Priority</label><select value={checkInForm.priority} onChange={(e) => setCheckInForm({ ...checkInForm, priority: e.target.value as QueuePriority })} className="w-full px-3 py-2 border border-slate-200 rounded-xl">{Object.values(QueuePriority).map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
              <div><label className="block font-bold mb-1">Notes</label><textarea value={checkInForm.notes} onChange={(e) => setCheckInForm({ ...checkInForm, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-xl" /></div>
              <button onClick={() => void checkIn()} disabled={submitting} className="w-full py-2.5 bg-[#1b7b68] text-white rounded-xl font-bold disabled:opacity-50">{submitting ? 'Checking in...' : 'Check In & Create Queue Ticket'}</button>
            </div>
          </div>
        </div>
      )}

      {isStatusModalOpen && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex justify-between"><h2 className="text-lg font-bold">Appointment Status</h2><button onClick={() => setIsStatusModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
            {formError && <div className="my-4 p-3 bg-rose-50 text-rose-700 rounded-xl text-xs">{formError}</div>}
            <div className="space-y-4 mt-5 text-xs">
              <select value={statusForm.status} onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value as AppointmentStatus })} className="w-full px-3 py-2 border border-slate-200 rounded-xl">{Object.values(AppointmentStatus).map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}</select>
              <textarea rows={3} placeholder="Status notes..." value={statusForm.notes} onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => void updateStatus(AppointmentStatus.CANCELLED)} disabled={submitting} className="py-2.5 bg-rose-50 text-rose-700 rounded-xl font-bold">Cancel</button>
                <button onClick={() => void updateStatus(statusForm.status)} disabled={submitting} className="py-2.5 bg-[#1b7b68] text-white rounded-xl font-bold">Save Status</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between"><div><h2 className="text-lg font-bold">Provider Schedule & Queue Rules</h2><p className="text-[11px] text-slate-400">Configure availability, appointment durations, queue weighting and reminders.</p></div><button onClick={() => setIsScheduleModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
            <form onSubmit={saveSchedule} className="space-y-5 mt-5 text-xs">
              <div className="grid md:grid-cols-2 gap-3">
                <div><label className="block font-bold mb-1">Provider *</label><select required value={scheduleForm.providerId} onChange={(e) => setScheduleForm({ ...scheduleForm, providerId: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl"><option value="">Choose provider</option>{doctors.map((d) => <option key={d._id} value={d._id}>Dr. {d.firstName} {d.lastName}</option>)}</select></div>
                <div><label className="block font-bold mb-1">Department</label><input value={scheduleForm.department || ''} onChange={(e) => setScheduleForm({ ...scheduleForm, department: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" /></div>
              </div>
              <div><h3 className="font-bold text-slate-800 mb-2">Appointment duration rules</h3><div className="grid grid-cols-2 gap-3">{scheduleForm.rules?.map((rule: any, index: number) => <div key={index} className="p-3 rounded-xl bg-slate-50 border border-slate-100"><p className="font-bold mb-2">{rule.type.replace(/_/g, ' ')}</p><input type="number" min={5} value={rule.durationMinutes} onChange={(e) => setScheduleForm({ ...scheduleForm, rules: scheduleForm.rules?.map((r: any, i: number) => i === index ? { ...r, durationMinutes: Number(e.target.value) } : r) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" placeholder="Minutes" /></div>)}</div></div>
              <div><h3 className="font-bold text-slate-800 mb-2">Queue weights</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-2">{(['appointmentWeight','arrivalWeight','priorityWeight','delayWeight'] as const).map((key) => <label key={key} className="p-3 bg-slate-50 rounded-xl"><span className="block text-[9px] text-slate-400 mb-1">{key.replace('Weight','')}</span><input type="number" step="0.1" value={(scheduleForm.queueRules as any)?.[key] ?? 0} onChange={(e) => setScheduleForm({ ...scheduleForm, queueRules: { ...(scheduleForm.queueRules as any), [key]: Number(e.target.value) } })} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg" /></label>)}</div></div>
              <div><h3 className="font-bold text-slate-800 mb-2">Weekly availability</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{scheduleForm.availability?.map((slot: any, index: number) => <div key={index} className="grid grid-cols-3 gap-2 p-2 bg-slate-50 rounded-xl"><select value={slot.dayOfWeek} onChange={(e) => setScheduleForm({ ...scheduleForm, availability: scheduleForm.availability?.map((s: any, i: number) => i === index ? { ...s, dayOfWeek: Number(e.target.value) } : s) })} className="px-2 py-1.5 border rounded-lg"><option value={1}>Mon</option><option value={2}>Tue</option><option value={3}>Wed</option><option value={4}>Thu</option><option value={5}>Fri</option><option value={6}>Sat</option><option value={0}>Sun</option></select><input type="time" value={slot.startTime} onChange={(e) => setScheduleForm({ ...scheduleForm, availability: scheduleForm.availability?.map((s: any, i: number) => i === index ? { ...s, startTime: e.target.value } : s) })} className="px-2 py-1.5 border rounded-lg" /><input type="time" value={slot.endTime} onChange={(e) => setScheduleForm({ ...scheduleForm, availability: scheduleForm.availability?.map((s: any, i: number) => i === index ? { ...s, endTime: e.target.value } : s) })} className="px-2 py-1.5 border rounded-lg" /></div>)}</div></div>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setIsScheduleModalOpen(false)} className="px-4 py-2 border border-slate-200 rounded-xl font-bold">Cancel</button><button disabled={submitting} className="px-4 py-2 bg-[#1b7b68] text-white rounded-xl font-bold">{submitting ? 'Saving...' : 'Save Provider Rules'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
