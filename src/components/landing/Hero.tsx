'use client';

import Link from 'next/link';
import { Poppins } from 'next/font/google';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const showcaseCards = [
  { id: 1, position: 'outer-left' },
  { id: 2, position: 'inner-left' },
  { id: 3, position: 'center' },
  { id: 4, position: 'inner-right' },
  { id: 5, position: 'outer-right' },
];

export default function Hero() {
  return (
    <section
      id="home"
      className={`${poppins.className} relative flex min-h-screen items-center overflow-hidden bg-white px-0 pb-[70px] pt-[120px] sm:pb-[100px] sm:pt-[140px] lg:pb-[160px] lg:pt-[160px]`}
    >
      {/* Grid Background */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 0, 0, 0.07) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 0, 0, 0.07) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage:
            'linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)',
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-5 text-center sm:px-8 lg:px-12">
        {/* Badge */}
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#1b7b68]/20 px-4 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1b7b68]">
            AI-POWERED HOSPITAL MANAGEMENT SYSTEM
          </span>
        </div>

        {/* Main Heading */}
        <h1 className="animate-fade-up animation-delay-[150ms] my-5 text-[clamp(2.5rem,5.5vw,4.2rem)] font-bold leading-[1.2] tracking-[-2px]">
          <span className="block text-black">
            Your Hospital, connected
          </span>

          <span
            className="block"
            style={{ color: '#1b7b68' }}
          >
            now with intelligence
          </span>
        </h1>

        {/* Subtitle */}
        <p className="animate-fade-up animation-delay-[300ms] mx-auto mb-8 max-w-[680px] text-[clamp(0.95rem,2vw,1.1rem)] leading-[1.6] text-[#5b6e80]">
          Manage patients, clinical workflows, diagnostics, pharmacy,
          surgery, billing, staff, and hospital operations from one
          intelligent platform built for modern healthcare.
        </p>

        {/* CTA Buttons */}
        <div className="animate-fade-up animation-delay-[450ms] mb-6 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/auth/register"
            className="rounded-full px-7 py-[10px] text-[0.8rem] font-semibold text-white no-underline shadow-[0_4px_14px_rgba(27,123,104,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(27,123,104,0.3)]"
            style={{ backgroundColor: '#1b7b68' }}
          >
            Get Started
          </Link>

          <Link
            href="/auth/login"
            className="rounded-full border-[1.5px] border-[rgba(11,26,46,0.2)] bg-transparent px-7 py-[10px] text-[0.8rem] font-semibold text-[#0b1a2e] no-underline transition-all duration-300 hover:border-[#0b1a2e] hover:bg-[rgba(11,26,46,0.03)]"
          >
            Sign In
          </Link>
        </div>

        {/* Feature List */}
        <div className="animate-fade-up animation-delay-[600ms] mb-8 flex flex-wrap items-center justify-center gap-3 text-[0.9rem] font-medium text-[#5b6e80] sm:gap-4 md:gap-6">
          {[
            'Secure Healthcare Data',
            'AI-Powered Workflows',
            'Works on Any Device',
            'Available 24/7',
          ].map((feature) => (
            <span
              key={feature}
              className="flex items-center gap-2"
            >
              <span
                className="h-[5px] w-[5px] rounded-full"
                style={{ backgroundColor: '#1b7b68' }}
              />

              {feature}
            </span>
          ))}
        </div>

        {/* Dashboard Showcase */}
        <div className="animate-cards-entry relative mx-auto mt-[40px] flex h-[250px] w-full max-w-[1100px] items-center justify-center sm:mt-[55px] sm:h-[300px] lg:mt-[80px] lg:h-[380px]">
          {showcaseCards.map((card) => (
            <div
              key={card.id}
              className={`
                showcase-card
                showcase-${card.position}
                floating-${card.id}
                absolute
                overflow-hidden
                rounded-[18px]
                border
                border-black/[0.08]
                bg-[#e1e6eb]
                shadow-[0_10px_30px_rgba(0,0,0,0.05)]
              `}
            >
              <DashboardPreview position={card.position} />
            </div>
          ))}
        </div>
      </div>

      {/* Animation + Responsive Styles */}
      <style jsx>{`
        .animate-fade-up {
          opacity: 0;
          transform: translateY(25px);
          animation: fadeUpIn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)
            forwards;
        }

        .animate-cards-entry .showcase-card {
          opacity: 0;
          animation: cardZoomIn 1s
            cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }

        .showcase-outer-left {
          width: 16%;
          height: 240px;
          left: 0;
          z-index: 10;
          transform: scale(0.9);
          animation-delay: 0.7s;
        }

        .showcase-inner-left {
          width: 20%;
          height: 280px;
          left: 12%;
          z-index: 20;
          transform: scale(0.95);
          animation-delay: 0.8s;
        }

        .showcase-center {
          width: 44%;
          height: 340px;
          left: 28%;
          z-index: 30;
          background: #d4dde5;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          animation-delay: 0.6s;
        }

        .showcase-inner-right {
          width: 20%;
          height: 280px;
          right: 12%;
          z-index: 20;
          transform: scale(0.95);
          animation-delay: 0.8s;
        }

        .showcase-outer-right {
          width: 16%;
          height: 240px;
          right: 0;
          z-index: 10;
          transform: scale(0.9);
          animation-delay: 0.7s;
        }

        .floating-1 {
          animation: float1 4s ease-in-out infinite alternate 1s;
        }

        .floating-2 {
          animation: float2 4.5s ease-in-out infinite alternate 0.5s;
        }

        .floating-3 {
          animation: float3 5s ease-in-out infinite alternate;
        }

        .floating-4 {
          animation: float2 4.5s ease-in-out infinite alternate 0.2s;
        }

        .floating-5 {
          animation: float1 4s ease-in-out infinite alternate 1.3s;
        }

        @keyframes fadeUpIn {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes cardZoomIn {
          from {
            opacity: 0;
            transform: translateY(40px) scale(0.8);
          }

          to {
            opacity: 1;
          }
        }

        @keyframes float1 {
          0% {
            transform: translateY(0) scale(0.9);
          }

          100% {
            transform: translateY(-8px) scale(0.9);
          }
        }

        @keyframes float2 {
          0% {
            transform: translateY(0) scale(0.95);
          }

          100% {
            transform: translateY(-12px) scale(0.95);
          }
        }

        @keyframes float3 {
          0% {
            transform: translateY(0);
          }

          100% {
            transform: translateY(-15px);
          }
        }

        @media (max-width: 991px) {
          .showcase-center {
            height: 280px;
          }

          .showcase-inner-left,
          .showcase-inner-right {
            height: 230px;
          }

          .showcase-outer-left,
          .showcase-outer-right {
            height: 190px;
          }
        }

        @media (max-width: 767px) {
          .showcase-outer-left,
          .showcase-outer-right {
            display: none;
          }

          .showcase-center {
            width: 65%;
            left: 17.5%;
            height: 220px;
          }

          .showcase-inner-left {
            width: 25%;
            left: 0;
            height: 180px;
          }

          .showcase-inner-right {
            width: 25%;
            right: 0;
            height: 180px;
          }
        }
      `}</style>
    </section>
  );
}

function DashboardPreview({
  position,
}: {
  position: string;
}) {
  const isCenter = position === 'center';

  return (
    <div className="relative h-full w-full">
      {/* Header */}
      <div className="flex h-[18%] items-center justify-between border-b border-black/[0.06] bg-white/70 px-4">
        <div className="flex items-center gap-2">
          <div
            className={`rounded ${
              isCenter ? 'h-6 w-6' : 'h-4 w-4'
            }`}
            style={{ backgroundColor: '#1b7b68' }}
          />

          {isCenter && (
            <div className="h-2 w-20 rounded-full bg-[#d9dfe4]" />
          )}
        </div>

        {isCenter && (
          <div className="h-5 w-5 rounded-full bg-[#d9dfe4]" />
        )}
      </div>

      {/* Dashboard Body */}
      <div className="flex h-[82%] gap-3 bg-[#f7f9fa] p-3">
        {/* Sidebar */}
        {isCenter && (
          <div className="hidden w-[20%] flex-col gap-2 sm:flex">
            <div className="h-2 w-full rounded bg-[#d9dfe4]" />

            <div
              className="h-2 w-[80%] rounded"
              style={{
                backgroundColor: 'rgba(27,123,104,0.22)',
              }}
            />

            <div className="h-2 w-[90%] rounded bg-[#d9dfe4]" />
            <div className="h-2 w-[70%] rounded bg-[#d9dfe4]" />
            <div className="h-2 w-[85%] rounded bg-[#d9dfe4]" />
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex gap-2">
            <StatBlock />
            <StatBlock />
            <StatBlock />
          </div>

          <div className="flex flex-1 gap-3">
            <div className="flex-1 rounded-lg border border-black/[0.05] bg-white p-3">
              <div className="mb-3 h-2 w-20 rounded bg-[#d9dfe4]" />

              <div className="flex h-[70%] items-end gap-1">
                {[35, 55, 42, 72, 48, 65, 82, 58].map(
                  (height, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t"
                      style={{
                        height: `${height}%`,
                        backgroundColor:
                          index === 6
                            ? '#1b7b68'
                            : 'rgba(27,123,104,0.18)',
                      }}
                    />
                  )
                )}
              </div>
            </div>

            <div className="hidden w-[32%] rounded-lg border border-black/[0.05] bg-white p-3 sm:block">
              <div className="mb-3 h-2 w-16 rounded bg-[#d9dfe4]" />

              <div className="space-y-2">
                <div className="h-2 w-full rounded bg-[#e4e8eb]" />
                <div className="h-2 w-[80%] rounded bg-[#e4e8eb]" />
                <div className="h-2 w-[90%] rounded bg-[#e4e8eb]" />
                <div className="h-2 w-[65%] rounded bg-[#e4e8eb]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBlock() {
  return (
    <div className="flex-1 rounded-md border border-black/[0.05] bg-white p-2">
      <div className="mb-2 h-1.5 w-8 rounded bg-[#d9dfe4]" />

      <div
        className="h-3 w-12 rounded"
        style={{
          backgroundColor: 'rgba(27,123,104,0.28)',
        }}
      />
    </div>
  );
}