'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Download, FileSpreadsheet, Eye, Calendar, CheckCircle2,
  Plus, X, Sparkles, Filter, Search, ChevronRight, Layers, Target, ShieldCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/motion';
import { adCreatives, competitors } from '@/lib/data';
import { buildReportCsv, buildReportPdf, downloadBlob, ReportSummary } from '@/lib/report-exports';
import { ProviderGate } from '@/components/dashboard/provider-gate';
import { cn } from '@/lib/utils';

const initialReports: ReportSummary[] = [
  {
    id: 1,
    name: 'Nike — Q2 2026 Competitor Intelligence Report',
    date: 'Jul 15, 2026',
    type: 'Competitor Audit',
    status: 'Ready',
    pages: 24,
    competitorName: 'Nike',
    executiveSummary: 'Nike maintains high active campaign velocity in the athletic apparel sector, with 68% video and motion carousel creatives. Messaging heavily emphasizes athletic achievement, community empowerment, and innovation.',
    keyFindings: [
      'Dominant creative format: 9:16 vertical video shorts (48%) and dynamic carousels (32%).',
      'Primary CTA distribution: "Shop Now" (64%), "Learn More" (22%), "Explore" (14%).',
      'Average campaign run duration: 18.4 days before creative iteration.',
    ],
    strategicRecommendations: [
      'Capitalize on Nike’s minimal presence in discount and bundle offers by positioning accessible value tiers.',
      'Deploy testimonial UGC formats to contrast Nike’s high-production celebrity athlete endorsements.',
    ],
  },
  {
    id: 2,
    name: 'Beauty Industry — Multi-Brand Trend Analysis',
    date: 'Jul 10, 2026',
    type: 'Trend Analysis',
    status: 'Ready',
    pages: 18,
    competitorName: 'Glossier & Nykaa',
    executiveSummary: 'Skincare and beauty brands are rapidly shifting to unedited testimonial formats, natural lighting, and scientific ingredient breakdowns. FOMO-driven drops show highest engagement rates.',
    keyFindings: [
      'Problem/solution hooks generate 2.4x higher estimated engagement than lifestyle aesthetic stills.',
      'Short-form vertical video accounts for 58% of all newly indexed beauty ads in the last 30 days.',
    ],
    strategicRecommendations: [
      'Adopt split-screen before/after video format with micro-influencer voiceovers.',
      'Introduce limited-edition starter packs to compete with bundle strategies.',
    ],
  },
  {
    id: 3,
    name: 'Glossier — Creative & Hook Angle Deep Dive',
    date: 'Jul 8, 2026',
    type: 'Creative Deep Dive',
    status: 'Ready',
    pages: 32,
    competitorName: 'Glossier',
    executiveSummary: 'Glossier’s advertising strategy prioritizes skin-first minimalist visuals and community testimonials. High retention on 15-second product demonstration loops.',
    keyFindings: [
      'Top performing hook: "The 2-minute morning glow routine" with 8.4% estimated engagement.',
      'Zero usage of traditional aggressive sales banners; 100% editorial aesthetic.',
    ],
    strategicRecommendations: [
      'Counter with transparent clinical trial data and dermatologist-verified claims.',
    ],
  },
  {
    id: 4,
    name: 'Adidas vs Puma — Athletic Footwear Head-to-Head',
    date: 'Jul 5, 2026',
    type: 'Head-to-Head Comparison',
    status: 'Ready',
    pages: 22,
    competitorName: 'Adidas & Puma',
    executiveSummary: 'Side-by-side analysis reveals Adidas leads in sustainable materials messaging, while Puma focuses aggressively on speed, motorsport collabs, and seasonal flash pricing.',
    keyFindings: [
      'Puma offers average 20-30% discount hooks in 44% of active ads vs Adidas 12%.',
      'Adidas invests heavily in carousel storytelling showcasing sustainable Primegreen fabrics.',
    ],
    strategicRecommendations: [
      'Whitespace opportunity: Technical performance runners under $120 with zero environmental compromise messaging.',
    ],
  },
  {
    id: 5,
    name: 'Duolingo — Gamified Acquisition Strategy',
    date: 'Jul 1, 2026',
    type: 'Platform Strategy',
    status: 'Ready',
    pages: 16,
    competitorName: 'Duolingo',
    executiveSummary: 'Duolingo leverages guilt-free gamification hooks and mascot-driven humor. Unusually high ad longevity (average 34 days active), indicating evergreen creative efficiency.',
    keyFindings: [
      'Humor-based mascot hooks achieve lowest estimated cost-per-install.',
      'Streak-protection urgency CTAs convert highest in retargeting pools.',
    ],
    strategicRecommendations: [
      'Incorporate progress streaks and milestone celebratory creative assets.',
    ],
  },
  {
    id: 6,
    name: 'Gymshark — Community & Athlete Drops Overview',
    date: 'Jun 30, 2026',
    type: 'Competitor Audit',
    status: 'Ready',
    pages: 28,
    competitorName: 'Gymshark',
    executiveSummary: 'Gymshark dominates DTC athletic apparel through athlete drop countdowns and gym-floor raw training footage. High ad volume velocity during quarterly collection releases.',
    keyFindings: [
      '92% of creatives feature creator athletes wearing upcoming drops.',
      'Urgency copy ("Dropping this Thursday at 7 PM") drives massive early click spikes.',
    ],
    strategicRecommendations: [
      'Implement VIP early-access email & SMS capture ads 7 days prior to major launches.',
    ],
  },
];

export default function ReportsPage() {
  const [reportsList, setReportsList] = useState<ReportSummary[]>(initialReports);
  const [exporting, setExporting] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [previewReport, setPreviewReport] = useState<ReportSummary | null>(null);

  // Form State for Generator
  const [formCompetitor, setFormCompetitor] = useState('Nike');
  const [formType, setFormType] = useState('Competitor Audit');
  const [formTimeframe, setFormTimeframe] = useState('Last 30 Days');
  const [formFormat, setFormFormat] = useState<'pdf' | 'csv' | 'both'>('pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');

  const exportReport = (report: ReportSummary, format: 'csv' | 'pdf') => {
    const key = `${report.id}-${format}`;
    setExporting(key);
    try {
      const relevantAds = adCreatives.filter(
        (ad) => !report.competitorName || ad.competitorName.toLowerCase().includes(report.competitorName.toLowerCase().split(' ')[0])
      );
      const adsToExport = relevantAds.length > 0 ? relevantAds : adCreatives;
      const safeName = report.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      if (format === 'csv') {
        downloadBlob(new Blob([buildReportCsv(report, adsToExport)], { type: 'text/csv;charset=utf-8' }), `${safeName}.csv`);
      } else {
        downloadBlob(buildReportPdf(report, adsToExport), `${safeName}.pdf`);
      }
    } finally {
      setExporting(null);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setGenerationStep('Aggregating active creative ad archive...');

    setTimeout(() => {
      setGenerationStep('Extracting messaging hooks, CTAs, and format distribution...');
    }, 600);

    setTimeout(() => {
      setGenerationStep('Synthesizing evidence-backed strategic recommendations...');
    }, 1200);

    setTimeout(() => {
      const relevantAds = adCreatives.filter((ad) => ad.competitorName.toLowerCase() === formCompetitor.toLowerCase());
      const adCount = relevantAds.length > 0 ? relevantAds.length : 12;

      const newRep: ReportSummary = {
        id: `rep_${Date.now()}`,
        name: `${formCompetitor} — ${formType} (${formTimeframe})`,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        type: formType,
        status: 'Ready',
        pages: Math.max(8, Math.min(36, adCount * 2)),
        competitorName: formCompetitor,
        executiveSummary: `Strategic intelligence audit for ${formCompetitor} evaluating recent creative inventory across Meta Ad Library. Synthesis highlights key messaging angles, format allocation, and competitive whitespace for immediate performance marketing deployment.`,
        keyFindings: [
          `Identified ${adCount} active and historical creative variations in the indexed dataset.`,
          `Creative focus leans towards motion and short-form video formats with prominent benefit-led hooks.`,
          `Offer structure primarily leverages direct product value and seasonal engagement incentives.`,
        ],
        strategicRecommendations: [
          `Test contrast messaging positioning your brand against ${formCompetitor}'s primary hook.`,
          `Explore format whitespace by deploying interactive carousels and authentic creator testimonial angles.`,
          `Implement high-urgency call-to-actions to outperform standard catalog browsing rates.`,
        ],
      };

      setReportsList((prev) => [newRep, ...prev]);
      setIsGenerating(false);
      setGenerateModalOpen(false);

      // Trigger automatic download
      const targetAds = relevantAds.length > 0 ? relevantAds : adCreatives;
      const safeName = newRep.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      if (formFormat === 'pdf' || formFormat === 'both') {
        downloadBlob(buildReportPdf(newRep, targetAds), `${safeName}.pdf`);
      }
      if (formFormat === 'csv' || formFormat === 'both') {
        downloadBlob(new Blob([buildReportCsv(newRep, targetAds)], { type: 'text/csv;charset=utf-8' }), `${safeName}.csv`);
      }
    }, 1800);
  };

  const filteredReports = reportsList.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.type.toLowerCase().includes(search.toLowerCase()) ||
      (r.competitorName && r.competitorName.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter === 'All' || r.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <ProviderGate title="Reports are unavailable">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Competitor Intelligence Reports</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate, preview, and export branded intelligence audits with full creative evidence citations.
            </p>
          </div>
          <Button
            onClick={() => setGenerateModalOpen(true)}
            className="gap-2 gradient-brand text-white shadow-lg shadow-brand-500/20"
          >
            <Plus className="h-4 w-4" /> Generate New Report
          </Button>
        </div>

        {/* Quick Builder Banner */}
        <FadeIn>
          <Card className="p-6 relative overflow-hidden border-border/80 bg-gradient-to-r from-card via-card to-brand-500/[0.03]">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 border border-brand-500/20">
                  <FileText className="h-6 w-6 text-brand-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Instant Intelligence Export</h3>
                  <p className="text-sm text-muted-foreground">
                    Download full executive audits, creative hook breakdowns, and raw ad records in PDF or CSV.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={Boolean(exporting)}
                  onClick={() => exportReport(reportsList[0], 'csv')}
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                  {exporting === `${reportsList[0]?.id}-csv` ? 'Exporting…' : 'Sample CSV'}
                </Button>
                <Button
                  size="sm"
                  className="gap-2 gradient-brand text-white"
                  disabled={Boolean(exporting)}
                  onClick={() => exportReport(reportsList[0], 'pdf')}
                >
                  <Download className="h-4 w-4" />
                  {exporting === `${reportsList[0]?.id}-pdf` ? 'Preparing…' : 'Sample PDF'}
                </Button>
              </div>
            </div>
          </Card>
        </FadeIn>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports or competitors..."
              className="pl-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {['All', 'Competitor Audit', 'Creative Deep Dive', 'Trend Analysis', 'Head-to-Head Comparison'].map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                  typeFilter === type
                    ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                    : 'text-muted-foreground hover:bg-muted/50 border border-transparent'
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Reports Grid */}
        <StaggerContainer className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredReports.map((report) => (
            <StaggerItem key={report.id}>
              <Card className="group p-5 transition-all hover:shadow-lg hover:border-brand-500/20 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10 border border-brand-500/20">
                      <FileText className="h-5 w-5 text-brand-400" />
                    </div>
                    <Badge
                      variant={report.status === 'Ready' ? 'default' : 'secondary'}
                      className={report.status === 'Ready' ? 'bg-success/10 text-success border-success/20' : ''}
                    >
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> {report.status}
                      </span>
                    </Badge>
                  </div>

                  <h3 className="mt-4 font-semibold text-sm leading-snug">{report.name}</h3>

                  {report.executiveSummary && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {report.executiveSummary}
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground border-t border-border/50 pt-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {report.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="h-3 w-3" /> {report.pages} pages
                    </span>
                    <Badge variant="outline" className="text-[10px] ml-auto">
                      {report.type}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 gap-1 text-xs"
                    onClick={() => setPreviewReport(report)}
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1 text-xs"
                    disabled={exporting === `${report.id}-pdf`}
                    onClick={() => exportReport(report, 'pdf')}
                  >
                    <Download className="h-3.5 w-3.5 text-brand-400" />
                    {exporting === `${report.id}-pdf` ? 'Exporting…' : 'PDF'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1 text-xs"
                    disabled={exporting === `${report.id}-csv`}
                    onClick={() => exportReport(report, 'csv')}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                    {exporting === `${report.id}-csv` ? 'Exporting…' : 'CSV'}
                  </Button>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Generate Report Modal */}
        <AnimatePresence>
          {generateModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => !isGenerating && setGenerateModalOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-lg">Generate Intelligence Report</h3>
                      <p className="text-xs text-muted-foreground">Select competitor parameters and report type</p>
                    </div>
                  </div>
                  {!isGenerating && (
                    <button
                      onClick={() => setGenerateModalOpen(false)}
                      className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {isGenerating ? (
                  <div className="py-12 text-center space-y-4">
                    <div className="relative mx-auto h-12 w-12">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        className="h-12 w-12 rounded-full border-2 border-brand-500/30 border-t-brand-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm text-foreground">Synthesizing Intelligence</h4>
                      <p className="text-xs text-brand-400 animate-pulse">{generationStep}</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCreateReport} className="mt-5 space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-foreground">Competitor Focus</label>
                      <select
                        value={formCompetitor}
                        onChange={(e) => setFormCompetitor(e.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-500"
                      >
                        {competitors.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name} ({c.industry})
                          </option>
                        ))}
                        <option value="Multi-Brand Cross-Market Benchmark">Multi-Brand Cross-Market Benchmark</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground">Report Type</label>
                      <select
                        value={formType}
                        onChange={(e) => setFormType(e.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-500"
                      >
                        <option value="Competitor Audit">Comprehensive Competitor Intelligence Audit</option>
                        <option value="Creative Deep Dive">Creative & Hook Angle Breakdown</option>
                        <option value="Trend Analysis">Market Category & Format Shift Analysis</option>
                        <option value="Head-to-Head Comparison">Head-to-Head Strategy & Whitespace Audit</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-foreground">Time Horizon</label>
                        <select
                          value={formTimeframe}
                          onChange={(e) => setFormTimeframe(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-500"
                        >
                          <option value="Last 14 Days">Last 14 Days</option>
                          <option value="Last 30 Days">Last 30 Days</option>
                          <option value="Quarter-to-Date (Q2 2026)">Q2 2026 (Quarter-to-Date)</option>
                          <option value="All Indexed Records">All Indexed Records</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-foreground">Output Format</label>
                        <select
                          value={formFormat}
                          onChange={(e) => setFormFormat(e.target.value as 'pdf' | 'csv' | 'both')}
                          className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-500"
                        >
                          <option value="pdf">Formatted PDF Report</option>
                          <option value="csv">Raw Evidence CSV</option>
                          <option value="both">Both (PDF + CSV)</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground flex items-start gap-2">
                      <ShieldCheck className="h-4 w-4 text-brand-400 shrink-0 mt-0.5" />
                      <span>
                        The report will include executive summaries, format distributions, copy angles, offer structures, actionable recommendations, and an audit trail with canonical ad IDs.
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setGenerateModalOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="gap-2 gradient-brand text-white">
                        <Download className="h-4 w-4" /> Generate & Download
                      </Button>
                    </div>
                  </form>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report Preview Modal */}
        <AnimatePresence>
          {previewReport && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setPreviewReport(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between pb-4 border-b border-border">
                  <div>
                    <Badge variant="outline" className="text-xs mb-1.5">
                      {previewReport.type}
                    </Badge>
                    <h3 className="font-display font-semibold text-lg text-foreground">{previewReport.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Date: {previewReport.date} · {previewReport.pages} pages · {previewReport.competitorName || 'Benchmark'}
                    </p>
                  </div>
                  <button
                    onClick={() => setPreviewReport(null)}
                    className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 space-y-5">
                  {/* Executive Summary */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-brand-400">
                      Section 1: Executive Intelligence Summary
                    </h4>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed p-3.5 rounded-xl bg-muted/40 border border-border/60">
                      {previewReport.executiveSummary ||
                        'This report consolidates competitive ad strategies, messaging angles, and creative distributions derived from the active Meta Ad Library dataset.'}
                    </p>
                  </div>

                  {/* Key Findings */}
                  {previewReport.keyFindings && previewReport.keyFindings.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-brand-400">
                        Section 2: Key Findings & Observations
                      </h4>
                      <div className="mt-2 space-y-2">
                        {previewReport.keyFindings.map((finding, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-card border border-border/60 text-xs">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-brand-400 font-bold text-[10px]">
                              {idx + 1}
                            </span>
                            <span className="text-foreground leading-relaxed">{finding}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strategic Recommendations */}
                  {previewReport.strategicRecommendations && previewReport.strategicRecommendations.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Section 3: Strategic Recommendations
                      </h4>
                      <div className="mt-2 space-y-2">
                        {previewReport.strategicRecommendations.map((rec, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/20 text-xs">
                            <Target className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="text-foreground leading-relaxed">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Provenance */}
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
                    <span>Audit trail: Verified against canonical ad records.</span>
                    <span className="font-semibold text-foreground">SpotNxt AI Intelligence Engine</span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setPreviewReport(null)}>
                    Close Preview
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => exportReport(previewReport, 'csv')}
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-400" /> Export CSV
                  </Button>
                  <Button
                    className="gap-1.5 gradient-brand text-white"
                    onClick={() => exportReport(previewReport, 'pdf')}
                  >
                    <Download className="h-4 w-4" /> Download PDF
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ProviderGate>
  );
}
