import {
  CreatePatientDTO,
  AddVitalsDTO,
  GetPatientsQueryDTO,
  PaginatedPatientsResponse,
  IPatient,
  PatientWithClinicalSummary,
} from '@/types/patient';
import { useAuthStore } from '@/store/useAuthStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://medxverse-backend.onrender.com/api/v1';

function getAuthHeaders(): HeadersInit {
  // 1. Get token directly from Zustand store state
  let token: string | null = useAuthStore.getState().token;

  // 2. Fallback to direct localStorage if token isn't in Zustand store root
  if (!token && typeof window !== 'undefined') {
    token = localStorage.getItem('token');
  }

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const PatientApiService = {
  async getPatients(query: GetPatientsQueryDTO): Promise<PaginatedPatientsResponse> {
    const params = new URLSearchParams();
    if (query.search) params.append('search', query.search);
    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());

    const res = await fetch(`${API_BASE_URL}/patients?${params.toString()}`, {
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to fetch patients list');
    }
    return res.json();
  },

  async getPatientById(id: string): Promise<IPatient> {
    const res = await fetch(`${API_BASE_URL}/patients/${id}`, {
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to fetch patient details');
    }
    const data = await res.json();
    return data.data;
  },

  async registerPatient(dto: CreatePatientDTO): Promise<IPatient> {
    const res = await fetch(`${API_BASE_URL}/patients`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to register patient');
    }
    const data = await res.json();
    return data.data;
  },

  async recordVitals(patientId: string, dto: AddVitalsDTO): Promise<IPatient> {
    const res = await fetch(`${API_BASE_URL}/patients/${patientId}/vitals`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to record vitals');
    }
    const data = await res.json();
    return data.data;
  },

  async getClinicalSummary(patientId: string): Promise<PatientWithClinicalSummary> {
    const res = await fetch(`${API_BASE_URL}/patients/${patientId}/clinical-summary`, {
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to fetch clinical summary');
    }
    const data = await res.json();
    return data.data;
  },
};