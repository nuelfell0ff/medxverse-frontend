'use client'

import { Poppins } from 'next/font/google'
import { useEffect, useState } from 'react'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

type Step = {
  number: number
  title: string
  description: string
}

const steps: Step[] = [
  {
    number: 1,
    title: 'Set Up Your Hospital',
    description:
      'Configure your hospital, departments, services, users, roles, and operational workflows in one place.',
  },
  {
    number: 2,
    title: 'Connect Your Teams',
    description:
      'Bring clinicians, diagnostics, pharmacy, theatre, finance, and administrative teams onto one platform.',
  },
  {
    number: 3,
    title: 'Connect Patient Care',
    description:
      'Manage patients, clinical records, appointments, diagnostics, medications, procedures, and billing seamlessly.',
  },
  {
    number: 4,
    title: 'Run Smarter',
    description:
      'Use real-time analytics and AI-powered intelligence to improve decisions, workflows, and hospital performance.',
  },
]

export default function HowItWorks() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(true)
    }, 100)

    return () => window.clearTimeout(timer)
  }, [])

  return (
    <section
      id="how-it-works"
      className={`${poppins.className} relative overflow-hidden bg-white px-4 py-16 text-[#0F172A] md:px-10 lg:px-12 lg:py-20`}
    >
      <div className="mx-auto w-full max-w-[1400px]">
        {/* Header */}
        <div
          className={[
            'mx-auto max-w-[760px] text-center',
            'transition-all duration-700 ease-out',
            visible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-4 opacity-0',
          ].join(' ')}
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#1b7b68]/20 px-4 py-2">
            {/* <span className="h-2 w-2 rounded-full bg-[#1b7b68]" /> */}

            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1b7b68]">
              HOW IT WORKS
            </span>
          </div>

          <h2 className="text-[40px] font-extrabold leading-[1.08] tracking-[-1.5px] text-[#0F172A] sm:text-[48px] lg:text-[58px]">
            From setup to smarter
            <br />
            <span className="text-[#1B7B68]">hospital operations</span>
          </h2>

          <p className="mx-auto mt-4 max-w-[650px] text-[15px] font-normal leading-6 text-[#64748B] sm:text-[16px]">
            MedXverse connects your people, patients, workflows, and data so
            your entire healthcare organization can work as one.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative mx-auto mt-16 max-w-[1200px] lg:mt-20">
          {/* Desktop connecting line */}
          <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-[27px] hidden h-[2px] overflow-hidden bg-[#E2EFEC] lg:block">
            <div
              className={[
                'h-full origin-left bg-[#B9DDD5]',
                'transition-transform duration-[1200ms] ease-out',
                visible ? 'scale-x-100' : 'scale-x-0',
              ].join(' ')}
            />
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={[
                  'group relative',
                  'transition-all duration-700 ease-out',
                  visible
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-8 opacity-0',
                ].join(' ')}
                style={{
                  transitionDelay: visible
                    ? `${200 + index * 180}ms`
                    : '0ms',
                }}
              >
                {/* Mobile / tablet connecting line */}
                {index < steps.length - 1 && (
                  <div className="pointer-events-none absolute left-1/2 top-[58px] hidden h-[calc(100%+40px)] w-[2px] -translate-x-1/2 bg-[#E2EFEC] sm:block lg:hidden" />
                )}

                <div className="relative z-10 flex flex-col items-center text-center">
                  {/* Number */}
                  <div className="mb-6 flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full bg-[#1B7B68] text-[17px] font-semibold text-white shadow-[0_8px_22px_rgba(27,123,104,0.18)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_0_10px_rgba(27,123,104,0.08),0_10px_26px_rgba(27,123,104,0.18)]">
                    {step.number}
                  </div>

                  {/* Content */}
                  <div className="max-w-[270px]">
                    <h3 className="text-[17px] font-bold leading-6 text-[#0F172A]">
                      {step.title}
                    </h3>

                    <p className="mt-2 text-[14px] font-normal leading-[1.6] text-[#64748B]">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom statement */}
        {/* <div
          className={[
            'mx-auto mt-14 max-w-[900px] border-t border-[#E2E8F0] pt-8 text-center',
            'transition-all duration-700 ease-out',
            visible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-4 opacity-0',
          ].join(' ')}
          style={{
            transitionDelay: visible ? '950ms' : '0ms',
          }}
        >
          <p className="text-[14px] leading-6 text-[#64748B] sm:text-[15px]">
            <span className="font-semibold text-[#1B7B68]">
              One connected platform.
            </span>{' '}
            From the first patient interaction to executive decision-making,
            MedXverse keeps your hospital connected, informed, and in control.
          </p>
        </div> */}
      </div>
    </section>
  )
}