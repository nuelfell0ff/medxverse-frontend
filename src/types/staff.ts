import type { ReactNode } from 'react';

export enum StaffRole {
  DOCTOR = 'DOCTOR',
  NURSE = 'NURSE',
  PHARMACIST = 'PHARMACIST',
  LAB_TECH = 'LAB_TECH',
  RADIOLOGY_TECH = 'RADIOLOGY_TECH',
  PHYSIOTHERAPIST = 'PHYSIOTHERAPIST',
  DENTIST = 'DENTIST',
  MIDWIFE = 'MIDWIFE',
  DIETITIAN = 'DIETITIAN',
  PSYCHOLOGIST = 'PSYCHOLOGIST',
  HEALTHCARE_ASSISTANT = 'HEALTHCARE_ASSISTANT',
  RECEPTIONIST = 'RECEPTIONIST',
  ACCOUNTANT = 'ACCOUNTANT',
  ADMINISTRATOR = 'ADMINISTRATOR',
  HR = 'HR',
  IT = 'IT',
  OTHER = 'OTHER',
}

export enum StaffCategory {
  CLINICAL = 'CLINICAL',
  ALLIED_HEALTH = 'ALLIED_HEALTH',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  OPERATIONS = 'OPERATIONS',
  SUPPORT = 'SUPPORT',
}

export enum StaffClassification {
  CONSULTANT = 'CONSULTANT',
  RESIDENT = 'RESIDENT',
  INTERN = 'INTERN',
  GENERAL = 'GENERAL',
}

export enum StaffStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

export interface StaffSpecialty {
  specialty: string;
  subSpecialty?: string;
  isPrimary?: boolean;
}

export interface ProfessionalRegistration {
  registrationBody?: string;
  registrationNumber?: string;
  registrationType?: string;
  issueDate?: string;
  expiryDate?: string;
  verificationStatus?: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface Qualification {
  qualification?: string;
  institution?: string;
  fieldOfStudy?: string;
  startDate?: string;
  completionDate?: string;
}

export interface Certification {
  name?: string;
  issuingOrganization?: string;
  certificateNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  verificationStatus?: string;
}

export interface ProfessionalExperience {
  organization?: string;
  position?: string;
  department?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface ClinicalPrivilege {
  privilege?: string;
  department?: string;
  grantedDate?: string;
  expiryDate?: string;
  status?: string;
  restrictions?: string;
}

export interface TrainingRecord {
  title?: string;
  provider?: string;
  category?: string;
  completionDate?: string;
  expiryDate?: string;
  status?: string;
  certificateNumber?: string;
}

export interface PerformanceRecord {
  reviewDate?: string;
  reviewer?: string;
  rating?: number;
  comments?: string;
  status?: string;
}

export interface AvailabilityRecord {
  day?: string;
  startTime?: string;
  endTime?: string;
  available?: boolean;
}

export interface OnCallAssignment {
  date?: string;
  shift?: string;
  department?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
}

export interface LeaveRecord {
  type?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
  status?: string;
}

export interface AttendanceRecord {
  date?: string;
  clockIn?: string;
  clockOut?: string;
  status?: string;
  overtimeHours?: number;
}

export interface IncidentRecord {
  date?: string;
  type?: string;
  description?: string;
  severity?: string;
  status?: string;
}

export interface StaffCommunication {
  date?: string;
  subject?: string;
  message?: string;
  type?: string;
  status?: string;
}

export interface StaffContact {
  phone?: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
}

export interface EmergencyContact {
  name?: string;
  relationship?: string;
  phone?: string;
  email?: string;
}

export interface StaffEmployment {
  employeeNumber?: string;
  jobTitle?: string;
  departmentId?: string;
  departmentName?: string;
  unitId?: string;
  unitName?: string;
  employmentType?: string;
  contractType?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  hireDate?: string;
  terminationDate?: string;
}

export interface IStaff {
  _id: string;
  hospitalId: string;

  staffId: string;

  firstName: string;
  middleName?: string;
  lastName: string;

  role: StaffRole;
  category: StaffCategory;
  classification: StaffClassification;

  specialties: StaffSpecialty[];

  professionalRegistrations: ProfessionalRegistration[];
  qualifications: Qualification[];
  certifications: Certification[];
  professionalExperience: ProfessionalExperience[];

  clinicalPrivileges: ClinicalPrivilege[];

  employment?: StaffEmployment;

  contact?: StaffContact;
  emergencyContact?: EmergencyContact;

  trainingRecords: TrainingRecord[];
  performanceRecords: PerformanceRecord[];

  clinicalActivityCount: number;
  activePatientCaseload: number;

  onCallAssignments: OnCallAssignment[];
  leaveRecords: LeaveRecord[];
  attendanceRecords: AttendanceRecord[];

  availability: AvailabilityRecord[];

  incidents: IncidentRecord[];
  communications: StaffCommunication[];

  status: StaffStatus;
  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffDTO {
  firstName: string;
  middleName?: string;
  lastName: string;

  role: StaffRole;

  category?: StaffCategory;
  classification?: StaffClassification;

  specialties?: StaffSpecialty[];

  professionalRegistrations?: ProfessionalRegistration[];
  qualifications?: Qualification[];
  certifications?: Certification[];
  professionalExperience?: ProfessionalExperience[];

  clinicalPrivileges?: ClinicalPrivilege[];

  employment?: StaffEmployment;

  contact?: StaffContact;
  emergencyContact?: EmergencyContact;

  trainingRecords?: TrainingRecord[];
  performanceRecords?: PerformanceRecord[];

  availability?: AvailabilityRecord[];
  onCallAssignments?: OnCallAssignment[];
  leaveRecords?: LeaveRecord[];
  attendanceRecords?: AttendanceRecord[];

  incidents?: IncidentRecord[];
  communications?: StaffCommunication[];
}

export interface UpdateStaffDTO extends Partial<CreateStaffDTO> {
  isActive?: boolean;
  status?: StaffStatus;
}

export interface StaffListFilters {
  role?: StaffRole | string;
  category?: StaffCategory | string;
  classification?: StaffClassification | string;
  departmentId?: string;
  unitId?: string;
  status?: StaffStatus | string;
  search?: string;
  isActive?: boolean | string;
}

export interface StaffDashboard {
  total: number;
  active: number;
  inactive: number;
  doctors: number;
  nurses: number;
  alliedHealth: number;
  consultants: number;
  residents: number;
  interns: number;
}

export interface StaffApiResponse<T> {
  success: boolean;
  message?: string;
  count?: number;
  data: T;
}