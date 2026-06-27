'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Vault, ScrollText, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Wordmark } from './Logo';
import { ConnectButton } from './ConnectButton';

const NAV = [
  { href: '/dashboard', label: 'Treasury', icon: Vault },
  { href: '/proposals', label: 'Proposals', icon: ScrollText },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="min-h-screen bg-civic">
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="komunitas home">
            <Wordmark />
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-brand-100 text-brand-800'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-ink',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <ConnectButton />
        </div>
        {/* mobile nav */}
        <nav className="flex items-center gap-1 border-t border-stone-200/70 px-2 py-1.5 sm:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium',
                isActive(item.href) ? 'bg-brand-100 text-brand-800' : 'text-stone-600',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-2 border-t border-stone-200/70 pt-6 text-sm text-stone-500 sm:flex-row sm:items-center">
          <span>komunitas · community treasuries on Stellar testnet</span>
          <Link href="/stats" className="hover:text-brand-700">
            Live interaction stats →
          </Link>
        </div>
      </footer>
    </div>
  );
}
