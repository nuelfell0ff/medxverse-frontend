'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { AccountType } from '@/types/auth.types';
import Hero from '@/components/landing/Hero';

export default function RootPage() {
  // const router = useRouter();
  // const { account, isAuthenticated } = useAuthStore();

  // useEffect(() => {
  //   if (isAuthenticated && account) {
  //     if (account.accountType === AccountType.HMO) {
  //       router.replace('/hmo');
  //     } else {
  //       router.replace('/hms');
  //     }
  //   }
  // }, [isAuthenticated, account, router]);

  return <Hero />;
}