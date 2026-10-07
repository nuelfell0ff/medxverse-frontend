import { apiClient } from '@/lib/api-client';
import {
  CreatePatientAssignmentInput,
  MyPatientResponse,
  StaffPatientsResponse,
  UpdatePatientAssignmentInput,
} from '@/types/patient-assignment';

function unwrap<T>(response: any): T {
  return (response?.data ?? response) as T;
}

export const patientAssignmentService = {
  async getMyPatients(params: {
    search?: string;
    status?: string;
    role?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<StaffPatientsResponse> {
    const response = await apiClient.get('/patient-assignments/mine', {
      params: {
        ...(params.search?.trim() ? { search: params.search.trim() } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.role ? { role: params.role } : {}),
        ...(params.page ? { page: params.page } : {}),
        ...(params.limit ? { limit: params.limit } : {}),
      },
    });

    return unwrap<StaffPatientsResponse>(response);
  },

  async getMyPatient(patientId: string): Promise<MyPatientResponse> {
    const response = await apiClient.get(
      `/patient-assignments/mine/${encodeURIComponent(patientId)}`,
    );

    return unwrap<MyPatientResponse>(response);
  },

  async getPatientAssignments(patientId: string) {
    const response = await apiClient.get(
      `/patient-assignments/patient/${encodeURIComponent(patientId)}`,
    );

    const data = unwrap<any>(response);

    if (Array.isArray(data)) {
      return data;
    }

    return data?.assignments || [];
  },

  async getAssignment(id: string) {
    const response = await apiClient.get(
      `/patient-assignments/${encodeURIComponent(id)}`,
    );

    return unwrap(response);
  },

  async createAssignment(input: CreatePatientAssignmentInput) {
    const response = await apiClient.post(
      '/patient-assignments',
      input,
    );

    return unwrap(response);
  },

  async updateAssignment(
    id: string,
    input: UpdatePatientAssignmentInput,
  ) {
    const response = await apiClient.patch(
      `/patient-assignments/${encodeURIComponent(id)}`,
      input,
    );

    return unwrap(response);
  },

  async syncAppointments() {
    const response = await apiClient.post(
      '/patient-assignments/sync-appointments',
    );

    return unwrap(response);
  },
};
