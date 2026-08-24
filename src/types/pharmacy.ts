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

export interface IInventoryItem {
  _id: string;
  hospitalId: string;
  name: string;
  genericName?: string;
  category: DrugCategory;
  batchNumber: string;
  unitPrice: number;
  quantityInStock: number;
  reorderLevel: number;
  unitOfMeasure: UnitOfMeasure;
  expiryDate: string;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IDispenseItem {
  inventoryItemId: IInventoryItem | string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface IDispenseRecord {
  _id: string;
  hospitalId: string;
  patientId: {
    _id: string;
    firstName: string;
    lastName: string;
    mrn: string;
    phone?: string;
  };
  consultationId?: string;
  dispensedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  items: IDispenseItem[];
  totalAmount: number;
  status: DispenseStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryItemDTO {
  name: string;
  genericName?: string;
  category: DrugCategory;
  batchNumber: string;
  unitPrice: number;
  quantityInStock: number;
  reorderLevel?: number;
  unitOfMeasure: UnitOfMeasure;
  expiryDate: string;
}

export interface UpdateStockDTO {
  quantityChange: number;
  reason?: string;
}

export interface IDispenseItemDTO {
  inventoryItemId: string;
  quantity: number;
}

export interface CreateDispenseRecordDTO {
  patientId: string;
  consultationId?: string;
  items: IDispenseItemDTO[];
  notes?: string;
}