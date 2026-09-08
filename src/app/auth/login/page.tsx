'use client';

import React, { useState, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/useAuthStore';
import { AccountType } from '@/types/auth.types';

import medxverseLogo from '@/assets/images/IMG_0344-Photoroom.png';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  const isJustRegistered = searchParams.get('registered') === 'true';

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await authService.login(formData);

      if (response.success && response.data) {
        const { account, token } = response.data;

        // Save authentication state
        setAuth(account, token);

        // Redirect to the appropriate workspace
        if (account.accountType === AccountType.HMO) {
          router.push('/hmo');
        } else {
          router.push('/hms');
        }
      }
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          'Authentication failed. Invalid email or password.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7f6] p-6 font-sans">
      <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-floating">

        {/* Header & Logo */}
        <div className="mb-8 flex flex-col items-center text-center">

          <Link
            href="/"
            aria-label="MedXverse home"
            className="group relative mb-4 block h-[58px] w-[180px] overflow-hidden sm:h-[62px] sm:w-[190px] lg:h-[66px] lg:w-[200px]"
          >
            <Image
              src={medxverseLogo}
              alt="MedXverse"
              priority
              fill
              sizes="200px"
              className="h-auto w-[150px] object-contain transition-opacity duration-200 group-hover:opacity-85 sm:w-[160px] lg:w-[170px]"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
          </Link>

          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Welcome Back
          </h1>

          <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-teal-600">
            Medxverse Health Management System Login
          </p>
        </div>

        {/* Just Registered Toast Alert */}
        {isJustRegistered && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />

            <span>
              Account created successfully! Please sign in with your
              credentials.
            </span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />

            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Email */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Account Email
            </label>

            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@hospital.com"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-800 transition-all focus:border-teal-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Password
            </label>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-800 transition-all focus:border-teal-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Sign In */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 py-3.5 font-semibold text-white shadow-md shadow-teal-600/20 transition-all hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Register */}
        <p className="mt-8 text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <Link
            href="/auth/register"
            className="font-semibold text-teal-600 hover:underline"
          >
            Register Account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f4f7f6] p-6">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}