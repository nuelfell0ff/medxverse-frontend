'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Menu,
  X,
  UserRound,
  ArrowRight,
} from 'lucide-react';

import medxverseLogo from '@/assets/images/IMG_0344-Photoroom.png';

const navigationItems = [
  { label: 'Home', href: '#home' },
  { label: 'Product', href: '#product' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'About us', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

export default function Navbar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Main Navbar */}
      <header className="fixed inset-x-0 top-0 z-50 w-full border-b border-white/30 bg-white/20 font-sans backdrop-blur-xl">
        <div className="mx-auto flex h-[92px] w-full max-w-[1180px] items-center justify-between px-6 lg:px-8">

          {/* Logo */}
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

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-10 md:flex">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="font-sans text-[14px] font-medium text-slate-600 transition-colors hover:text-[#1b7b68]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Sign In */}
          <Link
            href="/auth/login"
            className="hidden items-center gap-2 rounded-[14px] border border-[#1b7b68]/15 bg-white/30 px-5 py-3 font-sans text-[14px] font-medium text-slate-700 backdrop-blur-sm transition-all hover:border-[#1b7b68]/30 hover:bg-white/60 md:flex"
          >
            <UserRound className="h-[17px] w-[17px]" />
            <span>Sign in</span>
          </Link>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#1b7b68]/15 bg-white/30 text-slate-700 backdrop-blur-sm transition-all hover:border-[#1b7b68]/30 hover:bg-white/60 md:hidden"
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-slate-950/20 backdrop-blur-[2px] transition-opacity duration-300 md:hidden ${
          sidebarOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* Mobile Sidebar */}
      <aside
        className={`fixed right-0 top-0 z-[70] flex h-screen w-[min(86vw,380px)] flex-col border-l border-slate-200/70 bg-white font-sans shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          sidebarOpen
            ? 'translate-x-0'
            : 'translate-x-full'
        }`}
        aria-label="Mobile navigation"
      >
        {/* Sidebar Header */}
        <div className="flex h-[92px] items-center justify-between border-b border-slate-100 px-6">

          {/* Mobile Logo */}
          <Link
            href="/"
            onClick={closeSidebar}
            className="flex items-center"
            aria-label="MedXverse home"
          >
            <Image
              src={medxverseLogo}
              alt="MedXverse"
              priority
              className="h-auto w-[165px] object-contain sm:w-[175px]"
            />
          </Link>

          {/* Close Button */}
          <button
            type="button"
            onClick={closeSidebar}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:border-[#1b7b68]/30 hover:text-[#1b7b68]"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex flex-1 flex-col px-6 py-8">
          <div className="flex flex-col gap-2">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                className="group flex items-center justify-between rounded-xl px-4 py-3.5 font-sans text-[15px] font-medium text-slate-700 transition-all hover:bg-[#1b7b68]/5 hover:text-[#1b7b68]"
              >
                <span>{item.label}</span>

                <ArrowRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
              </Link>
            ))}
          </div>

          {/* Sidebar Actions */}
          <div className="mt-auto border-t border-slate-100 pt-6">

            {/* Sign In */}
            <Link
              href="/auth/login"
              onClick={closeSidebar}
              className="mb-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#1b7b68]/25 bg-white px-5 font-sans text-[14px] font-medium text-[#1b7b68] transition-all hover:bg-[#1b7b68]/5"
            >
              <UserRound className="h-4 w-4" />
              Sign in
            </Link>

            {/* Get Started */}
            <Link
              href="/auth/register"
              onClick={closeSidebar}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 font-sans text-[14px] font-medium text-white shadow-lg shadow-[#1b7b68]/20 transition-all hover:-translate-y-0.5"
              style={{
                backgroundColor: '#1b7b68',
              }}
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </nav>
      </aside>
    </>
  );
}