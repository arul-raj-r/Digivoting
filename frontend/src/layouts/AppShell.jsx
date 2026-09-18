import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/shared/Header';
import Sidebar from '../components/shared/Sidebar';
import DigiVoteHelpWidget from '../components/ai/DigiVoteHelpWidget';

export default function AppShell({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('digivote_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('digivote_sidebar_collapsed', isCollapsed ? 'true' : 'false');
  }, [isCollapsed]);

  return (
    <div className="min-h-screen bg-[#f7f5f0] dark:bg-[#101216] text-stone-900 dark:text-stone-100 flex flex-col transition-colors font-sans">
      {/* Top Navigation Header */}
      <Header 
        mobileMenuOpen={mobileMenuOpen} 
        setMobileMenuOpen={setMobileMenuOpen} 
      />

      <div className="flex-1 flex w-full">
        {/* Modern Collapsible Sidebar */}
        <Sidebar 
          mobileMenuOpen={mobileMenuOpen} 
          setMobileMenuOpen={setMobileMenuOpen}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />

        {/* Main Application Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {children || <Outlet />}
        </main>
      </div>

      {/* Subtle Floating DigiVote Help Widget */}
      <DigiVoteHelpWidget />
    </div>
  );
}
