'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Clock3,
  Loader2,
  RefreshCw,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { AppointmentApiService } from '@/services/appointment.service';
import { telemedicineService } from '@/services/telemedicine.service';
import { AppointmentStatus, type IAppointment } from '@/types/appointment';

const activeStatuses = new Set<string>([
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.IN_PROGRESS,
]);

function patientName(appointment: IAppointment) {
  const patient = appointment.patientId;
  if (!patient || typeof patient === 'string') return 'Patient appointment';
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient appointment';
}

function appointmentDateTime(appointment: IAppointment) {
  const dateValue = appointment.appointmentDate;
  const date = dateValue ? new Date(`${dateValue.slice(0, 10)}T00:00:00`) : null;
  const dateLabel = date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
    : 'Date not set';
  return `${dateLabel}${appointment.startTime ? ` · ${appointment.startTime}` : ''}${appointment.endTime ? `–${appointment.endTime}` : ''}`;
}

export default function StaffAppointmentsPage() {
  const router = useRouter();
  const account = useAuthStore((state) => state.account);
  const staffUserId = account?.staffId || account?.userId || account?.id || account?._id || '';
  const [appointments, setAppointments] = useState<IAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    if (!staffUserId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await AppointmentApiService.getAppointments({
        doctorId: staffUserId,
        page: 1,
        limit: 100,
      });
      const items = (response.appointments || []).slice().sort((a, b) => {
        const aTime = new Date(`${(a.appointmentDate || '').slice(0, 10)}T${a.startTime || '00:00'}:00`).getTime();
        const bTime = new Date(`${(b.appointmentDate || '').slice(0, 10)}T${b.startTime || '00:00'}:00`).getTime();
        return aTime - bTime;
      });
      setAppointments(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load your assigned appointments.');
    } finally {
      setLoading(false);
    }
  }, [staffUserId]);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  const connect = async (appointment: IAppointment) => {
    // Open a tab during the click gesture so the browser is less likely to block the meeting.
    const meetingWindow = window.open('about:blank', '_blank');
    setConnectingId(appointment._id);
    setError('');
    try {
      const session = await telemedicineService.createSessionForAppointment(appointment._id);
      if (!session?._id) throw new Error('The consultation session ID was not returned by the server.');
      if (meetingWindow && session.meetingUrl && /^https?:\/\//i.test(session.meetingUrl)) {
        meetingWindow.opener = null;
        meetingWindow.location.href = session.meetingUrl;
      } else if (meetingWindow) {
        meetingWindow.close();
      }
      router.push(`/telemedicine?sessionId=${encodeURIComponent(session._id)}`);
    } catch (err) {
      if (meetingWindow) meetingWindow.close();
      setError(err instanceof Error ? err.message : 'Unable to connect with this patient.');
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/staff" className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#1b7b68]"><ArrowLeft className="h-4 w-4" /> Back to workspace</Link>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1b7b68]">Clinical workspace</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">My appointments</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Appointments assigned to your staff profile. Open a linked Virtual Care consultation directly from an appointment.</p>
        </div>
        <button type="button" onClick={() => void loadAppointments()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 shadow-sm hover:border-[#1b7b68]/30 hover:text-[#1b7b68] disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
      </div>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div><h2 className="text-sm font-bold text-slate-800">Assigned appointment list</h2><p className="mt-1 text-xs text-slate-400">{appointments.length} appointment{appointments.length === 1 ? '' : 's'} loaded</p></div>
          <CalendarDays className="h-5 w-5 text-[#1b7b68]" />
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-slate-400"><Loader2 className="h-5 w-5 animate-spin text-[#1b7b68]" /> Loading appointments…</div>
        ) : appointments.length ? (
          <div className="divide-y divide-slate-100">
            {appointments.map((appointment) => {
              const status = String(appointment.status || 'SCHEDULED');
              const canConnect = activeStatuses.has(status);
              return (
                <article key={appointment._id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e8f5f3] text-sm font-bold text-[#1b7b68]">{patientName(appointment).split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'PT'}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-slate-800">{patientName(appointment)}</h3><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${status === AppointmentStatus.IN_PROGRESS ? 'bg-emerald-50 text-emerald-700' : status === AppointmentStatus.CHECKED_IN ? 'bg-violet-50 text-violet-700' : status === AppointmentStatus.SCHEDULED ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{status.replaceAll('_', ' ')}</span></div>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" /> {appointmentDateTime(appointment)}</p>
                    <p className="mt-1 text-xs text-slate-500">{appointment.department || 'General care'} · {(appointment.type || 'CONSULTATION').replaceAll('_', ' ')}</p>
                    {(appointment.reason || appointment.notes) && <p className="mt-2 text-xs leading-5 text-slate-400">{appointment.reason || appointment.notes}</p>}
                  </div>
                  <button type="button" onClick={() => void connect(appointment)} disabled={!canConnect || connectingId === appointment._id} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1b7b68] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#176c5c] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">
                    {connectingId === appointment._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                    {connectingId === appointment._id ? 'Connecting…' : status === AppointmentStatus.IN_PROGRESS ? 'Open consultation' : 'Connect with patient'}
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-16 text-center"><CalendarDays className="mx-auto h-9 w-9 text-slate-200" /><h3 className="mt-3 text-sm font-bold text-slate-700">No appointments assigned yet</h3><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">When a patient books an appointment with you, it should appear here. If you expected an appointment, confirm that the booking is assigned to your staff profile.</p></div>
        )}
      </section>
    </div>
  );
}
