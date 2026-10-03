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
  Eye,
  EyeOff,
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

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));

    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await authService.register({
        ...formData,
        accountType,
        code: formData.code.trim() ? formData.code.trim() : undefined,
        address: formData.address.trim()
          ? formData.address.trim()
          : undefined,
      });

      if (response.success) {
        router.push('/auth/login?registered=true');
      } else {
        setErrorMessage(
          'Registration failed. Please review your details and try again.'
        );
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'Registration failed. Please review your details and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#1b7b68] px-5 py-10 font-sans">
      {/* Background decorative circles */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full border border-white/[0.035] bg-white/[0.025]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-48 top-1/4 h-[620px] w-[620px] rounded-full border border-white/[0.035] bg-white/[0.025]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-64 -left-20 h-[560px] w-[560px] rounded-full border border-black/[0.035] bg-black/[0.025]"
      />

      {/* Main content */}
      <div className="relative mx-auto z-10 w-full max-w-[520px]">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          {/* Logo intentionally hidden to match Login page */}
{/*           
          <Link
            href="/"
            aria-label="MedXverse home"
            className="mb-4 flex h-20 w-36 items-center justify-center transition-opacity hover:opacity-85"
          >
            <Image
              src={medxverseLogo}
              alt="MedXverse"
              priority
              width={150}
              height={70}
              className="h-auto max-h-16 w-auto object-contain"
            />
          </Link>
          */}

          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Create account
          </h1>

          <p className="mt-1 text-[10px] font-medium   tracking-[0.22em] text-white/65">
            MedXverse Health Management System
          </p>
        </div>

        {/* Error */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200/25 bg-rose-950/20 px-3.5 py-3 text-xs text-white backdrop-blur-sm"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Account Type */}
        <div className="mb-4">
          <p className="mb-2 text-[9px] font-medium   tracking-[0.18em] text-white/50">
            Account type
          </p>

          <div className="grid grid-cols-2 gap-2">
            {/* Hospital */}
            <button
              type="button"
              onClick={() =>
                setAccountType(AccountType.HOSPITAL)
              }
              className={`flex h-11 items-center justify-center gap-2 rounded-sm border px-3 text-[10px] font-semibold   tracking-[0.08em] transition-all ${
                accountType === AccountType.HOSPITAL
                  ? 'border-white bg-white text-[#1b7b68]'
                  : 'border-white/45 bg-transparent text-white/75 hover:border-white hover:text-white'
              }`}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span>Hospital / Clinic</span>
            </button>

            {/* HMO */}
            <button
              type="button"
              onClick={() => setAccountType(AccountType.HMO)}
              className={`flex h-11 items-center justify-center gap-2 rounded-sm border px-3 text-[10px] font-semibold   tracking-[0.08em] transition-all ${
                accountType === AccountType.HMO
                  ? 'border-white bg-white text-[#1b7b68]'
                  : 'border-white/45 bg-transparent text-white/75 hover:border-white hover:text-white'
              }`}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>HMO Organization</span>
            </button>
          </div>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Organization Name */}
          <div className="group relative">
            <label htmlFor="name" className="sr-only">
              Organization name
            </label>

            <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />

            <input
              id="name"
              type="text"
              name="name"
              autoComplete="organization"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder={
                accountType === AccountType.HOSPITAL
                  ? 'HOSPITAL / ORGANIZATION NAME'
                  : 'HMO ORGANIZATION NAME'
              }
              className="h-12 w-full rounded-sm border border-white bg-transparent px-11 text-[10px] font-medium   tracking-[0.1em] text-white outline-none transition-all placeholder:text-white/55 focus:border-white focus:bg-white/[0.04] focus:ring-1 focus:ring-white/15"
            />
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {/* Email */}
            <div className="group relative">
              <label htmlFor="email" className="sr-only">
                Official email
              </label>

              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />

              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="OFFICIAL EMAIL"
                className="h-12 w-full rounded-sm border border-white bg-transparent px-11 text-[10px] font-medium tracking-[0.1em] text-white outline-none transition-all placeholder:text-white/55 focus:border-white focus:bg-white/[0.04] focus:ring-1 focus:ring-white/15"
              />
            </div>

            {/* Phone */}
            <div className="group relative">
              <label htmlFor="phone" className="sr-only">
                Contact phone
              </label>

              <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />

              <input
                id="phone"
                type="tel"
                name="phone"
                autoComplete="tel"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="CONTACT PHONE"
                className="h-12 w-full rounded-sm border border-white bg-transparent px-11 text-[10px] font-medium   tracking-[0.1em] text-white outline-none transition-all placeholder:text-white/55 focus:border-white focus:bg-white/[0.04] focus:ring-1 focus:ring-white/15"
              />
            </div>
          </div>

          {/* Password + Provider Code */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {/* Password */}
            <div className="group relative">
              <label htmlFor="password" className="sr-only">
                Password
              </label>

              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />

              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={formData.password}
                onChange={handleChange}
                placeholder="PASSWORD"
                className="h-12 w-full rounded-sm border border-white bg-transparent px-11 pr-11 text-[10px] font-medium tracking-[0.1em] text-white outline-none transition-all placeholder:text-white/55 focus:border-white focus:bg-white/[0.04] focus:ring-1 focus:ring-white/15"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((current) => !current)
                }
                aria-label={
                  showPassword ? 'Hide password' : 'Show password'
                }
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/55 transition-colors hover:text-white"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Provider Code */}
            <div className="group relative">
              <label htmlFor="code" className="sr-only">
                Provider code
              </label>

              <Hash className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />

              <input
                id="code"
                type="text"
                name="code"
                autoComplete="off"
                value={formData.code}
                onChange={handleChange}
                placeholder="PROVIDER CODE (OPTIONAL)"
                className="h-12 w-full rounded-sm border border-white bg-transparent px-11 text-[10px] font-medium  tracking-[0.1em] text-white outline-none transition-all placeholder:text-white/55 focus:border-white focus:bg-white/[0.04] focus:ring-1 focus:ring-white/15"
              />
            </div>
          </div>

          {/* Address */}
          <div className="group relative">
            <label htmlFor="address" className="sr-only">
              Physical address
            </label>

            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />

            <input
              id="address"
              type="text"
              name="address"
              autoComplete="street-address"
              value={formData.address}
              onChange={handleChange}
              placeholder="PHYSICAL ADDRESS (OPTIONAL)"
              className="h-12 w-full rounded-sm border border-white bg-transparent px-11 text-[10px] font-medium   tracking-[0.1em] text-white outline-none transition-all placeholder:text-white/55 focus:border-white focus:bg-white/[0.04] focus:ring-1 focus:ring-white/15"
            />
          </div>

          {/* Create Account */}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-white px-4 text-[11px] font-bold   tracking-[0.16em] text-[#1b7b68] shadow-lg shadow-black/10 transition-all hover:bg-white/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-65"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating account</span>
              </>
            ) : (
              <>
                <span>Create account</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-7 text-center">
          <p className="text-[11px] text-white/55">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="font-semibold text-white/90 transition-colors hover:text-white hover:underline"
            >
              Login
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-[9px] font-medium   tracking-[0.18em] text-white/30">
          Secure registration for MedXverse
        </p>
      </div>
    </main>
  );
}