'use client';

import React from 'react';
import { ConsultationStatus, IOutpatientEncounter } from '@/types/outpatient';
import { Users, Clock, Stethoscope, CheckCircle2, UserCheck } from 'lucide-react';

interface Props {
  encounters: IOutpatientEncounter[];
}

export function OutpatientStatCards({ encounters }: Props) {
  const counts = {
    total: encounters.length,
    inQueue: encounters.filter((e) => e.status === ConsultationStatus.IN_QUEUE).length,
    awaitingDoctor: encounters.filter((e) => e.status === ConsultationStatus.WAITING_FOR_DOCTOR).length,
    inConsultation: encounters.filter((e) => e.status === ConsultationStatus.IN_CONSULTATION).length,
    completed: encounters.filter((e) => e.status === ConsultationStatus.COMPLETED).length,
  };

  const stats = [
    {
      label: 'Total Inflow',
      count: counts.total,
      icon: Users,
      color: 'text-slate-600',
      bgColor: 'bg-slate-100',
      borderColor: 'border-slate-200',
    },
    {
      label: 'In Queue (Triage)',
      count: counts.inQueue,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
    {
      label: 'Awaiting Doctor',
      count: counts.awaitingDoctor,
      icon: UserCheck,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
    },
    {
      label: 'In Consultation',
      count: counts.inConsultation,
      icon: Stethoscope,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      label: 'Completed Today',
      count: counts.completed,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      {stats.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className={`p-4 bg-white rounded-xl border ${item.borderColor} shadow-sm border-l-4 transition-all hover:shadow-md`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {item.label}
              </span>
              <div className={`p-2 rounded-lg ${item.bgColor}`}>
                <Icon className={`w-4 h-4 ${item.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-slate-900">{item.count}</p>
          </div>
        );
      })}
    </div>
  );
}