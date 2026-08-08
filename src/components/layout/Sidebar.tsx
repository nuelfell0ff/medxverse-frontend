'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BedDouble,
  Users,
  Calendar,
  Pill,
  TestTube,
  FileText,
  ShieldCheck,
  Building2,
  Bot,
  Activity,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const [activeModule, setActiveModule] = useState<'HMS' | 'HMO'>('HMS');

  const hmsNav = [
    { name: 'Overview', href: '/', icon: Activity },
    { name: 'IPD (Inpatient)', href: '/hms/ipd', icon: BedDouble },
    { name: 'OPD (Outpatient)', href: '/hms/opd', icon: Users },
    { name: 'Appointments', href: '/hms/appointments', icon: Calendar },
    { name: 'Pharmacy', href: '/hms/pharmacy', icon: Pill },
    { name: 'Laboratory', href: '/hms/lab', icon: TestTube },
    { name: 'Lexi Clinical AI', href: '/lexi-ai', icon: Bot },
  ];

  const hmoNav = [
    { name: 'Claims Management', href: '/hmo/claims', icon: FileText },
    { name: 'Pre-Authorizations', href: '/hmo/pre-auth', icon: ShieldCheck },
    { name: 'Provider Network', href: '/hmo/providers', icon: Building2 },
    { name: 'Enrollees & Members', href: '/hmo/members', icon: Users },
  ];

  const currentNav = activeModule === 'HMS' ? hmsNav : hmoNav;

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col h-screen sticky top-0">
      {/* Brand & Module Toggle */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-white tracking-wide">MedxVerse</span>
          <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-500/20 text-indigo-400 rounded border border-indigo-500/30">
            v1.0
          </span>
        </div>

        {/* Segmented Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-800/80 rounded-lg text-xs font-medium">
          <button
            onClick={() => setActiveModule('HMS')}
            className={cn(
              'py-1.5 rounded-md transition-all text-center',
              activeModule === 'HMS' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            )}
          >
            Hospital (HMS)
          </button>
          <button
            onClick={() => setActiveModule('HMO')}
            className={cn(
              'py-1.5 rounded-md transition-all text-center',
              activeModule === 'HMO' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            )}
          >
            Payer (HMO)
          </button>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {currentNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              )}
            >
              <Icon className="w-4 h-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}