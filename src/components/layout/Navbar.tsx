'use client';

import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import {
  PanelLeft,
  Search,
  Settings,
  Bell,
  Building2,
} from 'lucide-react';

interface NavbarProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export default function Navbar({ isSidebarCollapsed, onToggleSidebar }: NavbarProps) {
  const { account } = useAuthStore();
  const isHmo = account?.accountType === 'HMO';

  // Dynamic hospital or account name
  const hospitalName = account?.name || 'Hospital';

  return (
    <header className="fixed top-0 left-0 right-0 w-full h-16 bg-white/95 backdrop-blur-md border-b border-slate-100 z-50 px-4 md:px-6 flex items-center justify-between transition-all duration-300 font-sans">
      {/* Left: Brand Logo & Gemini-Style Sidebar Toggle */}
      <div className="flex items-center gap-3 md:gap-5 min-w-0 sm:min-w-[240px]">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-500 hover:text-[#1b7b68] hover:bg-[#e8f5f3] transition-all duration-200 active:scale-95 shrink-0"
          title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="w-5 h-5" />
        </button>

        {/* Dynamic Hospital Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1b7b68] text-white flex items-center justify-center shadow-md shadow-[#1b7b68]/20 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          
          <div className="flex flex-col hidden sm:flex">
            <span className="text-base font-bold tracking-tight text-slate-800 leading-tight">
              {hospitalName}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
              {isHmo ? 'HMO Portal' : 'Hospital Management System'}
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Clean Search Bar */}
      <div className="flex-1 max-w-xl mx-4 hidden sm:block">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search patients, appointments, doctors..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1b7b68]/20 focus:bg-white focus:border-[#1b7b68] transition-all duration-200"
          />
        </div>
      </div>

      {/* Right Actions & Profile */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
          <Settings className="w-5 h-5" />
        </button>

        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block" />

        {/* User Profile Badge */}
        <div className="flex items-center gap-3 pl-1">
          <div className="w-9 h-9 rounded-full bg-[#e8f5f3] border-2 border-[#1b7b68]/30 flex items-center justify-center text-[#1b7b68] font-bold text-xs overflow-hidden">
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${account?.name || 'Admin'}`}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
}