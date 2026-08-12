'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TriagePriority, TRIAGE_CONFIG } from '@/types/outpatient';
import { UserPlus, Search, X } from 'lucide-react';
import { PatientApiService } from '@/services/patient.service';
import { IPatient } from '@/types/patient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CheckInModal({ isOpen, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string; mrn: string } | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [triagePriority, setTriagePriority] = useState<TriagePriority>(TriagePriority.STANDARD);

  // Dynamic patient fetching matching AppointmentsPage logic
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

  // Debounced search on typing / initial open
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchPatients(patientSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch, isOpen, fetchPatients]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://medxverse-backend.onrender.com/api/v1/outpatients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          chiefComplaint,
          triagePriority,
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Check-in error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">New Patient Check-in</h3>
              <p className="text-xs text-slate-500">Queue an outpatient for triage and consultation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Patient Search (MRN / Name)</label>

            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Type name or MRN to search..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {loadingPatients && (
                <span className="absolute right-3 top-2.5 text-[10px] text-slate-400">Searching...</span>
              )}
            </div>

            {selectedPatient ? (
              <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200 flex justify-between items-center">
                <span className="text-xs font-medium text-blue-900">
                  {selectedPatient.name} ({selectedPatient.mrn})
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  Change
                </button>
              </div>
            ) : (
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                onChange={(e) => {
                  const p = patients.find((pat) => pat._id === e.target.value);
                  if (p) {
                    setSelectedPatient({
                      id: p._id,
                      name: `${p.firstName} ${p.lastName}`,
                      mrn: p.mrn,
                    });
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>
                  {loadingPatients ? 'Loading results...' : `-- Select Patient (${patients.length} found) --`}
                </option>
                {patients.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.firstName} {p.lastName} ({p.mrn})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Chief Complaint</label>
            <textarea
              rows={3}
              required
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="e.g. Severe persistent migraine, fever for 2 days..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Triage Priority</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.values(TriagePriority).map((pr) => {
                const config = TRIAGE_CONFIG[pr];
                const isSelected = triagePriority === pr;
                return (
                  <button
                    key={pr}
                    type="button"
                    onClick={() => setTriagePriority(pr)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-left ${isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedPatient}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-sm transition-all"
            >
              {loading ? 'Adding to Queue...' : 'Check-In Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}