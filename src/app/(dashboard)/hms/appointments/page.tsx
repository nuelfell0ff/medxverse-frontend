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
} from 'lucide-react';

import { AppointmentApiService, API_BASE_URL, getAuthHeaders } from '@/services/appointment.service';
import { PatientApiService } from '@/services/patient.service';
import {
  IAppointment,
  AppointmentStatus,
  AppointmentType,
  CreateAppointmentDTO,
  IPopulatedPatient,
  IPopulatedDoctor,
} from '@/types/appointment';
import { IPatient } from '@/types/patient';

// --- Helpers ---

// Safe local YYYY-MM-DD date generator
const getLocalDateString = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Safe display formatter preventing UTC timezone shift
const formatDateDisplay = (dateString: string): string => {
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Filters & Pagination
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Modals state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<IAppointment | null>(null);

  // Patient Search & Selection State
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(false);

  // Doctor Search & Selection State
  const [doctors, setDoctors] = useState<IPopulatedDoctor[]>([]);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [bookForm, setBookForm] = useState<CreateAppointmentDTO>({
    patientId: '',
    doctorId: '',
    appointmentDate: getLocalDateString(),
    startTime: '09:00',
    type: AppointmentType.CONSULTATION,
    reason: '',
    notes: '',
  });

  const [statusForm, setStatusForm] = useState({
    status: AppointmentStatus.SCHEDULED,
    notes: '',
  });

  // Load Appointments list
  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const query: Record<string, any> = { page, limit: 10 };
      if (selectedStatus !== 'ALL') query.status = selectedStatus;
      if (selectedDate) query.date = selectedDate;

      const res = await AppointmentApiService.getAppointments(query);
      setAppointments(res.appointments || []);
      setTotalPages(res.pages || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [page, selectedStatus, selectedDate]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Fetch doctors from Staff API Endpoint
  const fetchDoctors = useCallback(async (queryTerm: string = '') => {
    try {
      setLoadingDoctors(true);
      const queryParams = new URLSearchParams({
        role: 'DOCTOR',
        isActive: 'true',
        ...(queryTerm ? { search: queryTerm } : {}),
      });

      const endpoint = `${API_BASE_URL}/staff?${queryParams.toString()}`;
      const response = await fetch(endpoint, { headers: getAuthHeaders() });
      const res = await response.json();

      if (res.success && Array.isArray(res.data)) {
        setDoctors(res.data);
      } else if (Array.isArray(res)) {
        setDoctors(res);
      } else {
        setDoctors([]);
      }
    } catch (err) {
      console.error('Failed to search doctors:', err);
    } finally {
      setLoadingDoctors(false);
    }
  }, []);

  // Fetch patients helper
  const fetchPatients = useCallback(async (queryTerm: string = '') => {
    try {
      setLoadingPatients(true);
      const res = await PatientApiService.getPatients({ search: queryTerm, limit: 10 });
      setPatients(res.patients || []);
    } catch (err) {
      console.error('Failed to search patients:', err);
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  // Debounced patient search & initial fetch on modal open
  useEffect(() => {
    if (!isBookModalOpen) return;
    const timer = setTimeout(() => {
      fetchPatients(patientSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch, isBookModalOpen, fetchPatients]);

  // Debounced doctor search & initial fetch on modal open
  useEffect(() => {
    if (!isBookModalOpen) return;
    const timer = setTimeout(() => {
      fetchDoctors(doctorSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [doctorSearch, isBookModalOpen, fetchDoctors]);

  const resetBookForm = () => {
    setBookForm({
      patientId: '',
      doctorId: '',
      appointmentDate: getLocalDateString(),
      startTime: '09:00',
      type: AppointmentType.CONSULTATION,
      reason: '',
      notes: '',
    });
    setPatients([]);
    setDoctors([]);
    setPatientSearch('');
    setDoctorSearch('');
    setFormError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const payload = Object.fromEntries(
        Object.entries(bookForm).filter(([_, v]) => v !== '' && v !== null)
      ) as CreateAppointmentDTO;

      await AppointmentApiService.createAppointment(payload);
      setIsBookModalOpen(false);
      resetBookForm();
      loadAppointments();
    } catch (err: any) {
      setFormError(err.message || 'Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await AppointmentApiService.updateAppointmentStatus(selectedAppointment._id, statusForm);
      setIsStatusModalOpen(false);
      setSelectedAppointment(null);
      loadAppointments();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusBadge = (status: AppointmentStatus) => {
    const styleClass = STATUS_BADGE_STYLES[status] || 'bg-slate-100 text-slate-600 border-slate-200';
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${styleClass}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Appointments</h1>
          <p className="text-sm text-slate-500">Manage patient schedules and consultations</p>
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setIsBookModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1b7b68] hover:bg-[#156354] text-white font-semibold rounded-2xl shadow-sm transition-all text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Appointment</span>
        </button>
      </div>

      {/* Filter Tabs & Date Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-2 md:pb-0">
          {['ALL', ...Object.values(AppointmentStatus)].map((status) => (
            <button
              key={status}
              onClick={() => {
                setSelectedStatus(status);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedStatus === status
                  ? 'bg-[#1b7b68] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Date Filter & Refresh */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#1b7b68]"
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="text-xs text-rose-600 hover:underline px-1"
            >
              Clear
            </button>
          )}
          <button
            onClick={loadAppointments}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Appointments List / Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading appointments...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-sm font-medium">{error}</div>
        ) : appointments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No appointments found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Patient</th>
                    <th className="px-6 py-4 font-semibold">Doctor</th>
                    <th className="px-6 py-4 font-semibold">Date & Time</th>
                    <th className="px-6 py-4 font-semibold">Type</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.map((item) => {
                    const patient = typeof item.patientId === 'object' ? (item.patientId as IPopulatedPatient) : null;
                    const doctor = typeof item.doctorId === 'object' ? (item.doctorId as IPopulatedDoctor) : null;

                    return (
                      <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {patient ? `${patient.firstName} ${patient.lastName}` : 'N/A'}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {patient?.mrn || 'No MRN'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-700">
                          {doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : 'Unassigned'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatDateDisplay(item.appointmentDate)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>{item.startTime}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-600">
                          {item.type.replace('_', ' ')}
                        </td>
                        <td className="px-6 py-4">{renderStatusBadge(item.status)}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedAppointment(item);
                              setStatusForm({ status: item.status, notes: item.notes || '' });
                              setFormError(null);
                              setIsStatusModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-[11px]"
                          >
                            Update Status
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <span className="text-xs text-slate-500">
                  Page <span className="font-semibold text-slate-700">{page}</span> of{' '}
                  <span className="font-semibold text-slate-700">{totalPages}</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Book Appointment Modal */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Book New Appointment</h2>
              <button
                onClick={() => {
                  setIsBookModalOpen(false);
                  resetBookForm();
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {/* Patient Search Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Patient *</label>
                <div className="relative mb-2">
                  <input
                    type="text"
                    placeholder="Type name or MRN to search..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1b7b68]"
                  />
                  {loadingPatients && (
                    <span className="absolute right-3 top-2 text-[10px] text-slate-400">Searching...</span>
                  )}
                </div>
                <select
                  required
                  value={bookForm.patientId}
                  onChange={(e) => setBookForm({ ...bookForm, patientId: e.target.value })}
                  className="w-full px-3 py-2 border border-[#1b7b68] rounded-xl text-slate-800 focus:outline-none"
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.firstName} {p.lastName} ({p.mrn})
                    </option>
                  ))}
                </select>
              </div>

              {/* Doctor Search Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Doctor *</label>
                <div className="relative mb-2">
                  <input
                    type="text"
                    placeholder="Type doctor's name or department..."
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1b7b68]"
                  />
                  {loadingDoctors && (
                    <span className="absolute right-3 top-2 text-[10px] text-slate-400">Searching...</span>
                  )}
                </div>
                <select
                  required
                  value={bookForm.doctorId}
                  onChange={(e) => setBookForm({ ...bookForm, doctorId: e.target.value })}
                  className="w-full px-3 py-2 border border-[#1b7b68] rounded-xl text-slate-800 focus:outline-none"
                >
                  <option value="">-- Choose Doctor --</option>
                  {doctors.map((doc) => (
                    <option key={doc._id} value={doc._id}>
                      Dr. {doc.firstName} {doc.lastName} {doc.department ? `(${doc.department})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={bookForm.appointmentDate}
                    onChange={(e) => setBookForm({ ...bookForm, appointmentDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1b7b68]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={bookForm.startTime}
                    onChange={(e) => setBookForm({ ...bookForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1b7b68]"
                  />
                </div>
              </div>

              {/* Appointment Type */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Type *</label>
                <select
                  value={bookForm.type}
                  onChange={(e) => setBookForm({ ...bookForm, type: e.target.value as AppointmentType })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1b7b68]"
                >
                  {Object.values(AppointmentType).map((t) => (
                    <option key={t} value={t}>
                      {t.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason</label>
                <textarea
                  rows={2}
                  placeholder="Chief complaint..."
                  value={bookForm.reason}
                  onChange={(e) => setBookForm({ ...bookForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1b7b68]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsBookModalOpen(false);
                    resetBookForm();
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#1b7b68] text-white rounded-xl font-bold hover:bg-[#156354] disabled:opacity-50"
                >
                  {submitting ? 'Booking...' : 'Book Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {isStatusModalOpen && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Update Appointment Status</h2>
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleStatusUpdate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value as AppointmentStatus })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1b7b68]"
                >
                  {Object.values(AppointmentStatus).map((s) => (
                    <option key={s} value={s}>
                      {s.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={3}
                  placeholder="Optional status update notes..."
                  value={statusForm.notes}
                  onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1b7b68]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#1b7b68] text-white rounded-xl font-bold hover:bg-[#156354] disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}