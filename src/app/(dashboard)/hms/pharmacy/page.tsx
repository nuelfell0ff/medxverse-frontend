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

interface Staff {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  department?: string;
  isActive?: boolean;
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
  prescriberId:
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
  inventoryLoading?: boolean;
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
  if (prescriberName?.trim()) return prescriberName.trim();
  if (!prescriber) return 'Unknown prescriber';
  if (typeof prescriber === 'string') return prescriber;
  const name = `${prescriber.firstName || ''} ${prescriber.lastName || ''}`.trim();
  return name || prescriber.email || 'Unknown prescriber';
}

function normalizeStaffRecord(raw: any): Staff | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw.user || raw.account || raw.profile || raw;
  const id = raw._id || raw.id || source._id || source.id;
  if (!id) return null;
  return {
    ...raw,
    _id: typeof id === 'string' ? id : String(id),
    firstName: raw.firstName ?? source.firstName ?? source.givenName ?? '',
    lastName: raw.lastName ?? source.lastName ?? source.familyName ?? '',
    email: raw.email ?? source.email ?? '',
    role: raw.role ?? source.role ?? source.staffRole ?? source.jobRole ?? '',
    department: raw.department ?? source.department ?? '',
    isActive: raw.isActive ?? source.isActive ?? true,
  };
}

function extractStaffRows(json: any): any[] {
  const data = json?.data ?? json;
  const rows = data?.staff ?? data?.users ?? data?.accounts ?? data?.items ?? data?.results ?? data?.records ?? data;
  return Array.isArray(rows) ? rows : [];
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
  const isPostReview =
    prescription.status === PrescriptionStatus.APPROVED ||
    prescription.status === PrescriptionStatus.PARTIALLY_DISPENSED ||
    prescription.status === PrescriptionStatus.DISPENSED ||
    prescription.status === PrescriptionStatus.REJECTED;
  const isScreeningDisabled = screening || approving || isPostReview;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-7">
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
            disabled={isScreeningDisabled}
            onClick={onScreen}
            title={
              isPostReview
                ? 'Screening cannot be re-run after prescription is approved or dispensed'
                : undefined
            }
            className="inline-flex items-center gap-2 rounded-xl border border-[#1b7b68]/20 bg-[#e8f5f3] px-4 py-2.5 text-xs font-bold text-[#1b7b68] disabled:cursor-not-allowed disabled:opacity-50"
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
            prescription.status !== PrescriptionStatus.PARTIALLY_DISPENSED &&
            prescription.status !== PrescriptionStatus.DISPENSED &&
            prescription.status !== PrescriptionStatus.REJECTED && (
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
  inventoryLoading = false,
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
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-7">
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

          <div className="p-6 sm:p-7">
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

                          {inventoryLoading ? (
                            <option value="" disabled>Loading inventory...</option>
                          ) : inventory.length ? (
                            inventory.map((inventoryItem) => (
                              <option
                                key={inventoryItem._id}
                                value={inventoryItem._id}
                                disabled={inventoryItem.quantityInStock <= 0}
                              >
                                {inventoryItem.name} — Stock:{' '}
                                {inventoryItem.quantityInStock}
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>No inventory available</option>
                          )}
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
    prescriberId: '',
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
  const [selectedPatient, setSelectedPatient] = useState<IPatient | null>(null);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [showPatientResults, setShowPatientResults] = useState(false);
  const [prescriberSearch, setPrescriberSearch] = useState('');
  const [prescriberResults, setPrescriberResults] = useState<Staff[]>([]);
  const [selectedPrescriber, setSelectedPrescriber] = useState<Staff | null>(null);
  const [searchingPrescribers, setSearchingPrescribers] = useState(false);
  const [showPrescriberResults, setShowPrescriberResults] = useState(false);
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
    if (!isOpen || prescriberSearch.trim().length < 2 || selectedPrescriber) {
      setPrescriberResults([]);
      setShowPrescriberResults(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearchingPrescribers(true);
      try {
        const response = await apiRequest<any>(
          `/api/v1/staff?isActive=true&search=${encodeURIComponent(prescriberSearch.trim())}`,
        );
        const normalized = extractStaffRows(response)
          .map(normalizeStaffRecord)
          .filter((person): person is Staff => Boolean(person))
          .filter((person) => person.isActive !== false);
        setPrescriberResults(normalized.slice(0, 8));
        setShowPrescriberResults(true);
      } catch {
        setPrescriberResults([]);
        setShowPrescriberResults(false);
      } finally {
        setSearchingPrescribers(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [isOpen, prescriberSearch, selectedPrescriber]);

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

  const selectPrescriber = (person: Staff) => {
    setSelectedPrescriber(person);
    const name = `${person.firstName || ''} ${person.lastName || ''}`.trim();
    setPrescriberSearch(name || person.email || '');
    update('prescriberId', person._id);
    update('prescriberName', name || person.email || undefined);
    setPrescriberResults([]);
    setShowPrescriberResults(false);
    setError(null);
  };

  const clearPrescriber = () => {
    setSelectedPrescriber(null);
    setPrescriberSearch('');
    update('prescriberId', '');
    update('prescriberName', '');
    setPrescriberResults([]);
    setShowPrescriberResults(false);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.patientId.trim() || !selectedPatient) {
      setError('Search for and select a patient before creating the prescription.');
      return;
    }

    if (!form.prescriberId?.trim() && !form.prescriberName?.trim()) {
      setError('Search for a registered prescriber or enter the prescriber name.');
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
        prescriberId: form.prescriberId?.trim() || undefined,
        prescriberName: form.prescriberName?.trim() || prescriberSearch.trim() || undefined,
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
      setSelectedPrescriber(null);
      setPrescriberSearch('');
      setPrescriberResults([]);
      setShowPrescriberResults(false);
      setPatientResults([]);
      setShowPatientResults(false);
      setForm((current) => ({
        ...current,
        patientId: '',
        prescriberId: '',
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
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[1.75rem] border border-slate-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-7">
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

          <div className="grid gap-5 p-6 sm:p-7 md:grid-cols-2">
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

            <div className="relative">
              <label className="field-label">Prescriber</label>
              <div className="relative">
                <input
                  value={prescriberSearch}
                  onChange={(e) => {
                    setPrescriberSearch(e.target.value);
                    if (selectedPrescriber) {
                      setSelectedPrescriber(null);
                      update('prescriberId', '');
                    }
                    update('prescriberName', e.target.value);
                    setShowPrescriberResults(true);
                  }}
                  onFocus={() => {
                    if (prescriberResults.length) setShowPrescriberResults(true);
                  }}
                  className="field-input pr-10"
                  placeholder="Search staff by name or enter a name"
                  autoComplete="off"
                />
                {searchingPrescribers ? (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                ) : prescriberSearch ? (
                  <button
                    type="button"
                    onClick={clearPrescriber}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {showPrescriberResults && prescriberSearch.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
                  {prescriberResults.length ? (
                    prescriberResults.map((person) => (
                      <button
                        key={person._id}
                        type="button"
                        onClick={() => selectPrescriber(person)}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-slate-50"
                      >
                        <span>
                          <span className="block text-sm font-bold text-slate-800">
                            {`${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Unnamed Staff'}
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            {person.role || 'Staff'}{person.department ? ` • ${person.department}` : ''}{person.email ? ` • ${person.email}` : ''}
                          </span>
                        </span>
                        <CheckCircle2 className="h-4 w-4 text-slate-300" />
                      </button>
                    ))
                  ) : !searchingPrescribers ? (
                    <div className="px-3 py-4 text-xs text-slate-400">No registered staff found. You can continue with the entered name.</div>
                  ) : null}
                </div>
              )}

              {selectedPrescriber ? (
                <div className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                  <div className="text-xs font-bold text-emerald-800">
                    {`${selectedPrescriber.firstName || ''} ${selectedPrescriber.lastName || ''}`.trim() || selectedPrescriber.email || 'Selected staff'}
                  </div>
                  <div className="text-[11px] text-emerald-600">Registered staff prescriber</div>
                </div>
              ) : prescriberSearch.trim() ? (
                <div className="mt-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                  Entered as an unregistered prescriber name unless you select a matching staff member above.
                </div>
              ) : null}
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
      <div className="w-full max-w-3xl overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-2xl">
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

          <div className="grid gap-5 p-6 sm:p-7 md:grid-cols-2">
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
      <div className="w-full max-w-3xl overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-2xl">
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

          <div className="grid gap-5 p-6 sm:p-7 md:grid-cols-2">
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
      <div className="w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-2xl">
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

          <div className="space-y-5 p-6 sm:p-7">
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
  const [dispenseInventory, setDispenseInventory] = useState<PharmacyInventoryItem[]>([]);
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

  const [prescriptionTotal, setPrescriptionTotal] = useState(0);
  const [inventoryTotal, setInventoryTotal] = useState(0);
  const [dispenseTotal, setDispenseTotal] = useState(0);
  const [formularyTotal, setFormularyTotal] = useState(0);

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
  const [dispenseInventoryLoading, setDispenseInventoryLoading] = useState(false);
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
        total?: number;
        pages?: number;
      }>(`/api/v1/pharmacy/prescriptions?${params.toString()}`);

      setPrescriptions(response.prescriptions || []);
      setPrescriptionTotal(response.total || 0);
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
        total?: number;
        pages?: number;
      }>(`/api/v1/pharmacy/inventory?${params.toString()}`);

      setInventory(response.items || []);
      setInventoryTotal(response.total || 0);
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

  const fetchDispenseInventory = useCallback(async () => {
    setDispenseInventoryLoading(true);
    try {
      const firstPage = await apiRequest<{ items?: PharmacyInventoryItem[]; total?: number; pages?: number }>(
        '/api/v1/pharmacy/inventory?page=1&limit=100',
      );
      const firstItems = firstPage.items || [];
      const totalPages = Math.max(1, Number(firstPage.pages) || 1);

      if (totalPages === 1) {
        setDispenseInventory(firstItems);
        return;
      }

      const remainingPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
          apiRequest<{ items?: PharmacyInventoryItem[] }>(
            `/api/v1/pharmacy/inventory?page=${index + 2}&limit=100`,
          ),
        ),
      );

      setDispenseInventory([
        ...firstItems,
        ...remainingPages.flatMap((page) => page.items || []),
      ]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to load inventory for dispensing.');
      setDispenseInventory([]);
    } finally {
      setDispenseInventoryLoading(false);
    }
  }, []);

  const fetchDispenseRecords = useCallback(async () => {
    setDispenseLoading(true);

    try {
      const params = new URLSearchParams();

      params.set('page', String(dispensePage));
      params.set('limit', '15');

      const response = await apiRequest<{
        records?: IDispenseRecord[];
        total?: number;
        pages?: number;
      }>(`/api/v1/pharmacy/dispense?${params.toString()}`);

      setDispenseRecords(response.records || []);
      setDispenseTotal(response.total || 0);
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
        total?: number;
        pages?: number;
      }>(`/api/v1/pharmacy/formulary?${params.toString()}`);

      setFormulary(response.entries || []);
      setFormularyTotal(response.total || 0);
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
    let cancelled = false;

    const loadOverviewCounts = async () => {
      try {
        const [prescriptionsResult, inventoryResult, dispenseResult, formularyResult] =
          await Promise.all([
            apiRequest<{ total?: number }>(
              '/api/v1/pharmacy/prescriptions?page=1&limit=1',
            ),
            apiRequest<{ total?: number }>(
              '/api/v1/pharmacy/inventory?page=1&limit=1',
            ),
            apiRequest<{ total?: number }>(
              '/api/v1/pharmacy/dispense?page=1&limit=1',
            ),
            apiRequest<{ total?: number }>(
              '/api/v1/pharmacy/formulary?page=1&limit=1',
            ),
          ]);

        if (cancelled) return;

        setPrescriptionTotal(prescriptionsResult.total || 0);
        setInventoryTotal(inventoryResult.total || 0);
        setDispenseTotal(dispenseResult.total || 0);
        setFormularyTotal(formularyResult.total || 0);
      } catch {
        if (!cancelled) {
          setPrescriptionTotal(0);
          setInventoryTotal(0);
          setDispenseTotal(0);
          setFormularyTotal(0);
        }
      }
    };

    loadOverviewCounts();
    fetchDispenseInventory();

    return () => {
      cancelled = true;
    };
  }, [fetchDispenseInventory]);

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

    if (
      selectedPrescription.status === PrescriptionStatus.APPROVED ||
      selectedPrescription.status === PrescriptionStatus.PARTIALLY_DISPENSED ||
      selectedPrescription.status === PrescriptionStatus.DISPENSED ||
      selectedPrescription.status === PrescriptionStatus.REJECTED
    ) {
      setActionError(
        'Screening cannot be run once a prescription has been approved or dispensed.',
      );
      return;
    }

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
        prescriptionNumber: `RX-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        prescriberId: form.prescriberId || undefined,
        prescriberName: form.prescriberName || undefined,
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
    await Promise.all([fetchInventory(), fetchDispenseInventory()]);
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

    await Promise.all([fetchPrescriptions(), fetchInventory(), fetchDispenseRecords(), fetchDispenseInventory()]);
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
          margin-bottom: 0.5rem;
          color: #334155;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.01em;
        }

        .field-input {
          width: 100%;
          min-height: 2.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.9rem;
          background: #ffffff;
          padding: 0.7rem 0.85rem;
          color: #0f172a;
          font-size: 0.78rem;
          line-height: 1.35;
          outline: none;
          transition: border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease;
        }

        .field-input::placeholder {
          color: #94a3b8;
        }

        .field-input:hover {
          border-color: #cbd5e1;
        }

        .field-input:focus {
          border-color: #1b7b68;
          box-shadow: 0 0 0 3px rgba(27, 123, 104, 0.1);
        }

        textarea.field-input {
          min-height: 6rem;
          line-height: 1.5;
        }

        select.field-input {
          cursor: pointer;
          padding-right: 2.25rem;
        }

        input[type='date'].field-input,
        input[type='number'].field-input {
          font-variant-numeric: tabular-nums;
        }
      `}</style>

      <main className="min-h-full space-y-6 bg-slate-50/60 p-1 font-sans text-slate-800 animate-in fade-in duration-300">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1b7b68] text-white shadow-sm">
                <Pill className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">Pharmacy Command Center</h1>
                  <span className="rounded-full bg-[#e8f5f3] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-[#1b7b68]">
                    Clinical workflow
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  Prescriptions, clinical screening, dispensing, formulary control and medication inventory.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refreshCurrentTab}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-slate-300"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading || prescriptionLoading || inventoryLoading || dispenseLoading || formularyLoading
                    ? 'animate-spin'
                    : ''
                }`}
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setIsCreatePrescriptionOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#1b7b68] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:opacity-95"
            >
              <Plus className="h-4 w-4" />
              New Prescription
            </button>
            <button
              type="button"
              onClick={() => setIsAddInventoryOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-slate-300"
            >
              <Plus className="h-4 w-4" />
              Add Inventory
            </button>
          </div>
        </div>

        {actionError && (
          <div className="flex items-center gap-3 rounded-3xl border border-rose-100 bg-rose-50 p-4 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="ml-auto rounded-xl p-1 hover:bg-rose-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {actionSuccess && (
          <div className="flex items-center gap-3 rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-xs text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{actionSuccess}</span>
            <button
              type="button"
              onClick={() => setActionSuccess(null)}
              className="ml-auto rounded-xl p-1 hover:bg-emerald-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            ['Prescriptions', prescriptions.length, FileCheck2, 'text-[#1b7b68]'],
            ['Screening Warnings', warningCount, AlertTriangle, 'text-amber-600'],
            ['Blocked', blockedCount, ShieldAlert, 'text-rose-600'],
            ['Low Stock', lowStockCount, AlertTriangle, 'text-orange-600'],
            ['Controlled Items', controlledCount, ShieldAlert, 'text-violet-600'],
            ['Dispensed', dispenseRecords.length, PackageCheck, 'text-blue-600'],
          ].map(([label, value, Icon, color]) => {
            const IconComponent = Icon as React.ComponentType<{ className?: string; size?: number }>;
            return (
              <div key={String(label)} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-400">{String(label)}</span>
                  <IconComponent size={17} className={String(color)} />
                </div>
                <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-800">{String(value)}</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-slate-50 p-1">
              {[
                ['prescriptions', 'Prescriptions', FileCheck2],
                ['inventory', 'Inventory', Pill],
                ['dispenses', 'Dispense History', History],
                ['formulary', 'Formulary', Stethoscope],
              ].map(([id, label, Icon]) => {
                const IconComponent = Icon as React.ComponentType<{ className?: string; size?: number }>;
                return (
                  <button
                    key={String(id)}
                    type="button"
                    onClick={() => setActiveTab(id as Tab)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-extrabold transition ${
                      activeTab === id ? 'bg-white text-[#1b7b68] shadow-sm' : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <IconComponent size={14} />
                    {String(label)}
                  </button>
                );
              })}
            </div>

            {activeTab === 'prescriptions' && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[230px]">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    value={prescriptionSearch}
                    onChange={(event) => {
                      setPrescriptionPage(1);
                      setPrescriptionSearch(event.target.value);
                    }}
                    placeholder="Search patient, ID or department..."
                    className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#1b7b68]"
                  />
                </div>
                <select
                  value={prescriptionStatus}
                  onChange={(event) => {
                    setPrescriptionPage(1);
                    setPrescriptionStatus(event.target.value);
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-bold text-slate-600 outline-none"
                >
                  <option value="">All prescription statuses</option>
                  {Object.values(PrescriptionStatus).map((status) => (
                    <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
                  ))}
                </select>
                <select
                  value={screeningStatus}
                  onChange={(event) => {
                    setPrescriptionPage(1);
                    setScreeningStatus(event.target.value);
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-bold text-slate-600 outline-none"
                >
                  <option value="">All screening states</option>
                  {Object.values(ScreeningStatus).map((status) => (
                    <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
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
                    placeholder="Search medication, batch or barcode..."
                    className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#1b7b68]"
                  />
                </div>
                <select
                  value={inventoryCategory}
                  onChange={(event) => {
                    setInventoryPage(1);
                    setInventoryCategory(event.target.value);
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-bold text-slate-600 outline-none"
                >
                  <option value="ALL">All categories</option>
                  {Object.values(DrugCategory).map((category) => (
                    <option key={category} value={category}>{category.replaceAll('_', ' ')}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setInventoryPage(1);
                    setLowStockOnly((value) => !value);
                  }}
                  className={`rounded-2xl px-3 py-2.5 text-[10px] font-extrabold ${
                    lowStockOnly ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500'
                  }`}
                >
                  Low stock only
                </button>
              </div>
            )}

            {activeTab === 'dispenses' && (
              <div className="relative min-w-[230px]">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  value={dispenseSearch}
                  onChange={(event) => {
                    setDispensePage(1);
                    setDispenseSearch(event.target.value);
                  }}
                  placeholder="Search patient or dispense ID..."
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#1b7b68]"
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
                    className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#1b7b68]"
                  />
                </div>
                <select
                  value={formularyStatus}
                  onChange={(event) => {
                    setFormularyPage(1);
                    setFormularyStatus(event.target.value);
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-bold text-slate-600 outline-none"
                >
                  <option value="">All formulary states</option>
                  {Object.values(FormularyStatus).map((status) => (
                    <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {loading && !prescriptions.length && !inventory.length && !dispenseRecords.length && !formulary.length ? (
          <div className="flex min-h-105 items-center justify-center rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="text-center">
              <Loader2 className="mx-auto animate-spin text-[#1b7b68]" size={28} />
              <p className="mt-3 text-xs font-semibold text-slate-400">Loading pharmacy command center...</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-3">
            <section className="min-w-0 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-[12px] font-extrabold text-slate-800">
                    {activeTab === 'prescriptions' ? 'Prescription Board' :
                     activeTab === 'inventory' ? 'Medication Inventory' :
                     activeTab === 'dispenses' ? 'Dispense Activity' : 'Formulary Board'}
                  </h2>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {activeTab === 'prescriptions'
                      ? 'Review, screen, approve and dispense medication orders.'
                      : activeTab === 'inventory'
                        ? 'Live stock, pricing, expiry and controlled-substance visibility.'
                        : activeTab === 'dispenses'
                          ? 'Authoritative dispensing transactions recorded by the pharmacy workflow.'
                          : 'Active medication policy and department coverage.'}
                  </p>
                </div>
                {activeTab === 'formulary' && (
                  <button
                    type="button"
                    onClick={() => setIsCreateFormularyOpen(true)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#1b7b68] px-3 py-2 text-[10px] font-extrabold text-white"
                  >
                    <Plus size={14} />
                    Add Formulary
                  </button>
                )}
                {activeTab === 'dispenses' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('prescriptions')}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#1b7b68]/5 px-3 py-2 text-[10px] font-extrabold text-[#1b7b68]"
                  >
                    <PackageCheck size={14} />
                    Dispense from prescription
                  </button>
                )}
              </div>

              {activeTab === 'prescriptions' && (
                <>
                  <div className="mt-4 space-y-2">
                    {prescriptionLoading ? (
                      <div className="overflow-hidden rounded-2xl border border-slate-100">
                        <table className="w-full text-left">
                          <tbody><LoadingRows columns={6} /></tbody>
                        </table>
                      </div>
                    ) : filteredPrescriptions.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200">
                        <EmptyState icon={<FileCheck2 className="h-6 w-6" />} title="No prescriptions found" description="New medication orders will appear here for screening and pharmacy review." />
                      </div>
                    ) : (
                      filteredPrescriptions.map((prescription) => {
                        const blocked = prescription.screeningStatus === ScreeningStatus.BLOCKED;
                        const canDispense =
                          !blocked &&
                          (prescription.status === PrescriptionStatus.APPROVED ||
                            prescription.status === PrescriptionStatus.PARTIALLY_DISPENSED);
                        return (
                          <div key={prescription._id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition hover:border-slate-200 hover:bg-white hover:shadow-sm">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                              <button
                                type="button"
                                onClick={() => void handleOpenPrescription(prescription)}
                                className="min-w-0 flex-1 text-left"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-black text-slate-800">{getPatientName(prescription.patientId)}</span>
                                  <StatusBadge status={prescription.status} />
                                  <StatusBadge status={prescription.screeningStatus} />
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2 text-[9px] font-semibold text-slate-400">
                                  <span>{getPatientMrn(prescription.patientId) !== 'N/A' ? `MRN ${getPatientMrn(prescription.patientId)}` : 'Patient record'}</span>
                                  <span>•</span>
                                  <span>{getPrescriberName(prescription.prescriberId, prescription.prescriberName)}</span>
                                  <span>•</span>
                                  <span>{prescription.department || 'Department not specified'}</span>
                                  <span>•</span>
                                  <span>{prescription.medications.length} medication{prescription.medications.length === 1 ? '' : 's'}</span>
                                </div>
                                {prescription.screeningSummary && (
                                  <p className={`mt-2 text-[10px] font-semibold ${blocked ? 'text-rose-600' : prescription.screeningStatus === ScreeningStatus.WARNING ? 'text-amber-700' : 'text-slate-400'}`}>
                                    {prescription.screeningSummary}
                                  </p>
                                )}
                              </button>
                              <div className="flex shrink-0 flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => void handleOpenPrescription(prescription)}
                                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-extrabold text-slate-600 hover:bg-slate-50"
                                >
                                  Review
                                </button>
                                {canDispense && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPrescription(prescription);
                                      setIsDispenseOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-2xl bg-[#1b7b68] px-3 py-2 text-[10px] font-extrabold text-white"
                                  >
                                    <PackageCheck size={13} />
                                    Dispense
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
                    <Pagination page={prescriptionPage} pages={prescriptionPages} onPrevious={() => setPrescriptionPage((page) => Math.max(1, page - 1))} onNext={() => setPrescriptionPage((page) => Math.min(prescriptionPages, page + 1))} />
                  </div>
                </>
              )}

              {activeTab === 'inventory' && (
                <>
                  <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="w-full min-w-[950px] text-left">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/60 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                          <th className="px-4 py-3">Medication</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3">Stock</th>
                          <th className="px-4 py-3">Price</th>
                          <th className="px-4 py-3">Expiry</th>
                          <th className="px-4 py-3">Control</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inventoryLoading ? (
                          <LoadingRows columns={7} />
                        ) : inventory.length === 0 ? (
                          <tr><td colSpan={7}><EmptyState icon={<Pill className="h-6 w-6" />} title="No inventory found" description="Add medication stock to begin pharmacy inventory management." /></td></tr>
                        ) : inventory.map((item) => (
                          <tr key={item._id} className="transition hover:bg-[#e8f5f3]/20">
                            <td className="px-4 py-3">
                              <p className="text-xs font-black text-slate-800">{item.name}</p>
                              <p className="mt-0.5 text-[9px] italic text-slate-400">{item.genericName || 'Generic not specified'}</p>
                              {item.barcode && <p className="mt-1 font-mono text-[8px] text-slate-400">{item.barcode}</p>}
                            </td>
                            <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-[8px] font-extrabold text-slate-600">{item.category}</span></td>
                            <td className="px-4 py-3"><div className="flex items-center gap-2"><span className={`text-sm font-black ${item.isLowStock ? 'text-amber-600' : 'text-slate-800'}`}>{item.quantityInStock}</span><span className="text-[9px] font-semibold text-slate-400">{item.unitOfMeasure}</span>{item.isLowStock && <span className="rounded-full bg-amber-50 px-2 py-1 text-[8px] font-extrabold text-amber-700">LOW</span>}</div></td>
                            <td className="px-4 py-3 text-xs font-black text-slate-800">{formatMoney(item.unitPrice)}</td>
                            <td className="px-4 py-3 text-[9px] font-semibold text-slate-500">{formatDate(item.expiryDate)}</td>
                            <td className="px-4 py-3">{item.controlledSubstance ? <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[8px] font-extrabold text-rose-700"><ShieldAlert size={10} /> Controlled</span> : <span className="text-[9px] font-semibold text-slate-400">Standard</span>}</td>
                            <td className="px-4 py-3 text-right"><button type="button" onClick={() => { setSelectedInventoryItem(item); setIsAdjustStockOpen(true); }} className="rounded-2xl bg-slate-100 px-3 py-2 text-[9px] font-extrabold text-slate-700 hover:bg-[#1b7b68] hover:text-white">Adjust Stock</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
                    <Pagination page={inventoryPage} pages={inventoryPages} onPrevious={() => setInventoryPage((page) => Math.max(1, page - 1))} onNext={() => setInventoryPage((page) => Math.min(inventoryPages, page + 1))} />
                  </div>
                </>
              )}

              {activeTab === 'dispenses' && (
                <>
                  <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="w-full min-w-[950px] text-left">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/60 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                          <th className="px-4 py-3">Patient</th>
                          <th className="px-4 py-3">Prescription</th>
                          <th className="px-4 py-3">Items</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dispenseLoading ? (
                          <LoadingRows columns={6} />
                        ) : filteredDispenses.length === 0 ? (
                          <tr><td colSpan={6}><EmptyState icon={<History className="h-6 w-6" />} title="No dispense records" description="Completed medication dispensing transactions will appear here." /></td></tr>
                        ) : filteredDispenses.map((record) => (
                          <tr key={record._id} className="transition hover:bg-[#e8f5f3]/20">
                            <td className="px-4 py-3"><p className="text-xs font-black text-slate-800">{getDispensePatientName(record.patientId)}</p><p className="mt-0.5 text-[9px] text-slate-400">MRN: {getPatientMrn(record.patientId)}</p></td>
                            <td className="px-4 py-3 font-mono text-[9px] text-slate-500">{String(record.prescriptionId)}</td>
                            <td className="px-4 py-3"><div className="space-y-1">{record.items.map((item, index) => <p key={index} className="text-[9px] text-slate-600">{typeof item.inventoryItemId === 'object' ? item.inventoryItemId.name : 'Medication'} <span className="font-bold">× {item.quantity}</span></p>)}</div></td>
                            <td className="px-4 py-3 text-xs font-black text-slate-800">{formatMoney(record.totalAmount)}</td>
                            <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
                            <td className="px-4 py-3 text-[9px] text-slate-400">{formatDateTime(record.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
                    <Pagination page={dispensePage} pages={dispensePages} onPrevious={() => setDispensePage((page) => Math.max(1, page - 1))} onNext={() => setDispensePage((page) => Math.min(dispensePages, page + 1))} />
                  </div>
                </>
              )}

              {activeTab === 'formulary' && (
                <>
                  <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="w-full min-w-[800px] text-left">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/60 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                          <th className="px-4 py-3">Medication</th>
                          <th className="px-4 py-3">Generic</th>
                          <th className="px-4 py-3">Department</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Effective</th>
                          <th className="px-4 py-3">Expiry</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {formularyLoading ? (
                          <LoadingRows columns={6} />
                        ) : formulary.length === 0 ? (
                          <tr><td colSpan={6}><EmptyState icon={<Stethoscope className="h-6 w-6" />} title="No formulary entries" description="Create formulary policies for medication approval and restriction." /></td></tr>
                        ) : formulary.map((entry) => (
                          <tr key={entry._id} className="transition hover:bg-[#e8f5f3]/20">
                            <td className="px-4 py-3 text-xs font-black text-slate-800">{entry.medicationName}</td>
                            <td className="px-4 py-3 text-[9px] italic text-slate-400">{entry.genericName || '—'}</td>
                            <td className="px-4 py-3 text-[9px] font-semibold text-slate-600">{entry.department || 'All departments'}</td>
                            <td className="px-4 py-3"><StatusBadge status={entry.status} /></td>
                            <td className="px-4 py-3 text-[9px] text-slate-500">{formatDate(entry.effectiveFrom)}</td>
                            <td className="px-4 py-3 text-[9px] text-slate-500">{formatDate(entry.effectiveTo)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
                    <Pagination page={formularyPage} pages={formularyPages} onPrevious={() => setFormularyPage((page) => Math.max(1, page - 1))} onNext={() => setFormularyPage((page) => Math.min(formularyPages, page + 1))} />
                  </div>
                </>
              )}
            </section>

            <aside className="space-y-4">
              <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[12px] font-extrabold text-slate-800">Clinical Screening</h2>
                    <p className="mt-0.5 text-[10px] text-slate-400">Prescription safety queue</p>
                  </div>
                  <ShieldAlert size={18} className="text-[#1b7b68]" />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="rounded-2xl bg-rose-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-rose-700">Blocked</span>
                      <span className="text-sm font-black text-rose-700">{blockedCount}</span>
                    </div>
                    <p className="mt-1 text-[9px] font-semibold text-rose-600">Requires clinical review before approval.</p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-amber-700">Warnings</span>
                      <span className="text-sm font-black text-amber-700">{warningCount}</span>
                    </div>
                    <p className="mt-1 text-[9px] font-semibold text-amber-600">Review formulary or duplicate-therapy warnings.</p>
                  </div>
                  <button type="button" onClick={() => setActiveTab('prescriptions')} className="w-full rounded-2xl bg-[#1b7b68] py-2.5 text-[10px] font-extrabold text-white">
                    Open Prescription Board
                  </button>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[12px] font-extrabold text-slate-800">Inventory Health</h2>
                    <p className="mt-0.5 text-[10px] text-slate-400">Stock and controlled medicines</p>
                  </div>
                  <Pill size={18} className="text-[#1b7b68]" />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3"><span className="text-[10px] font-bold text-slate-500">Loaded inventory</span><span className="text-sm font-black text-slate-800">{inventory.length}</span></div>
                  <div className="flex items-center justify-between rounded-2xl bg-amber-50 p-3"><span className="text-[10px] font-bold text-amber-700">Low stock</span><span className="text-sm font-black text-amber-700">{lowStockCount}</span></div>
                  <div className="flex items-center justify-between rounded-2xl bg-violet-50 p-3"><span className="text-[10px] font-bold text-violet-700">Controlled</span><span className="text-sm font-black text-violet-700">{controlledCount}</span></div>
                  <button type="button" onClick={() => setActiveTab('inventory')} className="w-full rounded-2xl bg-slate-900 py-2.5 text-[10px] font-extrabold text-white">
                    Open Inventory
                  </button>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[12px] font-extrabold text-slate-800">Dispensing Workflow</h2>
                    <p className="mt-0.5 text-[10px] text-slate-400">Verified medication release</p>
                  </div>
                  <Barcode size={18} className="text-[#1b7b68]" />
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    ['1', 'Screen prescription', 'Clinical checks'],
                    ['2', 'Approve order', 'Pharmacist review'],
                    ['3', 'Scan and dispense', 'Barcode verification'],
                    ['4', 'Record transaction', 'Inventory + EHR'],
                  ].map(([step, title, detail]) => (
                    <div key={step} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#e8f5f3] text-[10px] font-black text-[#1b7b68]">{step}</span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold text-slate-700">{title}</p>
                        <p className="mt-0.5 text-[9px] font-semibold text-slate-400">{detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setActiveTab('dispenses')} className="mt-3 w-full rounded-2xl border border-slate-200 py-2.5 text-[10px] font-extrabold text-slate-600 hover:bg-slate-50">
                  View Dispense History
                </button>
              </section>

              <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[12px] font-extrabold text-slate-800">Formulary Control</h2>
                    <p className="mt-0.5 text-[10px] text-slate-400">Medication policy management</p>
                  </div>
                  <Stethoscope size={17} className="text-[#1b7b68]" />
                </div>
                <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500">Active entries loaded</span>
                    <span className="text-sm font-black text-slate-800">{formulary.length}</span>
                  </div>
                  <p className="mt-1 text-[9px] leading-4 text-slate-400">Use formulary rules during screening to identify approved and restricted medicines.</p>
                </div>
                <button type="button" onClick={() => setIsCreateFormularyOpen(true)} className="mt-3 w-full rounded-2xl bg-[#1b7b68]/5 py-2.5 text-[10px] font-extrabold text-[#1b7b68]">
                  Create Formulary Entry
                </button>
              </section>
            </aside>
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-3">
          <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[12px] font-extrabold text-slate-800">Pharmacy Operations Snapshot</h2>
                <p className="mt-0.5 text-[10px] text-slate-400">Current workflow volume loaded into the command center</p>
              </div>
              <Clock3 size={18} className="text-[#1b7b68]" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MiniMetric label="Prescriptions" value={prescriptionTotal} icon={<FileCheck2 className="h-4 w-4" />} />
              <MiniMetric label="Inventory" value={inventoryTotal} icon={<Pill className="h-4 w-4" />} />
              <MiniMetric label="Dispenses" value={dispenseTotal} icon={<PackageCheck className="h-4 w-4" />} />
              <MiniMetric label="Formulary" value={formularyTotal} icon={<Stethoscope className="h-4 w-4" />} />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[12px] font-extrabold text-slate-800">Operational Notes</h2>
                <p className="mt-0.5 text-[10px] text-slate-400">Workflow safeguards</p>
              </div>
              <Clock3 size={18} className="text-[#1b7b68]" />
            </div>
            <div className="mt-4 space-y-2 text-[9px] leading-5 text-slate-500">
              <p className="rounded-2xl bg-slate-50 p-3">Clinical screening is completed before a prescription can be approved.</p>
              <p className="rounded-2xl bg-slate-50 p-3">Dispensing requires a valid prescription medication index and barcode verification.</p>
              <p className="rounded-2xl bg-slate-50 p-3">Inventory decrement and controlled-substance logging are handled by the backend transaction.</p>
            </div>
          </section>
        </div>
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
        inventory={dispenseInventory}
        inventoryLoading={dispenseInventoryLoading}
        isOpen={isDispenseOpen}
        onClose={() => setIsDispenseOpen(false)}
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
