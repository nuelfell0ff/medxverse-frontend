'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { NAV_CONFIG } from '@/config/navigation';
import { AccountType } from '@/types/auth.types';
import { LogOut } from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ isCollapsed, isMobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { account, logout } = useAuthStore();

  const accountType = account?.accountType || AccountType.HOSPITAL;
  const rawNavItems = NAV_CONFIG[accountType] || [];
  const userModules = account?.modules || [];

  const visibleNavItems = rawNavItems.filter((item) => {
    // 1. Always show items without a moduleKey (e.g., Overview)
    if (!item.moduleKey) return true;

    // 2. If the user object specifies active modules, check case-insensitively
    if (userModules && userModules.length > 0) {
      return userModules.some(
        (m) => m.toLowerCase() === item.moduleKey?.toLowerCase()
      );
    }

    // 3. Fallback: If no modules array exists on account, show all items by default
    return true;
  });

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Fixed Left Sidebar Container */}
      <aside
        className={`fixed top-16 left-0 bottom-0 z-40 bg-white border-r border-slate-100 flex flex-col justify-between py-3.5 transition-all duration-300 ease-in-out font-sans overflow-hidden ${
          isCollapsed ? 'w-20 px-2.5' : 'w-64 px-3'
        } ${
          isMobileOpen
            ? 'translate-x-0 w-64 px-3 shadow-2xl'
            : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Navigation Items (Scrollable without visible scrollbars) */}
        <div className="flex-1 min-h-0 space-y-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pr-0.5">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                  isActive
                    ? 'bg-[#1b7b68] text-white shadow-md shadow-[#1b7b68]/20 font-bold'
                    : 'text-slate-500 hover:text-[#1b7b68] hover:bg-[#e8f5f3]/80'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#1b7b68]'
                  }`}
                />
                {!isCollapsed && (
                  <span className="truncate tracking-wide">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>

        {/* User Card & Logout Section (Fixed Footer) */}
        <div className="shrink-0 pt-2.5 mt-2 border-t border-slate-100 space-y-2">
          {!isCollapsed ? (
            <>
              {/* Profile Card */}
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50/80 border border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-[#1b7b68] text-white flex items-center justify-center font-bold text-[11px] uppercase shadow-sm shrink-0">
                  {account?.name?.substring(0, 2) || 'RM'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">
                    {account?.name || 'Admin User'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                    {account?.email || 'admin@hospital.com'}
                  </p>
                </div>
              </div>

              {/* Red Sign Out Pill */}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-rose-200/80 text-rose-600 hover:bg-rose-50 text-[11px] font-bold transition-all duration-200 active:scale-98"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="w-full flex items-center justify-center py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
