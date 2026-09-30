'use client';

import Link from 'next/link';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import {
  ArrowRight, Eye, FileText, Users, TrendingUp, Sparkles, Bell,
  Radar, Check, Star, Quote, Globe, Shield, Zap, ChevronRight,
  Activity, Target, Brain, AlertCircle, BarChart3,
} from 'lucide-react';
import { LandingNav } from '@/components/landing-nav';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  landingStats, landingFeatures, landingProblems, landingIntelligence,
  testimonials, pricingPlans, faqs, landingRecommendations,
} from '@/lib/data';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ElementType> = {
  Eye, FileText, Users, TrendingUp, Sparkles, Bell,
};

export default function LandingPage() {
  return (
    <div id="top" className="relative min-h-screen overflow-hidden bg-background">
      <LandingNav />
      <HeroSection />
      <TrustSection />
      <ProblemSection />
      <IntelligenceEngineSection />
      <HowItWorksSection />
      <DashboardPreviewSection />
      <CompetitiveComparisonSection />
      <RecommendationsSection />
      <FinalCTASection />
      <FooterSection />
    </div>
  );
}

/* ─── HERO ─── */
function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center justify-center px-6 pt-24">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 grid-pattern opacity-[0.15] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
        <motion.div
          className="absolute top-1/3 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600/15 blur-[140px]"
          animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-prediction/10 blur-[120px]"
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        {/* Floating data particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-brand-400/40"
            style={{ left: `${15 + i * 14}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{ y: [0, -20, 0], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
          />
        ))}
      </div>

      <div className="mx-auto max-w-5xl text-center">
        <FadeIn delay={0.1}>
          <Badge variant="secondary" className="mb-6 gap-2 rounded-full border-brand-500/20 bg-brand-500/10 px-4 py-1.5 text-brand-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
            </span>
            Real-Time Meta Ads Competitive Intelligence
          </Badge>
        </FadeIn>

        <FadeIn delay={0.2}>
          <h1 className="font-display text-5xl font-bold tracking-tight text-balance sm:text-6xl md:text-7xl">
            Turn Meta Ads Into
            <br />
            <span className="gradient-text">Competitive Intelligence</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.3}>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-balance sm:text-xl">
            SpotNxt AI analyzes competitor ads, creatives, messaging, and market trends
            to reveal what is working — and what you should do next.
          </p>
        </FadeIn>

        <FadeIn delay={0.4}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button size="lg" className="group gradient-brand text-white shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50 transition-all">
                Analyze Your Ads
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="gap-2 border-white/10 hover:bg-white/5">
                <Eye className="h-4 w-4" />
                Explore Intelligence
              </Button>
            </Link>
          </div>
        </FadeIn>

        <FadeIn delay={0.5}>
          <p className="mt-6 text-sm text-muted-foreground/70">
            No credit card required · 14-day free trial · Cancel anytime
          </p>
        </FadeIn>

        {/* AI Engine Visualization */}
        <FadeIn delay={0.6} duration={0.8}>
          <div className="relative mt-16 mx-auto max-w-4xl">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-brand-500/10 via-prediction/10 to-brand-500/10 blur-2xl" />
            <div className="relative rounded-2xl border border-white/[0.06] glass-card overflow-hidden shadow-2xl">
              {/* Scan line effect */}
              <motion.div
                className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/60 to-transparent z-10"
                animate={{ y: [0, 300, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-destructive/60" />
                  <div className="h-3 w-3 rounded-full bg-warning/60" />
                  <div className="h-3 w-3 rounded-full bg-success/60" />
                </div>
                <div className="mx-auto text-xs text-muted-foreground">app.spotnxt.ai/dashboard</div>
              </div>
              <div className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand">
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Competitive Intelligence Engine</div>
                    <div className="text-xs text-muted-foreground">Illustrative sample view — connect a provider to populate live data</div>
                  </div>
                  <Badge className="ml-auto gap-1 bg-success/10 text-success border-success/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                    Preview
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    { label: 'Active Ads', value: '1,284', icon: Eye, trend: '+18.4%', color: 'text-brand-400' },
                    { label: 'New This Week', value: '47', icon: Activity, trend: '+12.3%', color: 'text-chart-2' },
                    { label: 'Creative Shifts', value: '8', icon: Zap, trend: '+33%', color: 'text-chart-3' },
                    { label: 'Trend Momentum', value: '72', icon: TrendingUp, trend: '+5.2%', color: 'text-prediction' },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 + i * 0.1 }}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                    >
                      <div className="flex items-center justify-between">
                        <stat.icon className={cn('h-4 w-4', stat.color)} />
                        <span className="text-xs text-success">{stat.trend}</span>
                      </div>
                      <div className="mt-2 text-xl font-bold tabular-nums">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Ad Volume & Engagement</span>
                    <span className="text-xs text-muted-foreground">Last 7 months</span>
                  </div>
                  <div className="flex h-24 items-end gap-1.5">
                    {[40, 52, 58, 65, 72, 80, 92].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: 1 + i * 0.08, duration: 0.5, ease: 'easeOut' }}
                        className="flex-1 rounded-t gradient-brand opacity-70"
                      />
                    ))}
                  </div>
                </div>
                {/* Intelligence feed preview */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.6 }}
                  className="mt-4 space-y-2"
                >
                  {[
                    { competitor: 'NovaFit', event: 'Video creative adoption increased 34%', impact: 'High', confidence: 92 },
                    { competitor: 'Lingua', event: 'Short-form video volume increased 45%', impact: 'High', confidence: 95 },
                  ].map((item) => (
                    <div key={item.competitor} className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.01] p-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10">
                        <AlertCircle className="h-3.5 w-3.5 text-brand-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <span className="text-xs font-semibold">{item.competitor}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{item.event}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">{item.confidence}%</Badge>
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── TRUST ─── */
function TrustSection() {
  return (
    <section className="border-y border-white/[0.04] py-16">
      <div className="mx-auto max-w-7xl px-6">
        <StaggerContainer className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {landingStats.map((stat) => (
            <StaggerItem key={stat.label} className="text-center">
              <div className="font-display text-4xl font-bold gradient-text md:text-5xl">{stat.value}</div>
              <div className="mt-2 text-sm text-muted-foreground">{stat.label}</div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ─── PROBLEM ─── */
function ProblemSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">The Problem</Badge>
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl text-balance">
            Your Competitors Are Advertising.
            <br /><span className="gradient-text">Are You Learning From It?</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Most marketing teams spend hours manually researching competitors — and still miss the patterns that matter.
          </p>
        </FadeIn>

        <StaggerContainer className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {landingProblems.map((problem) => (
            <StaggerItem key={problem.title}>
              <Card className="group h-full p-5 transition-all hover:border-brand-500/20 hover:bg-white/[0.02]">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold">{problem.title}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{problem.description}</p>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ─── INTELLIGENCE ENGINE ─── */
function IntelligenceEngineSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">AI Intelligence Engine</Badge>
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl text-balance">
            One AI Engine.
            <br /><span className="gradient-text">Every Competitive Signal.</span>
          </h2>
        </FadeIn>

        <StaggerContainer className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {landingIntelligence.map((item) => {
            const Icon = iconMap[item.icon] || Sparkles;
            return (
              <StaggerItem key={item.title}>
                <Card className="group h-full p-6 transition-all hover:border-brand-500/20 hover:bg-white/[0.02]">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 transition-all group-hover:bg-brand-500 group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ─── HOW IT WORKS ─── */
function HowItWorksSection() {
  const steps = [
    { num: '01', title: 'Discover', desc: 'SpotNxt AI finds and monitors every relevant competitor ad across approved Meta, Google, YouTube, and LinkedIn sources when connected.', icon: Eye },
    { num: '02', title: 'Analyze', desc: 'Our AI engine analyzes creative, copy, positioning, CTA patterns, and emerging trends to detect what works and why.', icon: Brain },
    { num: '03', title: 'Act', desc: 'Receive prioritized, actionable recommendations with evidence, confidence scores, and suggested next steps.', icon: Target },
  ];
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">How SpotNxt AI Works</Badge>
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl text-balance">
            From competitor ads to <span className="gradient-text">actionable intelligence</span>
          </h2>
        </FadeIn>

        <div className="relative mt-16">
          {/* Connecting line */}
          <div className="absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent lg:block" />
          <StaggerContainer className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {steps.map((step) => (
              <StaggerItem key={step.num} className="relative text-center">
                <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-brand-500/10 blur-xl" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-brand-500/20 bg-card">
                    <step.icon className="h-8 w-8 text-brand-400" />
                  </div>
                  <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full gradient-brand text-xs font-bold text-white">
                    {step.num}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 max-w-xs mx-auto text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </div>
    </section>
  );
}

/* ─── DASHBOARD PREVIEW ─── */
function DashboardPreviewSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">AI Ad Analysis</Badge>
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl text-balance">
            See what your competitors
            <br /><span className="gradient-text">can&apos;t hide</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Every creative analyzed. Every pattern detected. Every recommendation explained.
          </p>
        </FadeIn>

        <FadeIn delay={0.2} duration={0.8} className="mt-16">
          <div className="relative mx-auto max-w-5xl">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-brand-500/10 via-prediction/10 to-brand-500/10 blur-2xl" />
            <div className="relative rounded-2xl border border-white/[0.06] glass-card overflow-hidden shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Creative preview */}
                <div className="relative aspect-video md:aspect-auto">
                  <img
                    src="https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800"
                    alt="Competitor ad creative"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <Badge className="mb-2" variant="secondary">NovaFit · Meta · Video</Badge>
                    <p className="text-sm font-semibold text-white">Your Transformation Starts Today — Not Monday</p>
                  </div>
                </div>
                {/* Analysis panel */}
                <div className="p-6">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand-400" />
                    <span className="text-sm font-semibold">AI Analysis</span>
                    <Badge className="ml-auto gradient-brand text-white">Score: 88</Badge>
                  </div>
                  <div className="mt-4 space-y-3">
                    {[
                      { label: 'Hook Strength', value: 82, color: 'from-brand-500 to-brand-400' },
                      { label: 'Creative Quality', value: 79, color: 'from-prediction to-brand-500' },
                      { label: 'CTA Effectiveness', value: 85, color: 'from-chart-2 to-chart-3' },
                      { label: 'Audience Signal', value: 76, color: 'from-brand-400 to-prediction' },
                    ].map((metric) => (
                      <div key={metric.label}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{metric.label}</span>
                          <span className="font-semibold tabular-nums">{metric.value}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${metric.value}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={cn('h-full rounded-full bg-gradient-to-r', metric.color)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Brain className="h-3.5 w-3.5 text-brand-400" />
                      <span className="font-semibold">AI Explanation</span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                      Pain-point hook with social proof. Video format drives 2.3x higher engagement than static. Authority gap detected — no expert endorsement.
                    </p>
                  </div>
                  <Button size="sm" className="mt-4 w-full gradient-brand text-white gap-1.5">
                    <Target className="h-3.5 w-3.5" /> View Full Analysis
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── COMPETITIVE COMPARISON ─── */
function CompetitiveComparisonSection() {
  const comparisonData = [
    { metric: 'Video Adoption', you: 22, avg: 38, top: 58 },
    { metric: 'UGC Creative', you: 15, avg: 28, top: 48 },
    { metric: 'Authority Messaging', you: 10, avg: 22, top: 35 },
    { metric: 'Short-Form Video Presence', you: 18, avg: 32, top: 52 },
    { metric: 'AI-Feature Mentions', you: 18, avg: 28, top: 60 },
  ];
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">Competitive Intelligence</Badge>
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl text-balance">
            Your Brand vs <span className="gradient-text">Competitors</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            See where you stand across creative trends, messaging, formats, and platform presence.
          </p>
        </FadeIn>

        <FadeIn delay={0.2} className="mt-16">
          <Card className="mx-auto max-w-4xl p-8">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-sm font-semibold">Competitive Position</span>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/40" /> Your Brand</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-chart-2/60" /> Market Avg</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm gradient-brand" /> Top Competitor</span>
              </div>
            </div>
            <div className="space-y-4">
              {comparisonData.map((row) => (
                <div key={row.metric}>
                  <div className="mb-1.5 text-sm font-medium">{row.metric}</div>
                  <div className="space-y-1.5">
                    {[
                      { label: 'Your Brand', value: row.you, color: 'bg-muted-foreground/40' },
                      { label: 'Market Avg', value: row.avg, color: 'bg-chart-2/60' },
                      { label: 'Top Competitor', value: row.top, color: 'gradient-brand' },
                    ].map((bar) => (
                      <div key={bar.label} className="flex items-center gap-3">
                        <span className="w-24 text-xs text-muted-foreground">{bar.label}</span>
                        <div className="h-5 flex-1 overflow-hidden rounded bg-white/[0.03]">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${bar.value}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={cn('h-full rounded', bar.color)}
                          />
                        </div>
                        <span className="w-10 text-right text-xs font-semibold tabular-nums">{bar.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── RECOMMENDATIONS ─── */
function RecommendationsSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">AI Recommendations</Badge>
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl text-balance">
            Stop Guessing.
            <br /><span className="gradient-text">Start Knowing What To Create.</span>
          </h2>
        </FadeIn>

        <StaggerContainer className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {landingRecommendations.map((rec) => (
            <StaggerItem key={rec.title}>
              <Card className="group h-full p-6 transition-all hover:border-brand-500/20 hover:bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      rec.impact === 'High' ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'
                    )}
                  >
                    {rec.impact} Impact
                  </Badge>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{rec.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{rec.description}</p>
                <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BarChart3 className="h-3.5 w-3.5 text-brand-400" />
                    Confidence: <span className="font-semibold text-foreground">{rec.confidence}%</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ─── FINAL CTA ─── */
function FinalCTASection() {
  return (
    <section className="py-32">
      <div className="mx-auto max-w-4xl px-6">
        <FadeIn>
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] glass-card p-12 text-center md:p-20">
            <div className="absolute inset-0 -z-10">
              <motion.div
                className="absolute left-1/2 top-0 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600/20 blur-[120px]"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
            <h2 className="font-display text-4xl font-bold tracking-tight text-balance md:text-5xl">
              See What Your Market
              <br /><span className="gradient-text">Is Doing.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground text-balance">
              Connect your advertising intelligence and let SpotNxt AI uncover the opportunities hiding in your competitive landscape.
            </p>
            <Link href="/signup" className="mt-8 inline-block">
              <Button size="lg" className="group gradient-brand text-white shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50 transition-all">
                Start Analyzing
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <p className="mt-6 text-sm text-muted-foreground/70">
              14-day free trial · No credit card required · Cancel anytime
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── FOOTER ─── */
function FooterSection() {
  return (
    <footer className="border-t border-white/[0.04] py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-brand">
                <Radar className="h-5 w-5 text-white" />
              </div>
              <span className="font-display text-lg font-bold">SpotNxt<span className="text-brand-400"> AI</span></span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Real-time competitive intelligence for Meta Ads. Monitor, analyze, predict, and act.
            </p>
            <div className="mt-6 flex gap-3">
              {[Globe, Shield, Zap].map((Icon, i) => (
                <div key={i} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
              ))}
            </div>
          </div>
          {[
            { title: 'Platform', links: ['Intelligence', 'Competitors', 'Creatives', 'Trends', 'Recommendations'] },
            { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
            { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'GDPR'] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold">{col.title}</h4>
              <ul className="mt-4 space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#top" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.04] pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">© 2026 SpotNxt AI. All rights reserved.</p>
          <p className="text-sm text-muted-foreground">Built for marketing teams who refuse to guess.</p>
        </div>
      </div>
    </footer>
  );
}
