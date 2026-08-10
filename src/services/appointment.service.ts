import {
  CreateAppointmentDTO,
  UpdateAppointmentStatusDTO,
  GetAppointmentsQueryDTO,
  PaginatedAppointmentsResponse,
  IAppointment,
} from '@/types/appointment';
import { useAuthStore } from '@/store/useAuthStore';

const DEFAULT_HOST = 'https://medxverse-backend.onrender.com';
const RAW_URL = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_HOST).trim().replace(/\/+$/, '');
export const API_BASE_URL = RAW_URL.endsWith('/api/v1') ? RAW_URL : `${RAW_URL}/api/v1`;

export const getAuthHeaders = (): Record<string, string> => {
  let token = '';

  // 1. Primary: Extract from active Zustand store state
  try {
    token = useAuthStore.getState().token || '';
  } catch {
    // Fail silently if store is uninitialized
  }

  // 2. Secondary: Direct fallback from localStorage
  if (!token && typeof window !== 'undefined') {
    token = localStorage.getItem('token') || '';
  }

  // 3. Tertiary: Fallback from Zustand persisted storage object
  if (!token && typeof window !== 'undefined') {
    try {
      const authStorage = localStorage.getItem('medxverse-auth-storage');
      if (authStorage) {
        token = JSON.parse(authStorage)?.state?.token || '';
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function handleResponse<T>(res: Response, defaultErrorMessage: string): Promise<T> {
  const contentType = res.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  if (!isJson) {
    throw new Error(
      `Server returned ${res.status} (${res.statusText}) instead of JSON. Endpoint '${res.url}' may be incorrect or unavailable.`
    );
  }

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message || defaultErrorMessage);
  }

  return json;
}

export const AppointmentApiService = {
  async getAppointments(query: GetAppointmentsQueryDTO = {}): Promise<PaginatedAppointmentsResponse> {
    const params = new URLSearchParams();
    if (query.patientId) params.append('patientId', query.patientId);
    if (query.doctorId) params.append('doctorId', query.doctorId);
    if (query.status) params.append('status', query.status);
    if (query.date) params.append('date', query.date);
    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `${API_BASE_URL}/appointments?${queryString}` : `${API_BASE_URL}/appointments`;

    const res = await fetch(url, {
      headers: getAuthHeaders(),
      cache: 'no-store',
    });

    return handleResponse<PaginatedAppointmentsResponse>(
      res,
      'Failed to fetch appointments list'
    );
  },

  async getAppointmentById(id: string): Promise<IAppointment> {
    const res = await fetch(`${API_BASE_URL}/appointments/${id}`, {
      headers: getAuthHeaders(),
      cache: 'no-store',
    });

    const json = await handleResponse<{ data: IAppointment }>(
      res,
      'Failed to fetch appointment details'
    );
    return json.data;
  },

  async createAppointment(dto: CreateAppointmentDTO): Promise<IAppointment> {
    const res = await fetch(`${API_BASE_URL}/appointments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto),
    });

    const json = await handleResponse<{ data: IAppointment }>(
      res,
      'Failed to create appointment'
    );
    return json.data;
  },

  async updateAppointmentStatus(id: string, dto: UpdateAppointmentStatusDTO): Promise<IAppointment> {
    const res = await fetch(`${API_BASE_URL}/appointments/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto),
    });

    const json = await handleResponse<{ data: IAppointment }>(
      res,
      'Failed to update appointment status'
    );
    return json.data;
  },
};