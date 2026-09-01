export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum AllergySeverity {
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
}

export enum MedicalHistoryStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  CHRONIC = 'CHRONIC',
}

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type Genotype = 'AA' | 'AS' | 'SS' | 'AC';

export interface IVitals {
  _id?: string;
  temperature?: number;
  systolicBp?: number;
  diastolicBp?: number;
  pulseRate?: number;
  respiratoryRate?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  recordedBy?: string;
  recordedAt: string;
}

export interface IAllergy {
  _id?: string;
  allergen: string;
  reaction: string;
  severity: AllergySeverity;
}

export interface IMedicalHistory {
  _id?: string;
  condition: string;
  diagnosedDate?: string;
  status: MedicalHistoryStatus;
  notes?: string;
}

export interface IPatient {
  _id: string;
  hospitalId: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  phone: string;
  email?: string;
  address?: string;
  maritalStatus?: string;
  occupation?: string;
  nextOfKin?: string;
  informant?: string;
  bloodGroup?: BloodGroup;
  genotype?: Genotype;
  policyNumber?: string;
  hmoId?: string;
  vitalsHistory: IVitals[];
  allergies: IAllergy[];
  medicalHistory: IMedicalHistory[];
  isFlagged: boolean;
  flagReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePatientDTO {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  phone: string;
  email?: string;
  address?: string;
  maritalStatus: string;
  occupation: string;
  nextOfKin: string;
  informant: string;
  bloodGroup?: BloodGroup;
  genotype?: Genotype;
  policyNumber?: string;
  hmoId?: string;
}

export interface AddVitalsDTO {
  temperature?: number;
  systolicBp?: number;
  diastolicBp?: number;
  pulseRate?: number;
  respiratoryRate?: number;
  spo2?: number;
  weight?: number;
  height?: number;
}

export interface GetPatientsQueryDTO {
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedPatientsResponse {
  success: boolean;
  patients: IPatient[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ClinicalSummaryItem {
  id?: string;
  date?: string | Date;
  title: string;
  status?: string;
  summary?: string;
  details?: Record<string, unknown>;
}

export interface PatientBillingSummary {
  totalCharges: number;
  totalPaid: number;
  balance: number;
  items: ClinicalSummaryItem[];
}

export interface PatientClinicalSummary {
  surgery: ClinicalSummaryItem[];
  radiology: ClinicalSummaryItem[];
  laboratory: ClinicalSummaryItem[];
  pharmacy: ClinicalSummaryItem[];
  outpatient: ClinicalSummaryItem[];
  billing: PatientBillingSummary;
}

export interface PatientWithClinicalSummary extends IPatient {
  clinicalSummary: PatientClinicalSummary;
}