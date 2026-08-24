import {
  CreateStaffDTO,
  IStaff,
  StaffDashboard,
  StaffListFilters,
  UpdateStaffDTO,
  EmploymentType,
  StaffClassification,
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

/**
 * Build authentication headers.
 */
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

/**
 * Normalize employment type values before
 * sending them to the backend.
 */
const normalizeEmploymentType = (
  value: unknown
): EmploymentType => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  const aliases: Record<string, EmploymentType> = {
    FULL_TIME: EmploymentType.FULL_TIME,
    FULLTIME: EmploymentType.FULL_TIME,

    PART_TIME: EmploymentType.PART_TIME,
    PARTTIME: EmploymentType.PART_TIME,

    CONTRACT: EmploymentType.CONTRACT,
    LOCUM: EmploymentType.LOCUM,
    TEMPORARY: EmploymentType.TEMPORARY,
    INTERN: EmploymentType.INTERN,
    VOLUNTEER: EmploymentType.VOLUNTEER,
  };

  return (
    aliases[normalized] ||
    EmploymentType.FULL_TIME
  );
};

/**
 * Normalize classification values before
 * sending them to the backend.
 */
const normalizeClassification = (
  value: unknown
): StaffClassification => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  const aliases: Record<
    string,
    StaffClassification
  > = {
    CONSULTANT: StaffClassification.CONSULTANT,
    SPECIALIST: StaffClassification.SPECIALIST,
    RESIDENT: StaffClassification.RESIDENT,
    INTERN: StaffClassification.INTERN,
    SENIOR: StaffClassification.SENIOR,
    JUNIOR: StaffClassification.JUNIOR,
    GENERAL: StaffClassification.GENERAL,
  };

  return (
    aliases[normalized] ||
    StaffClassification.GENERAL
  );
};

/**
 * Normalize staff payload before sending it
 * to the backend.
 */
const normalizeStaffPayload = (
  dto: CreateStaffDTO | UpdateStaffDTO
) => {
  const payload: Record<string, any> = {
    ...dto,
  };

  if (payload.employment) {
    payload.employment = {
      ...payload.employment,

      employmentType: normalizeEmploymentType(
        payload.employment.employmentType
      ),

      classification: normalizeClassification(
        payload.employment.classification
      ),
    };
  }

  if (Array.isArray(payload.professionalRegistrations)) {
    payload.professionalRegistrations =
      payload.professionalRegistrations
        .map((registration: any) => ({
          ...registration,

          regulatoryBody:
            registration.regulatoryBody ||
            registration.registrationBody ||
            '',
        }))
        .filter(
          (registration: any) =>
            registration.regulatoryBody &&
            registration.registrationNumber
        );
  }

  return payload;
};

/**
 * Handle API responses consistently.
 */
async function handleResponse<T>(
  res: Response,
  defaultErrorMessage: string
): Promise<T> {
  const contentType =
    res.headers.get('content-type');

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

/**
 * Convert a filter value into a query value.
 *
 * "ALL" means no filter and therefore returns undefined.
 */
const getFilterValue = (
  value: unknown
): string | undefined => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return undefined;
  }

  const normalized = String(value).trim();

  if (
    !normalized ||
    normalized.toUpperCase() === 'ALL'
  ) {
    return undefined;
  }

  return normalized;
};

/**
 * Convert isActive filter into the exact boolean
 * expected by the backend query.
 */
const getIsActiveFilter = (
  value: unknown
): boolean | undefined => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value)
    .trim()
    .toLowerCase();

  if (normalized === 'all') {
    return undefined;
  }

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return undefined;
};

export class StaffApiService {
  /**
   * Get hospital staff.
   */
  public static async getStaff(
    filters?: StaffListFilters
  ): Promise<{
    success: boolean;
    count: number;
    data: IStaff[];
  }> {
    const params = new URLSearchParams();

    const role = getFilterValue(filters?.role);

    if (role) {
      params.append('role', role);
    }

    const category = getFilterValue(
      filters?.category
    );

    if (category) {
      params.append('category', category);
    }

    const classification = getFilterValue(
      filters?.classification
    );

    if (classification) {
      params.append(
        'classification',
        classification
      );
    }

    const departmentId = getFilterValue(
      filters?.departmentId
    );

    if (departmentId) {
      params.append(
        'departmentId',
        departmentId
      );
    }

    const unitId = getFilterValue(
      filters?.unitId
    );

    if (unitId) {
      params.append('unitId', unitId);
    }

    const status = getFilterValue(
      filters?.status
    );

    if (status) {
      params.append('status', status);
    }

    const search = filters?.search?.trim();

    if (search) {
      params.append('search', search);
    }

    const isActive = getIsActiveFilter(
      filters?.isActive
    );

    if (isActive !== undefined) {
      params.append(
        'isActive',
        String(isActive)
      );
    }

    const queryString = params.toString();

    const url = queryString
      ? `${API_BASE_URL}/staff?${queryString}`
      : `${API_BASE_URL}/staff`;

    const res = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return handleResponse(
      res,
      'Failed to fetch staff members'
    );
  }

  /**
   * Get one staff member by MongoDB _id.
   */
  public static async getStaffById(
    id: string
  ): Promise<IStaff> {
    if (!id?.trim()) {
      throw new Error('Staff ID is required');
    }

    const res = await fetch(
      `${API_BASE_URL}/staff/${encodeURIComponent(id)}`,
      {
        method: 'GET',
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

  /**
   * Create staff member.
   */
  public static async createStaff(
    dto: CreateStaffDTO
  ): Promise<IStaff> {
    const payload =
      normalizeStaffPayload(dto);

    const res = await fetch(
      `${API_BASE_URL}/staff`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      }
    );

    const json =
      await handleResponse<{ data: IStaff }>(
        res,
        'Failed to create staff member'
      );

    return json.data;
  }

  /**
   * Update staff member.
   */
  public static async updateStaff(
    id: string,
    dto: UpdateStaffDTO
  ): Promise<IStaff> {
    if (!id?.trim()) {
      throw new Error('Staff ID is required');
    }

    const payload =
      normalizeStaffPayload(dto);

    const res = await fetch(
      `${API_BASE_URL}/staff/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      }
    );

    const json =
      await handleResponse<{ data: IStaff }>(
        res,
        'Failed to update staff member'
      );

    return json.data;
  }

  /**
   * Toggle active/inactive status.
   */
  public static async toggleStaffStatus(
    id: string
  ): Promise<IStaff> {
    if (!id?.trim()) {
      throw new Error('Staff ID is required');
    }

    const res = await fetch(
      `${API_BASE_URL}/staff/${encodeURIComponent(id)}/toggle-status`,
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

  /**
   * Get staff dashboard statistics.
   */
  public static async getStaffDashboard(): Promise<StaffDashboard> {
    const res = await fetch(
      `${API_BASE_URL}/staff/dashboard`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    const json =
      await handleResponse<{
        data: StaffDashboard;
      }>(
        res,
        'Failed to fetch staff dashboard'
      );

    return json.data;
  }

  /**
   * Get staff with credentials expiring
   * within the specified number of days.
   */
  public static async getExpiringCredentials(
    days = 30
  ): Promise<IStaff[]> {
    if (!Number.isFinite(days) || days < 0) {
      throw new Error(
        'Days must be a number greater than or equal to 0'
      );
    }

    const res = await fetch(
      `${API_BASE_URL}/staff/credentials/expiring?days=${encodeURIComponent(
        String(days)
      )}`,
      {
        method: 'GET',
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