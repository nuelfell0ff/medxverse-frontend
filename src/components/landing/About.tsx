'use client';

import { Poppins } from 'next/font/google';
import {
  ArrowRight,
  Check,
  HeartPulse,
  LockKeyhole,
  Lightbulb,
  ShieldCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const values = [
  {
    title: 'Patient-Centered',
    icon: Users,
  },
  {
    title: 'Trust & Security',
    icon: LockKeyhole,
  },
  {
    title: 'Reliability',
    icon: ShieldCheck,
  },
  {
    title: 'Innovation',
    icon: Lightbulb,
  },
  {
    title: 'Accessibility',
    icon: HeartPulse,
  },
];

export default function About() {
  return (
    <section
      id="about"
      className={`${poppins.className} min-h-screen bg-white text-[#0b1a2e]`}
    >
      <div className="flex min-h-screen w-full flex-col px-4 pb-16 pt-[125px] md:px-10 lg:px-12 lg:pb-20 lg:pt-[145px]">
        {/* Heading */}
        <div className="mx-auto w-full max-w-[850px] text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#1b7b68]/20 px-4 py-2">
            {/* <span className="h-2 w-2 rounded-full bg-[#1b7b68]" /> */}

            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1b7b68]">
              About MedXverse
            </span>
          </div>

          <h1 className="mt-3 text-[44px] font-extrabold leading-[1.15] tracking-[-1.5px] text-[#0F172A] sm:text-[52px] lg:text-[62px]">
            Connecting healthcare through{' '}
            <span className="text-[#1b7b68]">intelligent technology.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-[700px] text-[14px] leading-[1.8] text-[#667789] sm:text-[15px]">
            MedXverse is a health-technology company building digital
            infrastructure that brings healthcare providers, payers, and
            patients together on one connected platform.
          </p>
        </div>

        {/* Main Content */}
        <div className="mt-14 grid w-full gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          {/* Who We Are */}
          <div className="rounded-[24px] border border-[#e7ecea] bg-white p-7 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1b7b68]/10">
                <HeartPulse className="h-5 w-5 text-[#1b7b68]" />
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1b7b68]">
                  Who We Are
                </p>

                <h2 className="mt-1 text-[23px] font-semibold tracking-[-0.7px] sm:text-[25px]">
                  One platform for connected healthcare
                </h2>
              </div>
            </div>

            <p className="mt-6 text-[13px] leading-[1.9] text-[#5f7182] sm:text-[14px]">
              MedXverse provides a cloud-based platform that unifies hospital
              and clinic operations, HMO administration, and telemedicine.
              Healthcare organizations can manage patient records, clinical
              workflows, billing, insurance claims, and virtual care without
              relying on disconnected systems.
            </p>

            <p className="mt-4 text-[13px] leading-[1.9] text-[#5f7182] sm:text-[14px]">
              Built for hospitals, multi-specialty clinics, diagnostic
              centers, independent practitioners, and HMOs, MedXverse is
              designed to scale from a single healthcare facility to
              multi-facility networks and growing health plans.
            </p>

            {/* Platform Areas */}
            <div className="mt-7 flex flex-wrap gap-2.5">
              {[
                'Hospital Operations',
                'Patient Records',
                'Billing & Claims',
                'HMO Administration',
                'Telemedicine',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 rounded-full border border-[#dce8e4] px-3.5 py-2"
                >
                  <Check className="h-3.5 w-3.5 text-[#1b7b68]" />

                  <span className="text-[11px] font-medium text-[#536576]">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mission / Vision */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
            {/* Mission */}
            <div className="rounded-[24px] bg-[#1b7b68] p-7 text-white sm:p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                Our Mission
              </p>

              <p className="mt-4 text-[15px] font-medium leading-[1.75] tracking-[-0.2px]">
                To make quality healthcare more accessible, efficient, and
                affordable through intelligent technology that puts patients
                at the center.
              </p>
            </div>

            {/* Vision */}
            <div className="rounded-[24px] border border-[#e7ecea] bg-white p-7 sm:p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1b7b68]">
                Our Vision
              </p>

              <p className="mt-4 text-[15px] font-medium leading-[1.75] tracking-[-0.2px] text-[#243647]">
                To become a leading healthcare management platform across
                emerging markets, enabling every patient interaction to be
                fast, informed, and secure.
              </p>
            </div>
          </div>
        </div>

        {/* Core Values */}
        <div className="mt-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-[350px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1b7b68]">
              What Guides Us
            </p>

            <h2 className="mt-2 text-[25px] font-semibold tracking-[-0.8px]">
              Built around what matters.
            </h2>
          </div>

          <div className="flex flex-wrap gap-3 lg:max-w-[760px] lg:justify-end">
            {values.map((value) => {
              const Icon = value.icon;

              return (
                <div
                  key={value.title}
                  className="flex items-center gap-2.5 rounded-full border border-[#e2e9e7] bg-white px-4 py-2.5"
                >
                  <Icon className="h-4 w-4 text-[#1b7b68]" />

                  <span className="text-[11px] font-medium text-[#536576]">
                    {value.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        {/* <div className="mt-10 flex flex-col items-center justify-between gap-5 border-t border-[#edf0ef] pt-7 sm:flex-row">
          <p className="max-w-[700px] text-center text-[12px] leading-[1.7] text-[#718191] sm:text-left">
            MedXverse is creating a connected foundation for modern healthcare
            delivery across emerging and fast-growing markets.
          </p>

          <Link
            href="/auth/register"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#1b7b68] px-6 py-3 text-[12px] font-semibold text-white no-underline transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#146253]"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div> */}
      </div>
    </section>
  );
}