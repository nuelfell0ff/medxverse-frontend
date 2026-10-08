'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import {
  PanelLeft,
  Search,
  Settings,
  Building2,
  Loader2,
  X,
  FileText,
  UserRound,
  CalendarDays,
  FlaskConical,
  Pill,
  ReceiptText,
  Users,
  BedDouble,
  ScanLine,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { globalSearchService } from '@/services/global-search.service';
import { GlobalSearchResult } from '@/types/global-search';

interface NavbarProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

const iconForType = (type: string) => {
  if (type === 'patient') return UserRound;
  if (type === 'staff') return Users;
  if (type === 'appointment') return CalendarDays;
  if (type === 'laboratory' || type === 'laboratory-catalog') return FlaskConical;
  if (type === 'pharmacy' || type === 'prescription' || type === 'dispense' || type === 'pharmacy-formulary') return Pill;
  if (type === 'billing' || type === 'payment' || type === 'refund' || type === 'billing-plan') return ReceiptText;
  if (type === 'radiology') return ScanLine;
  if (type === 'ward' || type === 'bed' || type === 'bed-assignment' || type === 'transfer') return BedDouble;
  if (type === 'outpatient' || type === 'consultation' || type === 'admission') return Activity;
  return FileText;
};

export default function Navbar({ isSidebarCollapsed, onToggleSidebar }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { account, hasHydrated } = useAuthStore();
  const isHmo = account?.accountType === 'HMO';
  const isHms = account?.accountType === 'HOSPITAL' && account?.userType !== 'STAFF';

  const hospitalName = account?.name || 'Hospital';
  const systemSuffix = isHmo ? 'HMO Portal' : 'Hospital Management System';

  const [searchValue, setSearchValue] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    let currentHospitalName = account?.name;

    if (!currentHospitalName && typeof window !== 'undefined') {
      try {
        const rawStorage = localStorage.getItem('medxverse-auth-storage');
        if (rawStorage) {
          const parsed = JSON.parse(rawStorage);
          currentHospitalName = parsed?.state?.account?.name;
        }
      } catch (err) {
        console.error('Failed to parse cached title:', err);
      }
    }

    if (!currentHospitalName) return;

    const pathSegments = pathname.split('/').filter(Boolean);
    const rawPageName = pathSegments[pathSegments.length - 1] || '';
    const pageTitle = rawPageName
      ? rawPageName.charAt(0).toUpperCase() + rawPageName.slice(1).replace(/-/g, ' ')
      : '';

    if (!pageTitle || pageTitle.toLowerCase() === 'dashboard' || pageTitle.toLowerCase() === 'hms') {
      document.title = `${currentHospitalName} | ${systemSuffix}`;
    } else {
      document.title = `${pageTitle} | ${currentHospitalName} ${systemSuffix}`;
    }
  }, [pathname, account, hasHydrated, systemSuffix]);

  useEffect(() => {
    if (!isHms) {
      setSearchValue('');
      setResults([]);
      setSearchOpen(false);
      return;
    }

    const query = searchValue.trim();
    if (query.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setSearching(true);

    const timer = window.setTimeout(async () => {
      try {
        const nextResults = await globalSearchService.search(query, 30);
        if (requestId === requestIdRef.current) {
          setResults(nextResults);
          setSearchOpen(true);
        }
      } catch (error) {
        if (requestId === requestIdRef.current) {
          console.error('Global HMS search failed:', error);
          setResults([]);
          setSearchOpen(true);
        }
      } finally {
        if (requestId === requestIdRef.current) setSearching(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchValue, isHms]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const openResult = (result: GlobalSearchResult) => {
    setSearchOpen(false);
    setSearchValue('');
    router.push(result.path);
  };

  const clearSearch = () => {
    setSearchValue('');
    setResults([]);
    setSearchOpen(false);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      clearSearch();
      return;
    }

    if (event.key === 'Enter' && results[0]) {
      event.preventDefault();
      openResult(results[0]);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 w-full h-16 bg-white/95 backdrop-blur-md border-b border-slate-100 z-50 px-4 md:px-6 flex items-center justify-between transition-all duration-300 font-sans">
      <div className="flex items-center gap-3 md:gap-5 min-w-0 sm:min-w-[240px]">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-500 hover:text-[#1b7b68] hover:bg-[#e8f5f3] transition-all duration-200 active:scale-95 shrink-0"
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1b7b68] text-white flex items-center justify-center shadow-md shadow-[#1b7b68]/20 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>

          <div className="flex flex-col hidden sm:flex">
            <span className="text-base font-bold tracking-tight text-slate-800 leading-tight">
              {hospitalName}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
              {systemSuffix}
            </span>
          </div>
        </div>
      </div>

      <div ref={searchRef} className="flex-1 max-w-xl mx-4 hidden sm:block relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 z-10" />
        <input
          type="text"
          value={searchValue}
          onFocus={() => {
            if (searchValue.trim().length >= 2) setSearchOpen(true);
          }}
          onChange={(event) => {
            setSearchValue(event.target.value);
            setSearchOpen(event.target.value.trim().length >= 2);
          }}
          onKeyDown={handleSearchKeyDown}
          disabled={!isHms}
          placeholder={isHms ? 'Search patients, records, appointments, staff...' : 'Search patients, appointments, doctors...'}
          className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1b7b68]/20 focus:bg-white focus:border-[#1b7b68] transition-all duration-200 disabled:cursor-default"
          aria-label="Search HMS"
        />

        {searchValue && isHms && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {searchOpen && isHms && (
          <div className="absolute left-0 right-0 top-[calc(100%+10px)] bg-white border border-slate-100 rounded-2xl shadow-2xl shadow-slate-900/10 overflow-hidden">
            {searching ? (
              <div className="px-4 py-5 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-[#1b7b68]" />
                Searching hospital records...
              </div>
            ) : results.length > 0 ? (
              <div className="max-h-[min(70vh,520px)] overflow-y-auto py-1.5">
                {results.map((result) => {
                  const Icon = iconForType(result.type);
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      type="button"
                      onClick={() => openResult(result)}
                      className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-[#f0f8f6] transition-colors"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#e8f5f3] text-[#1b7b68] flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-800 truncate">{result.title}</p>
                          <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-[#1b7b68] bg-[#e8f5f3] px-1.5 py-0.5 rounded-md">
                            {result.label}
                          </span>
                        </div>
                        {result.subtitle && (
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">{result.subtitle}</p>
                        )}
                        {result.description && (
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{result.description}</p>
                        )}
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-5 text-center">
                <Search className="w-5 h-5 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">No matching records found</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Try a patient name, MRN, phone number, staff name, record ID, or medication.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <button
          type="button"
          onClick={() => router.push(account?.accountType === 'HMO' ? '/hmo/settings' : '/hms/settings')}
          className={`p-2 rounded-xl transition-all ${
            pathname === '/hms/settings' || pathname.startsWith('/hms/settings/') || pathname === '/hmo/settings' || pathname.startsWith('/hmo/settings/')
              ? 'bg-[#e8f5f3] text-[#1b7b68]'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          }`}
          aria-label="Open settings"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block" />

        <div className="flex items-center gap-3 pl-1">
          <div className="w-9 h-9 rounded-full bg-[#e8f5f3] border-2 border-[#1b7b68]/30 flex items-center justify-center text-[#1b7b68] font-bold text-xs overflow-hidden">
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${account?.name || 'Admin'}`}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
