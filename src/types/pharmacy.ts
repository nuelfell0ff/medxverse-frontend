export enum DrugCategory {
  ANTIBIOTICS = 'ANTIBIOTICS',
  ANALGESICS = 'ANALGESICS',
  ANTIHYPERTENSIVES = 'ANTIHYPERTENSIVES',
  ANTIDIABETICS = 'ANTIDIABETICS',
  VITAMINS = 'VITAMINS',
  ICU_CRITICAL = 'ICU_CRITICAL',
  OTHER = 'OTHER',
}

export enum UnitOfMeasure {
  TABLET = 'TABLET',
  CAPSULE = 'CAPSULE',
  VIAL = 'VIAL',
  AMPOULE = 'AMPOULE',
  BOTTLE = 'BOTTLE',
  PACK = 'PACK',
  PIECE = 'PIECE',
}

export enum DispenseStatus {
  PENDING = 'PENDING',
  DISPENSED = 'DISPENSED',
  PARTIALLY_DISPENSED = 'PARTIALLY_DISPENSED',
  CANCELLED = 'CANCELLED',
}

export enum PrescriptionStatus {
  RECEIVED = 'RECEIVED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  PARTIALLY_DISPENSED = 'PARTIALLY_DISPENSED',
  DISPENSED = 'DISPENSED',
  REJECTED = 'REJECTED',
}

export enum ScreeningStatus {
  PENDING = 'PENDING',
  PASSED = 'PASSED',
  WARNING = 'WARNING',
  BLOCKED = 'BLOCKED',
}

export enum FormularyStatus {
  APPROVED = 'APPROVED',
  RESTRICTED = 'RESTRICTED',
  NOT_APPROVED = 'NOT_APPROVED',
}

export enum PharmacyBillingStatus {
  NOT_ATTEMPTED = 'NOT_ATTEMPTED',
  PENDING = 'PENDING',
  BILLED = 'BILLED',
  FAILED = 'FAILED',
}

export enum InventoryTransactionType {
  RECEIPT = 'RECEIPT',
  DISPENSE = 'DISPENSE',
  ADJUSTMENT_IN = 'ADJUSTMENT_IN',
  ADJUSTMENT_OUT = 'ADJUSTMENT_OUT',
  RETURN = 'RETURN',
  EXPIRED = 'EXPIRED',
  DAMAGED = 'DAMAGED',
}

export interface IInventoryItem {
  _id: string;
  hospitalId: string;

  name: string;
  genericName?: string;
  category: DrugCategory;

  batchNumber: string;
  barcode?: string;
  gtin?: string;

  strength?: string;
  dosageForm?: string;

  unitPrice: number;
  quantityInStock: number;
  reorderLevel: number;
  unitOfMeasure: UnitOfMeasure;

  expiryDate: string;

  controlledSubstance?: boolean;
  isActive?: boolean;
  isLowStock: boolean;

  pricingCatalogueItemId?: string;

  createdAt: string;
  updatedAt: string;
}

export interface IPrescriptionMedication {
  medicationName: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;

  dose?: string;
  route?: string;
  frequency?: string;
  duration?: string;

  quantity?: number;
  instructions?: string;

  barcode?: string;
  inventoryItemId?: string;
}

export interface IPatientSummary {
  _id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  phone?: string;
  allergies?: unknown[];
}

export interface IPrescriberSummary {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface IPrescription {
  _id: string;
  hospitalId: string;

  patientId: string | IPatientSummary;
  prescriberId: string | IPrescriberSummary;

  source?: string;
  sourceRecordId?: string;
  sourceSystem?: string;

  department?: string;
  encounterId?: string;

  medications: IPrescriptionMedication[];

  status: PrescriptionStatus;
  screeningStatus: ScreeningStatus;

  screeningSummary?: string;

  requestedAt: string;
  reviewedAt?: string;
  approvedAt?: string;

  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export interface IDispenseItem {
  prescriptionMedicationIndex: number;

  inventoryItemId: IInventoryItem | string;

  quantity: number;

  barcodeScanned: string;
  barcodeVerified: boolean;

  unitPrice: number;
  totalPrice: number;
}

export interface IDispenseRecord {
  _id: string;
  hospitalId: string;

  patientId: string | IPatientSummary;

  prescriptionId: string | IPrescription;

  encounterId?: string;

  dispensedBy: string | IPrescriberSummary;

  secondVerifierId?: string;

  items: IDispenseItem[];

  totalAmount: number;

  status: DispenseStatus;
  screeningStatus: ScreeningStatus;

  emarReferenceId?: string;

  billingStatus: PharmacyBillingStatus;
  billingErrors?: string[];

  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryItemDTO {
  name: string;
  genericName?: string;

  category: DrugCategory;

  batchNumber: string;

  barcode?: string;
  gtin?: string;

  strength?: string;
  dosageForm?: string;

  unitPrice: number;
  quantityInStock: number;

  reorderLevel?: number;

  unitOfMeasure: UnitOfMeasure;

  expiryDate: string;

  controlledSubstance?: boolean;

  pricingCatalogueItemId?: string;
}

export interface UpdateStockDTO {
  quantityChange: number;

  transactionType?: InventoryTransactionType;

  reason?: string;
}

export interface CreatePrescriptionMedicationDTO {
  medicationName: string;
  genericName?: string;

  strength?: string;
  dosageForm?: string;

  dose?: string;
  route?: string;
  frequency?: string;
  duration?: string;

  quantity?: number;

  instructions?: string;

  barcode?: string;
  inventoryItemId?: string;
}

export interface CreatePrescriptionDTO {
  patientId: string;
  prescriberId: string;

  source: string;
  sourceRecordId?: string;
  sourceSystem?: string;

  department?: string;
  encounterId?: string;

  medications: CreatePrescriptionMedicationDTO[];

  notes?: string;
}

export interface IDispenseItemDTO {
  prescriptionMedicationIndex: number;

  inventoryItemId: string;

  quantity: number;

  barcodeScanned: string;
}

export interface CreateDispenseRecordDTO {
  prescriptionId: string;

  items: IDispenseItemDTO[];

  secondVerifierId?: string;

  emarReferenceId?: string;

  notes?: string;
}

export interface CreateFormularyEntryDTO {
  medicationName: string;

  genericName?: string;

  department?: string;

  inventoryItemId?: string;

  substituteInventoryItemIds?: string[];

  status?: FormularyStatus;

  effectiveFrom?: string;

  effectiveTo?: string;

  notes?: string;
}

export interface IFormularyEntry {
  _id: string;
  hospitalId: string;

  medicationName: string;
  genericName?: string;

  department?: string;

  inventoryItemId?: string;

  substituteInventoryItemIds?: string[];

  status: FormularyStatus;

  effectiveFrom: string;
  effectiveTo?: string;

  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export interface IInventoryTransaction {
  _id: string;
  hospitalId: string;

  inventoryItemId: string;

  type: InventoryTransactionType;

  quantity: number;

  quantityBefore: number;
  quantityAfter: number;

  performedBy: string;

  reason?: string;

  referenceType?: string;
  referenceId?: string;

  createdAt: string;
}

export interface IPharmacyScreeningIssue {
  code: string;

  severity: 'INFO' | 'WARNING' | 'BLOCK';

  message: string;

  medicationIndex?: number;
}

export interface IPharmacyScreeningResult {
  status: ScreeningStatus;

  issues: IPharmacyScreeningIssue[];

  checkedAt: string;
}

export interface GetInventoryQueryDTO {
  page?: number | string;
  limit?: number | string;

  category?: DrugCategory;

  isLowStock?: string;
  controlledSubstance?: string;

  search?: string;
}

export interface GetPrescriptionQueryDTO {
  page?: number | string;
  limit?: number | string;

  patientId?: string;

  status?: PrescriptionStatus;
}

export interface GetDispenseQueryDTO {
  page?: number | string;
  limit?: number | string;

  patientId?: string;

  prescriptionId?: string;

  status?: DispenseStatus;

  billingStatus?: PharmacyBillingStatus;
}

export interface GetFormularyQueryDTO {
  page?: number | string;
  limit?: number | string;

  department?: string;

  status?: FormularyStatus;

  search?: string;
}