'use client';

import { motion } from 'framer-motion';
import { Bell, AlertCircle, Check, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/motion';
import { alertData } from '@/lib/data';
import { cn } from '@/lib/utils';
import { ProviderGate } from '@/components/dashboard/provider-gate';

export default function NotificationsPage() {
  return (
    <ProviderGate title="Alerts are unavailable">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Alerts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Intelligent alerts on competitor activity and market signals.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Check className="h-4 w-4" /> Mark all read
        </Button>
      </div>

      <FadeIn>
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-brand-400" />
            <h3 className="font-display text-lg font-semibold">Active Alerts</h3>
            <Badge variant="secondary" className="ml-auto">6 unread</Badge>
          </div>
          <StaggerContainer className="mt-4 space-y-3">
            {alertData.map((alert) => (
              <StaggerItem key={alert.id}>
                <div className="group flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-brand-500/20">
                  <div className={cn(
                    'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
                    alert.severity === 'Critical' ? 'bg-destructive/10 text-destructive' :
                    alert.severity === 'High' ? 'bg-warning/10 text-warning' :
                    alert.severity === 'Medium' ? 'bg-brand-500/10 text-brand-400' : 'bg-muted text-muted-foreground'
                  )}>
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{alert.title}</span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-xs',
                          alert.severity === 'Critical' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                          alert.severity === 'High' ? 'bg-warning/10 text-warning border-warning/20' :
                          alert.severity === 'Medium' ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' : ''
                        )}
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{alert.description}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground/60">
                      <span>{alert.competitor}</span>
                      <span>·</span>
                      <span>{alert.category}</span>
                      <span>·</span>
                      <span>{alert.timestamp}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </Card>
      </FadeIn>
    </div>
    </ProviderGate>
  );
}
