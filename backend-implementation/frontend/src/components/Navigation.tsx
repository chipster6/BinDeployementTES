'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  LayoutDashboard, 
  Users, 
  Truck, 
  Trash2, 
  UserCircle, 
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Home,
  Package,
  MapPin,
  Calendar,
  Shield
} from 'lucide-react';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ElementType;
  allowedRoles?: UserRole[];
  badge?: string;
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Customers',
    href: '/customers',
    icon: Users,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OFFICE_STAFF, UserRole.DISPATCHER],
  },
  {
    name: 'Bins',
    href: '/bins',
    icon: Trash2,
  },
  {
    name: 'Routes',
    href: '/routes',
    icon: MapPin,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DISPATCHER, UserRole.DRIVER],
  },
  {
    name: 'Vehicles',
    href: '/vehicles',
    icon: Truck,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DISPATCHER],
  },
  {
    name: 'Drivers',
    href: '/drivers',
    icon: UserCircle,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DISPATCHER],
  },
  {
    name: 'Billing',
    href: '/billing',
    icon: CreditCard,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OFFICE_STAFF, UserRole.CUSTOMER, UserRole.CUSTOMER_STAFF],
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OFFICE_STAFF],
  },
  {
    name: 'Users',
    href: '/users',
    icon: Users,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    name: 'Security',
    href: '/soc',
    icon: Shield,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
    badge: 'SOC',
  },
  {
    name: 'Admin',
    href: '/admin',
    icon: Settings,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
    badge: 'ADMIN',
  },
];

export function Navigation() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // Filter navigation items based on user role
  const allowedNavItems = navigationItems.filter(item => {
    if (!item.allowedRoles) return true;
    return user ? item.allowedRoles.includes(user.role) : false;
  });

  const handleLogout = async () => {
    await logout();
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return 'bg-red-100 text-red-800';
      case UserRole.ADMIN:
        return 'bg-purple-100 text-purple-800';
      case UserRole.DISPATCHER:
        return 'bg-blue-100 text-blue-800';
      case UserRole.OFFICE_STAFF:
        return 'bg-green-100 text-green-800';
      case UserRole.DRIVER:
        return 'bg-orange-100 text-orange-800';
      case UserRole.CUSTOMER:
        return 'bg-indigo-100 text-indigo-800';
      case UserRole.CUSTOMER_STAFF:
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatRole = (role: UserRole) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getUserInitials = () => {
    if (!user) return 'U';
    return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`;
  };

  return (
    <div className="bg-white shadow-lg border-b border-gray-200/50 backdrop-blur-sm">
      <div className="content-container px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Navigation */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="flex items-center space-x-3 interactive-subtle p-2 rounded-lg">
                <div className="relative">
                  <Trash2 className="h-8 w-8 text-green-600" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>
                <div className="hidden sm:block">
                  <span className="text-xl font-bold text-gray-900">WasteMS</span>
                  <div className="text-xs text-gray-500 font-medium">Professional</div>
                </div>
              </Link>
            </div>
            
            <nav className="hidden md:ml-8 md:flex md:space-x-8">
              {allowedNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium transition-all duration-200 rounded-t-lg',
                      isActive
                        ? 'border-green-500 text-green-700 bg-green-50/50'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50/50'
                    )}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.name}
                    {item.badge && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* Status Indicator */}
            <div className="hidden md:flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600 font-medium">System Online</span>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full ring-2 ring-transparent hover:ring-green-200 transition-all duration-200">
                  <Avatar className="h-10 w-10 shadow-md">
                    <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  {user?.mfa_enabled && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 p-2" align="end" forceMount>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50">
                  <Avatar className="h-12 w-12 shadow-md">
                    <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white font-semibold">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1 leading-none min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{user?.first_name} {user?.last_name}</p>
                    <p className="text-xs text-gray-600 truncate">{user?.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {user?.role && (
                        <Badge className={cn('text-xs px-2 py-1', getRoleColor(user.role))}>
                          {formatRole(user.role)}
                        </Badge>
                      )}
                      {user?.mfa_enabled && (
                        <Badge variant="outline" className="text-xs px-2 py-1 border-blue-200 text-blue-700">
                          MFA Enabled
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center p-2 rounded-md hover:bg-gray-50 transition-colors">
                    <UserCircle className="mr-3 h-4 w-4 text-gray-500" />
                    <span className="font-medium">Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center p-2 rounded-md hover:bg-gray-50 transition-colors">
                    <Settings className="mr-3 h-4 w-4 text-gray-500" />
                    <span className="font-medium">Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 p-2 rounded-md hover:bg-red-50 transition-colors font-medium">
                  <LogOut className="mr-3 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile Navigation - you can expand this later */}
      <div className="md:hidden">
        {/* Mobile menu button - implement if needed */}
      </div>
    </div>
  );
}