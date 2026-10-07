export type PatientAssignmentRole =
  | 'PRIMARY_PHYSICIAN'
  | 'ATTENDING_PHYSICIAN'
  | 'CONSULTANT'
  | 'PRIMARY_NURSE'
  | 'CARE_TEAM'
  | 'PHARMACIST'
  | 'LAB_TECHNICIAN'
  | 'RADIOLOGIST'
  | 'CARE_COORDINATOR'
  | 'OTHER';

export type PatientAssignmentStatus = 'ACTIVE' | 'ENDED' | 'CANCELLED';

export type PatientAssignmentSource =
  | 'MANUAL'
  | 'APPOINTMENT'
  | 'ADMISSION'
  | 'EMERGENCY'
  | 'REFERRAL';

export interface StaffPatientAssignment {
  _id: string;
  hospitalId?: string;
  patientId: string | Record<string, unknown>;
  staffId: string | Record<string, unknown>;
  role: PatientAssignmentRole;
  status: PatientAssignmentStatus;
  departmentId?: string | Record<string, unknown>;
  departmentName?: string;
  source: PatientAssignmentSource;
  appointmentId?: string;
  assignedBy?: string;
  assignedByUserType?: 'STAFF' | 'ACCOUNT';
  startAt: string;
  endAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffPatient {
  _id: string;
  firstName?: string;
  lastName?: string;
  mrn?: string;
  universalPatientId?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  email?: string;
  bloodGroup?: string;
  isFlagged?: boolean;
  flagReason?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  assignments: StaffPatientAssignment[];
}

export interface StaffPatientsResponse {
  patients: StaffPatient[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface MyPatientResponse {
  patient: StaffPatient | Record<string, unknown>;
  assignments: StaffPatientAssignment[];
}

export interface PatientAssignmentsResponse {
  assignments?: StaffPatientAssignment[];
}

export interface CreatePatientAssignmentInput {
  patientId: string;
  staffId: string;
  role: PatientAssignmentRole;
  departmentId?: string;
  source?: PatientAssignmentSource;
  appointmentId?: string;
  startAt?: string;
  endAt?: string;
  notes?: string;
}

export interface UpdatePatientAssignmentInput {
  role?: PatientAssignmentRole;
  departmentId?: string;
  status?: PatientAssignmentStatus;
  endAt?: string;
  notes?: string;
}
