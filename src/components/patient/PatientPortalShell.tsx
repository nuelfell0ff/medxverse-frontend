"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { AccountType } from '@/types/auth.types';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';

export default function PatientPortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, account, hasHydrated } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) router.replace('/portal/login');
    else if (account?.accountType !== AccountType.PATIENT_PORTAL || account?.userType !== 'PATIENT') {
      router.replace(account?.userType === 'STAFF' ? '/staff' : account?.accountType === AccountType.HMO ? '/hmo' : '/hms');
    }
  }, [account, hasHydrated, isAuthenticated, router]);

  const toggleSidebar = () => {
    if (window.innerWidth < 768) setMobileOpen((current) => !current);
    else setCollapsed((current) => !current);
  };

  if (!hasHydrated || !isAuthenticated || account?.accountType !== AccountType.PATIENT_PORTAL || account?.userType !== 'PATIENT') {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-[#1b7b68]" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans antialiased text-slate-800">
      <Navbar isSidebarCollapsed={collapsed} onToggleSidebar={toggleSidebar} />
      <Sidebar isCollapsed={collapsed} isMobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className={`pt-16 transition-all duration-300 ease-in-out ${collapsed ? 'md:pl-20' : 'md:pl-64'}`}>
        <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
