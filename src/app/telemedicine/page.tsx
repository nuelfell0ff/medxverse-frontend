'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

export default function LegacyTelemedicineRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const account = useAuthStore((state) => state.account);
  const sessionId = searchParams.get('sessionId');

  useEffect(() => {
    if (account?.userType === 'PATIENT') {
      router.replace(sessionId ? `/portal/telemedicine?sessionId=${encodeURIComponent(sessionId)}` : '/portal/telemedicine');
      return;
    }
    if (account?.userType === 'STAFF' && sessionId) {
      router.replace(`/staff/call/${encodeURIComponent(sessionId)}`);
      return;
    }
    router.replace(account?.userType === 'STAFF' ? '/staff/messages/consultations' : '/portal/login');
  }, [account?.userType, router, sessionId]);

  return <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">Opening your MedXVerse consultation…</div>;
}
