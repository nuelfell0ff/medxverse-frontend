'use client';

import React, { useState } from 'react';
import {
  Users,
  Calendar,
  FileText,
  UserCheck,
  TrendingUp,
  Plus,
  UserPlus,
  Clock,
  AlertCircle,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(19);

  const kpiData = [
    { title: 'Total Patients', value: '1,105', trend: '+1.5%', sub: '20 more than yesterday', icon: Users },
    { title: 'Appointments', value: '145', trend: '+1.5%', sub: '20 more than yesterday', icon: Calendar },
    { title: 'Invoices', value: '347', trend: '+1.5%', sub: '20 more than yesterday', icon: FileText },
    { title: 'Staff on duty', value: '24', trend: '+1.5%', sub: '20 more than yesterday', icon: UserCheck },
  ];

  const appointments = [
    { id: '1', name: 'Robert Brown', doctor: 'Dr. Michael Chen • Cardiology', time: '09:00 AM', status: 'Confirmed' },
    { id: '2', name: 'Swati Jain', doctor: 'Dr. Michael Chen • Cardiology', time: '09:00 AM', status: 'In Progress' },
    { id: '3', name: 'Youth Patel', doctor: 'Dr. Michael Chen • Cardiology', time: '09:00 AM', status: 'Waiting' },
    { id: '4', name: 'Shaileja Desai', doctor: 'Dr. Michael Chen • Cardiology', time: '09:00 AM', status: 'Confirmed' },
    { id: '5', name: 'Ritu Arora', doctor: 'Dr. Michael Chen • Cardiology', time: '09:00 AM', status: 'Confirmed' },
  ];

  const timelineTasks = [
    { id: '1', title: 'Morning Staff Meeting', time: '08:00 AM', desc: 'Discuss team task for the day.' },
    { id: '2', title: 'Patient Consultation', time: '08:00 AM', desc: 'Discuss team task for the day.' },
    { id: '3', title: 'Meeting with Guards', time: '08:00 AM', desc: 'Discuss team task for the day.' },
    { id: '4', title: 'Surgery', time: '08:00 AM', desc: 'Discuss team task for the day.' },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-in fade-in duration-300 font-sans">
      
      {/* Central Workspace (Left 8 Columns) */}
      <div className="xl:col-span-8 space-y-6">
        
        {/* Page Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Dashboard</h1>
            <p className="text-xs text-slate-400 mt-0.5">Welcome back! Here's what's happening today.</p>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-2xl shadow-sm transition-all active:scale-98">
              <Plus className="w-4 h-4 text-slate-500" />
              <span>New Appointment</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-[#1b7b68] hover:bg-[#146253] text-white text-xs font-bold rounded-2xl shadow-md shadow-[#1b7b68]/20 transition-all active:scale-98">
              <UserPlus className="w-4 h-4" />
              <span>Register Patient</span>
            </button>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiData.map((kpi, index) => {
            const Icon = kpi.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 font-semibold">{kpi.title}</span>
                  </div>
                  <span className="text-slate-300 hover:text-slate-500 cursor-pointer text-xs font-bold">•••</span>
                </div>

                <div className="flex items-baseline justify-between my-1">
                  <span className="text-2xl font-extrabold text-slate-800 tracking-tight">{kpi.value}</span>
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    <TrendingUp className="w-3 h-3" />
                    {kpi.trend}
                  </span>
                </div>

                <p className="text-[10px] text-slate-400 mt-1">{kpi.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Analytics Section (Revenue & Patient Overview Charts) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Revenue Box */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-extrabold text-slate-800">Revenue</h3>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[10px] font-bold text-slate-500">
                <span className="px-2.5 py-1 bg-[#1b7b68] text-white rounded-lg shadow-sm">Week</span>
                <span className="px-2.5 py-1 hover:text-slate-800 cursor-pointer">Month</span>
                <span className="px-2.5 py-1 hover:text-slate-800 cursor-pointer">Year</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[10px] font-semibold text-slate-400 mb-2">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#1b7b68]" /> incomes</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-300" /> incomes</span>
            </div>

            <div className="h-40 flex items-center justify-center border-b border-slate-50">
              <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                <path d="M0,50 Q45,10 90,50 T180,50 T270,20 T300,50" fill="none" stroke="#1b7b68" strokeWidth="2.5" />
                <path d="M0,60 Q45,80 90,40 T180,70 T270,40 T300,60" fill="none" stroke="#a7f3d0" strokeWidth="2" />
              </svg>
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-3">
              <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
            </div>
          </div>

          {/* Patient Overview Box */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-extrabold text-slate-800">Patient Overview</h3>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[10px] font-bold text-slate-500">
                <span className="px-2.5 py-1 bg-[#1b7b68] text-white rounded-lg shadow-sm">Week</span>
                <span className="px-2.5 py-1 hover:text-slate-800 cursor-pointer">Month</span>
                <span className="px-2.5 py-1 hover:text-slate-800 cursor-pointer">Year</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[10px] font-semibold text-slate-400 mb-2">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#1b7b68]" /> incomes</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-300" /> incomes</span>
            </div>

            <div className="h-40 flex items-end justify-between px-2 gap-2 border-b border-slate-50 pb-2">
              {[60, 85, 70, 95, 65, 80, 90].map((h, i) => (
                <div key={i} className="flex gap-1 items-end h-full w-full justify-center">
                  <div className="w-2 bg-[#1b7b68] rounded-t-md transition-all duration-300 hover:opacity-80" style={{ height: `${h}%` }} />
                  <div className="w-2 bg-teal-200 rounded-t-md transition-all duration-300 hover:opacity-80" style={{ height: `${h - 25}%` }} />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-3">
              <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
            </div>
          </div>
        </div>

        {/* Lower Grid: Today's Appointments & Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Appointments (7 cols) */}
          <div className="md:col-span-7 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-extrabold text-slate-800">Today's Appointments</h3>
              <p className="text-[10px] text-slate-400">Upcoming and ongoing appointments</p>
            </div>

            <div className="space-y-3">
              {appointments.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.name}`}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{item.name}</h4>
                      <p className="text-[10px] text-slate-400">{item.doctor}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{item.time}</span>
                    </div>

                    <span
                      className={cn(
                        'text-[10px] font-bold px-2.5 py-1 rounded-full',
                        item.status === 'Confirmed' && 'bg-emerald-50 text-emerald-600',
                        item.status === 'In Progress' && 'bg-blue-50 text-blue-600',
                        item.status === 'Waiting' && 'bg-amber-50 text-amber-600'
                      )}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts & Notifications (5 cols) */}
          <div className="md:col-span-5 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 mb-0.5">Alters & Notifications</h3>
              <p className="text-[10px] text-slate-400 mb-4">Important updates</p>

              <div className="space-y-2.5">
                <div className="p-2.5 bg-[#e8f5f3] rounded-2xl flex items-center gap-2.5 text-xs text-slate-700">
                  <AlertCircle className="w-4 h-4 text-[#1b7b68] flex-shrink-0" />
                  <span className="text-[11px] font-medium">Low stock alert: Paracetamol tablets</span>
                </div>
                <div className="p-2.5 bg-[#e8f5f3] rounded-2xl flex items-center gap-2.5 text-xs text-slate-700">
                  <AlertCircle className="w-4 h-4 text-[#1b7b68] flex-shrink-0" />
                  <span className="text-[11px] font-medium">3 appointments pending confirmation</span>
                </div>
                <div className="p-2.5 bg-[#e8f5f3] rounded-2xl flex items-center gap-2.5 text-xs text-slate-700">
                  <AlertCircle className="w-4 h-4 text-[#1b7b68] flex-shrink-0" />
                  <span className="text-[11px] font-medium">Equipment maintenance due: MRI Machine</span>
                </div>
              </div>
            </div>

            {/* Bed Occupancy & Staff Indicator */}
            <div className="space-y-3 pt-4 border-t border-slate-100 mt-4">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
                  <span>Bed Occupancy</span>
                  <span className="text-[#1b7b68]">83%</span>
                </div>
                <p className="text-[10px] text-slate-400 mb-1.5">248/300 beds occupied</p>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#1b7b68] rounded-full" style={{ width: '83%' }} />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Staff on Duty</span>
                  <span className="text-[10px] text-slate-400">Today's shift</span>
                </div>
                <span className="text-base font-extrabold text-[#1b7b68]">165</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Right Schedule Drawer (Right 4 Columns) */}
      <div className="xl:col-span-4 space-y-6">
        
        {/* Interactive Calendar Widget */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button className="p-1 text-slate-400 hover:text-slate-800 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">September 2021</h3>
            <button className="p-1 text-slate-400 hover:text-slate-800 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 mb-2">
            <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
              const isSelected = day === selectedDate;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'h-8 w-8 mx-auto rounded-full flex items-center justify-center transition-all duration-200',
                    isSelected
                      ? 'bg-[#1b7b68] text-white font-bold shadow-md shadow-[#1b7b68]/30'
                      : 'text-slate-700 hover:bg-slate-100'
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Timeline Schedule Cards */}
        <div className="space-y-3">
          {timelineTasks.map((task) => (
            <div key={task.id} className="relative pl-6">
              <div className="absolute left-0 top-5 w-3 h-3 rounded-full bg-[#1b7b68] ring-4 ring-white" />
              
              <div className="bg-[#1b7b68] text-white p-4 rounded-3xl shadow-lg shadow-[#1b7b68]/20 transition-all hover:translate-y-[-2px]">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold">{task.title}</h4>
                  <span className="text-[10px] font-semibold opacity-90">{task.time}</span>
                </div>
                <p className="text-[10px] opacity-80 mb-3">{task.desc}</p>

                <div className="flex items-center justify-between pt-2 border-t border-white/20">
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-[#1b7b68] bg-emerald-800 overflow-hidden">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`} alt="user" />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button className="p-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                    <button className="p-1 bg-white text-[#1b7b68] rounded-lg transition-colors shadow-sm">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}