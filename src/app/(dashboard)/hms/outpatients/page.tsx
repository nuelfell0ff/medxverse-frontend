'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ConsultationStatus, 
  IOutpatientEncounter, 
  IVitalSigns, 
  TriagePriority, 
  TRIAGE_CONFIG 
} from '@/types/outpatient';

import { OutpatientStatCards } from '../../../../components/outpatient/OutpatientStatCards';
import { RecordVitalsModal } from '../../../../components/outpatient/RecordVitalsModal';
import { ConsultationModal } from '../../../../components/outpatient/ConsultationModal';
import { PatientApiService } from '@/services/patient.service';

import { 
  UserPlus,
  RefreshCw,
  Search,
  Filter,
  Stethoscope,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  X,
  Loader2,
  ChevronDown,
  CreditCard,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://medxverse-backend.onrender.com';

// Fallback styling if triage config lookup fails
const DEFAULT_TRIAGE_BADGE = {
  label: 'Standard',
  badge: 'bg-slate-100 text-slate-700'
};

export default function OutpatientsPage() {
  const [encounters, setEncounters] = useState<IOutpatientEncounter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal states
  const [isVitalsOpen, setIsVitalsOpen] = useState<boolean>(false);
  const [isConsultationOpen, setIsConsultationOpen] = useState<boolean>(false);
  const [selectedEncounter, setSelectedEncounter] = useState<IOutpatientEncounter | null>(null);

  // Billing / pricing catalogue state. The selected catalogue is sent with
  // the outpatient encounter so the backend can carry it into Billing.
  const [isCheckInOpen, setIsCheckInOpen] = useState<boolean>(false);

  const fetchEncounters = useCallback(async () => {
    setLoading(true);
    setActionError(null);
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

  useEffect(() => {
    fetchEncounters();
  }, [fetchEncounters]);

  const handleRecordVitals = async (
    encounterId: string, 
    vitals: IVitalSigns, 
    nursingNotes: string
  ) => {
    setActionError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/v1/outpatients/${encounterId}/vitals`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vitalSigns: vitals, nursingNotes }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to update vitals on server.');
      }
      
      // Optimistic update + re-fetch to ensure sync
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
      
      fetchEncounters();
    } catch (err: any) {
      console.error('Failed to record vitals:', err);
      setActionError(err.message || 'An error occurred while updating vitals.');
      throw err;
    }
  };

  const handleCompleteConsultation = async (
    encounterId: string, 
    notes: string, 
    diagnoses: string[]
  ) => {
    setActionError(null);
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

      fetchEncounters();
    } catch (err: any) {
      console.error('Failed to complete consultation:', err);
      setActionError(err.message || 'An error occurred while completing consultation.');
      throw err;
    }
  };

  const safeEncounters = Array.isArray(encounters) ? encounters : [];

  // Safe search filtering preventing runtime null checks
  const filteredEncounters = safeEncounters.filter((enc) => {
    const query = searchTerm.trim().toLowerCase();
    
    if (!query && statusFilter === 'ALL') return true;

    const firstName = enc.patientId?.firstName?.toLowerCase() ?? '';
    const lastName = enc.patientId?.lastName?.toLowerCase() ?? '';
    const mrn = enc.patientId?.mrn?.toLowerCase() ?? '';
    const chiefComplaint = enc.chiefComplaint?.toLowerCase() ?? '';

    const matchesSearch =
      !query ||
      firstName.includes(query) ||
      lastName.includes(query) ||
      mrn.includes(query) ||
      chiefComplaint.includes(query);

    const matchesStatus = statusFilter === 'ALL' || enc.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 font-sans w-full mx-auto space-y-6 bg-slate-50/50 min-h-screen">
      
      {/* Action Error Banner */}
      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{actionError}</span>
        </div>
      )}

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
            onClick={() => fetchEncounters()}
            className="p-3 rounded-2xl border border-slate-100 bg-slate-50 text-slate-500 hover:text-[#1b7b68] hover:bg-[#e8f5f3] transition-all duration-200"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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
                  const triageKey = enc.triagePriority || TriagePriority.STANDARD;
                  const triage = TRIAGE_CONFIG[triageKey] || DEFAULT_TRIAGE_BADGE;
                  
                  const firstName = enc.patientId?.firstName || 'Unknown';
                  const lastName = enc.patientId?.lastName || 'Patient';
                  const fullName = `${firstName} ${lastName}`;
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
      <CheckInBillingModal
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


/* ============================================================================
   BILLING-AWARE OUTPATIENT CHECK-IN
   The existing CheckInModal is replaced here so the selected Pricing
   Catalogue is part of the actual encounter creation request.
============================================================================ */

interface OutpatientPricingCatalogue {
  _id: string;
  code?: string;
  name?: string;
  planName?: string;
  description?: string;
  departmentName?: string;
  price?: number;
  currency?: string;
  version?: number;
  isActive?: boolean;
}

interface SearchPatient {
  _id: string;
  firstName?: string;
  lastName?: string;
  mrn?: string;
  gender?: string;
  dateOfBirth?: string;
  phone?: string;
}

interface SearchStaff {
  _id: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  department?: string;
  isActive?: boolean;
}

function CheckInBillingModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState<SearchPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<SearchPatient | null>(null);
  const [loadingPatients, setLoadingPatients] = useState(false);

  const [doctorSearch, setDoctorSearch] = useState('');
  const [staff, setStaff] = useState<SearchStaff[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<SearchStaff | null>(null);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [catalogues, setCatalogues] = useState<OutpatientPricingCatalogue[]>([]);
  const [selectedCatalogue, setSelectedCatalogue] =
    useState<OutpatientPricingCatalogue | null>(null);
  const [loadingCatalogues, setLoadingCatalogues] = useState(false);

  const [chiefComplaint, setChiefComplaint] = useState('');
  const [triagePriority, setTriagePriority] = useState('STANDARD');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = () =>
    typeof window !== 'undefined'
      ? localStorage.getItem('token') ||
        localStorage.getItem('accessToken') ||
        localStorage.getItem('authToken')
      : null;

  const patientName = (patient?: SearchPatient | null) =>
    patient
      ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unnamed Patient'
      : '';

  const staffName = (person?: SearchStaff | null) =>
    person
      ? `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Unnamed Staff'
      : '';

  const catalogueName = (catalogue: OutpatientPricingCatalogue) =>
    catalogue.planName || catalogue.name || catalogue.code || 'Outpatient Pricing Plan';

  const formatMoney = (catalogue: OutpatientPricingCatalogue) => {
    if (typeof catalogue.price !== 'number') return 'Price not set';

    try {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: catalogue.currency || 'NGN',
        maximumFractionDigits: 2,
      }).format(catalogue.price);
    } catch {
      return `${catalogue.currency || 'NGN'} ${catalogue.price.toLocaleString()}`;
    }
  };

  const loadPatients = useCallback(async (query: string) => {
    try {
      setLoadingPatients(true);
      const response = await PatientApiService.getPatients({
        search: query,
        limit: 10,
      });

      setPatients((response?.patients || []) as SearchPatient[]);
    } catch (err) {
      console.error('Failed to search outpatient patients:', err);
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  const loadStaff = useCallback(async (query: string) => {
    try {
      setLoadingStaff(true);

      const params = new URLSearchParams();
      params.set('isActive', 'true');
      if (query.trim()) params.set('search', query.trim());

      const response = await fetch(
        `${API_BASE_URL}/api/v1/staff?${params.toString()}`,
        {
          headers: {
            ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
          },
        }
      );

      const json = await response.json().catch(() => ({}));

      const result = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.data?.staff)
            ? json.data.staff
            : [];

      setStaff(result as SearchStaff[]);
    } catch (err) {
      console.error('Failed to search outpatient staff:', err);
      setStaff([]);
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  const loadCatalogues = useCallback(async (query: string) => {
    try {
      setLoadingCatalogues(true);

      const params = new URLSearchParams();
      if (query.trim()) params.set('search', query.trim());

      const response = await fetch(
        `${API_BASE_URL}/api/v1/outpatients/pricing-catalogues${
          params.toString() ? `?${params.toString()}` : ''
        }`,
        {
          headers: {
            ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
          },
          cache: 'no-store',
        }
      );

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          json?.message ||
            json?.error ||
            `Failed to load outpatient pricing catalogues (${response.status})`
        );
      }

      const raw = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.data?.items)
            ? json.data.items
            : Array.isArray(json?.items)
              ? json.items
              : [];

      setCatalogues(
        raw.filter(
          (item: OutpatientPricingCatalogue) =>
            item &&
            item._id &&
            item.isActive !== false
        )
      );
    } catch (err: any) {
      console.error('Failed to load outpatient pricing catalogues:', err);
      setCatalogues([]);
      setError(err?.message || 'Unable to load outpatient pricing plans.');
    } finally {
      setLoadingCatalogues(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setPatientSearch('');
    setPatients([]);
    setSelectedPatient(null);
    setDoctorSearch('');
    setStaff([]);
    setSelectedDoctor(null);
    setCatalogueSearch('');
    setCatalogues([]);
    setSelectedCatalogue(null);
    setChiefComplaint('');
    setTriagePriority('STANDARD');
    setSubmitting(false);

    loadPatients('');
    loadStaff('');
    loadCatalogues('');
  }, [isOpen, loadPatients, loadStaff, loadCatalogues]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      loadPatients(patientSearch);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [isOpen, patientSearch, loadPatients]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      loadStaff(doctorSearch);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [isOpen, doctorSearch, loadStaff]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      loadCatalogues(catalogueSearch);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [isOpen, catalogueSearch, loadCatalogues]);

  const handleSubmit = async () => {
    setError(null);

    if (!selectedPatient?._id) {
      setError('Please search for and select a patient.');
      return;
    }

    if (!chiefComplaint.trim()) {
      setError('Please enter the chief complaint.');
      return;
    }

    // If more than one applicable plan exists, force an explicit selection.
    if (catalogues.length > 1 && !selectedCatalogue?._id) {
      setError('Please select an outpatient pricing plan before checking in the patient.');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`${API_BASE_URL}/api/v1/outpatients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
        },
        body: JSON.stringify({
          patientId: selectedPatient._id,
          doctorId: selectedDoctor?._id || undefined,
          chiefComplaint: chiefComplaint.trim(),
          triagePriority,
          // This is the critical Billing integration.
          pricingCatalogueItemId: selectedCatalogue?._id || undefined,
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          json?.message ||
            json?.error ||
            `Failed to create outpatient encounter (${response.status})`
        );
      }

      onClose();
      onSuccess();
    } catch (err: any) {
      console.error('Failed to create outpatient encounter:', err);
      setError(
        err?.message ||
          'Unable to create the outpatient encounter. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              New Patient Check-In
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Register the patient and select the outpatient pricing plan for this consultation.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Patient */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Patient *
            </label>

            {selectedPatient ? (
              <div className="flex items-center justify-between p-3 rounded-2xl border border-[#1b7b68]/20 bg-[#e8f5f3]">
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {patientName(selectedPatient)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    MRN: {selectedPatient.mrn || 'No MRN'}
                    {selectedPatient.phone ? ` • ${selectedPatient.phone}` : ''}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatient(null);
                    setPatientSearch('');
                  }}
                  className="text-[10px] font-bold text-[#1b7b68] hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Search by patient name, MRN or phone..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/10"
                />

                {(loadingPatients || patients.length > 0) && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden">
                    {loadingPatients ? (
                      <div className="p-4 text-xs text-slate-400 flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Searching patients...
                      </div>
                    ) : (
                      patients.map((patient) => (
                        <button
                          key={patient._id}
                          type="button"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setPatientSearch('');
                            setPatients([]);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-[#e8f5f3]/60 border-b border-slate-50 last:border-b-0"
                        >
                          <p className="text-xs font-bold text-slate-800">
                            {patientName(patient)}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            MRN: {patient.mrn || 'N/A'}
                            {patient.phone ? ` • ${patient.phone}` : ''}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pricing Catalogue */}
          <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/40">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Outpatient Pricing Plan *
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Select the Billing catalogue that should price this consultation.
                </p>
              </div>

              <CreditCard className="w-4 h-4 text-[#1b7b68]" />
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-3.5 w-3.5 h-3.5 text-slate-400" />
              <input
                value={catalogueSearch}
                onChange={(e) => setCatalogueSearch(e.target.value)}
                placeholder="Search outpatient pricing plans..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-[#1b7b68]"
              />
            </div>

            {loadingCatalogues ? (
              <div className="p-4 rounded-xl bg-white border border-slate-100 text-xs text-slate-400 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading outpatient pricing plans...
              </div>
            ) : catalogues.length === 0 ? (
              <div className="p-4 rounded-xl bg-white border border-amber-100 text-xs text-amber-700">
                No active outpatient pricing catalogue is available.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {catalogues.map((catalogue) => {
                  const selected = selectedCatalogue?._id === catalogue._id;

                  return (
                    <button
                      key={catalogue._id}
                      type="button"
                      onClick={() => setSelectedCatalogue(catalogue)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        selected
                          ? 'border-[#1b7b68] bg-[#e8f5f3] ring-2 ring-[#1b7b68]/10'
                          : 'border-slate-100 bg-white hover:border-[#1b7b68]/30 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {catalogueName(catalogue)}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                            {catalogue.code || 'OUTPATIENT_CONSULTATION'}
                            {catalogue.version
                              ? ` • Version ${catalogue.version}`
                              : ''}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-[#1b7b68]">
                            {formatMoney(catalogue)}
                          </p>
                          {selected && (
                            <p className="text-[9px] font-bold uppercase tracking-wider text-[#1b7b68] mt-0.5">
                              Selected
                            </p>
                          )}
                        </div>
                      </div>

                      {catalogue.description && (
                        <p className="text-[10px] text-slate-400 mt-2 line-clamp-2">
                          {catalogue.description}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedCatalogue && (
              <div className="mt-3 flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#1b7b68]/20">
                <span className="text-[10px] font-semibold text-slate-500">
                  Billing selection
                </span>
                <span className="text-[10px] font-bold text-[#1b7b68]">
                  {catalogueName(selectedCatalogue)} • {formatMoney(selectedCatalogue)}
                </span>
              </div>
            )}
          </div>

          {/* Doctor */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Attending Doctor
            </label>

            {selectedDoctor ? (
              <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-slate-50">
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {staffName(selectedDoctor)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {selectedDoctor.role || 'Staff'}
                    {selectedDoctor.department
                      ? ` • ${selectedDoctor.department}`
                      : ''}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDoctor(null)}
                  className="text-[10px] font-bold text-[#1b7b68] hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  placeholder="Search doctor or staff..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
                />

                {staff.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                    {staff.map((person) => (
                      <button
                        key={person._id}
                        type="button"
                        onClick={() => {
                          setSelectedDoctor(person);
                          setDoctorSearch('');
                          setStaff([]);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-[#e8f5f3]/60 border-b border-slate-50 last:border-b-0"
                      >
                        <p className="text-xs font-bold text-slate-800">
                          {staffName(person)}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {person.role || 'Staff'}
                          {person.department ? ` • ${person.department}` : ''}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {loadingStaff && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-xl shadow-lg p-3 text-xs text-slate-400 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Searching staff...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Triage + complaint */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Triage Priority
              </label>

              <div className="relative">
                <select
                  value={triagePriority}
                  onChange={(e) => setTriagePriority(e.target.value)}
                  className="w-full appearance-none px-3 py-3 pr-9 rounded-2xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-[#1b7b68]"
                >
                  <option value="STANDARD">Standard</option>
                  <option value="URGENT">Urgent</option>
                  <option value="EMERGENCY">Emergency</option>
                </select>
                <ChevronDown className="absolute right-3 top-3.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Billing
              </label>

              <div className="h-[42px] px-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center">
                <span className="text-[10px] font-semibold text-slate-500">
                  {selectedCatalogue
                    ? `${catalogueName(selectedCatalogue)} • ${formatMoney(selectedCatalogue)}`
                    : 'Select a pricing plan above'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Chief Complaint *
            </label>

            <textarea
              rows={4}
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="Describe the patient's presenting complaint..."
              className="w-full px-3 py-3 rounded-2xl border border-slate-200 text-xs resize-none focus:outline-none focus:border-[#1b7b68]"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              submitting ||
              !selectedPatient ||
              !chiefComplaint.trim() ||
              catalogues.length === 0 ||
              (catalogues.length > 1 && !selectedCatalogue)
            }
            className="px-4 py-2.5 rounded-xl bg-[#1b7b68] hover:bg-[#145f50] text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50"
          >
            {submitting && (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            )}
            Check In Patient
          </button>
        </div>
      </div>
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