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
        className={`fixed top-16 left-0 bottom-0 z-40 bg-white border-r border-slate-100 flex flex-col justify-between py-5 transition-all duration-300 ease-in-out font-sans ${
          isCollapsed ? 'w-20 px-3' : 'w-64 px-4'
        } ${
          isMobileOpen
            ? 'translate-x-0 w-64 px-4 shadow-2xl'
            : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Navigation Items */}
        <div className="space-y-1.5 overflow-y-auto no-scrollbar">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all duration-200 group ${
                  isActive
                    ? 'bg-[#1b7b68] text-white shadow-lg shadow-[#1b7b68]/25 font-bold'
                    : 'text-slate-500 hover:text-[#1b7b68] hover:bg-[#e8f5f3]'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
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

        {/* User Card & Logout Section */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          {!isCollapsed ? (
            <>
              {/* Profile Card */}
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-[#1b7b68] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                  {account?.name?.substring(0, 2) || 'RM'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {account?.name || 'Admin User'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {account?.email || 'admin@hospital.com'}
                  </p>
                </div>
              </div>

              {/* Red Sign Out Pill */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all duration-200 active:scale-98"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="w-full flex items-center justify-center py-3 rounded-2xl text-rose-600 hover:bg-rose-50 transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}