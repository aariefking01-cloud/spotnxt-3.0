'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Upload, Brain, Heart, Target, Palette, Zap, AlertTriangle,
  CheckCircle2, Lightbulb, TrendingUp, Eye, X,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FadeIn } from '@/components/motion';
import { adCreatives, type AdCreative, type AIAnalysis } from '@/lib/data';
import { cn } from '@/lib/utils';

interface AnalysisEnvelope {
  analysis: {
    result: AIAnalysis;
    model: string;
    confidence: number;
    limitations: string[];
    visionAnalyzed: boolean;
  };
  cached: boolean;
}

export default function CreativeAnalyzerPage() {
  const [selectedAd, setSelectedAd] = useState<AdCreative | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [analysisMeta, setAnalysisMeta] = useState<Pick<AnalysisEnvelope['analysis'], 'model' | 'confidence' | 'limitations' | 'visionAnalyzed'> | null>(null);
  const [uploadedAd, setUploadedAd] = useState<AdCreative | null>(null);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const autoAnalyzedAdId = useRef<string | null>(null);

  const runAnalysis = async (ad: AdCreative) => {
    setSelectedAd(ad);
    setLoading(true);
    setAnalysis(null);
    setAnalysisMeta(null);
    setError('');
    try {
      const response = await fetch('/api/intelligence/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId: ad.id }),
      });
      const payload = await response.json() as { ok?: boolean; data?: AnalysisEnvelope; error?: { message?: string } };
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message || 'The intelligence service could not complete this analysis.');
      }
      setAnalysis(payload.data.analysis.result);
      setAnalysisMeta(payload.data.analysis);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The intelligence service could not complete this analysis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const adId = searchParams?.get('adId');
    if (!adId || autoAnalyzedAdId.current === adId) return;
    const ad = adCreatives.find((item) => item.id === adId);
    if (!ad) return;
    autoAnalyzedAdId.current = adId;
    void runAnalysis(ad);
  }, [searchParams]);

  const handleUpload = async (file?: File) => {
    if (!file) return;
    setUploadMessage('');
    setError('');
    setAnalysis(null);
    setAnalysisMeta(null);
    if (!file.type.startsWith('image/')) {
      setError('Upload an image advertisement (JPG, PNG, WEBP, or GIF).');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('Creative uploads must be 50MB or smaller.');
      return;
    }
    const localPreviewUrl = URL.createObjectURL(file);
    setUploadedPreviewUrl(localPreviewUrl);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('advertiserName', 'Uploaded Creative');
      formData.append('headline', file.name);
      formData.append('cta', 'Learn More');
      formData.append('platform', 'Uploaded');
      const response = await fetch('/api/intelligence/upload', { method: 'POST', body: formData });
      const payload = await response.json() as {
        ok?: boolean;
        data?: { ad?: { id: string; advertiserId: string; advertiserName: string; headline: string; primaryText: string; cta: string; platform: AdCreative['platform']; status: AdCreative['status']; }; upload?: { url: string } };
        error?: { message?: string };
      };
      if (!response.ok || !payload.ok || !payload.data?.ad || !payload.data.upload?.url) {
        throw new Error(payload.error?.message || 'The image could not be uploaded for analysis.');
      }
      const serverAd = payload.data.ad;
      const uploaded: AdCreative = {
        id: serverAd.id,
        competitorId: serverAd.advertiserId,
        competitorName: serverAd.advertiserName,
        headline: serverAd.headline,
        bodyCopy: serverAd.primaryText,
        cta: serverAd.cta,
        platform: serverAd.platform,
        format: 'Image',
        imageUrl: payload.data.upload.url,
        startDate: new Date().toISOString().slice(0, 10),
        durationDays: 0,
        estimatedEngagement: 0,
        impressions: 0,
        status: serverAd.status,
        hookType: 'Uploaded creative',
        sentiment: 'Neutral',
        firstSeen: new Date().toISOString().slice(0, 10),
        lastSeen: new Date().toISOString().slice(0, 10),
      };
      setUploadedAd(uploaded);
      setSelectedAd(uploaded);
      setUploadedPreviewUrl(payload.data.upload.url);
      setUploadMessage(`${file.name} uploaded. Click Analyze Ad to inspect this image with the vision model.`);
    } catch (requestError) {
      URL.revokeObjectURL(localPreviewUrl);
      setUploadedPreviewUrl('');
      setError(requestError instanceof Error ? requestError.message : 'The image could not be uploaded for analysis.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Creative Analyzer</h1>
        <p className="mt-1 text-sm text-muted-foreground">Upload or select an ad to get instant AI-powered analysis.</p>
      </div>

      <FadeIn>
        <Card className="border-dashed border-2 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-brand-500/10">
            <Upload className="h-7 w-7 text-brand-500" />
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold">Upload an ad creative</h3>
          <p className="mt-1 text-sm text-muted-foreground">Drag & drop an image or video, or browse your files</p>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(event) => handleUpload(event.target.files?.[0])} />
          <Button type="button" onClick={() => fileInputRef.current?.click()} className="mt-4 gradient-brand text-white gap-2">
            <Upload className="h-4 w-4" /> Browse Files
          </Button>
          {uploadMessage && <p className="mt-3 text-xs text-success">{uploadMessage}</p>}
          <p className="mt-3 text-xs text-muted-foreground">Supports JPG, PNG, MP4 · Max 50MB</p>
        </Card>
      </FadeIn>

      {uploadedAd && uploadedPreviewUrl && (
        <Card className="overflow-hidden border-brand-500/30 bg-brand-500/[0.03]">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <img src={uploadedPreviewUrl} alt={uploadedAd.headline} className="h-32 w-full rounded-lg object-cover sm:w-52" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="gradient-brand text-white">Uploaded advertisement</Badge>
                <Badge variant="secondary">Actual image source</Badge>
              </div>
              <p className="mt-2 truncate text-sm font-medium">{uploadedAd.headline}</p>
              <p className="mt-1 text-xs text-muted-foreground">The image above is stored by the backend and will be sent to the vision-capable AI model when analyzed.</p>
            </div>
            <Button type="button" onClick={() => runAnalysis(uploadedAd)} disabled={loading} className="gradient-brand whitespace-nowrap text-white gap-2">
              <Sparkles className="h-4 w-4" /> Analyze Ad
            </Button>
          </div>
        </Card>
      )}

      <div>
        <h3 className="mb-4 font-display text-lg font-semibold">Or analyze an existing ad</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {adCreatives.slice(0, 8).map((ad) => (
            <Card
              key={ad.id}
              className={cn(
                'group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1',
                selectedAd?.id === ad.id && 'ring-2 ring-brand-500'
              )}
              onClick={() => runAnalysis(ad)}
            >
              <div className="relative aspect-video overflow-hidden">
                <img src={ad.imageUrl} alt={ad.headline} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <Badge className="absolute left-2 top-2" variant="secondary">{ad.platform}</Badge>
              </div>
              <div className="p-3">
                <p className="text-xs font-medium line-clamp-2">{ad.headline}</p>
                <p className="mt-1 text-xs text-muted-foreground">{ad.competitorName}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedAd && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-border p-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-brand-500" />
                  <h3 className="font-semibold">AI Analysis Result</h3>
                  {analysis && <Badge className="gradient-brand text-white">Success Score: {analysis.successScore}</Badge>}
                  {analysisMeta?.visionAnalyzed && <Badge className="bg-success/10 text-success border-success/20">Actual image analyzed</Badge>}
                  {analysisMeta && <Badge variant="secondary">{analysisMeta.model}{analysisMeta.confidence ? ` · ${Math.round(analysisMeta.confidence * 100)}% confidence` : ''}</Badge>}
                </div>
                <button onClick={() => { setSelectedAd(null); setAnalysis(null); setAnalysisMeta(null); setError(''); }} className="rounded-lg p-2 hover:bg-accent">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    className="h-12 w-12 rounded-full border-4 border-brand-500/20 border-t-brand-500"
                  />
                  <p className="mt-4 text-sm text-muted-foreground">{selectedAd?.id === uploadedAd?.id ? 'Inspecting the uploaded advertisement image with AI vision...' : 'Running grounded AI analysis...'}</p>
                  <div className="mt-6 w-full max-w-md space-y-2 px-6">
                    {['Preparing evidence pack...', 'Evaluating creative and copy signals...', 'Reasoning over competitive context...', 'Validating structured recommendations...'].map((step, i) => (
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.3 }}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" /> {step}
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : error ? (
                <div className="p-8 text-sm text-destructive">{error}</div>
              ) : analysis ? (
                <div className="p-6 space-y-6">
                  {analysisMeta?.limitations?.length ? <div className="rounded-lg border border-warning/20 bg-warning/5 p-3 text-xs text-muted-foreground">{analysisMeta.limitations.join(' ')}</div> : null}
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {[
                      { label: 'Success Score', value: analysis.successScore, icon: Target, color: 'text-brand-500' },
                      { label: 'Performance', value: analysis.performancePrediction, icon: TrendingUp, color: 'text-chart-2' },
                      { label: 'Creativity', value: analysis.creativityScore, icon: Sparkles, color: 'text-chart-4' },
                      { label: 'Sentiment', value: analysis.sentimentScore, icon: Heart, color: 'text-chart-3' },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl border border-border/60 p-4 text-center">
                        <s.icon className={cn('mx-auto h-5 w-5', s.color)} />
                        <div className="mt-2 text-2xl font-bold tabular-nums">{s.value}</div>
                        <div className="text-xs text-muted-foreground">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {[
                      { icon: Eye, title: 'Visual Elements', text: analysis.visualElements || analysis.visualStrategy },
                      { icon: Brain, title: 'Headline & Ad Copy', text: analysis.headlineAndCopy || analysis.copywritingAnalysis },
                      { icon: Target, title: 'Product / Service', text: analysis.productOrService || 'Not provided by the source.' },
                      { icon: Brain, title: 'Marketing Strategy', text: analysis.marketingStrategy },
                      { icon: Heart, title: 'Emotional Appeal', text: analysis.emotionalTrigger },
                      { icon: Eye, title: 'Copywriting Analysis', text: analysis.copywritingAnalysis },
                      { icon: Target, title: 'Target Audience', text: analysis.targetAudience },
                      { icon: Palette, title: 'Brand Positioning', text: analysis.brandPositioning || analysis.competitiveSignificance },
                      { icon: Palette, title: 'Color Psychology', text: analysis.colorPsychology },
                      { icon: Zap, title: 'CTA Analysis', text: analysis.ctaAnalysis },
                      { icon: Sparkles, title: 'Creative Effectiveness', text: analysis.creativeEffectiveness || `Success score ${analysis.successScore}/100 with creativity score ${analysis.creativityScore}/100.` },
                    ].map((item) => (
                      <Card key={item.title} className="p-4">
                        <div className="flex items-center gap-2">
                          <item.icon className="h-4 w-4 text-brand-500" />
                          <h4 className="text-sm font-semibold">{item.title}</h4>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{item.text}</p>
                      </Card>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Card className="p-4">
                      <h4 className="text-sm font-semibold text-success">Strengths</h4>
                      <ul className="mt-2 space-y-1.5">
                        {analysis.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-success" />
                            <span className="text-muted-foreground">{s}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                    <Card className="p-4">
                      <h4 className="text-sm font-semibold text-destructive">Weaknesses</h4>
                      <ul className="mt-2 space-y-1.5">
                        {analysis.weaknesses.map((w, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-destructive" />
                            <span className="text-muted-foreground">{w}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </div>

                  <Card className="p-4">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-chart-3" />
                      <h4 className="text-sm font-semibold">Recommendations</h4>
                    </div>
                    <ul className="mt-2 space-y-2">
                      {analysis.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 rounded-lg border border-border/60 p-2 text-xs">
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full gradient-brand text-[10px] font-bold text-white">{i + 1}</span>
                          <span className="text-muted-foreground">{r}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              ) : null}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
