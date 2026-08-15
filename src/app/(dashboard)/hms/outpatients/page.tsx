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
  CheckCircle2,
  Clock,
  Sparkles
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
      const res = await fetch(`${API_BASE_URL}/api/v1/outpatients/${encounterId}/vitals`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vitals, nursingNotes }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to update vitals on server.');
      }
      
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
      throw err;
    }
  };

  const handleCompleteConsultation = async (
    encounterId: string, 
    notes: string, 
    diagnoses: string[]
  ) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/v1/outpatients/${encounterId}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ consultationNotes: notes, diagnoses }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to complete consultation on server.');
      }

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
      throw err;
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
    <div className="p-6 font-sans max-w-7xl mx-auto space-y-6 bg-slate-50/50 min-h-screen">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Outpatient Department</h1>
            <span className="bg-[#e8f5f3] text-[#1b7b68] text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Live Queue
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Manage daily check-ins, triage vital signs, and clinical consultations
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              fetchEncounters();
              fetchPatients();
            }}
            className="p-3 rounded-2xl border border-slate-100 bg-slate-50 text-slate-500 hover:text-[#1b7b68] hover:bg-[#e8f5f3] transition-all duration-200"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading || patientsLoading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => setIsCheckInOpen(true)}
            className="px-5 py-3 bg-[#1b7b68] hover:bg-[#145f50] text-white text-xs font-bold uppercase tracking-wider rounded-2xl shadow-sm hover:shadow transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> New Patient Check-In
          </button>
        </div>
      </div>

      {/* Metric Cards Section */}
      <OutpatientStatCards encounters={safeEncounters} />

      {/* Main Queue & Table Container */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Search & Filter Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/30">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, MRN, complaint..."
              className="w-full pl-11 pr-4 py-2.5 text-xs rounded-2xl border border-slate-200/80 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68] transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <Filter className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Status:</span>
            
            {['ALL', ConsultationStatus.IN_QUEUE, ConsultationStatus.WAITING_FOR_DOCTOR, ConsultationStatus.IN_CONSULTATION, ConsultationStatus.COMPLETED].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all shrink-0 ${
                  statusFilter === st
                    ? 'bg-[#1b7b68] text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200/60 hover:bg-slate-50'
                }`}
              >
                {st === 'ALL' ? 'All Queue' : st === ConsultationStatus.IN_QUEUE ? 'Triage Queue' : st === ConsultationStatus.WAITING_FOR_DOCTOR ? 'Awaiting Doctor' : st === ConsultationStatus.IN_CONSULTATION ? 'In Consult' : 'Completed'}
              </button>
            ))}
          </div>
        </div>

        {/* Queue Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-4 px-6">Patient</th>
                <th className="py-4 px-6">Chief Complaint</th>
                <th className="py-4 px-6">Triage Level</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Latest Vitals</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <TableSkeleton />
              ) : filteredEncounters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 font-medium">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-sm font-semibold text-slate-600">No matching outpatient encounters</p>
                      <p className="text-xs text-slate-400">Try adjusting your filter or check in a new patient.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEncounters.map((enc) => {
                  const triage = TRIAGE_CONFIG[enc.triagePriority || TriagePriority.STANDARD];
                  const fullName = `${enc.patientId?.firstName || 'Unknown'} ${enc.patientId?.lastName || 'Patient'}`;
                  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`;

                  return (
                    <tr key={enc._id} className="hover:bg-[#e8f5f3]/20 transition-all duration-150 group">
                      {/* Patient Details */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img 
                            src={avatarUrl} 
                            alt={fullName} 
                            className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200/60 shrink-0" 
                          />
                          <div>
                            <div className="font-bold text-slate-800 text-sm group-hover:text-[#1b7b68] transition-colors">
                              {fullName}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400">
                              MRN: {enc.patientId?.mrn || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Chief Complaint */}
                      <td className="py-4 px-6 max-w-xs">
                        <p className="text-slate-700 font-medium line-clamp-2">
                          {enc.chiefComplaint || 'No complaint specified'}
                        </p>
                      </td>

                      {/* Triage Priority */}
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase ${triage.badge}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                          {triage.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        <StatusBadge status={enc.status} />
                      </td>

                      {/* Vital Signs Overview */}
                      <td className="py-4 px-6">
                        {enc.vitalSigns ? (
                          <div className="text-[11px] text-slate-600 space-y-0.5 font-medium">
                            <div>BP: <strong className="text-slate-800">{enc.vitalSigns.bloodPressureSystolic}/{enc.vitalSigns.bloodPressureDiastolic}</strong> | Temp: <strong className="text-slate-800">{enc.vitalSigns.temperature}°C</strong></div>
                            <div className="text-slate-400">Pulse: {enc.vitalSigns.pulseRate} bpm • SpO2: {enc.vitalSigns.oxygenSaturation || '--'}%</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px] bg-slate-100 px-2.5 py-1 rounded-lg">Pending triage</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right space-x-2">
                        {enc.status === ConsultationStatus.IN_QUEUE && (
                          <button
                            onClick={() => {
                              setSelectedEncounter(enc);
                              setIsVitalsOpen(true);
                            }}
                            className="px-3.5 py-2 text-xs font-bold rounded-2xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-all inline-flex items-center gap-1.5"
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
                            className="px-3.5 py-2 text-xs font-bold rounded-2xl bg-[#e8f5f3] text-[#1b7b68] hover:bg-[#1b7b68] hover:text-white transition-all inline-flex items-center gap-1.5"
                          >
                            <Stethoscope className="w-3.5 h-3.5" /> Consult
                          </button>
                        )}

                        {enc.status === ConsultationStatus.COMPLETED && (
                          <span className="text-xs font-bold text-emerald-600 inline-flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-2xl">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
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
          <td className="py-4 px-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-200 shrink-0" />
              <div>
                <div className="h-4 bg-slate-200 rounded-lg w-28 mb-1.5" />
                <div className="h-3 bg-slate-100 rounded-lg w-20" />
              </div>
            </div>
          </td>
          <td className="py-4 px-6">
            <div className="h-4 bg-slate-200 rounded-lg w-48" />
          </td>
          <td className="py-4 px-6">
            <div className="h-6 bg-slate-200 rounded-full w-20" />
          </td>
          <td className="py-4 px-6">
            <div className="h-6 bg-slate-200 rounded-full w-24" />
          </td>
          <td className="py-4 px-6">
            <div className="h-3 bg-slate-200 rounded-lg w-32 mb-1" />
            <div className="h-3 bg-slate-100 rounded-lg w-24" />
          </td>
          <td className="py-4 px-6 text-right">
            <div className="h-8 bg-slate-200 rounded-2xl w-28 ml-auto" />
          </td>
        </tr>
      ))}
    </>
  );
}

function StatusBadge({ status }: { status: ConsultationStatus }) {
  switch (status) {
    case ConsultationStatus.IN_QUEUE:
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-100 inline-flex items-center gap-1">
          <Clock className="w-3 h-3" /> Triage Queue
        </span>
      );
    case ConsultationStatus.WAITING_FOR_DOCTOR:
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-100 inline-flex items-center gap-1">
          <Clock className="w-3 h-3" /> Awaiting Doctor
        </span>
      );
    case ConsultationStatus.IN_CONSULTATION:
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100 inline-flex items-center gap-1">
          <Stethoscope className="w-3 h-3" /> In Consult
        </span>
      );
    case ConsultationStatus.COMPLETED:
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 inline-flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Completed
        </span>
      );
    default:
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
          {status}
        </span>
      );
  }
}