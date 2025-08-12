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
  Calendar
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
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Navigation */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <Trash2 className="h-8 w-8 text-green-600" />
                <span className="text-xl font-bold text-gray-900">WasteMS</span>
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
                      'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200',
                      isActive
                        ? 'border-green-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-sm font-semibold">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user?.first_name} {user?.last_name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    {user?.role && (
                      <Badge className={cn('text-xs', getRoleColor(user.role))}>
                        {formatRole(user.role)}
                      </Badge>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center">
                    <UserCircle className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
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