import {
  CreateStaffDTO,
  IStaff,
  StaffDashboard,
  StaffListFilters,
  UpdateStaffDTO,
} from '@/types/staff';

import { useAuthStore } from '@/store/useAuthStore';

const DEFAULT_HOST =
  'https://medxverse-backend.onrender.com';

const RAW_URL = (
  process.env.NEXT_PUBLIC_API_URL || DEFAULT_HOST
)
  .trim()
  .replace(/\/+$/, '');

const API_BASE_URL = RAW_URL.endsWith('/api/v1')
  ? RAW_URL
  : `${RAW_URL}/api/v1`;

const getAuthHeaders = (): Record<string, string> => {
  let token = '';

  try {
    token = useAuthStore.getState().token || '';
  } catch {
    // Ignore store access errors.
  }

  if (!token && typeof window !== 'undefined') {
    token = localStorage.getItem('token') || '';
  }

  if (!token && typeof window !== 'undefined') {
    try {
      const authStorage = localStorage.getItem(
        'medxverse-auth-storage'
      );

      if (authStorage) {
        token =
          JSON.parse(authStorage)?.state?.token || '';
      }
    } catch {
      // Ignore invalid persisted auth state.
    }
  }

  return {
    'Content-Type': 'application/json',
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
};

async function handleResponse<T>(
  res: Response,
  defaultErrorMessage: string
): Promise<T> {
  const contentType = res.headers.get('content-type');
  const isJson =
    contentType?.includes('application/json');

  if (!isJson) {
    throw new Error(
      `Server returned ${res.status} (${res.statusText}) instead of JSON.`
    );
  }

  const json = await res.json();

  if (!res.ok) {
    throw new Error(
      json?.message || defaultErrorMessage
    );
  }

  return json;
}

export class StaffApiService {
  public static async getStaff(
    filters?: StaffListFilters
  ): Promise<{
    success: boolean;
    count: number;
    data: IStaff[];
  }> {
    const params = new URLSearchParams();

    if (
      filters?.role &&
      filters.role !== 'ALL'
    ) {
      params.append('role', String(filters.role));
    }

    if (
      filters?.category &&
      filters.category !== 'ALL'
    ) {
      params.append(
        'category',
        String(filters.category)
      );
    }

    if (
      filters?.classification &&
      filters.classification !== 'ALL'
    ) {
      params.append(
        'classification',
        String(filters.classification)
      );
    }

    if (filters?.departmentId) {
      params.append(
        'departmentId',
        filters.departmentId
      );
    }

    if (filters?.unitId) {
      params.append(
        'unitId',
        filters.unitId
      );
    }

    if (
      filters?.status &&
      filters.status !== 'ALL'
    ) {
      params.append(
        'status',
        String(filters.status)
      );
    }

    if (filters?.search?.trim()) {
      params.append(
        'search',
        filters.search.trim()
      );
    }

    if (
      filters?.isActive !== undefined &&
      filters.isActive !== 'ALL'
    ) {
      params.append(
        'isActive',
        String(filters.isActive)
      );
    }

    const queryString = params.toString();

    const url = queryString
      ? `${API_BASE_URL}/staff?${queryString}`
      : `${API_BASE_URL}/staff`;

    const res = await fetch(url, {
      headers: getAuthHeaders(),
    });

    return handleResponse(
      res,
      'Failed to fetch staff members'
    );
  }

  public static async getStaffById(
    id: string
  ): Promise<IStaff> {
    const res = await fetch(
      `${API_BASE_URL}/staff/${id}`,
      {
        headers: getAuthHeaders(),
      }
    );

    const json =
      await handleResponse<{ data: IStaff }>(
        res,
        'Failed to fetch staff details'
      );

    return json.data;
  }

  public static async createStaff(
    dto: CreateStaffDTO
  ): Promise<IStaff> {
    const res = await fetch(
      `${API_BASE_URL}/staff`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(dto),
      }
    );

    const json =
      await handleResponse<{ data: IStaff }>(
        res,
        'Failed to create staff member'
      );

    return json.data;
  }

  public static async updateStaff(
    id: string,
    dto: UpdateStaffDTO
  ): Promise<IStaff> {
    const res = await fetch(
      `${API_BASE_URL}/staff/${id}`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(dto),
      }
    );

    const json =
      await handleResponse<{ data: IStaff }>(
        res,
        'Failed to update staff member'
      );

    return json.data;
  }

  public static async toggleStaffStatus(
    id: string
  ): Promise<IStaff> {
    const res = await fetch(
      `${API_BASE_URL}/staff/${id}/toggle-status`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
      }
    );

    const json =
      await handleResponse<{ data: IStaff }>(
        res,
        'Failed to toggle staff status'
      );

    return json.data;
  }

  public static async getStaffDashboard(): Promise<StaffDashboard> {
    const res = await fetch(
      `${API_BASE_URL}/staff/dashboard`,
      {
        headers: getAuthHeaders(),
      }
    );

    const json =
      await handleResponse<{ data: StaffDashboard }>(
        res,
        'Failed to fetch staff dashboard'
      );

    return json.data;
  }

  public static async getExpiringCredentials(
    days = 30
  ): Promise<IStaff[]> {
    const res = await fetch(
      `${API_BASE_URL}/staff/credentials/expiring?days=${days}`,
      {
        headers: getAuthHeaders(),
      }
    );

    const json =
      await handleResponse<{ data: IStaff[] }>(
        res,
        'Failed to fetch expiring credentials'
      );

    return json.data;
  }
}