'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles = [], 
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Wait for auth check to complete

    if (!isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    // Check role permissions if specified
    if (allowedRoles.length > 0 && user) {
      const hasPermission = allowedRoles.includes(user.role);
      if (!hasPermission) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [user, loading, isAuthenticated, allowedRoles, router, redirectTo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Check role permissions
  if (allowedRoles.length > 0 && user) {
    const hasPermission = allowedRoles.includes(user.role);
    if (!hasPermission) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}