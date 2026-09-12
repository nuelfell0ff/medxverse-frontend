'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FileText,
  HeartPulse,
  History,
  Mail,
  MapPin,
  Pill,
  Phone,
  Receipt,
  ShieldAlert,
  Stethoscope,
  XCircle,
} from 'lucide-react';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

type Resource = {
  [key: string]: any;
  resourceType?: string;
  id?: string;
};

type EHRResponse = {
  success: boolean;
  data?: {
    patient?: Record<string, any>;
    resources?: Record<string, Resource[]>;
    timeline?: Resource[];
    resourceCount?: Record<string, number>;
  };
  message?: string;
};

type TabKey = 'overview' | 'encounters' | 'labs' | 'medications' | 'procedures' | 'documents' | 'claims';

const tabs: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'overview', label: 'Overview', icon: Activity },
  { key: 'encounters', label: 'Encounters', icon: Calendar },
  { key: 'labs', label: 'Laboratory', icon: ClipboardList },
  { key: 'medications', label: 'Medications', icon: Pill },
  { key: 'procedures', label: 'Procedures', icon: Stethoscope },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'claims', label: 'Claims', icon: Receipt },
];

function formatDate(value?: string | Date) {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
}


function calculateAge(dob?: string) {
  if (!dob) return 'N/A';
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return 'N/A';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const month = now.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function statusClass(status?: string) {
  const value = String(status || '').toLowerCase();
  if (['completed', 'finished', 'paid', 'active', 'authorized'].includes(value)) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  }
  if (['cancelled', 'canceled', 'entered-in-error', 'rejected'].includes(value)) {
    return 'bg-rose-50 text-rose-700 border-rose-100';
  }
  if (['planned', 'scheduled', 'pending', 'in-progress'].includes(value)) {
    return 'bg-amber-50 text-amber-700 border-amber-100';
  }
  return 'bg-slate-50 text-slate-600 border-slate-100';
}

function resourceDate(resource: Resource) {
  return (
    resource?.meta?.lastUpdated ||
    resource?.issued ||
    resource?.authoredOn ||
    resource?.effectiveDateTime ||
    resource?.performedDateTime ||
    resource?.period?.start ||
    resource?.createdAt
  );
}


function getResourceTitle(
  resource: Resource,
  legacy?: Record<string, any>,
  fallback = 'Resource'
) {
  return (
    resource.code?.text ||
    resource.type?.[0]?.text ||
    resource.medicationCodeableConcept?.text ||
    resource.description ||
    legacy?.testName ||
    legacy?.reason ||
    fallback
  );
}

function ResourceCard({ resource }: { resource: Resource }) {
  const type = resource.resourceType || 'Resource';
  const legacy = resource.extension?.find((e: any) => e.url === 'urn:medxverse:legacy-source')?.valueJson;
  const status = resource.status || legacy?.status;
  const title = getResourceTitle(resource, legacy, type);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#1b7b68]">
              {type}
            </span>
            {status && (
              <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold ${statusClass(status)}`}>
                {String(status)}
              </span>
            )}
          </div>
          <h3 className="text-sm font-extrabold text-slate-800 truncate">{title}</h3>
        </div>
        <span className="text-[10px] text-slate-400 whitespace-nowrap">v{resource.meta?.versionId || '1'}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-2.5">
          <span className="block text-[9px] text-slate-400 font-semibold uppercase">Date</span>
          <span className="font-semibold text-slate-700">{formatDate(resourceDate(resource))}</span>
        </div>
        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-2.5">
          <span className="block text-[9px] text-slate-400 font-semibold uppercase">ID</span>
          <span className="font-mono font-semibold text-slate-700 truncate block">{resource.id || 'N/A'}</span>
        </div>
      </div>

      {legacy?.notes && (
        <p className="mt-3 text-[11px] text-slate-500 bg-slate-50 rounded-2xl p-3 border border-slate-100">
          {legacy.notes}
        </p>
      )}
    </div>
  );
}

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const patientId = params?.id;

  const [ehr, setEhr] = useState<EHRResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  useEffect(() => {
    if (!patientId) return;

    const loadEHR = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const response = await fetch(
          `${API_BASE_URL}/api/v1/patients/${encodeURIComponent(patientId)}/ehr`,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            cache: 'no-store',
          }
        );

        const json: EHRResponse = await response.json().catch(() => ({ success: false }));
        if (!response.ok || !json.success) {
          throw new Error(json.message || 'Unable to load patient EHR.');
        }
        setEhr(json.data || null);
      } catch (err: any) {
        console.error('Failed to load patient EHR:', err);
        setError(err?.message || 'Unable to load patient EHR.');
      } finally {
        setLoading(false);
      }
    };

    loadEHR();
  }, [patientId]);

  const patient = ehr?.patient;
  const resources = ehr?.resources || {};

  const encounters = resources.Encounter || [];
  const observations = resources.Observation || [];
  const medications = resources.MedicationStatement || [];
  const procedures = resources.Procedure || [];
  const documents = resources.DocumentReference || [];
  const claims = resources.Claim || [];

  const timeline = useMemo<Resource[]>(() => {
    const all: Resource[] = Object.entries(resources).flatMap(([type, list]) =>
      (list || []).map((item: Resource) => ({
        ...item,
        resourceType: item.resourceType || type,
      }))
    );

    return all
      .filter((item) => item.resourceType !== 'Patient')
      .sort((a, b) => {
        const aDate = new Date(resourceDate(a) || 0).getTime();
        const bDate = new Date(resourceDate(b) || 0).getTime();
        return bDate - aDate;
      });
  }, [resources]);

  const counts = {
    encounters: encounters.length,
    observations: observations.length,
    medications: medications.length,
    procedures: procedures.length,
    documents: documents.length,
    claims: claims.length,
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#1b7b68]/20 border-t-[#1b7b68] animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Loading patient EHR...</p>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="space-y-5 font-sans text-slate-800">
        <button
          onClick={() => router.push('/hms/patients')}
          className="flex items-center gap-2 text-xs font-bold text-[#1b7b68] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Patients
        </button>
        <div className="bg-white rounded-3xl border border-rose-100 shadow-sm p-10 text-center">
          <XCircle className="w-12 h-12 text-rose-300 mx-auto mb-3" />
          <h2 className="text-lg font-extrabold text-slate-800">Unable to load patient</h2>
          <p className="text-sm text-slate-400 mt-1">{error || 'Patient record was not found.'}</p>
        </div>
      </div>
    );
  }

  const latestVital = patient.vitalsHistory?.[patient.vitalsHistory.length - 1];

  const tabResources: Record<Exclude<TabKey, 'overview'>, Resource[]> = {
    encounters,
    labs: observations,
    medications,
    procedures,
    documents,
    claims,
  };

  return (
    <div className="space-y-5 font-sans text-slate-800 animate-in fade-in duration-300">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/hms/patients')}
            className="p-2.5 rounded-2xl bg-white border border-slate-100 shadow-sm text-slate-500 hover:text-[#1b7b68] hover:bg-[#e8f5f3] transition-all"
            title="Back to patients"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">Patient EHR</h1>
            <p className="text-xs text-slate-400 mt-0.5">Unified longitudinal clinical record.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-[#e8f5f3] text-[#1b7b68] text-[10px] font-extrabold border border-[#1b7b68]/10">
            MPI: {patient.universalPatientId || 'N/A'}
          </span>
          {patient.isFlagged && (
            <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 text-[10px] font-extrabold border border-rose-100 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Flagged
            </span>
          )}
        </div>
      </div>

      {/* Patient identity card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#e8f5f3] border-2 border-[#1b7b68]/20 overflow-hidden shrink-0">
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${patient.firstName}_${patient.lastName}`}
              alt="Patient avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-800">{patient.firstName} {patient.lastName}</h2>
              <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold">{patient.mrn}</span>
              {patient.active !== false && (
                <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {calculateAge(patient.dateOfBirth)} yrs • {String(patient.gender || '').toLowerCase()} • DOB {formatDate(patient.dateOfBirth)}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400" />{patient.phone || 'N/A'}</span>
              <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-400" />{patient.email || 'N/A'}</span>
              <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-slate-400" />{patient.address || 'N/A'}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 w-full lg:w-auto">
            <div className="px-4 py-3 rounded-2xl bg-rose-50 border border-rose-100 text-center min-w-24">
              <p className="text-[9px] text-slate-400 font-bold uppercase">Blood</p>
              <p className="text-sm font-extrabold text-rose-600">{patient.bloodGroup || 'N/A'}</p>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-center min-w-24">
              <p className="text-[9px] text-slate-400 font-bold uppercase">Genotype</p>
              <p className="text-sm font-extrabold text-slate-700">{patient.genotype || 'N/A'}</p>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-[#e8f5f3] border border-[#1b7b68]/10 text-center min-w-24">
              <p className="text-[9px] text-slate-400 font-bold uppercase">Resources</p>
              <p className="text-sm font-extrabold text-[#1b7b68]">{timeline.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-2 overflow-x-auto">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const count = tab.key === 'overview' ? timeline.length : tabResources[tab.key as Exclude<TabKey, 'overview'>].length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  activeTab === tab.key
                    ? 'bg-[#1b7b68] text-white shadow-md shadow-[#1b7b68]/20'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === tab.key ? 'bg-white/20' : 'bg-slate-100'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            {[
              ['Encounters', counts.encounters, Calendar],
              ['Observations', counts.observations, Activity],
              ['Medications', counts.medications, Pill],
              ['Procedures', counts.procedures, Stethoscope],
              ['Documents', counts.documents, FileText],
              ['Claims', counts.claims, Receipt],
            ].map(([label, count, Icon]: any) => (
              <div key={label} className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-[#e8f5f3] flex items-center justify-center text-[#1b7b68] mb-2">
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-[10px] text-slate-400 font-medium">{label}</p>
                <p className="text-xl font-extrabold text-slate-800">{count}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2"><History className="w-4 h-4 text-[#1b7b68]" /> Longitudinal Timeline</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Clinical activity across departments.</p>
                </div>
                <span className="text-[10px] font-bold text-slate-400">{timeline.length} resources</span>
              </div>
              {timeline.length ? (
                <div className="space-y-3 max-h-130 overflow-y-auto pr-1">
                  {timeline.slice(0, 15).map((item, index) => (
                    <div key={`${item.resourceType}-${item.id}-${index}`} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-xl bg-[#e8f5f3] text-[#1b7b68] flex items-center justify-center shrink-0">
                          {item.resourceType === 'MedicationStatement' ? <Pill className="w-3.5 h-3.5" /> : item.resourceType === 'Procedure' ? <Stethoscope className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                        </div>
                        {index < Math.min(timeline.length, 15) - 1 && <div className="w-px flex-1 bg-slate-100 mt-1" />}
                      </div>
                      <div className="pb-4 min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-extrabold text-slate-800">{item.resourceType}</p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">{formatDate(resourceDate(item))}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 truncate">
                          {getResourceTitle(item, undefined, 'Clinical record')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text="No unified clinical resources available." />
              )}
            </div>

            <div className="space-y-5">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-4"><HeartPulse className="w-4 h-4 text-[#1b7b68]" /> Latest Vitals</h3>
                {latestVital ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Vital label="Blood Pressure" value={`${latestVital.systolicBp}/${latestVital.diastolicBp}`} unit="mmHg" />
                    <Vital label="Temperature" value={latestVital.temperature} unit="°C" />
                    <Vital label="Pulse" value={latestVital.pulseRate} unit="bpm" />
                    <Vital label="SpO₂" value={latestVital.spo2} unit="%" />
                    <Vital label="Weight" value={latestVital.weight} unit="kg" />
                    <Vital label="Height" value={latestVital.height} unit="cm" />
                  </div>
                ) : <EmptyState text="No vitals recorded." />}
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-4"><ShieldAlert className="w-4 h-4 text-rose-500" /> Allergies</h3>
                {patient.allergies?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {patient.allergies.map((a: any, i: number) => (
                      <span key={i} className="px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold">
                        {a.allergen}{a.severity ? ` • ${a.severity}` : ''}
                      </span>
                    ))}
                  </div>
                ) : <p className="text-[11px] text-slate-400 italic">No known allergies registered.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resource tabs */}
      {activeTab !== 'overview' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">{tabs.find((t) => t.key === activeTab)?.label}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Unified EHR resources visible to your current access scope.</p>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-500">
              {tabResources[activeTab as Exclude<TabKey, 'overview'>].length} records
            </span>
          </div>

          {tabResources[activeTab as Exclude<TabKey, 'overview'>].length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {tabResources[activeTab as Exclude<TabKey, 'overview'>].map((resource, index) => (
                <ResourceCard key={`${resource.id || 'resource'}-${index}`} resource={resource} />
              ))}
            </div>
          ) : <EmptyState text={`No ${tabs.find((t) => t.key === activeTab)?.label.toLowerCase()} records available.`} />}
        </div>
      )}
    </div>
  );
}

function Vital({ label, value, unit }: { label: string; value: any; unit: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
      <p className="text-[9px] text-slate-400 font-bold uppercase">{label}</p>
      <p className="text-sm font-extrabold text-slate-800 mt-1">{value ?? 'N/A'} <span className="text-[9px] font-semibold text-slate-400">{unit}</span></p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-10 text-center bg-slate-50/70 rounded-2xl border border-slate-100">
      <FileText className="w-9 h-9 text-slate-300 mx-auto mb-2" />
      <p className="text-xs text-slate-400 font-medium">{text}</p>
    </div>
  );
}
