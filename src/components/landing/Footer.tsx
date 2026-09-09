import Link from 'next/link'
import Image from 'next/image'
import { Poppins } from 'next/font/google'
import medxverseLogo from '@/assets/images/IMG_0344-Photoroom.png';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const platformLinks = [
  { name: 'Solutions', href: '#solutions' },
  { name: 'How It Works', href: '#how-it-works' },
  { name: 'About MedXverse', href: '#about' },
  { name: 'Get Started', href: '/auth/register' },
]

const solutionLinks = [
  { name: 'Clinical Care', href: '#solutions' },
  { name: 'Diagnostics', href: '#solutions' },
  { name: 'Surgery & Theatre', href: '#solutions' },
  { name: 'Hospital Operations', href: '#solutions' },
]

const companyLinks = [
  { name: 'About Us', href: '#about' },
  { name: 'Contact', href: '#contact' },
  { name: 'Sign In', href: '/auth/login' },
  { name: 'Register', href: '/auth/register' },
]

const supportLinks = [
  { name: 'Privacy Policy', href: '#privacy' },
  { name: 'Terms of Service', href: '#terms' },
  { name: 'Cookie Policy', href: '#cookies' },
  { name: 'Contact Support', href: '#contact' },
]

export default function Footer() {
  return (
    <footer
      className={`${poppins.className} relative overflow-hidden bg-[#0F5F51] text-left text-white`}
    >
      {/* Subtle Grid Background */}
      {/* <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #ffffff 1px, transparent 1px),
            linear-gradient(to bottom, #ffffff 1px, transparent 1px)
          `,
          backgroundSize: '44px 44px',
        }}
      /> */}

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 pb-6 pt-14 md:px-10 lg:px-12 lg:pt-16">
        {/* Main Footer */}
        <div className="mb-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] lg:gap-8">
          {/* Brand */}
          <div className="max-w-[330px]">
            <Link
            href="/"
            // onClick={closeSidebar}
            className="group flex items-center"
            aria-label="MedXverse home"
          >
            <Image
              src={medxverseLogo}
              alt="MedXverse"
              priority
              className="h-auto w-[160px] object-contain transition-opacity duration-200 group-hover:opacity-85 sm:w-[170px] lg:w-[180px]"
            />
          </Link>

            <p className="max-w-[310px] text-[13px] leading-6 text-white/65">
              An intelligent hospital management platform connecting
              patients, clinical teams, diagnostics, pharmacy, finance, and
              hospital operations in one system.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h3 className="mb-5 text-[14px] font-bold text-white">
              Platform
            </h3>

            <ul className="flex flex-col gap-3">
              {platformLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="inline-block text-[12px] font-medium text-white/60 transition-all duration-200 hover:translate-x-1 hover:text-white"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <h3 className="mb-5 text-[14px] font-bold text-white">
              Solutions
            </h3>

            <ul className="flex flex-col gap-3">
              {solutionLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="inline-block text-[12px] font-medium text-white/60 transition-all duration-200 hover:translate-x-1 hover:text-white"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-5 text-[14px] font-bold text-white">
              Company
            </h3>

            <ul className="flex flex-col gap-3">
              {companyLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="inline-block text-[12px] font-medium text-white/60 transition-all duration-200 hover:translate-x-1 hover:text-white"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="mb-5 text-[14px] font-bold text-white">
              Support
            </h3>

            <ul className="flex flex-col gap-3">
              {supportLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="inline-block text-[12px] font-medium text-white/60 transition-all duration-200 hover:translate-x-1 hover:text-white"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-white/10" />

        {/* Bottom Bar */}
        <div className="flex flex-col items-center justify-between gap-4 pt-6 md:flex-row">
          <p className="text-center text-[11px] font-medium text-white/55 md:text-left">
            © {new Date().getFullYear()} MedXverse. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            <Link
              href="#privacy"
              className="text-[11px] font-medium text-white/55 transition-colors duration-200 hover:text-white"
            >
              Privacy Policy
            </Link>

            <Link
              href="#terms"
              className="text-[11px] font-medium text-white/55 transition-colors duration-200 hover:text-white"
            >
              Terms of Service
            </Link>

            <Link
              href="#cookies"
              className="text-[11px] font-medium text-white/55 transition-colors duration-200 hover:text-white"
            >
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}