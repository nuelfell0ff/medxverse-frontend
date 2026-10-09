import { API_BASE_URL, getAuthHeaders } from '@/services/appointment.service';

export type TelemedicineStatus = 'WAITING_ROOM' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type ConsultationType = 'VIDEO' | 'VOICE' | 'CHAT';

export interface TelemedicinePerson {
  _id: string;
  firstName?: string;
  lastName?: string;
  mrn?: string;
  staffId?: string;
  phone?: string;
  email?: string;
  role?: string;
  department?: string;
  specialization?: string;
  status?: string;
}

export interface TelemedicineSession {
  _id: string;
  appointmentId?: string | { _id?: string; appointmentDate?: string; startTime?: string; status?: string };
  patientId: TelemedicinePerson | string;
  doctorId: TelemedicinePerson | string;
  consultationType: ConsultationType;
  status: TelemedicineStatus;
  scheduledStartTime: string;
  meetingRoomId: string;
  meetingUrl?: string;
  chiefComplaint?: string;
  clinicalNotes?: string;
  actualStartTime?: string;
  endTime?: string;
  durationMinutes?: number;
}

export interface TelemedicineMessage {
  _id: string;
  senderId: string;
  senderModel: 'User' | 'Patient';
  messageText: string;
  attachmentUrl?: string;
  sentAt: string;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/telemedicine${path}`, {
    ...init,
    headers: { ...getAuthHeaders(), ...(init.headers || {}) },
    cache: 'no-store',
  });
  const raw = await response.text();
  let payload: any = {};
  try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || `Telemedicine request failed (${response.status})`);
  }
  return payload.data as T;
}

export interface JaaSMeetingToken {
  domain: '8x8.vc';
  appId: string;
  roomName: string;
  jwt: string;
  meetingUrl: string;
  expiresAt: string;
}

export const telemedicineService = {
  getMeetingToken: (sessionId: string) =>
    request<JaaSMeetingToken>(`/sessions/${encodeURIComponent(sessionId)}/meeting-token`),
  getDirectory: () => request<{ patients: TelemedicinePerson[]; doctors: TelemedicinePerson[] }>('/directory'),
  getSessions: () => request<{ sessions: TelemedicineSession[]; total: number; page: number; totalPages: number }>('/sessions?limit=50'),
  createSessionForAppointment: (appointmentId: string) =>
    request<TelemedicineSession>(`/sessions/from-appointment/${encodeURIComponent(appointmentId)}`, { method: 'POST' }),
  createSession: (input: { patientId: string; doctorId: string; consultationType: ConsultationType; scheduledStartTime: string; chiefComplaint?: string; followUpOfSessionId?: string }) =>
    request<TelemedicineSession>('/sessions', { method: 'POST', body: JSON.stringify(input) }),
  updateStatus: (id: string, status: TelemedicineStatus, clinicalNotes?: string) =>
    request<TelemedicineSession>(`/sessions/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status, clinicalNotes }) }),
  getMessages: (sessionId: string) => request<TelemedicineMessage[]>(`/messages/session/${encodeURIComponent(sessionId)}`),
  sendMessage: (sessionId: string, messageText: string) =>
    request<TelemedicineMessage>('/messages', { method: 'POST', body: JSON.stringify({ sessionId, messageText }) }),
};
