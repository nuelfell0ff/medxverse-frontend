import {
  CreateAppointmentDTO,
  UpdateAppointmentStatusDTO,
  GetAppointmentsQueryDTO,
  PaginatedAppointmentsResponse,
  IAppointment,
  IQueueTicket,
  IProviderSchedule,
} from '@/types/appointment';
import { useAuthStore } from '@/store/useAuthStore';

const DEFAULT_HOST = 'https://medxverse-backend.onrender.com';
const RAW_URL = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_HOST).trim().replace(/\/+$/, '');
export const API_BASE_URL = RAW_URL.endsWith('/api/v1') ? RAW_URL : `${RAW_URL}/api/v1`;

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  appointments?: IAppointment[];
  tickets?: IQueueTicket[];
  total?: number;
  page?: number;
  limit?: number;
  pages?: number;
};

function readToken(): string {
  try {
    const state = useAuthStore.getState?.();
    const token = state && typeof state === 'object' ? (state as { token?: string }).token : '';
    if (token) return token;
  } catch {
    // Auth store may not be hydrated yet.
  }

  if (typeof window === 'undefined') return '';

  try {
    const direct = localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (direct) return direct;
  } catch {
    // Ignore storage access failures.
  }

  try {
    const raw = localStorage.getItem('medxverse-auth-storage');
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { token?: string } };
      return parsed?.state?.token || '';
    }
  } catch {
    // Ignore malformed persisted auth.
  }

  return '';
}

export const getAuthHeaders = (): Record<string, string> => {
  const token = readToken();
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const getAccessToken = (): string => readToken();

async function parseResponse<T>(res: Response, defaultErrorMessage: string): Promise<T> {
  const text = await res.text();
  let json: ApiEnvelope<T> | T | null = null;

  if (text) {
    try {
      json = JSON.parse(text) as ApiEnvelope<T> | T;
    } catch {
      // Server returned non-JSON.
    }
  }

  if (!res.ok) {
    const message =
      typeof json === 'object' && json !== null && 'message' in json
        ? String((json as ApiEnvelope<T>).message || '')
        : '';
    throw new Error(message || `${defaultErrorMessage} (${res.status})`);
  }

  return (json ?? {}) as T;
}

function normalizeAppointmentsResponse(payload: ApiEnvelope<unknown>): PaginatedAppointmentsResponse {
  const raw = payload as ApiEnvelope<unknown>;
  const data = raw.data;

  let appointments: IAppointment[] = [];
  if (Array.isArray(raw.appointments)) appointments = raw.appointments;
  else if (Array.isArray(data)) appointments = data as IAppointment[];
  else if (data && typeof data === 'object' && Array.isArray((data as { appointments?: unknown }).appointments)) {
    appointments = (data as { appointments: IAppointment[] }).appointments;
  }

  return {
    success: raw.success !== false,
    appointments,
    total: Number(raw.total ?? (data && typeof data === 'object' ? (data as { total?: number }).total : undefined) ?? appointments.length),
    page: Number(raw.page ?? (data && typeof data === 'object' ? (data as { page?: number }).page : undefined) ?? 1),
    limit: Number(raw.limit ?? (data && typeof data === 'object' ? (data as { limit?: number }).limit : undefined) ?? 25),
    pages: Number(raw.pages ?? (data && typeof data === 'object' ? (data as { pages?: number }).pages : undefined) ?? 1),
  };
}

async function requestJson<T>(url: string, init: RequestInit = {}, errorMessage: string): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...getAuthHeaders(),
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
  return parseResponse<T>(res, errorMessage);
}

export const AppointmentApiService = {
  async getAppointments(query: GetAppointmentsQueryDTO = {}): Promise<PaginatedAppointmentsResponse> {
    const params = new URLSearchParams();
    if (query.patientId) params.set('patientId', query.patientId);
    if (query.doctorId) params.set('doctorId', query.doctorId);
    if (query.status && query.status !== 'ALL') params.set('status', query.status);
    if (query.date) params.set('date', query.date);
    if (query.department) params.set('department', query.department);
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));

    const payload = await requestJson<ApiEnvelope<unknown>>(
      `${API_BASE_URL}/appointments?${params.toString()}`,
      {},
      'Failed to fetch appointments list'
    );
    return normalizeAppointmentsResponse(payload);
  },

  async getAppointmentById(id: string): Promise<IAppointment> {
    const payload = await requestJson<ApiEnvelope<IAppointment>>(
      `${API_BASE_URL}/appointments/${encodeURIComponent(id)}`,
      {},
      'Failed to fetch appointment details'
    );
    return (payload.data || payload) as IAppointment;
  },

  async createAppointment(dto: CreateAppointmentDTO): Promise<IAppointment> {
    const payload = await requestJson<ApiEnvelope<IAppointment>>(
      `${API_BASE_URL}/appointments`,
      { method: 'POST', body: JSON.stringify(dto) },
      'Failed to create appointment'
    );
    return (payload.data || payload) as IAppointment;
  },

  async updateAppointmentStatus(id: string, dto: UpdateAppointmentStatusDTO): Promise<IAppointment> {
    const payload = await requestJson<ApiEnvelope<IAppointment>>(
      `${API_BASE_URL}/appointments/${encodeURIComponent(id)}/status`,
      { method: 'PATCH', body: JSON.stringify(dto) },
      'Failed to update appointment status'
    );
    return (payload.data || payload) as IAppointment;
  },

  async checkIn(id: string, body: { priority?: string; notes?: string } = {}) {
    return requestJson<ApiEnvelope<unknown>>(
      `${API_BASE_URL}/appointments/${encodeURIComponent(id)}/check-in`,
      { method: 'POST', body: JSON.stringify(body) },
      'Check-in failed'
    );
  },

  async getQueue(query: { date?: string; department?: string; providerId?: string } = {}) {
    const params = new URLSearchParams();
    if (query.date) params.set('date', query.date);
    if (query.department) params.set('department', query.department);
    if (query.providerId) params.set('providerId', query.providerId);

    const payload = await requestJson<ApiEnvelope<unknown>>(
      `${API_BASE_URL}/appointments/queue?${params.toString()}`,
      {},
      'Failed to load queue'
    );
    const data = payload.data;
    if (Array.isArray(payload.tickets)) return payload.tickets;
    if (Array.isArray(data)) return data as IQueueTicket[];
    if (data && typeof data === 'object' && Array.isArray((data as { tickets?: unknown }).tickets)) {
      return (data as { tickets: IQueueTicket[] }).tickets;
    }
    return [] as IQueueTicket[];
  },

  async updateQueueTicket(id: string, status: string) {
    return requestJson<ApiEnvelope<unknown>>(
      `${API_BASE_URL}/appointments/queue/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
      'Queue update failed'
    );
  },

  async createWalkIn(body: {
    patientId: string;
    providerId?: string;
    department?: string;
    priority?: string;
    notes?: string;
  }) {
    return requestJson<ApiEnvelope<unknown>>(
      `${API_BASE_URL}/appointments/queue/walk-in`,
      { method: 'POST', body: JSON.stringify(body) },
      'Walk-in creation failed'
    );
  },

  async createProviderSchedule(dto: IProviderSchedule) {
    return requestJson<ApiEnvelope<unknown>>(
      `${API_BASE_URL}/appointments/schedules`,
      { method: 'POST', body: JSON.stringify(dto) },
      'Failed to save provider schedule'
    );
  },
};
