'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Activity,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  Plus,
  HeartPulse,
  Thermometer,
  ShieldAlert,
  Clock,
  MapPin,
  CheckCircle2,
  FileText,
  Receipt,
} from 'lucide-react';
import {
  IPatient,
  Gender,
  BloodGroup,
  Genotype,
  CreatePatientDTO,
  AddVitalsDTO,
} from '@/types/patient';
import { PatientApiService } from '@/services/patient.service';

export default function PatientsPage() {
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modal / Drawer States
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isVitalsOpen, setIsVitalsOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<IPatient | null>(null);

  type PatientBillingSummary = {
    totalCharges?: number | string | null;
    totalPaid?: number | string | null;
    totalPayments?: number | string | null;
    outstandingBalance?: number | string | null;
  };

  const [patientBillingSummary, setPatientBillingSummary] =
    useState<PatientBillingSummary | null>(null);
  const [loadingPatientBilling, setLoadingPatientBilling] = useState(false);
  const [patientBillingError, setPatientBillingError] = useState<string | null>(null);

  // Form States
  const [registerForm, setRegisterForm] = useState<CreatePatientDTO>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: Gender.MALE,
    phone: '',
    email: '',
    address: '',
    bloodGroup: 'O+',
    genotype: 'AA',
    policyNumber: '',
  });

  const [vitalsForm, setVitalsForm] = useState<AddVitalsDTO>({
    temperature: 36.6,
    systolicBp: 120,
    diastolicBp: 80,
    pulseRate: 72,
    respiratoryRate: 18,
    spo2: 98,
    weight: 70,
    height: 175,
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'https://medxverse-backend.onrender.com';

  const loadPatientBilling = useCallback(async (patientId: string) => {
    setLoadingPatientBilling(true);
    setPatientBillingError(null);
    setPatientBillingSummary(null);

    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('token')
          : null;

      const response = await fetch(
        `${API_BASE_URL}/api/v1/billing/patients/${encodeURIComponent(patientId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },
        }
      );

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          json?.message ||
            json?.error ||
            'Unable to load patient billing information.'
        );
      }

      const billingData = json?.data ?? json;
      setPatientBillingSummary(billingData?.summary ?? null);
    } catch (err: any) {
      console.error('Failed to load patient billing:', err);
      setPatientBillingError(
        err?.message || 'Unable to load patient billing information.'
      );
      setPatientBillingSummary(null);
    } finally {
      setLoadingPatientBilling(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedPatient?._id) {
      setPatientBillingSummary(null);
      setPatientBillingError(null);
      setLoadingPatientBilling(false);
      return;
    }

    loadPatientBilling(selectedPatient._id);
  }, [selectedPatient?._id, loadPatientBilling]);

  // Fetch Patients List
  const loadPatients = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await PatientApiService.getPatients({ search, page, limit: 8 });
      setPatients(res.patients);
      setTotalPages(res.pages || 1);
      setTotalCount(res.total || 0);
    } catch (err: any) {
      console.error(err);
      // Fallback preview data for prototype visual check
      setPatients(mockPatients);
      setTotalPages(1);
      setTotalCount(mockPatients.length);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPatients();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadPatients]);

  // Handle Register Form Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // 1. Strip out empty string values ("") so Mongoose doesn't validate blank optional fields
      const sanitizedPayload = Object.fromEntries(
        Object.entries(registerForm).filter(([_, value]) => value !== '' && value !== null)
      ) as CreatePatientDTO;

      await PatientApiService.registerPatient(sanitizedPayload);
      setIsRegisterOpen(false);
      resetRegisterForm();
      loadPatients();
    } catch (err: any) {
      alert(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Add Vitals Submit
  const handleVitalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setSubmitting(true);
    try {
      const updated = await PatientApiService.recordVitals(selectedPatient._id, vitalsForm);
      setSelectedPatient(updated);
      setIsVitalsOpen(false);
      loadPatients();
    } catch (err: any) {
      alert(err.message || 'Failed to record vitals');
    } finally {
      setSubmitting(false);
    }
  };

  const resetRegisterForm = () => {
    setRegisterForm({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: Gender.MALE,
      phone: '',
      email: '',
      address: '',
      bloodGroup: 'O+',
      genotype: 'AA',
      policyNumber: '',
    });
  };

  const formatPatientBillingMoney = (value?: number | string | null) => {
    const amount = Number(value ?? 0);

    if (!Number.isFinite(amount)) {
      return '₦0.00';
    }

    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const calculateAge = (dobString: string) => {
    if (!dobString) return 'N/A';
    const dob = new Date(dobString);
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 animate-in fade-in duration-300">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
            Patients Registry
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage hospital records, medical history, and vital signs.
          </p>
        </div>

        <button
          onClick={() => setIsRegisterOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1b7b68] hover:bg-[#146253] text-white text-xs font-bold rounded-2xl shadow-md shadow-[#1b7b68]/20 transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Patient</span>
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#e8f5f3] flex items-center justify-center text-[#1b7b68]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Registered</p>
            <p className="text-xl font-extrabold text-slate-800 tracking-tight">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Vitals Recorded</p>
            <p className="text-xl font-extrabold text-slate-800 tracking-tight">
              {patients.reduce((acc, p) => acc + (p.vitalsHistory?.length || 0), 0)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Flagged Cases</p>
            <p className="text-xl font-extrabold text-slate-800 tracking-tight">
              {patients.filter((p) => p.isFlagged).length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Active Allergies</p>
            <p className="text-xl font-extrabold text-slate-800 tracking-tight">
              {patients.reduce((acc, p) => acc + (p.allergies?.length || 0), 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Control Toolbar: Search & Filter */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, MRN, or phone..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-2xl text-xs font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Patients Table Container */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-5">Patient Name</th>
                <th className="py-3.5 px-4">MRN</th>
                <th className="py-3.5 px-4">Age / Gender</th>
                <th className="py-3.5 px-4">Contact Details</th>
                <th className="py-3.5 px-4">Blood & Genotype</th>
                <th className="py-3.5 px-4">Latest Vitals</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="p-5"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                    <td className="p-4"><div className="h-4 bg-slate-100 rounded w-20" /></td>
                    <td className="p-4"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                    <td className="p-4"><div className="h-4 bg-slate-100 rounded w-28" /></td>
                    <td className="p-4"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                    <td className="p-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                    <td className="p-5 text-right"><div className="h-4 bg-slate-100 rounded w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    No patients found matching your query.
                  </td>
                </tr>
              ) : (
                patients.map((patient) => {
                  const latestVital = patient.vitalsHistory?.[patient.vitalsHistory.length - 1];

                  return (
                    <tr
                      key={patient._id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#e8f5f3] border border-[#1b7b68]/30 flex items-center justify-center text-[#1b7b68] font-bold text-xs overflow-hidden">
                            <img
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${patient.firstName}_${patient.lastName}`}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-800">
                                {patient.firstName} {patient.lastName}
                              </p>
                              {patient.isFlagged && (
                                <span className="w-2 h-2 rounded-full bg-rose-500" title={patient.flagReason || 'Flagged'} />
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400">
                              Registered: {new Date(patient.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* MRN */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#1b7b68]">
                        {patient.mrn}
                      </td>

                      {/* Age / Gender */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {calculateAge(patient.dateOfBirth)} yrs •{' '}
                        <span className="capitalize">{patient.gender?.toLowerCase()}</span>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{patient.phone}</span>
                          </div>
                          {patient.email && (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-[140px]">{patient.email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Blood & Genotype */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-md font-bold text-[10px]">
                            {patient.bloodGroup || 'N/A'}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-bold text-[10px]">
                            {patient.genotype || 'N/A'}
                          </span>
                        </div>
                      </td>

                      {/* Latest Vitals */}
                      <td className="py-3.5 px-4">
                        {latestVital ? (
                          <div className="text-[11px] space-y-0.5">
                            <p className="font-semibold text-slate-700">
                              {latestVital.systolicBp}/{latestVital.diastolicBp} mmHg
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {latestVital.temperature}°C • {latestVital.pulseRate} bpm
                            </p>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No vitals logged</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedPatient(patient);
                              setIsVitalsOpen(true);
                            }}
                            className="p-1.5 bg-slate-50 hover:bg-[#e8f5f3] text-slate-600 hover:text-[#1b7b68] rounded-xl transition-all"
                            title="Record Vitals"
                          >
                            <HeartPulse className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setSelectedPatient(patient)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-[#1b7b68]/10 hover:bg-[#1b7b68] text-[#1b7b68] hover:text-white rounded-xl text-xs font-bold transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Chart</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>
            Showing page <strong className="text-slate-800">{page}</strong> of{' '}
            <strong className="text-slate-800">{totalPages}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ------------------- MODAL 1: REGISTER PATIENT ------------------- */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#e8f5f3] flex items-center justify-center text-[#1b7b68]">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800">Register New Patient</h2>
                  <p className="text-xs text-slate-400">Fill in patient demographic details</p>
                </div>
              </div>

              <button
                onClick={() => setIsRegisterOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs font-medium">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={registerForm.firstName}
                    onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68] outline-none"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={registerForm.lastName}
                    onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68] outline-none"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={registerForm.dateOfBirth}
                    onChange={(e) => setRegisterForm({ ...registerForm, dateOfBirth: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Gender *</label>
                  <select
                    value={registerForm.gender}
                    onChange={(e) => setRegisterForm({ ...registerForm, gender: e.target.value as Gender })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68] outline-none"
                  >
                    <option value={Gender.MALE}>Male</option>
                    <option value={Gender.FEMALE}>Female</option>
                    <option value={Gender.OTHER}>Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68] outline-none"
                    placeholder="+234 800 000 0000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68] outline-none"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Residential Address</label>
                  <input
                    type="text"
                    value={registerForm.address}
                    onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68] outline-none"
                    placeholder="123 Hospital Road, Lagos"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Blood Group</label>
                  <select
                    value={registerForm.bloodGroup}
                    onChange={(e) => setRegisterForm({ ...registerForm, bloodGroup: e.target.value as BloodGroup })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68] outline-none"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Genotype</label>
                  <select
                    value={registerForm.genotype}
                    onChange={(e) => setRegisterForm({ ...registerForm, genotype: e.target.value as Genotype })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68] outline-none"
                  >
                    {['AA', 'AS', 'SS', 'AC'].map((gt) => (
                      <option key={gt} value={gt}>{gt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">HMO Policy No.</label>
                  <input
                    type="text"
                    value={registerForm.policyNumber}
                    onChange={(e) => setRegisterForm({ ...registerForm, policyNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68] outline-none"
                    placeholder="POL-99201"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-5 py-2.5 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-2xl bg-[#1b7b68] hover:bg-[#146253] text-white font-bold shadow-md shadow-[#1b7b68]/20 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------- MODAL 2: RECORD VITALS ------------------- */}
      {isVitalsOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#e8f5f3] flex items-center justify-center text-[#1b7b68]">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800">Record Vitals</h2>
                  <p className="text-xs text-slate-400">
                    Patient: {selectedPatient.firstName} {selectedPatient.lastName} ({selectedPatient.mrn})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsVitalsOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVitalsSubmit} className="space-y-4 text-xs font-medium">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Systolic BP (mmHg)</label>
                  <input
                    type="number"
                    value={vitalsForm.systolicBp || ''}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, systolicBp: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    placeholder="120"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Diastolic BP (mmHg)</label>
                  <input
                    type="number"
                    value={vitalsForm.diastolicBp || ''}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, diastolicBp: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    placeholder="80"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitalsForm.temperature || ''}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    placeholder="36.6"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Pulse Rate (bpm)</label>
                  <input
                    type="number"
                    value={vitalsForm.pulseRate || ''}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, pulseRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    placeholder="72"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">SpO2 (%)</label>
                  <input
                    type="number"
                    value={vitalsForm.spo2 || ''}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, spo2: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    placeholder="98"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={vitalsForm.weight || ''}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, weight: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    placeholder="70"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsVitalsOpen(false)}
                  className="px-5 py-2.5 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-2xl bg-[#1b7b68] hover:bg-[#146253] text-white font-bold shadow-md shadow-[#1b7b68]/20 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Vitals'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------- DRAWER 3: PATIENT CHART DETAILS ------------------- */}
      {selectedPatient && !isVitalsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#e8f5f3] border-2 border-[#1b7b68]/30 flex items-center justify-center text-[#1b7b68] font-bold overflow-hidden">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedPatient.firstName}_${selectedPatient.lastName}`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </h2>
                  <p className="text-xs font-mono text-[#1b7b68] font-bold">
                    {selectedPatient.mrn} • {calculateAge(selectedPatient.dateOfBirth)} Yrs
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedPatient(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Badges */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 font-medium">Blood Group</p>
                <p className="text-sm font-extrabold text-rose-600">{selectedPatient.bloodGroup || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 font-medium">Genotype</p>
                <p className="text-sm font-extrabold text-slate-700">{selectedPatient.genotype || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 font-medium">Gender</p>
                <p className="text-sm font-extrabold text-slate-700 capitalize">
                  {selectedPatient.gender?.toLowerCase()}
                </p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-2.5 bg-slate-50/60 p-4 rounded-2xl border border-slate-100 text-xs">
              <h3 className="font-extrabold text-slate-800 border-b border-slate-200/60 pb-2">
                Contact & HMO Info
              </h3>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px]">Phone</span>
                  <span className="font-semibold">{selectedPatient.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Email</span>
                  <span className="font-semibold">{selectedPatient.email || 'N/A'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px]">Address</span>
                  <span className="font-semibold">{selectedPatient.address || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Policy Number</span>
                  <span className="font-semibold">{selectedPatient.policyNumber || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Billing Summary */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#1b7b68]" />
                  <span>Billing Summary</span>
                </h3>
              </div>

              {loadingPatientBilling ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <div className="w-4 h-4 rounded-full border-2 border-[#1b7b68]/30 border-t-[#1b7b68] animate-spin" />
                    Loading billing information...
                  </div>
                </div>
              ) : patientBillingError ? (
                <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
                  <p className="text-xs font-semibold text-rose-600">
                    {patientBillingError}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    <p className="text-[10px] font-medium text-slate-400">
                      Total Charges
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-slate-800">
                      {formatPatientBillingMoney(
                        patientBillingSummary?.totalCharges
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                    <p className="text-[10px] font-medium text-slate-400">
                      Amount Paid
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-emerald-700">
                      {formatPatientBillingMoney(
                        patientBillingSummary?.totalPaid ??
                          patientBillingSummary?.totalPayments
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                    <p className="text-[10px] font-medium text-slate-400">
                      Balance Owed
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-amber-700">
                      {formatPatientBillingMoney(
                        patientBillingSummary?.outstandingBalance
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Vitals History */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-[#1b7b68]" />
                  <span>Vitals History</span>
                </h3>
                <button
                  onClick={() => setIsVitalsOpen(true)}
                  className="text-[11px] font-bold text-[#1b7b68] hover:underline"
                >
                  + Add Vitals
                </button>
              </div>

              {selectedPatient.vitalsHistory?.length ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedPatient.vitalsHistory.slice().reverse().map((v, i) => (
                    <div key={i} className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-xs space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                        <span>{new Date(v.recordedAt).toLocaleString()}</span>
                        <span>BP: <strong className="text-slate-700">{v.systolicBp}/{v.diastolicBp}</strong> mmHg</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-[11px] font-semibold text-slate-600 pt-1">
                        <span>Temp: {v.temperature}°C</span>
                        <span>Pulse: {v.pulseRate}bpm</span>
                        <span>SpO2: {v.spo2}%</span>
                        <span>Weight: {v.weight}kg</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No vitals recorded yet.</p>
              )}
            </div>

            {/* Allergies & Medical History */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <span>Allergies</span>
              </h3>
              {selectedPatient.allergies?.length ? (
                <div className="flex flex-wrap gap-2">
                  {selectedPatient.allergies.map((alg, i) => (
                    <span key={i} className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-xs font-semibold">
                      {alg.allergen} ({alg.severity})
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No known allergies registered.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Preview Mock Data fallback
const mockPatients: IPatient[] = [
  {
    _id: '1',
    hospitalId: 'hosp1',
    mrn: 'MRN-849201',
    firstName: 'Robert',
    lastName: 'Brown',
    dateOfBirth: '1988-04-12',
    gender: Gender.MALE,
    phone: '+234 803 123 4567',
    email: 'robert.brown@example.com',
    address: '14 Ikeja Way, Lagos',
    bloodGroup: 'O+',
    genotype: 'AA',
    policyNumber: 'HMO-9021',
    vitalsHistory: [
      {
        temperature: 36.8,
        systolicBp: 120,
        diastolicBp: 80,
        pulseRate: 72,
        spo2: 99,
        weight: 78,
        recordedAt: new Date().toISOString(),
      },
    ],
    allergies: [{ allergen: 'Penicillin', reaction: 'Rashes', severity: 'MODERATE' as any }],
    medicalHistory: [],
    isFlagged: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: '2',
    hospitalId: 'hosp1',
    mrn: 'MRN-392019',
    firstName: 'Swati',
    lastName: 'Jain',
    dateOfBirth: '1995-09-24',
    gender: Gender.FEMALE,
    phone: '+234 812 987 6543',
    email: 'swati.jain@example.com',
    address: '8 Lekki Phase 1, Lagos',
    bloodGroup: 'A+',
    genotype: 'AS',
    policyNumber: 'HMO-1102',
    vitalsHistory: [],
    allergies: [],
    medicalHistory: [],
    isFlagged: true,
    flagReason: 'High Risk Hypertension',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];