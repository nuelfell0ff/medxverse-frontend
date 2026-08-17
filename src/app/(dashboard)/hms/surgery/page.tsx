"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Syringe,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  Activity,
  FileText,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Pill,
  Scissors,
  HeartPulse,
  UserCheck,
  Thermometer,
  ShieldCheck,
  Building2,
} from "lucide-react";

// --- ENUMS & INTERFACES (Matching Backend) ---
export enum SurgeryStatus {
  SCHEDULED = "SCHEDULED",
  PRE_OP_PREPARATION = "PRE_OP_PREPARATION",
  IN_PROGRESS = "IN_PROGRESS",
  RECOVERY = "RECOVERY",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum UrgencyLevel {
  ELECTIVE = "ELECTIVE",
  URGENT = "URGENT",
  EMERGENCY = "EMERGENCY",
}

export enum AnesthesiaType {
  GENERAL = "GENERAL",
  REGIONAL = "REGIONAL",
  LOCAL = "LOCAL",
  SPINAL = "SPINAL",
  EPIDURAL = "EPIDURAL",
  SEDATION = "SEDATION",
}

export enum SurgicalRole {
  PRIMARY_SURGEON = "PRIMARY_SURGEON",
  ASSISTING_SURGEON = "ASSISTING_SURGEON",
  ANAESTHETIST = "ANAESTHETIST",
  SCRUB_NURSE = "SCRUB_NURSE",
  CIRCULATING_NURSE = "CIRCULATING_NURSE",
  THEATRE_TECHNICIAN = "THEATRE_TECHNICIAN",
}

export interface ISurgeryCase {
  _id: string;
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
  patient: {
    _id: string;
    firstName: string;
    lastName: string;
    mrn: string;
    gender: string;
    dateOfBirth: string;
  };
  leadSurgeon: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  surgicalTeam: Array<{
    userId: { _id: string; firstName: string; lastName: string };
    role: SurgicalRole;
    credentialVerified: boolean;
  }>;
  preOpAssessment?: {
    asaClassification?: string;
    clearedForSurgery: boolean;
    clearedAt?: string;
    pregnancyStatus?: string;
    vteRiskScore?: string;
  };
  consent?: {
    procedureConsent: boolean;
    anesthesiaConsent: boolean;
    bloodTransfusionConsent: boolean;
    signedByPatient: boolean;
    witnessName?: string;
  };
  whoChecklist: {
    signIn: { completed: boolean; completedAt?: string };
    timeOut: { completed: boolean; completedAt?: string };
    signOut: { completed: boolean; completedAt?: string };
  };
  vitalsTimeline: Array<{
    timestamp: string;
    bpSystolic: number;
    bpDiastolic: number;
    heartRate: number;
    spO2: number;
    tempCelsius: number;
    etCO2?: number;
  }>;
  intraopDocs?: {
    incisionTime?: string;
    closureTime?: string;
    operativeDiagnosis?: string;
    surgicalFindings?: string;
    eblMl?: number;
  };
}

// --- MOCK DATA FOR VISUALIZATION ---
const INITIAL_CASES: ISurgeryCase[] = [
  {
    _id: "surg-101",
    theatreId: "OT-1 (Main)",
    procedureName: "Laparoscopic Cholecystectomy",
    icdCode: "K80.20",
    urgency: UrgencyLevel.ELECTIVE,
    status: SurgeryStatus.IN_PROGRESS,
    scheduledStartTime: new Date(Date.now() - 3600000).toISOString(),
    scheduledEndTime: new Date(Date.now() + 3600000).toISOString(),
    actualStartTime: new Date(Date.now() - 3000000).toISOString(),
    anesthesiaType: AnesthesiaType.GENERAL,
    patient: {
      _id: "p-1",
      firstName: "Eleanor",
      lastName: "Vane",
      mrn: "MRN-90218",
      gender: "Female",
      dateOfBirth: "1988-04-12",
    },
    leadSurgeon: { _id: "doc-1", firstName: "David", lastName: "Adeleke" },
    surgicalTeam: [
      { userId: { _id: "doc-1", firstName: "David", lastName: "Adeleke" }, role: SurgicalRole.PRIMARY_SURGEON, credentialVerified: true },
      { userId: { _id: "doc-2", firstName: "Sarah", lastName: "Jenkins" }, role: SurgicalRole.ANAESTHETIST, credentialVerified: true },
      { userId: { _id: "nur-1", firstName: "Grace", lastName: "Okonkwo" }, role: SurgicalRole.SCRUB_NURSE, credentialVerified: true },
    ],
    preOpAssessment: { asaClassification: "ASA_2", clearedForSurgery: true, clearedAt: new Date().toISOString() },
    consent: { procedureConsent: true, anesthesiaConsent: true, bloodTransfusionConsent: true, signedByPatient: true, witnessName: "Nurse Grace" },
    whoChecklist: {
      signIn: { completed: true, completedAt: new Date(Date.now() - 3600000).toISOString() },
      timeOut: { completed: true, completedAt: new Date(Date.now() - 3000000).toISOString() },
      signOut: { completed: false },
    },
    vitalsTimeline: [
      { timestamp: new Date(Date.now() - 2400000).toISOString(), bpSystolic: 122, bpDiastolic: 78, heartRate: 72, spO2: 99, tempCelsius: 36.6, etCO2: 35 },
      { timestamp: new Date(Date.now() - 1200000).toISOString(), bpSystolic: 118, bpDiastolic: 75, heartRate: 68, spO2: 100, tempCelsius: 36.5, etCO2: 36 },
    ],
    intraopDocs: { incisionTime: new Date(Date.now() - 3000000).toISOString(), operativeDiagnosis: "Acute Cholecystitis", eblMl: 50 },
  },
  {
    _id: "surg-102",
    theatreId: "OT-2 (Trauma)",
    procedureName: "Emergency Appendectomy",
    icdCode: "K35.80",
    urgency: UrgencyLevel.EMERGENCY,
    status: SurgeryStatus.PRE_OP_PREPARATION,
    scheduledStartTime: new Date().toISOString(),
    scheduledEndTime: new Date(Date.now() + 5400000).toISOString(),
    anesthesiaType: AnesthesiaType.GENERAL,
    patient: {
      _id: "p-2",
      firstName: "Amina",
      lastName: "Bello",
      mrn: "MRN-77312",
      gender: "Female",
      dateOfBirth: "1999-11-23",
    },
    leadSurgeon: { _id: "doc-3", firstName: "Marcus", lastName: "Thorne" },
    surgicalTeam: [
      { userId: { _id: "doc-3", firstName: "Marcus", lastName: "Thorne" }, role: SurgicalRole.PRIMARY_SURGEON, credentialVerified: true },
    ],
    preOpAssessment: { asaClassification: "ASA_1", clearedForSurgery: true },
    consent: { procedureConsent: true, anesthesiaConsent: true, bloodTransfusionConsent: false, signedByPatient: true },
    whoChecklist: {
      signIn: { completed: true, completedAt: new Date().toISOString() },
      timeOut: { completed: false },
      signOut: { completed: false },
    },
    vitalsTimeline: [],
  },
];

export default function SurgeryPage() {
  const [cases, setCases] = useState<ISurgeryCase[]>(INITIAL_CASES);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedCase, setSelectedCase] = useState<ISurgeryCase | null>(null);

  // Modals state
  const [isScheduleOpen, setIsScheduleOpen] = useState<boolean>(false);
  const [isPreOpOpen, setIsPreOpOpen] = useState<boolean>(false);
  const [isWHOChecklistOpen, setIsWHOChecklistOpen] = useState<boolean>(false);
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState<boolean>(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<"overview" | "team" | "preop" | "whochecklist" | "intraop">("overview");

  // Scheduling Form
  const [scheduleForm, setScheduleForm] = useState({
    patientName: "",
    mrn: "",
    procedureName: "",
    theatreId: "OT-1 (Main)",
    urgency: UrgencyLevel.ELECTIVE,
    anesthesiaType: AnesthesiaType.GENERAL,
    scheduledStartTime: "",
    scheduledEndTime: "",
  });

  // Intraop Vitals Form
  const [vitalsForm, setVitalsForm] = useState({
    bpSystolic: 120,
    bpDiastolic: 80,
    heartRate: 75,
    spO2: 98,
    tempCelsius: 36.8,
    etCO2: 35,
  });

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.patient.firstName.toLowerCase().includes(search.toLowerCase()) ||
      c.patient.lastName.toLowerCase().includes(search.toLowerCase()) ||
      c.patient.mrn.toLowerCase().includes(search.toLowerCase()) ||
      c.procedureName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handlers
  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newCase: ISurgeryCase = {
      _id: `surg-${Date.now()}`,
      theatreId: scheduleForm.theatreId,
      procedureName: scheduleForm.procedureName,
      urgency: scheduleForm.urgency,
      status: SurgeryStatus.SCHEDULED,
      scheduledStartTime: scheduleForm.scheduledStartTime || new Date().toISOString(),
      scheduledEndTime: scheduleForm.scheduledEndTime || new Date(Date.now() + 7200000).toISOString(),
      anesthesiaType: scheduleForm.anesthesiaType,
      patient: {
        _id: `p-${Date.now()}`,
        firstName: scheduleForm.patientName.split(" ")[0] || "Patient",
        lastName: scheduleForm.patientName.split(" ")[1] || "Record",
        mrn: scheduleForm.mrn || "MRN-PENDING",
        gender: "Unspecified",
        dateOfBirth: "1990-01-01",
      },
      leadSurgeon: { _id: "doc-1", firstName: "David", lastName: "Adeleke" },
      surgicalTeam: [],
      whoChecklist: { signIn: { completed: false }, timeOut: { completed: false }, signOut: { completed: false } },
      vitalsTimeline: [],
    };
    setCases([newCase, ...cases]);
    setIsScheduleOpen(false);
  };

  const handleAddVitals = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    const newLog = {
      timestamp: new Date().toISOString(),
      ...vitalsForm,
    };

    const updated = cases.map((c) => {
      if (c._id === selectedCase._id) {
        return { ...c, vitalsTimeline: [...c.vitalsTimeline, newLog] };
      }
      return c;
    });

    setCases(updated);
    setSelectedCase({ ...selectedCase, vitalsTimeline: [...selectedCase.vitalsTimeline, newLog] });
    setIsVitalsModalOpen(false);
  };

  const handleToggleWHOStep = (stage: "signIn" | "timeOut" | "signOut") => {
    if (!selectedCase) return;
    const currentStage = selectedCase.whoChecklist[stage];
    const isCompleted = !currentStage.completed;

    const updatedChecklist = {
      ...selectedCase.whoChecklist,
      [stage]: { completed: isCompleted, completedAt: isCompleted ? new Date().toISOString() : undefined },
    };

    const updatedCase = { ...selectedCase, whoChecklist: updatedChecklist };
    setCases(cases.map((c) => (c._id === selectedCase._id ? updatedCase : c)));
    setSelectedCase(updatedCase);
  };

  const getStatusBadge = (status: SurgeryStatus) => {
    switch (status) {
      case SurgeryStatus.IN_PROGRESS:
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 animate-pulse">In Progress</span>;
      case SurgeryStatus.PRE_OP_PREPARATION:
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Pre-Op Prep</span>;
      case SurgeryStatus.SCHEDULED:
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Scheduled</span>;
      case SurgeryStatus.COMPLETED:
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">Completed</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">{status}</span>;
    }
  };

  const getUrgencyBadge = (urgency: UrgencyLevel) => {
    if (urgency === UrgencyLevel.EMERGENCY) {
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600 border border-red-200">EMERGENCY</span>;
    }
    if (urgency === UrgencyLevel.URGENT) {
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-600 border border-amber-200">URGENT</span>;
    }
    return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">ELECTIVE</span>;
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 text-slate-800">
      {/* --- PAGE HEADER --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Syringe className="w-7 h-7 text-[#1b7b68]" />
            Operating Theatre Management
          </h1>
          <p className="text-sm text-slate-500">Central Theatre Scheduling, Surgical Safety & Intraoperative Tracking</p>
        </div>
        <button
          onClick={() => setIsScheduleOpen(true)}
          className="bg-[#1b7b68] hover:bg-[#156354] text-white px-5 py-2.5 rounded-2xl text-xs font-semibold shadow-sm transition-all duration-200 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Schedule Surgery
        </button>
      </div>

      {/* --- METRICS / KPI GRID --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-[#e8f5f3] rounded-2xl text-[#1b7b68]">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Scheduled Today</p>
            <p className="text-2xl font-bold text-slate-900">{cases.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 rounded-2xl text-emerald-600">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Active Procedures</p>
            <p className="text-2xl font-bold text-slate-900">{cases.filter((c) => c.status === SurgeryStatus.IN_PROGRESS).length}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 rounded-2xl text-blue-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Pre-Op Cleared</p>
            <p className="text-2xl font-bold text-slate-900">{cases.filter((c) => c.preOpAssessment?.clearedForSurgery).length}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-red-50 rounded-2xl text-red-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Emergency Cases</p>
            <p className="text-2xl font-bold text-slate-900">{cases.filter((c) => c.urgency === UrgencyLevel.EMERGENCY).length}</p>
          </div>
        </div>
      </div>

      {/* --- TOOLBAR & FILTERS --- */}
      <div className="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient, MRN, procedure..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          {["ALL", "SCHEDULED", "PRE_OP_PREPARATION", "IN_PROGRESS", "COMPLETED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                statusFilter === st
                  ? "bg-[#1b7b68] text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {st.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* --- MAIN DATA TABLE --- */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-4">Theatre & Time</th>
                <th className="p-4">Patient Details</th>
                <th className="p-4">Procedure & Urgency</th>
                <th className="p-4">Surgeon & Team</th>
                <th className="p-4">WHO Safety</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCases.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#1b7b68]" />
                      {c.theatreId}
                    </div>
                    <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {new Date(c.scheduledStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="font-semibold text-slate-900">
                      {c.patient.firstName} {c.patient.lastName}
                    </div>
                    <div className="text-slate-400 font-mono text-[11px]">{c.patient.mrn}</div>
                  </td>

                  <td className="p-4">
                    <div className="font-medium text-slate-800">{c.procedureName}</div>
                    <div className="mt-1 flex items-center gap-2">
                      {getUrgencyBadge(c.urgency)}
                      <span className="text-[11px] text-slate-500">{c.anesthesiaType}</span>
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="text-slate-900 font-medium">Dr. {c.leadSurgeon.lastName}</div>
                    <div className="text-slate-500 text-[11px]">{c.surgicalTeam.length} Members Assigned</div>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${c.whoChecklist.signIn.completed ? "bg-emerald-500" : "bg-slate-200"}`} title="Sign In" />
                      <span className={`w-2.5 h-2.5 rounded-full ${c.whoChecklist.timeOut.completed ? "bg-emerald-500" : "bg-slate-200"}`} title="Time Out" />
                      <span className={`w-2.5 h-2.5 rounded-full ${c.whoChecklist.signOut.completed ? "bg-emerald-500" : "bg-slate-200"}`} title="Sign Out" />
                    </div>
                  </td>

                  <td className="p-4">{getStatusBadge(c.status)}</td>

                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => {
                        setSelectedCase(c);
                        setActiveDrawerTab("overview");
                      }}
                      className="p-2 text-slate-600 hover:text-[#1b7b68] hover:bg-[#e8f5f3] rounded-xl transition-all"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                      </button>
                    {c.status === SurgeryStatus.IN_PROGRESS && (
                      <button
                        onClick={() => {
                          setSelectedCase(c);
                          setIsVitalsModalOpen(true);
                        }}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                        title="Log Intraop Vitals"
                      >
                        <HeartPulse className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- SLIDE-OVER DRAWER (Case Detail & Features) --- */}
      {selectedCase && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-xs font-mono text-[#1b7b68] font-bold">{selectedCase.theatreId}</span>
                <h2 className="text-lg font-bold text-slate-900">{selectedCase.procedureName}</h2>
                <p className="text-xs text-slate-500">
                  Patient: {selectedCase.patient.firstName} {selectedCase.patient.lastName} ({selectedCase.patient.mrn})
                </p>
              </div>
              <button onClick={() => setSelectedCase(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-100 bg-white px-6 gap-4 text-xs font-semibold text-slate-500">
              {[
                { key: "overview", label: "Overview" },
                { key: "team", label: "Surgical Team" },
                { key: "preop", label: "Pre-Op & Consent" },
                { key: "whochecklist", label: "WHO Safety" },
                { key: "intraop", label: "Intraop & Vitals" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveDrawerTab(tab.key as any)}
                  className={`py-3 border-b-2 transition-all ${
                    activeDrawerTab === tab.key ? "border-[#1b7b68] text-[#1b7b68]" : "border-transparent hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {activeDrawerTab === "overview" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50">
                      <p className="text-xs text-slate-400 font-medium">Status</p>
                      <div className="mt-1">{getStatusBadge(selectedCase.status)}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50">
                      <p className="text-xs text-slate-400 font-medium">Anesthesia Type</p>
                      <p className="text-sm font-semibold text-slate-800 mt-1">{selectedCase.anesthesiaType}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-100 space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase">Timing Metrics</h4>
                    <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                      <span className="text-slate-500">Scheduled Start</span>
                      <span className="font-semibold">{new Date(selectedCase.scheduledStartTime).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1">
                      <span className="text-slate-500">Actual Incision Time</span>
                      <span className="font-semibold">{selectedCase.intraopDocs?.incisionTime ? new Date(selectedCase.intraopDocs.incisionTime).toLocaleTimeString() : "N/A"}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeDrawerTab === "whochecklist" && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500">Digital WHO Surgical Safety Checklist Workflow:</p>
                  {[
                    { key: "signIn", title: "1. SIGN IN (Before Anesthesia)", desc: "Patient identity, site, consent & anesthesia safety verified." },
                    { key: "timeOut", title: "2. TIME OUT (Before Skin Incision)", desc: "Full team introductions, site confirmation & antibiotic prophylaxis." },
                    { key: "signOut", title: "3. SIGN OUT (Before Patient Leaves OT)", desc: "Instrument counts, specimen labeling & recovery plan." },
                  ].map((step) => {
                    const isDone = selectedCase.whoChecklist[step.key as "signIn" | "timeOut" | "signOut"].completed;
                    return (
                      <div key={step.key} className="p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{step.title}</p>
                          <p className="text-[11px] text-slate-500">{step.desc}</p>
                        </div>
                        <button
                          onClick={() => handleToggleWHOStep(step.key as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            isDone ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {isDone ? "Completed ✓" : "Mark Done"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeDrawerTab === "intraop" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-700 uppercase">Intraoperative Vitals Monitoring</h4>
                    {selectedCase.status === SurgeryStatus.IN_PROGRESS && (
                      <button
                        onClick={() => setIsVitalsModalOpen(true)}
                        className="bg-[#1b7b68] text-white px-3 py-1.5 rounded-xl text-xs font-semibold"
                      >
                        + Log Vitals
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {selectedCase.vitalsTimeline.map((log, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-2xl text-xs flex justify-between items-center">
                        <span className="font-mono text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <div className="flex gap-3 font-semibold">
                          <span className="text-slate-700">BP: {log.bpSystolic}/{log.bpDiastolic}</span>
                          <span className="text-emerald-700">HR: {log.heartRate} bpm</span>
                          <span className="text-blue-700">SpO2: {log.spO2}%</span>
                        </div>
                      </div>
                    ))}
                    {selectedCase.vitalsTimeline.length === 0 && (
                      <p className="text-xs text-slate-400 italic">No intraoperative vitals recorded yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* --- MODAL: SCHEDULE SURGERY --- */}
      {isScheduleOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">Schedule Operating Theatre Case</h3>
              <button onClick={() => setIsScheduleOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Patient Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eleanor Vane"
                  value={scheduleForm.patientName}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, patientName: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">MRN</label>
                  <input
                    type="text"
                    placeholder="MRN-80921"
                    value={scheduleForm.mrn}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, mrn: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Theatre Room</label>
                  <select
                    value={scheduleForm.theatreId}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, theatreId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl"
                  >
                    <option value="OT-1 (Main)">OT-1 (Main)</option>
                    <option value="OT-2 (Trauma)">OT-2 (Trauma)</option>
                    <option value="OT-3 (Cardiac)">OT-3 (Cardiac)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Procedure Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Total Hip Arthroplasty"
                  value={scheduleForm.procedureName}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, procedureName: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Urgency</label>
                  <select
                    value={scheduleForm.urgency}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, urgency: e.target.value as UrgencyLevel })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl"
                  >
                    <option value={UrgencyLevel.ELECTIVE}>Elective</option>
                    <option value={UrgencyLevel.URGENT}>Urgent</option>
                    <option value={UrgencyLevel.EMERGENCY}>Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Anesthesia Type</label>
                  <select
                    value={scheduleForm.anesthesiaType}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, anesthesiaType: e.target.value as AnesthesiaType })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl"
                  >
                    <option value={AnesthesiaType.GENERAL}>General</option>
                    <option value={AnesthesiaType.REGIONAL}>Regional</option>
                    <option value={AnesthesiaType.LOCAL}>Local</option>
                    <option value={AnesthesiaType.SPINAL}>Spinal</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setIsScheduleOpen(false)} className="px-4 py-2 rounded-2xl bg-slate-100 text-slate-600">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-2xl bg-[#1b7b68] text-white font-semibold">
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: INTRAOP VITALS LOG --- */}
      {isVitalsModalOpen && selectedCase && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">Log Intraoperative Vitals</h3>
              <button onClick={() => setIsVitalsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddVitals} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">BP Systolic</label>
                  <input
                    type="number"
                    value={vitalsForm.bpSystolic}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, bpSystolic: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">BP Diastolic</label>
                  <input
                    type="number"
                    value={vitalsForm.bpDiastolic}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, bpDiastolic: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">Heart Rate (bpm)</label>
                  <input
                    type="number"
                    value={vitalsForm.heartRate}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, heartRate: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">SpO2 (%)</label>
                  <input
                    type="number"
                    value={vitalsForm.spO2}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, spO2: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setIsVitalsModalOpen(false)} className="px-4 py-2 rounded-2xl bg-slate-100 text-slate-600">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-2xl bg-[#1b7b68] text-white font-semibold">
                  Record Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
