'use client';

import { motion } from 'framer-motion';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar,
} from 'recharts';
import { TrendingUp, TrendingDown, Sparkles, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/motion';
import { competitors, engagementTrend, platformDistribution } from '@/lib/data';
import { cn } from '@/lib/utils';
import { ProviderGate } from '@/components/dashboard/provider-gate';

const trendKeywords = [
  { keyword: 'AI-powered', growth: 340, trend: 'up' },
  { keyword: 'Limited edition', growth: 210, trend: 'up' },
  { keyword: 'Sustainable', growth: 180, trend: 'up' },
  { keyword: 'Free shipping', growth: 95, trend: 'up' },
  { keyword: 'Flash sale', growth: -15, trend: 'down' },
  { keyword: 'Click here', growth: -42, trend: 'down' },
];

const formatTrend = [
  { format: 'Video', share: 42, change: 12 },
  { format: 'Image', share: 28, change: -8 },
  { format: 'Carousel', share: 18, change: 5 },
  { format: 'Story', share: 12, change: 3 },
];

export default function TrendsPage() {
  return (
    <ProviderGate title="Trend intelligence is unavailable">
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Trend Analysis</h1>
        <p className="mt-1 text-sm text-muted-foreground">Discover emerging creative trends and platform shifts.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <FadeIn className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold">Ad Volume & Engagement Trend</h3>
                <p className="text-sm text-muted-foreground">7-month historical data</p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <TrendingUp className="h-3 w-3" /> +14.2% MoM
              </Badge>
            </div>
            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={engagementTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="ads" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="engagement" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </FadeIn>

        <FadeIn>
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold">Format Distribution</h3>
            <p className="text-sm text-muted-foreground">Share by ad format</p>
            <div className="mt-6 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart data={formatTrend} innerRadius="30%" outerRadius="100%" dataKey="share">
                  <RadialBar background dataKey="share" cornerRadius={6} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {formatTrend.map((f) => (
                <div key={f.format} className="flex items-center justify-between text-sm">
                  <span>{f.format}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium tabular-nums">{f.share}%</span>
                    <span className={cn('text-xs', f.change > 0 ? 'text-success' : 'text-destructive')}>
                      {f.change > 0 ? '+' : ''}{f.change}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </FadeIn>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FadeIn>
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold">Trending Keywords</h3>
            <p className="text-sm text-muted-foreground">Most used keywords in competitor ads</p>
            <div className="mt-4 space-y-3">
              {trendKeywords.map((kw) => (
                <div key={kw.keyword} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                  <span className="text-sm font-medium">{kw.keyword}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(Math.abs(kw.growth) / 4, 100)}%` }}
                        transition={{ duration: 0.8 }}
                        className={cn('h-full rounded-full', kw.trend === 'up' ? 'gradient-brand' : 'bg-destructive')}
                      />
                    </div>
                    <span className={cn('flex items-center gap-0.5 text-xs font-medium', kw.trend === 'up' ? 'text-success' : 'text-destructive')}>
                      {kw.trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(kw.growth)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </FadeIn>

        <FadeIn>
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold">Platform Spend Trend</h3>
            <p className="text-sm text-muted-foreground">Estimated monthly spend ($M)</p>
            <div className="mt-6 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engagementTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                  <Bar dataKey="spend" radius={[6, 6, 0, 0]} fill="hsl(var(--chart-3))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </FadeIn>
      </div>

      <FadeIn>
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold">Competitor Trend Comparison</h3>
          <p className="text-sm text-muted-foreground">AI Score & engagement rate by competitor</p>
          <StaggerContainer className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {competitors.map((c) => (
              <StaggerItem key={c.id}>
                <div className="rounded-xl border border-border/60 p-4 transition-all hover:border-brand-500/30">
                  <div className="flex items-center gap-3">
                    <img src={c.logoUrl} alt={c.name} className="h-10 w-10 rounded-lg object-cover" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.industry}</div>
                    </div>
                    <span className={cn('flex items-center gap-0.5 text-xs font-medium', c.trend === 'up' ? 'text-success' : 'text-destructive')}>
                      {c.trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {c.trendValue}%
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-lg font-bold">{c.aiScore}</div>
                      <div className="text-xs text-muted-foreground">AI Score</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{c.avgEngagement}%</div>
                      <div className="text-xs text-muted-foreground">Engagement</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{c.activeCampaigns}</div>
                      <div className="text-xs text-muted-foreground">Campaigns</div>
                    </div>
                  </div>
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
