export enum StaffRole {
  DOCTOR = 'DOCTOR',
  NURSE = 'NURSE',
  PHARMACIST = 'PHARMACIST',
  LAB_TECH = 'LAB_TECH',
  RECEPTIONIST = 'RECEPTIONIST',
  ACCOUNTANT = 'ACCOUNTANT',
  OTHER = 'OTHER',
}

export interface IStaff {
  _id: string;
  hospitalId: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  department?: string;
  licenseNumber?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffDTO {
  firstName: string;
  lastName: string;
  role: StaffRole;
  department?: string;
  licenseNumber?: string;
  phone?: string;
  email?: string;
}

export interface UpdateStaffDTO {
  firstName?: string;
  lastName?: string;
  role?: StaffRole;
  department?: string;
  licenseNumber?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
}

export interface GetStaffFilters {
  role?: StaffRole | string;
  search?: string;
  isActive?: boolean | string;
}