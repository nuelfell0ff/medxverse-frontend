'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Barcode,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DollarSign,
  FileCheck2,
  Filter,
  History,
  Loader2,
  PackageCheck,
  Pill,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Stethoscope,
  X,
} from 'lucide-react';

import {
  DrugCategory,
  DispenseStatus,
  IInventoryItem,
  IDispenseRecord,
  CreateInventoryItemDTO,
  PrescriptionStatus,
  ScreeningStatus,
  FormularyStatus,
} from '@/types/pharmacy';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://medxverse-backend.onrender.com';

type Tab = 'prescriptions' | 'inventory' | 'dispenses' | 'formulary';

const UNIT_OF_MEASURE_VALUES = [
  'TABLET',
  'CAPSULE',
  'VIAL',
  'AMPOULE',
  'BOTTLE',
  'PACK',
  'PIECE',
] as const;

type UnitOfMeasure = typeof UNIT_OF_MEASURE_VALUES[number];

interface PharmacyInventoryItem extends IInventoryItem {
  barcode?: string;
  controlledSubstance?: boolean;
  isActive?: boolean;
  pricingCatalogueItemId?: string;
}

interface PharmacyDispenseItemDTO {
  prescriptionMedicationIndex: number;
  inventoryItemId: string;
  quantity: number;
  barcodeScanned: string;
}

interface PharmacyCreateDispenseRecordDTO {
  prescriptionId: string;
  items: PharmacyDispenseItemDTO[];
  secondVerifierId?: string;
  emarReferenceId?: string;
  notes?: string;
}

interface IPatient {
  _id: string;
  firstName: string;
  lastName: string;
  mrn?: string;
  phone?: string;
  allergies?: unknown[];
}

interface IPrescriptionMedication {
  medicationName: string;
  genericName?: string;
  dosage?: string;
  dose?: string;
  route?: string;
  frequency?: string;
  duration?: string;
  quantity?: number;
  unitOfMeasure?: string;
  barcode?: string;
  inventoryItemId?: string;
  instructions?: string;
}

interface IPrescription {
  _id: string;
  patientId: IPatient | string;
  prescriberId?:
    | {
        _id?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
      }
    | string;
  prescriberName?: string;
  department?: string;
  source?: string;
  sourceSystem?: string;
  encounterId?: string;
  medications: IPrescriptionMedication[];
  status: PrescriptionStatus;
  screeningStatus: ScreeningStatus;
  screeningSummary?: string;
  requestedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  createdAt?: string;
  notes?: string;
}

interface IFormularyEntry {
  _id: string;
  medicationName: string;
  genericName?: string;
  department?: string;
  status: FormularyStatus | string;
  effectiveFrom?: string;
  effectiveTo?: string;
  inventoryItemId?: string;
}

interface CreatePrescriptionFormDTO {
  patientId: string;
  prescriberId?: string;
  prescriberName?: string;
  source: string;
  sourceRecordId?: string;
  sourceSystem?: string;
  department?: string;
  encounterId?: string;
  medicationName: string;
  genericName?: string;
  dosage?: string;
  dose?: string;
  route?: string;
  frequency?: string;
  duration?: string;
  quantity?: number;
  unitOfMeasure?: string;
  barcode?: string;
  instructions?: string;
  notes?: string;
}

interface CreateFormularyFormDTO {
  medicationName: string;
  genericName?: string;
  department?: string;
  status?: FormularyStatus;
  effectiveFrom?: string;
  effectiveTo?: string;
  inventoryItemId?: string;
  substituteInventoryItemIds?: string[];
}

interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

interface PatientSearchResult {
  patients?: IPatient[];
  data?: IPatient[];
}

interface DispenseItemDraft {
  prescriptionMedicationIndex: number;
  inventoryItemId: string;
  quantity: number;
  barcodeScanned: string;
}

interface DispenseModalProps {
  prescription: IPrescription | null;
  inventory: PharmacyInventoryItem[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dto: PharmacyCreateDispenseRecordDTO) => Promise<void>;
}

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload?.message ||
        payload?.error ||
        `Request failed with status ${response.status}`,
    );
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    payload.data !== undefined
  ) {
    return payload.data as T;
  }

  return payload as T;
}

function formatMoney(value: number | undefined | null) {
  return `₦${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value?: string) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getPatientName(patient: unknown) {
  if (!patient) return 'Unknown patient';

  if (typeof patient === 'string') return patient;

  if (typeof patient === 'object') {
    const value = patient as Partial<IPatient>;
    return `${value.firstName || ''} ${value.lastName || ''}`.trim() || 'Unknown patient';
  }

  return 'Unknown patient';
}

function getPatientMrn(patient: unknown) {
  if (!patient || typeof patient !== 'object') return 'N/A';
  return (patient as Partial<IPatient>).mrn || 'N/A';
}

function getDispensePatientName(patient: unknown) {
  if (!patient) return 'Unknown patient';

  if (typeof patient === 'string') return patient;

  if (typeof patient === 'object') {
    const value = patient as Partial<IPatient>;
    return `${value.firstName || ''} ${value.lastName || ''}`.trim() || 'Unknown patient';
  }

  return 'Unknown patient';
}

function getPrescriberName(
  prescriber:
    | {
        firstName?: string;
        lastName?: string;
        email?: string;
      }
    | string
    | undefined,
  prescriberName?: string,
) {
  if (!prescriber && prescriberName) return prescriberName;
  if (!prescriber) return 'Unknown prescriber';

  if (typeof prescriber === 'string') return prescriber;

  const name = `${prescriber.firstName || ''} ${prescriber.lastName || ''}`.trim();

  return name || prescriber.email || 'Unknown prescriber';
}

function getStatusClasses(status?: string) {
  switch (status) {
    case PrescriptionStatus.APPROVED:
    case DispenseStatus.DISPENSED:
    case 'APPROVED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';

    case ScreeningStatus.BLOCKED:
    case PrescriptionStatus.REJECTED:
      return 'bg-rose-50 text-rose-700 border-rose-100';

    case ScreeningStatus.WARNING:
    case PrescriptionStatus.UNDER_REVIEW:
    case PrescriptionStatus.RECEIVED:
    case PrescriptionStatus.PARTIALLY_DISPENSED:
      return 'bg-amber-50 text-amber-700 border-amber-100';

    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

function StatusBadge({ status }: { status?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getStatusClasses(
        status,
      )}`}
    >
      {status?.replaceAll('_', ' ') || 'UNKNOWN'}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = 'teal',
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone?: 'teal' | 'amber' | 'rose' | 'blue';
}) {
  const tones = {
    teal: 'bg-[#e8f5f3] text-[#1b7b68]',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    blue: 'bg-blue-50 text-blue-600',
  };

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {label}
          </p>

          <p className="mt-1 text-2xl font-black tracking-tight text-slate-800">
            {value}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tones[tone]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        {icon}
      </div>

      <h3 className="text-sm font-black text-slate-700">{title}</h3>

      <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
        {description}
      </p>
    </div>
  );
}

function LoadingRows({ columns }: { columns: number }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, row) => (
        <tr key={row} className="border-b border-slate-100">
          {Array.from({ length: columns }).map((__, column) => (
            <td key={column} className="px-5 py-5">
              <div className="h-3 animate-pulse rounded-full bg-slate-100" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function Pagination({
  page,
  pages,
  onPrevious,
  onNext,
}: {
  page: number;
  pages: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/40 px-5 py-4">
      <span className="text-[11px] font-medium text-slate-400">
        Page {page} of {pages || 1}
      </span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={onPrevious}
          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          disabled={page >= pages}
          onClick={onNext}
          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function PrescriptionDetails({
  prescription,
  onClose,
  onScreen,
  onApprove,
  onDispense,
  screening,
  approving,
}: {
  prescription: IPrescription;
  onClose: () => void;
  onScreen: () => Promise<void>;
  onApprove: () => Promise<void>;
  onDispense: () => void;
  screening: boolean;
  approving: boolean;
}) {
  const blocked = prescription.screeningStatus === ScreeningStatus.BLOCKED;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-800">
                Prescription review
              </h2>
              <StatusBadge status={prescription.status} />
            </div>

            <p className="mt-1 font-mono text-[10px] text-slate-400">
              {prescription._id}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Patient
              </p>

              <p className="mt-1 text-sm font-black text-slate-800">
                {getPatientName(prescription.patientId)}
              </p>

              {typeof prescription.patientId !== 'string' && (
                <p className="mt-1 text-[11px] text-slate-400">
                  MRN: {getPatientMrn(prescription.patientId)}
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Prescriber
              </p>

              <p className="mt-1 text-sm font-black text-slate-800">
                {getPrescriberName(prescription.prescriberId, prescription.prescriberName)}
              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                {prescription.department || 'Department not specified'}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Screening
              </p>

              <div className="mt-2">
                <StatusBadge status={prescription.screeningStatus} />
              </div>
            </div>
          </div>

          {prescription.screeningSummary && (
            <div
              className={`mt-5 rounded-2xl border p-4 ${
                blocked
                  ? 'border-rose-200 bg-rose-50'
                  : prescription.screeningStatus === ScreeningStatus.WARNING
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-emerald-200 bg-emerald-50'
              }`}
            >
              <div className="flex gap-3">
                {blocked ? (
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                ) : prescription.screeningStatus === ScreeningStatus.WARNING ? (
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                )}

                <div>
                  <p className="text-xs font-black text-slate-800">
                    Pharmacy screening result
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {prescription.screeningSummary}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100">
            <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Prescribed medications
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {prescription.medications.map((medication, index) => (
                <div
                  key={`${prescription._id}-${index}`}
                  className="grid gap-4 p-4 md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black text-slate-800">
                        {medication.medicationName}
                      </p>

                      {medication.genericName && (
                        <span className="text-[11px] italic text-slate-400">
                          {medication.genericName}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-500">
                      {medication.dosage && (
                        <span className="rounded-lg bg-slate-100 px-2 py-1">
                          Dose: {medication.dosage}
                        </span>
                      )}

                      {medication.route && (
                        <span className="rounded-lg bg-slate-100 px-2 py-1">
                          Route: {medication.route}
                        </span>
                      )}

                      {medication.frequency && (
                        <span className="rounded-lg bg-slate-100 px-2 py-1">
                          {medication.frequency}
                        </span>
                      )}

                      {medication.duration && (
                        <span className="rounded-lg bg-slate-100 px-2 py-1">
                          {medication.duration}
                        </span>
                      )}
                    </div>

                    {medication.instructions && (
                      <p className="mt-2 text-[11px] text-slate-400">
                        {medication.instructions}
                      </p>
                    )}
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Quantity
                    </p>

                    <p className="mt-1 text-sm font-black text-slate-800">
                      {medication.quantity || '—'}{' '}
                      {medication.unitOfMeasure || ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {prescription.notes && (
            <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Prescription notes
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-600">
                {prescription.notes}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/40 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>

          <button
            type="button"
            disabled={screening}
            onClick={onScreen}
            className="inline-flex items-center gap-2 rounded-xl border border-[#1b7b68]/20 bg-[#e8f5f3] px-4 py-2.5 text-xs font-bold text-[#1b7b68] disabled:opacity-50"
          >
            {screening ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldAlert className="h-4 w-4" />
            )}
            Run screening
          </button>

          {!blocked &&
            prescription.status !== PrescriptionStatus.APPROVED &&
            prescription.status !== PrescriptionStatus.DISPENSED && (
              <button
                type="button"
                disabled={approving}
                onClick={onApprove}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
              >
                {approving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileCheck2 className="h-4 w-4" />
                )}
                Approve prescription
              </button>
            )}

          {!blocked &&
            (prescription.status === PrescriptionStatus.APPROVED ||
              prescription.status === PrescriptionStatus.PARTIALLY_DISPENSED) && (
              <button
                type="button"
                onClick={onDispense}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1b7b68] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#145f50]"
              >
                <PackageCheck className="h-4 w-4" />
                Dispense
              </button>
            )}
        </div>
      </div>
    </div>
  );
}

function DispenseModal({
  prescription,
  inventory,
  isOpen,
  onClose,
  onSubmit,
}: DispenseModalProps) {
  const [items, setItems] = useState<DispenseItemDraft[]>([]);
  const [secondVerifierId, setSecondVerifierId] = useState('');
  const [emarReferenceId, setEmarReferenceId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !prescription) return;

    setItems(
      prescription.medications.map((medication, index) => ({
        prescriptionMedicationIndex: index,
        inventoryItemId: medication.inventoryItemId || '',
        quantity: medication.quantity && medication.quantity > 0 ? medication.quantity : 1,
        barcodeScanned: '',
      })),
    );

    setSecondVerifierId('');
    setEmarReferenceId('');
    setNotes('');
    setError(null);
  }, [isOpen, prescription]);

  if (!isOpen || !prescription) return null;

  const updateItem = (
    index: number,
    field: keyof DispenseItemDraft,
    value: string | number,
  ) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setError(null);

    const validItems = items.filter(
      (item) =>
        item.inventoryItemId &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0 &&
        item.barcodeScanned.trim(),
    );

    if (!validItems.length) {
      setError(
        'At least one medication must have an inventory item, positive quantity, and barcode scan.',
      );
      return;
    }

    const selectedInventory = validItems
      .map((item) =>
        inventory.find((inventoryItem) => inventoryItem._id === item.inventoryItemId),
      )
      .filter(Boolean) as PharmacyInventoryItem[];

    const requiresSecondVerifier = selectedInventory.some(
      (item) => item.controlledSubstance,
    );

    if (requiresSecondVerifier && !secondVerifierId.trim()) {
      setError(
        'A second authorized verifier is required when dispensing a controlled substance.',
      );
      return;
    }

    setLoading(true);

    try {
      await onSubmit({
        prescriptionId: prescription._id,
        items: validItems,
        secondVerifierId: secondVerifierId.trim() || undefined,
        emarReferenceId: emarReferenceId.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dispense failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-800">
                Dispense prescription
              </h2>

              <span className="rounded-full bg-[#e8f5f3] px-2.5 py-1 text-[10px] font-bold text-[#1b7b68]">
                BARCODE VERIFIED
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-400">
              {getPatientName(prescription.patientId)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto">
          {error && (
            <div className="mx-6 mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-6">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-3">
                <Barcode className="h-5 w-5 shrink-0 text-amber-600" />

                <div>
                  <p className="text-xs font-black text-amber-800">
                    Barcode verification is required
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-amber-700">
                    Enter or scan the barcode for each medication being
                    dispensed. The backend will verify the prescribed barcode
                    and inventory barcode before stock is decremented.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {prescription.medications.map((medication, index) => {
                const item = items.find(
                  (draft) => draft.prescriptionMedicationIndex === index,
                );

                if (!item) return null;

                const selectedInventory = inventory.find(
                  (inventoryItem) => inventoryItem._id === item.inventoryItemId,
                );

                return (
                  <div
                    key={`${prescription._id}-dispense-${index}`}
                    className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-slate-800">
                          {medication.medicationName}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400">
                          {medication.genericName || 'Generic name not specified'}
                        </p>
                      </div>

                      <div className="w-full lg:w-72">
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Inventory item
                        </label>

                        <select
                          value={item.inventoryItemId}
                          onChange={(event) =>
                            updateItem(
                              index,
                              'inventoryItemId',
                              event.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/10"
                        >
                          <option value="">Select inventory item</option>

                          {inventory.map((inventoryItem) => (
                            <option
                              key={inventoryItem._id}
                              value={inventoryItem._id}
                              disabled={inventoryItem.quantityInStock <= 0}
                            >
                              {inventoryItem.name} — Stock:{' '}
                              {inventoryItem.quantityInStock}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-full lg:w-24">
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Quantity
                        </label>

                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(
                              index,
                              'quantity',
                              Number(event.target.value),
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-xs outline-none focus:border-[#1b7b68]"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Scan barcode *
                      </label>

                      <div className="relative">
                        <Barcode className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

                        <input
                          type="text"
                          required
                          value={item.barcodeScanned}
                          onChange={(event) =>
                            updateItem(
                              index,
                              'barcodeScanned',
                              event.target.value,
                            )
                          }
                          placeholder="Scan or enter barcode"
                          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 font-mono text-xs outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/10"
                        />
                      </div>

                      {selectedInventory?.controlledSubstance && (
                        <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-rose-600">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          Controlled substance — second verifier required.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Second verifier ID
                </label>

                <input
                  type="text"
                  value={secondVerifierId}
                  onChange={(event) => setSecondVerifierId(event.target.value)}
                  placeholder="Required for controlled substances"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono text-xs outline-none focus:border-[#1b7b68]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  eMAR reference
                </label>

                <input
                  type="text"
                  value={emarReferenceId}
                  onChange={(event) => setEmarReferenceId(event.target.value)}
                  placeholder="Optional eMAR reference ID"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono text-xs outline-none focus:border-[#1b7b68]"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Dispense notes
              </label>

              <textarea
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional dispensing notes"
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#1b7b68]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/40 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1b7b68] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#145f50] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PackageCheck className="h-4 w-4" />
              )}
              {loading ? 'Processing...' : 'Confirm dispense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function CreatePrescriptionModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dto: CreatePrescriptionFormDTO) => Promise<void>;
}) {
  const [form, setForm] = useState<CreatePrescriptionFormDTO>({
    patientId: '',
    prescriberId: undefined,
    prescriberName: '',
    source: 'PHARMACY',
    sourceSystem: 'MEDXVERSE',
    department: '',
    medicationName: '',
    genericName: '',
    dosage: '',
    dose: '',
    route: '',
    frequency: '',
    duration: '',
    quantity: undefined,
    unitOfMeasure: 'TABLET',
    barcode: '',
    instructions: '',
    notes: '',
  });
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<IPatient[]>([]);
  const [prescriberSearch, setPrescriberSearch] = useState('');
  const [prescriberResults, setPrescriberResults] = useState<Array<{
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    staffId?: string;
  }>>([]);
  const [selectedPrescriber, setSelectedPrescriber] = useState<{
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    staffId?: string;
  } | null>(null);
  const [prescriberMode, setPrescriberMode] = useState<'registered' | 'external'>('registered');
  const [searchingPrescribers, setSearchingPrescribers] = useState(false);
  const [showPrescriberResults, setShowPrescriberResults] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<IPatient | null>(null);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [showPatientResults, setShowPatientResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || selectedPatient || patientSearch.trim().length < 2) {
      setPatientResults([]);
      setShowPatientResults(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearchingPatients(true);
      try {
        const response = await apiRequest<PatientSearchResult | IPatient[]>(
          `/api/v1/patients?search=${encodeURIComponent(patientSearch.trim())}&page=1&limit=8`,
        );

        const patients = Array.isArray(response)
          ? response
          : response.patients || response.data || [];

        setPatientResults(patients);
        setShowPatientResults(true);
      } catch {
        setPatientResults([]);
        setShowPatientResults(false);
      } finally {
        setSearchingPatients(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [isOpen, patientSearch, selectedPatient]);

  useEffect(() => {
    if (!isOpen || prescriberMode !== 'registered' || selectedPrescriber || prescriberSearch.trim().length < 2) {
      setPrescriberResults([]);
      setShowPrescriberResults(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearchingPrescribers(true);
      try {
        const response = await apiRequest<Array<{
          _id: string;
          firstName?: string;
          lastName?: string;
          email?: string;
          staffId?: string;
        }>>(`/api/v1/pharmacy/prescribers?search=${encodeURIComponent(prescriberSearch.trim())}`);

        setPrescriberResults(Array.isArray(response) ? response : []);
        setShowPrescriberResults(true);
      } catch {
        setPrescriberResults([]);
        setShowPrescriberResults(false);
      } finally {
        setSearchingPrescribers(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [isOpen, prescriberMode, prescriberSearch, selectedPrescriber]);

  if (!isOpen) return null;

  const update = <K extends keyof CreatePrescriptionFormDTO>(
    key: K,
    value: CreatePrescriptionFormDTO[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const selectPatient = (patient: IPatient) => {
    setSelectedPatient(patient);
    setPatientSearch(`${patient.firstName} ${patient.lastName}`.trim());
    update('patientId', patient._id);
    setPatientResults([]);
    setShowPatientResults(false);
    setError(null);
  };

  const clearPatient = () => {
    setSelectedPatient(null);
    setPatientSearch('');
    update('patientId', '');
    setPatientResults([]);
    setShowPatientResults(false);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.patientId.trim() || !selectedPatient) {
      setError('Search for and select a patient before creating the prescription.');
      return;
    }

    if (prescriberMode === 'registered' && (!form.prescriberId || !selectedPrescriber)) {
      setError('Search for and select a registered prescriber, or switch to external prescriber.');
      return;
    }

    if (prescriberMode === 'external' && !form.prescriberName?.trim()) {
      setError('Enter the prescriber name.');
      return;
    }

    if (!form.medicationName.trim()) {
      setError('Medication name is required.');
      return;
    }

    if (
      form.quantity !== undefined &&
      (!Number.isInteger(form.quantity) || form.quantity <= 0)
    ) {
      setError('Quantity must be a positive whole number.');
      return;
    }

    setLoading(true);

    try {
      await onSubmit({
        ...form,
        patientId: form.patientId.trim(),
        prescriberId: prescriberMode === 'registered' ? form.prescriberId?.trim() : undefined,
        prescriberName: prescriberMode === 'external' ? form.prescriberName?.trim() : undefined,
        medicationName: form.medicationName.trim(),
        genericName: form.genericName?.trim() || undefined,
        dosage: form.dosage?.trim() || undefined,
        dose: form.dose?.trim() || undefined,
        route: form.route?.trim() || undefined,
        frequency: form.frequency?.trim() || undefined,
        duration: form.duration?.trim() || undefined,
        source: form.source.trim() || 'PHARMACY',
        sourceSystem: form.sourceSystem?.trim() || 'MEDXVERSE',
        department: form.department?.trim() || undefined,
        barcode: form.barcode?.trim() || undefined,
        instructions: form.instructions?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      });
      onClose();
      setSelectedPatient(null);
      setPatientSearch('');
      setPatientResults([]);
      setShowPatientResults(false);
      setForm((current) => ({
        ...current,
        patientId: '',
        prescriberId: undefined,
        prescriberName: '',
        medicationName: '',
        genericName: '',
        dosage: '',
        dose: '',
        route: '',
        frequency: '',
        duration: '',
        quantity: undefined,
        barcode: '',
        instructions: '',
        notes: '',
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create prescription.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-slate-800">New prescription</h2>
            <p className="mt-1 text-xs text-slate-400">Create a prescription for pharmacy clinical screening.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit}>
          {error && (
            <div className="mx-6 mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 p-6 md:grid-cols-2">
            <div className="relative">
              <label className="field-label">Patient</label>
              <div className="relative">
                <input
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    if (selectedPatient) {
                      setSelectedPatient(null);
                      update('patientId', '');
                    }
                    setShowPatientResults(true);
                  }}
                  onFocus={() => {
                    if (patientResults.length) setShowPatientResults(true);
                  }}
                  className="field-input pr-10"
                  placeholder="Search patient by name or MRN"
                  autoComplete="off"
                />
                {searchingPatients ? (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                ) : patientSearch ? (
                  <button
                    type="button"
                    onClick={clearPatient}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {showPatientResults && patientSearch.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
                  {patientResults.length ? (
                    patientResults.map((patient) => (
                      <button
                        key={patient._id}
                        type="button"
                        onClick={() => selectPatient(patient)}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-slate-50"
                      >
                        <span>
                          <span className="block text-sm font-bold text-slate-800">
                            {patient.firstName} {patient.lastName}
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            {patient.mrn ? `MRN: ${patient.mrn}` : 'MRN unavailable'}
                            {patient.phone ? ` • ${patient.phone}` : ''}
                          </span>
                        </span>
                        <CheckCircle2 className="h-4 w-4 text-slate-300" />
                      </button>
                    ))
                  ) : !searchingPatients ? (
                    <div className="px-3 py-4 text-xs text-slate-400">No matching patients found.</div>
                  ) : null}
                </div>
              )}

              {selectedPatient && (
                <div className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                  <div className="text-xs font-bold text-emerald-800">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </div>
                  <div className="text-[11px] text-emerald-600">
                    {selectedPatient.mrn ? `MRN: ${selectedPatient.mrn}` : 'Patient selected'}
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="field-label mb-0">Prescriber</label>
                <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPrescriberMode('registered');
                      update('prescriberName', '');
                    }}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-bold ${prescriberMode === 'registered' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
                  >
                    Registered staff
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrescriberMode('external');
                      setSelectedPrescriber(null);
                      setPrescriberSearch('');
                      setPrescriberResults([]);
                      update('prescriberId', undefined);
                      setShowPrescriberResults(false);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-bold ${prescriberMode === 'external' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
                  >
                    External / unregistered
                  </button>
                </div>
              </div>

              {prescriberMode === 'registered' ? (
                <div className="relative">
                  <input
                    value={prescriberSearch}
                    onChange={(e) => {
                      setPrescriberSearch(e.target.value);
                      setSelectedPrescriber(null);
                      update('prescriberId', undefined);
                      setShowPrescriberResults(true);
                    }}
                    onFocus={() => {
                      if (prescriberResults.length) setShowPrescriberResults(true);
                    }}
                    className="field-input pr-10"
                    placeholder="Search staff by name, email or staff ID"
                    autoComplete="off"
                  />
                  {searchingPrescribers ? (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                  ) : prescriberSearch ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPrescriberSearch('');
                        setSelectedPrescriber(null);
                        update('prescriberId', undefined);
                        setPrescriberResults([]);
                        setShowPrescriberResults(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}

                  {showPrescriberResults && prescriberSearch.trim().length >= 2 && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
                      {prescriberResults.length ? (
                        prescriberResults.map((staff) => (
                          <button
                            key={staff._id}
                            type="button"
                            onClick={() => {
                              setSelectedPrescriber(staff);
                              setPrescriberSearch(`${staff.firstName || ''} ${staff.lastName || ''}`.trim() || staff.email || '');
                              update('prescriberId', staff._id);
                              update('prescriberName', '');
                              setPrescriberResults([]);
                              setShowPrescriberResults(false);
                              setError(null);
                            }}
                            className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-slate-50"
                          >
                            <span>
                              <span className="block text-sm font-bold text-slate-800">
                                {`${staff.firstName || ''} ${staff.lastName || ''}`.trim() || 'Unnamed staff'}
                              </span>
                              <span className="block text-[11px] text-slate-400">
                                {staff.email || 'Email unavailable'}{staff.staffId ? ` • Staff ID: ${staff.staffId}` : ''}
                              </span>
                            </span>
                            <CheckCircle2 className="h-4 w-4 text-slate-300" />
                          </button>
                        ))
                      ) : !searchingPrescribers ? (
                        <div className="px-3 py-4 text-xs text-slate-400">No registered staff found.</div>
                      ) : null}
                    </div>
                  )}

                  {selectedPrescriber && (
                    <div className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                      <div className="text-xs font-bold text-emerald-800">
                        {`${selectedPrescriber.firstName || ''} ${selectedPrescriber.lastName || ''}`.trim() || selectedPrescriber.email}
                      </div>
                      <div className="text-[11px] text-emerald-600">
                        {selectedPrescriber.email || 'Registered staff'}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <input
                    value={form.prescriberName || ''}
                    onChange={(e) => update('prescriberName', e.target.value)}
                    className="field-input"
                    placeholder="Enter prescriber full name"
                  />
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Use this when the prescriber is not registered in MedXVerse.
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className="field-label">Medication name</label>
              <input value={form.medicationName} onChange={(e) => update('medicationName', e.target.value)} className="field-input" placeholder="Medication" />
            </div>
            <div>
              <label className="field-label">Generic name</label>
              <input value={form.genericName || ''} onChange={(e) => update('genericName', e.target.value)} className="field-input" placeholder="Generic name" />
            </div>
            <div>
              <label className="field-label">Dosage</label>
              <input value={form.dosage || ''} onChange={(e) => update('dosage', e.target.value)} className="field-input" placeholder="e.g. 500 mg" />
            </div>
            <div>
              <label className="field-label">Dose</label>
              <input value={form.dose || ''} onChange={(e) => update('dose', e.target.value)} className="field-input" placeholder="Dose" />
            </div>
            <div>
              <label className="field-label">Route</label>
              <input value={form.route || ''} onChange={(e) => update('route', e.target.value)} className="field-input" placeholder="e.g. ORAL" />
            </div>
            <div>
              <label className="field-label">Frequency</label>
              <input value={form.frequency || ''} onChange={(e) => update('frequency', e.target.value)} className="field-input" placeholder="e.g. Once daily" />
            </div>
            <div>
              <label className="field-label">Duration</label>
              <input value={form.duration || ''} onChange={(e) => update('duration', e.target.value)} className="field-input" placeholder="e.g. 7 days" />
            </div>
            <div>
              <label className="field-label">Quantity</label>
              <input type="number" min="1" step="1" value={form.quantity ?? ''} onChange={(e) => update('quantity', e.target.value === '' ? undefined : Number(e.target.value))} className="field-input" placeholder="Quantity" />
            </div>
            <div>
              <label className="field-label">Unit of measure</label>
              <select value={form.unitOfMeasure || 'TABLET'} onChange={(e) => update('unitOfMeasure', e.target.value)} className="field-input">
                {UNIT_OF_MEASURE_VALUES.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Barcode</label>
              <input value={form.barcode || ''} onChange={(e) => update('barcode', e.target.value)} className="field-input" placeholder="Optional barcode" />
            </div>
            <div>
              <label className="field-label">Department</label>
              <input value={form.department || ''} onChange={(e) => update('department', e.target.value)} className="field-input" placeholder="Department" />
            </div>
            <div>
              <label className="field-label">Source</label>
              <input value={form.source} onChange={(e) => update('source', e.target.value)} className="field-input" />
            </div>
            <div>
              <label className="field-label">Source system</label>
              <input value={form.sourceSystem || ''} onChange={(e) => update('sourceSystem', e.target.value)} className="field-input" />
            </div>
            <div className="md:col-span-2">
              <label className="field-label">Instructions</label>
              <textarea rows={2} value={form.instructions || ''} onChange={(e) => update('instructions', e.target.value)} className="field-input resize-none" placeholder="Administration instructions" />
            </div>
            <div className="md:col-span-2">
              <label className="field-label">Notes</label>
              <textarea rows={2} value={form.notes || ''} onChange={(e) => update('notes', e.target.value)} className="field-input resize-none" placeholder="Clinical or pharmacy notes" />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/40 px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600">Cancel</button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create prescription
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateFormularyModal({
  isOpen,
  inventory,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  inventory: PharmacyInventoryItem[];
  onClose: () => void;
  onSubmit: (dto: CreateFormularyFormDTO) => Promise<void>;
}) {
  const [form, setForm] = useState<CreateFormularyFormDTO>({
    medicationName: '',
    genericName: '',
    department: '',
    status: FormularyStatus.APPROVED,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: '',
    inventoryItemId: '',
    substituteInventoryItemIds: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.medicationName.trim()) {
      setError('Medication name is required.');
      return;
    }

    setLoading(true);

    try {
      await onSubmit({
        ...form,
        medicationName: form.medicationName.trim(),
        genericName: form.genericName?.trim() || undefined,
        department: form.department?.trim() || undefined,
        effectiveFrom: form.effectiveFrom || undefined,
        effectiveTo: form.effectiveTo || undefined,
        inventoryItemId: form.inventoryItemId || undefined,
        substituteInventoryItemIds: form.substituteInventoryItemIds?.filter(Boolean),
      });
      onClose();
      setForm({
        medicationName: '',
        genericName: '',
        department: '',
        status: FormularyStatus.APPROVED,
        effectiveFrom: new Date().toISOString().slice(0, 10),
        effectiveTo: '',
        inventoryItemId: '',
        substituteInventoryItemIds: [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create formulary entry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-slate-800">New formulary entry</h2>
            <p className="mt-1 text-xs text-slate-400">Define medication eligibility for the pharmacy screening workflow.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit}>
          {error && (
            <div className="mx-6 mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 p-6 md:grid-cols-2">
            <div>
              <label className="field-label">Medication name</label>
              <input value={form.medicationName} onChange={(e) => setForm((v) => ({ ...v, medicationName: e.target.value }))} className="field-input" />
            </div>
            <div>
              <label className="field-label">Generic name</label>
              <input value={form.genericName || ''} onChange={(e) => setForm((v) => ({ ...v, genericName: e.target.value }))} className="field-input" />
            </div>
            <div>
              <label className="field-label">Department</label>
              <input value={form.department || ''} onChange={(e) => setForm((v) => ({ ...v, department: e.target.value }))} className="field-input" placeholder="Leave blank for all departments" />
            </div>
            <div>
              <label className="field-label">Status</label>
              <select value={form.status} onChange={(e) => setForm((v) => ({ ...v, status: e.target.value as FormularyStatus }))} className="field-input">
                {Object.values(FormularyStatus).map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Effective from</label>
              <input type="date" value={form.effectiveFrom || ''} onChange={(e) => setForm((v) => ({ ...v, effectiveFrom: e.target.value }))} className="field-input" />
            </div>
            <div>
              <label className="field-label">Effective to</label>
              <input type="date" value={form.effectiveTo || ''} onChange={(e) => setForm((v) => ({ ...v, effectiveTo: e.target.value }))} className="field-input" />
            </div>
            <div className="md:col-span-2">
              <label className="field-label">Inventory item</label>
              <select value={form.inventoryItemId || ''} onChange={(e) => setForm((v) => ({ ...v, inventoryItemId: e.target.value }))} className="field-input">
                <option value="">No linked inventory item</option>
                {inventory.map((item) => <option key={item._id} value={item._id}>{item.name}{item.genericName ? ` — ${item.genericName}` : ''}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/40 px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600">Cancel</button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create formulary entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddInventoryModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dto: CreateInventoryItemDTO) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [category, setCategory] = useState('');
  const [unitOfMeasure, setUnitOfMeasure] = useState<UnitOfMeasure | ''>('');
  const [batchNumber, setBatchNumber] = useState('');
  const [barcode, setBarcode] = useState('');
  const [quantityInStock, setQuantityInStock] = useState(0);
  const [unitPrice, setUnitPrice] = useState(0);
  const [expiryDate, setExpiryDate] = useState('');
  const [reorderLevel, setReorderLevel] = useState(10);
  const [controlledSubstance, setControlledSubstance] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setName('');
    setGenericName('');
    setCategory('');
    setUnitOfMeasure('');
    setBatchNumber('');
    setBarcode('');
    setQuantityInStock(0);
    setUnitPrice(0);
    setExpiryDate('');
    setReorderLevel(10);
    setControlledSubstance(false);
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    setError(null);

    if (!name.trim()) {
      setError('Drug name is required.');
      return;
    }

    if (!batchNumber.trim()) {
      setError('Batch number is required.');
      return;
    }

    if (!expiryDate) {
      setError('Expiry date is required.');
      return;
    }

    if (quantityInStock < 0) {
      setError('Stock quantity cannot be negative.');
      return;
    }

    setLoading(true);

    try {
      if (!category) {
        setError('Drug category is required.');
        return;
      }

      if (!unitOfMeasure) {
        setError('Unit of measure is required.');
        return;
      }

      await onSubmit({
        name: name.trim(),
        genericName: genericName.trim() || undefined,
        category: category as DrugCategory,
        unitOfMeasure,
        batchNumber: batchNumber.trim(),
        barcode: barcode.trim() || undefined,
        quantityInStock,
        unitPrice,
        expiryDate,
        reorderLevel,
        controlledSubstance,
      } as CreateInventoryItemDTO);

      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create inventory item.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-slate-800">
              Add inventory item
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Register a medication stock item in the pharmacy inventory.
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit}>
          {error && (
            <div className="mx-6 mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 p-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="field-label">Drug name *</label>
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="field-input"
                placeholder="e.g. Amoxicillin 500mg"
              />
            </div>

            <div>
              <label className="field-label">Generic name</label>
              <input
                value={genericName}
                onChange={(event) => setGenericName(event.target.value)}
                className="field-input"
                placeholder="e.g. Amoxicillin"
              />
            </div>

            <div>
              <label className="field-label">Category *</label>
              <select
                required
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="field-input"
              >
                <option value="">Select category</option>
                {Object.values(DrugCategory).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label">Unit of measure *</label>
              <select
                required
                value={unitOfMeasure}
                onChange={(event) => setUnitOfMeasure(event.target.value as UnitOfMeasure | '')}
                className="field-input"
              >
                <option value="">Select unit</option>
                {UNIT_OF_MEASURE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label">Batch number *</label>
              <input
                required
                value={batchNumber}
                onChange={(event) => setBatchNumber(event.target.value)}
                className="field-input font-mono"
                placeholder="Batch / lot number"
              />
            </div>

            <div>
              <label className="field-label">Barcode</label>
              <input
                value={barcode}
                onChange={(event) => setBarcode(event.target.value)}
                className="field-input font-mono"
                placeholder="Barcode / GTIN"
              />
            </div>

            <div>
              <label className="field-label">Quantity in stock *</label>
              <input
                type="number"
                min={0}
                step={1}
                required
                value={quantityInStock}
                onChange={(event) =>
                  setQuantityInStock(Number(event.target.value))
                }
                className="field-input"
              />
            </div>

            <div>
              <label className="field-label">Unit price *</label>
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={unitPrice}
                onChange={(event) => setUnitPrice(Number(event.target.value))}
                className="field-input"
              />
            </div>

            <div>
              <label className="field-label">Expiry date *</label>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(event) => setExpiryDate(event.target.value)}
                className="field-input"
              />
            </div>

            <div>
              <label className="field-label">Reorder level</label>
              <input
                type="number"
                min={0}
                step={1}
                value={reorderLevel}
                onChange={(event) => setReorderLevel(Number(event.target.value))}
                className="field-input"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 md:col-span-2">
              <input
                type="checkbox"
                checked={controlledSubstance}
                onChange={(event) =>
                  setControlledSubstance(event.target.checked)
                }
                className="h-4 w-4 accent-[#1b7b68]"
              />

              <span>
                <span className="block text-xs font-black text-slate-800">
                  Controlled substance
                </span>

                <span className="mt-0.5 block text-[10px] text-slate-500">
                  Controlled medications will require a second verifier during
                  dispensing.
                </span>
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/40 px-6 py-4">
            <button
              type="button"
              onClick={close}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1b7b68] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Add inventory item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdjustStockModal({
  item,
  isOpen,
  onClose,
  onSubmit,
}: {
  item: IInventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    itemId: string,
    quantityChange: number,
    reason?: string,
  ) => Promise<void>;
}) {
  const [quantityChange, setQuantityChange] = useState(0);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!Number.isInteger(quantityChange) || quantityChange === 0) {
      setError('Enter a non-zero whole-number stock adjustment.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit(item._id, quantityChange, reason.trim() || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stock adjustment failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-slate-800">
              Adjust stock
            </h2>

            <p className="mt-1 text-xs text-slate-400">{item.name}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit}>
          {error && (
            <div className="mx-6 mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="space-y-4 p-6">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Current stock
              </p>

              <p className="mt-1 text-2xl font-black text-slate-800">
                {item.quantityInStock}
              </p>
            </div>

            <div>
              <label className="field-label">
                Quantity change
              </label>

              <input
                type="number"
                step={1}
                value={quantityChange}
                onChange={(event) =>
                  setQuantityChange(Number(event.target.value))
                }
                className="field-input"
                placeholder="e.g. 20 or -5"
              />

              <p className="mt-1 text-[10px] text-slate-400">
                Positive values add stock. Negative values remove stock.
              </p>
            </div>

            <div>
              <label className="field-label">Reason</label>

              <textarea
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="field-input resize-none"
                placeholder="Reason for adjustment"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/40 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Apply adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PharmacyPage() {
  const [activeTab, setActiveTab] = useState<Tab>('prescriptions');

  const [prescriptions, setPrescriptions] = useState<IPrescription[]>([]);
  const [inventory, setInventory] = useState<PharmacyInventoryItem[]>([]);
  const [dispenseRecords, setDispenseRecords] = useState<IDispenseRecord[]>([]);
  const [formulary, setFormulary] = useState<IFormularyEntry[]>([]);

  const [prescriptionPage, setPrescriptionPage] = useState(1);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [dispensePage, setDispensePage] = useState(1);
  const [formularyPage, setFormularyPage] = useState(1);

  const [prescriptionPages, setPrescriptionPages] = useState(1);
  const [inventoryPages, setInventoryPages] = useState(1);
  const [dispensePages, setDispensePages] = useState(1);
  const [formularyPages, setFormularyPages] = useState(1);

  const [prescriptionSearch, setPrescriptionSearch] = useState('');
  const [prescriptionStatus, setPrescriptionStatus] = useState('');
  const [screeningStatus, setScreeningStatus] = useState('');

  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategory, setInventoryCategory] = useState('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [dispenseSearch, setDispenseSearch] = useState('');

  const [formularySearch, setFormularySearch] = useState('');
  const [formularyStatus, setFormularyStatus] = useState('');

  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [selectedPrescription, setSelectedPrescription] =
    useState<IPrescription | null>(null);

  const [selectedInventoryItem, setSelectedInventoryItem] =
    useState<IInventoryItem | null>(null);

  const [isPrescriptionDetailsOpen, setIsPrescriptionDetailsOpen] =
    useState(false);

  const [isDispenseOpen, setIsDispenseOpen] = useState(false);
  const [isAddInventoryOpen, setIsAddInventoryOpen] = useState(false);
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false);
  const [isCreatePrescriptionOpen, setIsCreatePrescriptionOpen] = useState(false);
  const [isCreateFormularyOpen, setIsCreateFormularyOpen] = useState(false);

  const [screeningLoading, setScreeningLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);

  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);
  const [dispenseLoading, setDispenseLoading] = useState(false);
  const [formularyLoading, setFormularyLoading] = useState(false);

  const clearFeedback = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  const fetchPrescriptions = useCallback(async () => {
    setPrescriptionLoading(true);

    try {
      const params = new URLSearchParams();

      params.set('page', String(prescriptionPage));
      params.set('limit', '15');

      if (prescriptionStatus) {
        params.set('status', prescriptionStatus);
      }

      const response = await apiRequest<{
        prescriptions?: IPrescription[];
        pages?: number;
      }>(`/api/v1/pharmacy/prescriptions?${params.toString()}`);

      setPrescriptions(response.prescriptions || []);
      setPrescriptionPages(response.pages || 1);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Failed to load prescriptions.',
      );
      setPrescriptions([]);
    } finally {
      setPrescriptionLoading(false);
    }
  }, [prescriptionPage, prescriptionStatus]);

  const fetchInventory = useCallback(async () => {
    setInventoryLoading(true);

    try {
      const params = new URLSearchParams();

      params.set('page', String(inventoryPage));
      params.set('limit', '15');

      if (inventorySearch.trim()) {
        params.set('search', inventorySearch.trim());
      }

      if (inventoryCategory !== 'ALL') {
        params.set('category', inventoryCategory);
      }

      if (lowStockOnly) {
        params.set('isLowStock', 'true');
      }

      const response = await apiRequest<{
        items?: PharmacyInventoryItem[];
        pages?: number;
      }>(`/api/v1/pharmacy/inventory?${params.toString()}`);

      setInventory(response.items || []);
      setInventoryPages(response.pages || 1);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to load inventory.',
      );
      setInventory([]);
    } finally {
      setInventoryLoading(false);
    }
  }, [inventoryPage, inventorySearch, inventoryCategory, lowStockOnly]);

  const fetchDispenseRecords = useCallback(async () => {
    setDispenseLoading(true);

    try {
      const params = new URLSearchParams();

      params.set('page', String(dispensePage));
      params.set('limit', '15');

      const response = await apiRequest<{
        records?: IDispenseRecord[];
        pages?: number;
      }>(`/api/v1/pharmacy/dispense?${params.toString()}`);

      setDispenseRecords(response.records || []);
      setDispensePages(response.pages || 1);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to load dispense history.',
      );
      setDispenseRecords([]);
    } finally {
      setDispenseLoading(false);
    }
  }, [dispensePage]);

  const fetchFormulary = useCallback(async () => {
    setFormularyLoading(true);

    try {
      const params = new URLSearchParams();

      params.set('page', String(formularyPage));
      params.set('limit', '15');

      if (formularySearch.trim()) {
        params.set('search', formularySearch.trim());
      }

      if (formularyStatus) {
        params.set('status', formularyStatus);
      }

      const response = await apiRequest<{
        entries?: IFormularyEntry[];
        pages?: number;
      }>(`/api/v1/pharmacy/formulary?${params.toString()}`);

      setFormulary(response.entries || []);
      setFormularyPages(response.pages || 1);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to load formulary.',
      );
      setFormulary([]);
    } finally {
      setFormularyLoading(false);
    }
  }, [formularyPage, formularySearch, formularyStatus]);

  useEffect(() => {
    clearFeedback();

    if (activeTab === 'prescriptions') {
      fetchPrescriptions();
    }

    if (activeTab === 'inventory') {
      fetchInventory();
    }

    if (activeTab === 'dispenses') {
      fetchDispenseRecords();
    }

    if (activeTab === 'formulary') {
      fetchFormulary();
    }
  }, [
    activeTab,
    fetchPrescriptions,
    fetchInventory,
    fetchDispenseRecords,
    fetchFormulary,
  ]);

  const refreshCurrentTab = () => {
    clearFeedback();

    if (activeTab === 'prescriptions') {
      fetchPrescriptions();
    } else if (activeTab === 'inventory') {
      fetchInventory();
    } else if (activeTab === 'dispenses') {
      fetchDispenseRecords();
    } else {
      fetchFormulary();
    }
  };

  const handleOpenPrescription = async (prescription: IPrescription) => {
    setSelectedPrescription(prescription);
    setIsPrescriptionDetailsOpen(true);

    try {
      const response = await apiRequest<IPrescription>(
        `/api/v1/pharmacy/prescriptions/${prescription._id}`,
      );

      setSelectedPrescription(response);
    } catch {
      setActionError('Unable to load the prescription details.');
    }
  };

  const handleScreenPrescription = async () => {
    if (!selectedPrescription) return;

    setScreeningLoading(true);
    clearFeedback();

    try {
      const response = await apiRequest<{
        status: ScreeningStatus;
        issues: unknown[];
        checkedAt: string;
      }>(
        `/api/v1/pharmacy/prescriptions/${selectedPrescription._id}/screen`,
        {
          method: 'POST',
        },
      );

      setActionSuccess(
        response.status === ScreeningStatus.BLOCKED
          ? 'Prescription screening completed: prescription is blocked.'
          : response.status === ScreeningStatus.WARNING
            ? 'Prescription screening completed with warnings.'
            : 'Prescription screening passed.',
      );

      await fetchPrescriptions();

      const refreshed = await apiRequest<IPrescription>(
        `/api/v1/pharmacy/prescriptions/${selectedPrescription._id}`,
      );

      setSelectedPrescription(refreshed);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Prescription screening failed.',
      );
    } finally {
      setScreeningLoading(false);
    }
  };

  const handleApprovePrescription = async () => {
    if (!selectedPrescription) return;

    setApproveLoading(true);
    clearFeedback();

    try {
      await apiRequest(
        `/api/v1/pharmacy/prescriptions/${selectedPrescription._id}/approve`,
        {
          method: 'POST',
        },
      );

      setActionSuccess('Prescription approved for dispensing.');

      await fetchPrescriptions();

      const refreshed = await apiRequest<IPrescription>(
        `/api/v1/pharmacy/prescriptions/${selectedPrescription._id}`,
      );

      setSelectedPrescription(refreshed);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Prescription approval failed.',
      );
    } finally {
      setApproveLoading(false);
    }
  };

  const handleCreatePrescription = async (form: CreatePrescriptionFormDTO) => {
    clearFeedback();

    const medication = {
      medicationName: form.medicationName,
      ...(form.genericName ? { genericName: form.genericName } : {}),
      ...(form.dosage ? { dosage: form.dosage } : {}),
      ...(form.dose ? { dose: form.dose } : {}),
      ...(form.route ? { route: form.route } : {}),
      ...(form.frequency ? { frequency: form.frequency } : {}),
      ...(form.duration ? { duration: form.duration } : {}),
      ...(form.quantity !== undefined ? { quantity: form.quantity } : {}),
      ...(form.unitOfMeasure ? { unitOfMeasure: form.unitOfMeasure } : {}),
      ...(form.barcode ? { barcode: form.barcode } : {}),
      ...(form.instructions ? { instructions: form.instructions } : {}),
    };

    await apiRequest('/api/v1/pharmacy/prescriptions', {
      method: 'POST',
      body: JSON.stringify({
        patientId: form.patientId,
        prescriberId: form.prescriberId || undefined,
        prescriberName: form.prescriberName?.trim() || undefined,
        source: form.source,
        sourceRecordId: form.sourceRecordId || undefined,
        sourceSystem: form.sourceSystem || undefined,
        department: form.department || undefined,
        encounterId: form.encounterId || undefined,
        medications: [medication],
        notes: form.notes || undefined,
      }),
    });

    setActionSuccess('Prescription created and queued for pharmacy screening.');
    setPrescriptionPage(1);
    await fetchPrescriptions();
  };

  const handleCreateFormulary = async (form: CreateFormularyFormDTO) => {
    clearFeedback();

    await apiRequest('/api/v1/pharmacy/formulary', {
      method: 'POST',
      body: JSON.stringify(form),
    });

    setActionSuccess('Formulary entry created successfully.');
    setFormularyPage(1);
    await fetchFormulary();
  };

  const handleCreateInventory = async (dto: CreateInventoryItemDTO) => {
    clearFeedback();

    await apiRequest('/api/v1/pharmacy/inventory', {
      method: 'POST',
      body: JSON.stringify(dto),
    });

    setActionSuccess('Inventory item created successfully.');
    await fetchInventory();
  };

  const handleAdjustStock = async (
    itemId: string,
    quantityChange: number,
    reason?: string,
  ) => {
    clearFeedback();

    await apiRequest(`/api/v1/pharmacy/inventory/${itemId}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({
        quantityChange,
        transactionType:
          quantityChange > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
        reason: reason?.trim() || undefined,
      }),
    });

    setActionSuccess('Inventory stock adjusted successfully.');
    setIsAdjustStockOpen(false);
    setSelectedInventoryItem(null);

    await fetchInventory();
  };

  const handleDispense = async (dto: PharmacyCreateDispenseRecordDTO) => {
    clearFeedback();

    await apiRequest('/api/v1/pharmacy/dispense', {
      method: 'POST',
      body: JSON.stringify(dto),
    });

    setActionSuccess(
      'Medication dispensed successfully. Inventory and clinical records were updated.',
    );

    setIsDispenseOpen(false);
    setIsPrescriptionDetailsOpen(false);
    setSelectedPrescription(null);

    await Promise.all([fetchPrescriptions(), fetchInventory(), fetchDispenseRecords()]);
  };

  const lowStockCount = useMemo(
    () => inventory.filter((item) => item.isLowStock).length,
    [inventory],
  );

  const controlledCount = useMemo(
    () => inventory.filter((item) => item.controlledSubstance).length,
    [inventory],
  );

  const blockedCount = useMemo(
    () =>
      prescriptions.filter(
        (prescription) =>
          prescription.screeningStatus === ScreeningStatus.BLOCKED,
      ).length,
    [prescriptions],
  );

  const warningCount = useMemo(
    () =>
      prescriptions.filter(
        (prescription) =>
          prescription.screeningStatus === ScreeningStatus.WARNING,
      ).length,
    [prescriptions],
  );

  const filteredPrescriptions = useMemo(() => {
    const query = prescriptionSearch.trim().toLowerCase();

    if (!query && !screeningStatus) return prescriptions;

    return prescriptions.filter((prescription) => {
      const patientName = getPatientName(prescription.patientId).toLowerCase();

      const matchesSearch =
        !query ||
        patientName.includes(query) ||
        prescription._id.toLowerCase().includes(query) ||
        (prescription.department || '').toLowerCase().includes(query);

      const matchesScreening =
        !screeningStatus ||
        prescription.screeningStatus === screeningStatus;

      return matchesSearch && matchesScreening;
    });
  }, [prescriptions, prescriptionSearch, screeningStatus]);

  const filteredDispenses = useMemo(() => {
    const query = dispenseSearch.trim().toLowerCase();

    if (!query) return dispenseRecords;

    return dispenseRecords.filter((record) => {
      const patientName = getDispensePatientName(record.patientId).toLowerCase();

      return (
        patientName.includes(query) ||
        String(record._id).toLowerCase().includes(query)
      );
    });
  }, [dispenseRecords, dispenseSearch]);

  return (
    <>
      <style jsx global>{`
        .field-label {
          display: block;
          margin-bottom: 0.35rem;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgb(148 163 184);
        }

        .field-input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(226 232 240);
          background: white;
          padding: 0.625rem 0.75rem;
          font-size: 0.75rem;
          outline: none;
        }

        .field-input:focus {
          border-color: #1b7b68;
          box-shadow: 0 0 0 3px rgb(27 123 104 / 0.1);
        }
      `}</style>

      <main className="min-h-screen w-full space-y-6 bg-slate-50/60 p-4 font-sans md:p-6">
        {actionError && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-medium">{actionError}</span>
            </div>

            <button
              type="button"
              onClick={() => setActionError(null)}
              className="rounded-lg p-1 hover:bg-rose-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {actionSuccess && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-700">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="font-medium">{actionSuccess}</span>
            </div>

            <button
              type="button"
              onClick={() => setActionSuccess(null)}
              className="rounded-lg p-1 hover:bg-emerald-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]">
                  <Pill className="h-6 w-6" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tight text-slate-800">
                      Pharmacy
                    </h1>

                    <span className="rounded-full bg-[#e8f5f3] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1b7b68]">
                      Clinical workflow
                    </span>
                  </div>

                  <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
                    Review prescriptions, complete pharmacy screening, approve
                    medication orders, verify dispensing by barcode, and manage
                    the medication inventory ledger.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={refreshCurrentTab}
                className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 hover:bg-slate-50 hover:text-[#1b7b68]"
                title="Refresh"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    loading ||
                    prescriptionLoading ||
                    inventoryLoading ||
                    dispenseLoading ||
                    formularyLoading
                      ? 'animate-spin'
                      : ''
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => setIsCreatePrescriptionOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-700 hover:border-[#1b7b68] hover:text-[#1b7b68]"
              >
                <Plus className="h-4 w-4" />
                New prescription
              </button>

              <button
                type="button"
                onClick={() => setIsCreateFormularyOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-700 hover:border-[#1b7b68] hover:text-[#1b7b68]"
              >
                <Plus className="h-4 w-4" />
                New formulary
              </button>

              <button
                type="button"
                onClick={() => setIsAddInventoryOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-800 px-4 py-3 text-xs font-bold uppercase tracking-wide text-white hover:bg-slate-700"
              >
                <Plus className="h-4 w-4" />
                Add inventory
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Prescriptions in view"
            value={prescriptions.length}
            icon={<FileCheck2 className="h-6 w-6" />}
            tone="teal"
          />

          <StatCard
            label="Screening warnings"
            value={warningCount}
            icon={<AlertTriangle className="h-6 w-6" />}
            tone="amber"
          />

          <StatCard
            label="Blocked prescriptions"
            value={blockedCount}
            icon={<ShieldAlert className="h-6 w-6" />}
            tone="rose"
          />

          <StatCard
            label="Low stock items"
            value={lowStockCount}
            icon={<TrendingDownIcon />}
            tone="blue"
          />
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/30 p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-slate-100 p-1">
              {[
                {
                  id: 'prescriptions' as const,
                  label: 'Prescriptions',
                  icon: <FileCheck2 className="h-3.5 w-3.5" />,
                },
                {
                  id: 'inventory' as const,
                  label: 'Inventory',
                  icon: <Pill className="h-3.5 w-3.5" />,
                },
                {
                  id: 'dispenses' as const,
                  label: 'Dispense history',
                  icon: <History className="h-3.5 w-3.5" />,
                },
                {
                  id: 'formulary' as const,
                  label: 'Formulary',
                  icon: <Stethoscope className="h-3.5 w-3.5" />,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                    activeTab === tab.id
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'prescriptions' && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[230px]">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

                  <input
                    value={prescriptionSearch}
                    onChange={(event) =>
                      setPrescriptionSearch(event.target.value)
                    }
                    placeholder="Search patient, ID, department..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#1b7b68]"
                  />
                </div>

                <select
                  value={prescriptionStatus}
                  onChange={(event) => {
                    setPrescriptionPage(1);
                    setPrescriptionStatus(event.target.value);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 outline-none"
                >
                  <option value="">All prescription statuses</option>
                  {Object.values(PrescriptionStatus).map((status) => (
                    <option key={status} value={status}>
                      {status.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>

                <select
                  value={screeningStatus}
                  onChange={(event) =>
                    setScreeningStatus(event.target.value)
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 outline-none"
                >
                  <option value="">All screening states</option>
                  {Object.values(ScreeningStatus).map((status) => (
                    <option key={status} value={status}>
                      {status.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeTab === 'inventory' && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[220px]">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

                  <input
                    value={inventorySearch}
                    onChange={(event) => {
                      setInventoryPage(1);
                      setInventorySearch(event.target.value);
                    }}
                    placeholder="Search medication, batch, barcode..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#1b7b68]"
                  />
                </div>

                <div className="relative">
                  <Filter className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />

                  <select
                    value={inventoryCategory}
                    onChange={(event) => {
                      setInventoryPage(1);
                      setInventoryCategory(event.target.value);
                    }}
                    className="rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-3 text-xs font-bold text-slate-600 outline-none"
                  >
                    <option value="ALL">All categories</option>
                    {Object.values(DrugCategory).map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setInventoryPage(1);
                    setLowStockOnly((current) => !current);
                  }}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-bold ${
                    lowStockOnly
                      ? 'border-amber-500 bg-amber-500 text-white'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  Low stock only
                </button>
              </div>
            )}

            {activeTab === 'dispenses' && (
              <div className="relative min-w-[250px]">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

                <input
                  value={dispenseSearch}
                  onChange={(event) => setDispenseSearch(event.target.value)}
                  placeholder="Search patient or dispense ID..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#1b7b68]"
                />
              </div>
            )}

            {activeTab === 'formulary' && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[220px]">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

                  <input
                    value={formularySearch}
                    onChange={(event) => {
                      setFormularyPage(1);
                      setFormularySearch(event.target.value);
                    }}
                    placeholder="Search medication or generic..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#1b7b68]"
                  />
                </div>

                <select
                  value={formularyStatus}
                  onChange={(event) => {
                    setFormularyPage(1);
                    setFormularyStatus(event.target.value);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 outline-none"
                >
                  <option value="">All formulary statuses</option>
                  {Object.values(FormularyStatus).map((status) => (
                    <option key={status} value={status}>
                      {status.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {activeTab === 'prescriptions' && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-4">Patient</th>
                      <th className="px-5 py-4">Medications</th>
                      <th className="px-5 py-4">Prescriber</th>
                      <th className="px-5 py-4">Screening</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Requested</th>
                      <th className="px-5 py-4 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {prescriptionLoading ? (
                      <LoadingRows columns={7} />
                    ) : filteredPrescriptions.length === 0 ? (
                      <tr>
                        <td colSpan={7}>
                          <EmptyState
                            icon={<FileCheck2 className="h-6 w-6" />}
                            title="No prescriptions found"
                            description="There are no prescriptions matching the current workflow filters."
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredPrescriptions.map((prescription) => (
                        <tr
                          key={prescription._id}
                          className="transition hover:bg-[#e8f5f3]/20"
                        >
                          <td className="px-5 py-4">
                            <p className="text-xs font-black text-slate-800">
                              {getPatientName(prescription.patientId)}
                            </p>

                            {typeof prescription.patientId !== 'string' && (
                              <p className="mt-1 font-mono text-[10px] text-slate-400">
                                MRN: {getPatientMrn(prescription.patientId)}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="max-w-[250px] space-y-1">
                              {prescription.medications.slice(0, 2).map(
                                (medication, index) => (
                                  <p
                                    key={index}
                                    className="truncate text-[11px] text-slate-600"
                                  >
                                    <span className="font-bold">
                                      {medication.medicationName}
                                    </span>{' '}
                                    {medication.dosage || ''}
                                  </p>
                                ),
                              )}

                              {prescription.medications.length > 2 && (
                                <p className="text-[10px] font-bold text-[#1b7b68]">
                                  +{prescription.medications.length - 2} more
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-[11px] font-bold text-slate-700">
                              {getPrescriberName(prescription.prescriberId, prescription.prescriberName)}
                            </p>

                            <p className="mt-1 text-[10px] text-slate-400">
                              {prescription.department || '—'}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge status={prescription.screeningStatus} />
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge status={prescription.status} />
                          </td>

                          <td className="px-5 py-4 text-[10px] text-slate-400">
                            {formatDateTime(
                              prescription.requestedAt || prescription.createdAt,
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenPrescription(prescription)}
                                className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-700 hover:bg-[#1b7b68] hover:text-white"
                              >
                                Review
                              </button>

                              {prescription.screeningStatus !== ScreeningStatus.BLOCKED &&
                                (prescription.status === PrescriptionStatus.APPROVED ||
                                  prescription.status === PrescriptionStatus.PARTIALLY_DISPENSED) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPrescription(prescription);
                                      setIsDispenseOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#1b7b68] px-3 py-2 text-[10px] font-bold text-white hover:bg-[#145f50]"
                                  >
                                    <PackageCheck className="h-3.5 w-3.5" />
                                    Dispense
                                  </button>
                                )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={prescriptionPage}
                pages={prescriptionPages}
                onPrevious={() =>
                  setPrescriptionPage((page) => Math.max(1, page - 1))
                }
                onNext={() =>
                  setPrescriptionPage((page) =>
                    Math.min(prescriptionPages, page + 1),
                  )
                }
              />
            </>
          )}

          {activeTab === 'inventory' && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-4">Medication</th>
                      <th className="px-5 py-4">Category</th>
                      <th className="px-5 py-4">Batch</th>
                      <th className="px-5 py-4">Stock</th>
                      <th className="px-5 py-4">Price</th>
                      <th className="px-5 py-4">Expiry</th>
                      <th className="px-5 py-4">Control</th>
                      <th className="px-5 py-4 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {inventoryLoading ? (
                      <LoadingRows columns={8} />
                    ) : inventory.length === 0 ? (
                      <tr>
                        <td colSpan={8}>
                          <EmptyState
                            icon={<Pill className="h-6 w-6" />}
                            title="No inventory items found"
                            description="Adjust the search or filters, or add a new medication to inventory."
                          />
                        </td>
                      </tr>
                    ) : (
                      inventory.map((item) => (
                        <tr
                          key={item._id}
                          className="transition hover:bg-[#e8f5f3]/20"
                        >
                          <td className="px-5 py-4">
                            <p className="text-xs font-black text-slate-800">
                              {item.name}
                            </p>

                            {item.genericName && (
                              <p className="mt-1 text-[10px] italic text-slate-400">
                                {item.genericName}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold text-slate-600">
                              {item.category}
                            </span>
                          </td>

                          <td className="px-5 py-4 font-mono text-[10px] text-slate-500">
                            {item.batchNumber}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-black ${
                                  item.isLowStock
                                    ? 'text-amber-600'
                                    : 'text-slate-800'
                                }`}
                              >
                                {item.quantityInStock}
                              </span>

                              {item.isLowStock && (
                                <span className="rounded bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-700">
                                  Low
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-xs font-black text-slate-800">
                            {formatMoney(item.unitPrice)}
                          </td>

                          <td className="px-5 py-4 text-[10px] text-slate-500">
                            {formatDate(item.expiryDate)}
                          </td>

                          <td className="px-5 py-4">
                            {item.controlledSubstance ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-[9px] font-bold text-rose-700">
                                <ShieldAlert className="h-3 w-3" />
                                Controlled
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">
                                Standard
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInventoryItem(item);
                                setIsAdjustStockOpen(true);
                              }}
                              className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-700 hover:bg-[#1b7b68] hover:text-white"
                            >
                              Adjust stock
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={inventoryPage}
                pages={inventoryPages}
                onPrevious={() =>
                  setInventoryPage((page) => Math.max(1, page - 1))
                }
                onNext={() =>
                  setInventoryPage((page) =>
                    Math.min(inventoryPages, page + 1),
                  )
                }
              />
            </>
          )}

          {activeTab === 'dispenses' && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-4">Patient</th>
                      <th className="px-5 py-4">Prescription</th>
                      <th className="px-5 py-4">Items</th>
                      <th className="px-5 py-4">Amount</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Date</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {dispenseLoading ? (
                      <LoadingRows columns={6} />
                    ) : filteredDispenses.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          <EmptyState
                            icon={<History className="h-6 w-6" />}
                            title="No dispense records"
                            description="Completed medication dispensing transactions will appear here."
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredDispenses.map((record) => (
                        <tr
                          key={record._id}
                          className="transition hover:bg-[#e8f5f3]/20"
                        >
                          <td className="px-5 py-4">
                            <p className="text-xs font-black text-slate-800">
                              {getDispensePatientName(record.patientId)}
                            </p>

                            <p className="mt-1 text-[10px] text-slate-400">
                              MRN: {getPatientMrn(record.patientId)}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-mono text-[10px] text-slate-500">
                              {String(record.prescriptionId)}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <div className="space-y-1">
                              {record.items.map((item, index) => (
                                <p key={index} className="text-[10px] text-slate-600">
                                  {typeof item.inventoryItemId === 'object'
                                    ? item.inventoryItemId.name
                                    : 'Medication'}{' '}
                                  <span className="font-bold">
                                    × {item.quantity}
                                  </span>
                                </p>
                              ))}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-xs font-black text-slate-800">
                            {formatMoney(record.totalAmount)}
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge status={record.status} />
                          </td>

                          <td className="px-5 py-4 text-[10px] text-slate-400">
                            {formatDateTime(record.createdAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={dispensePage}
                pages={dispensePages}
                onPrevious={() =>
                  setDispensePage((page) => Math.max(1, page - 1))
                }
                onNext={() =>
                  setDispensePage((page) =>
                    Math.min(dispensePages, page + 1),
                  )
                }
              />
            </>
          )}

          {activeTab === 'formulary' && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-4">Medication</th>
                      <th className="px-5 py-4">Generic</th>
                      <th className="px-5 py-4">Department</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Effective from</th>
                      <th className="px-5 py-4">Effective to</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {formularyLoading ? (
                      <LoadingRows columns={6} />
                    ) : formulary.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          <EmptyState
                            icon={<Stethoscope className="h-6 w-6" />}
                            title="No formulary entries"
                            description="Active and historical medication formulary policies will appear here."
                          />
                        </td>
                      </tr>
                    ) : (
                      formulary.map((entry) => (
                        <tr
                          key={entry._id}
                          className="transition hover:bg-[#e8f5f3]/20"
                        >
                          <td className="px-5 py-4 text-xs font-black text-slate-800">
                            {entry.medicationName}
                          </td>

                          <td className="px-5 py-4 text-[11px] italic text-slate-400">
                            {entry.genericName || '—'}
                          </td>

                          <td className="px-5 py-4 text-[11px] text-slate-600">
                            {entry.department || 'All departments'}
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge status={entry.status} />
                          </td>

                          <td className="px-5 py-4 text-[10px] text-slate-500">
                            {formatDate(entry.effectiveFrom)}
                          </td>

                          <td className="px-5 py-4 text-[10px] text-slate-500">
                            {formatDate(entry.effectiveTo)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={formularyPage}
                pages={formularyPages}
                onPrevious={() =>
                  setFormularyPage((page) => Math.max(1, page - 1))
                }
                onNext={() =>
                  setFormularyPage((page) =>
                    Math.min(formularyPages, page + 1),
                  )
                }
              />
            </>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-[#e8f5f3] p-3 text-[#1b7b68]">
                <ShieldAlert className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-black text-slate-800">
                  Clinical screening
                </p>

                <p className="mt-1 text-[10px] leading-5 text-slate-400">
                  Allergy matching, formulary review and duplicate-therapy
                  checks are completed before approval.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                <Barcode className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-black text-slate-800">
                  Verified dispensing
                </p>

                <p className="mt-1 text-[10px] leading-5 text-slate-400">
                  Dispensing is tied to the prescription medication index and
                  requires barcode verification.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                <Clock3 className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-black text-slate-800">
                  Transactional integrity
                </p>

                <p className="mt-1 text-[10px] leading-5 text-slate-400">
                  Inventory decrement, controlled-substance logging and
                  prescription status updates are handled by the backend
                  transaction.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MiniMetric
            label="Inventory loaded"
            value={inventory.length}
            icon={<Pill className="h-4 w-4" />}
          />

          <MiniMetric
            label="Controlled items"
            value={controlledCount}
            icon={<ShieldAlert className="h-4 w-4" />}
          />

          <MiniMetric
            label="Dispenses loaded"
            value={dispenseRecords.length}
            icon={<PackageCheck className="h-4 w-4" />}
          />

          <MiniMetric
            label="Formulary entries"
            value={formulary.length}
            icon={<Stethoscope className="h-4 w-4" />}
          />
        </section>
      </main>

      {isPrescriptionDetailsOpen && selectedPrescription && (
        <PrescriptionDetails
          prescription={selectedPrescription}
          onClose={() => {
            setIsPrescriptionDetailsOpen(false);
            setSelectedPrescription(null);
          }}
          onScreen={handleScreenPrescription}
          onApprove={handleApprovePrescription}
          onDispense={() => {
            setIsPrescriptionDetailsOpen(false);
            setIsDispenseOpen(true);
          }}
          screening={screeningLoading}
          approving={approveLoading}
        />
      )}

      <DispenseModal
        prescription={selectedPrescription}
        inventory={inventory}
        isOpen={isDispenseOpen}
        onClose={() => {
          setIsDispenseOpen(false);
        }}
        onSubmit={handleDispense}
      />

      <CreatePrescriptionModal
        isOpen={isCreatePrescriptionOpen}
        onClose={() => setIsCreatePrescriptionOpen(false)}
        onSubmit={handleCreatePrescription}
      />

      <CreateFormularyModal
        isOpen={isCreateFormularyOpen}
        inventory={inventory}
        onClose={() => setIsCreateFormularyOpen(false)}
        onSubmit={handleCreateFormulary}
      />

      <AddInventoryModal
        isOpen={isAddInventoryOpen}
        onClose={() => setIsAddInventoryOpen(false)}
        onSubmit={handleCreateInventory}
      />

      <AdjustStockModal
        item={selectedInventoryItem}
        isOpen={isAdjustStockOpen}
        onClose={() => {
          setIsAdjustStockOpen(false);
          setSelectedInventoryItem(null);
        }}
        onSubmit={handleAdjustStock}
      />
    </>
  );
}

function MiniMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-slate-100 p-2 text-slate-500">
          {icon}
        </div>

        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            {label}
          </p>

          <p className="mt-0.5 text-lg font-black text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

function TrendingDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </svg>
  );
}
