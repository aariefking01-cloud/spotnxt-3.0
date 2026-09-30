'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Radar } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  const pathname = usePathname();
  const isLanding = pathname === '/';
  const linkHref = isLanding ? '#top' : '/';

  return (
    <Link href={linkHref} className={cn('flex items-center gap-2.5 group', className)}>
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl gradient-brand shadow-lg shadow-brand-500/30 transition-transform group-hover:scale-105">
        <Radar className="h-5 w-5 text-white" strokeWidth={2.5} />
        <div className="absolute inset-0 rounded-xl bg-brand-500/20 blur-md -z-10" />
      </div>
      {showText && (
        <span className="font-display text-lg font-bold tracking-tight">
          SpotNxt<span className="text-brand-400"> AI</span>
        </span>
      )}
    </Link>
  );
}
