'use client';

import React, { useState } from 'react';
import { IOutpatientEncounter, IVitalSigns } from '@/types/outpatient';
import { Activity, Heart, Thermometer, Wind, Gauge, X, ClipboardList } from 'lucide-react';

interface Props {
  encounter: IOutpatientEncounter | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (encounterId: string, vitals: IVitalSigns, nursingNotes: string) => Promise<void>;
}

export function RecordVitalsModal({ encounter, isOpen, onClose, onSubmit }: Props) {
  const [loading, setLoading] = useState(false);
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

  if (!isOpen || !encounter) return null;

  const calculatedBmi =
    form.height && form.weight
      ? (form.weight / Math.pow(form.height / 100, 2)).toFixed(1)
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(encounter._id, { ...form, bmi: calculatedBmi ? parseFloat(calculatedBmi) : undefined }, nursingNotes);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Record Vital Signs</h3>
              <p className="text-xs text-slate-500">
                Patient: <span className="font-semibold text-slate-700">{encounter.patientId?.firstName} {encounter.patientId?.lastName}</span> ({encounter.patientId?.mrn})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-rose-500" /> Temp (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={form.temperature || ''}
                onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-blue-500" /> BP Systolic
              </label>
              <input
                type="number"
                value={form.bloodPressureSystolic || ''}
                onChange={(e) => setForm({ ...form, bloodPressureSystolic: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-indigo-500" /> BP Diastolic
              </label>
              <input
                type="number"
                value={form.bloodPressureDiastolic || ''}
                onChange={(e) => setForm({ ...form, bloodPressureDiastolic: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-red-500" /> Pulse (bpm)
              </label>
              <input
                type="number"
                value={form.pulseRate || ''}
                onChange={(e) => setForm({ ...form, pulseRate: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Wind className="w-3.5 h-3.5 text-cyan-500" /> SpO2 (%)
              </label>
              <input
                type="number"
                value={form.oxygenSaturation || ''}
                onChange={(e) => setForm({ ...form, oxygenSaturation: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-emerald-500" /> Resp Rate
              </label>
              <input
                type="number"
                value={form.respiratoryRate || ''}
                onChange={(e) => setForm({ ...form, respiratoryRate: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Height (cm)</label>
              <input
                type="number"
                value={form.height || ''}
                onChange={(e) => setForm({ ...form, height: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Weight (kg)</label>
              <input
                type="number"
                value={form.weight || ''}
                onChange={(e) => setForm({ ...form, weight: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Calculated BMI</label>
              <div className="w-full px-3 py-2 text-sm rounded-lg bg-slate-100 font-bold text-slate-800 border border-slate-200">
                {calculatedBmi || '--'}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <ClipboardList className="w-3.5 h-3.5 text-slate-500" /> Triage / Nursing Notes
            </label>
            <textarea
              rows={3}
              value={nursingNotes}
              onChange={(e) => setNursingNotes(e.target.value)}
              placeholder="Observation notes, allergies, immediate symptoms..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
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
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
            >
              {loading ? 'Saving...' : 'Save Vitals & Send to Doctor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}