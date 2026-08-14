'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ConsultationStatus, 
  IOutpatientEncounter, 
  IVitalSigns, 
  TriagePriority, 
  TRIAGE_CONFIG 
} from '@/types/outpatient';
import { PatientApiService } from '@/services/patient.service';

import { OutpatientStatCards } from '../../../../components/outpatient/OutpatientStatCards';
import { RecordVitalsModal } from '../../../../components/outpatient/RecordVitalsModal';
import { ConsultationModal } from '../../../../components/outpatient/ConsultationModal';
import { CheckInModal } from '../../../../components/outpatient/CheckInModal';

import { 
  UserPlus, 
  RefreshCw, 
  Search, 
  Filter, 
  Stethoscope, 
  Activity, 
  CheckCircle2 
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://medxverse-backend.onrender.com';

export default function OutpatientsPage() {
  const [encounters, setEncounters] = useState<IOutpatientEncounter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [patientsLoading, setPatientsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal states
  const [isCheckInOpen, setIsCheckInOpen] = useState<boolean>(false);
  const [isVitalsOpen, setIsVitalsOpen] = useState<boolean>(false);
  const [isConsultationOpen, setIsConsultationOpen] = useState<boolean>(false);
  const [selectedEncounter, setSelectedEncounter] = useState<IOutpatientEncounter | null>(null);

  const fetchEncounters = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/v1/outpatients/queue`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        
        const rawData = 
          Array.isArray(json) ? json :
          Array.isArray(json?.data) ? json.data :
          Array.isArray(json?.encounters) ? json.encounters :
          Array.isArray(json?.data?.encounters) ? json.data.encounters :
          Array.isArray(json?.data?.queue) ? json.data.queue :
          [];

        setEncounters(rawData);
      } else {
        setEncounters([]);
      }
    } catch (err) {
      console.error('Failed to fetch encounters:', err);
      setEncounters([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPatients = useCallback(async () => {
    setPatientsLoading(true);
    try {
      await PatientApiService.getPatients({ limit: 50 });
    } catch (err) {
      console.error('Failed to fetch patients:', err);
    } finally {
      setPatientsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEncounters();
    fetchPatients();
  }, [fetchEncounters, fetchPatients]);

  const handleRecordVitals = async (
    encounterId: string, 
    vitals: IVitalSigns, 
    nursingNotes: string
  ) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/api/v1/outpatients/${encounterId}/vitals`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vitals, nursingNotes }),
      });
      
      setEncounters((prev) =>
        (Array.isArray(prev) ? prev : []).map((enc) =>
          enc._id === encounterId
            ? {
                ...enc,
                vitalSigns: vitals,
                nursingNotes,
                status: ConsultationStatus.WAITING_FOR_DOCTOR,
              }
            : enc
        )
      );
    } catch (err) {
      console.error('Failed to record vitals:', err);
    }
  };

  const handleCompleteConsultation = async (
    encounterId: string, 
    notes: string, 
    diagnoses: string[]
  ) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/api/v1/outpatients/${encounterId}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ consultationNotes: notes, diagnoses }),
      });

      setEncounters((prev) =>
        (Array.isArray(prev) ? prev : []).map((enc) =>
          enc._id === encounterId
            ? {
                ...enc,
                consultationNotes: notes,
                diagnoses,
                status: ConsultationStatus.COMPLETED,
              }
            : enc
        )
      );
    } catch (err) {
      console.error('Failed to complete consultation:', err);
    }
  };

  const safeEncounters = Array.isArray(encounters) ? encounters : [];

  const filteredEncounters = safeEncounters.filter((enc) => {
    const matchesSearch =
      enc.patientId?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enc.patientId?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enc.patientId?.mrn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enc.chiefComplaint?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || enc.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 font-sans max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Outpatient Department (OPD)</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage daily queue, triage vitals, and consultations</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchEncounters();
              fetchPatients();
            }}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading || patientsLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsCheckInOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> New Patient Check-In
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      <OutpatientStatCards encounters={safeEncounters} />

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filters Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by name, MRN, complaint..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0">Filter Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Statuses</option>
              <option value={ConsultationStatus.IN_QUEUE}>In Queue (Triage)</option>
              <option value={ConsultationStatus.WAITING_FOR_DOCTOR}>Awaiting Doctor</option>
              <option value={ConsultationStatus.IN_CONSULTATION}>In Consultation</option>
              <option value={ConsultationStatus.COMPLETED}>Completed</option>
            </select>
          </div>
        </div>

        {/* Queue Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Chief Complaint</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Vitals / Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <TableSkeleton />
              ) : filteredEncounters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    No data found
                  </td>
                </tr>
              ) : (
                filteredEncounters.map((enc) => {
                  const triage = TRIAGE_CONFIG[enc.triagePriority || TriagePriority.STANDARD];
                  return (
                    <tr key={enc._id} className="hover:bg-slate-50/80 transition-all">
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <div className="font-semibold text-sm">
                          {enc.patientId?.firstName} {enc.patientId?.lastName}
                        </div>
                        <div className="text-[11px] text-slate-400">MRN: {enc.patientId?.mrn}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-600">
                        {enc.chiefComplaint}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${triage.badge}`}>
                          {triage.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={enc.status} />
                      </td>
                      <td className="py-3.5 px-4">
                        {enc.vitalSigns ? (
                          <div className="text-[11px] text-slate-600 space-y-0.5">
                            <div>BP: <strong>{enc.vitalSigns.bloodPressureSystolic}/{enc.vitalSigns.bloodPressureDiastolic}</strong> | Temp: <strong>{enc.vitalSigns.temperature}°C</strong></div>
                            <div className="text-slate-400">Pulse: {enc.vitalSigns.pulseRate} bpm</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Pending triage</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {enc.status === ConsultationStatus.IN_QUEUE && (
                          <button
                            onClick={() => {
                              setSelectedEncounter(enc);
                              setIsVitalsOpen(true);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-all inline-flex items-center gap-1"
                          >
                            <Activity className="w-3.5 h-3.5" /> Record Vitals
                          </button>
                        )}
                        {(enc.status === ConsultationStatus.WAITING_FOR_DOCTOR || enc.status === ConsultationStatus.IN_CONSULTATION) && (
                          <button
                            onClick={() => {
                              setSelectedEncounter(enc);
                              setIsConsultationOpen(true);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all inline-flex items-center gap-1"
                          >
                            <Stethoscope className="w-3.5 h-3.5" /> Consult
                          </button>
                        )}
                        {enc.status === ConsultationStatus.COMPLETED && (
                          <span className="text-xs font-semibold text-slate-400 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Done
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <CheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        onSuccess={() => fetchEncounters()}
      />

      <RecordVitalsModal
        encounter={selectedEncounter}
        isOpen={isVitalsOpen}
        onClose={() => {
          setIsVitalsOpen(false);
          setSelectedEncounter(null);
        }}
        onSubmit={handleRecordVitals}
      />

      <ConsultationModal
        encounter={selectedEncounter}
        isOpen={isConsultationOpen}
        onClose={() => {
          setIsConsultationOpen(false);
          setSelectedEncounter(null);
        }}
        onSubmit={handleCompleteConsultation}
      />
    </div>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="animate-pulse border-b border-slate-100">
          <td className="py-3.5 px-4">
            <div className="h-4 bg-slate-200 rounded w-28 mb-1.5" />
            <div className="h-3 bg-slate-100 rounded w-20" />
          </td>
          <td className="py-3.5 px-4">
            <div className="h-4 bg-slate-200 rounded w-48" />
          </td>
          <td className="py-3.5 px-4">
            <div className="h-5 bg-slate-200 rounded-full w-20" />
          </td>
          <td className="py-3.5 px-4">
            <div className="h-5 bg-slate-200 rounded-full w-24" />
          </td>
          <td className="py-3.5 px-4">
            <div className="h-3 bg-slate-200 rounded w-32 mb-1" />
            <div className="h-3 bg-slate-100 rounded w-24" />
          </td>
          <td className="py-3.5 px-4 text-right">
            <div className="h-8 bg-slate-200 rounded-lg w-28 ml-auto" />
          </td>
        </tr>
      ))}
    </>
  );
}

function StatusBadge({ status }: { status: ConsultationStatus }) {
  switch (status) {
    case ConsultationStatus.IN_QUEUE:
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">In Queue</span>;
    case ConsultationStatus.WAITING_FOR_DOCTOR:
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">Awaiting Doctor</span>;
    case ConsultationStatus.IN_CONSULTATION:
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">In Consultation</span>;
    case ConsultationStatus.COMPLETED:
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Completed</span>;
    default:
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">{status}</span>;
  }
}