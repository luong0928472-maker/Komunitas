import { cn } from '@/lib/utils';

/** komunitas mark — three contributors converging on a shared coin. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-7 w-7', className)} aria-hidden role="img">
      <rect width="32" height="32" rx="9" fill="var(--color-brand-700)" />
      <circle cx="16" cy="12" r="3.1" fill="var(--color-accent-400)" />
      <circle cx="10.5" cy="20" r="2.6" fill="#fff" opacity="0.92" />
      <circle cx="21.5" cy="20" r="2.6" fill="#fff" opacity="0.92" />
      <path
        d="M16 14.6 L11 19 M16 14.6 L21 19"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className="font-display text-lg font-bold tracking-tight text-ink">
        komunitas
      </span>
    </span>
  );
}
