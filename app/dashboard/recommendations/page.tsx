'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Sparkles, ArrowUpRight, Zap, Brain, ChevronRight, X,
  CheckCircle2, Copy, Check, ShieldCheck, Layers, FileText, ExternalLink,
  BarChart3, Lightbulb, Play, AlertCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/motion';
import { aiRecommendations, type Recommendation } from '@/lib/data';
import { cn } from '@/lib/utils';
import { ProviderGate } from '@/components/dashboard/provider-gate';

interface ExecutionPlan {
  objective: string;
  recommendedAudience: string;
  creativeBrief: {
    format: string;
    hookStyle: string;
    visualDirection: string;
  };
  copyVariants: Array<{
    hook: string;
    headline: string;
    primaryText: string;
    cta: string;
  }>;
  flightMatrix: {
    suggestedBudgetShare: string;
    testDuration: string;
    kpiBenchmark: string;
  };
}

const executionPlanDictionary: Record<string | number, ExecutionPlan> = {
  1: {
    objective: 'Counter competitor vertical video surge by launching authentic problem/solution shorts with 3-second hook retention.',
    recommendedAudience: 'Broad Lookalikes 1-3% + Engaged Shoppers interested in Fitness & Activewear.',
    creativeBrief: {
      format: '9:16 Vertical Video (Reels & Feed Shorts)',
      hookStyle: 'Problem-Agitation Visual (First 2.5 seconds)',
      visualDirection: 'Unfiltered, gym-floor perspective with rapid text callouts addressing common apparel discomforts.',
    },
    copyVariants: [
      {
        hook: 'Stop wearing workout gear that rolls down mid-squat.',
        headline: 'Engineered Never-Slip Waistband',
        primaryText: 'Designed with dual-grip compression fabric so you never have to adjust your fit between sets.',
        cta: 'Shop Now',
      },
      {
        hook: 'Why athletes are ditching mainstream athletic wear this season.',
        headline: 'The 2026 High-Performance Standard',
        primaryText: 'Sweat-wicking breathability backed by thousands of 5-star verified reviews. Experience the upgrade.',
        cta: 'Explore Collection',
      },
    ],
    flightMatrix: {
      suggestedBudgetShare: '35% of prospecting ad spend',
      testDuration: '10 - 14 Days',
      kpiBenchmark: 'Target Hook Rate > 32% (3s video views / impressions), ROAS > 2.4x',
    },
  },
  2: {
    objective: 'Capitalize on competitor discount fatigue by offering high-perceived-value bundles rather than margin-eroding sales.',
    recommendedAudience: 'Website Add-to-Cart past 60 days + High-LTV Customer Retargeting.',
    creativeBrief: {
      format: 'Dynamic 1:1 Carousel + 4:5 Collection Showcase',
      hookStyle: 'Curated Value Packaging',
      visualDirection: 'Clean product hierarchy showing complimentary daily routine items side-by-side.',
    },
    copyVariants: [
      {
        hook: 'Build your complete daily kit and save 25% automatically.',
        headline: 'Complete Care Essentials Bundle',
        primaryText: 'Curated together by dermatologists. The complete 3-step routine delivered straight to your door.',
        cta: 'Claim Bundle',
      },
    ],
    flightMatrix: {
      suggestedBudgetShare: '25% of retargeting ad spend',
      testDuration: '14 Days',
      kpiBenchmark: 'Average Order Value (AOV) +22%, Conversion Rate > 3.8%',
    },
  },
  3: {
    objective: 'Differentiate against generic celebrity lifestyle imagery using scientific proof points and ingredient transparency.',
    recommendedAudience: 'Interest: Clean Living, Organic Skincare, Ingredient Conscious Consumers.',
    creativeBrief: {
      format: '4:5 Micro-Infographic Static & Animated Explainer',
      hookStyle: 'Clinical Transparency Hook',
      visualDirection: 'High-contrast split visual showing clinical trial metrics alongside ingredient origin.',
    },
    copyVariants: [
      {
        hook: 'What does your current moisturizer actually contain?',
        headline: '100% Bio-Active Formulation',
        primaryText: 'Zero artificial fragrances. Zero filler water. Just clinically proven peptides that repair skin barrier.',
        cta: 'See The Clinical Results',
      },
    ],
    flightMatrix: {
      suggestedBudgetShare: '20% of middle-of-funnel consideration',
      testDuration: '21 Days',
      kpiBenchmark: 'Outbound CTR > 1.8%, Cost per Landing Page View < $0.85',
    },
  },
  4: {
    objective: 'Deploy streak-preservation and micro-progress triggers to boost app installs and subscription retention.',
    recommendedAudience: 'Mobile App Engagers + Lookalikes of 30-day active subscribers.',
    creativeBrief: {
      format: '9:16 In-App Screen Recording with Mascot Reaction Overlay',
      hookStyle: 'Urgent Friendly Gamification',
      visualDirection: 'Real screen UI interaction paired with celebratory sound design and subtle loss aversion.',
    },
    copyVariants: [
      {
        hook: 'Don’t break your 7-day streak before bed!',
        headline: '5 Minutes a Day Keeps Your Habit Alive',
        primaryText: 'Join over 40 million learners mastering real-world skills one bite-sized lesson at a time.',
        cta: 'Continue Lesson',
      },
    ],
    flightMatrix: {
      suggestedBudgetShare: '25% of app acquisition spend',
      testDuration: 'Continuous Evergreen',
      kpiBenchmark: 'Cost Per Install (CPI) -18%, Day-7 Retention > 42%',
    },
  },
  5: {
    objective: 'Exploit category whitespace by launching weekend urgency drops with exclusive countdown timers.',
    recommendedAudience: 'Top 10% High-intent email VIP list + Social Engagers past 30 days.',
    creativeBrief: {
      format: '1:1 Animated Motion Drop Banner & Story Teaser',
      hookStyle: 'VIP Limited Run Alert',
      visualDirection: 'Dark-mode luxury aesthetic with illuminated typography and prominent release time.',
    },
    copyVariants: [
      {
        hook: 'Once this batch sells out, it will not be restocked.',
        headline: 'The Limited Midnight Edition',
        primaryText: 'Limited to 500 numbered units worldwide. Early access opens Friday at 6 PM EST.',
        cta: 'Get Early Access',
      },
    ],
    flightMatrix: {
      suggestedBudgetShare: '20% of warm retargeting',
      testDuration: '48 - 72 Hour Flash Flight',
      kpiBenchmark: 'Return on Ad Spend (ROAS) > 4.5x during drop window',
    },
  },
};

export default function RecommendationsPage() {
  const [activePlan, setActivePlan] = useState<{ rec: Recommendation; plan: ExecutionPlan } | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [copiedVariant, setCopiedVariant] = useState<number | null>(null);
  const [savedPlans, setSavedPlans] = useState<number[]>([]);

  const handleOpenPlan = (rec: Recommendation) => {
    const plan = executionPlanDictionary[rec.id] || {
      objective: `Execute high-velocity testing based on ${rec.title}.`,
      recommendedAudience: 'High-affinity Lookalikes and category searchers.',
      creativeBrief: {
        format: 'Multi-format testing (9:16 Video + 1:1 Carousel)',
        hookStyle: 'Direct Benefit Hook',
        visualDirection: 'Contrast visual positioning against competitor baseline.',
      },
      copyVariants: [
        {
          hook: `The smarter alternative to ${rec.category} norms.`,
          headline: rec.title,
          primaryText: rec.whyNow,
          cta: 'Learn More',
        },
      ],
      flightMatrix: {
        suggestedBudgetShare: '25% of campaign testing budget',
        testDuration: '14 Days',
        kpiBenchmark: 'Target CTR > 1.6%, ROAS > 2.2x',
      },
    };
    setActivePlan({ rec, plan });
  };

  const handleCopyVariant = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedVariant(idx);
    setTimeout(() => setCopiedVariant(null), 2000);
  };

  const toggleSavePlan = (id: number) => {
    setSavedPlans((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const filteredRecs = aiRecommendations.filter((rec) => {
    const matchesPriority = priorityFilter === 'All' || rec.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'All' || rec.category === categoryFilter;
    return matchesPriority && matchesCategory;
  });

  return (
    <ProviderGate title="Recommendations are unavailable">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Actionable Recommendations</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Evidence-backed strategic directives generated by the SpotNxt AI intelligence pipeline.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-brand-500/30 bg-brand-500/10 text-brand-400 py-1 px-3 text-xs">
              <Brain className="h-3.5 w-3.5 mr-1.5" />
              Evidence-Gated Engine
            </Badge>
          </div>
        </div>

        {/* Intelligence Banner */}
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-brand-500/[0.04] p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
                  <Lightbulb className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base">5 Active Recommendations</span>
                    <Badge variant="secondary" className="text-[10px] bg-success/10 text-success border-success/20">
                      High Confidence
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Synthesized from over 120 indexed Meta ad archive variations across athletic apparel, skincare, and digital tech.
                  </p>
                </div>
              </div>

              {/* Framework Tag */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border border-border/60">
                <span className="font-semibold text-foreground">Formula:</span>
                <span className="text-brand-400">DATA</span>
                <span>→</span>
                <span className="text-brand-400">OBSERVATION</span>
                <span>→</span>
                <span className="text-brand-400">INTERPRETATION</span>
                <span>→</span>
                <span className="text-emerald-400 font-semibold">ACTION</span>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs text-muted-foreground mr-1">Category:</span>
            {['All', 'Creative', 'Messaging', 'Platform', 'Strategy'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                  categoryFilter === cat
                    ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                    : 'text-muted-foreground hover:bg-muted/50 border border-transparent'
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground mr-1">Priority:</span>
            {['All', 'Critical', 'High', 'Medium'].map((pri) => (
              <button
                key={pri}
                onClick={() => setPriorityFilter(pri)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                  priorityFilter === pri
                    ? 'bg-muted text-foreground border border-border'
                    : 'text-muted-foreground hover:bg-muted/30 border border-transparent'
                )}
              >
                {pri}
              </button>
            ))}
          </div>
        </div>

        {/* Recommendations List */}
        <StaggerContainer className="space-y-4">
          {filteredRecs.map((rec) => (
            <StaggerItem key={rec.id}>
              <Card className="group p-6 transition-all hover:border-brand-500/20 hover:bg-card/90">
                <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          rec.priority === 'Critical' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                          rec.priority === 'High' ? 'bg-warning/10 text-warning border-warning/20' :
                          rec.priority === 'Medium' ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' :
                          'bg-muted text-muted-foreground'
                        )}
                      >
                        {rec.priority} Priority
                      </Badge>
                      <Badge variant="outline" className="text-xs">{rec.category}</Badge>
                      {savedPlans.includes(rec.id) && (
                        <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                          Saved to Tracker
                        </Badge>
                      )}
                    </div>

                    <h3 className="mt-3 font-display text-lg font-semibold">{rec.title}</h3>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
                        <span className="text-xs font-semibold text-brand-400 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Why Now
                        </span>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{rec.whyNow}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
                        <span className="text-xs font-semibold text-brand-400 flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> Supporting Evidence
                        </span>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{rec.evidence}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border/50 pt-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Expected Impact:</span>
                        <Badge variant="secondary" className={cn(
                          'text-xs',
                          rec.expectedImpact === 'High' ? 'bg-success/10 text-success' :
                          rec.expectedImpact === 'Medium' ? 'bg-warning/10 text-warning' : ''
                        )}>{rec.expectedImpact}</Badge>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">AI Confidence:</span>
                        <span className="text-xs font-semibold">{rec.confidence}%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Effort:</span>
                        <span className="text-xs font-semibold">{rec.effort}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between w-full lg:w-auto gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Zap className="h-4 w-4 text-brand-400" />
                      <span className="font-semibold text-foreground text-sm">{rec.confidence}%</span>
                      <span>match</span>
                    </div>

                    <Button
                      onClick={() => handleOpenPlan(rec)}
                      size="sm"
                      className="gap-1.5 gradient-brand text-white shadow-md shadow-brand-500/20"
                    >
                      <Target className="h-3.5 w-3.5" />
                      <span>{rec.suggestedNextStep}</span>
                    </Button>
                  </div>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Execution Plan Modal */}
        <AnimatePresence>
          {activePlan && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setActivePlan(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[88vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between pb-4 border-b border-border">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{activePlan.rec.category}</Badge>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-xs',
                          activePlan.rec.priority === 'Critical' ? 'bg-destructive/10 text-destructive' :
                          activePlan.rec.priority === 'High' ? 'bg-warning/10 text-warning' : 'bg-brand-500/10 text-brand-400'
                        )}
                      >
                        {activePlan.rec.priority} Priority
                      </Badge>
                    </div>
                    <h3 className="font-display font-semibold text-lg text-foreground">
                      Execution Blueprint: {activePlan.rec.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setActivePlan(null)}
                    className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 space-y-5">
                  {/* Campaign Objective */}
                  <div className="p-3.5 rounded-xl bg-brand-500/[0.04] border border-brand-500/20">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5" /> Campaign Objective & Target
                    </span>
                    <p className="mt-1 text-xs text-foreground leading-relaxed">{activePlan.plan.objective}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      <strong className="text-foreground">Audience:</strong> {activePlan.plan.recommendedAudience}
                    </p>
                  </div>

                  {/* Creative Specification Brief */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-brand-400" /> Creative Brief Direction
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Format</span>
                        <p className="mt-1 font-medium text-foreground">{activePlan.plan.creativeBrief.format}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Hook Style</span>
                        <p className="mt-1 font-medium text-foreground">{activePlan.plan.creativeBrief.hookStyle}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Visual Cut</span>
                        <p className="mt-1 font-medium text-foreground">{activePlan.plan.creativeBrief.visualDirection}</p>
                      </div>
                    </div>
                  </div>

                  {/* Ready-to-Test Copy Variants */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-brand-400" /> Ready-to-Test Ad Copy Variants
                    </h4>
                    <div className="space-y-3">
                      {activePlan.plan.copyVariants.map((variant, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-card border border-border/80 relative group">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-brand-400">Variant #{idx + 1}</span>
                            <button
                              onClick={() =>
                                handleCopyVariant(
                                  `Hook: ${variant.hook}\nHeadline: ${variant.headline}\nBody: ${variant.primaryText}\nCTA: ${variant.cta}`,
                                  idx
                                )
                              }
                              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-brand-400 transition-colors"
                            >
                              {copiedVariant === idx ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-400" /> Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" /> Copy All
                                </>
                              )}
                            </button>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <p>
                              <strong className="text-muted-foreground">Opening Hook:</strong>{' '}
                              <span className="text-foreground italic">&ldquo;{variant.hook}&rdquo;</span>
                            </p>
                            <p>
                              <strong className="text-muted-foreground">Headline:</strong>{' '}
                              <span className="text-foreground font-medium">{variant.headline}</span>
                            </p>
                            <p>
                              <strong className="text-muted-foreground">Primary Text:</strong>{' '}
                              <span className="text-foreground">{variant.primaryText}</span>
                            </p>
                            <div className="pt-1 flex items-center gap-2">
                              <span className="text-[11px] text-muted-foreground font-semibold">Call to Action:</span>
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {variant.cta}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Flight Plan & Benchmarks */}
                  <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5 text-brand-400" /> Flight Matrix & Benchmarks
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground">Budget Allocation:</span>
                        <p className="font-semibold text-foreground">{activePlan.plan.flightMatrix.suggestedBudgetShare}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">Flight Duration:</span>
                        <p className="font-semibold text-foreground">{activePlan.plan.flightMatrix.testDuration}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">Target KPI Benchmark:</span>
                        <p className="font-semibold text-emerald-400">{activePlan.plan.flightMatrix.kpiBenchmark}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="mt-6 flex items-center justify-between pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleSavePlan(activePlan.rec.id)}
                    className="gap-1.5 text-xs"
                  >
                    <CheckCircle2
                      className={cn('h-3.5 w-3.5', savedPlans.includes(activePlan.rec.id) ? 'text-emerald-400' : 'text-muted-foreground')}
                    />
                    {savedPlans.includes(activePlan.rec.id) ? 'Saved in Action Tracker' : 'Save to Action Tracker'}
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setActivePlan(null)}>
                      Close
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 gradient-brand text-white"
                      onClick={() => {
                        const briefText = `CAMPAIGN EXECUTION BRIEF: ${activePlan.rec.title}\n\nObjective: ${activePlan.plan.objective}\nAudience: ${activePlan.plan.recommendedAudience}\nFormat: ${activePlan.plan.creativeBrief.format}\n\nCopy Variant 1:\nHook: ${activePlan.plan.copyVariants[0]?.hook}\nHeadline: ${activePlan.plan.copyVariants[0]?.headline}\nBody: ${activePlan.plan.copyVariants[0]?.primaryText}\nCTA: ${activePlan.plan.copyVariants[0]?.cta}\n\nBenchmark: ${activePlan.plan.flightMatrix.kpiBenchmark}`;
                        navigator.clipboard.writeText(briefText);
                        setActivePlan(null);
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy Full Brief & Exit
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ProviderGate>
  );
}
