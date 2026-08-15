'use client';

import React, { useState, useEffect } from 'react';
import { IOutpatientEncounter } from '@/types/outpatient';
import {
  Stethoscope,
  X,
  Plus,
  Activity,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Thermometer,
  Heart,
  Droplets,
  Wind,
} from 'lucide-react';

interface Props {
  encounter: IOutpatientEncounter | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (encounterId: string, notes: string, diagnoses: string[]) => Promise<void>;
}

export function ConsultationModal({ encounter, isOpen, onClose, onSubmit }: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [consultationNotes, setConsultationNotes] = useState('');
  const [diagnosisInput, setDiagnosisInput] = useState('');
  const [diagnoses, setDiagnoses] = useState<string[]>([]);

  // Prefill or reset state on modal lifecycle
  useEffect(() => {
    if (isOpen && encounter) {
      setErrorMessage(null);
      setConsultationNotes(encounter.consultationNotes || '');
      setDiagnoses(encounter.diagnoses || []);
      setDiagnosisInput('');
    }
  }, [isOpen, encounter]);

  if (!isOpen || !encounter) return null;

  const addDiagnosis = () => {
    const trimmed = diagnosisInput.trim();
    if (trimmed && !diagnoses.includes(trimmed)) {
      setDiagnoses([...diagnoses, trimmed]);
      setDiagnosisInput('');
    }
  };

  const removeDiagnosis = (index: number) => {
    setDiagnoses(diagnoses.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!consultationNotes.trim()) {
      setErrorMessage('Please provide consultation notes before completing.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(encounter._id, consultationNotes.trim(), diagnoses);
      onClose();
    } catch (err: any) {
      console.error('Error completing consultation:', err);
      setErrorMessage(err?.message || 'Failed to complete consultation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200/80 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl border border-teal-100 shadow-xs">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Clinical Consultation</h3>
              <p className="text-xs text-slate-500 font-medium">
                Patient:{' '}
                <span className="font-semibold text-slate-800">
                  {encounter.patientId?.firstName} {encounter.patientId?.lastName}
                </span>{' '}
                <span className="text-slate-400">({encounter.patientId?.mrn})</span>
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

        {/* Error Banner */}
        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Recorded Vitals Summary Banner */}
        {encounter.vitalSigns && (
          <div className="my-4 p-4 bg-slate-50/80 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1.5 text-teal-600">
                <Activity className="w-4 h-4" /> Recorded Vitals Summary
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-slate-100 shadow-2xs flex flex-col gap-0.5">
                <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-rose-500" /> Blood Pressure
                </span>
                <span className="font-bold text-slate-900">
                  {encounter.vitalSigns.bloodPressureSystolic}/
                  {encounter.vitalSigns.bloodPressureDiastolic}{' '}
                  <span className="text-[10px] text-slate-400 font-normal">mmHg</span>
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-100 shadow-2xs flex flex-col gap-0.5">
                <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-amber-500" /> Temperature
                </span>
                <span className="font-bold text-slate-900">
                  {encounter.vitalSigns.temperature}°C
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-100 shadow-2xs flex flex-col gap-0.5">
                <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                  <Heart className="w-3 h-3 text-teal-500" /> Pulse Rate
                </span>
                <span className="font-bold text-slate-900">
                  {encounter.vitalSigns.pulseRate}{' '}
                  <span className="text-[10px] text-slate-400 font-normal">bpm</span>
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-100 shadow-2xs flex flex-col gap-0.5">
                <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                  <Wind className="w-3 h-3 text-cyan-500" /> Oxygen Sat.
                </span>
                <span className="font-bold text-slate-900">
                  {encounter.vitalSigns.oxygenSaturation}%
                </span>
              </div>
            </div>

            {encounter.nursingNotes && (
              <p className="mt-3 text-xs text-slate-600 italic border-t border-slate-200/60 pt-2.5">
                <span className="font-semibold text-slate-700 not-italic">Triage Nursing Notes:</span> &quot;{encounter.nursingNotes}&quot;
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Chief Complaint Display */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block tracking-wide">
              Chief Complaint
            </label>
            <div className="p-3 text-sm bg-slate-50 rounded-xl text-slate-800 border border-slate-200 font-medium leading-relaxed">
              {encounter.chiefComplaint}
            </div>
          </div>

          {/* Clinical Notes & Assessment */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5 tracking-wide">
              <FileText className="w-3.5 h-3.5 text-teal-600" /> Clinical Notes & Assessment
            </label>
            <textarea
              rows={4}
              required
              value={consultationNotes}
              onChange={(e) => setConsultationNotes(e.target.value)}
              placeholder="Record clinical history, physical examination findings, system review, and general assessment details..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all leading-relaxed"
            />
          </div>

          {/* Diagnoses Input & Tags */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block tracking-wide">
              Diagnoses (ICD Code / Free Text)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={diagnosisInput}
                onChange={(e) => setDiagnosisInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addDiagnosis();
                  }
                }}
                placeholder="Enter diagnosis description or code..."
                className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
              />
              <button
                type="button"
                onClick={addDiagnosis}
                className="px-4 py-2 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {/* Diagnosis Chips */}
            {diagnoses.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {diagnoses.map((d, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-900 border border-teal-200/80 shadow-2xs"
                  >
                    {d}
                    <button
                      type="button"
                      onClick={() => removeDiagnosis(i)}
                      className="p-0.5 hover:bg-teal-200/60 rounded-full text-teal-700 hover:text-rose-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
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
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white shadow-sm transition-all flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {loading ? 'Completing...' : 'Complete Consultation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}