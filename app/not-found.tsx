'use client';

import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
      <div className="space-y-4 max-w-md">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-400 font-bold text-2xl">
          404
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          The requested page could not be located. You can navigate back to the dashboard or explore competitor intelligence.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/dashboard" prefetch={false}>
            <Button className="gap-2 gradient-brand text-white">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
          <Link href="/" prefetch={false}>
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
