'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BedDouble,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock3,
  CreditCard,
  DollarSign,
  FileText,
  HeartPulse,
  History,
  Hospital,
  Loader2,
  Mail,
  MapPin,
  Pill,
  Receipt,
  RefreshCw,
  Search,
  ShieldAlert,
  Stethoscope,
  UserRound,
  Users,
  X,
  XCircle,
} from 'lucide-react';

/* =========================================================
   MEDXVERSE — COMPREHENSIVE PATIENT REGISTRY

   Backend contract:
     GET /api/v1/patients/:id/registry

   The registry endpoint is intentionally cross-module. It returns:
     patient       -> canonical patient identity
     overview      -> clinical roll-up
     sections[]    -> every patient-linked HMS module/model discovered by
                       the backend, with the COMPLETE source document in
                       item.details
     timeline[]    -> one longitudinal timeline across all sections + EHR
     ehr           -> legacy/native EHR resources

   This page therefore does NOT reduce the registry to a small list of
   FHIR resource types. It renders the actual module registry and lets staff
   drill into the complete source record, including populated staff/provider
   references and billing/operative fields.
   ========================================================= */

type AnyRecord = Record<string, any>;

type RegistryItem = {
  id?: string;
  resourceType?: string;
  sourceModel?: string;
  moduleKey?: string;
  date?: string | Date;
  title?: string;
  status?: string;
  summary?: string;
  details?: AnyRecord;
};

type RegistrySection = {
  key: string;
  label: string;
  count: number;
  items: RegistryItem[];
};

type RegistryData = {
  patient?: AnyRecord;
  overview?: AnyRecord;
  sections?: RegistrySection[];
  timeline?: RegistryItem[];
  ehr?: AnyRecord;
};

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

const RAW_API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://medxverse-backend.onrender.com/api/v1';

function normalizeApiBase(value: string) {
  const base = String(value || '').replace(/\/+$/, '');
  if (base.endsWith('/api/v1')) return base;
  if (base.endsWith('/api')) return `${base}/v1`;
  return `${base}/api/v1`;
}

const API_BASE_URL = normalizeApiBase(RAW_API_BASE);

function getToken() {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('jwt')
  );
}

async function apiRequest<T>(path: string): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    cache: 'no-store',
  });

  const json = (await response.json().catch(() => null)) as ApiEnvelope<T> | T | null;

  if (!response.ok) {
    const message =
      (json as ApiEnvelope<T> | null)?.message ||
      `Request failed with status ${response.status}.`;
    throw new Error(message);
  }

  if (json && typeof json === 'object' && 'success' in json && json.success === false) {
    throw new Error((json as ApiEnvelope<T>).message || 'The registry request failed.');
  }

  if (json && typeof json === 'object' && 'data' in json) {
    return ((json as ApiEnvelope<T>).data ?? json) as T;
  }

  return json as T;
}

function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function safeString(value: unknown, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

function humanize(value: unknown) {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Record';
}

function formatDate(value?: string | Date) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return safeString(value);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(value?: string | Date) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return safeString(value);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function dateValue(item: AnyRecord) {
  const fields = [
    'date', 'serviceDate', 'appointmentDate', 'scheduledAt', 'admittedAt',
    'dischargedAt', 'arrivalAt', 'assessedAt', 'performedAt', 'procedureDate',
    'studyDate', 'examinationStartedAt', 'completedAt', 'resultedAt',
    'dispensedAt', 'prescribedAt', 'sessionDate', 'deliveryDate', 'chargeDate',
    'paymentDate', 'createdAt', 'updatedAt', 'occurredAt', 'issued',
  ];
  for (const field of fields) {
    if (item?.[field]) return item[field];
  }
  return undefined;
}

function calculateAge(dob?: string) {
  if (!dob) return '—';
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return '—';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const month = now.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) age--;
  return String(Math.max(0, age));
}

function statusClass(value?: unknown) {
  const status = String(value || '').toUpperCase();
  if (['ACTIVE', 'COMPLETED', 'PAID', 'APPROVED', 'SUCCESS', 'AUTHORIZED', 'DISCHARGED'].includes(status)) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  }
  if (['CANCELLED', 'CANCELED', 'REJECTED', 'FAILED', 'TERMINATED', 'DENIED'].includes(status)) {
    return 'bg-rose-50 text-rose-700 border-rose-100';
  }
  if (['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'PROCESSING', 'ADMITTED', 'PLANNED'].includes(status)) {
    return 'bg-amber-50 text-amber-700 border-amber-100';
  }
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

function firstNonEmpty(row: AnyRecord, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

type StaffMember = {
  label: string;
  name: string;
  reference?: string;
};

function isMongoId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

function technicalReference(value: unknown): string | undefined {
  if (isMongoId(value)) return value;
  if (value && typeof value === 'object') {
    const reference = (value as AnyRecord)._id || (value as AnyRecord).id;
    return isMongoId(reference) ? reference : undefined;
  }
  return undefined;
}

function getPersonName(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value !== 'object') return undefined;

  const person = value as AnyRecord;
  const fullName = [person.firstName, person.otherNames, person.lastName]
    .filter(Boolean)
    .join(' ');

  return fullName || person.name || person.fullName || person.displayName || person.username;
}

function isReadableDateField(fieldKey: string): boolean {
  return /(?:date|time|timestamp|createdAt|updatedAt|recordedAt|occurredAt|scheduledAt|admittedAt|dischargedAt|arrivalAt|assessedAt|performedAt|completedAt|resultedAt|dispensedAt|prescribedAt|deliveredAt|issuedAt|startedAt|endedAt|paidAt|approvedAt|submittedAt)$/i.test(fieldKey);
}

function isIsoDateValue(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}(?:T|\s)\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(value);
}

function fieldDisplayValue(fieldKey: string, value: unknown, patient?: AnyRecord): string {
  if (value === null || value === undefined || value === '') return '';

  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return formatDateTime(value);
  if (typeof value !== 'object') {
    if (typeof value === 'string' && (isReadableDateField(fieldKey) || isIsoDateValue(value))) {
      return formatDateTime(value);
    }
    if (isMongoId(value)) {
      const patientName = fieldKey.toLowerCase().includes('patient') ? getPersonName(patient) : undefined;
      return patientName || 'Linked record';
    }
    return String(value);
  }

  return getPersonName(value) || safeString((value as AnyRecord).value, '');
}

function extractStaff(item: RegistryItem): StaffMember[] {
  const details = item.details || {};
  const staff: StaffMember[] = [];
  const staffKeys = /doctor|physician|surgeon|nurse|clinician|provider|staff|assignedTo|performedBy|createdBy|approvedBy/i;

  Object.entries(details).forEach(([key, value]) => {
    if (!staffKeys.test(key)) return;
    const name = getPersonName(value);
    const reference = technicalReference(value);
    if (name || reference) {
      staff.push({
        label: humanize(key),
        name: name || 'Linked staff member',
        ...(reference ? { reference } : {}),
      });
    }
  });

  return staff;
}

function getRecordTitle(item: RegistryItem) {
  const details = item.details || {};
  return (
    item.title ||
    firstNonEmpty(details, [
      'procedureName', 'testName', 'serviceName', 'medicationName', 'drugName',
      'chiefComplaint', 'admissionReason', 'primaryDiagnosis', 'diagnosis',
      'reasonForVisit', 'visitReason', 'title', 'subject', 'description',
      'name', 'visitNumber', 'appointmentNumber', 'prescriptionNumber',
      'orderNumber', 'caseNumber', 'sessionId', 'billingId', 'invoiceNumber',
      'claimNumber', 'code', 'procedureType', 'modality', 'examName', 'studyName',
    ]) ||
    (details.procedure?.name) ||
    humanize(item.sourceModel || item.resourceType || item.moduleKey)
  );
}

function getRecordSummary(item: RegistryItem) {
  if (item.summary) return item.summary;
  const d = item.details || {};
  const value = firstNonEmpty(d, [
    'impression', 'findings', 'resultSummary', 'result', 'clinicalNotes',
    'consultationNotes', 'nursingNotes', 'dischargeSummary', 'notes', 'reason',
    'assessment', 'treatmentPlan', 'instructions', 'chiefComplaint', 'postOpNotes',
    'preOpNotes', 'operativeDiagnosis', 'postOperativeDiagnosis', 'surgicalFindings',
    'techniqueNotes', 'surgeonNotes', 'complications', 'indication',
  ]);
  if (typeof value === 'string') return value;
  return value ? JSON.stringify(value) : undefined;
}

function getSectionIcon(key: string) {
  const k = key.toLowerCase();
  if (k.includes('billing') || k.includes('claim') || k.includes('payment')) return DollarSign;
  if (k.includes('pharmacy') || k.includes('medication')) return Pill;
  if (k.includes('surgery') || k.includes('ot') || k.includes('procedure')) return Stethoscope;
  if (k.includes('lab')) return ClipboardList;
  if (k.includes('radiology') || k.includes('eye')) return Activity;
  if (k.includes('admission') || k.includes('bed') || k.includes('icu')) return BedDouble;
  if (k.includes('appointment') || k.includes('outpatient')) return Calendar;
  if (k.includes('document') || k.includes('report')) return FileText;
  if (k.includes('staff') || k.includes('provider')) return Users;
  return Hospital;
}

function normalizeSections(data: RegistryData | null) {
  const allowedModules: Record<string, { key: string; label: string }> = {
    emergency: { key: 'emergency', label: 'Emergency Department' },
    icu: { key: 'icu', label: 'Intensive Care Unit' },
    outpatient: { key: 'outpatient', label: 'Outpatient Clinic' },
    surgery: { key: 'surgery', label: 'Surgery & OT' },
    ot: { key: 'surgery', label: 'Surgery & OT' },
    radiology: { key: 'radiology', label: 'Radiology' },
    laboratory: { key: 'laboratory', label: 'Laboratory' },
    lab: { key: 'laboratory', label: 'Laboratory' },
    appointments: { key: 'appointments', label: 'Appointments' },
    pharmacy: { key: 'pharmacy', label: 'Pharmacy' },
    billing: { key: 'billing', label: 'Billing & Invoices' },
  };

  const grouped = new Map<string, RegistrySection>();

  asArray<RegistrySection>(data?.sections).forEach((section) => {
    const module = allowedModules[String(section.key || '').toLowerCase()];
    if (!module) return;

    const items = asArray<RegistryItem>(section.items);
    const existing = grouped.get(module.key);
    if (existing) {
      existing.items.push(...items);
      existing.count = existing.items.length;
      return;
    }

    grouped.set(module.key, {
      ...section,
      key: module.key,
      label: module.label,
      count: items.length,
      items,
    });
  });

  return Array.from(grouped.values());
}

function ObjectTree({ value, level = 0, fieldKey = '', patient }: { value: any; level?: number; fieldKey?: string; patient?: AnyRecord }) {
  if (value === null || value === undefined) return <span className="text-slate-400">—</span>;

  if (value instanceof Date) {
    return <span className="wrap-break-word text-slate-700">{formatDateTime(value)}</span>;
  }

  if (typeof value !== 'object') {
    const readable = fieldDisplayValue(fieldKey, value, patient);
    const ref = technicalReference(value);
    return (
      <span className="wrap-break-word text-slate-700">
        {readable || String(value)}
        {ref && readable && readable !== ref ? (
          <span className="ml-2 text-[9px] font-semibold text-slate-300">ref {ref}</span>
        ) : null}
      </span>
    );
  }

  if (Array.isArray(value)) {
    if (!value.length) return <span className="text-slate-400">Empty list</span>;
    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={index} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <div className="mb-1 text-[9px] font-black uppercase tracking-wide text-slate-400">Item {index + 1}</div>
            <ObjectTree value={item} level={level + 1} fieldKey={fieldKey} patient={patient} />
          </div>
        ))}
      </div>
    );
  }

  const entries = Object.entries(value).filter(([key]) => !key.startsWith('_registry'));
  if (!entries.length) return <span className="text-slate-400">Empty object</span>;

  return (
    <div className={level > 0 ? 'space-y-2' : 'divide-y divide-slate-100'}>
      {entries.map(([key, item]) => {
        const isReference = /(^|_)(id|by|provider|surgeon|doctor|nurse|clinician|staff|patient|member|enrollee|ward|bed|department|account|user)/i.test(key);
        const readable = fieldDisplayValue(key, item, patient);
        const ref = technicalReference(item);
        const primitive = item === null || item === undefined || typeof item !== 'object';

        return (
          <div key={key} className={level === 0 ? 'px-3 py-3' : `rounded-xl border p-3 ${isReference ? 'border-[#1b7b68]/10 bg-[#f7fbfa]' : 'border-slate-100 bg-white'}`}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="text-[9px] font-black uppercase tracking-wide text-slate-400">{humanize(key)}</div>
              {isReference && readable && <span className="rounded-md bg-[#e8f5f3] px-1.5 py-0.5 text-[8px] font-black text-[#1b7b68]">Resolved</span>}
            </div>
            {primitive ? (
              <div className="text-xs font-semibold text-slate-700">
                {readable || (typeof item === 'string' && isMongoId(item) ? 'Linked record' : String(item ?? '—'))}
                {ref && readable ? <div className="mt-1 text-[9px] font-medium text-slate-300">Reference: {ref}</div> : null}
              </div>
            ) : (
              <ObjectTree value={item} level={level + 1} fieldKey={key} patient={patient} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ value }: { value?: unknown }) {
  if (!value) return null;
  return (
    <span className={`inline-flex rounded-lg border px-2 py-1 text-[9px] font-black uppercase tracking-wide ${statusClass(value)}`}>
      {humanize(value)}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 py-12 text-center">
      <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
      <p className="text-xs font-semibold text-slate-400">{text}</p>
    </div>
  );
}

function DetailModal({
  item,
  sectionLabel,
  patient,
  onClose,
}: {
  item: RegistryItem;
  sectionLabel: string;
  patient?: AnyRecord;
  onClose: () => void;
}) {
  const details = item.details || {};
  const staff = extractStaff(item);
  const title = getRecordTitle(item);
  const summary = getRecordSummary(item);
  const sourceId = item.id || safeString(details._id, '—');
  const date = item.date || dateValue(details);
  const technicalFields = Object.keys(details).filter((key) => /(^|_)(id|by)$/i.test(key));

  const importantFields = Object.entries(details).filter(([key, value]) => {
    if (key.startsWith('_registry')) return false;
    if (value === null || value === undefined || value === '') return false;
    if (['createdAt', 'updatedAt', '_id'].includes(key)) return false;
    if (/^(hospitalId|patientId)$/i.test(key)) return false;
    return !Array.isArray(value) && typeof value !== 'object' && !isMongoId(value);
  }).slice(0, 12);

  const surgeryLike = /surgery|surgical|theatre|operating|procedure|anesthesia|anaesthesia/i.test(
    `${sectionLabel} ${item.sourceModel || ''}`,
  );
  const financialLike = /billing|payment|claim|invoice|refund|charge|settlement/i.test(
    `${sectionLabel} ${item.sourceModel || ''}`,
  );

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/75 p-2 backdrop-blur-md sm:p-4 lg:p-6"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} details`}
    >
      <div
        className="flex h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-[#f6f9f8] shadow-[0_28px_90px_rgba(15,23,42,0.34)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Modal header */}
        <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-5 sm:px-8 sm:py-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              {surgeryLike ? <Stethoscope className="h-6 w-6" /> : financialLike ? <CreditCard className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-600">{sectionLabel}</span>
                {item.status || details.status ? <StatusBadge value={item.status || details.status} /> : null}
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-400"><Clock3 className="h-3 w-3" />{formatDateTime(date)}</span>
              </div>
              <p className="mt-3 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Medical record</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
              <p className="mt-1 text-[10px] font-semibold text-slate-400">
                {humanize(item.sourceModel || item.resourceType || 'Clinical record')}
                {sourceId !== '—' ? ` • ${sourceId}` : ''}
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close record details" className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Modal body */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f6f9f8] p-3 sm:p-5 lg:p-7">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
            {/* Record overview */}
            <section className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:col-span-2">
              <InfoTile compact label="Module" value={sectionLabel} />
              <InfoTile compact label="Record type" value={humanize(item.sourceModel || item.resourceType || 'Record')} />
              <InfoTile compact label="Recorded" value={formatDateTime(date)} />
              <InfoTile compact label="Status" value={humanize(item.status || details.status || 'Not specified')} />
            </section>

            <main className="min-w-0 space-y-5">
              {summary && (
                <section className="overflow-hidden rounded-2xl border border-[#b7ded5] bg-white shadow-sm">
                  <div className="flex items-center gap-3 border-b border-[#dceeea] bg-[#edf8f5] px-5 py-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><ClipboardList className="h-4 w-4" /></div>
                    <div><p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Clinical summary</p><h3 className="text-sm font-black text-slate-800">What happened</h3></div>
                  </div>
                  <p className="whitespace-pre-wrap px-5 py-4 text-sm leading-6 text-slate-600">{summary}</p>
                </section>
              )}

              {/* Highlighted fields */}
              {importantFields.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#1b7b68]" />
                    <div><h3 className="text-sm font-black text-slate-800">Key information</h3><p className="text-[10px] font-semibold text-slate-400">Important values surfaced for quick review.</p></div>
                  </div>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                    {importantFields.map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-1 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">{humanize(key)}</p>
                        <p className="wrap-break-word text-xs font-extrabold text-slate-700 sm:text-right">{fieldDisplayValue(key, value, patient) || String(value)}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Full source */}
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><h3 className="text-sm font-black text-slate-800">Complete source record</h3><p className="mt-0.5 text-[10px] font-semibold text-slate-400">The original module fields retained for audit and review.</p></div>
                  <span className="w-fit rounded-lg bg-white px-2.5 py-1.5 text-[9px] font-black text-slate-500 ring-1 ring-slate-200">{Object.keys(details).filter((key) => !key.startsWith('_registry')).length} fields</span>
                </div>
                <div className="p-4 sm:p-5"><ObjectTree value={details} patient={patient} /></div>
              </section>

              {technicalFields.length > 0 && <p className="px-1 text-[9px] font-semibold leading-4 text-slate-400">Technical references remain visible for auditability; readable linked names are shown whenever available.</p>}
            </main>

            <aside className="min-w-0 space-y-5">
              {patient && (
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68]">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Patient</p>
                      <p className="text-sm font-black text-slate-800">{[patient.firstName, patient.otherNames, patient.lastName].filter(Boolean).join(' ') || 'Unnamed Patient'}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[9px] font-bold text-slate-500">
                    {patient.mrn && <span className="rounded-lg bg-slate-100 px-2 py-1">MRN {patient.mrn}</span>}
                    {patient.gender && <span className="rounded-lg bg-slate-100 px-2 py-1">{humanize(patient.gender)}</span>}
                    {patient.dateOfBirth && <span className="rounded-lg bg-slate-100 px-2 py-1">Age {calculateAge(patient.dateOfBirth)}</span>}
                  </div>
                </div>
              </section>
              )}

              {staff.length > 0 && (
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-[#edf8f5] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#1b7b68]" />
                    <div><h3 className="text-xs font-black text-slate-800">Care team</h3><p className="text-[9px] font-semibold text-slate-400">People linked to this record.</p></div>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {staff.map((person, index) => (
                    <div key={`${person.label}-${person.name}-${index}`} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          <UserRound className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">{person.label}</p>
                          <p className="mt-1 truncate text-xs font-black text-slate-800">{person.name}</p>
                          {person.reference && <p className="mt-1 text-[8px] font-semibold text-slate-300">Reference: {person.reference}</p>}
                        </div>
                    </div>
                  ))}
                </div>
              </section>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoTile({ label, value, compact = false }: { label: string; value: unknown; compact?: boolean }) {
  return (
    <div className={compact ? 'rounded-xl border border-slate-200 bg-white px-3 py-2.5' : 'rounded-2xl border border-slate-100 bg-slate-50 p-3'}>
      <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 truncate text-xs font-extrabold text-slate-700">{safeString(value)}</p>
    </div>
  );
}

function RegistryCard({ item, sectionLabel, onOpen }: { item: RegistryItem; sectionLabel: string; onOpen: () => void }) {
  const staff = extractStaff(item);
  const details = item.details || {};
  const summary = getRecordSummary(item);

  return (
    <button type="button" onClick={onOpen} className="group flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-[#f4fbf9] sm:items-center sm:gap-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68]">
        <FileText className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-black text-slate-800">{getRecordTitle(item)}</h3>
          {item.status && <StatusBadge value={item.status} />}
        </div>
        {summary && <p className="mt-1 line-clamp-1 text-[11px] leading-5 text-slate-500">{summary}</p>}
        {staff.length > 0 && (
          <p className="mt-1 flex items-center gap-1.5 truncate text-[10px] font-semibold text-slate-400">
            <Users className="h-3 w-3 shrink-0 text-[#1b7b68]" />
            {staff.slice(0, 2).map((person) => `${person.label}: ${person.name}`).join(' • ')}
            {staff.length > 2 ? ` +${staff.length - 2}` : ''}
          </p>
        )}
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Date</p>
        <p className="mt-1 text-xs font-bold text-slate-600">{formatDate(item.date || dateValue(details))}</p>
        <p className="mt-1 max-w-32 truncate text-[9px] font-semibold text-slate-400">{humanize(item.sourceModel || item.resourceType || sectionLabel)}</p>
      </div>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#1b7b68]" />
    </button>
  );
}

function TimelineRow({ item, onOpen }: { item: RegistryItem; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="flex w-full gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-slate-50">
      <div className="flex flex-col items-center">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68]">
          <Activity className="h-4 w-4" />
        </div>
        <div className="mt-1 h-full w-px bg-slate-100" />
      </div>
      <div className="min-w-0 flex-1 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-black text-slate-800">{getRecordTitle(item)}</p>
          <span className="text-[9px] font-semibold text-slate-400">{formatDateTime(item.date)}</span>
        </div>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#1b7b68]">{humanize(item.moduleKey || item.resourceType)}</p>
        {item.summary && <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">{item.summary}</p>}
      </div>
    </button>
  );
}

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const patientId = params?.id;

  const [registry, setRegistry] = useState<RegistryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<{ item: RegistryItem; label: string } | null>(null);

  const loadRegistry = useCallback(async (silent = false) => {
    if (!patientId) return;
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await apiRequest<RegistryData>(`/patients/${encodeURIComponent(patientId)}/registry`);
      setRegistry(data || null);
    } catch (err: any) {
      console.error('Failed to load patient registry:', err);
      setError(err?.message || 'Unable to load the patient registry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patientId]);

  useEffect(() => {
    void loadRegistry();
  }, [loadRegistry]);

  const patient = registry?.patient || {};
  const sections = useMemo(() => normalizeSections(registry), [registry]);
  const timeline = useMemo(() => {
    return sections.flatMap((section) => section.items).sort((a, b) => {
      return new Date(String(b.date || 0)).getTime() - new Date(String(a.date || 0)).getTime();
    });
  }, [sections]);

  const filteredTimeline = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return timeline;
    return timeline.filter((item) => {
      const haystack = JSON.stringify({
        title: item.title,
        summary: item.summary,
        sourceModel: item.sourceModel,
        resourceType: item.resourceType,
        details: item.details,
      }).toLowerCase();
      return haystack.includes(query);
    });
  }, [timeline, search]);

  const visibleSections = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sections;
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => JSON.stringify(item).toLowerCase().includes(query)),
      }))
      .filter((section) => section.items.length > 0);
  }, [sections, search]);

  const sectionMap = useMemo(() => new Map(sections.map((section) => [section.key, section])), [sections]);
  const totalRecords = Number(registry?.overview?.totalClinicalRecords || timeline.length || 0);
  const latestVitals = registry?.overview?.latestVitals;
  const activeMedications = asArray<RegistryItem>(registry?.overview?.activeMedications);
  const activeAdmissions = asArray<RegistryItem>(registry?.overview?.activeAdmissions);
  const activeIcuAdmissions = asArray<RegistryItem>(registry?.overview?.activeIcuAdmissions);
  const diagnoses = asArray<RegistryItem>(registry?.overview?.recentDiagnoses);
  const recentProcedures = asArray<RegistryItem>(registry?.overview?.recentProcedures);
  const recentLabs = asArray<RegistryItem>(registry?.overview?.recentLaboratory);
  const recentRadiology = asArray<RegistryItem>(registry?.overview?.recentRadiology);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-9 w-9 animate-spin text-[#1b7b68]" />
          <p className="text-sm font-bold text-slate-500">Loading complete patient registry…</p>
          <p className="text-[10px] text-slate-400">Collecting records across HMS modules.</p>
        </div>
      </div>
    );
  }

  if (error || !registry?.patient) {
    return (
      <div className="space-y-5 font-sans text-slate-800">
        <button type="button" onClick={() => router.push('/hms/patients')} className="flex items-center gap-2 text-xs font-black text-[#1b7b68]">
          <ArrowLeft className="h-4 w-4" /> Back to Patients
        </button>
        <div className="rounded-3xl border border-rose-100 bg-white p-12 text-center shadow-sm">
          <XCircle className="mx-auto mb-3 h-12 w-12 text-rose-300" />
          <h2 className="text-lg font-black text-slate-800">Unable to load patient registry</h2>
          <p className="mt-1 text-sm text-slate-400">{error || 'The patient record was not found.'}</p>
          <button type="button" onClick={() => void loadRegistry()} className="mt-5 rounded-xl bg-[#1b7b68] px-4 py-2.5 text-xs font-black text-white">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10 font-sans text-slate-800">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.push('/hms/patients')} className="rounded-2xl border border-slate-100 bg-white p-2.5 text-slate-500 shadow-sm hover:text-[#1b7b68]">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-800">Patient Registry</h1>
              <span className="rounded-lg bg-[#e8f5f3] px-2 py-1 text-[9px] font-black uppercase tracking-wide text-[#1b7b68]">Complete HMS record</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">One longitudinal record across clinical, operational and financial modules.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-300" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search this patient registry…" className="h-10 w-64 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold outline-none focus:border-[#1b7b68]/40" />
          </div>
          <button type="button" onClick={() => void loadRegistry(true)} disabled={refreshing} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 hover:border-[#1b7b68]/30 hover:text-[#1b7b68]">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-[#e8f5f3] text-[#1b7b68]">
            {patient.photoUrl ? <img src={patient.photoUrl} alt="Patient" className="h-full w-full object-cover" /> : <UserRound className="h-8 w-8" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black text-slate-800">{[patient.firstName, patient.otherNames, patient.lastName].filter(Boolean).join(' ') || 'Unnamed Patient'}</h2>
              {patient.mrn && <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">MRN {patient.mrn}</span>}
              {patient.universalPatientId && <span className="rounded-lg bg-[#e8f5f3] px-2 py-1 text-[10px] font-black text-[#1b7b68]">MPI {patient.universalPatientId}</span>}
              {patient.isFlagged && <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-600"><AlertTriangle className="h-3 w-3" /> Flagged</span>}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-500">
              <span>{calculateAge(patient.dateOfBirth)} yrs</span>
              <span>{humanize(patient.gender)}</span>
              <span>DOB {formatDate(patient.dateOfBirth)}</span>
              <span className="inline-flex items-center gap-1"><PhoneIcon />{safeString(patient.phone)}</span>
              <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{safeString(patient.email)}</span>
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{typeof patient.address === 'string' ? patient.address : safeString(patient.address?.city || patient.address?.state)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-115">
            <Metric label="All records" value={totalRecords} icon={History} />
            <Metric label="Modules" value={sections.length} icon={Hospital} />
            <Metric label="Active meds" value={activeMedications.length} icon={Pill} />
            <Metric label="Admissions" value={activeAdmissions.length + activeIcuAdmissions.length} icon={BedDouble} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        <QuickFact label="Blood group" value={patient.bloodGroup} />
        <QuickFact label="Genotype" value={patient.genotype} />
        <QuickFact label="Marital status" value={patient.maritalStatus} />
        <QuickFact label="Nationality" value={patient.nationality} />
        <QuickFact label="Occupation" value={patient.occupation} />
        <QuickFact label="Religion" value={patient.religion} />
        <QuickFact label="Emergency contact" value={getPersonName(patient.emergencyContact) || patient.emergencyContact?.phone} />
        <QuickFact label="Registered" value={formatDate(patient.createdAt)} />
      </div>

      <div className="registry-tabs-scrollbar overflow-x-auto rounded-3xl border border-slate-100 bg-white p-2 shadow-sm">
        <div className="flex min-w-max gap-1">
          <NavButton active={activeSection === 'overview'} onClick={() => setActiveSection('overview')} icon={Activity} label="Overview" count={totalRecords} />
          <NavButton active={activeSection === 'timeline'} onClick={() => setActiveSection('timeline')} icon={History} label="Timeline" count={timeline.length} />
          {sections.map((section) => {
            const Icon = getSectionIcon(section.key);
            return <NavButton key={section.key} active={activeSection === section.key} onClick={() => setActiveSection(section.key)} icon={Icon} label={section.label} count={section.count} />;
          })}
        </div>
      </div>

      {activeSection === 'overview' && (
        <Overview
          registry={registry}
          sections={sections}
          latestVitals={latestVitals}
          activeMedications={activeMedications}
          activeAdmissions={activeAdmissions}
          activeIcuAdmissions={activeIcuAdmissions}
          diagnoses={diagnoses}
          recentProcedures={recentProcedures}
          recentLabs={recentLabs}
          recentRadiology={recentRadiology}
          timeline={filteredTimeline}
          onOpen={(item) => setSelectedItem({ item, label: sectionMap.get(item.moduleKey || '')?.label || humanize(item.moduleKey || item.resourceType) })}
        />
      )}

      {activeSection === 'timeline' && (
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <SectionHeader title="Complete longitudinal timeline" subtitle="Every registry record ordered from newest to oldest." count={filteredTimeline.length} />
          {filteredTimeline.length ? (
            <div className="mt-4 divide-y divide-slate-100">
              {filteredTimeline.map((item, index) => (
                <TimelineRow key={`${item.id || item.sourceModel}-${index}`} item={item} onOpen={() => setSelectedItem({ item, label: sectionMap.get(item.moduleKey || '')?.label || humanize(item.moduleKey || item.resourceType) })} />
              ))}
            </div>
          ) : <EmptyState text="No records match your search." />}
        </section>
      )}

      {activeSection !== 'overview' && activeSection !== 'timeline' && (
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          {(() => {
            const section = visibleSections.find((item) => item.key === activeSection) || sectionMap.get(activeSection);
            if (!section) return <EmptyState text="This module has no registry data." />;
            const items = search.trim() ? visibleSections.find((item) => item.key === activeSection)?.items || [] : section.items;
            return (
              <>
                <SectionHeader title={section.label} subtitle={`Complete ${section.label.toLowerCase()} records linked to this patient.`} count={items.length} />
                {items.length ? (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
                    {items.map((item, index) => (
                      <RegistryCard key={`${item.id || item.sourceModel}-${index}`} item={item} sectionLabel={section.label} onOpen={() => setSelectedItem({ item, label: section.label })} />
                    ))}
                  </div>
                ) : <div className="mt-5"><EmptyState text="No records match your search." /></div>}
              </>
            );
          })()}
        </section>
      )}

      {selectedItem && <DetailModal item={selectedItem.item} sectionLabel={selectedItem.label} patient={patient} onClose={() => setSelectedItem(null)} />}
    </div>
  );
}

function PhoneIcon() {
  return <span className="text-[10px]">☎</span>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: unknown; icon: React.ElementType }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <Icon className="h-4 w-4 text-[#1b7b68]" />
      <p className="mt-2 text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-lg font-black text-slate-800">{safeString(value, '0')}</p>
    </div>
  );
}

function QuickFact({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <p className="text-[8px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 truncate text-[11px] font-extrabold text-slate-700">{safeString(value)}</p>
    </div>
  );
}

function NavButton({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string; count: number }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-black transition-all ${active ? 'bg-[#1b7b68] text-white shadow-md shadow-[#1b7b68]/20' : 'text-slate-500 hover:bg-slate-50'}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
      <span className={`rounded-md px-1.5 py-0.5 text-[9px] ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
    </button>
  );
}

function SectionHeader({ title, subtitle, count }: { title: string; subtitle: string; count: number }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-sm font-black text-slate-800">{title}</h2>
        <p className="mt-0.5 text-[10px] text-slate-400">{subtitle}</p>
      </div>
      <span className="w-fit rounded-xl bg-slate-50 px-2.5 py-1.5 text-[9px] font-black text-slate-500">{count} records</span>
    </div>
  );
}

function Overview({
  registry,
  sections,
  latestVitals,
  activeMedications,
  activeAdmissions,
  activeIcuAdmissions,
  diagnoses,
  recentProcedures,
  recentLabs,
  recentRadiology,
  timeline,
  onOpen,
}: {
  registry: RegistryData;
  sections: RegistrySection[];
  latestVitals: any;
  activeMedications: RegistryItem[];
  activeAdmissions: RegistryItem[];
  activeIcuAdmissions: RegistryItem[];
  diagnoses: RegistryItem[];
  recentProcedures: RegistryItem[];
  recentLabs: RegistryItem[];
  recentRadiology: RegistryItem[];
  timeline: RegistryItem[];
  onOpen: (item: RegistryItem) => void;
}) {
  const billing = sections.filter((section) => /billing|claim|payment/i.test(section.label));
  const surgery = sections.filter((section) => /surgery|operating theatre|ot/i.test(section.label));
  const pharmacy = sections.filter((section) => /pharmacy/i.test(section.label));
  const laboratory = sections.filter((section) => /laboratory|lab/i.test(section.label));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <OverviewMetric label="Modules" value={sections.length} icon={Hospital} />
        <OverviewMetric label="All records" value={registry.overview?.totalClinicalRecords || timeline.length} icon={History} />
        <OverviewMetric label="Medications" value={activeMedications.length} icon={Pill} />
        <OverviewMetric label="Admissions" value={activeAdmissions.length} icon={BedDouble} />
        <OverviewMetric label="ICU" value={activeIcuAdmissions.length} icon={HeartPulse} />
        <OverviewMetric label="Procedures" value={recentProcedures.length} icon={Stethoscope} />
        <OverviewMetric label="Labs" value={recentLabs.length} icon={ClipboardList} />
        <OverviewMetric label="Radiology" value={recentRadiology.length} icon={Activity} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="xl:col-span-2 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <SectionHeader title="Latest activity" subtitle="The newest records from every HMS module." count={timeline.length} />
          <div className="mt-4 space-y-1">
            {timeline.slice(0, 12).map((item, index) => (
              <TimelineRow key={`${item.id || item.sourceModel}-${index}`} item={item} onOpen={() => onOpen(item)} />
            ))}
            {!timeline.length && <EmptyState text="No clinical activity is available." />}
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-[#1b7b68]" />
              <div><h3 className="text-sm font-black">Latest vitals</h3><p className="text-[9px] text-slate-400">Most recent patient observations.</p></div>
            </div>
            {latestVitals ? (
              <div className="grid grid-cols-2 gap-2">
                <Vital label="Blood pressure" value={latestVitals.systolicBp && latestVitals.diastolicBp ? `${latestVitals.systolicBp}/${latestVitals.diastolicBp}` : latestVitals.bloodPressure} unit="mmHg" />
                <Vital label="Temperature" value={latestVitals.temperature} unit="°C" />
                <Vital label="Pulse" value={latestVitals.pulseRate || latestVitals.heartRate} unit="bpm" />
                <Vital label="SpO₂" value={latestVitals.spo2 || latestVitals.oxygenSaturation} unit="%" />
                <Vital label="Weight" value={latestVitals.weight} unit="kg" />
                <Vital label="Height" value={latestVitals.height} unit="cm" />
              </div>
            ) : <EmptyState text="No vitals recorded." />}
          </section>

          <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-rose-500" /><div><h3 className="text-sm font-black">Allergies</h3><p className="text-[9px] text-slate-400">Important safety information.</p></div></div>
            {asArray(registry.patient?.allergies).length ? (
              <div className="flex flex-wrap gap-2">{asArray(registry.patient?.allergies).map((allergy: any, index) => <span key={index} className="rounded-xl border border-rose-100 bg-rose-50 px-2.5 py-1.5 text-[10px] font-bold text-rose-600">{safeString(allergy.allergen || allergy.name || allergy)}{allergy.severity ? ` • ${allergy.severity}` : ''}</span>)}</div>
            ) : <p className="text-[11px] italic text-slate-400">No known allergies recorded.</p>}
          </section>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SummaryList title="Current medications" icon={Pill} items={activeMedications.slice(0, 8)} empty="No active medications returned." onOpen={onOpen} />
        <SummaryList title="Recent procedures / surgery" icon={Stethoscope} items={recentProcedures.slice(0, 8)} empty="No procedure records returned." onOpen={onOpen} />
        <SummaryList title="Laboratory" icon={ClipboardList} items={recentLabs.slice(0, 8)} empty="No laboratory records returned." onOpen={onOpen} />
        <SummaryList title="Radiology / imaging" icon={Activity} items={recentRadiology.slice(0, 8)} empty="No radiology records returned." onOpen={onOpen} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SummaryList title="Diagnoses / assessments" icon={ClipboardList} items={diagnoses.slice(0, 8)} empty="No diagnoses returned." onOpen={onOpen} />
        <SummaryList title="Surgery / theatre modules" icon={Stethoscope} items={surgery.flatMap((section) => section.items).slice(0, 8)} empty="No surgery records returned." onOpen={onOpen} />
        <SummaryList title="Billing / claims / payments" icon={CreditCard} items={billing.flatMap((section) => section.items).slice(0, 8)} empty="No financial records returned." onOpen={onOpen} />
      </div>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <SectionHeader title="Every HMS module represented in this patient record" subtitle="The backend discovers patient-linked models dynamically; selecting a module opens its complete source records." count={sections.length} />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {sections.map((section) => {
            const Icon = getSectionIcon(section.key);
            return <div key={section.key} className="rounded-2xl border border-slate-100 bg-slate-50 p-3"><Icon className="h-4 w-4 text-[#1b7b68]" /><p className="mt-2 truncate text-[10px] font-black text-slate-700">{section.label}</p><p className="mt-0.5 text-[9px] font-semibold text-slate-400">{section.count} records</p></div>;
          })}
        </div>
      </section>
    </div>
  );
}

function OverviewMetric({ label, value, icon: Icon }: { label: string; value: unknown; icon: React.ElementType }) {
  return <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68]"><Icon className="h-4 w-4" /></div><p className="mt-2 text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className="text-xl font-black text-slate-800">{safeString(value, '0')}</p></div>;
}

function Vital({ label, value, unit }: { label: string; value: unknown; unit: string }) {
  return <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3"><p className="text-[8px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-black text-slate-800">{safeString(value)} <span className="text-[9px] font-semibold text-slate-400">{unit}</span></p></div>;
}

function SummaryList({ title, icon: Icon, items, empty, onOpen }: { title: string; icon: React.ElementType; items: RegistryItem[]; empty: string; onOpen: (item: RegistryItem) => void }) {
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2"><Icon className="h-4 w-4 text-[#1b7b68]" /><h3 className="text-sm font-black text-slate-800">{title}</h3></div>
      {items.length ? <div className="space-y-2">{items.map((item, index) => <button key={`${item.id || item.sourceModel}-${index}`} type="button" onClick={() => onOpen(item)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-100 p-3 text-left hover:bg-slate-50"><div className="min-w-0"><p className="truncate text-xs font-black text-slate-700">{getRecordTitle(item)}</p><p className="mt-1 truncate text-[9px] text-slate-400">{humanize(item.sourceModel || item.resourceType)} • {formatDate(item.date)}</p></div><ChevronRight className="h-4 w-4 shrink-0 text-slate-300" /></button>)}</div> : <EmptyState text={empty} />}
    </section>
  );
}
