'use client';

import Link from 'next/link';
import { ArrowRight, UserRound } from 'lucide-react';

interface HeroProps {
  badge?: string;
  title?: React.ReactNode;
  description?: string;
  primaryAction?: string;
  primaryHref?: string;
  secondaryAction?: string;
  secondaryHref?: string;
}

export default function Hero({
  badge = 'MedXverse Hospital Management System (MHMS)',
  title = (
    <>
      Smarter hospital
      <br />
      management starts here.
    </>
  ),
  description = 'MedXverse connects patients, clinical workflows, diagnostics, pharmacy, surgery, billing and hospital operations in one powerful platform.',
  primaryAction = 'Get started',
  primaryHref = '/auth/register',
  secondaryAction = 'Learn more',
  secondaryHref = '/auth/login',
}: HeroProps) {
  return (
    <section className="relative min-h-screen overflow-hidden bg-white font-sans">
      {/* Background atmosphere */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-x-0 top-0 h-[720px]"
          style={{
            background: `
              radial-gradient(
                circle at 50% 42%,
                rgba(27, 123, 104, 0.10) 0%,
                rgba(27, 123, 104, 0.08) 18%,
                rgba(27, 123, 104, 0.055) 34%,
                rgba(27, 123, 104, 0.025) 50%,
                rgba(255, 255, 255, 0) 72%
              )
            `,
          }}
        />

        <div
          className="absolute left-1/2 top-0 h-[620px] w-[1000px] -translate-x-1/2 blur-3xl"
          style={{
            background:
              'radial-gradient(ellipse, rgba(27, 123, 104, 0.13) 0%, rgba(27, 123, 104, 0.06) 38%, transparent 72%)',
          }}
        />
      </div>

      {/* Subtle vertical architectural lines */}
      <div className="pointer-events-none absolute inset-x-0 top-[92px] hidden h-[500px] overflow-hidden opacity-40 lg:block">
        <div className="mx-auto flex h-full max-w-[1220px]">
          <div className="h-full w-1/5 border-x border-slate-200/60" />
          <div className="h-full w-1/5 border-r border-slate-200/60" />
          <div className="h-full w-1/5 border-r border-slate-200/60" />
          <div className="h-full w-1/5 border-r border-slate-200/60" />
          <div className="h-full w-1/5 border-r border-slate-200/60" />
        </div>
      </div>

      {/* Navigation */}
      <header className="relative z-20">
        <div className="mx-auto flex h-[92px] w-full max-w-[1180px] items-center justify-between px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="group flex items-center gap-3 align-center"
            aria-label="MedXverse home"
          >
            {/* <div
              className="relative flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: '#1b7b68' }}
            >
              <div className="absolute h-[25px] w-[25px] rounded-full border-[5px] border-white/95" />
              <div className="absolute h-[9px] w-[9px] rounded-full bg-white" />
            </div> */}

            <div className="w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-white text-2xl mb-3 shadow-md shadow-teal-600/20" style={{ backgroundColor: '#1b7b68' }}>
            M
          </div>

            <span className="text-[21px] mb-2 font-semibold tracking-[-0.03em] text-slate-800">
              MedXverse
            </span>
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden items-center gap-10 md:flex">
            <Link
              href="#home"
              className="text-[14px] font-medium text-slate-600 transition-colors hover:text-[#1b7b68]"
            >
              Home
            </Link>

            <Link
              href="#product"
              className="text-[14px] font-medium text-slate-600 transition-colors hover:text-[#1b7b68]"
            >
              Product
            </Link>

            <Link
              href="#solutions"
              className="text-[14px] font-medium text-slate-600 transition-colors hover:text-[#1b7b68]"
            >
              Solutions
            </Link>

            <Link
              href="#pricing"
              className="text-[14px] font-medium text-slate-600 transition-colors hover:text-[#1b7b68]"
            >
              Pricing
            </Link>

            <Link
              href="#about"
              className="text-[14px] font-medium text-slate-600 transition-colors hover:text-[#1b7b68]"
            >
              About us
            </Link>

            <Link
              href="#contact"
              className="text-[14px] font-medium text-slate-600 transition-colors hover:text-[#1b7b68]"
            >
              Contact
            </Link>
          </nav>

          {/* Sign in */}
          <Link
            href="/auth/login"
            className="hidden items-center gap-2 rounded-[14px] border border-[#1b7b68]/15 bg-white/50 px-5 py-3 text-[14px] font-medium text-slate-700 backdrop-blur-sm transition-all hover:border-[#1b7b68]/30 hover:bg-white md:flex"
          >
            <UserRound className="h-[17px] w-[17px]" />
            <span>Sign in</span>
          </Link>
        </div>
      </header>

      {/* Hero content */}
      <div
        id="home"
        className="relative z-10 mx-auto flex min-h-[calc(100vh-92px)] w-full max-w-[1100px] flex-col items-center px-6 pt-[92px] text-center sm:pt-[110px] lg:pt-[120px]"
      >
        {/* Badge */}
        <div
          className="mb-7 inline-flex items-center gap-2 rounded-full border px-4 py-2 backdrop-blur-sm"
          style={{
            borderColor: 'rgba(27, 123, 104, 0.16)',
            backgroundColor: 'rgba(255, 255, 255, 0.45)',
          }}
        >
          {/* <span
            className="flex h-5 w-5 items-center justify-center rounded-full"
            style={{
              backgroundColor: 'rgba(27, 123, 104, 0.10)',
            }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: '#1b7b68' }}
            />
          </span> */}

          <span className="text-[12px] font-medium tracking-[-0.01em] text-[#1b7b68] sm:text-[13px]">
            {badge}
          </span>
        </div>

        {/* Main heading */}
        <h1 className="max-w-[950px] text-[52px] font-medium leading-[0.98] tracking-[-0.065em] text-slate-950 sm:text-[68px] md:text-[78px] lg:text-[88px]">
          {title}
        </h1>

        {/* Description */}
        <p className="mt-8 max-w-[650px] text-[15px] leading-7 tracking-[-0.01em] text-slate-500 sm:text-[16px]">
          {description}
        </p>

        {/* Actions */}
        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          {/* Secondary */}
          <Link
            href="#about"
            className="group flex h-[58px] min-w-[150px] items-center justify-center gap-2 rounded-[15px] border border-[#1b7b68]/35 bg-white/60 px-7 text-[15px] font-medium text-[#1b7b68] backdrop-blur-sm transition-all duration-200 hover:bg-[#1b7b68]/5"
          >
            {secondaryAction}

            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>

          {/* Primary */}
          <Link
            href={primaryHref}
            className="flex h-[58px] min-w-[150px] items-center justify-center rounded-[15px] px-7 text-[15px] font-medium text-white shadow-lg shadow-[#1b7b68]/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#1b7b68]/25"
            style={{
              backgroundColor: '#1b7b68',
            }}
          >
            {primaryAction}
          </Link>
        </div>
      </div>
    </section>
  );
}