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
  ShieldAlert,
  Stethoscope,
  UserRound,
  Users,
  X,
} from 'lucide-react';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://medxverse-backend.onrender.com';

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

interface WHOStage {
  completed?: boolean;
  completedAt?: string;
  completedBy?: Staff | string;
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
  whoChecklist?: {
    signIn?: WHOStage;
    timeOut?: WHOStage;
    signOut?: WHOStage;
  };
  equipmentChecklist?: unknown[];
  consumablesUsed?: unknown[];
  vitalsTimeline?: unknown[];
  intraopDocs?: {
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
  };
  anesthesiaNotes?: string;
  postOpNotes?: string;
  cancellationReason?: string;
  createdAt?: string;
  updatedAt?: string;
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

export default function SurgeryCaseDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const caseId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [surgeryCase, setSurgeryCase] = useState<SurgeryCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCase = useCallback(async () => {
    if (!caseId) return;

    setLoading(true);
    setActionError(null);

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(
        `${API_BASE_URL}/api/v1/surgery/${caseId}`,
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

      setSurgeryCase(json?.data || json);
    } catch (error: any) {
      console.error('Failed to fetch surgical case:', error);
      setActionError(
        error?.message || 'Unable to load surgical case.'
      );
      setSurgeryCase(null);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

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
    ? `${patient.firstName || 'Unknown'} ${
        patient.lastName || 'Patient'
      }`
    : 'Patient';

  const surgeonName = leadSurgeon
    ? `Dr. ${leadSurgeon.firstName || ''} ${
        leadSurgeon.lastName || ''
      }`.trim()
    : 'Assigned Surgeon';

  const formatDate = (value?: string) => {
    if (!value) return '--';

    return new Date(value).toLocaleDateString([], {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (value?: string) => {
    if (!value) return '--';

    return new Date(value).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDuration = () => {
    if (!surgeryCase) return '--';

    const start = new Date(
      surgeryCase.scheduledStartTime
    ).getTime();

    const end = new Date(
      surgeryCase.scheduledEndTime
    ).getTime();

    const minutes = Math.round((end - start) / 60000);

    if (!Number.isFinite(minutes) || minutes <= 0) {
      return '--';
    }

    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;

    if (hours === 0) return `${remaining} min`;

    return `${hours}h ${remaining > 0 ? `${remaining}m` : ''}`;
  };

  const handleStartSurgery = async () => {
    if (!surgeryCase) return;

    setActionLoading(true);
    setActionError(null);

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(
        `${API_BASE_URL}/api/v1/surgery/${surgeryCase._id}/start`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          json?.message || 'Unable to start surgery.'
        );
      }

      setSurgeryCase(json?.data || json);
    } catch (error: any) {
      setActionError(
        error?.message || 'Unable to start surgery.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelCase = async () => {
    if (!surgeryCase) return;

    const reason = window.prompt(
      'Enter the reason for cancelling this surgical case:'
    );

    if (!reason?.trim()) return;

    setActionLoading(true);
    setActionError(null);

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(
        `${API_BASE_URL}/api/v1/surgery/${surgeryCase._id}/cancel`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            cancellationReason: reason.trim(),
          }),
        }
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          json?.message || 'Unable to cancel surgical case.'
        );
      }

      setSurgeryCase(json?.data || json);
    } catch (error: any) {
      setActionError(
        error?.message || 'Unable to cancel surgical case.'
      );
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
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#1b7b68] transition-all mb-6"
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

  const preOpComplete =
    surgeryCase.preOpAssessment?.clearedForSurgery === true;

  const consentComplete =
    surgeryCase.consent?.procedureConsent === true &&
    surgeryCase.consent?.anesthesiaConsent === true &&
    surgeryCase.consent?.signedByPatient === true;

  const readinessItems = [
    {
      label: 'Pre-operative assessment',
      complete: preOpComplete,
    },
    {
      label: 'Surgical consent',
      complete: consentComplete,
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
        Array.isArray(surgeryCase.equipmentChecklist) &&
        surgeryCase.equipmentChecklist.length > 0,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-800 p-6">
      <div className="max-w-[1500px] mx-auto space-y-5">
        {actionError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0" />

            <span className="font-medium">
              {actionError}
            </span>

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
            onClick={() => router.back()}
            className="w-10 h-10 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-500 hover:text-[#1b7b68] hover:bg-[#e8f5f3] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Operating Theatre
            </p>

            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-800">
                Surgical Case
              </h1>

              <span className="bg-[#e8f5f3] text-[#1b7b68] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
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
                  <h2 className="text-xl font-extrabold text-slate-800">
                    {surgeryCase.procedureName}
                  </h2>

                  <span
                    className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${urgency.className}`}
                  >
                    {surgeryCase.urgency ===
                      UrgencyLevel.EMERGENCY && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse mr-1.5" />
                    )}

                    {urgency.label}
                  </span>

                  <span
                    className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${status.className}`}
                  >
                    {surgeryCase.status ===
                      SurgeryStatus.IN_PROGRESS && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse mr-1.5" />
                    )}

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
              {surgeryCase.status !==
                SurgeryStatus.IN_PROGRESS &&
                surgeryCase.status !==
                  SurgeryStatus.COMPLETED &&
                surgeryCase.status !==
                  SurgeryStatus.CANCELLED && (
                  <button
                    disabled={actionLoading}
                    onClick={handleStartSurgery}
                    className="px-4 py-2.5 bg-[#1b7b68] hover:bg-[#145f50] disabled:opacity-50 text-white text-xs font-bold rounded-2xl shadow-sm transition-all flex items-center gap-2"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Activity className="w-4 h-4" />
                    )}

                    Start Surgery
                  </button>
                )}

              {surgeryCase.status !==
                SurgeryStatus.COMPLETED &&
                surgeryCase.status !==
                  SurgeryStatus.CANCELLED && (
                  <button
                    disabled={actionLoading}
                    onClick={handleCancelCase}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-600 text-xs font-bold rounded-2xl transition-all flex items-center gap-2"
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
            value={formatDate(
              surgeryCase.scheduledStartTime
            )}
          />

          <InfoCard
            icon={<Clock3 className="w-4 h-4" />}
            label="Schedule"
            value={`${formatTime(
              surgeryCase.scheduledStartTime
            )} — ${formatTime(
              surgeryCase.scheduledEndTime
            )}`}
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
              <TabButton
                active={activeTab === 'overview'}
                onClick={() => setActiveTab('overview')}
                icon={<Hospital className="w-3.5 h-3.5" />}
                label="Overview"
              />

              <TabButton
                active={activeTab === 'pre-op'}
                onClick={() => setActiveTab('pre-op')}
                icon={<Activity className="w-3.5 h-3.5" />}
                label="Pre-Op"
              />

              <TabButton
                active={activeTab === 'consent'}
                onClick={() => setActiveTab('consent')}
                icon={<FileCheck2 className="w-3.5 h-3.5" />}
                label="Consent"
              />

              <TabButton
                active={activeTab === 'team'}
                onClick={() => setActiveTab('team')}
                icon={<Users className="w-3.5 h-3.5" />}
                label="Surgical Team"
              />

              <TabButton
                active={activeTab === 'who'}
                onClick={() => setActiveTab('who')}
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                label="WHO Checklist"
              />

              <TabButton
                active={activeTab === 'equipment'}
                onClick={() => setActiveTab('equipment')}
                icon={<Hospital className="w-3.5 h-3.5" />}
                label="Equipment"
              />

              <TabButton
                active={activeTab === 'intraoperative'}
                onClick={() =>
                  setActiveTab('intraoperative')
                }
                icon={<Activity className="w-3.5 h-3.5" />}
                label="Intraoperative"
              />

              <TabButton
                active={activeTab === 'anaesthesia'}
                onClick={() => setActiveTab('anaesthesia')}
                icon={<Activity className="w-3.5 h-3.5" />}
                label="Anaesthesia"
              />

              <TabButton
                active={activeTab === 'post-op'}
                onClick={() => setActiveTab('post-op')}
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                label="Post-Op"
              />
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
                teamCount={
                  surgeryCase.surgicalTeam?.length || 0
                }
              />
            )}

            {activeTab !== 'overview' && (
              <PlaceholderTab
                title={getTabTitle(activeTab)}
                description={getTabDescription(activeTab)}
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
  teamCount,
}: {
  surgeryCase: SurgeryCase;
  patient?: Patient;
  patientName: string;
  surgeonName: string;
  readinessItems: {
    label: string;
    complete: boolean;
  }[];
  whoCompleted: number;
  teamCount: number;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-extrabold text-slate-800">
          Case Overview
        </h2>

        <p className="text-[11px] text-slate-400 mt-0.5">
          Clinical and operational summary for this surgical case.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SectionCard
          title="Patient Information"
          icon={<UserRound className="w-4 h-4" />}
        >
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">
            <DetailItem
              label="Patient"
              value={patientName}
            />

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
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">
            <DetailItem
              label="Procedure"
              value={surgeryCase.procedureName}
            />

            <DetailItem
              label="ICD Code"
              value={surgeryCase.icdCode || 'N/A'}
              mono
            />

            <DetailItem
              label="Lead Surgeon"
              value={surgeonName}
            />

            <DetailItem
              label="Anaesthesia"
              value={formatLabel(
                surgeryCase.anesthesiaType
              )}
            />

            <DetailItem
              label="Theatre"
              value={surgeryCase.theatreId}
            />

            <DetailItem
              label="Team Members"
              value={`${teamCount} assigned`}
            />
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Surgical Team"
        subtitle={`${teamCount} team member${
          teamCount === 1 ? '' : 's'
        } assigned to this case`}
        icon={<Users className="w-4 h-4" />}
      >
        {surgeryCase.surgicalTeam &&
        surgeryCase.surgicalTeam.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {surgeryCase.surgicalTeam.map(
              (member, index) => {
                const staff =
                  typeof member.userId === 'object'
                    ? member.userId
                    : undefined;

                const name = staff
                  ? `${staff.firstName || ''} ${
                      staff.lastName || ''
                    }`.trim()
                  : 'Assigned Staff';

                return (
                  <div
                    key={`${member.role}-${index}`}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50/50"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#e8f5f3] text-[#1b7b68] flex items-center justify-center shrink-0">
                      <UserRound className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">
                        {name || 'Assigned Staff'}
                      </p>

                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {roleLabels[member.role] ||
                          formatLabel(member.role)}
                      </p>
                    </div>

                    <div className="ml-auto">
                      {member.credentialVerified ? (
                        <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        ) : (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            text="No surgical team members assigned."
          />
        )}
      </SectionCard>

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
                  className={`text-[10px] font-bold uppercase tracking-wide ${
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
                surgeryCase.whoChecklist?.signIn
                  ?.completed
              }
            />

            <ChecklistStage
              label="Time Out"
              completed={
                surgeryCase.whoChecklist?.timeOut
                  ?.completed
              }
            />

            <ChecklistStage
              label="Sign Out"
              completed={
                surgeryCase.whoChecklist?.signOut
                  ?.completed
              }
            />
          </div>
        </SectionCard>
      </div>

      {surgeryCase.cancellationReason && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertCircle className="w-4 h-4" />

            <span className="text-xs font-bold">
              Cancellation Reason
            </span>
          </div>

          <p className="text-xs text-rose-600 mt-2">
            {surgeryCase.cancellationReason}
          </p>
        </div>
      )}
    </div>
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
          completed
            ? 'text-emerald-600'
            : 'text-slate-400'
        }`}
      >
        {completed ? 'Complete' : 'Pending'}
      </p>
    </div>
  );
}

function EmptyState({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="py-10 text-center">
      <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-300 mx-auto flex items-center justify-center">
        {icon}
      </div>

      <p className="text-xs font-semibold text-slate-500 mt-3">
        {text}
      </p>
    </div>
  );
}

function PlaceholderTab({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[#e8f5f3] text-[#1b7b68] mx-auto flex items-center justify-center">
        <Activity className="w-5 h-5" />
      </div>

      <h3 className="text-sm font-extrabold text-slate-800 mt-4">
        {title}
      </h3>

      <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
        {description}
      </p>

      <span className="inline-flex mt-4 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
        Coming next
      </span>
    </div>
  );
}

function formatLabel(value?: string) {
  if (!value) return 'N/A';

  return value
    .toLowerCase()
    .split('_')
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(' ');
}

function getTabTitle(tab: Tab) {
  const titles: Record<Tab, string> = {
    overview: 'Overview',
    'pre-op': 'Pre-Operative Assessment',
    consent: 'Digital Surgical Consent',
    team: 'Surgical Team',
    who: 'WHO Surgical Safety Checklist',
    equipment: 'Equipment & Consumables',
    intraoperative: 'Intraoperative Documentation',
    anaesthesia: 'Anaesthesia & Monitoring',
    'post-op': 'Post-Operative Record',
  };

  return titles[tab];
}

function getTabDescription(tab: Tab) {
  const descriptions: Record<Tab, string> = {
    overview: 'Clinical and operational summary.',
    'pre-op':
      'Complete the patient assessment and surgical readiness requirements.',
    consent:
      'Manage procedure, anaesthesia and transfusion consent.',
    team:
      'Manage the surgical team and credential verification.',
    who:
      'Complete the three stages of the WHO Surgical Safety Checklist.',
    equipment:
      'Manage equipment, instruments, consumables and theatre readiness.',
    intraoperative:
      'Document operative findings, procedure details and intraoperative events.',
    anaesthesia:
      'Record anaesthetic management and intraoperative monitoring.',
    'post-op':
      'Review recovery planning and final post-operative documentation.',
  };

  return descriptions[tab];
}
