import {
  CreatePatientDTO,
  AddVitalsDTO,
  GetPatientsQueryDTO,
  PaginatedPatientsResponse,
  IPatient,
  PatientWithClinicalSummary,
} from '@/types/patient';
import { getAuthHeaders, API_BASE_URL as APPOINTMENT_API_BASE_URL } from '@/services/appointment.service';

const API_BASE_URL = APPOINTMENT_API_BASE_URL;

async function requestJson<T>(url: string, init: RequestInit = {}, message: string): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...getAuthHeaders(),
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });

  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    // Preserve a useful error below.
  }

  if (!res.ok) {
    throw new Error(json?.message || `${message} (${res.status})`);
  }

  return json as T;
}

function normalizePatients(payload: any): PaginatedPatientsResponse {
  const data = payload?.data;
  const patients = Array.isArray(payload?.patients)
    ? payload.patients
    : Array.isArray(data)
      ? data
      : Array.isArray(data?.patients)
        ? data.patients
        : [];

  return {
    success: payload?.success !== false,
    patients,
    total: Number(payload?.total ?? data?.total ?? patients.length),
    page: Number(payload?.page ?? data?.page ?? 1),
    limit: Number(payload?.limit ?? data?.limit ?? 25),
    pages: Number(payload?.pages ?? data?.pages ?? 1),
  };
}

export const PatientApiService = {
  async getPatients(query: GetPatientsQueryDTO = {}): Promise<PaginatedPatientsResponse> {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));

    const payload = await requestJson<any>(
      `${API_BASE_URL}/patients?${params.toString()}`,
      {},
      'Failed to fetch patients list'
    );
    return normalizePatients(payload);
  },

  async getPatientById(id: string): Promise<IPatient> {
    const payload = await requestJson<any>(
      `${API_BASE_URL}/patients/${encodeURIComponent(id)}`,
      {},
      'Failed to fetch patient details'
    );
    return (payload?.data || payload) as IPatient;
  },

  async registerPatient(dto: CreatePatientDTO): Promise<IPatient> {
    const payload = await requestJson<any>(
      `${API_BASE_URL}/patients`,
      { method: 'POST', body: JSON.stringify(dto) },
      'Failed to register patient'
    );
    return (payload?.data || payload) as IPatient;
  },

  async recordVitals(patientId: string, dto: AddVitalsDTO): Promise<IPatient> {
    const payload = await requestJson<any>(
      `${API_BASE_URL}/patients/${encodeURIComponent(patientId)}/vitals`,
      { method: 'POST', body: JSON.stringify(dto) },
      'Failed to record vitals'
    );
    return (payload?.data || payload) as IPatient;
  },

  async getClinicalSummary(patientId: string): Promise<PatientWithClinicalSummary> {
    const payload = await requestJson<any>(
      `${API_BASE_URL}/patients/${encodeURIComponent(patientId)}/clinical-summary`,
      {},
      'Failed to fetch clinical summary'
    );
    return (payload?.data || payload) as PatientWithClinicalSummary;
  },
};
