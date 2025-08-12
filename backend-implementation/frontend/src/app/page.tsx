'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Trash2, Recycle } from 'lucide-react';

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  // Show loading state while checking authentication
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center mb-6">
          <div className="relative animate-pulse">
            <Trash2 className="h-16 w-16 text-green-600" />
            <Recycle className="h-8 w-8 text-blue-600 absolute -top-2 -right-2" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Waste Management System</h1>
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    </div>
  );
}
