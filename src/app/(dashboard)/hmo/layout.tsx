'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import { Loader2 } from 'lucide-react';

export default function HmoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, account } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);

  // Layout state for collapsing sidebar and handling mobile menu
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Prevent hydration mismatch while Zustand loads from localStorage
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Protect HMO routes
  useEffect(() => {
    if (!isMounted) return;

    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }

    // Authenticated hospital accounts should not access HMO pages
    if (account?.accountType === 'HOSPITAL') {
      router.replace('/hms');
    }
  }, [isAuthenticated, account, isMounted, router]);

  const handleToggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => !prev);
    }
  };

  // Show loading spinner while client-side store hydrates
  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#1b7b68]" />
      </div>
    );
  }

  // If not authenticated or not an HMO account,
  // hold rendering while the redirect takes effect.
  if (!isAuthenticated || account?.accountType !== 'HMO') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#1b7b68]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans antialiased text-slate-800">
      {/* Top Fixed Navbar */}
      <Navbar
        isSidebarCollapsed={isCollapsed}
        onToggleSidebar={handleToggleSidebar}
      />

      {/* Left Fixed Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Responsive View Container */}
      <div
        className={`pt-16 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        <main className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}