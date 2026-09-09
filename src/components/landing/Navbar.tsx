'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image'
import { Poppins } from 'next/font/google';
import medxverseLogo from '@/assets/images/IMG_0344-Photoroom.png';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const navigationLinks = [
  { name: 'About', href: '#about' },
  { name: 'Solutions', href: '#solutions' },
  { name: 'How It Works', href: '#how-it-works' },
  // { name: 'Features', href: '#features' },
  // { name: 'Contact', href: '#contact' },
];

export default function Navbar() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((previous) => !previous);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <>
      {/* Main Navbar */}
      <nav
        className={`${poppins.className} fixed inset-x-0 top-0 z-[1040] h-[88px] w-full border-b border-black/[0.04] bg-white`}
      >
        <div className="flex h-full w-full items-center justify-between px-4 md:px-10 lg:px-12">
          {/* Brand */}
          <Link
            href="/"
            onClick={closeSidebar}
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

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={toggleSidebar}
            className="relative flex h-[46px] w-[46px] items-center justify-center border-0 bg-transparent p-0 lg:hidden"
            aria-label="Toggle navigation"
            aria-expanded={isSidebarOpen}
          >
            <span className="relative block h-[2px] w-6 bg-[#0b1a2e]">
              <span className="absolute left-0 top-[-6px] block h-[2px] w-6 bg-[#0b1a2e]" />
              <span className="absolute bottom-[-6px] left-0 block h-[2px] w-6 bg-[#0b1a2e]" />
            </span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden items-center lg:flex lg:flex-1 lg:justify-between lg:pl-10">
            <ul className="mx-auto flex items-center gap-[22px]">
              {navigationLinks.map((link) => (
                <li key={link.name} className="list-none">
                  <Link
                    href={link.href}
                    className="text-[13px] font-medium text-[#5b6e80] no-underline transition-all duration-300 hover:text-[#1b7b68]"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Desktop Actions */}
            <div className="flex shrink-0 items-center gap-3">
              <Link
                href="#how-it-works"
                className="rounded-full border-[1.5px] border-[#dcdfe3] bg-transparent px-[22px] py-[10px] text-[13px] font-semibold text-[#0b1a2e] no-underline transition-all duration-300 hover:border-[#0b1a2e] hover:bg-[#f8f9fa]"
              >
                How It Works
              </Link>

              <Link
                href="/auth/login"
                className="rounded-full px-[26px] py-[10px] text-[13px] font-semibold text-white no-underline transition-all duration-300 hover:-translate-y-px hover:opacity-90"
                style={{ backgroundColor: '#1b7b68' }}
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={closeSidebar}
          className="fixed inset-0 z-[1050] h-screen w-screen border-0 bg-black/30 p-0 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`${poppins.className} fixed right-0 top-0 z-[1060] flex h-screen w-[280px] flex-col bg-white shadow-[-5px_0_25px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-in-out lg:hidden ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Mobile navigation"
      >
        {/* Sidebar Header */}
        <div className="flex h-[76px] items-center justify-between border-b border-slate-100 px-6">
          <Link
            href="/"
            onClick={closeSidebar}
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

          {/* Close Button */}
          <button
            type="button"
            onClick={closeSidebar}
            className="flex h-11 w-11 items-center justify-center border-0 bg-transparent p-0 text-[#0b1a2e] opacity-80"
            aria-label="Close navigation"
          >
            <span className="relative block h-5 w-5">
              <span className="absolute left-1/2 top-1/2 block h-[2px] w-6 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#0b1a2e]" />
              <span className="absolute left-1/2 top-1/2 block h-[2px] w-6 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-[#0b1a2e]" />
            </span>
          </button>
        </div>

        {/* Sidebar Body */}
        <div className="flex flex-1 flex-col px-6 py-7">
          <ul className="m-0 flex list-none flex-col gap-6 p-0">
            {navigationLinks.map((link) => (
              <li key={link.name}>
                <Link
                  href={link.href}
                  onClick={closeSidebar}
                  className="block text-[18px] font-medium text-[#5b6e80] no-underline transition-all duration-300 hover:pl-[5px] hover:text-[#1b7b68]"
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>

          {/* Sidebar Actions */}
          <div className="mt-auto flex flex-col gap-3 border-t border-slate-100 pt-6">
            <Link
              href="#how-it-works"
              onClick={closeSidebar}
              className="w-full rounded-full border-[1.5px] border-[#dcdfe3] bg-transparent px-[22px] py-3 text-center text-[14px] font-semibold text-[#0b1a2e] no-underline transition-all duration-300 hover:bg-[#f8f9fa]"
            >
              How It Works
            </Link>

            <Link
              href="/auth/login"
              onClick={closeSidebar}
              className="w-full rounded-full px-[26px] py-3 text-center text-[14px] font-semibold text-white no-underline transition-all duration-300 hover:opacity-90"
              style={{ backgroundColor: '#1b7b68' }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}