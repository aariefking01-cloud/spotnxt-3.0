'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log client error to console
    console.error('App-level error boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
      <div className="space-y-4 max-w-md">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          {error?.message || 'An unexpected rendering error occurred while loading this view.'}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button onClick={() => reset()} className="gap-2 gradient-brand text-white">
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>
          <Button variant="outline" onClick={() => { window.location.href = '/dashboard'; }}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
