'use client'

import { Poppins } from 'next/font/google'
import { useState, type SVGProps } from 'react'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

type IconType =
  | 'ehr'
  | 'ai'
  | 'emergency'
  | 'bed'
  | 'appointment'
  | 'risk'
  | 'lab'
  | 'radiology'
  | 'pacs'
  | 'image-ai'
  | 'blood'
  | 'result'
  | 'theatre'
  | 'schedule'
  | 'consent'
  | 'checklist'
  | 'documentation'
  | 'anaesthesia'
  | 'workforce'
  | 'roster'
  | 'inventory'
  | 'pharmacy'
  | 'workflow'
  | 'analytics'
  | 'billing'
  | 'pricing'
  | 'payments'
  | 'insurance'
  | 'revenue-ai'
  | 'reporting'
  | 'command'
  | 'documentation-ai'
  | 'predictive'
  | 'assistant'
  | 'risk-ai'
  | 'insight'

type SolutionCard = {
  icon: IconType
  title: string
  desc: string
}

type SolutionTab = {
  key: string
  label: string
  cards: SolutionCard[]
}

const solutionTabs: SolutionTab[] = [
  {
    key: 'clinical',
    label: 'Clinical Care',
    cards: [
      {
        icon: 'ehr',
        title: 'Unified Electronic Health Records',
        desc: 'One connected patient record across departments, encounters, diagnoses, medications, and care plans.',
      },
      {
        icon: 'ai',
        title: 'AI Clinical Decision Support',
        desc: 'Intelligent alerts and insights that help clinicians make faster, safer decisions at the point of care.',
      },
      {
        icon: 'emergency',
        title: 'Emergency Department',
        desc: 'Coordinate triage, patient flow, emergency cases, and clinical handovers from arrival to disposition.',
      },
      {
        icon: 'bed',
        title: 'Smart Bed & Ward Management',
        desc: 'Real-time visibility into bed occupancy, transfers, ward capacity, and patient movement.',
      },
      {
        icon: 'appointment',
        title: 'Appointments & Queues',
        desc: 'Optimize appointments, queues, and outpatient workflows across hospital departments.',
      },
      {
        icon: 'risk',
        title: 'Patient Risk Intelligence',
        desc: 'Identify high-risk patients early and surface warning signals before conditions become critical.',
      },
    ],
  },
  {
    key: 'diagnostics',
    label: 'Diagnostics',
    cards: [
      {
        icon: 'lab',
        title: 'Laboratory Information System',
        desc: 'Manage laboratory orders, samples, testing, validation, results, and critical-value alerts.',
      },
      {
        icon: 'radiology',
        title: 'Radiology Information System',
        desc: 'Digitize imaging orders, scheduling, worklists, reporting, and radiology workflows.',
      },
      {
        icon: 'pacs',
        title: 'PACS & Medical Imaging',
        desc: 'Store, access, review, and securely share medical images through one connected workspace.',
      },
      {
        icon: 'image-ai',
        title: 'AI Imaging Intelligence',
        desc: 'AI-assisted image analysis, prioritization, comparison, measurement, and reporting support.',
      },
      {
        icon: 'blood',
        title: 'Blood Bank Management',
        desc: 'Track blood inventory, compatibility, cross-matching, issuing, and transfusion workflows.',
      },
      {
        icon: 'result',
        title: 'Integrated Diagnostic Results',
        desc: 'Connect laboratory, imaging, pathology, and other results directly to the patient record.',
      },
    ],
  },
  {
    key: 'surgery',
    label: 'Surgery & Theatre',
    cards: [
      {
        icon: 'theatre',
        title: 'Operating Theatre Management',
        desc: 'Manage the surgical pathway from scheduling and preparation through procedure and recovery.',
      },
      {
        icon: 'schedule',
        title: 'Theatre Scheduling',
        desc: 'Coordinate theatres, surgical teams, procedures, priorities, availability, and emergency cases.',
      },
      {
        icon: 'consent',
        title: 'Digital Surgical Consent',
        desc: 'Capture procedure, anaesthesia, transfusion, and high-risk consent digitally.',
      },
      {
        icon: 'checklist',
        title: 'Surgical Safety Checklists',
        desc: 'Embed structured safety checks throughout pre-operative and intraoperative care.',
      },
      {
        icon: 'documentation',
        title: 'Intraoperative Documentation',
        desc: 'Record procedures, findings, medications, blood loss, implants, specimens, and complications.',
      },
      {
        icon: 'anaesthesia',
        title: 'Anaesthesia Management',
        desc: 'Capture assessments, medications, monitoring, airway management, and recovery records.',
      },
    ],
  },
  {
    key: 'operations',
    label: 'Operations',
    cards: [
      {
        icon: 'workforce',
        title: 'Healthcare Worker Management',
        desc: 'Manage staff profiles, credentials, licenses, privileges, performance, and professional records.',
      },
      {
        icon: 'roster',
        title: 'Staff Rostering & Shifts',
        desc: 'Build department-wide rosters with leave-aware scheduling and coverage planning.',
      },
      {
        icon: 'inventory',
        title: 'Inventory & Procurement',
        desc: 'Track hospital supplies, purchasing, stock levels, availability, and reorder needs.',
      },
      {
        icon: 'pharmacy',
        title: 'Integrated Pharmacy',
        desc: 'Connect prescribing, dispensing, medication safety, stock control, and billing.',
      },
      {
        icon: 'workflow',
        title: 'Automated Workflows',
        desc: 'Automate routine tasks, approvals, notifications, assignments, and escalations.',
      },
      {
        icon: 'analytics',
        title: 'Hospital Performance Analytics',
        desc: 'Monitor clinical, operational, workforce, and financial performance in real time.',
      },
    ],
  },
  {
    key: 'financial',
    label: 'Finance & Revenue',
    cards: [
      {
        icon: 'billing',
        title: 'Billing & Revenue Cycle',
        desc: 'Capture charges, generate invoices, manage payments, and track patient balances.',
      },
      {
        icon: 'pricing',
        title: 'Service Pricing Catalogue',
        desc: 'Manage department-specific pricing across consultations, diagnostics, pharmacy, surgery, and more.',
      },
      {
        icon: 'payments',
        title: 'Payments & Receipts',
        desc: 'Support cash, card, transfer, online payments, deposits, refunds, and reconciliation.',
      },
      {
        icon: 'insurance',
        title: 'HMO & Insurance Claims',
        desc: 'Connect clinical charges with payer workflows, claims, reconciliation, and tracking.',
      },
      {
        icon: 'revenue-ai',
        title: 'AI Revenue Intelligence',
        desc: 'Detect unusual billing patterns, missed charges, duplicate claims, and revenue leakage.',
      },
      {
        icon: 'reporting',
        title: 'Financial Reporting',
        desc: 'Give leadership a clear view of revenue, collections, balances, and financial performance.',
      },
    ],
  },
  {
    key: 'intelligence',
    label: 'AI & Intelligence',
    cards: [
      {
        icon: 'command',
        title: 'AI Hospital Command Center',
        desc: 'A unified operational view of departments, beds, workflows, resources, and hospital activity.',
      },
      {
        icon: 'documentation-ai',
        title: 'AI Medical Documentation',
        desc: 'Assist clinicians with faster documentation while keeping records connected.',
      },
      {
        icon: 'predictive',
        title: 'Predictive Hospital Intelligence',
        desc: 'Forecast demand, capacity, workloads, and resource requirements ahead of time.',
      },
      {
        icon: 'assistant',
        title: 'Natural-Language AI Assistant',
        desc: 'Allow authorized users to ask questions about permitted hospital data conversationally.',
      },
      {
        icon: 'risk-ai',
        title: 'Predictive Risk Intelligence',
        desc: 'Surface patient and operational risks early so teams can prioritize the right actions.',
      },
      {
        icon: 'insight',
        title: 'Real-Time Hospital Insights',
        desc: 'Turn connected hospital data into actionable clinical and executive intelligence.',
      },
    ],
  },
]

function Icon({
  type,
  className = 'h-8 w-8',
}: {
  type: IconType
  className?: string
}) {
  const props: SVGProps<SVGSVGElement> = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': true,
  }

  switch (type) {
    case 'ehr':
      return (
        <svg {...props}>
          <rect x="5" y="4" width="14" height="16" rx="2" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </svg>
      )

    case 'ai':
      return (
        <svg {...props}>
          <path d="M12 3v3M7 5l2 2M17 5l-2 2" />
          <rect x="5" y="8" width="14" height="11" rx="3" />
          <path d="M9 12h.01M15 12h.01M9 16h6" />
        </svg>
      )

    case 'emergency':
      return (
        <svg {...props}>
          <path d="M12 3 20 7v5c0 5-3.2 8-8 9-4.8-1-8-4-8-9V7l8-4Z" />
          <path d="M12 8v6M9 11h6" />
        </svg>
      )

    case 'bed':
      return (
        <svg {...props}>
          <path d="M4 17V8M4 14h16v5M7 14V9h5a3 3 0 0 1 3 3v2M4 19v2M20 19v2" />
        </svg>
      )

    case 'appointment':
      return (
        <svg {...props}>
          <rect x="4" y="5" width="16" height="15" rx="3" />
          <path d="M8 3v4M16 3v4M4 9h16M8 13h3M8 16h5" />
        </svg>
      )

    case 'risk':
      return (
        <svg {...props}>
          <path d="m12 3 9 16H3L12 3Z" />
          <path d="M12 9v4M12 16h.01" />
        </svg>
      )

    case 'lab':
      return (
        <svg {...props}>
          <path d="M9 3v6l-5 9a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-9V3" />
          <path d="M8 13h8M10 3h4" />
        </svg>
      )

    case 'radiology':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 4v5M19 12h-4M12 20v-5M5 12h4" />
        </svg>
      )

    case 'pacs':
      return (
        <svg {...props}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="m6 16 4-4 3 3 2-2 3 3" />
        </svg>
      )

    case 'image-ai':
      return (
        <svg {...props}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="m7 16 3-4 2 2 2-3 3 5M17 7h.01" />
        </svg>
      )

    case 'blood':
      return (
        <svg {...props}>
          <path d="M12 3s5 5.2 5 9a5 5 0 0 1-10 0c0-3.8 5-9 5-9Z" />
          <path d="M9 13c.3 1.4 1.3 2.3 3 2.7" />
        </svg>
      )

    case 'result':
      return (
        <svg {...props}>
          <path d="M6 4h9l3 3v13H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
          <path d="M15 4v3h3M8 11h8M8 15h5" />
        </svg>
      )

    case 'theatre':
      return (
        <svg {...props}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 9h8M8 13h8M10 17h4" />
        </svg>
      )

    case 'schedule':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v5l3 2" />
        </svg>
      )

    case 'consent':
      return (
        <svg {...props}>
          <path d="M6 4h9l3 3v13H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
          <path d="M15 4v3h3M8 13l2 2 5-5" />
        </svg>
      )

    case 'checklist':
      return (
        <svg {...props}>
          <path d="M5 5h14v14H5z" />
          <path d="m8 9 1 1 2-2M8 13l1 1 2-2M13 9h3M13 13h3" />
        </svg>
      )

    case 'documentation':
      return (
        <svg {...props}>
          <path d="M6 4h12v16H6z" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </svg>
      )

    case 'anaesthesia':
      return (
        <svg {...props}>
          <path d="M12 4v7M8 8h8M7 13a5 5 0 0 0 10 0M9 19h6" />
        </svg>
      )

    case 'workforce':
      return (
        <svg {...props}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <circle cx="17" cy="10" r="2.5" />
          <path d="M15 19a4 4 0 0 1 6 0" />
        </svg>
      )

    case 'roster':
      return (
        <svg {...props}>
          <rect x="4" y="5" width="16" height="15" rx="3" />
          <path d="M8 3v4M16 3v4M4 9h16M8 13h3M13 13h3M8 16h3" />
        </svg>
      )

    case 'inventory':
      return (
        <svg {...props}>
          <path d="m4 8 8-4 8 4-8 4-8-4Z" />
          <path d="M4 8v8l8 4 8-4V8M12 12v8" />
        </svg>
      )

    case 'pharmacy':
      return (
        <svg {...props}>
          <rect x="4" y="6" width="16" height="12" rx="3" />
          <path d="M9 12h6M12 9v6" />
        </svg>
      )

    case 'workflow':
      return (
        <svg {...props}>
          <circle cx="6" cy="6" r="2" />
          <circle cx="18" cy="12" r="2" />
          <circle cx="6" cy="18" r="2" />
          <path d="M8 7l8 4M8 17l8-4" />
        </svg>
      )

    case 'analytics':
      return (
        <svg {...props}>
          <path d="M5 19V5M5 19h14" />
          <rect x="8" y="13" width="2.5" height="4" rx="1" />
          <rect x="12" y="10" width="2.5" height="7" rx="1" />
          <rect x="16" y="7" width="2.5" height="10" rx="1" />
        </svg>
      )

    case 'billing':
      return (
        <svg {...props}>
          <path d="M5 4h14v16l-3-2-4 2-4-2-3 2V4Z" />
          <path d="M8 9h8M8 13h5" />
        </svg>
      )

    case 'pricing':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7v10M9 10h5a2 2 0 0 1 0 4H10" />
        </svg>
      )

    case 'payments':
      return (
        <svg {...props}>
          <rect x="4" y="6" width="16" height="12" rx="2" />
          <path d="M4 10h16M8 14h4" />
        </svg>
      )

    case 'insurance':
      return (
        <svg {...props}>
          <path d="M12 3 20 7v5c0 5-3.2 8-8 9-4.8-1-8-4-8-9V7l8-4Z" />
          <path d="M9 12h6M12 9v6" />
        </svg>
      )

    case 'revenue-ai':
      return (
        <svg {...props}>
          <path d="M5 19V5M5 19h14" />
          <path d="m8 15 3-4 3 2 4-6" />
          <path d="M17 7h2v2" />
        </svg>
      )

    case 'reporting':
      return (
        <svg {...props}>
          <path d="M6 4h12v16H6z" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </svg>
      )

    case 'command':
      return (
        <svg {...props}>
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M8 15h2v2H8zM11 11h2v6h-2zM14 8h2v9h-2z" />
        </svg>
      )

    case 'documentation-ai':
      return (
        <svg {...props}>
          <path d="M6 4h12v16H6z" />
          <path d="M9 8h6M9 12h4M9 16h5" />
          <path d="M18 3v3M16.5 4.5h3" />
        </svg>
      )

    case 'predictive':
      return (
        <svg {...props}>
          <path d="M5 19V5M5 19h14" />
          <path d="M8 15c2-1 2-5 4-5 2 0 2 3 4 2 1-.5 1.5-2 3-4" />
        </svg>
      )

    case 'assistant':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
          <path d="M8 12h8M12 8v8" />
        </svg>
      )

    case 'risk-ai':
      return (
        <svg {...props}>
          <path d="m12 3 8 4v5c0 5-3 8-8 9-5-1-8-4-8-9V7l8-4Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      )

    case 'insight':
      return (
        <svg {...props}>
          <path d="M9 18h6M10 21h4" />
          <path d="M8 14a6 6 0 1 1 8 0c-1 .8-1.5 1.6-1.5 3h-5c0-1.4-.5-2.2-1.5-3Z" />
        </svg>
      )

    default:
      return (
        <svg {...props}>
          <rect x="5" y="5" width="14" height="14" rx="4" />
          <path d="M8 12h8" />
        </svg>
      )
  }
}

export default function Solutions() {
  const [activeTab, setActiveTab] = useState('clinical')

  const currentTab =
    solutionTabs.find((tab) => tab.key === activeTab) ?? solutionTabs[0]

  return (
    <section
      id="solutions"
      className={`${poppins.className} bg-[#F8FBFC] px-4 py-16 text-[#0F172A] md:px-10 lg:px-12 lg:py-20`}
    >
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="mb-7 max-w-[740px]">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#1b7b68]/20 px-4 py-2">
            {/* <span className="h-2 w-2 rounded-full bg-[#1b7b68]" /> */}

            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1b7b68]">
              SOLUTIONS SUITE
            </span>
          </div>

          <h2 className="mt-3 text-[44px] font-extrabold leading-[1.05] tracking-[-1.5px] text-[#0F172A] sm:text-[52px] lg:text-[62px]">
            Everything Your
            <br />
            Hospital{' '}
            <span className="text-[#1B7B68]">
              Needs
            </span>
          </h2>

          <p className="mt-3 max-w-[660px] text-[15px] font-normal leading-6 text-[#4B5563]">
            One connected platform for clinical care, diagnostics, operations,
            finance, and intelligent healthcare management.
          </p>
        </div>

        <div
          className="mb-8 flex w-fit max-w-full items-center gap-2 overflow-x-auto rounded-xl bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
          role="tablist"
          aria-label="Hospital solution categories"
        >
          {solutionTabs.map((tab) => {
            const active = activeTab === tab.key

            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.key)}
                className={[
                  'shrink-0 whitespace-nowrap rounded-[10px] px-[18px] py-[14px]',
                  'text-[14px] font-bold leading-none transition-all duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B7B68]/30',
                  active
                    ? 'bg-[#1B7B68] text-white shadow-[0_10px_22px_rgba(27,123,104,0.22)]'
                    : 'bg-transparent text-[#1E293B] hover:-translate-y-px hover:bg-[#F0F8F6]',
                ].join(' ')}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div
          key={currentTab.key}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-x-7 lg:gap-y-8"
          role="tabpanel"
          aria-label={currentTab.label}
        >
          {currentTab.cards.map((card, index) => (
            <article
              key={card.title}
              className={[
                'group min-h-[164px] rounded-[28px] border bg-white p-6',
                'shadow-[0_1px_0_rgba(15,23,42,0.04)]',
                'transition-all duration-200',
                'hover:-translate-y-1 hover:border-[#1B7B68]',
                'hover:shadow-[inset_0_0_0_1px_#1B7B68,0_8px_26px_rgba(27,123,104,0.14)]',
                index === 0
                  ? 'border-[#5CB9A7]'
                  : 'border-[#D8E2EA]',
              ].join(' ')}
            >
              <div className="mb-2.5 flex h-[34px] w-[34px] items-center justify-center text-[#1B7B68] transition-transform duration-200 group-hover:scale-105">
                <Icon type={card.icon} className="h-full w-full" />
              </div>

              <h3 className="mb-2 text-[15px] font-bold leading-5 text-[#111827] sm:text-[14px]">
                {card.title}
              </h3>

              <p className="m-0 text-[14px] font-normal leading-[1.45] text-[#334155]">
                {card.desc}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}