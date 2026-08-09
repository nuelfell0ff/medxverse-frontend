'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { AccountType } from '@/types/auth.types';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();
  const { account, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && account) {
      if (account.accountType === AccountType.HMO) {
        router.replace('/hmo');
      } else {
        router.replace('/hms');
      }
    } else {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, account, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans">
      <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-2" />
      <p className="text-xs text-slate-400 font-medium">Redirecting to Medxverse...</p>
    </div>
  );
}