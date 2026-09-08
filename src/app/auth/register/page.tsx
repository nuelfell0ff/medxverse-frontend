'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  ShieldCheck,
  Mail,
  Lock,
  Phone,
  MapPin,
  Hash,
  ArrowRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';

import { AccountType } from '@/types/auth.types';
import { authService } from '@/services/auth.service';

import medxverseLogo from '@/assets/images/IMG_0344-Photoroom.png';

export default function RegisterPage() {
  const router = useRouter();

  const [accountType, setAccountType] = useState<AccountType>(
    AccountType.HOSPITAL
  );

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    code: '',
    address: '',
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
      const response = await authService.register({
        ...formData,
        accountType,
        code: formData.code.trim() ? formData.code : undefined,
        address: formData.address.trim()
          ? formData.address
          : undefined,
      });

      if (response.success) {
        // Redirect directly to login page
        router.push('/auth/login?registered=true');
      }
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          'Registration failed. Please review your details.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7f6] p-6 font-sans">
      <div className="w-full max-w-xl rounded-3xl border border-slate-100 bg-white p-8 shadow-floating">

        {/* Header & Logo */}
        <div className="mb-6 flex flex-col items-center text-center">

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
            Create Your Account
          </h1>

          <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-teal-600">
            Health Management System (MHMS)
          </p>
        </div>

        {/* Account Type Toggle */}
        <div className="mb-6">
          <label className="mb-2 block text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
            Register Account Category
          </label>

          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1.5">

            {/* Hospital */}
            <button
              type="button"
              onClick={() =>
                setAccountType(AccountType.HOSPITAL)
              }
              className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all ${
                accountType === AccountType.HOSPITAL
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="h-4 w-4" />
              Hospital / Clinic
            </button>

            {/* HMO */}
            <button
              type="button"
              onClick={() =>
                setAccountType(AccountType.HMO)
              }
              className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all ${
                accountType === AccountType.HMO
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              HMO Organization
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Organization Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              {accountType === AccountType.HOSPITAL
                ? 'Hospital / Organization Name'
                : 'HMO Name'}
            </label>

            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder={
                  accountType === AccountType.HOSPITAL
                    ? 'St. Jude Medical Center'
                    : 'Apex Health Care HMO'
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-800 transition-all focus:border-teal-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Official Email
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

            {/* Phone */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Contact Phone
              </label>

              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+234 800 000 0000"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-800 transition-all focus:border-teal-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Password + Provider Code */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

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
                  minLength={8}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-800 transition-all focus:border-teal-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Provider Code */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Provider Code{' '}
                <span className="font-normal text-slate-400">
                  (Optional)
                </span>
              </label>

              <div className="relative">
                <Hash className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="HOSP-001"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm uppercase text-slate-800 transition-all focus:border-teal-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Physical Address */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Physical Address
            </label>

            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="12 Health Avenue, Medical District"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-800 transition-all focus:border-teal-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Create Account */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 py-3.5 font-semibold text-white shadow-md shadow-teal-600/20 transition-all hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Sign In */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="font-semibold text-teal-600 hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}