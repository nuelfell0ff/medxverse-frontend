'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface HeroProps {
  badge?: string;
  title?: ReactNode;
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
    <section
      id="home"
      className="relative min-h-screen overflow-hidden bg-white font-sans"
    >
      {/* ========================================================= */}
      {/* CONTINUOUS PAGE ATMOSPHERE                                */}
      {/* ========================================================= */}

      <div className="pointer-events-none absolute inset-0">
        {/* Main soft teal atmosphere */}
        <div
          className="absolute -top-[180px] left-1/2 h-[900px] w-[150%] -translate-x-1/2"
          style={{
            background: `
              radial-gradient(
                ellipse 70% 62% at 50% 20%,
                rgba(27, 123, 104, 0.16) 0%,
                rgba(27, 123, 104, 0.125) 18%,
                rgba(27, 123, 104, 0.09) 34%,
                rgba(27, 123, 104, 0.055) 49%,
                rgba(27, 123, 104, 0.028) 62%,
                rgba(27, 123, 104, 0.012) 73%,
                rgba(255, 255, 255, 0) 88%
              )
            `,
          }}
        />

        {/* Wide horizontal teal diffusion */}
        <div
          className="absolute -top-[100px] left-1/2 h-[620px] w-[180%] -translate-x-1/2"
          style={{
            background: `
              radial-gradient(
                ellipse 55% 55% at 50% 20%,
                rgba(27, 123, 104, 0.075) 0%,
                rgba(27, 123, 104, 0.045) 35%,
                rgba(27, 123, 104, 0.018) 58%,
                rgba(255, 255, 255, 0) 82%
              )
            `,
          }}
        />

        {/* Very soft lower fade */}
        <div
          className="absolute left-1/2 top-[260px] h-[620px] w-[130%] -translate-x-1/2"
          style={{
            background: `
              radial-gradient(
                ellipse 52% 45% at 50% 15%,
                rgba(27, 123, 104, 0.025) 0%,
                rgba(27, 123, 104, 0.012) 38%,
                rgba(255, 255, 255, 0) 78%
              )
            `,
          }}
        />
      </div>

      {/* ========================================================= */}
      {/* SUBTLE ARCHITECTURAL LINES                                */}
      {/* ========================================================= */}

      <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-[520px] overflow-hidden opacity-40 lg:block">
        <div className="mx-auto flex h-full max-w-[1220px]">
          <div className="h-full w-1/5 border-x border-slate-200/60" />

          <div className="h-full w-1/5 border-r border-slate-200/60" />

          <div className="h-full w-1/5 border-r border-slate-200/60" />

          <div className="h-full w-1/5 border-r border-slate-200/60" />

          <div className="h-full w-1/5 border-r border-slate-200/60" />
        </div>
      </div>

      {/* ========================================================= */}
      {/* HERO CONTENT                                               */}
      {/* ========================================================= */}

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1100px] flex-col items-center px-6 pb-24 pt-[140px] text-center sm:pt-[155px] lg:pt-[165px]">
        {/* Badge */}
        <div
          className="mb-7 inline-flex items-center gap-2 rounded-full border px-4 py-2 backdrop-blur-sm"
          style={{
            borderColor: 'rgba(27, 123, 104, 0.16)',
            backgroundColor: 'rgba(255, 255, 255, 0.45)',
          }}
        >
          <span className="font-sans text-[12px] font-medium tracking-[-0.01em] text-[#1b7b68] sm:text-[13px]">
            {badge}
          </span>
        </div>

        {/* Main Heading */}
        <h1 className="max-w-[950px] font-sans text-[52px] font-medium leading-[0.98] tracking-[-0.065em] text-slate-950 sm:text-[68px] md:text-[78px] lg:text-[88px]">
          {title}
        </h1>

        {/* Description */}
        <p className="mt-8 max-w-[650px] font-sans text-[15px] leading-7 tracking-[-0.01em] text-slate-500 sm:text-[16px]">
          {description}
        </p>

        {/* Actions */}
        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          {/* Secondary */}
          <Link
            href={secondaryHref}
            className="group flex h-[58px] min-w-[150px] items-center justify-center gap-2 rounded-[15px] border border-[#1b7b68]/35 bg-white/60 px-7 font-sans text-[15px] font-medium text-[#1b7b68] backdrop-blur-sm transition-all duration-200 hover:bg-[#1b7b68]/5"
          >
            {secondaryAction}

            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>

          {/* Primary */}
          <Link
            href={primaryHref}
            className="flex h-[58px] min-w-[150px] items-center justify-center rounded-[15px] px-7 font-sans text-[15px] font-medium text-white shadow-lg shadow-[#1b7b68]/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#1b7b68]/25"
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