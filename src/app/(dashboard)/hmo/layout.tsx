// 'use client';

// import { useEffect, useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { useAuthStore } from '@/store/useAuthStore';
// import Sidebar from '@/components/layout/Sidebar';
// import Navbar from '@/components/layout/Navbar';
// import { Loader2 } from 'lucide-react';

// export default function HmsLayout({ children }: { children: React.ReactNode }) {
//   const router = useRouter();
//   const { isAuthenticated, account } = useAuthStore();
//   const [isMounted, setIsMounted] = useState(false);

//   // Layout state for collapsing sidebar and handling mobile menu
//   const [isCollapsed, setIsCollapsed] = useState(false);
//   const [isMobileOpen, setIsMobileOpen] = useState(false);

//   // Prevent hydration mismatch when Zustand loads from localStorage
//   useEffect(() => {
//     setIsMounted(true);
//   }, []);

//   useEffect(() => {
//     if (!isMounted) return;

//     if (!isAuthenticated) {
//       router.replace('/auth/login');
//     } else if (account?.accountType === 'HMO') {
//       router.replace('/hmo');
//     }
//   }, [isAuthenticated, account, isMounted, router]);

//   const handleToggleSidebar = () => {
//     if (window.innerWidth < 768) {
//       setIsMobileOpen((prev) => !prev);
//     } else {
//       setIsCollapsed((prev) => !prev);
//     }
//   };

//   // Show loading spinner while client-side store hydrates
//   if (!isMounted) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-slate-50">
//         <Loader2 className="w-8 h-8 animate-spin text-[#1b7b68]" />
//       </div>
//     );
//   }

//   // If not authenticated or wrong account type, hold render until redirect triggers
//   if (!isAuthenticated || account?.accountType !== 'HOSPITAL') {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-slate-50">
//         <Loader2 className="w-8 h-8 animate-spin text-[#1b7b68]" />
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-[#f8fafc] font-sans antialiased text-slate-800">
//       {/* Top Fixed Navbar */}
//       <Navbar
//         isSidebarCollapsed={isCollapsed}
//         onToggleSidebar={handleToggleSidebar}
//       />

//       {/* Left Fixed Sidebar */}
//       <Sidebar
//         isCollapsed={isCollapsed}
//         isMobileOpen={isMobileOpen}
//         onCloseMobile={() => setIsMobileOpen(false)}
//       />

//       {/* Main Responsive View Container */}
//       <div
//         className={`pt-16 transition-all duration-300 ease-in-out ${
//           isCollapsed ? 'md:pl-20' : 'md:pl-64'
//         }`}
//       >
//         <main className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-4rem)]">
//           {children}
//         </main>
//       </div>
//     </div>
//   );
// }