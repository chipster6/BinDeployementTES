"use client";

import React, { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SOCDashboard } from '@/components/soc/SOCDashboard';
import { UserRole } from '@/lib/types';

export default function SOCPage() {
  const { user } = useContext(AuthContext);

  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]}>
      <div className="container mx-auto px-4 py-8">
        <SOCDashboard 
          userRole={user?.role || UserRole.CUSTOMER} 
          className="w-full"
        />
      </div>
    </ProtectedRoute>
  );
}