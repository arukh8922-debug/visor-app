'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-[#222222]',
        className
      )}
    />
  );
}

function SkeletonText({ className, lines = 1 }: SkeletonProps & { lines?: number }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-xl bg-[#111111] p-4', className)}>
      <Skeleton className="h-6 w-1/3 mb-4" />
      <SkeletonText lines={3} />
    </div>
  );
}

function SkeletonAvatar({ className, size = 'md' }: SkeletonProps & { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  return (
    <Skeleton className={cn('rounded-full', sizes[size], className)} />
  );
}

function SkeletonButton({ className, size = 'md' }: SkeletonProps & { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'h-9 w-20',
    md: 'h-11 w-24',
    lg: 'h-13 w-32',
  };

  return (
    <Skeleton className={cn('rounded-xl', sizes[size], className)} />
  );
}

export { Skeleton, SkeletonText, SkeletonCard, SkeletonAvatar, SkeletonButton };
