'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Users,
  ClipboardCheck,
  FileText,
  Pill,
  Wrench,
  Package,
  ShieldAlert,
  Activity,
  Syringe,
  HeartPulse,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  ChevronRight,
  Eye,
  Check,
  X,
  Building2,
  Stethoscope,
  FileCheck,
  Thermometer,
  Layers,
} from 'lucide-react';

// Enums matching backend definitions
export enum SurgeryStatus {
  SCHEDULED = 'SCHEDULED',
  PRE_OP_PREPARATION = 'PRE_OP_PREPARATION',
  IN_PROGRESS = 'IN_PROGRESS',
  RECOVERY = 'RECOVERY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  POSTPONED = 'POSTPONED',
}

export enum UrgencyLevel {
  ELECTIVE = 'ELECTIVE',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

export enum AnesthesiaType {
  GENERAL = 'GENERAL',
  REGIONAL = 'REGIONAL',
  LOCAL = 'LOCAL',
  SPINAL = 'SPINAL',
  EPIDURAL = 'EPIDURAL',
  SEDATION = 'SEDATION',
  COMBINED = 'COMBINED',
}

export enum SurgicalRole {
  PRIMARY_SURGEON = 'PRIMARY_SURGEON',
  ASSISTING_SURGEON = 'ASSISTING_SURGEON',
  ANAESTHETIST = 'ANAESTHETIST',
  SCRUB_NURSE = 'SCRUB_NURSE',
  CIRCULATING_NURSE = 'CIRCULATING_NURSE',
  THEATRE_TECHNICIAN = 'THEATRE_TECHNICIAN',
}

export enum ASAClassification {
  ASA_1 = 'ASA_1',
  ASA_2 = 'ASA_2',
  ASA_3 = 'ASA_3',
  ASA_4 = 'ASA_4',
  ASA_5 = 'ASA_5',
  ASA_6 = 'ASA_6',
  ASA_E = 'ASA_E',
}

export enum SterilizationStatus {
  STERILE = 'STERILE',
  PENDING = 'PENDING',
  EXPIRED = 'EXPIRED',
}

// Interfaces matching backend models
export interface ISurgicalTeamMember {
  userId: string;
  name: string;
  role: SurgicalRole;
  credentialVerified: boolean;
  notes?: string;
}

export interface IIntraopVitalsLog {
  timestamp: string;
  bpSystolic: number;
  bpDiastolic: number;
  heartRate: number;
  spO2: number;
  respRate: number;
  tempCelsius: number;
  etCO2: number;
  ecgRhythm: string;
  notes?: string;
}

export interface ISurgeryCase {
  _id: string;
  hospitalId: string;
  patientName: string;
  patientMrn: string;
  patientAgeGender: string;
  leadSurgeonName: string;
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
  surgicalTeam: ISurgicalTeamMember[];
  preOpAssessment: {
    asaClassification: ASAClassification;
    mallampatiScore: string;
    vteRiskScore: string;
    infectionScreeningNotes: string;
    pregnancyStatus: string;
    preOpVitals: {
      bpSystolic: number;
      bpDiastolic: number;
      heartRate: number;
      tempCelsius: number;
      spO2: number;
    };
    clearedForSurgery: boolean;
    clearedAt?: string;
    clearedBy?: string;
  };
  consent: {
    procedureConsent: boolean;
    anesthesiaConsent: boolean;
    bloodTransfusionConsent: boolean;
    highRiskConsent: boolean;
    signedByPatient: boolean;
    witnessName: string;
    signedAt: string;
  };
  preOpMeds: {
    antibioticProphylaxisGiven: boolean;
    antibioticName?: string;
    anticoagulantReconciled: boolean;
    allergiesAlert: string[];
  };
  equipmentChecklist: {
    itemName: string;
    sterileStatus: SterilizationStatus;
    maintenanceOk: boolean;
    notes?: string;
  }[];
  consumablesUsed: {
    itemName: string;
    quantityUsed: number;
    unitCost: number;
    lotNumber: string;
  }[];
  whoChecklist: {
    signIn: {
      completed: boolean;
      patientIdentityConfirmed: boolean;
      siteMarked: boolean;
      consentVerified: boolean;
      pulseOximeterOn: boolean;
      allergyKnown: boolean;
      airwayRisk: boolean;
      bloodLossRiskOver500ml: boolean;
    };
    timeOut: {
      completed: boolean;
      teamIntroduced: boolean;
      confirmPatientSiteProcedure: boolean;
      antibioticProphylaxisGiven: boolean;
      imagingDisplayed: boolean;
      criticalConcernsSurgeon: string;
    };
    signOut: {
      completed: boolean;
      procedureRecorded: string;
      countsCorrect: boolean;
      specimenLabeled: boolean;
      postOpRecoveryPlan: string;
    };
  };
  intraopDocs: {
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
  };
  vitalsTimeline: IIntraopVitalsLog[];
}

// Sample Mock Data adhering to backend contracts
const MOCK_SURGERY_CASES: ISurgeryCase[] = [
  {
    _id: 'SURG-1092',
    hospitalId: 'HOSP-01',
    patientName: 'Oluwaseun Adebayo',
    patientMrn: 'MRN-88201',
    patientAgeGender: '42Y / Male',
    leadSurgeonName: 'Dr. Chidi Okezie',
    theatreId: 'OT-1 (Main Surgical Suite)',
    procedureName: 'Laparoscopic Cholecystectomy',
    icdCode: 'K80.20',
    urgency: UrgencyLevel.ELECTIVE,
    status: SurgeryStatus.IN_PROGRESS,
    scheduledStartTime: '2026-08-17T08:30:00Z',
    scheduledEndTime: '2026-08-17T11:00:00Z',
    actualStartTime: '2026-08-17T08:40:00Z',
    anesthesiaType: AnesthesiaType.GENERAL,
    surgicalTeam: [
      { userId: 'USR-1', name: 'Dr. Chidi Okezie', role: SurgicalRole.PRIMARY_SURGEON, credentialVerified: true },
      { userId: 'USR-2', name: 'Dr. Amina Bello', role: SurgicalRole.ASSISTING_SURGEON, credentialVerified: true },
      { userId: 'USR-3', name: 'Dr. Kemi Akintola', role: SurgicalRole.ANAESTHETIST, credentialVerified: true },
      { userId: 'USR-4', name: 'Sr. Grace Danjuma', role: SurgicalRole.SCRUB_NURSE, credentialVerified: true },
      { userId: 'USR-5', name: 'Nurse Paul Enenche', role: SurgicalRole.CIRCULATING_NURSE, credentialVerified: true },
      { userId: 'USR-6', name: 'Tech Samuel Adams', role: SurgicalRole.THEATRE_TECHNICIAN, credentialVerified: true },
    ],
    preOpAssessment: {
      asaClassification: ASAClassification.ASA_2,
      mallampatiScore: 'CLASS_I',
      vteRiskScore: 'Moderate (Caprini 3)',
      infectionScreeningNotes: 'COVID-19 Negative, MRSA Clearance Positive',
      pregnancyStatus: 'NOT_APPLICABLE',
      preOpVitals: { bpSystolic: 124, bpDiastolic: 82, heartRate: 74, tempCelsius: 36.6, spO2: 99 },
      clearedForSurgery: true,
      clearedAt: '2026-08-17T07:15:00Z',
      clearedBy: 'Dr. Kemi Akintola',
    },
    consent: {
      procedureConsent: true,
      anesthesiaConsent: true,
      bloodTransfusionConsent: true,
      highRiskConsent: false,
      signedByPatient: true,
      witnessName: 'Nurse Grace Danjuma',
      signedAt: '2026-08-16T18:30:00Z',
    },
    preOpMeds: {
      antibioticProphylaxisGiven: true,
      antibioticName: 'Cefazolin 2g IV (30m pre-incision)',
      anticoagulantReconciled: true,
      allergiesAlert: ['Penicillin (Mild Rash)'],
    },
    equipmentChecklist: [
      { itemName: 'HD Laparoscopic Tower & Camera', sterileStatus: SterilizationStatus.STERILE, maintenanceOk: true },
      { itemName: 'Harmonic Scalpel Generator', sterileStatus: SterilizationStatus.STERILE, maintenanceOk: true },
      { itemName: 'Laparoscopic Major Tray #04', sterileStatus: SterilizationStatus.STERILE, maintenanceOk: true },
      { itemName: 'CO2 Insufflator & Tubing', sterileStatus: SterilizationStatus.STERILE, maintenanceOk: true },
    ],
    consumablesUsed: [
      { itemName: '10mm Trocar Set', quantityUsed: 2, unitCost: 15000, lotNumber: 'LOT-99201' },
      { itemName: '5mm Trocar Set', quantityUsed: 2, unitCost: 12000, lotNumber: 'LOT-99202' },
      { itemName: 'Polymeric Surgical Clips (Medium-Large)', quantityUsed: 6, unitCost: 4500, lotNumber: 'LOT-8831' },
      { itemName: '3-0 Vicryl Sutures', quantityUsed: 3, unitCost: 2100, lotNumber: 'LOT-4412' },
    ],
    whoChecklist: {
      signIn: {
        completed: true,
        patientIdentityConfirmed: true,
        siteMarked: true,
        consentVerified: true,
        pulseOximeterOn: true,
        allergyKnown: true,
        airwayRisk: false,
        bloodLossRiskOver500ml: false,
      },
      timeOut: {
        completed: true,
        teamIntroduced: true,
        confirmPatientSiteProcedure: true,
        antibioticProphylaxisGiven: true,
        imagingDisplayed: true,
        criticalConcernsSurgeon: 'Adhesions expected from prior appendectomy.',
      },
      signOut: {
        completed: false,
        procedureRecorded: '',
        countsCorrect: false,
        specimenLabeled: false,
        postOpRecoveryPlan: '',
      },
    },
    intraopDocs: {
      incisionTime: '2026-08-17T08:50:00Z',
      operativeDiagnosis: 'Symptomatic Cholelithiasis',
      surgicalFindings: 'Distended gallbladder with multiple cholesterol stones. Adhesions to omentum lysed cleanly.',
      techniqueNotes: 'Four-port laparoscopic approach. Cystic duct and artery clipped and divided.',
      eblMl: 45,
      fluidsAdministeredMl: 800,
      bloodProductsAdministered: 'None',
      drainsInserted: 'None',
      implantsUsed: 'None',
    },
    vitalsTimeline: [
      { timestamp: '08:45', bpSystolic: 120, bpDiastolic: 78, heartRate: 72, spO2: 99, respRate: 12, tempCelsius: 36.5, etCO2: 35, ecgRhythm: 'NSR' },
      { timestamp: '09:15', bpSystolic: 118, bpDiastolic: 75, heartRate: 68, spO2: 100, respRate: 14, tempCelsius: 36.4, etCO2: 36, ecgRhythm: 'NSR' },
      { timestamp: '09:45', bpSystolic: 122, bpDiastolic: 80, heartRate: 74, spO2: 99, respRate: 14, tempCelsius: 36.6, etCO2: 37, ecgRhythm: 'NSR' },
      { timestamp: '10:15', bpSystolic: 115, bpDiastolic: 72, heartRate: 70, spO2: 100, respRate: 13, tempCelsius: 36.6, etCO2: 35, ecgRhythm: 'NSR' },
    ],
  },
  {
    _id: 'SURG-1093',
    hospitalId: 'HOSP-01',
    patientName: 'Blessing Emeka',
    patientMrn: 'MRN-90112',
    patientAgeGender: '29Y / Female',
    leadSurgeonName: 'Dr. Fatima Umar',
    theatreId: 'OT-2 (OB/GYN Theatre)',
    procedureName: 'Emergency Lower Segment Cesarean Section (LSCS)',
    urgency: UrgencyLevel.EMERGENCY,
    status: SurgeryStatus.PRE_OP_PREPARATION,
    scheduledStartTime: '2026-08-17T11:30:00Z',
    scheduledEndTime: '2026-08-17T13:00:00Z',
    anesthesiaType: AnesthesiaType.SPINAL,
    surgicalTeam: [
      { userId: 'USR-7', name: 'Dr. Fatima Umar', role: SurgicalRole.PRIMARY_SURGEON, credentialVerified: true },
      { userId: 'USR-8', name: 'Dr. Yomi Alabi', role: SurgicalRole.ANAESTHETIST, credentialVerified: true },
      { userId: 'USR-9', name: 'Sr. Maryam Sani', role: SurgicalRole.SCRUB_NURSE, credentialVerified: true },
    ],
    preOpAssessment: {
      asaClassification: ASAClassification.ASA_1,
      mallampatiScore: 'CLASS_II',
      vteRiskScore: 'Low',
      infectionScreeningNotes: 'Clear',
      pregnancyStatus: 'POSITIVE',
      preOpVitals: { bpSystolic: 138, bpDiastolic: 88, heartRate: 92, tempCelsius: 37.0, spO2: 98 },
      clearedForSurgery: true,
      clearedAt: '2026-08-17T10:50:00Z',
      clearedBy: 'Dr. Yomi Alabi',
    },
    consent: {
      procedureConsent: true,
      anesthesiaConsent: true,
      bloodTransfusionConsent: true,
      highRiskConsent: true,
      signedByPatient: true,
      witnessName: 'Nurse Maryam Sani',
      signedAt: '2026-08-17T10:45:00Z',
    },
    preOpMeds: {
      antibioticProphylaxisGiven: true,
      antibioticName: 'Ampicillin-Sulbactam 1.5g IV',
      anticoagulantReconciled: true,
      allergiesAlert: [],
    },
    equipmentChecklist: [
      { itemName: 'OB/GYN Surgical Pack', sterileStatus: SterilizationStatus.STERILE, maintenanceOk: true },
      { itemName: 'Infant Resuscitation Warmer', sterileStatus: SterilizationStatus.STERILE, maintenanceOk: true },
    ],
    consumablesUsed: [],
    whoChecklist: {
      signIn: {
        completed: true,
        patientIdentityConfirmed: true,
        siteMarked: true,
        consentVerified: true,
        pulseOximeterOn: true,
        allergyKnown: true,
        airwayRisk: false,
        bloodLossRiskOver500ml: true,
      },
      timeOut: { completed: false, teamIntroduced: false, confirmPatientSiteProcedure: false, antibioticProphylaxisGiven: false, imagingDisplayed: false, criticalConcernsSurgeon: '' },
      signOut: { completed: false, procedureRecorded: '', countsCorrect: false, specimenLabeled: false, postOpRecoveryPlan: '' },
    },
    intraopDocs: {},
    vitalsTimeline: [],
  },
];

export default function SurgeryManagementPage() {
  const [cases] = useState<ISurgeryCase[]>(MOCK_SURGERY_CASES);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('SURG-1092');
  const [activeTab, setActiveTab] = useState<
    'schedule' | 'team' | 'preop' | 'consent' | 'equipment' | 'who' | 'intraop' | 'vitals'
  >('schedule');

  const selectedCase = cases.find((c) => c._id === selectedCaseId) || cases[0];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Syringe className="w-8 h-8 text-emerald-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">
              MedxVerse Operating Theatre Management
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time scheduling, surgical team workflows, WHO safety checklists & intraoperative logs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Book Surgery Case
          </button>
        </div>
      </div>

      {/* High Level Theatre Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Operating Suites</span>
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">4 / 6</p>
          <span className="text-[11px] text-emerald-400">OT-1 & OT-2 Currently In Use</span>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Today's Schedule</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">8 Cases</p>
          <span className="text-[11px] text-slate-400">5 Elective, 3 Emergency</span>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">In Progress</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">1 Active</p>
          <span className="text-[11px] text-amber-400">Laparoscopic Cholecystectomy</span>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Theatre Utilization Rate</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">84%</p>
          <span className="text-[11px] text-emerald-400">+6% vs weekly average</span>
        </div>
      </div>

      {/* Main Grid: Surgery Case Selector & Module Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Cases Schedule Sidebar */}
        <div className="lg:col-span-4 bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <h2 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" /> Today's OT Roster
            </h2>
            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
              {cases.length} Total
            </span>
          </div>

          <div className="space-y-3">
            {cases.map((c) => {
              const isSelected = c._id === selectedCaseId;
              return (
                <div
                  key={c._id}
                  onClick={() => setSelectedCaseId(c._id)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-emerald-500 shadow-lg'
                      : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-mono font-medium text-emerald-400">{c._id}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                        c.urgency === UrgencyLevel.EMERGENCY
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : 'bg-blue-950 text-blue-400 border border-blue-800'
                      }`}
                    >
                      {c.urgency}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-white mt-1.5">{c.procedureName}</h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {c.patientName} ({c.patientAgeGender})
                  </p>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-700/40 pt-2">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" /> {c.theatreId.split(' ')[0]}
                    </span>
                    <span
                      className={`font-medium ${
                        c.status === SurgeryStatus.IN_PROGRESS
                          ? 'text-amber-400 animate-pulse'
                          : c.status === SurgeryStatus.PRE_OP_PREPARATION
                          ? 'text-blue-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Case Clinical Workspace */}
        <div className="lg:col-span-8 bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 space-y-6">
          
          {/* Selected Case Header Summary */}
          <div className="bg-slate-800 border border-slate-700/80 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded">
                  {selectedCase._id}
                </span>
                <span className="text-xs text-slate-400">{selectedCase.theatreId}</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">{selectedCase.procedureName}</h2>
      <p className="text-xs text-slate-300 mt-0.5">
                Patient: <span className="font-semibold text-slate-100">{selectedCase.patientName}</span> ({selectedCase.patientMrn}) • Surgeon: {selectedCase.leadSurgeonName}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {selectedCase.status === SurgeryStatus.PRE_OP_PREPARATION && (
                <button className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg">
                  Start Surgery (Incision)
                </button>
              )}
              {selectedCase.status === SurgeryStatus.IN_PROGRESS && (
                <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Complete Case
                </button>
              )}
            </div>
          </div>

          {/* Module Tab Navigation */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-700/60 pb-2 scrollbar-none">
            {[
              { id: 'schedule', label: '1. Schedule', icon: Calendar },
              { id: 'team', label: '2. Team', icon: Users },
              { id: 'preop', label: '3. Pre-Op', icon: Stethoscope },
              { id: 'consent', label: '4. Consent', icon: FileCheck },
              { id: 'equipment', label: '6-7. Inventory & Equip', icon: Wrench },
              { id: 'who', label: '8. WHO Checklist', icon: ClipboardCheck },
              { id: 'intraop', label: '9-10. Intraop & Anaesth', icon: Syringe },
              { id: 'vitals', label: '11. Vitals Timeline', icon: HeartPulse },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: SCHEDULE & ROOM MANAGEMENT */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" /> Theatre Scheduling Details
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 text-xs">
                <div>
                  <span className="text-slate-400 block">Assigned Suite</span>
                  <span className="font-semibold text-white mt-1 block">{selectedCase.theatreId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Scheduled Start</span>
                  <span className="font-semibold text-white mt-1 block">
                    {new Date(selectedCase.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Estimated Duration</span>
                  <span className="font-semibold text-white mt-1 block">2 Hours 30 Mins</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Urgency Classification</span>
                  <span className="font-semibold text-emerald-400 mt-1 block">{selectedCase.urgency}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Conflict Status</span>
                  <span className="font-semibold text-emerald-400 mt-1 block flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> No Overlap Detected
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SURGICAL TEAM MANAGEMENT */}
          {activeTab === 'team' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" /> Assigned Operating Personnel
                </h3>
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" /> All Credentials Verified
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedCase.surgicalTeam.map((member, i) => (
                  <div key={i} className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-white">{member.name}</p>
                      <p className="text-[11px] text-emerald-400 font-mono mt-0.5">{member.role.replace('_', ' ')}</p>
                    </div>
                    <span className="bg-emerald-950 text-emerald-400 text-[10px] px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Privileged
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PRE-OPERATIVE ASSESSMENT */}
          {activeTab === 'preop' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-emerald-400" /> Clinical Assessment & Vitals
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 text-xs">
                <div>
                  <span className="text-slate-400 block">ASA Classification</span>
                  <span className="font-bold text-emerald-400 mt-1 block">{selectedCase.preOpAssessment.asaClassification}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Mallampati Airway</span>
                  <span className="font-semibold text-white mt-1 block">{selectedCase.preOpAssessment.mallampatiScore}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">VTE Risk Score</span>
                  <span className="font-semibold text-white mt-1 block">{selectedCase.preOpAssessment.vteRiskScore}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Infection Screen</span>
                  <span className="font-semibold text-emerald-400 mt-1 block">{selectedCase.preOpAssessment.infectionScreeningNotes}</span>
                </div>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
                <h4 className="text-xs font-semibold text-slate-300 mb-2">Pre-Op Vital Signs</h4>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-slate-900/60 p-2 rounded">
                    <span className="text-slate-400 text-[10px] block">BP</span>
                    <span className="font-mono text-white font-bold">{selectedCase.preOpAssessment.preOpVitals.bpSystolic}/{selectedCase.preOpAssessment.preOpVitals.bpDiastolic}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded">
                    <span className="text-slate-400 text-[10px] block">HR</span>
                    <span className="font-mono text-white font-bold">{selectedCase.preOpAssessment.preOpVitals.heartRate} bpm</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded">
                    <span className="text-slate-400 text-[10px] block">SpO₂</span>
                    <span className="font-mono text-white font-bold">{selectedCase.preOpAssessment.preOpVitals.spO2}%</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded">
                    <span className="text-slate-400 text-[10px] block">Temp</span>
                    <span className="font-mono text-white font-bold">{selectedCase.preOpAssessment.preOpVitals.tempCelsius}°C</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* TAB 4: DIGITAL SURGICAL CONSENT */}
          {activeTab === 'consent' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" /> Informed Consent Records
              </h3>

              <div className="space-y-2 text-xs">
                {[
                  { label: 'Surgical Procedure Consent', status: selectedCase.consent.procedureConsent },
                  { label: 'Anaesthesia Administration Consent', status: selectedCase.consent.anesthesiaConsent },
                  { label: 'Blood Transfusion Authorization', status: selectedCase.consent.bloodTransfusionConsent },
                  { label: 'High-Risk Procedure Disclosure', status: selectedCase.consent.highRiskConsent },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/60 rounded-lg border border-slate-700/60">
                    <span className="text-slate-200 font-medium">{item.label}</span>
                    {item.status ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Executed & Signed
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">Not Required</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: EQUIPMENT & CONSUMABLES */}
          {activeTab === 'equipment' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-emerald-400" /> Sterilization & Equipment Checklist
                </h3>
                <div className="space-y-2">
                  {selectedCase.equipmentChecklist.map((eq, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/60 rounded-lg border border-slate-700/60 text-xs">
                      <span className="text-white font-medium">{eq.itemName}</span>
                      <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded font-mono font-semibold">
                        {eq.sterileStatus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-400" /> Consumables & Stock Deduction
                </h3>
                <div className="space-y-2">
                  {selectedCase.consumablesUsed.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/60 rounded-lg border border-slate-700/60 text-xs">
                      <div>
                        <p className="text-white font-medium">{item.itemName}</p>
                        <p className="text-slate-400 text-[10px]">Lot: {item.lotNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-400 font-mono font-bold">{item.quantityUsed} Units</p>
                        <p className="text-slate-400 text-[10px]">₦{(item.quantityUsed * item.unitCost).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: WHO SURGICAL SAFETY CHECKLIST */}
          {activeTab === 'who' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-emerald-400" /> WHO 3-Stage Surgical Safety Checklist
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* SIGN IN */}
                <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                    <span className="font-bold text-emerald-400">1. SIGN IN</span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded">Before Anaesthesia</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-300">
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Patient identity confirmed</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Site marked</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Pulse oximeter functioning</li>
                  </ul>
                </div>

                {/* TIME OUT */}
                <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                    <span className="font-bold text-amber-400">2. TIME OUT</span>
                    <span className="text-[10px] bg-amber-950 text-amber-400 px-1.5 py-0.5 rounded">Before Incision</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-300">
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Team introduced</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Antibiotic given &lt;60m</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Imaging displayed</li>
                  </ul>
                </div>

                {/* SIGN OUT */}
                <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                    <span className="font-bold text-slate-400">3. SIGN OUT</span>
                    <span className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded">Before Leaving OT</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-400">
                    <li className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Sponge/needle counts</li>
                    <li className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Specimen labeling</li>
                    <li className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Recovery plan</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9 & 10: INTRAOPERATIVE & ANAESTHESIA */}
          {activeTab === 'intraop' && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Syringe className="w-4 h-4 text-emerald-400" /> Intraoperative Record & Anaesthesia Summary
              </h3>

              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-400 block">Incision Time</span>
                    <span className="font-mono text-white font-bold">{selectedCase.intraopDocs.incisionTime ? new Date(selectedCase.intraopDocs.incisionTime).toLocaleTimeString() : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Estimated Blood Loss (EBL)</span>
                    <span className="font-mono text-emerald-400 font-bold">{selectedCase.intraopDocs.eblMl || 0} mL</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Fluids Administered</span>
                    <span className="font-mono text-white font-bold">{selectedCase.intraopDocs.fluidsAdministeredMl || 0} mL</span>
                  </div>
                </div>

                <div className="border-t border-slate-700/60 pt-3">
                  <span className="text-slate-400 block mb-1">Surgical Findings</span>
                  <p className="text-slate-200 bg-slate-900/60 p-2.5 rounded border border-slate-800">{selectedCase.intraopDocs.surgicalFindings || 'No notes logged yet.'}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 11: INTRAOPERATIVE MONITORING TIMELINE */}
          {activeTab === 'vitals' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-emerald-400" /> Intraoperative Vitals Timeline
              </h3>

              <div className="overflow-x-auto bg-slate-800/60 rounded-xl border border-slate-700/60">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Time</th>
                      <th className="p-3">BP (mmHg)</th>
                      <th className="p-3">HR (bpm)</th>
                      <th className="p-3">SpO₂ (%)</th>
                      <th className="p-3">RR</th>
                      <th className="p-3">Temp (°C)</th>
                      <th className="p-3">EtCO₂</th>
                      <th className="p-3">ECG</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 text-slate-200">
                    {selectedCase.vitalsTimeline.map((v, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/80">
                        <td className="p-3 font-bold text-emerald-400">{v.timestamp}</td>
                        <td className="p-3">{v.bpSystolic}/{v.bpDiastolic}</td>
                        <td className="p-3">{v.heartRate}</td>
                        <td className="p-3">{v.spO2}%</td>
                        <td className="p-3">{v.respRate}</td>
                        <td className="p-3">{v.tempCelsius}°C</td>
                        <td className="p-3">{v.etCO2}</td>
                        <td className="p-3"><span className="bg-slate-900 text-emerald-400 px-1.5 py-0.5 rounded text-[10px]">{v.ecgRhythm}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
                      }
