import * as React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'active' | 'passed' | 'rejected' | 'funded' | 'neutral' | 'accent';

const variants: Record<BadgeVariant, string> = {
  active: 'bg-brand-100 text-brand-800 ring-1 ring-brand-200',
  passed: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  funded: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
  rejected: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
  neutral: 'bg-stone-100 text-stone-600 ring-1 ring-stone-200',
  accent: 'bg-accent-500/15 text-accent-600 ring-1 ring-accent-500/30',
};

const labels: Record<string, string> = {
  active: 'Voting open',
  passed: 'Passed · awaiting funds',
  funded: 'Funded on-chain',
  rejected: 'Rejected',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const variant = (['active', 'passed', 'funded', 'rejected'].includes(status)
    ? status
    : 'neutral') as BadgeVariant;
  return (
    <Badge variant={variant} className={className}>
      {labels[status] ?? status}
    </Badge>
  );
}

export function Badge({
  variant = 'neutral',
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
