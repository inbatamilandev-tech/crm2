import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { AssistantProvider } from '../components/assistant/AssistantProvider';
import FloatingAssistant from '../components/assistant/FloatingAssistant';

/**
 * Pages listed here manage their OWN scroll / height and must NOT be wrapped
 * in the standard scrollable container.
 */
const FULL_HEIGHT_ROUTES = ['/tasks', '/emails'];

export default function MainLayout() {
  const { pathname } = useLocation();
  const isFullHeight = FULL_HEIGHT_ROUTES.some((r) => pathname.startsWith(r));

  return (
    <AssistantProvider>
      <div className="flex h-screen overflow-hidden bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-300">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Abstract Background Elements */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#0F172A]/5 dark:bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#0F172A]/5 dark:bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

          <Header />

          {isFullHeight ? (
            /* Full-height pages (Tasks, Emails) control their own layout & scroll */
            <main className="flex-1 overflow-hidden relative z-10">
              <Outlet />
            </main>
          ) : (
            /* Standard pages get a scrollable container with consistent padding */
            <main className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 scroll-smooth custom-scrollbar">
              <div className="mx-auto max-w-[1600px] p-4 md:p-8">
                <Outlet />
              </div>
            </main>
          )}
        </div>
        
        {/* Floating Assistant injected globally across authenticated pages */}
        <FloatingAssistant />
      </div>
    </AssistantProvider>
  );
}
