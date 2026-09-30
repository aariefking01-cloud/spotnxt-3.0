'use client';

import { Check, CreditCard, Download, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FadeIn } from '@/components/motion';
import { pricingPlans } from '@/lib/data';
import { cn } from '@/lib/utils';

const billingHistory = [
  { date: 'Jul 24, 2026', amount: '$149.00', status: 'Paid', invoice: 'INV-2026-007' },
  { date: 'Jun 24, 2026', amount: '$149.00', status: 'Paid', invoice: 'INV-2026-006' },
  { date: 'May 24, 2026', amount: '$149.00', status: 'Paid', invoice: 'INV-2026-005' },
  { date: 'Apr 24, 2026', amount: '$49.00', status: 'Paid', invoice: 'INV-2026-004' },
];

export default function SubscriptionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Subscription</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your plan, billing, and usage.</p>
      </div>

      <FadeIn>
        <Card className="relative overflow-hidden p-6">
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-brand-500/10 blur-3xl" />
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-brand">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-xl font-bold">Growth Plan</h3>
                  <Badge className="gradient-brand text-white">Active</Badge>
                </div>
                <p className="text-sm text-muted-foreground">$149/month · Renews on Aug 24, 2026</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Change Plan</Button>
              <Button variant="outline" size="sm" className="text-destructive">Cancel</Button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: 'Competitors', used: 18, total: 25 },
              { label: 'AI Analyses', used: 342, total: '∞' },
              { label: 'Reports', used: 12, total: '∞' },
              { label: 'API Calls', used: '4.2K', total: '10K' },
            ].map((usage) => (
              <div key={usage.label} className="rounded-xl border border-border/60 p-4">
                <div className="text-xs text-muted-foreground">{usage.label}</div>
                <div className="mt-1 text-2xl font-bold tabular-nums">
                  {usage.used}<span className="text-sm font-normal text-muted-foreground">/{usage.total}</span>
                </div>
                {typeof usage.total === 'number' && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full gradient-brand"
                      style={{ width: `${(Number(usage.used) / Number(usage.total)) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </FadeIn>

      <div>
        <h3 className="mb-4 font-display text-lg font-semibold">Available Plans</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {pricingPlans.map((plan) => (
            <Card key={plan.name} className={cn('p-6', plan.name === 'Growth' && 'border-brand-500 shadow-lg')}>
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{plan.name}</h4>
                {plan.name === 'Growth' && <Badge className="gradient-brand text-white">Current</Badge>}
              </div>
              <div className="mt-2">
                <span className="text-3xl font-bold">${plan.price}</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <ul className="mt-4 space-y-2">
                {plan.features.slice(0, 4).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-success" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.name === 'Growth' ? 'outline' : 'default'}
                size="sm"
                className={cn('mt-4 w-full', plan.name !== 'Growth' && 'gradient-brand text-white')}
                disabled={plan.name === 'Growth'}
              >
                {plan.name === 'Growth' ? 'Current Plan' : plan.name === 'Scale' ? 'Contact Sales' : 'Upgrade'}
              </Button>
            </Card>
          ))}
        </div>
      </div>

      <FadeIn>
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-brand-500" />
            <h3 className="font-display text-lg font-semibold">Billing History</h3>
          </div>
          <div className="mt-4 space-y-2">
            {billingHistory.map((bill) => (
              <div key={bill.invoice} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{bill.invoice}</div>
                    <div className="text-xs text-muted-foreground">{bill.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="bg-success/10 text-success">{bill.status}</Badge>
                  <span className="text-sm font-medium">{bill.amount}</span>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <Download className="h-3.5 w-3.5" /> PDF
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </FadeIn>
    </div>
  );
}
