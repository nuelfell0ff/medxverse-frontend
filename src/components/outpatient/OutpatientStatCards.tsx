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
      color: 'text-[#1b7b68]',
      bgColor: 'bg-[#e8f5f3]',
      borderColor: 'border-[#1b7b68]/20',
    },
    {
      label: 'In Triage',
      count: counts.inQueue,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-100',
    },
    {
      label: 'Awaiting Doctor',
      count: counts.awaitingDoctor,
      icon: UserCheck,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100',
    },
    {
      label: 'In Consult',
      count: counts.inConsultation,
      icon: Stethoscope,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
    },
    {
      label: 'Completed Today',
      count: counts.completed,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
      {stats.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className={`p-5 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {item.label}
              </span>
              <div className={`p-2.5 rounded-2xl ${item.bgColor}`}>
                <Icon className={`w-4 h-4 ${item.color}`} />
              </div>
            </div>
            <p className="text-3xl font-black tracking-tight text-slate-800">{item.count}</p>
          </div>
        );
      })}
    </div>
  );
}