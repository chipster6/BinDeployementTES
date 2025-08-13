import React from 'react';
import { cn } from '@/lib/utils';

export interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'warning' | 'error' | 'success' | 'active' | 'inactive';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

const statusConfig = {
  online: {
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  active: {
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  success: {
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  offline: {
    color: 'bg-gray-400',
    textColor: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
  inactive: {
    color: 'bg-gray-400',
    textColor: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
  warning: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  error: {
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
};

const sizeConfig = {
  sm: { dot: 'w-2 h-2', text: 'text-xs', padding: 'px-2 py-1' },
  md: { dot: 'w-3 h-3', text: 'text-sm', padding: 'px-3 py-1' },
  lg: { dot: 'w-4 h-4', text: 'text-base', padding: 'px-4 py-2' },
};

export function StatusIndicator({ 
  status, 
  label, 
  size = 'md', 
  animated = true, 
  className 
}: StatusIndicatorProps) {
  const config = statusConfig[status];
  const sizeStyles = sizeConfig[size];

  if (!label) {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <div 
          className={cn(
            'rounded-full',
            config.color,
            sizeStyles.dot,
            animated && 'animate-pulse'
          )}
        />
      </div>
    );
  }

  return (
    <div 
      className={cn(
        'inline-flex items-center space-x-2 rounded-full border backdrop-blur-sm',
        config.bgColor,
        config.borderColor,
        sizeStyles.padding,
        className
      )}
    >
      <div 
        className={cn(
          'rounded-full',
          config.color,
          sizeStyles.dot,
          animated && 'animate-pulse'
        )}
      />
      <span className={cn('font-medium', config.textColor, sizeStyles.text)}>
        {label}
      </span>
    </div>
  );
}

export default StatusIndicator;