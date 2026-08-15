'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TriagePriority, TRIAGE_CONFIG } from '@/types/outpatient';
import { UserPlus, Search, X, AlertCircle, Loader2, Check } from 'lucide-react';
import { PatientApiService } from '@/services/patient.service';
import { IPatient } from '@/types/patient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://medxverse-backend.onrender.com';

export function CheckInModal({ isOpen, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<{
    id: string;
    name: string;
    mrn: string;
  } | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [triagePriority, setTriagePriority] = useState<TriagePriority>(
    TriagePriority.STANDARD
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dynamic patient fetching with debounce
  const fetchPatients = useCallback(async (queryTerm: string = '') => {
    try {
      setLoadingPatients(true);
      const res = await PatientApiService.getPatients({ search: queryTerm, limit: 10 });
      setPatients(res.patients || []);
    } catch (err) {
      console.error('Failed to search patients:', err);
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  // Reset form and sync search state on modal lifecycle
  useEffect(() => {
    if (!isOpen) {
      setSelectedPatient(null);
      setChiefComplaint('');
      setPatientSearch('');
      setErrorMessage(null);
      setTriagePriority(TriagePriority.STANDARD);
      return;
    }

    const timer = setTimeout(() => {
      fetchPatients(patientSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [patientSearch, isOpen, fetchPatients]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const patientId = selectedPatient?.id;
    if (!patientId) {
      setErrorMessage('Please select a valid patient record.');
      return;
    }

    if (!chiefComplaint.trim()) {
      setErrorMessage('Please enter a chief complaint.');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');

      const payload = {
        patientId,
        chiefComplaint: chiefComplaint.trim(),
        triagePriority: triagePriority || TriagePriority.STANDARD,
      };

      const res = await fetch(`${API_BASE_URL}/api/v1/outpatients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        onSuccess();
        onClose();
      } else {
        const errorText =
          data.message ||
          data.error ||
          (Array.isArray(data.errors)
            ? data.errors.map((e: any) => e.msg || e.message).join(', ')
            : null) ||
          'Failed to check in patient. Please verify input parameters.';
        setErrorMessage(errorText);
        console.error('Check-in failed:', data);
      }
    } catch (err: any) {
      console.error('Check-in network error:', err);
      setErrorMessage(
        err?.message || 'An unexpected network error occurred during check-in.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200/80 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl border border-teal-100 shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                New Patient Check-in
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Queue an outpatient for triage and clinical consultation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Patient Selection */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block tracking-wide">
              Patient Search (MRN / Name)
            </label>

            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Type name or MRN to search..."
                className="w-full pl-9 pr-24 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
              />
              {loadingPatients && (
                <span className="absolute right-3.5 top-3 text-[10px] font-semibold text-teal-600 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-teal-600" /> Searching...
                </span>
              )}
            </div>

            {selectedPatient ? (
              <div className="p-3 bg-teal-50/80 rounded-xl border border-teal-200/80 flex justify-between items-center shadow-2xs">
                <div>
                  <p className="text-xs font-bold text-teal-950">{selectedPatient.name}</p>
                  <p className="text-[11px] font-medium text-teal-700">MRN: {selectedPatient.mrn}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="px-2.5 py-1 text-xs font-semibold text-teal-700 hover:text-teal-900 hover:bg-teal-100 rounded-lg transition-colors"
                >
                  Change
                </button>
              </div>
            ) : (
              <select
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
                onChange={(e) => {
                  const p = patients.find(
                    (pat) => (pat._id || (pat as any).id) === e.target.value
                  );
                  if (p) {
                    setSelectedPatient({
                      id: p._id || (p as any).id,
                      name: `${p.firstName} ${p.lastName}`,
                      mrn: p.mrn,
                    });
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>
                  {loadingPatients
                    ? 'Searching patient records...'
                    : `-- Select Patient (${patients.length} found) --`}
                </option>
                {patients.map((p) => {
                  const patientId = p._id || (p as any).id;
                  return (
                    <option key={patientId} value={patientId}>
                      {p.firstName} {p.lastName} ({p.mrn})
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Chief Complaint Input */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block tracking-wide">
              Chief Complaint
            </label>
            <textarea
              rows={3}
              required
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="e.g., Severe persistent migraine, fever for 2 days, difficulty breathing..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all leading-relaxed"
            />
          </div>

          {/* Triage Priority Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block tracking-wide">
              Triage Priority Level
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.values(TriagePriority).map((pr) => {
                const config = TRIAGE_CONFIG[pr];
                const isSelected = triagePriority === pr;
                return (
                  <button
                    key={pr}
                    type="button"
                    onClick={() => setTriagePriority(pr)}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/90 text-teal-900 ring-2 ring-teal-500/20 shadow-2xs'
                        : 'border-slate-200/90 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{config?.label || pr}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedPatient}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white shadow-sm transition-all flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {loading ? 'Adding to Queue...' : 'Check-In Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}