'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Database } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { safeFetchJson } from '@/lib/client-fetch';

export function ProviderGate({ children, title = 'Source-backed intelligence is unavailable' }: { children: ReactNode; title?: string }) {
  const [state, setState] = useState<{ demoEnabled: boolean; liveDataReady: boolean } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    safeFetchJson<{ demoEnabled: boolean; liveDataReady: boolean }>('/api/intelligence/providers')
      .then((payload) => {
        if (!active) return;
        const data = payload.data;
        if (data) {
          setState({ demoEnabled: Boolean(data.demoEnabled), liveDataReady: Boolean(data.liveDataReady) });
        } else {
          setState({ demoEnabled: false, liveDataReady: false });
        }
      })
      .catch((reason) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : 'Provider status is unavailable.');
      });

    return () => {
      active = false;
    };
  }, []);

  if (!state && !error) {
    return (
      <Card className="p-8 text-center">
        <Database className="mx-auto h-8 w-8 animate-pulse text-brand-400" />
        <p className="mt-3 text-sm text-muted-foreground">Checking provider and freshness state…</p>
      </Card>
    );
  }

  if (error || !state || (!state.demoEnabled && !state.liveDataReady)) {
    return (
      <Card className="p-8 text-center">
        <Database className="mx-auto h-8 w-8 text-brand-400" />
        <Badge className="mt-4 border-warning/20 bg-warning/10 text-warning">Live data source not connected</Badge>
        <h2 className="mt-3 font-display text-lg font-semibold">{title}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Connect an approved provider from Settings → Data Sources & Connections, or synchronize real creatives via the Meta Ad Library tab.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <a href="/dashboard/settings">Open Data Sources & Connections</a>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {state.demoEnabled && <Badge className="border-warning/20 bg-warning/10 text-warning">Demo data (opt-in) · local sample records</Badge>}
      {children}
    </div>
  );
}
