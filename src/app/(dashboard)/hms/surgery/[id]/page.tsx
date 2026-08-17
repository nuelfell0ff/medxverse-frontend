'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Hospital,
  Loader2,
  Plus,
  ShieldAlert,
  Stethoscope,
  UserRound,
  Users,
  X,
} from 'lucide-react';

const DEFAULT_HOST = 'https://medxverse-backend.onrender.com';
const RAW_API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  DEFAULT_HOST
).trim().replace(/\/+$/, '');

const API_BASE_URL = RAW_API_BASE_URL.endsWith('/api/v1')
  ? RAW_API_BASE_URL
  : `${RAW_API_BASE_URL}/api/v1`;

enum SurgeryStatus {
  SCHEDULED = 'SCHEDULED',
  PRE_OP_PREPARATION = 'PRE_OP_PREPARATION',
  IN_PROGRESS = 'IN_PROGRESS',
  RECOVERY = 'RECOVERY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  POSTPONED = 'POSTPONED',
}

enum UrgencyLevel {
  ELECTIVE = 'ELECTIVE',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

enum AnesthesiaType {
  GENERAL = 'GENERAL',
  REGIONAL = 'REGIONAL',
  LOCAL = 'LOCAL',
  SPINAL = 'SPINAL',
  EPIDURAL = 'EPIDURAL',
  SEDATION = 'SEDATION',
  COMBINED = 'COMBINED',
}

enum SurgicalRole {
  PRIMARY_SURGEON = 'PRIMARY_SURGEON',
  ASSISTING_SURGEON = 'ASSISTING_SURGEON',
  ANAESTHETIST = 'ANAESTHETIST',
  SCRUB_NURSE = 'SCRUB_NURSE',
  CIRCULATING_NURSE = 'CIRCULATING_NURSE',
  THEATRE_TECHNICIAN = 'THEATRE_TECHNICIAN',
}

interface Patient {
  _id?: string;
  firstName?: string;
  lastName?: string;
  mrn?: string;
  gender?: string;
  dateOfBirth?: string;
}

interface Staff {
  _id?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  department?: string;
  isActive?: boolean;
}

interface SurgicalTeamMember {
  userId: Staff | string;
  role: SurgicalRole | string;
  credentialVerified?: boolean;
  notes?: string;
}

interface PreOpAssessment {
  asaClassification?: string;
  mallampatiScore?: string;
  vteRiskScore?: string;
  infectionScreeningNotes?: string;
  pregnancyStatus?: string;
  preOpVitals?: {
    bpSystolic?: number;
    bpDiastolic?: number;
    heartRate?: number;
    tempCelsius?: number;
    spO2?: number;
  };
  clearedForSurgery?: boolean;
  clearedAt?: string;
  clearedBy?: Staff | string;
}

interface Consent {
  procedureConsent?: boolean;
  anesthesiaConsent?: boolean;
  bloodTransfusionConsent?: boolean;
  highRiskConsent?: boolean;
  signedByPatient?: boolean;
  witnessName?: string;
  digitalSignatureUrl?: string;
  signedAt?: string;
}

interface EquipmentItem {
  itemName: string;
  sterileStatus: string;
  maintenanceOk: boolean;
  notes?: string;
}

interface ConsumableItem {
  itemName: string;
  quantityUsed: number;
  unitCost?: number;
  lotNumber?: string;
}

interface VitalsLog {
  timestamp: string;
  bpSystolic?: number;
  bpDiastolic?: number;
  heartRate?: number;
  spO2?: number;
  respRate?: number;
  tempCelsius?: number;
  etCO2?: number;
  ecgRhythm?: string;
  notes?: string;
}

interface WHOStage {
  completed?: boolean;
  completedAt?: string;
  completedBy?: Staff | string;
  [key: string]: any;
}

interface IntraopDocs {
  incisionTime?: string;
  closureTime?: string;
  operativeDiagnosis?: string;
  postOperativeDiagnosis?: string;
  surgicalFindings?: string;
  techniqueNotes?: string;
  eblMl?: number;
  fluidsAdministeredMl?: number;
  bloodProductsAdministered?: string;
  drainsInserted?: string;
  implantsUsed?: string;
  specimensCollected?: string;
  complications?: string;
}

interface SurgeryCase {
  _id: string;
  patientId: Patient | string;
  leadSurgeonId: Staff | string;
  theatreId: string;
  procedureName: string;
  icdCode?: string;
  urgency: UrgencyLevel;
  status: SurgeryStatus;
  scheduledStartTime: string;
  scheduledEndTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  anesthesiaType: AnesthesiaType;
  surgicalTeam?: SurgicalTeamMember[];
  preOpAssessment?: PreOpAssessment;
  consent?: Consent;
  equipmentChecklist?: EquipmentItem[];
  consumablesUsed?: ConsumableItem[];
  whoChecklist?: {
    signIn?: WHOStage;
    timeOut?: WHOStage;
    signOut?: WHOStage;
  };
  vitalsTimeline?: VitalsLog[];
  intraopDocs?: IntraopDocs;
  anesthesiaNotes?: string;
  postOpNotes?: string;
  cancellationReason?: string;
}

type Tab =
  | 'overview'
  | 'pre-op'
  | 'consent'
  | 'team'
  | 'who'
  | 'equipment'
  | 'intraoperative'
  | 'anaesthesia'
  | 'post-op';

const statusConfig: Record<
  SurgeryStatus,
  { label: string; className: string }
> = {
  [SurgeryStatus.SCHEDULED]: {
    label: 'Scheduled',
    className: 'bg-blue-50 text-blue-700 border-blue-100',
  },
  [SurgeryStatus.PRE_OP_PREPARATION]: {
    label: 'Pre-Op',
    className: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  [SurgeryStatus.IN_PROGRESS]: {
    label: 'In Progress',
    className: 'bg-purple-50 text-purple-700 border-purple-100',
  },
  [SurgeryStatus.RECOVERY]: {
    label: 'Recovery',
    className: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  },
  [SurgeryStatus.COMPLETED]: {
    label: 'Completed',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  [SurgeryStatus.CANCELLED]: {
    label: 'Cancelled',
    className: 'bg-rose-50 text-rose-700 border-rose-100',
  },
  [SurgeryStatus.POSTPONED]: {
    label: 'Postponed',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

const urgencyConfig: Record<
  UrgencyLevel,
  { label: string; className: string }
> = {
  [UrgencyLevel.ELECTIVE]: {
    label: 'Elective',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  [UrgencyLevel.URGENT]: {
    label: 'Urgent',
    className: 'bg-orange-50 text-orange-700 border-orange-100',
  },
  [UrgencyLevel.EMERGENCY]: {
    label: 'Emergency',
    className: 'bg-rose-50 text-rose-700 border-rose-100',
  },
};

const roleLabels: Record<string, string> = {
  [SurgicalRole.PRIMARY_SURGEON]: 'Lead Surgeon',
  [SurgicalRole.ASSISTING_SURGEON]: 'Assistant Surgeon',
  [SurgicalRole.ANAESTHETIST]: 'Anaesthetist',
  [SurgicalRole.SCRUB_NURSE]: 'Scrub Nurse',
  [SurgicalRole.CIRCULATING_NURSE]: 'Circulating Nurse',
  [SurgicalRole.THEATRE_TECHNICIAN]: 'Theatre Technician',
};

const getStaffDisplayName = (person?: Staff | null) => {
  if (!person) return 'Assigned Staff';
  const fullName = `${person.firstName || ''} ${person.lastName || ''}`.trim();
  return fullName || 'Assigned Staff';
};

const resolveStaffFromValue = (
  value: Staff | string | undefined,
  directory: Record<string, Staff>
): Staff | undefined => {
  if (!value) return undefined;
  if (typeof value === 'object') return value;
  return directory[value];
};

const inputClass =
  'w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68]';

type VitalsFormState = Record<string, string> & {
  bpSystolic: string;
  bpDiastolic: string;
  heartRate: string;
  spO2: string;
  respRate: string;
  tempCelsius: string;
  etCO2: string;
  ecgRhythm: string;
  notes: string;
};

export default function SurgeryCaseDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const caseId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [surgeryCase, setSurgeryCase] = useState<SurgeryCase | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [actionLoading, setActionLoading] = useState(false);

  const [preOpForm, setPreOpForm] = useState<PreOpAssessment>({});
  const [consentForm, setConsentForm] = useState<Consent>({});
  const [whoForm, setWhoForm] = useState<Record<string, any>>({});
  const [vitalsForm, setVitalsForm] = useState<VitalsFormState>({
    bpSystolic: '',
    bpDiastolic: '',
    heartRate: '',
    spO2: '',
    respRate: '',
    tempCelsius: '',
    etCO2: '',
    ecgRhythm: '',
    notes: '',
  });

  const [intraopForm, setIntraopForm] = useState<IntraopDocs>({});
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [consumables, setConsumables] = useState<ConsumableItem[]>([]);
  const [anaesthesiaNotes, setAnaesthesiaNotes] = useState('');
  const [postOpNotes, setPostOpNotes] = useState('');

  const fetchCase = useCallback(async () => {
    if (!caseId) return;

    setLoading(true);
    setActionError(null);

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(
        `${API_BASE_URL}/surgery/${caseId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          json?.message || 'Failed to load surgical case.'
        );
      }

      const data = json?.data || json;

      setSurgeryCase(data);
      setPreOpForm(data.preOpAssessment || {});
      setConsentForm(data.consent || {});
      setEquipment(data.equipmentChecklist || []);
      setConsumables(data.consumablesUsed || []);
      setIntraopForm(data.intraopDocs || {});
      setAnaesthesiaNotes(data.anesthesiaNotes || '');
      setPostOpNotes(data.postOpNotes || '');
    } catch (error: any) {
      console.error(error);
      setActionError(
        error?.message || 'Unable to load surgical case.'
      );
      setSurgeryCase(null);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const fetchStaff = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_BASE_URL}/staff?isActive=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.message || 'Failed to load staff directory.');
      }

      const data = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
          ? json
          : [];

      setStaff(data);
    } catch (error) {
      console.error('Failed to load staff directory:', error);
      setStaff([]);
    }
  }, []);

  useEffect(() => {
    fetchCase();
    fetchStaff();
  }, [fetchCase, fetchStaff]);

  const patient = useMemo(() => {
    if (!surgeryCase || typeof surgeryCase.patientId === 'string') {
      return undefined;
    }

    return surgeryCase.patientId;
  }, [surgeryCase]);

  const leadSurgeon = useMemo(() => {
    if (
      !surgeryCase ||
      typeof surgeryCase.leadSurgeonId === 'string'
    ) {
      return undefined;
    }

    return surgeryCase.leadSurgeonId;
  }, [surgeryCase]);

  const patientName = patient
    ? `${patient.firstName || 'Unknown'} ${patient.lastName || 'Patient'}`
    : 'Patient';

  const resolvedLeadSurgeon =
    (typeof surgeryCase?.leadSurgeonId === 'object'
      ? surgeryCase.leadSurgeonId
      : staff.find((person) => person._id === surgeryCase?.leadSurgeonId)) ||
    leadSurgeon;

  const surgeonName = resolvedLeadSurgeon
    ? `${resolvedLeadSurgeon.firstName || ''} ${resolvedLeadSurgeon.lastName || ''}`.trim() || 'Assigned Surgeon'
    : 'Assigned Surgeon';

  const request = async (
    url: string,
    options: RequestInit = {}
  ) => {
    const token = localStorage.getItem('token');

    const res = await fetch(`${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json?.message || 'Request failed.');
    }

    return json?.data || json;
  };

  const savePreOp = async () => {
    if (!surgeryCase) return;

    setActionLoading(true);
    setActionError(null);

    try {
      const updated = await request(
        `/surgery/${surgeryCase._id}/pre-op`,
        {
          method: 'PATCH',
          body: JSON.stringify(preOpForm),
        }
      );

      setSurgeryCase(updated);
      setPreOpForm(updated.preOpAssessment || {});
    } catch (error: any) {
      setActionError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const saveConsent = async () => {
    if (!surgeryCase) return;

    setActionLoading(true);
    setActionError(null);

    try {
      const updated = await request(
        `/surgery/${surgeryCase._id}/consent`,
        {
          method: 'PATCH',
          body: JSON.stringify(consentForm),
        }
      );

      setSurgeryCase(updated);
      setConsentForm(updated.consent || {});
    } catch (error: any) {
      setActionError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const saveWHO = async (
    stage: 'signIn' | 'timeOut' | 'signOut'
  ) => {
    if (!surgeryCase) return;

    setActionLoading(true);
    setActionError(null);

    try {
      const updated = await request(
        `/surgery/${surgeryCase._id}/who-checklist`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            stage,
            data: whoForm,
          }),
        }
      );

      setSurgeryCase(updated);
      setWhoForm({});
    } catch (error: any) {
      setActionError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const addVitals = async () => {
    if (!surgeryCase) return;

    setActionLoading(true);
    setActionError(null);

    try {
      const payload = Object.fromEntries(
        Object.entries(vitalsForm)
          .filter(([_, value]) => value !== '')
          .map(([key, value]) => [
            key,
            ['ecgRhythm', 'notes'].includes(key)
              ? value
              : Number(value),
          ])
      );

      const updated = await request(
        `/surgery/${surgeryCase._id}/vitals`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      setSurgeryCase(updated);

      setVitalsForm({
        bpSystolic: '',
        bpDiastolic: '',
        heartRate: '',
        spO2: '',
        respRate: '',
        tempCelsius: '',
        etCO2: '',
        ecgRhythm: '',
        notes: '',
      });
    } catch (error: any) {
      setActionError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const saveIntraop = async () => {
    if (!surgeryCase) return;

    setActionLoading(true);
    setActionError(null);

    try {
      const updated = await request(
        `/surgery/${surgeryCase._id}/intraop-docs`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            ...intraopForm,
            equipmentChecklist: equipment,
            consumablesUsed: consumables,
          }),
        }
      );

      setSurgeryCase(updated);
      setIntraopForm(updated.intraopDocs || {});
      setEquipment(updated.equipmentChecklist || []);
      setConsumables(updated.consumablesUsed || []);
    } catch (error: any) {
      setActionError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const startSurgery = async () => {
    if (!surgeryCase) return;

    setActionLoading(true);
    setActionError(null);

    try {
      const updated = await request(
        `/surgery/${surgeryCase._id}/start`,
        {
          method: 'PATCH',
        }
      );

      setSurgeryCase(updated);
    } catch (error: any) {
      setActionError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const cancelCase = async () => {
    if (!surgeryCase) return;

    const reason = window.prompt(
      'Enter the reason for cancelling this surgical case:'
    );

    if (!reason?.trim()) return;

    setActionLoading(true);
    setActionError(null);

    try {
      const updated = await request(
        `/surgery/${surgeryCase._id}/cancel`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            cancellationReason: reason.trim(),
          }),
        }
      );

      setSurgeryCase(updated);
    } catch (error: any) {
      setActionError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const completeSurgery = async () => {
    if (!surgeryCase) return;

    setActionLoading(true);
    setActionError(null);

    try {
      const updated = await request(
        `/surgery/${surgeryCase._id}/complete`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            anesthesiaNotes: anaesthesiaNotes,
            postOpNotes,
            intraopDocs: {
              ...intraopForm,
              consumablesUsed: consumables,
              equipmentChecklist: equipment,
            },
          }),
        }
      );

      setSurgeryCase(updated);
      setIntraopForm(updated.intraopDocs || {});
      setAnaesthesiaNotes(updated.anesthesiaNotes || '');
      setPostOpNotes(updated.postOpNotes || '');
    } catch (error: any) {
      setActionError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 text-[#1b7b68] animate-spin" />
          <p className="text-xs font-semibold text-slate-400">
            Loading surgical case...
          </p>
        </div>
      </div>
    );
  }

  if (!surgeryCase) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/hms/surgery')}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#1b7b68] mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Surgery
          </button>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 text-center">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
            <h2 className="text-sm font-extrabold text-slate-800">
              Surgical case not found
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {actionError || 'Unable to load this surgical case.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const status =
    statusConfig[surgeryCase.status] ||
    statusConfig[SurgeryStatus.SCHEDULED];

  const urgency =
    urgencyConfig[surgeryCase.urgency] ||
    urgencyConfig[UrgencyLevel.ELECTIVE];

  const whoCompleted = [
    surgeryCase.whoChecklist?.signIn?.completed,
    surgeryCase.whoChecklist?.timeOut?.completed,
    surgeryCase.whoChecklist?.signOut?.completed,
  ].filter(Boolean).length;

  const readinessItems = [
    {
      label: 'Pre-operative assessment',
      complete:
        surgeryCase.preOpAssessment?.clearedForSurgery === true,
    },
    {
      label: 'Surgical consent',
      complete:
        surgeryCase.consent?.procedureConsent === true &&
        surgeryCase.consent?.anesthesiaConsent === true &&
        surgeryCase.consent?.signedByPatient === true,
    },
    {
      label: 'WHO Sign In',
      complete:
        surgeryCase.whoChecklist?.signIn?.completed === true,
    },
    {
      label: 'WHO Time Out',
      complete:
        surgeryCase.whoChecklist?.timeOut?.completed === true,
    },
    {
      label: 'Equipment checklist',
      complete:
        !!surgeryCase.equipmentChecklist?.length,
    },
  ];

  const formatDate = (value?: string) =>
    value
      ? new Date(value).toLocaleDateString([], {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '--';

  const formatTime = (value?: string) =>
    value
      ? new Date(value).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '--';

  const getDuration = () => {
    const start = new Date(surgeryCase.scheduledStartTime).getTime();
    const end = new Date(surgeryCase.scheduledEndTime).getTime();

    const minutes = Math.round((end - start) / 60000);

    if (!Number.isFinite(minutes) || minutes <= 0) return '--';

    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;

    return hours
      ? `${hours}h ${remaining ? `${remaining}m` : ''}`
      : `${remaining} min`;
  };

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-800 p-6">
      <div className="max-w-[1500px] mx-auto space-y-5">
        {actionError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="ml-auto p-1 rounded-lg hover:bg-rose-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/hms/surgery')}
            className="w-10 h-10 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-500 hover:text-[#1b7b68] hover:bg-[#e8f5f3]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Operating Theatre
            </p>

            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-xl font-extrabold">
                Surgical Case
              </h1>

              <span className="bg-[#e8f5f3] text-[#1b7b68] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                Case Details
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                  patientName
                )}`}
                alt={patientName}
                className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200/60"
              />

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-extrabold">
                    {surgeryCase.procedureName}
                  </h2>

                  <span
                    className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase ${urgency.className}`}
                  >
                    {urgency.label}
                  </span>

                  <span
                    className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-600">
                    {patientName}
                  </span>

                  <span>
                    MRN:{' '}
                    <span className="font-mono">
                      {patient?.mrn || 'N/A'}
                    </span>
                  </span>

                  <span>
                    Case ID:{' '}
                    <span className="font-mono">
                      {surgeryCase._id}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {surgeryCase.status !== SurgeryStatus.IN_PROGRESS &&
                surgeryCase.status !== SurgeryStatus.COMPLETED &&
                surgeryCase.status !== SurgeryStatus.CANCELLED && (
                  <button
                    disabled={actionLoading}
                    onClick={startSurgery}
                    className="px-4 py-2.5 bg-[#1b7b68] hover:bg-[#145f50] disabled:opacity-50 text-white text-xs font-bold rounded-2xl flex items-center gap-2"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Activity className="w-4 h-4" />
                    )}
                    Start Surgery
                  </button>
                )}

              {surgeryCase.status === SurgeryStatus.IN_PROGRESS && (
                <button
                  disabled={actionLoading}
                  onClick={completeSurgery}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-2xl flex items-center gap-2"
                >
                  {actionLoading && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Complete Surgery
                </button>
              )}

              {surgeryCase.status !== SurgeryStatus.COMPLETED &&
                surgeryCase.status !== SurgeryStatus.CANCELLED && (
                  <button
                    disabled={actionLoading}
                    onClick={cancelCase}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-2xl flex items-center gap-2"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Cancel Case
                  </button>
                )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
          <InfoCard
            icon={<Hospital className="w-4 h-4" />}
            label="Theatre"
            value={surgeryCase.theatreId}
          />

          <InfoCard
            icon={<CalendarDays className="w-4 h-4" />}
            label="Date"
            value={formatDate(surgeryCase.scheduledStartTime)}
          />

          <InfoCard
            icon={<Clock3 className="w-4 h-4" />}
            label="Schedule"
            value={`${formatTime(
              surgeryCase.scheduledStartTime
            )} — ${formatTime(surgeryCase.scheduledEndTime)}`}
          />

          <InfoCard
            icon={<Activity className="w-4 h-4" />}
            label="Duration"
            value={getDuration()}
          />

          <InfoCard
            icon={<Stethoscope className="w-4 h-4" />}
            label="Lead Surgeon"
            value={surgeonName}
          />

          <InfoCard
            icon={<Activity className="w-4 h-4" />}
            label="Anaesthesia"
            value={formatLabel(surgeryCase.anesthesiaType)}
          />
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <div className="flex items-center gap-1 p-2 min-w-max border-b border-slate-100 bg-slate-50/30">
              {(
                [
                  ['overview', 'Overview', Hospital],
                  ['pre-op', 'Pre-Op', Activity],
                  ['consent', 'Consent', FileCheck2],
                  ['team', 'Surgical Team', Users],
                  ['who', 'WHO Checklist', CheckCircle2],
                  ['equipment', 'Equipment', Hospital],
                  ['intraoperative', 'Intraoperative', Activity],
                  ['anaesthesia', 'Anaesthesia', Activity],
                  ['post-op', 'Post-Op', CheckCircle2],
                ] as const
              ).map(([tab, label, Icon]) => (
                <TabButton
                  key={tab}
                  active={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  icon={<Icon className="w-3.5 h-3.5" />}
                  label={label}
                />
              ))}
            </div>
          </div>

          <div className="p-5">
            {activeTab === 'overview' && (
              <OverviewTab
                surgeryCase={surgeryCase}
                patient={patient}
                patientName={patientName}
                surgeonName={surgeonName}
                readinessItems={readinessItems}
                whoCompleted={whoCompleted}
              />
            )}

            {activeTab === 'pre-op' && (
              <PreOpTab
                form={preOpForm}
                setForm={setPreOpForm}
                onSave={savePreOp}
                loading={actionLoading}
              />
            )}

            {activeTab === 'consent' && (
              <ConsentTab
                form={consentForm}
                setForm={setConsentForm}
                onSave={saveConsent}
                loading={actionLoading}
              />
            )}

            {activeTab === 'team' && (
              <TeamTab
                team={surgeryCase.surgicalTeam || []}
                staff={staff}
                leadSurgeonId={
                  typeof surgeryCase.leadSurgeonId === 'string'
                    ? surgeryCase.leadSurgeonId
                    : surgeryCase.leadSurgeonId?._id
                }
              />
            )}

            {activeTab === 'who' && (
              <WHOTab
                checklist={surgeryCase.whoChecklist}
                form={whoForm}
                setForm={setWhoForm}
                onSave={saveWHO}
                loading={actionLoading}
              />
            )}

            {activeTab === 'equipment' && (
              <EquipmentTab
                equipment={equipment}
                setEquipment={setEquipment}
                consumables={consumables}
                setConsumables={setConsumables}
                onSave={saveIntraop}
                loading={actionLoading}
              />
            )}

            {activeTab === 'intraoperative' && (
              <IntraoperativeTab
                form={intraopForm}
                setForm={setIntraopForm}
                vitals={surgeryCase.vitalsTimeline || []}
                vitalsForm={vitalsForm}
                setVitalsForm={setVitalsForm}
                onAddVitals={addVitals}
                onSave={saveIntraop}
                loading={actionLoading}
              />
            )}

            {activeTab === 'anaesthesia' && (
              <AnaesthesiaTab
                notes={anaesthesiaNotes}
                setNotes={setAnaesthesiaNotes}
                vitals={surgeryCase.vitalsTimeline || []}
                anesthesiaType={surgeryCase.anesthesiaType}
              />
            )}

            {activeTab === 'post-op' && (
              <PostOpTab
                notes={postOpNotes}
                setNotes={setPostOpNotes}
                surgeryCase={surgeryCase}
                onComplete={completeSurgery}
                loading={actionLoading}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({
  surgeryCase,
  patient,
  patientName,
  surgeonName,
  readinessItems,
  whoCompleted,
}: {
  surgeryCase: SurgeryCase;
  patient?: Patient;
  patientName: string;
  surgeonName: string;
  readinessItems: { label: string; complete: boolean }[];
  whoCompleted: number;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-extrabold">Case Overview</h2>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Clinical and operational summary for this surgical case.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SectionCard
          title="Patient Information"
          icon={<UserRound className="w-4 h-4" />}
        >
          <div className="grid grid-cols-2 gap-4">
            <DetailItem label="Patient" value={patientName} />
            <DetailItem
              label="MRN"
              value={patient?.mrn || 'N/A'}
              mono
            />
            <DetailItem
              label="Gender"
              value={patient?.gender || 'N/A'}
            />
            <DetailItem
              label="Date of Birth"
              value={
                patient?.dateOfBirth
                  ? new Date(
                      patient.dateOfBirth
                    ).toLocaleDateString()
                  : 'N/A'
              }
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Surgical Information"
          icon={<Stethoscope className="w-4 h-4" />}
        >
          <div className="grid grid-cols-2 gap-4">
            <DetailItem
              label="Procedure"
              value={surgeryCase.procedureName}
            />
            <DetailItem
              label="ICD Code"
              value={surgeryCase.icdCode || 'N/A'}
            />
            <DetailItem
              label="Lead Surgeon"
              value={surgeonName}
            />
            <DetailItem
              label="Anaesthesia"
              value={formatLabel(surgeryCase.anesthesiaType)}
            />
            <DetailItem
              label="Theatre"
              value={surgeryCase.theatreId}
            />
            <DetailItem
              label="Urgency"
              value={formatLabel(surgeryCase.urgency)}
            />
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SectionCard
          title="Case Readiness"
          subtitle="Pre-operative requirements"
          icon={<CheckCircle2 className="w-4 h-4" />}
        >
          <div className="space-y-2">
            {readinessItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/40"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                      item.complete
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {item.complete ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Clock3 className="w-3.5 h-3.5" />
                    )}
                  </div>

                  <span className="text-xs font-semibold text-slate-700">
                    {item.label}
                  </span>
                </div>

                <span
                  className={`text-[10px] font-bold ${
                    item.complete
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                  }`}
                >
                  {item.complete ? 'Complete' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="WHO Surgical Safety Checklist"
          subtitle={`${whoCompleted}/3 stages completed`}
          icon={<ShieldAlert className="w-4 h-4" />}
        >
          <div className="grid grid-cols-3 gap-3">
            <ChecklistStage
              label="Sign In"
              completed={
                surgeryCase.whoChecklist?.signIn?.completed
              }
            />
            <ChecklistStage
              label="Time Out"
              completed={
                surgeryCase.whoChecklist?.timeOut?.completed
              }
            />
            <ChecklistStage
              label="Sign Out"
              completed={
                surgeryCase.whoChecklist?.signOut?.completed
              }
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function PreOpTab({
  form,
  setForm,
  onSave,
  loading,
}: {
  form: PreOpAssessment;
  setForm: React.Dispatch<React.SetStateAction<PreOpAssessment>>;
  onSave: () => void;
  loading: boolean;
}) {
  return (
    <FormSection
      title="Pre-Operative Assessment"
      description="Complete surgical and anaesthetic readiness assessment."
      onSave={onSave}
      loading={loading}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="ASA Classification">
          <select
            value={form.asaClassification || ''}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                asaClassification: e.target.value,
              }))
            }
            className={inputClass}
          >
            <option value="">Select ASA</option>
            {['ASA_1', 'ASA_2', 'ASA_3', 'ASA_4', 'ASA_5', 'ASA_6', 'ASA_E'].map(
              (x) => (
                <option key={x} value={x}>
                  {formatLabel(x)}
                </option>
              )
            )}
          </select>
        </Field>

        <Field label="Mallampati Score">
          <select
            value={form.mallampatiScore || ''}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                mallampatiScore: e.target.value,
              }))
            }
            className={inputClass}
          >
            <option value="">Select Class</option>
            <option value="CLASS_I">Class I</option>
            <option value="CLASS_II">Class II</option>
            <option value="CLASS_III">Class III</option>
            <option value="CLASS_IV">Class IV</option>
          </select>
        </Field>

        <Field label="VTE Risk Score">
          <input
            value={form.vteRiskScore || ''}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                vteRiskScore: e.target.value,
              }))
            }
            className={inputClass}
          />
        </Field>

        <Field label="Pregnancy Status">
          <select
            value={form.pregnancyStatus || 'NOT_APPLICABLE'}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                pregnancyStatus: e.target.value,
              }))
            }
            className={inputClass}
          >
            <option value="NOT_APPLICABLE">Not Applicable</option>
            <option value="NEGATIVE">Negative</option>
            <option value="POSITIVE">Positive</option>
          </select>
        </Field>

        <Field label="Pre-Op Systolic BP">
          <input
            type="number"
            value={form.preOpVitals?.bpSystolic ?? ''}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                preOpVitals: {
                  ...p.preOpVitals,
                  bpSystolic: Number(e.target.value),
                },
              }))
            }
            className={inputClass}
          />
        </Field>

        <Field label="Pre-Op Diastolic BP">
          <input
            type="number"
            value={form.preOpVitals?.bpDiastolic ?? ''}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                preOpVitals: {
                  ...p.preOpVitals,
                  bpDiastolic: Number(e.target.value),
                },
              }))
            }
            className={inputClass}
          />
        </Field>

        <Field label="Heart Rate">
          <input
            type="number"
            value={form.preOpVitals?.heartRate ?? ''}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                preOpVitals: {
                  ...p.preOpVitals,
                  heartRate: Number(e.target.value),
                },
              }))
            }
            className={inputClass}
          />
        </Field>

        <Field label="Temperature °C">
          <input
            type="number"
            step="0.1"
            value={form.preOpVitals?.tempCelsius ?? ''}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                preOpVitals: {
                  ...p.preOpVitals,
                  tempCelsius: Number(e.target.value),
                },
              }))
            }
            className={inputClass}
          />
        </Field>

        <Field label="SpO₂ %">
          <input
            type="number"
            value={form.preOpVitals?.spO2 ?? ''}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                preOpVitals: {
                  ...p.preOpVitals,
                  spO2: Number(e.target.value),
                },
              }))
            }
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Infection Screening Notes">
        <textarea
          rows={3}
          value={form.infectionScreeningNotes || ''}
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              infectionScreeningNotes: e.target.value,
            }))
          }
          className={inputClass}
        />
      </Field>

      <label className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
        <input
          type="checkbox"
          checked={form.clearedForSurgery === true}
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              clearedForSurgery: e.target.checked,
            }))
          }
          className="accent-[#1b7b68]"
        />
        <span className="text-xs font-bold text-emerald-700">
          Patient cleared for surgery
        </span>
      </label>
    </FormSection>
  );
}

function ConsentTab({
  form,
  setForm,
  onSave,
  loading,
}: {
  form: Consent;
  setForm: React.Dispatch<React.SetStateAction<Consent>>;
  onSave: () => void;
  loading: boolean;
}) {
  const toggle = (key: keyof Consent) =>
    setForm((p) => ({
      ...p,
      [key]: !p[key],
    }));

  return (
    <FormSection
      title="Digital Surgical Consent"
      description="Record required surgical and anaesthetic consents."
      onSave={onSave}
      loading={loading}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          ['procedureConsent', 'Procedure Consent'],
          ['anesthesiaConsent', 'Anaesthesia Consent'],
          ['bloodTransfusionConsent', 'Blood Transfusion Consent'],
          ['highRiskConsent', 'High-Risk Procedure Consent'],
          ['signedByPatient', 'Signed By Patient'],
        ].map(([key, label]) => (
          <label
            key={key}
            className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50"
          >
            <span className="text-xs font-bold text-slate-700">
              {label}
            </span>

            <input
              type="checkbox"
              checked={Boolean(form[key as keyof Consent])}
              onChange={() => toggle(key as keyof Consent)}
              className="w-4 h-4 accent-[#1b7b68]"
            />
          </label>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Witness Name">
          <input
            value={form.witnessName || ''}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                witnessName: e.target.value,
              }))
            }
            className={inputClass}
          />
        </Field>

        <Field label="Digital Signature URL">
          <input
            value={form.digitalSignatureUrl || ''}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                digitalSignatureUrl: e.target.value,
              }))
            }
            className={inputClass}
          />
        </Field>
      </div>
    </FormSection>
  );
}

function TeamTab({
  team,
  staff,
  leadSurgeonId,
}: {
  team: SurgicalTeamMember[];
  staff: Staff[];
  leadSurgeonId?: string;
}) {
  return (
    <SectionCard
      title="Surgical Team"
      subtitle={`${team.length} team member${team.length === 1 ? '' : 's'} assigned`}
      icon={<Users className="w-4 h-4" />}
    >
      {team.length ? (
        <div className="space-y-3">
          <div className="p-3 rounded-2xl bg-[#e8f5f3]/60 border border-[#1b7b68]/10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#1b7b68]">
              Team Assignment
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              The team below was assigned when this surgical case was scheduled.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {team.map((member, index) => {
              const resolvedStaff =
                typeof member.userId === 'object'
                  ? member.userId
                  : staff.find((person) => person._id === member.userId);

              const name = resolvedStaff
                ? `${resolvedStaff.firstName || ''} ${resolvedStaff.lastName || ''}`.trim() || 'Assigned Staff'
                : 'Assigned Staff';

              const isLead =
                member.role === SurgicalRole.PRIMARY_SURGEON ||
                (!!leadSurgeonId &&
                  typeof member.userId === 'string' &&
                  member.userId === leadSurgeonId);

              return (
                <div
                  key={`${member.userId}-${member.role}-${index}`}
                  className={`flex items-center gap-3 p-4 rounded-2xl border ${
                    isLead
                      ? 'border-[#1b7b68]/20 bg-[#e8f5f3]/40'
                      : 'border-slate-100 bg-slate-50/50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#e8f5f3] text-[#1b7b68] flex items-center justify-center shrink-0">
                    <UserRound className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-700 truncate">
                        {name}
                      </p>

                      {isLead && (
                        <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-[#1b7b68] text-white">
                          Lead
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-400 mt-1">
                      {roleLabels[member.role] || formatLabel(member.role)}
                      {resolvedStaff?.department ? ` • ${resolvedStaff.department}` : ''}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 text-[9px] font-bold px-2 py-1 rounded-lg ${
                      member.credentialVerified
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {member.credentialVerified
                      ? 'Verified'
                      : 'Unverified'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState text="No surgical team members assigned." />
      )}
    </SectionCard>
  );
}

function WHOTab({
  checklist,
  form,
  setForm,
  onSave,
  loading,
}: {
  checklist?: SurgeryCase['whoChecklist'];
  form: Record<string, any>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  onSave: (stage: 'signIn' | 'timeOut' | 'signOut') => void;
  loading: boolean;
}) {
  const [stage, setStage] =
    useState<'signIn' | 'timeOut' | 'signOut'>('signIn');

  const current =
    checklist?.[stage]?.completed === true;

  const fields: Record<string, string[]> = {
    signIn: [
      'patientIdentityConfirmed',
      'siteMarked',
      'consentVerified',
      'pulseOximeterOn',
      'allergyKnown',
      'airwayRisk',
      'bloodLossRiskOver500ml',
    ],
    timeOut: [
      'teamIntroduced',
      'confirmPatientSiteProcedure',
      'antibioticProphylaxisGiven',
      'imagingDisplayed',
    ],
    signOut: [
      'countsCorrect',
      'specimenLabeled',
    ],
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(['signIn', 'timeOut', 'signOut'] as const).map((item) => (
          <button
            key={item}
            onClick={() => setStage(item)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold ${
              stage === item
                ? 'bg-[#1b7b68] text-white'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {formatLabel(item)}
          </button>
        ))}
      </div>

      <SectionCard
        title={`${formatLabel(stage)} Checklist`}
        subtitle={
          current ? 'This stage has been completed.' : 'Complete all applicable checks.'
        }
        icon={<ShieldAlert className="w-4 h-4" />}
      >
        <div className="grid md:grid-cols-2 gap-3">
          {fields[stage].map((field) => (
            <label
              key={field}
              className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50"
            >
              <span className="text-xs font-semibold text-slate-700">
                {formatLabel(field)}
              </span>

              <input
                type="checkbox"
                checked={Boolean(form[field])}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    [field]: e.target.checked,
                  }))
                }
                className="w-4 h-4 accent-[#1b7b68]"
              />
            </label>
          ))}
        </div>

        {stage === 'signIn' && (
          <Field label="Additional Notes">
            <textarea
              rows={3}
              value={form.notes || ''}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  notes: e.target.value,
                }))
              }
              className={inputClass}
            />
          </Field>
        )}

        {stage === 'timeOut' && (
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Surgeon's Critical Concerns">
              <textarea
                rows={3}
                value={form.criticalConcernsSurgeon || ''}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    criticalConcernsSurgeon: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </Field>

            <Field label="Anaesthetist's Critical Concerns">
              <textarea
                rows={3}
                value={form.criticalConcernsAnaesthetist || ''}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    criticalConcernsAnaesthetist: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </Field>

            <Field label="Nursing Critical Concerns">
              <textarea
                rows={3}
                value={form.criticalConcernsNursing || ''}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    criticalConcernsNursing: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </Field>
          </div>
        )}

        {stage === 'signOut' && (
          <div className="space-y-4">
            <Field label="Procedure Performed">
              <input
                value={form.procedureRecorded || ''}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    procedureRecorded: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </Field>

            <Field label="Equipment Issues">
              <textarea
                rows={3}
                value={form.equipmentIssuesNoted || ''}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    equipmentIssuesNoted: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </Field>

            <Field label="Post-Operative Recovery Plan">
              <textarea
                rows={3}
                value={form.postOpRecoveryPlan || ''}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    postOpRecoveryPlan: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </Field>
          </div>
        )}

        <div className="flex justify-end pt-3">
          <button
            disabled={loading}
            onClick={() => onSave(stage)}
            className="px-5 py-2.5 bg-[#1b7b68] text-white rounded-xl text-xs font-bold disabled:opacity-50"
          >
            {loading ? 'Saving...' : `Complete ${formatLabel(stage)}`}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

function EquipmentTab({
  equipment,
  setEquipment,
  consumables,
  setConsumables,
  onSave,
  loading,
}: {
  equipment: EquipmentItem[];
  setEquipment: React.Dispatch<React.SetStateAction<EquipmentItem[]>>;
  consumables: ConsumableItem[];
  setConsumables: React.Dispatch<React.SetStateAction<ConsumableItem[]>>;
  onSave: () => void;
  loading: boolean;
}) {
  const addEquipment = () =>
    setEquipment((p) => [
      ...p,
      {
        itemName: '',
        sterileStatus: 'STERILE',
        maintenanceOk: true,
        notes: '',
      },
    ]);

  const addConsumable = () =>
    setConsumables((p) => [
      ...p,
      {
        itemName: '',
        quantityUsed: 1,
        unitCost: 0,
        lotNumber: '',
      },
    ]);

  return (
    <div className="space-y-5">
      <SectionCard
        title="Equipment & Instruments"
        icon={<Hospital className="w-4 h-4" />}
      >
        <div className="space-y-3">
          {equipment.map((item, index) => (
            <div
              key={index}
              className="grid md:grid-cols-4 gap-3 p-3 rounded-2xl bg-slate-50/60 border border-slate-100"
            >
              <input
                placeholder="Equipment name"
                value={item.itemName}
                onChange={(e) =>
                  setEquipment((p) =>
                    p.map((x, i) =>
                      i === index
                        ? { ...x, itemName: e.target.value }
                        : x
                    )
                  )
                }
                className={inputClass}
              />

              <select
                value={item.sterileStatus}
                onChange={(e) =>
                  setEquipment((p) =>
                    p.map((x, i) =>
                      i === index
                        ? { ...x, sterileStatus: e.target.value }
                        : x
                    )
                  )
                }
                className={inputClass}
              >
                <option value="STERILE">Sterile</option>
                <option value="PENDING">Pending</option>
                <option value="EXPIRED">Expired</option>
              </select>

              <label className="flex items-center gap-2 px-3">
                <input
                  type="checkbox"
                  checked={item.maintenanceOk}
                  onChange={(e) =>
                    setEquipment((p) =>
                      p.map((x, i) =>
                        i === index
                          ? {
                              ...x,
                              maintenanceOk: e.target.checked,
                            }
                          : x
                      )
                    )
                  }
                  className="accent-[#1b7b68]"
                />
                <span className="text-xs font-semibold">
                  Maintenance OK
                </span>
              </label>

              <input
                placeholder="Notes"
                value={item.notes || ''}
                onChange={(e) =>
                  setEquipment((p) =>
                    p.map((x, i) =>
                      i === index
                        ? { ...x, notes: e.target.value }
                        : x
                    )
                  )
                }
                className={inputClass}
              />
            </div>
          ))}

          <button
            onClick={addEquipment}
            className="flex items-center gap-2 text-xs font-bold text-[#1b7b68]"
          >
            <Plus className="w-4 h-4" />
            Add Equipment
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Consumables"
        icon={<Plus className="w-4 h-4" />}
      >
        <div className="space-y-3">
          {consumables.map((item, index) => (
            <div
              key={index}
              className="grid md:grid-cols-4 gap-3 p-3 rounded-2xl bg-slate-50/60 border border-slate-100"
            >
              <input
                placeholder="Item name"
                value={item.itemName}
                onChange={(e) =>
                  setConsumables((p) =>
                    p.map((x, i) =>
                      i === index
                        ? { ...x, itemName: e.target.value }
                        : x
                    )
                  )
                }
                className={inputClass}
              />

              <input
                type="number"
                placeholder="Quantity"
                value={item.quantityUsed}
                onChange={(e) =>
                  setConsumables((p) =>
                    p.map((x, i) =>
                      i === index
                        ? {
                            ...x,
                            quantityUsed: Number(e.target.value),
                          }
                        : x
                    )
                  )
                }
                className={inputClass}
              />

              <input
                type="number"
                placeholder="Unit cost"
                value={item.unitCost || ''}
                onChange={(e) =>
                  setConsumables((p) =>
                    p.map((x, i) =>
                      i === index
                        ? {
                            ...x,
                            unitCost: Number(e.target.value),
                          }
                        : x
                    )
                  )
                }
                className={inputClass}
              />

              <input
                placeholder="Lot number"
                value={item.lotNumber || ''}
                onChange={(e) =>
                  setConsumables((p) =>
                    p.map((x, i) =>
                      i === index
                        ? { ...x, lotNumber: e.target.value }
                        : x
                    )
                  )
                }
                className={inputClass}
              />
            </div>
          ))}

          <button
            onClick={addConsumable}
            className="flex items-center gap-2 text-xs font-bold text-[#1b7b68]"
          >
            <Plus className="w-4 h-4" />
            Add Consumable
          </button>
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={loading}
          className="px-5 py-2.5 bg-[#1b7b68] text-white rounded-xl text-xs font-bold disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Equipment & Consumables'}
        </button>
      </div>
    </div>
  );
}

function IntraoperativeTab({
  form,
  setForm,
  vitals,
  vitalsForm,
  setVitalsForm,
  onAddVitals,
  onSave,
  loading,
}: {
  form: IntraopDocs;
  setForm: React.Dispatch<React.SetStateAction<IntraopDocs>>;
  vitals: VitalsLog[];
  vitalsForm: VitalsFormState;
  setVitalsForm: React.Dispatch<
    React.SetStateAction<VitalsFormState>
  >;
  onAddVitals: () => void;
  onSave: () => void;
  loading: boolean;
}) {
  const update = (key: keyof IntraopDocs, value: any) =>
    setForm((p) => ({
      ...p,
      [key]: value,
    }));

  return (
    <div className="space-y-5">
      <SectionCard
        title="Intraoperative Documentation"
        icon={<Activity className="w-4 h-4" />}
      >
        <div className="grid md:grid-cols-2 gap-4">
          {[
            ['operativeDiagnosis', 'Operative Diagnosis'],
            ['postOperativeDiagnosis', 'Post-Operative Diagnosis'],
            ['surgicalFindings', 'Surgical Findings'],
            ['techniqueNotes', 'Operative Technique'],
            ['bloodProductsAdministered', 'Blood Products'],
            ['drainsInserted', 'Drains Inserted'],
            ['implantsUsed', 'Implants Used'],
            ['specimensCollected', 'Specimens Collected'],
            ['complications', 'Complications'],
          ].map(([key, label]) => (
            <Field key={key} label={label}>
              <textarea
                rows={3}
                value={(form as any)[key] || ''}
                onChange={(e) => update(key as keyof IntraopDocs, e.target.value)}
                className={inputClass}
              />
            </Field>
          ))}

          <Field label="Estimated Blood Loss (mL)">
            <input
              type="number"
              value={form.eblMl ?? ''}
              onChange={(e) =>
                update('eblMl', Number(e.target.value))
              }
              className={inputClass}
            />
          </Field>

          <Field label="Fluids Administered (mL)">
            <input
              type="number"
              value={form.fluidsAdministeredMl ?? ''}
              onChange={(e) =>
                update(
                  'fluidsAdministeredMl',
                  Number(e.target.value)
                )
              }
              className={inputClass}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Intraoperative Monitoring"
        subtitle="Time-series vital signs"
        icon={<Activity className="w-4 h-4" />}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ['bpSystolic', 'SBP'],
            ['bpDiastolic', 'DBP'],
            ['heartRate', 'HR'],
            ['spO2', 'SpO₂'],
            ['respRate', 'RR'],
            ['tempCelsius', 'Temp °C'],
            ['etCO2', 'EtCO₂'],
          ].map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                type="number"
                value={vitalsForm[key] || ''}
                onChange={(e) =>
                  setVitalsForm((p) => ({
                    ...p,
                    [key]: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </Field>
          ))}

          <Field label="ECG Rhythm">
            <input
              value={vitalsForm.ecgRhythm || ''}
              onChange={(e) =>
                setVitalsForm((p) => ({
                  ...p,
                  ecgRhythm: e.target.value,
                }))
              }
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Monitoring Note">
          <input
            value={vitalsForm.notes || ''}
            onChange={(e) =>
              setVitalsForm((p) => ({
                ...p,
                notes: e.target.value,
              }))
            }
            className={inputClass}
          />
        </Field>

        <div className="flex justify-end">
          <button
            onClick={onAddVitals}
            disabled={loading}
            className="px-4 py-2.5 bg-[#1b7b68] text-white rounded-xl text-xs font-bold"
          >
            Add Monitoring Reading
          </button>
        </div>

        <div className="overflow-x-auto mt-5">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase text-slate-400">
                <th className="p-3 text-left">Time</th>
                <th className="p-3 text-left">BP</th>
                <th className="p-3 text-left">HR</th>
                <th className="p-3 text-left">SpO₂</th>
                <th className="p-3 text-left">RR</th>
                <th className="p-3 text-left">Temp</th>
                <th className="p-3 text-left">EtCO₂</th>
                <th className="p-3 text-left">ECG</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {vitals
                .slice()
                .reverse()
                .map((vital, index) => (
                  <tr key={index}>
                    <td className="p-3">
                      {new Date(vital.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-3">
                      {vital.bpSystolic ?? '--'}/
                      {vital.bpDiastolic ?? '--'}
                    </td>
                    <td className="p-3">
                      {vital.heartRate ?? '--'}
                    </td>
                    <td className="p-3">
                      {vital.spO2 ?? '--'}%
                    </td>
                    <td className="p-3">
                      {vital.respRate ?? '--'}
                    </td>
                    <td className="p-3">
                      {vital.tempCelsius ?? '--'}
                    </td>
                    <td className="p-3">
                      {vital.etCO2 ?? '--'}
                    </td>
                    <td className="p-3">
                      {vital.ecgRhythm || '--'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={onSave}
            disabled={loading}
            className="px-5 py-2.5 bg-[#1b7b68] text-white rounded-xl text-xs font-bold"
          >
            {loading ? 'Saving...' : 'Save Operative Documentation'}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

function AnaesthesiaTab({
  notes,
  setNotes,
  vitals,
  anesthesiaType,
}: {
  notes: string;
  setNotes: React.Dispatch<React.SetStateAction<string>>;
  vitals: VitalsLog[];
  anesthesiaType: AnesthesiaType;
}) {
  return (
    <div className="space-y-5">
      <SectionCard
        title="Anaesthesia Management"
        icon={<Activity className="w-4 h-4" />}
      >
        <div className="grid md:grid-cols-3 gap-4">
          <DetailItem
            label="Anaesthesia Type"
            value={formatLabel(anesthesiaType)}
          />

          <DetailItem
            label="Monitoring Readings"
            value={`${vitals.length} recorded`}
          />

          <DetailItem
            label="Latest Reading"
            value={
              vitals.length
                ? new Date(
                    vitals[vitals.length - 1].timestamp
                  ).toLocaleTimeString()
                : 'No readings'
            }
          />
        </div>

        <Field label="Anaesthesia Record / Notes">
          <textarea
            rows={8}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
            placeholder="Record anaesthetic drugs, airway management, monitoring events, complications, fluid balance and other anaesthesia notes..."
          />
        </Field>

        <p className="text-[10px] text-slate-400">
          Anaesthesia notes are saved when the surgical case is completed.
        </p>
      </SectionCard>

      <SectionCard
        title="Monitoring Timeline"
        icon={<Activity className="w-4 h-4" />}
      >
        {vitals.length ? (
          <div className="space-y-2">
            {vitals
              .slice()
              .reverse()
              .map((vital, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50/60 border border-slate-100"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#e8f5f3] text-[#1b7b68] flex items-center justify-center">
                    <Clock3 className="w-4 h-4" />
                  </div>

                  <div className="text-xs">
                    <p className="font-bold text-slate-700">
                      {new Date(
                        vital.timestamp
                      ).toLocaleTimeString()}
                    </p>

                    <p className="text-[10px] text-slate-400 mt-1">
                      BP {vital.bpSystolic ?? '--'}/
                      {vital.bpDiastolic ?? '--'} • HR{' '}
                      {vital.heartRate ?? '--'} • SpO₂{' '}
                      {vital.spO2 ?? '--'}% • RR{' '}
                      {vital.respRate ?? '--'}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <EmptyState text="No intraoperative monitoring readings recorded." />
        )}
      </SectionCard>
    </div>
  );
}

function PostOpTab({
  notes,
  setNotes,
  surgeryCase,
  onComplete,
  loading,
}: {
  notes: string;
  setNotes: React.Dispatch<React.SetStateAction<string>>;
  surgeryCase: SurgeryCase;
  onComplete: () => void;
  loading: boolean;
}) {
  return (
    <SectionCard
      title="Post-Operative Record"
      subtitle="Recovery planning and final surgical documentation."
      icon={<CheckCircle2 className="w-4 h-4" />}
    >
      <div className="grid md:grid-cols-3 gap-4">
        <DetailItem
          label="Procedure"
          value={surgeryCase.procedureName}
        />

        <DetailItem
          label="Actual Start"
          value={
            surgeryCase.actualStartTime
              ? new Date(
                  surgeryCase.actualStartTime
                ).toLocaleString()
              : 'Not started'
          }
        />

        <DetailItem
          label="Actual End"
          value={
            surgeryCase.actualEndTime
              ? new Date(
                  surgeryCase.actualEndTime
                ).toLocaleString()
              : 'Not completed'
          }
        />
      </div>

      <Field label="Post-Operative Notes">
        <textarea
          rows={10}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputClass}
          placeholder="Record post-operative findings, recovery plan, drains, complications, instructions and follow-up..."
        />
      </Field>

      {surgeryCase.status === SurgeryStatus.IN_PROGRESS && (
        <div className="flex justify-end">
          <button
            disabled={loading}
            onClick={onComplete}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
          >
            {loading ? 'Completing...' : 'Complete Surgical Case'}
          </button>
        </div>
      )}

      {surgeryCase.cancellationReason && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
          <p className="text-xs font-bold text-rose-700">
            Cancellation Reason
          </p>
          <p className="text-xs text-rose-600 mt-2">
            {surgeryCase.cancellationReason}
          </p>
        </div>
      )}
    </SectionCard>
  );
}

function FormSection({
  title,
  description,
  children,
  onSave,
  loading,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onSave: () => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-extrabold text-slate-800">
          {title}
        </h2>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {description}
        </p>
      </div>

      <div className="space-y-4">{children}</div>

      <div className="flex justify-end pt-3 border-t border-slate-100">
        <button
          disabled={loading}
          onClick={onSave}
          className="px-5 py-2.5 bg-[#1b7b68] text-white rounded-xl text-xs font-bold disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function SectionCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100">
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#e8f5f3] text-[#1b7b68] flex items-center justify-center">
            {icon}
          </div>

          <div>
            <h3 className="text-sm font-extrabold text-slate-800">
              {title}
            </h3>

            {subtitle && (
              <p className="text-[10px] text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="p-5">{children}</div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p
        className={`text-xs font-bold text-slate-700 mt-1 ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-xl bg-[#e8f5f3] text-[#1b7b68] flex items-center justify-center">
          {icon}
        </div>

        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </span>
      </div>

      <p className="text-xs font-extrabold text-slate-700 truncate">
        {value}
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2.5 rounded-xl text-[11px] font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
        active
          ? 'bg-[#1b7b68] text-white shadow-sm'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ChecklistStage({
  label,
  completed,
}: {
  label: string;
  completed?: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-2xl border text-center ${
        completed
          ? 'border-emerald-100 bg-emerald-50/60'
          : 'border-slate-100 bg-slate-50/50'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-xl mx-auto flex items-center justify-center ${
          completed
            ? 'bg-emerald-100 text-emerald-600'
            : 'bg-slate-100 text-slate-400'
        }`}
      >
        {completed ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <Clock3 className="w-4 h-4" />
        )}
      </div>

      <p className="text-[10px] font-bold text-slate-700 mt-2">
        {label}
      </p>

      <p
        className={`text-[9px] font-bold uppercase mt-0.5 ${
          completed ? 'text-emerald-600' : 'text-slate-400'
        }`}
      >
        {completed ? 'Complete' : 'Pending'}
      </p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-10 text-center">
      <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-300 mx-auto flex items-center justify-center">
        <Users className="w-5 h-5" />
      </div>

      <p className="text-xs font-semibold text-slate-500 mt-3">
        {text}
      </p>
    </div>
  );
}

function formatLabel(value?: string) {
  if (!value) return 'N/A';

  return value
    .toLowerCase()
    .split('_')
    .map(
      (word) => word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(' ');
}
