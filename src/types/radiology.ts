export enum ImagingModality {
  XRAY = 'XRAY',
  CT = 'CT',
  MRI = 'MRI',
  ULTRASOUND = 'ULTRASOUND',
  MAMMOGRAPHY = 'MAMMOGRAPHY',
  FLUOROSCOPY = 'FLUOROSCOPY',
  NUCLEAR_MEDICINE = 'NUCLEAR_MEDICINE',
  PET = 'PET',
  INTERVENTIONAL = 'INTERVENTIONAL',
  OTHER = 'OTHER',
}

export enum RadiologyOrderStatus {
  REQUESTED = 'REQUESTED',
  SCHEDULED = 'SCHEDULED',
  PATIENT_ARRIVED = 'PATIENT_ARRIVED',
  PREPARING = 'PREPARING',
  READY_FOR_EXAM = 'READY_FOR_EXAM',
  IN_PROGRESS = 'IN_PROGRESS',
  IMAGE_ACQUISITION_COMPLETE = 'IMAGE_ACQUISITION_COMPLETE',
  REPORTING = 'REPORTING',
  REPORTED = 'REPORTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PriorityLevel {
  STAT = 'STAT',
  URGENT = 'URGENT',
  ROUTINE = 'ROUTINE',
}

export enum AssignmentRole {
  RADIOLOGIST = 'RADIOLOGIST',
  RADIOGRAPHER = 'RADIOGRAPHER',
  TECHNOLOGIST = 'TECHNOLOGIST',
  NURSE = 'NURSE',
  ADMIN = 'ADMIN',
}

export enum ExaminationQueueStatus {
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD',
}

export enum ReportStatus {
  DRAFT = 'DRAFT',
  FINAL = 'FINAL',
  AMENDED = 'AMENDED',
}

export enum CriticalResultStatus {
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  PENDING = 'PENDING',
  NOTIFIED = 'NOTIFIED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
}

export enum PregnancyScreeningStatus {
  NOT_REQUIRED = 'NOT_REQUIRED',
  PENDING = 'PENDING',
  NEGATIVE = 'NEGATIVE',
  POSITIVE = 'POSITIVE',
  UNKNOWN = 'UNKNOWN',
}

export enum ContrastStatus {
  NOT_REQUIRED = 'NOT_REQUIRED',
  PLANNED = 'PLANNED',
  ADMINISTERED = 'ADMINISTERED',
  DECLINED = 'DECLINED',
  CONTRAINDICATED = 'CONTRAINDICATED',
}

export enum AIStudyPriority {
  NOT_PROCESSED = 'NOT_PROCESSED',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface RadiologyPatient {
  _id: string;
  firstName?: string;
  lastName?: string;
  mrn?: string;
  gender?: string;
  dateOfBirth?: string;
}

export interface RadiologyStaff {
  _id: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  department?: string;
  phone?: string;
  email?: string;
}

export interface RadiologyAssignment {
  userId: RadiologyStaff | string;
  role: AssignmentRole;
  assignedAt?: string;
  assignedBy?: RadiologyStaff | string;
  notes?: string;
}

export interface RadiologyScheduling {
  scheduledDate?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  estimatedDurationMinutes?: number;
  modalityId?: string;
  theatreOrRoom?: string;
  scheduledBy?: string;
}

export interface PatientPreparation {
  instructions?: string;
  fastingRequired?: boolean;
  fastingHours?: number;
  hydrationRequired?: boolean;
  medicationInstructions?: string;
  preparationCompleted?: boolean;
  preparationNotes?: string;
}

export interface ContrastDetails {
  status?: ContrastStatus;
  contrastName?: string;
  contrastType?: string;
  dose?: number;
  doseUnit?: string;
  route?: string;
  administeredAt?: string;
  administeredBy?: string | RadiologyStaff;
  reactionObserved?: boolean;
  reactionDescription?: string;
  notes?: string;
}

export interface PregnancyScreening {
  status?: PregnancyScreeningStatus;
  screenedAt?: string;
  screenedBy?: string | RadiologyStaff;
  testType?: string;
  testResult?: string;
  notes?: string;
}

export interface RadiationExposure {
  dose?: number;
  doseUnit?: string;
  doseAreaProduct?: number;
  doseAreaProductUnit?: string;
  ctDoseIndex?: number;
  doseLengthProduct?: number;
  recordedAt?: string;
  recordedBy?: string | RadiologyStaff;
  notes?: string;
}

export interface PacsMetadata {
  studyInstanceUid?: string;
  seriesInstanceUid?: string;
  accessionNumber?: string;
  studyId?: string;
  studyDate?: string;
  imageCount?: number;
  seriesCount?: number;
  modality?: ImagingModality;
  dicomViewerUrl?: string;
  dicomFileKeys?: string[];
  storageLocation?: string;
  storageStatus?: 'PENDING' | 'STORED' | 'ARCHIVED' | 'FAILED';
  keyImageIds?: string[];
  priorStudyInstanceUids?: string[];
  exportEnabled?: boolean;
  sharedLink?: string;
  sharedLinkExpiresAt?: string;
}

export interface CriticalResult {
  status?: CriticalResultStatus;
  finding?: string;
  notifiedUserId?: string | RadiologyStaff;
  notifiedAt?: string;
  acknowledgedAt?: string;
  notificationMethod?: 'PHONE' | 'SMS' | 'EMAIL' | 'IN_APP';
  notificationNotes?: string;
}

export interface RadiologyReport {
  status?: ReportStatus;
  findings?: string;
  impression?: string;
  radiologistNotes?: string;
  templateId?: string;
  version?: number;
  draftedAt?: string;
  signedAt?: string;
  signedBy?: string | RadiologyStaff;
  amendedAt?: string;
  amendmentReason?: string;
  criticalResult?: CriticalResult;
  versions?: Array<{
    version: number;
    findings: string;
    impression: string;
    radiologistNotes?: string;
    status: ReportStatus;
    createdBy: string | RadiologyStaff;
    createdAt: string;
    signedAt?: string;
  }>;
}

export interface AIAnalysis {
  enabled?: boolean;
  modelName?: string;
  modelVersion?: string;
  processedAt?: string;
  priority?: AIStudyPriority;
  confidence?: number;
  findings?: string[];
  measurements?: Record<string, number>;
  recommendations?: string[];
  qualityPassed?: boolean;
  qualityNotes?: string;
}

export interface RadiologyOrder {
  _id: string;

  patientId: RadiologyPatient | string;

  orderingDoctorId: RadiologyStaff | string;

  radiologistId?: RadiologyStaff | string;

  modality: ImagingModality;

  procedureName: string;

  bodyPart: string;

  clinicalIndication: string;

  priority: PriorityLevel;

  status: RadiologyOrderStatus;

  accessionNumber?: string;

  scheduling?: RadiologyScheduling;

  assignments?: RadiologyAssignment[];

  patientPreparation?: PatientPreparation;

  contrast?: ContrastDetails;

  pregnancyScreening?: PregnancyScreening;

  radiationExposure?: RadiationExposure;

  pacsMetadata?: PacsMetadata;

  report?: RadiologyReport;

  findings?: string;

  impression?: string;

  radiologistNotes?: string;

  reportedAt?: string;

  cancellationReason?: string;

  queuePosition?: number;

  queueStatus?: ExaminationQueueStatus;

  aiAnalysis?: AIAnalysis;

  createdAt: string;

  updatedAt: string;
}

export interface CreateRadiologyOrderInput {
  patientId: string;
  orderingDoctorId?: string;
  modality: ImagingModality;
  procedureName: string;
  bodyPart: string;
  clinicalIndication: string;
  priority?: PriorityLevel;
  accessionNumber?: string;

  scheduling?: {
    scheduledDate?: string;
    scheduledStartTime?: string;
    scheduledEndTime?: string;
    estimatedDurationMinutes?: number;
    modalityId?: string;
    theatreOrRoom?: string;
  };

  patientPreparation?: PatientPreparation;

  contrast?: ContrastDetails;

  pregnancyScreening?: PregnancyScreening;
}

export interface RadiologyOrdersResponse {
  orders: RadiologyOrder[];
  total: number;
  page: number;
  totalPages: number;
}