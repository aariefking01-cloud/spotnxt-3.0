'use client';

import { useEffect, useState } from 'react';
import { Bell, Shield, Palette, Globe, CheckCircle2, CircleAlert, Clock3, Database, RefreshCw, KeyRound } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/motion';
import { safeFetchJson } from '@/lib/client-fetch';
import { MetaTokenConnector } from '@/components/dashboard/meta-token-connector';

type ProviderHealth = {
  id: string;
  name: string;
  category: 'inventory' | 'business' | 'workspace';
  connectionStatus: 'enabled' | 'configured' | 'not_configured' | 'unverified' | 'error';
  credentialsConfigured: boolean;
  permissions: string;
  officialCapabilities: string[];
  supportedMarkets: string[];
  lastCheckedAt: string;
  lastSyncAt?: string;
  recordsSynced: number;
  error?: string;
  note: string;
};

type ProviderResponse = {
  demoEnabled: boolean;
  liveMode: boolean;
  liveDataReady: boolean;
  checkedAt: string;
  note: string;
  providers: ProviderHealth[];
};

const settingsSections = [
  {
    icon: Bell, title: 'Notifications', description: 'Manage how you receive alerts',
    items: [
      { label: 'New competitor ads', desc: 'Get notified when a tracked competitor launches a new ad', enabled: true },
      { label: 'AI analysis complete', desc: 'Alert when AI finishes analyzing a creative', enabled: true },
      { label: 'Weekly digest', desc: 'Receive a summary of insights every Monday', enabled: true },
      { label: 'Spend alerts', desc: 'Notify when a competitor increases ad spend by 20%+', enabled: false },
    ],
  },
  {
    icon: Palette, title: 'Appearance', description: 'Customize how SpotNxt looks',
    items: [
      { label: 'Dark mode', desc: 'Use dark theme across the application', enabled: true },
      { label: 'Compact layout', desc: 'Reduce padding for denser information display', enabled: false },
      { label: 'Animations', desc: 'Enable motion and transitions', enabled: true },
    ],
  },
  {
    icon: Shield, title: 'Security', description: 'Protect your account',
    items: [
      { label: 'Two-factor authentication', desc: 'Require a code from your phone at login', enabled: false },
      { label: 'Login alerts', desc: 'Email when a new device signs in', enabled: true },
    ],
  },
];

function statusLabel(status: ProviderHealth['connectionStatus']) {
  switch (status) {
    case 'enabled': return 'Enabled';
    case 'configured': return 'Configured';
    case 'unverified': return 'Unverified';
    case 'error': return 'Error';
    default: return 'Not connected';
  }
}

function statusClass(status: ProviderHealth['connectionStatus']) {
  return status === 'enabled' || status === 'configured'
    ? 'border-success/20 bg-success/10 text-success'
    : status === 'error'
      ? 'border-destructive/20 bg-destructive/10 text-destructive'
      : 'border-warning/20 bg-warning/10 text-warning';
}

export default function SettingsPage() {
  const [providerData, setProviderData] = useState<ProviderResponse | null>(null);
  const [providerError, setProviderError] = useState('');
  const [refreshingProviders, setRefreshingProviders] = useState(false);

  const loadProviders = async () => {
    setRefreshingProviders(true);
    try {
      const payload = await safeFetchJson<ProviderResponse>('/api/intelligence/providers', { cache: 'no-store' });
      if (payload.data) {
        setProviderData(payload.data);
      }
      setProviderError('');
    } catch (error) {
      setProviderError(error instanceof Error ? error.message : 'Provider status is unavailable.');
    } finally {
      setRefreshingProviders(false);
    }
  };

  const toggleDemoMode = async (enabled: boolean) => {
    try {
      await safeFetchJson('/api/intelligence/providers/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demoMode: enabled }),
      });
      await loadProviders();
    } catch (err) {
      console.error('Failed to toggle demo mode:', err);
    }
  };

  useEffect(() => {
    void loadProviders();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure your SpotNxt AI workspace and Meta Ad Library data sources.</p>
      </div>

      <StaggerContainer className="space-y-6">
        {settingsSections.map((section) => (
          <StaggerItem key={section.title}>
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10">
                  <section.icon className="h-5 w-5 text-brand-500" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold">{section.title}</h3>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </div>
              </div>
              <div className="mt-4 divide-y divide-border/40">
                {section.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.desc}</div>
                    </div>
                    <Switch defaultChecked={item.enabled} />
                  </div>
                ))}
              </div>
            </Card>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <FadeIn>
        <MetaTokenConnector onConnected={() => void loadProviders()} />
      </FadeIn>

      <FadeIn>
        <Card className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10">
                <Database className="h-5 w-5 text-brand-500" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold">Data Sources & Meta Ad Library Connection</h3>
                <p className="text-sm text-muted-foreground">Live status, permissions, and synchronization health for Meta Ad Library.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadProviders()} disabled={refreshingProviders}>
              <RefreshCw className={refreshingProviders ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
              Refresh status
            </Button>
          </div>

          {providerData && (
            <>
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/20 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Demo Benchmark Mode</span>
                    <Badge variant="outline" className={providerData.demoEnabled ? "border-amber-500/30 text-amber-400 bg-amber-500/10 text-xs" : "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs"}>
                      {providerData.demoEnabled ? "Opt-in Sample Data" : "Live Meta API Provider"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    When enabled, the app evaluates pre-seeded real brand benchmarks (Nike, Adidas, Puma, Glossier, Gymshark). When disabled, queries require your official Meta access token.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{providerData.demoEnabled ? 'Demo Active' : 'Live Active'}</span>
                  <Switch
                    checked={providerData.demoEnabled}
                    onCheckedChange={(val) => void toggleDemoMode(val)}
                  />
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-border/50 bg-muted/20 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={providerData.liveMode && !providerData.liveDataReady ? 'border-warning/20 bg-warning/10 text-warning' : 'border-success/20 bg-success/10 text-success'}>
                    {providerData.liveMode && !providerData.liveDataReady ? 'Live Meta Ad Library token not configured' : providerData.demoEnabled ? 'Demo mode explicitly enabled' : 'Meta Ad Library connected'}
                  </Badge>
                  <span className="text-muted-foreground">Checked {new Date(providerData.checkedAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{providerData.note}</p>
              </div>
            </>
          )}

          {providerError && <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{providerError}</div>}

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {(providerData?.providers ?? []).map((provider) => (
              <div key={provider.id} className="rounded-xl border border-border/50 bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {provider.connectionStatus === 'enabled' || provider.connectionStatus === 'configured' ? <CheckCircle2 className="h-4 w-4 text-success" /> : <CircleAlert className="h-4 w-4 text-warning" />}
                      <h4 className="text-sm font-semibold">{provider.name}</h4>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{provider.category}</p>
                  </div>
                  <Badge variant="outline" className={statusClass(provider.connectionStatus)}>{statusLabel(provider.connectionStatus)}</Badge>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{provider.note}</p>
                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex items-start gap-2"><Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span>{provider.permissions}</span></div>
                  <div className="flex items-start gap-2"><Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span>Markets: {provider.supportedMarkets.join(', ')}</span></div>
                  <div className="flex items-start gap-2"><Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span>{provider.lastSyncAt ? `Last sync ${new Date(provider.lastSyncAt).toLocaleString()}` : 'No sync has been recorded.'} Records synced: {provider.recordsSynced}.</span></div>
                </div>
                {provider.error && <p className="mt-2 text-xs text-destructive">{provider.error}</p>}
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-muted-foreground">Credentials are never collected or exposed in the browser. Configure META_ACCESS_TOKEN in your environment or Settings menu to retrieve official competitor ads directly from Meta.</p>
        </Card>
      </FadeIn>

      <FadeIn>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10">
              <KeyRound className="h-5 w-5 text-brand-500" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">Meta Graph API Configuration</h3>
              <p className="text-sm text-muted-foreground">Requirements and environment setup for official Meta Ad Library queries.</p>
            </div>
          </div>
          <div className="mt-4 space-y-3 text-xs text-muted-foreground leading-relaxed">
            <p>SpotNxt queries the official <strong className="text-foreground">Meta Graph API Archive endpoint</strong> (<code className="rounded bg-muted px-1.5 py-0.5 text-foreground">https://graph.facebook.com/v21.0/ads_archive</code>) using your authorized access token.</p>
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
              <div className="font-medium text-foreground">Required Environment Variables:</div>
              <ul className="list-disc pl-5 space-y-1 font-mono text-[11px]">
                <li><strong className="text-foreground">META_ACCESS_TOKEN</strong>: Valid Facebook User, Page, or System User Access Token with Ad Library access permissions.</li>
                <li><strong className="text-foreground">META_GRAPH_API_VERSION</strong>: (Optional) defaults to <code className="text-foreground">v21.0</code>.</li>
                <li><strong className="text-foreground">META_DEFAULT_COUNTRY</strong>: (Optional) defaults to <code className="text-foreground">ALL</code> or specific 2-letter ISO code like <code className="text-foreground">US</code>, <code className="text-foreground">IN</code>.</li>
              </ul>
            </div>
            <p>All pagination, rate-limiting, and error-handling are managed server-side. No credentials or raw tokens are ever returned to the client browser.</p>
          </div>
        </Card>
      </FadeIn>

      <FadeIn>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10">
              <Globe className="h-5 w-5 text-brand-500" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">API Access & Automation</h3>
              <p className="text-sm text-muted-foreground">Server-managed intelligence pipelines and webhooks.</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label>Credential handling</Label>
            <Input value="Managed server-side; never displayed in the browser" readOnly className="font-mono text-xs" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Rotate credentials through your server deployment or secret manager. SpotNxt strictly adheres to official developer policies.</p>
        </Card>
      </FadeIn>
    </div>
  );
}
