'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Recycle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requiresMfa, setRequiresMfa] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login({
        email,
        password,
        ...(requiresMfa && { mfaCode }),
      });

      if (result.success) {
        toast({
          title: 'Login successful',
          description: 'Welcome back!',
        });
        router.push('/dashboard');
      } else {
        // Check if MFA is required
        if (result.message.includes('MFA') || result.message.includes('2FA')) {
          setRequiresMfa(true);
          toast({
            title: 'MFA Required',
            description: 'Please enter your authentication code.',
          });
        } else {
          toast({
            title: 'Login failed',
            description: result.message,
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <Trash2 className="h-12 w-12 text-green-600" />
              <Recycle className="h-6 w-6 text-blue-600 absolute -top-1 -right-1" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Waste Management</h1>
          <p className="text-gray-600 mt-2">Professional waste collection system</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11"
                />
              </div>

              {requiresMfa && (
                <div className="space-y-2">
                  <Label htmlFor="mfaCode">Authentication Code</Label>
                  <Input
                    id="mfaCode"
                    type="text"
                    placeholder="Enter your 6-digit code"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    maxLength={6}
                    disabled={isLoading}
                    className="h-11 text-center text-lg tracking-widest"
                  />
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-11 text-base"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <Link 
                href="/forgot-password" 
                className="text-blue-600 hover:text-blue-500 hover:underline"
              >
                Forgot your password?
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>Need help? Contact your system administrator</p>
          <div className="flex items-center justify-center space-x-4 mt-2">
            <span className="inline-flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              System Online
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}