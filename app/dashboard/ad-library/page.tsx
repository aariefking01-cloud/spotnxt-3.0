'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Sparkles,
  Eye,
  Calendar,
  Search,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ShieldAlert,
  Info,
  Clock,
  KeyRound,
  Trash2,
  Bookmark,
  BookmarkCheck,
  Play,
  Share2,
  SlidersHorizontal,
  Flame,
  Zap,
  Target,
  Brain,
  ChevronDown,
  ChevronUp,
  X,
  Code2,
  History,
  Check,
  LayoutGrid,
  List,
  Columns,
  ArrowRight,
  TrendingUp,
  Globe,
  Radio,
  Plus,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/motion';
import { cn } from '@/lib/utils';
import { safeFetchJson } from '@/lib/client-fetch';
import type { CanonicalAd, AdObservation, AnalysisResult } from '@/lib/server/domain';
import { MetaTokenConnector } from '@/components/dashboard/meta-token-connector';

const inspirationChips = [
  { label: 'All Creatives', query: '' },
  { label: '🔥 Long-Running (>30d)', filter: 'longest_running' },
  { label: '⚡ Problem-Solution', query: 'problem' },
  { label: '🎯 UGC & Testimonials', query: 'routine' },
  { label: '💎 High-Urgency Discounts', query: 'save' },
  { label: '💼 SaaS Free Trials', query: 'free trial' },
  { label: '👟 Nike & Footwear', query: 'Nike' },
  { label: '📱 9:16 Vertical Video', format: 'Video' },
  { label: '🛍️ Limited Drops', query: 'limited' },
];

const formats = ['All Formats', 'Video', 'Image', 'Carousel', 'Story', 'Reel'];
const platforms = ['All Platforms', 'Meta', 'Instagram', 'Facebook'];
const countries = [
  { value: 'ALL', label: 'All Countries' },
  { value: 'US', label: 'United States (US)' },
  { value: 'IN', label: 'India (IN)' },
  { value: 'GB', label: 'United Kingdom (GB)' },
  { value: 'CA', label: 'Canada (CA)' },
  { value: 'AU', label: 'Australia (AU)' },
];

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'longest_running', label: 'Longest Running' },
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'advertiser', label: 'Brand Name (A-Z)' },
];

interface SyncStats {
  pagesFetched: number;
  recordsFetched: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  totalLiveInStore: number;
  message?: string;
  timestamp: string;
}

export default function AdLibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search & Filter State
  const [search, setSearch] = useState(searchParams?.get('search') ?? searchParams?.get('query') ?? '');
  const [platform, setPlatform] = useState<string>('All Platforms');
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [formatFilter, setFormatFilter] = useState<string>('All Formats');
  const [dataStatusFilter, setDataStatusFilter] = useState<'ALL' | 'live' | 'demo' | 'historical'>('ALL');
  const [durationFilter, setDurationFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<string>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');
  const [page, setPage] = useState<number>(1);

  // Data State
  const [ads, setAds] = useState<CanonicalAd[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 24, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [sourceLabel, setSourceLabel] = useState('Checking connection…');
  const [providerName, setProviderName] = useState('Meta Ad Library');
  const [isConfigured, setIsConfigured] = useState(false);
  const [error, setError] = useState('');
  const [diagnostic, setDiagnostic] = useState<{ status?: string; message?: string; actionRequired?: string } | null>(null);

  // Detail Modal & AI Analysis State
  const [selectedAdForDetail, setSelectedAdForDetail] = useState<CanonicalAd | null>(null);
  const [detailObservations, setDetailObservations] = useState<AdObservation[]>([]);
  const [detailRelatedAds, setDetailRelatedAds] = useState<CanonicalAd[]>([]);
  const [activeDetailTab, setActiveDetailTab] = useState<'creative' | 'timeline' | 'ai' | 'raw'>('creative');
  const [analyzingAdId, setAnalyzingAdId] = useState<string | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<AnalysisResult | null>(null);
  const [aiAnalysisDrawerOpen, setAiAnalysisDrawerOpen] = useState(false);

  // Swipe File Save State
  const [saveModalAd, setSaveModalAd] = useState<CanonicalAd | null>(null);
  const [saveFolder, setSaveFolder] = useState('My Swipe File');
  const [saveNotes, setSaveNotes] = useState('');
  const [savedAdIds, setSavedAdIds] = useState<Set<string>>(new Set());
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Sync & Token State
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncDrawerTab, setSyncDrawerTab] = useState<'sync' | 'token'>('sync');
  const [syncMethod, setSyncMethod] = useState<'collector' | 'token'>('collector');
  const [syncLoadingStage, setSyncLoadingStage] = useState<string>('Collecting ads…');
  const [syncToken, setSyncToken] = useState('');
  const [syncQuery, setSyncQuery] = useState('');
  const [syncCountry, setSyncCountry] = useState('US');
  const [syncActiveStatus, setSyncActiveStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [syncError, setSyncError] = useState<{ code?: string; message: string; actionRequired?: string } | null>(null);

  // Debug Panel State
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugData, setDebugData] = useState<Record<string, unknown> | null>(null);

  // Load saved token from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('meta_user_access_token');
      if (saved) setSyncToken(saved);
      // Load saved swipe items
      safeFetchJson<{ items: Array<{ adId: string }> }>('/api/intelligence/swipe').then((res) => {
        if (res.data?.items) {
          setSavedAdIds(new Set(res.data.items.map((i) => i.adId)));
        }
      }).catch(() => {});
    } catch {}
  }, []);

  useEffect(() => {
    const q = searchParams?.get('search') ?? searchParams?.get('query');
    if (q !== null && q !== undefined) {
      setSearch(q);
    }
  }, [searchParams]);

  // Main ad loader function
  const loadAds = async () => {
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (search.trim()) params.set('query', search.trim());
    if (platform !== 'All Platforms') params.set('platform', platform);
    if (selectedCountry !== 'ALL') params.set('country', selectedCountry);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (formatFilter !== 'All Formats') params.set('creativeType', formatFilter);
    if (dataStatusFilter !== 'ALL') params.set('dataStatus', dataStatusFilter);
    if (durationFilter === '>30') params.set('minDurationDays', '30');
    if (sortOrder) params.set('sort', sortOrder);
    params.set('page', String(page));
    params.set('pageSize', '24');

    const headers: Record<string, string> = {};
    if (syncToken.trim()) {
      headers['x-meta-access-token'] = syncToken.trim();
    }

    try {
      const payload = await safeFetchJson<{
        ads: CanonicalAd[];
        pagination: { page: number; pageSize: number; total: number; totalPages: number };
        sourceLabel?: string;
        provider?: string;
        isConfigured?: boolean;
        diagnostic?: { status?: string; message?: string; actionRequired?: string };
      }>(`/api/intelligence/ads?${params.toString()}`, { headers });

      const data = payload.data;
      if (data) {
        setAds(data.ads || []);
        if (data.pagination) setPagination(data.pagination);
        setSourceLabel(data.sourceLabel || 'SpotNxt Unified Ad Store');
        setProviderName(data.provider || 'Meta Ad Library');
        setIsConfigured(Boolean(data.isConfigured));
        setDiagnostic(data.diagnostic || null);
      }
    } catch (reason) {
      setAds([]);
      setError(reason instanceof Error ? reason.message : 'Ad intelligence inventory is unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAds();
  }, [search, platform, selectedCountry, statusFilter, formatFilter, dataStatusFilter, durationFilter, sortOrder, page]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    const query = search.trim();
    router.push(query ? `/dashboard/ad-library?search=${encodeURIComponent(query)}` : '/dashboard/ad-library');
  };

  const handleChipClick = (chip: typeof inspirationChips[0]) => {
    if (chip.query !== undefined) {
      setSearch(chip.query);
    }
    if (chip.filter === 'longest_running') {
      setSortOrder('longest_running');
      setDurationFilter('>30');
    } else {
      setDurationFilter('ALL');
    }
    if (chip.format) {
      setFormatFilter(chip.format);
    }
    setPage(1);
  };

  const handleSaveToken = (token: string) => {
    setSyncToken(token);
    try {
      if (token.trim()) {
        localStorage.setItem('meta_user_access_token', token.trim());
      } else {
        localStorage.removeItem('meta_user_access_token');
      }
    } catch {}
    void loadAds();
  };

  const openAdDetail = async (ad: CanonicalAd) => {
    setSelectedAdForDetail(ad);
    setActiveDetailTab('creative');
    try {
      const res = await safeFetchJson<{
        ad: CanonicalAd;
        observations: AdObservation[];
        relatedAds: CanonicalAd[];
      }>(`/api/intelligence/ads/${ad.id}`);
      if (res.data) {
        setDetailObservations(res.data.observations || ad.observations || []);
        setDetailRelatedAds(res.data.relatedAds || []);
      }
    } catch {
      setDetailObservations(ad.observations || []);
      setDetailRelatedAds([]);
    }
  };

  const runAiAnalysis = async (ad: CanonicalAd) => {
    setAnalyzingAdId(ad.id);
    setAiAnalysisDrawerOpen(true);
    setAiAnalysisResult(null);
    try {
      const res = await safeFetchJson<{
        analysis: { result: AnalysisResult };
      }>('/api/intelligence/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId: ad.id }),
      });
      if (res.data?.analysis?.result) {
        setAiAnalysisResult(res.data.analysis.result);
      }
    } catch (err) {
      console.warn('AI analysis error:', err);
    } finally {
      setAnalyzingAdId(null);
    }
  };

  const handleSaveToSwipe = async () => {
    if (!saveModalAd) return;
    setSaveLoading(true);
    setSaveSuccessMsg('');
    try {
      const res = await safeFetchJson('/api/intelligence/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adId: saveModalAd.id,
          folder: saveFolder,
          notes: saveNotes.trim() || undefined,
          tags: [saveModalAd.advertiserName, saveModalAd.creativeType, saveModalAd.hook || 'Ad'].filter(Boolean),
        }),
      });
      if (res.ok) {
        setSavedAdIds((prev) => new Set([...Array.from(prev), saveModalAd.id]));
        setSaveSuccessMsg(`Saved to "${saveFolder}"!`);
        setTimeout(() => {
          setSaveModalAd(null);
          setSaveSuccessMsg('');
          setSaveNotes('');
        }, 1200);
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleLiveSync = async (e: FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    setSyncError(null);
    setSyncStats(null);
    const targetQuery = syncQuery.trim() || search.trim() || 'Nike';

    try {
      if (syncMethod === 'collector' || !syncToken.trim()) {
        setSyncLoadingStage('Connecting to public Meta Ad Library…');
        const stageTimeout = setTimeout(() => {
          setSyncLoadingStage('Analyzing creatives & extracting copy hooks…');
        }, 2500);

        const res = await safeFetchJson<{
          success: boolean;
          status: string;
          recordsFetched: number;
          recordsInserted: number;
          recordsUpdated: number;
          recordsSkipped: number;
          duplicates: number;
          error?: string;
          diagnostic?: { message: string; actionRequired?: string };
        }>('/api/ads/collect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: targetQuery,
            country: syncCountry,
            activeStatus: syncActiveStatus,
            maxAds: 25,
            analyze: true,
          }),
        });

        clearTimeout(stageTimeout);

        if (res.data) {
          if (res.data.status === 'LIVE' || res.data.recordsFetched > 0) {
            setSyncStats({
              pagesFetched: 1,
              recordsFetched: res.data.recordsFetched,
              recordsInserted: res.data.recordsInserted,
              recordsUpdated: res.data.recordsUpdated,
              recordsSkipped: res.data.recordsSkipped,
              totalLiveInStore: res.data.recordsInserted + res.data.recordsUpdated,
              message: `Retrieved ${res.data.recordsFetched} live ads (${res.data.recordsInserted} newly stored, ${res.data.recordsUpdated} updated).`,
              timestamp: new Date().toLocaleTimeString(),
            });
            await loadAds();
          } else {
            setSyncError({
              code: res.data.status || 'COLLECTOR_NOTICE',
              message: res.data.diagnostic?.message || res.data.error || 'Public collection returned no active records for this query.',
              actionRequired: res.data.diagnostic?.actionRequired || 'Try another brand search term or supply a Meta User Access Token.',
            });
          }
        }
      } else {
        setSyncLoadingStage('Querying Meta Graph API with user token…');
        const res = await safeFetchJson<{
          recordsFetched: number;
          recordsInserted: number;
          recordsUpdated: number;
          recordsSkipped: number;
          pagesFetched: number;
          totalLiveInStore: number;
          message?: string;
        }>('/api/intelligence/providers/meta/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: syncToken.trim() || undefined,
            query: targetQuery,
            country: syncCountry,
            activeStatus: syncActiveStatus,
            maxPages: 3,
            limitPerPage: 25,
          }),
        });

        if (res.data) {
          setSyncStats({
            pagesFetched: res.data.pagesFetched,
            recordsFetched: res.data.recordsFetched,
            recordsInserted: res.data.recordsInserted,
            recordsUpdated: res.data.recordsUpdated,
            recordsSkipped: res.data.recordsSkipped,
            totalLiveInStore: res.data.totalLiveInStore,
            message: res.data.message || `Synchronized ${res.data.recordsFetched} live ads.`,
            timestamp: new Date().toLocaleTimeString(),
          });
          await loadAds();
        }
      }
    } catch (err: unknown) {
      const errObj = err as Error & { code?: string; details?: { actionRequired?: string } };
      setSyncError({
        code: errObj.code || 'SYNC_ERROR',
        message: errObj.message || 'Meta synchronization failed.',
        actionRequired: errObj.details?.actionRequired,
      });
    } finally {
      setIsSyncing(false);
      setSyncLoadingStage('Collecting ads…');
    }
  };

  const loadDebugDiagnostics = async () => {
    setDebugLoading(true);
    setDebugOpen(true);
    try {
      const res = await safeFetchJson<Record<string, unknown>>(
        `/api/intelligence/debug?token=${encodeURIComponent(syncToken)}&query=${encodeURIComponent(search || 'Nike')}`
      );
      if (res.data) {
        setDebugData(res.data);
      }
    } catch (err) {
      console.error('Debug fetch failed:', err);
    } finally {
      setDebugLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header & Intelligence Controls ── */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
              Competitive Ad Library & Discovery
            </h1>
            <Badge
              variant="outline"
              className={cn(
                'gap-1.5 px-2.5 py-0.5 text-xs font-semibold',
                dataStatusFilter === 'live'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-brand-500/40 bg-brand-500/10 text-brand-300'
              )}
            >
              <Radio className={cn('h-3 w-3', isConfigured ? 'animate-pulse text-emerald-400' : 'text-amber-400')} />
              {sourceLabel}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Search, inspect, and analyze competitor advertising creatives across Meta, Instagram, and global ad archives.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDebugDiagnostics}
            className="gap-1.5 border-border hover:bg-accent/40"
          >
            <Code2 className="h-4 w-4 text-brand-400" />
            Meta API Diagnostics
          </Button>

          <Button
            id="sync-meta-btn"
            onClick={() => setSyncOpen(!syncOpen)}
            className="gap-2 gradient-brand text-white shadow-sm"
          >
            <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
            {syncToken ? 'Sync Live Ads' : 'Configure Meta Token'}
          </Button>
        </div>
      </div>

      {/* ── Token Quick Bar (if not configured) ── */}
      {!syncToken && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3 text-xs">
          <div className="flex items-center gap-2 text-amber-300">
            <Info className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              <strong>Benchmark Dataset Active:</strong> Searching real brands (Nike, Adidas, Apple, Samsung, Coca-Cola, HubSpot, Shopify). Enter your Meta Access Token to stream live API data.
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Input
              placeholder="Paste EAAB... User Token"
              className="h-8 text-xs max-w-xs bg-background/80"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveToken((e.target as HTMLInputElement).value);
              }}
              onBlur={(e) => {
                if (e.target.value.trim()) handleSaveToken(e.target.value);
              }}
            />
            <Button size="sm" variant="secondary" className="h-8 text-xs shrink-0" onClick={() => setSyncOpen(true)}>
              Setup
            </Button>
          </div>
        </div>
      )}

      {/* ── Live Meta Sync Drawer ── */}
      {syncOpen && (
        <FadeIn>
          <Card className="border-brand-500/30 bg-card p-6 shadow-md">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Meta Ad Library Integration</h3>
                  <p className="text-xs text-muted-foreground">Official live search, schema validation, and synchronization</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-border/60 bg-muted/30 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setSyncDrawerTab('sync')}
                    className={cn(
                      'px-3 py-1 rounded-md transition-colors font-medium',
                      syncDrawerTab === 'sync' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Run Live Sync
                  </button>
                  <button
                    type="button"
                    onClick={() => setSyncDrawerTab('token')}
                    className={cn(
                      'px-3 py-1 rounded-md transition-colors font-medium',
                      syncDrawerTab === 'token' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Token & Capabilities
                  </button>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSyncOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {syncDrawerTab === 'token' ? (
              <div className="pt-4">
                <MetaTokenConnector
                  compact
                  onConnected={() => {
                    loadAds();
                  }}
                />
              </div>
            ) : (
              <form onSubmit={handleLiveSync} className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center gap-3 pb-2 border-b border-border/50">
                  <span className="text-xs font-medium text-foreground">Collection Method:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSyncMethod('collector')}
                      className={cn(
                        'px-2.5 py-1 rounded text-xs font-medium border transition-colors',
                        syncMethod === 'collector'
                          ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                          : 'border-border text-muted-foreground hover:text-foreground'
                      )}
                    >
                      ⚡ Public Ad Library Collector (No Token Required)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSyncMethod('token')}
                      className={cn(
                        'px-2.5 py-1 rounded text-xs font-medium border transition-colors',
                        syncMethod === 'token'
                          ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                          : 'border-border text-muted-foreground hover:text-foreground'
                      )}
                    >
                      🔑 Meta Graph API (User Access Token)
                    </button>
                  </div>
                </div>

                {syncMethod === 'token' ? (
                  <div>
                    <Label className="text-xs">Meta Access Token (EAAB... / User Token)</Label>
                    <div className="mt-1 flex gap-2">
                      <Input
                        type="password"
                        placeholder="EAA..."
                        value={syncToken}
                        onChange={(e) => handleSaveToken(e.target.value)}
                        className="font-mono text-xs"
                      />
                      {syncToken && (
                        <Button type="button" variant="outline" size="sm" onClick={() => handleSaveToken('')}>
                          Clear
                        </Button>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Get a fresh User Access Token from{' '}
                      <a
                        href="https://developers.facebook.com/tools/explorer/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-400 underline"
                      >
                        Meta Graph API Explorer
                      </a>
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-brand-500/20 bg-brand-500/5 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-brand-400" />
                      MetaAdsCollector Engine
                    </p>
                    <p className="mt-1 text-[11px]">
                      Collects public Meta Ad Library search results directly via reverse-engineered GraphQL queries with deduplication, normalized schema, and automated AdVision AI creative analysis.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Search Query (Brand or Keyword)</Label>
                    <Input
                      placeholder="e.g. Nike, Adidas, Apple"
                      value={syncQuery}
                      onChange={(e) => setSyncQuery(e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Country Target</Label>
                    <select
                      value={syncCountry}
                      onChange={(e) => setSyncCountry(e.target.value)}
                      className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                    >
                      <option value="US">United States (US)</option>
                      <option value="IN">India (IN)</option>
                      <option value="GB">United Kingdom (GB)</option>
                      <option value="CA">Canada (CA)</option>
                      <option value="AU">Australia (AU)</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Delivery Status</Label>
                    <select
                      value={syncActiveStatus}
                      onChange={(e) => setSyncActiveStatus(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
                      className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                    >
                      <option value="ALL">All Delivery Statuses</option>
                      <option value="ACTIVE">Active Ads Only</option>
                      <option value="INACTIVE">Inactive / Historical Only</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button type="submit" disabled={isSyncing} className="gradient-brand text-white gap-2">
                    <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
                    {isSyncing ? syncLoadingStage : 'Run Live Collection'}
                  </Button>
                  {syncStats && (
                    <span className="text-xs text-emerald-400 font-medium">
                      ✓ {syncStats.message}
                    </span>
                  )}
                </div>

                {syncError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      Sync Notice: {syncError.code}
                    </div>
                    <p>{syncError.message}</p>
                    {syncError.actionRequired && (
                      <div className="mt-2 font-medium text-foreground bg-background/50 p-2.5 rounded border border-border/50 space-y-1">
                        <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Recommended Action:</div>
                        <div>{syncError.actionRequired}</div>
                        {syncError.actionRequired.includes('facebook.com/ads/library/api') && (
                          <a
                            href="https://www.facebook.com/ads/library/api"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-brand-400 underline mt-1"
                          >
                            <span>Open Facebook Ad Library API Page</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </form>
            )}
          </Card>
        </FadeIn>
      )}

      {/* ── Search Bar & Inspiration Chips ── */}
      <Card className="p-4 space-y-3">
        <form onSubmit={submitSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search brands (Nike, Adidas, Apple, Samsung...), products, hooks, offers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 text-sm bg-background/70"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  router.push('/dashboard/ad-library');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button type="submit" className="gradient-brand text-white gap-2 shrink-0">
            <Search className="h-4 w-4" />
            Discover
          </Button>
        </form>

        {/* Inspiration quick filter chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold text-muted-foreground mr-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-brand-400" /> Inspiration:
          </span>
          {inspirationChips.map((chip) => {
            const isActive =
              (chip.query !== undefined && search === chip.query) ||
              (chip.filter === 'longest_running' && sortOrder === 'longest_running') ||
              (chip.format && formatFilter === chip.format);

            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleChipClick(chip)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition-all',
                  isActive
                    ? 'gradient-brand text-white shadow-sm'
                    : 'bg-accent/40 text-muted-foreground hover:bg-accent/80 hover:text-foreground'
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* ── Multi-dimensional Filter Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 p-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Data Status Filter */}
          <div className="flex items-center rounded-lg border border-border/60 bg-background/60 p-0.5">
            {[
              { id: 'ALL', label: 'All Sources' },
              { id: 'live', label: 'Live Meta' },
              { id: 'demo', label: 'Benchmark' },
              { id: 'historical', label: 'Historical' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setDataStatusFilter(tab.id as typeof dataStatusFilter);
                  setPage(1);
                }}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  dataStatusFilter === tab.id
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Platform select */}
          <select
            value={platform}
            onChange={(e) => {
              setPlatform(e.target.value);
              setPage(1);
            }}
            className="h-8 rounded-lg border border-border/60 bg-background/60 px-2.5 text-xs text-foreground"
          >
            {platforms.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Format select */}
          <select
            value={formatFilter}
            onChange={(e) => {
              setFormatFilter(e.target.value);
              setPage(1);
            }}
            className="h-8 rounded-lg border border-border/60 bg-background/60 px-2.5 text-xs text-foreground"
          >
            {formats.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          {/* Delivery Status */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-8 rounded-lg border border-border/60 bg-background/60 px-2.5 text-xs text-foreground"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive / Concluded</option>
            <option value="Unknown">Unknown Status</option>
          </select>

          {/* Country */}
          <select
            value={selectedCountry}
            onChange={(e) => {
              setSelectedCountry(e.target.value);
              setPage(1);
            }}
            className="h-8 rounded-lg border border-border/60 bg-background/60 px-2.5 text-xs text-foreground"
          >
            {countries.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Sort & View Mode */}
        <div className="flex items-center gap-2">
          <select
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value);
              setPage(1);
            }}
            className="h-8 rounded-lg border border-border/60 bg-background/60 px-2.5 text-xs text-foreground"
          >
            {sortOptions.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <div className="flex items-center rounded-lg border border-border/60 bg-background/60 p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-1 rounded', viewMode === 'grid' ? 'bg-accent text-foreground' : 'text-muted-foreground')}
              title="Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-1 rounded', viewMode === 'list' ? 'bg-accent text-foreground' : 'text-muted-foreground')}
              title="List View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Active Diagnostic Warning (if any) ── */}
      {diagnostic?.actionRequired && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>{diagnostic.actionRequired}</span>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs border-amber-500/30" onClick={() => setSyncOpen(true)}>
            Resolve
          </Button>
        </div>
      )}

      {/* ── Ad Grid / List Display ── */}
      {loading ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center space-y-3 py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-500" />
          <p className="text-sm text-muted-foreground">Scanning competitive ad inventory…</p>
        </div>
      ) : ads.length === 0 ? (
        <Card className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">No matching ads found</h3>
          <p className="max-w-md text-xs text-muted-foreground">
            No advertising creatives matched your current search filters. You can clear your filters or trigger a live sync for this brand.
          </p>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setPlatform('All Platforms');
                setSelectedCountry('ALL');
                setStatusFilter('ALL');
                setFormatFilter('All Formats');
                setDataStatusFilter('ALL');
                setDurationFilter('ALL');
              }}
            >
              Clear All Filters
            </Button>
            <Button size="sm" className="gradient-brand text-white" onClick={() => setSyncOpen(true)}>
              Sync Meta Ad Library
            </Button>
          </div>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ads.map((ad) => (
            <AdCard
              key={ad.id}
              ad={ad}
              isSaved={savedAdIds.has(ad.id)}
              onOpenDetail={() => openAdDetail(ad)}
              onAnalyze={() => runAiAnalysis(ad)}
              onSave={() => setSaveModalAd(ad)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {ads.map((ad) => (
            <AdListRow
              key={ad.id}
              ad={ad}
              isSaved={savedAdIds.has(ad.id)}
              onOpenDetail={() => openAdDetail(ad)}
              onAnalyze={() => runAiAnalysis(ad)}
              onSave={() => setSaveModalAd(ad)}
            />
          ))}
        </div>
      )}

      {/* ── Pagination Controls ── */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="text-xs text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} -{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} ads
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="px-2 text-xs font-semibold">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ── Rich Ad Detail Modal (Item #8) ── */}
      {selectedAdForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedAdForDetail(null)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header info */}
            <div className="flex items-center gap-3 border-b border-border pb-4 pr-10">
              <div className="h-10 w-10 overflow-hidden rounded-full bg-muted border border-border">
                {selectedAdForDetail.advertiserLogoUrl ? (
                  <img src={selectedAdForDetail.advertiserLogoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-bold text-xs bg-brand-500/20 text-brand-300">
                    {selectedAdForDetail.advertiserName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-bold">{selectedAdForDetail.advertiserName}</h2>
                  <Badge variant="outline" className="text-[10px] font-medium">
                    {selectedAdForDetail.platform}
                  </Badge>
                  <StatusBadge status={selectedAdForDetail.status} />
                  <DataStatusBadge status={selectedAdForDetail.data_status} provider={selectedAdForDetail.provider} />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>First seen: {new Date(selectedAdForDetail.firstSeenAt).toLocaleDateString()}</span>
                  <span>·</span>
                  <span>Duration: {selectedAdForDetail.durationDays || 1} days</span>
                  {selectedAdForDetail.country && (
                    <>
                      <span>·</span>
                      <span>Target: {selectedAdForDetail.country}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="mt-4 flex border-b border-border gap-4 text-xs font-semibold">
              {[
                { id: 'creative', label: 'Creative & Copy' },
                { id: 'timeline', label: `Timeline (${detailObservations.length})` },
                { id: 'ai', label: 'AI Intelligence Analysis' },
                { id: 'raw', label: 'Raw Provider Data' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDetailTab(tab.id as typeof activeDetailTab)}
                  className={cn(
                    'pb-2 transition-colors border-b-2',
                    activeDetailTab === tab.id
                      ? 'border-brand-500 text-brand-400 font-bold'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Creative & Copy */}
            {activeDetailTab === 'creative' && (
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="relative aspect-video sm:aspect-square overflow-hidden rounded-xl bg-black border border-border">
                    {selectedAdForDetail.mediaUrl ? (
                      <img
                        src={selectedAdForDetail.mediaUrl}
                        alt={selectedAdForDetail.headline}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        Preview available via source snapshot
                      </div>
                    )}
                    {selectedAdForDetail.creativeType === 'Video' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="rounded-full bg-black/60 p-3 text-white backdrop-blur-sm">
                          <Play className="h-6 w-6 fill-white" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Format: <strong>{selectedAdForDetail.creativeType}</strong></span>
                    <span>Aspect: <strong>{selectedAdForDetail.aspectRatio || '1:1'}</strong></span>
                    <span>External ID: <strong>{selectedAdForDetail.externalId}</strong></span>
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Headline</Label>
                    <h3 className="font-semibold text-base mt-0.5">{selectedAdForDetail.headline}</h3>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Primary Text</Label>
                    <p className="mt-1 text-xs leading-relaxed text-foreground/90 whitespace-pre-line bg-muted/30 p-3 rounded-lg border border-border/40">
                      {selectedAdForDetail.primaryText}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {selectedAdForDetail.hook && (
                      <div className="rounded-lg border border-brand-500/20 bg-brand-500/[0.04] p-2.5">
                        <div className="text-[11px] font-semibold text-brand-400">Identified Hook</div>
                        <div className="text-xs mt-0.5 font-medium">{selectedAdForDetail.hook}</div>
                      </div>
                    )}
                    {selectedAdForDetail.angle && (
                      <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.04] p-2.5">
                        <div className="text-[11px] font-semibold text-blue-400">Marketing Angle</div>
                        <div className="text-xs mt-0.5 font-medium">{selectedAdForDetail.angle}</div>
                      </div>
                    )}
                  </div>

                  {selectedAdForDetail.offer && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-2.5">
                      <div className="text-[11px] font-semibold text-amber-400">Observed Offer</div>
                      <div className="text-xs mt-0.5 font-medium">{selectedAdForDetail.offer}</div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    {selectedAdForDetail.landingPageUrl && (
                      <a
                        href={selectedAdForDetail.landingPageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:underline"
                      >
                        Destination Landing Page <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <Button
                      size="sm"
                      onClick={() => runAiAnalysis(selectedAdForDetail)}
                      className="gradient-brand text-white gap-1.5 ml-auto"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Deep AI Analysis
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Timeline & Observations */}
            {activeDetailTab === 'timeline' && (
              <div className="mt-5 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Observations recorded for this creative over time. Track copy updates, status changes, and delivery confirmations.
                </p>
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {detailObservations.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-4">
                      Initial observation recorded at discovery ({new Date(selectedAdForDetail.firstSeenAt).toLocaleString()}).
                    </div>
                  ) : (
                    detailObservations.map((obs, idx) => (
                      <div key={obs.id || idx} className="relative">
                        <div className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-card" />
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs space-y-1">
                          <div className="flex items-center justify-between font-semibold">
                            <span className="text-brand-400">{obs.type}</span>
                            <span className="text-muted-foreground font-normal">
                              {new Date(obs.observedAt).toLocaleString()}
                            </span>
                          </div>
                          {obs.headline && (
                            <div className="text-foreground font-medium">&quot;{obs.headline}&quot;</div>
                          )}
                          {obs.notes && (
                            <div className="text-muted-foreground">{obs.notes}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: AI Intelligence Analysis */}
            {activeDetailTab === 'ai' && (
              <div className="mt-5 space-y-4">
                {selectedAdForDetail.aiAnalysis ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-3">
                      <div className="rounded-xl border border-brand-500/20 bg-brand-500/[0.03] p-4">
                        <div className="font-semibold text-brand-400 flex items-center gap-1.5">
                          <Target className="h-4 w-4" /> Strategic Hook & Angle
                        </div>
                        <div className="mt-2 space-y-1.5">
                          <div><strong>Hook:</strong> {selectedAdForDetail.aiAnalysis.hook}</div>
                          <div><strong>Angle:</strong> {selectedAdForDetail.aiAnalysis.angle}</div>
                          <div><strong>Offer:</strong> {selectedAdForDetail.aiAnalysis.offer}</div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border p-4 space-y-2">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <Brain className="h-4 w-4 text-purple-400" /> Problem & Promise
                        </div>
                        <div><strong>Problem Addressed:</strong> {selectedAdForDetail.aiAnalysis.problem}</div>
                        <div><strong>Core Promise:</strong> {selectedAdForDetail.aiAnalysis.promise}</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-xl border border-border p-4 space-y-2">
                        <div className="font-semibold text-foreground">Key Promised Benefits</div>
                        <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                          {selectedAdForDetail.aiAnalysis.benefits?.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-xl border border-border p-4 space-y-1.5">
                        <div><strong>Tone:</strong> {selectedAdForDetail.aiAnalysis.tone}</div>
                        <div><strong>Visual Style:</strong> {selectedAdForDetail.aiAnalysis.visualStyle}</div>
                        <div><strong>Confidence Score:</strong> {Math.round((selectedAdForDetail.aiAnalysis.confidence || 0.9) * 100)}%</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-3">
                    <Brain className="h-8 w-8 mx-auto text-brand-400" />
                    <p className="text-xs text-muted-foreground">
                      Run AI Intelligence Analysis on this ad to extract hooks, copywriting frameworks (AIDA/PAS), and performance predictions.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => runAiAnalysis(selectedAdForDetail)}
                      className="gradient-brand text-white gap-2"
                    >
                      <Sparkles className="h-4 w-4" /> Run AI Analysis
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Raw Provider Data */}
            {activeDetailTab === 'raw' && (
              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Data Provenance Source: <strong>{selectedAdForDetail.provider}</strong></span>
                  <span>Data Status: <strong>{selectedAdForDetail.data_status.toUpperCase()}</strong></span>
                </div>
                <pre className="max-h-80 overflow-auto rounded-xl bg-muted/40 p-4 font-mono text-[11px] text-foreground leading-relaxed border border-border">
                  {JSON.stringify(selectedAdForDetail.rawProviderData || selectedAdForDetail.metadata || selectedAdForDetail, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AI Analysis Drawer ── */}
      {aiAnalysisDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm p-4">
          <div className="relative h-full max-h-[92vh] w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-brand-400" />
                <h3 className="font-display font-bold text-lg">AI Creative Intelligence</h3>
              </div>
              <button
                onClick={() => setAiAnalysisDrawerOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {analyzingAdId ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin text-brand-400" />
                <p className="text-xs text-muted-foreground">Gemini model analyzing hooks, frameworks, and audience signals…</p>
              </div>
            ) : aiAnalysisResult ? (
              <div className="space-y-4 text-xs">
                <div className="rounded-xl border border-brand-500/30 bg-brand-500/[0.04] p-4">
                  <div className="font-semibold text-brand-400 text-sm">Executive Creative Summary</div>
                  <p className="mt-1 leading-relaxed text-foreground/90">{aiAnalysisResult.marketingStrategy}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border p-3">
                    <div className="font-semibold text-purple-400">Emotional Trigger</div>
                    <div className="mt-1">{aiAnalysisResult.emotionalTrigger}</div>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <div className="font-semibold text-emerald-400">Buyer Intent</div>
                    <div className="mt-1">{aiAnalysisResult.buyerIntent}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-border p-4 space-y-2">
                  <div className="font-semibold text-foreground">AIDA Framework Breakdown</div>
                  <div className="space-y-1">
                    <div><strong>Attention:</strong> {aiAnalysisResult.aidaFramework?.attention}</div>
                    <div><strong>Interest:</strong> {aiAnalysisResult.aidaFramework?.interest}</div>
                    <div><strong>Desire:</strong> {aiAnalysisResult.aidaFramework?.desire}</div>
                    <div><strong>Action:</strong> {aiAnalysisResult.aidaFramework?.action}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-border p-4 space-y-2">
                  <div className="font-semibold text-foreground">PAS Framework Breakdown</div>
                  <div className="space-y-1">
                    <div><strong>Problem:</strong> {aiAnalysisResult.pasFramework?.problem}</div>
                    <div><strong>Agitation:</strong> {aiAnalysisResult.pasFramework?.agitation}</div>
                    <div><strong>Solution:</strong> {aiAnalysisResult.pasFramework?.solution}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-border p-4 space-y-2">
                  <div className="font-semibold text-foreground">Strategic Recommendations</div>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    {aiAnalysisResult.recommendations?.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-10">Analysis complete.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Save to Swipe File Modal (Item #19) ── */}
      {saveModalAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-brand-400" />
                <h3 className="font-display font-bold">Save To Swipe File</h3>
              </div>
              <button onClick={() => setSaveModalAd(null)} className="rounded-full p-1.5 text-muted-foreground hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 bg-muted/30 p-2.5 rounded-lg border border-border">
              {saveModalAd.mediaUrl && (
                <img src={saveModalAd.mediaUrl} alt="" className="h-12 w-12 rounded object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-xs truncate">{saveModalAd.advertiserName}</div>
                <div className="text-[11px] text-muted-foreground truncate">{saveModalAd.headline}</div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <Label className="text-xs">Collection / Folder</Label>
                <select
                  value={saveFolder}
                  onChange={(e) => setSaveFolder(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="My Swipe File">My Swipe File</option>
                  <option value="High-Converting Hooks">High-Converting Hooks</option>
                  <option value="SaaS Free Trials">SaaS Free Trials</option>
                  <option value="Competitor Video Angles">Competitor Video Angles</option>
                  <option value="Holiday & Drops">Holiday & Drops</option>
                  <option value="UGC Skincare">UGC Skincare</option>
                </select>
              </div>

              <div>
                <Label className="text-xs">Notes / Why You Saved This</Label>
                <Input
                  placeholder="e.g. Test this 3-second hook format on our next campaign flight"
                  value={saveNotes}
                  onChange={(e) => setSaveNotes(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            {saveSuccessMsg && (
              <div className="text-xs text-emerald-400 font-medium text-center">
                ✓ {saveSuccessMsg}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSaveModalAd(null)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveToSwipe} disabled={saveLoading} className="gradient-brand text-white">
                {saveLoading ? 'Saving…' : 'Save To Swipe File'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Meta API Diagnostics Drawer (Item #32 & #33) ── */}
      {debugOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-brand-400" />
                <h3 className="font-display font-bold text-lg">Meta API & Provider Diagnostics</h3>
              </div>
              <button onClick={() => setDebugOpen(false)} className="rounded-full p-1.5 text-muted-foreground hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>

            {debugLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-brand-400" />
                Testing connection to graph.facebook.com…
              </div>
            ) : debugData ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-muted-foreground">Live Meta Token</div>
                    <div className="font-semibold text-sm mt-1">
                      {(debugData.environment as Record<string, unknown>)?.hasEnvMetaToken ? 'Configured in Env' : syncToken ? 'User-Supplied' : 'Not Set'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-muted-foreground">Total Database Ads</div>
                    <div className="font-semibold text-sm mt-1">
                      {(debugData.database as Record<string, unknown>)?.totalAdsInStore as number || 0}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-muted-foreground">AI Intelligence Model</div>
                    <div className="font-semibold text-sm mt-1 text-brand-400">
                      {(debugData.environment as Record<string, unknown>)?.llmModel as string || 'gemini-2.5-flash'}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="font-semibold">Single-Page Meta Test Result</div>
                  <pre className="overflow-auto rounded bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
                    {JSON.stringify(debugData.metaApiDiagnostic, null, 2)}
                  </pre>
                </div>

                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="font-semibold">Provider Health Matrix</div>
                  <pre className="overflow-auto rounded bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
                    {JSON.stringify(debugData.providers, null, 2)}
                  </pre>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-component: AdCard ──
function AdCard({
  ad,
  isSaved,
  onOpenDetail,
  onAnalyze,
  onSave,
}: {
  ad: CanonicalAd;
  isSaved: boolean;
  onOpenDetail: () => void;
  onAnalyze: () => void;
  onSave: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card transition-all duration-200 hover:border-brand-500/40 hover:shadow-lg">
      {/* Media Preview Box */}
      <div
        className="relative aspect-square w-full cursor-pointer overflow-hidden bg-black/90"
        onClick={onOpenDetail}
      >
        {ad.mediaUrl ? (
          <img
            src={ad.mediaUrl}
            alt={ad.headline}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4 text-center text-xs text-muted-foreground">
            {ad.headline}
          </div>
        )}

        {/* Top Floating Badges */}
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5 z-10">
          <Badge className="bg-black/70 text-white backdrop-blur-md text-[10px] font-semibold border border-white/10">
            {ad.creativeType}
          </Badge>
          {ad.aspectRatio && (
            <Badge className="bg-black/50 text-white/90 backdrop-blur-md text-[10px] font-normal border border-white/10">
              {ad.aspectRatio}
            </Badge>
          )}
        </div>

        {/* Status Badge */}
        <div className="absolute right-2.5 top-2.5 z-10">
          <StatusBadge status={ad.status} />
        </div>

        {/* Video Overlay */}
        {ad.creativeType === 'Video' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-90 transition-opacity group-hover:opacity-100">
            <div className="rounded-full bg-black/60 p-2.5 text-white backdrop-blur-sm transition-transform group-hover:scale-110">
              <Play className="h-4 w-4 fill-white" />
            </div>
          </div>
        )}

        {/* Duration Overlay Pill */}
        <div className="absolute bottom-2.5 left-2.5 z-10">
          <span className="rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-md border border-white/10">
            Active {ad.durationDays || 1}d
          </span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="flex flex-1 flex-col p-4 space-y-3">
        {/* Advertiser Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-muted border border-border">
              {ad.advertiserLogoUrl ? (
                <img src={ad.advertiserLogoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] font-bold bg-brand-500/20 text-brand-300">
                  {ad.advertiserName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <span className="font-semibold text-xs truncate text-foreground">{ad.advertiserName}</span>
          </div>

          <DataStatusBadge status={ad.data_status} provider={ad.provider} compact />
        </div>

        {/* Headline */}
        <h4
          onClick={onOpenDetail}
          className="font-semibold text-xs leading-snug cursor-pointer line-clamp-1 hover:text-brand-400 transition-colors"
        >
          {ad.headline}
        </h4>

        {/* Primary Text */}
        <p className={cn('text-[11px] leading-relaxed text-muted-foreground', !expanded && 'line-clamp-2')}>
          {ad.primaryText}
        </p>
        {ad.primaryText.length > 90 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] font-medium text-brand-400 hover:underline inline-block -mt-1 text-left"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}

        {/* Hook Tag (if available) */}
        {ad.hook && (
          <div className="rounded bg-brand-500/[0.06] border border-brand-500/20 px-2 py-1 text-[10px] font-medium text-brand-300 truncate">
            🎯 {ad.hook}
          </div>
        )}

        {/* Card Actions Footer */}
        <div className="mt-auto pt-2 border-t border-border/50 flex items-center justify-between gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
            className={cn('h-7 px-2 text-[11px]', isSaved ? 'text-brand-400 font-bold' : 'text-muted-foreground')}
            title="Save to Swipe File"
          >
            {isSaved ? <BookmarkCheck className="h-3.5 w-3.5 mr-1" /> : <Bookmark className="h-3.5 w-3.5 mr-1" />}
            {isSaved ? 'Saved' : 'Save'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onAnalyze}
            className="h-7 px-2 text-[11px] text-brand-300 hover:bg-brand-500/10 border-brand-500/30"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Analyze
          </Button>

          <Button
            size="sm"
            onClick={onOpenDetail}
            className="h-7 px-2.5 text-[11px] gradient-brand text-white"
          >
            Inspect
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ── Sub-component: AdListRow ──
function AdListRow({
  ad,
  isSaved,
  onOpenDetail,
  onAnalyze,
  onSave,
}: {
  ad: CanonicalAd;
  isSaved: boolean;
  onOpenDetail: () => void;
  onAnalyze: () => void;
  onSave: () => void;
}) {
  return (
    <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-border/60 hover:border-brand-500/30 transition-colors">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div
          className="relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-black"
          onClick={onOpenDetail}
        >
          {ad.mediaUrl ? (
            <img src={ad.mediaUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground p-1 text-center">
              {ad.headline.slice(0, 15)}
            </div>
          )}
          {ad.creativeType === 'Video' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Play className="h-3.5 w-3.5 fill-white text-white" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-xs text-foreground">{ad.advertiserName}</span>
            <StatusBadge status={ad.status} />
            <DataStatusBadge status={ad.data_status} provider={ad.provider} compact />
            <Badge variant="outline" className="text-[10px]">{ad.creativeType}</Badge>
            <span className="text-[11px] text-muted-foreground">Running {ad.durationDays || 1}d</span>
          </div>
          <h4
            onClick={onOpenDetail}
            className="font-semibold text-xs hover:text-brand-400 cursor-pointer truncate"
          >
            {ad.headline}
          </h4>
          <p className="text-[11px] text-muted-foreground line-clamp-1">{ad.primaryText}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSave}
          className={cn('h-8 text-xs', isSaved ? 'text-brand-400' : 'text-muted-foreground')}
        >
          {isSaved ? <BookmarkCheck className="h-3.5 w-3.5 mr-1" /> : <Bookmark className="h-3.5 w-3.5 mr-1" />}
          {isSaved ? 'Saved' : 'Save'}
        </Button>
        <Button variant="outline" size="sm" onClick={onAnalyze} className="h-8 text-xs gap-1 border-brand-500/30">
          <Sparkles className="h-3.5 w-3.5 text-brand-400" /> Analyze
        </Button>
        <Button size="sm" onClick={onOpenDetail} className="h-8 text-xs gradient-brand text-white">
          Inspect
        </Button>
      </div>
    </Card>
  );
}

// ── Badges ──
function StatusBadge({ status }: { status: string }) {
  const isAct = status === 'Active';
  const isEnd = status === 'Inactive' || status === 'Ended';
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] px-1.5 py-0 font-medium',
        isAct
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
          : isEnd
            ? 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400'
            : 'border-slate-500/30 bg-slate-500/10 text-slate-400'
      )}
    >
      {isAct && <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      {status}
    </Badge>
  );
}

function DataStatusBadge({ status, provider, compact }: { status: string; provider?: string; compact?: boolean }) {
  if (status === 'live') {
    return (
      <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        {compact ? 'LIVE' : 'LIVE DATA'}
      </span>
    );
  }
  if (status === 'historical') {
    return (
      <span className="inline-flex items-center rounded-md border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-300">
        {compact ? 'HIST' : 'HISTORICAL'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
      {compact ? 'BENCH' : 'BENCHMARK'}
    </span>
  );
}
