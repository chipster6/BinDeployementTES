'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole, LoginCredentials, RegisterData } from '@/lib/types';
import { apiClient } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; message: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  checkRole: (roles: UserRole[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = user !== null;

  // Check if user has any of the specified roles
  const checkRole = (roles: UserRole[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  // Refresh user profile
  const refreshUser = async () => {
    try {
      const response = await apiClient.getProfile();
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        setUser(null);
        apiClient.clearToken();
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
      apiClient.clearToken();
    }
  };

  // Login function
  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await apiClient.login(credentials);
      
      if (response.success && response.user) {
        setUser(response.user);
        return { success: true, message: response.message };
      } else {
        return { success: false, message: response.message || 'Login failed' };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Login failed' 
      };
    }
  };

  // Register function
  const register = async (data: RegisterData) => {
    try {
      const response = await apiClient.register(data);
      
      if (response.success && response.user) {
        setUser(response.user);
        return { success: true, message: response.message };
      } else {
        return { success: false, message: response.message || 'Registration failed' };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Registration failed' 
      };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      if (token) {
        await refreshUser();
      }
      
      setLoading(false);
    };

    checkAuth();
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    checkRole,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}