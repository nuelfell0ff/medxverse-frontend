'use client'

import Link from 'next/link'
import { Poppins } from 'next/font/google'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export default function CTASection() {
  return (
    <section
      className={`${poppins.className} relative overflow-hidden bg-white px-4 py-16 text-[#0F172A] md:px-10 lg:px-12 lg:py-20`}
    >
      {/* Background Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          backgroundImage: `
            linear-gradient(to right, #E2E8F0 1px, transparent 1px),
            linear-gradient(to bottom, #E2E8F0 1px, transparent 1px)
          `,
          backgroundSize: '44px 44px',
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[1400px] py-4 md:py-8">
        {/* CTA Banner */}
        <div className="mx-auto max-w-[1000px] rounded-[36px] border-[6px] border-white bg-[#1B7B68] px-6 py-12 text-center shadow-[0_30px_60px_rgba(27,123,104,0.25),0_10px_20px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_40px_75px_rgba(27,123,104,0.3),0_15px_25px_rgba(0,0,0,0.12)] md:px-12 md:py-16"
        >
          {/* Badge */}
          <div className="mx-auto mb-5 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm">
            {/* <span className="mr-2 text-white">•</span> */}
            GET STARTED WITH MEDXVERSE
          </div>

          {/* Title */}
          <h2 className="mx-auto mb-4 max-w-[760px] text-[30px] font-bold leading-[1.15] tracking-[-0.7px] text-white sm:text-[36px] md:text-[42px]">
            Ready to transform your hospital operations?
          </h2>

          {/* Subtitle */}
          <p className="mx-auto mb-8 max-w-[620px] text-sm leading-7 text-white/75 sm:text-[15px] md:text-base">
            Bring your clinical teams, patients, diagnostics, pharmacy,
            finance, and hospital operations together on one intelligent
            platform.
          </p>

          {/* Buttons */}
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/register"
              className="inline-flex min-w-[170px] items-center justify-center rounded-full border-2 border-white bg-white px-7 py-2.5 text-xs font-semibold text-[#1B7B68] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#F1F5F9] hover:bg-[#F1F5F9]"
            >
              Get Started
            </Link>

            <Link
              href="/auth/login"
              className="inline-flex min-w-[170px] items-center justify-center rounded-full border-2 border-white/70 bg-transparent px-7 py-2.5 text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-white hover:bg-white/10"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Bottom Statement */}
        {/* <div className="mx-auto mt-12 max-w-[900px] border-t border-[#E2E8F0] pt-7 text-center md:mt-14">
          <p className="text-sm leading-7 text-[#64748B]">
            <span className="font-semibold text-[#1B7B68]">
              One connected platform.
            </span>{' '}
            From patient care to executive decision-making, MedXverse keeps
            your healthcare organization connected, informed, and in control.
          </p>
        </div> */}
      </div>

      {/* Entrance Animation */}
      <style jsx>{`
        @keyframes ctaScaleIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(20px);
          }

          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @media (prefers-reduced-motion: no-preference) {
          .relative.z-10 > div:first-child {
            animation: ctaScaleIn 0.8s cubic-bezier(0.16, 1, 0.3, 1)
              forwards;
          }
        }
      `}</style>
    </section>
  )
}