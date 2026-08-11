'use client';

import React, { useState } from 'react';
import { IOutpatientEncounter } from '@/types/outpatient';
import { Stethoscope, X, Plus, Activity, FileText, CheckCircle2 } from 'lucide-react';

interface Props {
  encounter: IOutpatientEncounter | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (encounterId: string, notes: string, diagnoses: string[]) => Promise<void>;
}

export function ConsultationModal({ encounter, isOpen, onClose, onSubmit }: Props) {
  const [loading, setLoading] = useState(false);
  const [consultationNotes, setConsultationNotes] = useState('');
  const [diagnosisInput, setDiagnosisInput] = useState('');
  const [diagnoses, setDiagnoses] = useState<string[]>([]);

  if (!isOpen || !encounter) return null;

  const addDiagnosis = () => {
    if (diagnosisInput.trim() && !diagnoses.includes(diagnosisInput.trim())) {
      setDiagnoses([...diagnoses, diagnosisInput.trim()]);
      setDiagnosisInput('');
    }
  };

  const removeDiagnosis = (index: number) => {
    setDiagnoses(diagnoses.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(encounter._id, consultationNotes, diagnoses);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Clinical Consultation</h3>
              <p className="text-xs text-slate-500">
                Patient: <span className="font-semibold text-slate-700">{encounter.patientId?.firstName} {encounter.patientId?.lastName}</span> ({encounter.patientId?.mrn})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vitals Banner */}
        {encounter.vitalSigns && (
          <div className="my-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Activity className="w-3.5 h-3.5 text-blue-500" /> Recorded Vitals
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div><span className="text-slate-500">BP:</span> <strong className="text-slate-800">{encounter.vitalSigns.bloodPressureSystolic}/{encounter.vitalSigns.bloodPressureDiastolic} mmHg</strong></div>
              <div><span className="text-slate-500">Temp:</span> <strong className="text-slate-800">{encounter.vitalSigns.temperature}°C</strong></div>
              <div><span className="text-slate-500">Pulse:</span> <strong className="text-slate-800">{encounter.vitalSigns.pulseRate} bpm</strong></div>
              <div><span className="text-slate-500">SpO2:</span> <strong className="text-slate-800">{encounter.vitalSigns.oxygenSaturation}%</strong></div>
            </div>
            {encounter.nursingNotes && (
              <p className="mt-2 text-xs text-slate-600 italic border-t border-slate-200 pt-1.5">
                Nursing Notes: "{encounter.nursingNotes}"
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Chief Complaint</label>
            <div className="p-3 text-sm bg-slate-100 rounded-lg text-slate-800 border border-slate-200">
              {encounter.chiefComplaint}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" /> Clinical Notes & Assessment
            </label>
            <textarea
              rows={4}
              required
              value={consultationNotes}
              onChange={(e) => setConsultationNotes(e.target.value)}
              placeholder="Enter patient assessment, history of present illness, examination details..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Diagnoses (ICD / Free Text)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={diagnosisInput}
                onChange={(e) => setDiagnosisInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDiagnosis())}
                placeholder="Type diagnosis and click Add..."
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={addDiagnosis}
                className="px-4 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-all flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {diagnoses.map((d, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-blue-50 text-blue-800 border border-blue-200 font-medium">
                  {d}
                  <button type="button" onClick={() => removeDiagnosis(i)} className="hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
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
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Completing...' : 'Complete Consultation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}