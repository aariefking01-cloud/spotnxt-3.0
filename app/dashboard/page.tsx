'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Eye, Sparkles, TrendingUp, ArrowUpRight, ArrowDownRight,
  AlertCircle, Download, Filter, Brain, Target, Zap, Activity,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/motion';
import {
  dashboardStats, engagementTrend, platformDistribution,
  intelligenceFeed, aiRecommendations, topPerformingAds,
  heatmapData, competitors,
} from '@/lib/data';
import { cn } from '@/lib/utils';

type DashboardSummary = {
  source: string;
  sourceLabel: string;
  generatedAt: string;
  counts: {
    totalAds: number;
    activeAds: number;
    newAdsLast7Days: number;
    analyzedAds: number;
    averageAnalysisConfidence: number;
  };
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/intelligence/summary', { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload?.error?.message || 'Intelligence summary unavailable.');
        setSummary(payload.data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setSummary(null);
      });
    return () => controller.abort();
  }, []);

  const hasSourceBackedData = Boolean(summary && summary.counts.totalAds > 0 && summary.source !== 'unavailable');
  return (
    <div className="space-y-6">
      <IntelligenceHeader summary={summary} />
      <OverviewCards summary={summary} />
      {hasSourceBackedData ? <>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <EngagementChart />
          <PlatformChart />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <IntelligenceFeed />
          <AIRecommendations />
          <HeatmapSection />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CompetitorRanking />
          <TopPerformingAds />
        </div>
      </> : <DataSourceEmpty summary={summary} />}
    </div>
  );
}

function IntelligenceHeader({ summary }: { summary: DashboardSummary | null }) {
  return (
    <FadeIn>
      <div className="relative overflow-hidden rounded-xl border border-white/[0.06] glass-card p-6">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10">
            <Brain className="h-4 w-4 text-brand-400" />
          </div>
          <Badge variant="secondary" className={summary?.source === 'demo-provider' ? 'border-warning/20 bg-warning/10 text-warning' : summary?.source === 'configured-provider' ? 'border-success/20 bg-success/10 text-success' : 'border-warning/20 bg-warning/10 text-warning'}>
            <span className={cn('mr-1.5 h-1.5 w-1.5 rounded-full', summary?.source === 'configured-provider' ? 'bg-success animate-pulse' : 'bg-warning')} />
            {summary?.source === 'demo-provider' ? 'Demo data (opt-in)' : summary?.source === 'configured-provider' ? 'Provider connected' : 'Live data source not connected'}
          </Badge>
        </div>
        <h2 className="mt-3 font-display text-xl font-bold tracking-tight">
          {summary?.source === 'demo-provider' ? 'Demo intelligence is available for exploration.' : summary?.source === 'configured-provider' ? 'Source-backed intelligence is ready for analysis.' : 'Connect a compliant provider to activate live intelligence.'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {summary ? `${summary.sourceLabel} · ${summary.counts.totalAds.toLocaleString()} indexed ads · ${summary.counts.analyzedAds.toLocaleString()} analyzed records` : 'Checking provider and freshness state…'}
        </p>
      </div>
    </FadeIn>
  );
}

function OverviewCards({ summary }: { summary: DashboardSummary | null }) {
  const counts = summary?.counts;
  const cards = [
    {
      label: 'Active Ads',
      value: counts ? counts.activeAds.toLocaleString() : '—',
      icon: Eye,
      trend: counts ? 'Source-backed' : 'Unavailable',
      trendUp: Boolean(counts),
      period: 'vs previous 7 days',
      color: 'text-brand-400',
    },
    {
      label: 'New Ads This Week',
      value: counts ? counts.newAdsLast7Days.toString() : '—',
      icon: Zap,
      trend: counts ? 'Observed' : 'Unavailable',
      trendUp: Boolean(counts),
      period: 'vs previous 7 days',
      color: 'text-chart-2',
    },
    {
      label: 'Creative Shifts',
      value: counts ? '—' : '—',
      icon: Activity,
      trend: counts ? 'Not computed' : 'Unavailable',
      trendUp: false,
      period: 'vs previous 7 days',
      color: 'text-chart-3',
    },
    {
      label: 'Trend Momentum',
      value: counts ? '—' : '—',
      icon: TrendingUp,
      trend: counts ? 'Not computed' : 'Unavailable',
      trendUp: false,
      period: 'vs previous 7 days',
      color: 'text-prediction',
    },
  ];

  return (
    <StaggerContainer className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <StaggerItem key={card.label}>
          <Card className="group p-5 transition-all hover:border-brand-500/20 hover:bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10">
                <card.icon className={cn('h-4 w-4', card.color)} />
              </div>
              <span className={cn('flex items-center gap-0.5 text-xs font-medium', card.trendUp ? 'text-success' : 'text-destructive')}>
                {card.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {card.trend}
              </span>
            </div>
            <div className="mt-3 text-3xl font-bold tabular-nums">{card.value}</div>
            <div className="text-xs text-muted-foreground">{card.label}</div>
            <div className="mt-1 text-xs text-muted-foreground/60">{card.period}</div>
          </Card>
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}

function DataSourceEmpty({ summary }: { summary: DashboardSummary | null }) {
  return (
    <FadeIn>
      <Card className="p-8 text-center">
        <Brain className="mx-auto h-8 w-8 text-brand-400" />
        <h3 className="mt-4 font-display text-lg font-semibold">{summary?.source === 'configured-provider' ? 'Provider connected; waiting for indexed records' : 'Live data source not connected'}</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{summary?.source === 'configured-provider' ? 'No synchronized records are available for this workspace yet. Run an approved provider sync before using live dashboard metrics.' : 'Connect Meta Ad Library or another approved provider from Settings → Data Sources & Connections. Demo data is available only when explicitly enabled on the server.'}</p>
        <Button asChild variant="outline" className="mt-5"><a href="/dashboard/settings">Open Data Sources & Connections</a></Button>
      </Card>
    </FadeIn>
  );
}

function EngagementChart() {
  return (
    <FadeIn className="lg:col-span-2">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold">Ad Volume & Engagement</h3>
            <p className="text-sm text-muted-foreground">Monthly performance across tracked competitors</p>
          </div>
          <Badge variant="secondary" className="gap-1">
            <span className="h-2 w-2 rounded-full bg-brand-500" /> Ads
            <span className="ml-2 h-2 w-2 rounded-full bg-chart-3" /> Engagement
          </Badge>
        </div>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={engagementTrend}>
              <defs>
                <linearGradient id="colorAds" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorEng2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
              <Area type="monotone" dataKey="ads" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#colorAds)" />
              <Area type="monotone" dataKey="engagement" stroke="hsl(var(--chart-3))" strokeWidth={2} fill="url(#colorEng2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </FadeIn>
  );
}

function PlatformChart() {
  return (
    <FadeIn>
      <Card className="p-6">
        <h3 className="font-display text-lg font-semibold">Platform Distribution</h3>
        <p className="text-sm text-muted-foreground">Active ads by platform</p>
        <div className="mt-6 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={platformDistribution}
                cx="50%" cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
              >
                {platformDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 space-y-2">
          {platformDistribution.map((p) => (
            <div key={p.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                <span>{p.name}</span>
              </div>
              <span className="font-medium tabular-nums">{p.value}%</span>
            </div>
          ))}
        </div>
      </Card>
    </FadeIn>
  );
}

function IntelligenceFeed() {
  return (
    <FadeIn className="lg:col-span-2">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-brand-400" />
            <h3 className="font-display text-lg font-semibold">Competitive Intelligence Feed</h3>
          </div>
          <Button variant="ghost" size="sm" className="gap-2">
            <Filter className="h-4 w-4" /> Filter
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {intelligenceFeed.map((event) => (
            <div key={event.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-brand-500/20">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{event.competitor}</span>
                    <Badge variant="secondary" className="text-xs">{event.category}</Badge>
                  </div>
                  <p className="mt-1.5 text-sm text-foreground">{event.event}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{event.evidence}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-brand-400">
                      <Target className="h-3 w-3" /> {event.recommendedAction}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge
                    variant="secondary"
                    className={cn(
                      event.impact === 'Critical' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                      event.impact === 'High' ? 'bg-warning/10 text-warning border-warning/20' :
                      'bg-muted text-muted-foreground'
                    )}
                  >
                    {event.impact}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                    {event.confidence}% confidence
                  </div>
                  <span className="text-xs text-muted-foreground/60">{event.timestamp}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </FadeIn>
  );
}

function AIRecommendations() {
  return (
    <FadeIn>
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-400" />
          <h3 className="font-display text-lg font-semibold">Recommended Actions</h3>
        </div>
        <div className="mt-4 space-y-3">
          {aiRecommendations.slice(0, 4).map((rec) => (
            <div key={rec.id} className="rounded-lg border border-white/[0.06] p-3 transition-colors hover:border-brand-500/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{rec.title}</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-xs',
                    rec.priority === 'Critical' ? 'bg-destructive/10 text-destructive' :
                    rec.priority === 'High' ? 'bg-warning/10 text-warning' : ''
                  )}
                >
                  {rec.priority}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{rec.whyNow}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs text-brand-400">
                  <Target className="h-3 w-3" /> {rec.suggestedNextStep}
                </span>
                <span className="text-xs text-muted-foreground">{rec.confidence}%</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </FadeIn>
  );
}

function HeatmapSection() {
  const maxVal = Math.max(...heatmapData.flatMap((d) => d.hours));
  return (
    <FadeIn>
      <Card className="p-6">
        <h3 className="font-display text-lg font-semibold">Engagement Heatmap</h3>
        <p className="text-sm text-muted-foreground">Ad activity by day &amp; hour</p>
        <div className="mt-4 space-y-1.5">
          {heatmapData.map((row) => (
            <div key={row.day} className="flex items-center gap-2">
              <span className="w-8 text-xs text-muted-foreground">{row.day}</span>
              <div className="flex flex-1 gap-1">
                {row.hours.map((val, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="h-6 flex-1 rounded-sm"
                    style={{
                      backgroundColor: `hsl(262 83% 58% / ${0.15 + (val / maxVal) * 0.85})`,
                    }}
                    title={`${val} interactions`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>12 AM</span>
          <span>12 PM</span>
          <span>11 PM</span>
        </div>
      </Card>
    </FadeIn>
  );
}

function CompetitorRanking() {
  return (
    <FadeIn>
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Competitor Ranking</h3>
          <Button variant="ghost" size="sm">View All</Button>
        </div>
        <div className="mt-4 space-y-3">
          {competitors.slice(0, 5).map((comp, i) => (
            <div key={comp.id} className="flex items-center gap-3">
              <span className="w-5 text-sm font-bold text-muted-foreground">{i + 1}</span>
              <img src={comp.logoUrl} alt={comp.name} className="h-9 w-9 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{comp.name}</span>
                  <span className={cn('flex items-center gap-0.5 text-xs', comp.trend === 'up' ? 'text-success' : comp.trend === 'down' ? 'text-destructive' : 'text-muted-foreground')}>
                    {comp.trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : comp.trend === 'down' ? <ArrowDownRight className="h-3 w-3" /> : null}
                    {comp.trendValue}%
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{comp.totalAds} ads · {comp.activeCampaigns} campaigns</div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-brand-400" />
                  <span className="text-sm font-bold">{comp.aiScore}</span>
                </div>
                <div className="text-xs text-muted-foreground">AI Score</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </FadeIn>
  );
}

function TopPerformingAds() {
  return (
    <FadeIn>
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Top Performing Ads</h3>
          <Badge variant="secondary" className="text-xs">This Week</Badge>
        </div>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topPerformingAds} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="competitor" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={60} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="engagement" radius={[0, 6, 6, 0]} fill="hsl(var(--chart-1))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </FadeIn>
  );
}
