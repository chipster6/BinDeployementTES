'use client';

import React from 'react';
import { Navigation } from './Navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-primary">
      <Navigation />
      <main className="content-container section-padding animate-fade-in">
        <div className="space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
}