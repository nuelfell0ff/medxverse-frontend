'use client';

import React, { useState, useEffect } from 'react';
import { IOutpatientEncounter, IVitalSigns } from '@/types/outpatient';
import {
  Activity,
  Heart,
  Thermometer,
  Wind,
  Gauge,
  X,
  ClipboardList,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface Props {
  encounter: IOutpatientEncounter | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (encounterId: string, vitals: IVitalSigns, nursingNotes: string) => Promise<void>;
}

export function RecordVitalsModal({ encounter, isOpen, onClose, onSubmit }: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nursingNotes, setNursingNotes] = useState('');
  const [form, setForm] = useState<IVitalSigns>({
    temperature: 36.6,
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    pulseRate: 72,
    respiratoryRate: 18,
    oxygenSaturation: 98,
    height: 170,
    weight: 70,
  });

  useEffect(() => {
    if (isOpen && encounter) {
      setErrorMessage(null);
      setNursingNotes(encounter.nursingNotes || '');
      if (encounter.vitalSigns) {
        setForm({
          temperature: encounter.vitalSigns.temperature ?? 36.6,
          bloodPressureSystolic: encounter.vitalSigns.bloodPressureSystolic ?? 120,
          bloodPressureDiastolic: encounter.vitalSigns.bloodPressureDiastolic ?? 80,
          pulseRate: encounter.vitalSigns.pulseRate ?? 72,
          respiratoryRate: encounter.vitalSigns.respiratoryRate ?? 18,
          oxygenSaturation: encounter.vitalSigns.oxygenSaturation ?? 98,
          height: encounter.vitalSigns.height ?? 170,
          weight: encounter.vitalSigns.weight ?? 70,
        });
      }
    }
  }, [isOpen, encounter]);

  if (!isOpen || !encounter) return null;

  const calculatedBmi =
    form.height && form.weight
      ? (form.weight / Math.pow(form.height / 100, 2)).toFixed(1)
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const finalVitals: IVitalSigns = {
        ...form,
        bmi: calculatedBmi ? parseFloat(calculatedBmi) : undefined,
      };

      await onSubmit(encounter._id, finalVitals, nursingNotes);
      onClose();
    } catch (err: any) {
      console.error('Error submitting vitals:', err);
      setErrorMessage(err?.message || 'Failed to record vital signs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNumberInput = (field: keyof IVitalSigns, value: string, isFloat = false) => {
    if (value === '') {
      setForm((prev) => ({ ...prev, [field]: undefined }));
      return;
    }
    const parsed = isFloat ? parseFloat(value) : parseInt(value, 10);
    setForm((prev) => ({ ...prev, [field]: isNaN(parsed) ? undefined : parsed }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-xl border border-slate-100">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#e8f5f3] rounded-2xl text-[#1b7b68]">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Record Vital Signs</h3>
              <p className="text-xs text-slate-400">
                Patient:{' '}
                <span className="font-semibold text-slate-700">
                  {encounter.patientId?.firstName} {encounter.patientId?.lastName}
                </span>{' '}
                ({encounter.patientId?.mrn})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-2xl bg-red-50 border border-red-200/60 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-rose-500" /> Temp (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={form.temperature ?? ''}
                onChange={(e) => handleNumberInput('temperature', e.target.value, true)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-blue-500" /> Systolic BP
              </label>
              <input
                type="number"
                value={form.bloodPressureSystolic ?? ''}
                onChange={(e) => handleNumberInput('bloodPressureSystolic', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-indigo-500" /> Diastolic BP
              </label>
              <input
                type="number"
                value={form.bloodPressureDiastolic ?? ''}
                onChange={(e) => handleNumberInput('bloodPressureDiastolic', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-red-500" /> Pulse (bpm)
              </label>
              <input
                type="number"
                value={form.pulseRate ?? ''}
                onChange={(e) => handleNumberInput('pulseRate', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Wind className="w-3.5 h-3.5 text-cyan-500" /> SpO2 (%)
              </label>
              <input
                type="number"
                value={form.oxygenSaturation ?? ''}
                onChange={(e) => handleNumberInput('oxygenSaturation', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-emerald-500" /> Resp Rate
              </label>
              <input
                type="number"
                value={form.respiratoryRate ?? ''}
                onChange={(e) => handleNumberInput('respiratoryRate', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Height (cm)</label>
              <input
                type="number"
                value={form.height ?? ''}
                onChange={(e) => handleNumberInput('height', e.target.value, true)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Weight (kg)</label>
              <input
                type="number"
                value={form.weight ?? ''}
                onChange={(e) => handleNumberInput('weight', e.target.value, true)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Calculated BMI</label>
              <div className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 font-bold text-slate-800 border border-slate-200">
                {calculatedBmi || '--'}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <ClipboardList className="w-3.5 h-3.5 text-slate-500" /> Triage / Nursing Notes
            </label>
            <textarea
              rows={3}
              value={nursingNotes}
              onChange={(e) => setNursingNotes(e.target.value)}
              placeholder="Observation notes, allergies, immediate symptoms..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b7b68]/20 focus:border-[#1b7b68]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold rounded-2xl text-slate-500 hover:bg-slate-100 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-2xl bg-[#1b7b68] hover:bg-[#145f50] disabled:opacity-50 text-white shadow-sm transition-all flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Saving Vitals...' : 'Save Vitals & Forward to Doctor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}