'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Eye, Sparkles, TrendingUp, ArrowUpRight, ArrowDownRight,
  Globe, Users, Target, Palette, Zap, AlertTriangle, CheckCircle2,
  Lightbulb, BarChart3, Heart, Brain, ArrowRight, X, Calendar,
  Plus, Trash2, Edit3, RefreshCw, Play, Pause, GitCompare, Layers,
  ExternalLink, CheckSquare, Square, Tag, Clock, Info, Check,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/motion';
import {
  competitors, adCreatives, generateAIAnalysis,
  type Competitor, type AdCreative, type AIAnalysis,
} from '@/lib/data';
import { cn } from '@/lib/utils';
import { safeFetchJson } from '@/lib/client-fetch';

export interface TrackedCompetitorItem {
  id: string;
  name: string;
  country: string;
  market?: string;
  industry: string;
  website?: string;
  searchTerms: string[];
  monitoringStatus: 'ACTIVE' | 'PAUSED';
  syncFrequency: string;
  lastSyncedAt?: string;
  lastSyncStatus?: string;
  lastSyncError?: string;
  totalObservedAds: number;
  activeAds: number;
  notes?: string;
  source: 'live' | 'demo';
  createdAt: string;
  updatedAt: string;
}

export interface ComparisonData {
  competitors: Array<{
    id: string;
    name: string;
    industry: string;
    country?: string;
    adCount: number;
    activeAds: number;
    topFormats: Array<{ format: string; count: number; percentage: number }>;
    topCtas: Array<{ cta: string; count: number }>;
    dominantHooks: string[];
    messagingThemes: string[];
    offerTypes: string[];
    publishingVelocity: string;
  }>;
  formatComparison: Array<{
    format: string;
    countsByCompetitor: Record<string, number>;
  }>;
  ctaComparison: Array<{
    cta: string;
    countsByCompetitor: Record<string, number>;
  }>;
  strategicDifferences: string[];
  observedOpportunities: string[];
  generatedAt: string;
}

const marketOptions = [
  { value: '', label: 'All markets' },
  { value: 'IN', label: 'India' },
  { value: 'GLOBAL', label: 'Global' },
  { value: 'ASIA', label: 'Asia' },
  { value: 'NORTH_AMERICA', label: 'North America' },
  { value: 'EUROPE', label: 'Europe' },
];

export default function CompetitorAnalysisPage() {
  const [search, setSearch] = useState('');
  const [market, setMarket] = useState('');
  const [country, setCountry] = useState('');
  const [selectedComp, setSelectedComp] = useState<Competitor | null>(null);
  const [selectedAd, setSelectedAd] = useState<AdCreative | null>(null);
  const [analysisComp, setAnalysisComp] = useState<Competitor | null>(null);
  const [searchResults, setSearchResults] = useState<Competitor[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchMeta, setSearchMeta] = useState({ sourceLabel: 'Live data source not connected', freshnessLabel: 'Freshness unavailable', observedThrough: '' });
  const [competitorAds, setCompetitorAds] = useState<AdCreative[]>([]);
  const [adsLoading, setAdsLoading] = useState(false);

  // Tracked Competitors & Management State
  const [trackedList, setTrackedList] = useState<TrackedCompetitorItem[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalComp, setEditModalComp] = useState<TrackedCompetitorItem | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Comparison State
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);

  // Add Form state
  const [addForm, setAddForm] = useState({
    name: '',
    country: 'US',
    industry: '',
    website: '',
    searchTerms: '',
    syncFrequency: 'DAILY',
    monitoringStatus: 'ACTIVE' as 'ACTIVE' | 'PAUSED',
    notes: '',
  });

  const loadTrackedCompetitors = async () => {
    try {
      const res = await safeFetchJson<TrackedCompetitorItem[]>('/api/intelligence/competitors/manage');
      if (res?.data && Array.isArray(res.data)) {
        setTrackedList(res.data);
      }
    } catch (err) {
      console.error('Failed to load tracked competitors:', err);
    }
  };

  useEffect(() => {
    void loadTrackedCompetitors();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError('');
      try {
        const params = new URLSearchParams({ q: search.trim() });
        if (market) params.set('market', market);
        if (country) params.set('country', country);
        const payload = await safeFetchJson<{
          results: Array<{ id: string; name: string; industry: string; website?: string; adCount: number; activeAds: number }>;
          sourceLabel?: string;
          freshnessLabel?: string;
          observedThrough?: string;
        }>(`/api/intelligence/competitors?${params.toString()}`, { signal: controller.signal });
        const profiles = payload.data?.results || [];
        const mapped = profiles.map((profile) => {
          const existing = competitors.find((item) => item.id === profile.id);
          return existing
            ? { ...existing, name: profile.name, industry: profile.industry, website: profile.website || existing.website, totalAds: profile.adCount, activeCampaigns: profile.activeAds }
            : {
              id: profile.id,
              name: profile.name,
              logoUrl: '',
              industry: profile.industry,
              website: profile.website || 'Website not available',
              totalAds: profile.adCount,
              activeCampaigns: profile.activeAds,
              estMonthlySpend: 0,
              avgEngagement: 0,
              aiScore: 0,
              trend: 'stable' as const,
              trendValue: 0,
              topPlatform: 'Meta' as const,
              creativeMix: [],
              messagingThemes: [],
              ctaPatterns: [],
              strategicMomentum: 0,
            };
        });
        setSearchResults(mapped);
        setSearchMeta({
          sourceLabel: payload.data?.sourceLabel || 'Live Meta Ad Library',
          freshnessLabel: payload.data?.freshnessLabel || 'Live Archive',
          observedThrough: payload.data?.observedThrough || ''
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setSearchError(error instanceof Error ? error.message : 'Company search failed.');
          setSearchResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, market, country]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch((value) => value.trim());
  };

  useEffect(() => {
    if (!selectedComp) {
      setCompetitorAds([]);
      return;
    }
    const controller = new AbortController();
    setAdsLoading(true);

    safeFetchJson<{
      ads: Array<{
        id: string;
        advertiserName: string;
        platform: string;
        creativeType: string;
        mediaUrl?: string;
        thumbnailUrl?: string;
        headline: string;
        primaryText: string;
        cta: string;
        firstSeenAt: string;
        lastSeenAt: string;
        startDate?: string;
        status: string;
      }>;
    }>(`/api/intelligence/ads?advertiserId=${encodeURIComponent(selectedComp.id)}&query=${encodeURIComponent(selectedComp.name)}`, {
      signal: controller.signal,
    })
      .then((payload) => {
        if (payload?.data && Array.isArray(payload.data.ads) && payload.data.ads.length > 0) {
          const liveAds = payload.data.ads;
          setCompetitorAds(
            liveAds.map((ad) => {
              const start = new Date(ad.firstSeenAt).getTime();
              const end = new Date(ad.lastSeenAt).getTime();
              const durationDays = Number.isFinite(start) && Number.isFinite(end) && end >= start ? Math.max(1, Math.round((end - start) / 86400000)) : 1;
              return {
                id: ad.id,
                competitorId: selectedComp.id,
                competitorName: ad.advertiserName || selectedComp.name,
                platform: (ad.platform || 'Meta') as any,
                format: (ad.creativeType || 'Image') as any,
                imageUrl: ad.mediaUrl || ad.thumbnailUrl || '',
                headline: ad.headline || 'Ad Creative',
                bodyCopy: ad.primaryText || '',
                cta: ad.cta || 'Learn More',
                firstSeen: ad.firstSeenAt,
                lastSeen: ad.lastSeenAt,
                startDate: ad.startDate || ad.firstSeenAt?.split('T')[0] || 'Recently',
                durationDays,
                estimatedEngagement: 0,
                impressions: 0,
                sentiment: 'Positive' as const,
                hookType: 'Direct Offer',
                status: (ad.status || 'Active') as any,
              };
            })
          );
        } else {
          setCompetitorAds(adCreatives.filter((a) => a.competitorId === selectedComp.id));
        }
      })
      .catch(() => {
        setCompetitorAds(adCreatives.filter((a) => a.competitorId === selectedComp.id));
      })
      .finally(() => {
        if (!controller.signal.aborted) setAdsLoading(false);
      });

    return () => controller.abort();
  }, [selectedComp]);

  // Handler: Toggle Monitoring Status
  const handleToggleMonitoring = async (comp: TrackedCompetitorItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = comp.monitoringStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await safeFetchJson('/api/intelligence/competitors/manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: comp.id, monitoringStatus: nextStatus }),
      });
      setTrackedList((prev) =>
        prev.map((item) => (item.id === comp.id ? { ...item, monitoringStatus: nextStatus } : item))
      );
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  // Handler: On-Demand Competitor Sync
  const handleSyncCompetitor = async (comp: TrackedCompetitorItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSyncingId(comp.id);
    setSyncNotice(`Initiating Meta synchronization for ${comp.name}...`);
    try {
      const res = await safeFetchJson<{ competitor: TrackedCompetitorItem; syncResult: any }>(
        '/api/intelligence/competitors/sync',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ competitorId: comp.id }),
        }
      );
      if (res?.data?.competitor) {
        const updatedComp = res.data.competitor;
        setTrackedList((prev) =>
          prev.map((item) => (item.id === comp.id ? updatedComp : item))
        );
        setSyncNotice(`Synchronization complete for ${comp.name}.`);
      }
      setTimeout(() => setSyncNotice(null), 4000);
    } catch (err) {
      setSyncNotice(`Sync notice: ${err instanceof Error ? err.message : 'Synchronization failed.'}`);
      setTimeout(() => setSyncNotice(null), 6000);
    } finally {
      setSyncingId(null);
    }
  };

  // Handler: Delete Competitor
  const handleDeleteCompetitor = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await safeFetchJson(`/api/intelligence/competitors/manage?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      setTrackedList((prev) => prev.filter((item) => item.id !== id));
      setSelectedForCompare((prev) => prev.filter((i) => i !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Handler: Add Competitor Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) return;

    try {
      const terms = addForm.searchTerms
        ? addForm.searchTerms.split(',').map((t) => t.trim()).filter(Boolean)
        : [addForm.name.trim()];

      const res = await safeFetchJson<TrackedCompetitorItem>('/api/intelligence/competitors/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name.trim(),
          country: addForm.country.trim().toUpperCase(),
          industry: addForm.industry.trim() || 'General',
          website: addForm.website.trim(),
          searchTerms: terms,
          syncFrequency: addForm.syncFrequency,
          monitoringStatus: addForm.monitoringStatus,
          notes: addForm.notes.trim(),
        }),
      });

      if (res?.data) {
        const newCompetitor = res.data;
        setTrackedList((prev) => [newCompetitor, ...prev.filter((p) => p.id !== newCompetitor.id)]);
      }
      setAddModalOpen(false);
      setAddForm({
        name: '',
        country: 'US',
        industry: '',
        website: '',
        searchTerms: '',
        syncFrequency: 'DAILY',
        monitoringStatus: 'ACTIVE',
        notes: '',
      });
    } catch (err) {
      console.error('Failed to add competitor:', err);
    }
  };

  // Handler: Edit Competitor Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalComp) return;

    try {
      const res = await safeFetchJson<TrackedCompetitorItem>('/api/intelligence/competitors/manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editModalComp.id,
          name: editModalComp.name,
          country: editModalComp.country,
          industry: editModalComp.industry,
          website: editModalComp.website,
          searchTerms: editModalComp.searchTerms,
          syncFrequency: editModalComp.syncFrequency,
          monitoringStatus: editModalComp.monitoringStatus,
          notes: editModalComp.notes,
        }),
      });

      if (res?.data) {
        const updatedItem = res.data;
        setTrackedList((prev) =>
          prev.map((item) => (item.id === editModalComp.id ? updatedItem : item))
        );
      }
      setEditModalComp(null);
    } catch (err) {
      console.error('Failed to update competitor:', err);
    }
  };

  // Handler: Toggle Select for Comparison
  const toggleSelectForCompare = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedForCompare((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  // Handler: Run Comparison
  const handleRunComparison = async () => {
    if (selectedForCompare.length < 2) return;
    setComparisonLoading(true);
    setCompareModalOpen(true);
    try {
      const res = await safeFetchJson<ComparisonData>(
        `/api/intelligence/competitors/compare?ids=${encodeURIComponent(selectedForCompare.join(','))}`
      );
      if (res?.data) {
        setComparisonData(res.data);
      }
    } catch (err) {
      console.error('Comparison error:', err);
    } finally {
      setComparisonLoading(false);
    }
  };

  const filtered = searchResults;

  return (
    <div className="space-y-6">
      {/* Page Header with Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <span>Competitor Intelligence Manager</span>
            <Badge variant="outline" className="text-xs font-mono">{trackedList.length} Tracked</Badge>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Continuous Meta Ads monitoring, creative pattern tracking, and multi-competitor comparison.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedForCompare.length >= 2 && (
            <Button
              onClick={handleRunComparison}
              variant="outline"
              size="sm"
              className="gap-1.5 border-brand-500/40 text-brand-400 hover:bg-brand-500/10"
            >
              <GitCompare className="h-4 w-4" /> Compare ({selectedForCompare.length})
            </Button>
          )}
          <Button
            onClick={() => setAddModalOpen(true)}
            size="sm"
            className="gap-1.5 gradient-brand text-white shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Competitor
          </Button>
        </div>
      </div>

      {syncNotice && (
        <div className="rounded-lg border border-brand-500/30 bg-brand-500/10 p-3 text-xs text-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-brand-400" />
            <span>{syncNotice}</span>
          </div>
          <button onClick={() => setSyncNotice(null)} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <FadeIn>
        <form onSubmit={submitSearch} className="relative">
          <button type="submit" aria-label="Search companies" className="absolute left-0 top-0 z-10 flex h-full w-12 items-center justify-center text-muted-foreground hover:text-foreground">
            <Search className="h-5 w-5" />
          </button>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tracked competitors or search terms (e.g. Nike, Gymshark, Athletic Shoes)..."
            className="h-12 pl-12 pr-12 text-base"
          />
          {searchLoading && <span className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />}
        </form>
        <div className="mt-3 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <select aria-label="Market" value={market} onChange={(event) => setMarket(event.target.value)} className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground">
              {marketOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <Input aria-label="Country code" value={country} onChange={(event) => setCountry(event.target.value.toUpperCase().slice(0, 2))} placeholder="Country (e.g. US, IN)" className="h-9 w-40 text-xs" />
          </div>
          {selectedForCompare.length > 0 && (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span>{selectedForCompare.length} selected for comparison</span>
              <button onClick={() => setSelectedForCompare([])} className="text-brand-400 hover:underline">Clear</button>
            </div>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>Source: {searchMeta.sourceLabel}</span>
          <span>Data freshness: {searchMeta.freshnessLabel}</span>
          {searchMeta.observedThrough && <span>Observed through: {new Date(searchMeta.observedThrough).toLocaleDateString()}</span>}
        </div>
      </FadeIn>

      {!selectedComp ? (
        <>
          <StaggerContainer className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((comp) => {
              const tracked = trackedList.find((t) => t.id === comp.id || t.name.toLowerCase() === comp.name.toLowerCase());
              const isSelectedCompare = selectedForCompare.includes(comp.id);
              const isSyncing = syncingId === comp.id;

              return (
                <StaggerItem key={comp.id}>
                  <Card
                    className={cn(
                      "group relative cursor-pointer p-5 transition-all hover:shadow-lg hover:border-brand-500/30 hover:-translate-y-1",
                      isSelectedCompare && "border-brand-500/60 bg-brand-500/[0.03]"
                    )}
                    onClick={() => setSelectedComp(comp)}
                  >
                    {/* Top Row: Select Checkbox & Action Icons */}
                    <div className="flex items-center justify-between pb-3 border-b border-border/40">
                      <div
                        onClick={(e) => toggleSelectForCompare(comp.id, e)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Select for multi-competitor comparison"
                      >
                        {isSelectedCompare ? (
                          <CheckSquare className="h-4 w-4 text-brand-400" />
                        ) : (
                          <Square className="h-4 w-4 opacity-60" />
                        )}
                        <span className="text-[11px]">Compare</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleToggleMonitoring(tracked || { id: comp.id, monitoringStatus: 'ACTIVE' } as any, e)}
                          className={cn(
                            "rounded p-1 text-xs transition-colors",
                            tracked?.monitoringStatus === 'PAUSED'
                              ? "text-muted-foreground hover:text-foreground"
                              : "text-emerald-400 hover:bg-emerald-500/10"
                          )}
                          title={tracked?.monitoringStatus === 'PAUSED' ? "Monitoring Paused (Click to Activate)" : "Monitoring Active (Click to Pause)"}
                        >
                          {tracked?.monitoringStatus === 'PAUSED' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={(e) => handleSyncCompetitor(tracked || { id: comp.id, name: comp.name, country: 'US', searchTerms: [comp.name] } as any, e)}
                          disabled={isSyncing}
                          className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                          title="Run on-demand Meta Ad Library synchronization"
                        >
                          <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin text-brand-400")} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditModalComp(tracked || {
                              id: comp.id,
                              name: comp.name,
                              country: 'US',
                              industry: comp.industry,
                              website: comp.website,
                              searchTerms: [comp.name],
                              monitoringStatus: 'ACTIVE',
                              syncFrequency: 'DAILY',
                              totalObservedAds: comp.totalAds,
                              activeAds: comp.activeCampaigns,
                              source: 'live',
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                            });
                          }}
                          className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit Competitor Settings"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(comp.id);
                          }}
                          className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                          title="Remove Competitor"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Header info */}
                    <div className="mt-3 flex items-start gap-3">
                      <img src={comp.logoUrl || `https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&auto=format&fit=crop&q=80`} alt={comp.name} className="h-12 w-12 rounded-xl object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-display text-base font-semibold truncate">{comp.name}</h3>
                          <Badge variant="outline" className="text-[10px] px-1 py-0 uppercase">{tracked?.country || 'US'}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{comp.industry}</p>
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                          <Globe className="h-2.5 w-2.5 shrink-0" /> {comp.website}
                        </div>
                      </div>
                    </div>

                    {/* Stats metrics */}
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center bg-muted/20 p-2.5 rounded-lg border border-border/40">
                      <div>
                        <div className="text-base font-bold tabular-nums">{comp.totalAds}</div>
                        <div className="text-[10px] text-muted-foreground">Observed Ads</div>
                      </div>
                      <div>
                        <div className="text-base font-bold tabular-nums">{comp.activeCampaigns}</div>
                        <div className="text-[10px] text-muted-foreground">Active Now</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-0.5">
                          <Sparkles className="h-3 w-3 text-brand-400" />
                          <span className="text-base font-bold tabular-nums">{comp.aiScore || 85}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">AI Score</div>
                      </div>
                    </div>

                    {/* Search Terms / Schedule pill */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" /> {tracked?.syncFrequency || 'DAILY'}
                      </span>
                      <span className="text-border">·</span>
                      <span className={cn(
                        "rounded px-1.5 py-0.2 font-medium",
                        tracked?.monitoringStatus === 'PAUSED' ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"
                      )}>
                        {tracked?.monitoringStatus || 'ACTIVE'}
                      </span>
                    </div>

                    {/* Bottom CTA */}
                    <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                      <span className={cn('flex items-center gap-1 text-[11px] font-medium', comp.trend === 'up' ? 'text-success' : comp.trend === 'down' ? 'text-destructive' : 'text-muted-foreground')}>
                        {comp.trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : comp.trend === 'down' ? <ArrowDownRight className="h-3 w-3" /> : null}
                        {comp.trendValue}% activity
                      </span>
                      <span className="flex items-center gap-1 text-brand-400 font-medium group-hover:gap-1.5 transition-all text-xs">
                        Deep Analysis <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </Card>
                </StaggerItem>
              );
            })}
          </StaggerContainer>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">No competitors found matching this filter.</p>
              <Button onClick={() => setAddModalOpen(true)} className="mt-4 gap-1.5 gradient-brand text-white" size="sm">
                <Plus className="h-4 w-4" /> Track New Competitor
              </Button>
            </div>
          )}
        </>
      ) : (
        <CompetitorDetail
          competitor={selectedComp}
          ads={competitorAds}
          onBack={() => setSelectedComp(null)}
          onAnalyzeAd={(ad) => setSelectedAd(ad)}
          onAnalyzeCompetitor={() => setAnalysisComp(selectedComp)}
        />
      )}

      {/* Add Competitor Modal */}
      <AnimatePresence>
        {addModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <Card className="w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10">
                    <Plus className="h-4 w-4 text-brand-400" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-lg">Track New Competitor</h3>
                    <p className="text-xs text-muted-foreground">Configure ad collection and continuous monitoring.</p>
                  </div>
                </div>
                <button onClick={() => setAddModalOpen(false)} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
                <div>
                  <Label className="text-xs">Competitor Name *</Label>
                  <Input
                    required
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="e.g. Nike, Gymshark, Puma"
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Country / Market Code *</Label>
                    <Input
                      required
                      value={addForm.country}
                      onChange={(e) => setAddForm({ ...addForm, country: e.target.value.toUpperCase().slice(0, 2) })}
                      placeholder="US, IN, GB, CA"
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Industry / Category</Label>
                    <Input
                      value={addForm.industry}
                      onChange={(e) => setAddForm({ ...addForm, industry: e.target.value })}
                      placeholder="e.g. Sportswear, DTC Beauty"
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Official Website URL</Label>
                  <Input
                    value={addForm.website}
                    onChange={(e) => setAddForm({ ...addForm, website: e.target.value })}
                    placeholder="e.g. nike.com"
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs">Search Terms (comma-separated)</Label>
                  <Input
                    value={addForm.searchTerms}
                    onChange={(e) => setAddForm({ ...addForm, searchTerms: e.target.value })}
                    placeholder="e.g. Nike running, Nike shoes, Nike sportswear"
                    className="mt-1 h-9 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Used to query official Meta Ad Library public archive.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Sync Frequency</Label>
                    <select
                      value={addForm.syncFrequency}
                      onChange={(e) => setAddForm({ ...addForm, syncFrequency: e.target.value })}
                      className="mt-1 w-full h-9 rounded-lg border border-border bg-card px-2 text-xs text-foreground"
                    >
                      <option value="HOURLY">Hourly</option>
                      <option value="EVERY_6_HOURS">Every 6 Hours</option>
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MANUAL">Manual Only</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Monitoring Status</Label>
                    <select
                      value={addForm.monitoringStatus}
                      onChange={(e) => setAddForm({ ...addForm, monitoringStatus: e.target.value as any })}
                      className="mt-1 w-full h-9 rounded-lg border border-border bg-card px-2 text-xs text-foreground"
                    >
                      <option value="ACTIVE">Active (Continuous)</option>
                      <option value="PAUSED">Paused</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Strategic Notes (Optional)</Label>
                  <textarea
                    value={addForm.notes}
                    onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                    placeholder="Key strategic differentiators or product focus..."
                    className="mt-1 w-full rounded-lg border border-border bg-card p-2 text-xs text-foreground h-16 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <Button type="button" variant="outline" size="sm" onClick={() => setAddModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="gradient-brand text-white">
                    Save Competitor
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Competitor Modal */}
      <AnimatePresence>
        {editModalComp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <Card className="w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10">
                    <Edit3 className="h-4 w-4 text-brand-400" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-lg">Edit Competitor: {editModalComp.name}</h3>
                    <p className="text-xs text-muted-foreground">Update monitoring parameters and search terms.</p>
                  </div>
                </div>
                <button onClick={() => setEditModalComp(null)} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
                <div>
                  <Label className="text-xs">Competitor Name</Label>
                  <Input
                    required
                    value={editModalComp.name}
                    onChange={(e) => setEditModalComp({ ...editModalComp, name: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Country</Label>
                    <Input
                      required
                      value={editModalComp.country}
                      onChange={(e) => setEditModalComp({ ...editModalComp, country: e.target.value.toUpperCase().slice(0, 2) })}
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Industry</Label>
                    <Input
                      value={editModalComp.industry}
                      onChange={(e) => setEditModalComp({ ...editModalComp, industry: e.target.value })}
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Website</Label>
                  <Input
                    value={editModalComp.website || ''}
                    onChange={(e) => setEditModalComp({ ...editModalComp, website: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs">Search Terms (comma-separated)</Label>
                  <Input
                    value={editModalComp.searchTerms.join(', ')}
                    onChange={(e) => setEditModalComp({ ...editModalComp, searchTerms: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Sync Frequency</Label>
                    <select
                      value={editModalComp.syncFrequency}
                      onChange={(e) => setEditModalComp({ ...editModalComp, syncFrequency: e.target.value })}
                      className="mt-1 w-full h-9 rounded-lg border border-border bg-card px-2 text-xs text-foreground"
                    >
                      <option value="HOURLY">Hourly</option>
                      <option value="EVERY_6_HOURS">Every 6 Hours</option>
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MANUAL">Manual Only</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Status</Label>
                    <select
                      value={editModalComp.monitoringStatus}
                      onChange={(e) => setEditModalComp({ ...editModalComp, monitoringStatus: e.target.value as any })}
                      className="mt-1 w-full h-9 rounded-lg border border-border bg-card px-2 text-xs text-foreground"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="PAUSED">Paused</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Notes</Label>
                  <textarea
                    value={editModalComp.notes || ''}
                    onChange={(e) => setEditModalComp({ ...editModalComp, notes: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-card p-2 text-xs text-foreground h-16 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditModalComp(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="gradient-brand text-white">
                    Update Competitor
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <Card className="w-full max-w-sm p-6 space-y-4">
              <div className="flex items-center gap-3 text-destructive">
                <AlertTriangle className="h-6 w-6" />
                <h3 className="font-semibold text-base">Remove Competitor?</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                This will remove the competitor from continuous monitoring. Existing stored canonical ads will remain in your archive.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => handleDeleteCompetitor(deleteConfirmId, e)}
                >
                  Confirm Delete
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Multi-Competitor Comparison Modal */}
      <AnimatePresence>
        {compareModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
          >
            <Card className="w-full max-w-4xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10">
                    <GitCompare className="h-4 w-4 text-brand-400" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg">Multi-Competitor Head-to-Head Comparison</h3>
                    <p className="text-xs text-muted-foreground">
                      Objective evidence-backed comparison across creative formats, messaging hooks, and CTAs.
                    </p>
                  </div>
                </div>
                <button onClick={() => setCompareModalOpen(false)} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {comparisonLoading ? (
                <div className="py-20 text-center space-y-3">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-brand-400" />
                  <p className="text-sm text-muted-foreground">Analyzing cross-competitor advertising datasets…</p>
                </div>
              ) : comparisonData ? (
                <div className="space-y-6">
                  {/* Competitor Overview Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {comparisonData.competitors.map((c) => (
                      <div key={c.id} className="rounded-xl border border-border/50 bg-card p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm">{c.name}</h4>
                          <Badge variant="outline" className="text-[10px]">{c.country || 'Global'}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{c.industry}</p>
                        <div className="pt-2 grid grid-cols-2 gap-2 text-center text-xs bg-muted/20 p-2 rounded">
                          <div>
                            <span className="font-bold text-sm block">{c.adCount}</span>
                            <span className="text-[10px] text-muted-foreground">Observed Ads</span>
                          </div>
                          <div>
                            <span className="font-bold text-sm block text-emerald-400">{c.activeAds}</span>
                            <span className="text-[10px] text-muted-foreground">Active Now</span>
                          </div>
                        </div>
                        <div className="text-[11px] text-muted-foreground pt-1">
                          <span className="font-medium text-foreground">Dominant Format: </span>
                          {c.topFormats[0]?.format || 'Image'} ({c.topFormats[0]?.percentage || 0}%)
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Creative Formats Breakdown */}
                  <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-brand-400" /> Creative Format Distribution
                    </h4>
                    <div className="space-y-2 text-xs">
                      {comparisonData.formatComparison.map((f) => (
                        <div key={f.format} className="space-y-1">
                          <div className="flex items-center justify-between font-medium">
                            <span>{f.format}</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                            {Object.entries(f.countsByCompetitor).map(([compName, count]) => (
                              <div key={compName} className="flex items-center justify-between bg-muted/30 px-2 py-1 rounded">
                                <span className="truncate">{compName}:</span>
                                <span className="font-bold text-foreground ml-2">{count} ads</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Strategic Differences & Observable Gaps */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-2.5">
                      <h4 className="font-semibold text-sm flex items-center gap-1.5 text-brand-400">
                        <TrendingUp className="h-4 w-4" /> Observed Strategic Differences
                      </h4>
                      <ul className="space-y-2 text-xs text-muted-foreground">
                        {comparisonData.strategicDifferences.map((diff, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                            <span>{diff}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-2.5">
                      <h4 className="font-semibold text-sm flex items-center gap-1.5 text-emerald-400">
                        <Target className="h-4 w-4" /> Market White-space & Opportunities
                      </h4>
                      <ul className="space-y-2 text-xs text-muted-foreground">
                        {comparisonData.observedOpportunities.map((opp, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                            <span>{opp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : null}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Analysis Modal */}
      <AnimatePresence>
        {selectedAd && (
          <AIAnalysisModal ad={selectedAd} onClose={() => setSelectedAd(null)} />
        )}
        {analysisComp && (
          <CompetitorAnalysisModal competitor={analysisComp} onClose={() => setAnalysisComp(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function CompetitorDetail({
  competitor, ads, onBack, onAnalyzeAd, onAnalyzeCompetitor,
}: {
  competitor: Competitor;
  ads: AdCreative[];
  onBack: () => void;
  onAnalyzeAd: (ad: AdCreative) => void;
  onAnalyzeCompetitor: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <img src={competitor.logoUrl} alt={competitor.name} className="h-16 w-16 rounded-xl object-cover" />
          <div>
            <h2 className="font-display text-2xl font-bold">{competitor.name}</h2>
            <p className="text-sm text-muted-foreground">{competitor.industry} · {competitor.website}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onBack} className="gap-2">
            <X className="h-4 w-4" /> Back
          </Button>
          <Button size="sm" onClick={onAnalyzeCompetitor} className="gap-2 gradient-brand text-white">
            <Brain className="h-4 w-4" /> Analyze Competitor
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          { label: 'Total Ads', value: competitor.totalAds.toLocaleString() },
          { label: 'Active Campaigns', value: competitor.activeCampaigns.toString() },
          { label: 'Est. Monthly Spend', value: `$${(competitor.estMonthlySpend / 1000000).toFixed(1)}M` },
          { label: 'Avg Engagement', value: `${competitor.avgEngagement}%` },
          { label: 'AI Score', value: competitor.aiScore.toString() },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="text-2xl font-bold tabular-nums">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* Active Ads */}
      <div>
        <h3 className="mb-4 font-display text-lg font-semibold">Active Advertisements ({ads.length})</h3>
        <StaggerContainer className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ads.map((ad) => (
            <StaggerItem key={ad.id}>
              <Card className="group overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
                <div className="relative aspect-video overflow-hidden">
                  <img src={ad.imageUrl} alt={ad.headline} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <Badge className="absolute left-3 top-3" variant="secondary">{ad.format}</Badge>
                  <Badge className="absolute right-3 top-3" variant="default">{ad.platform}</Badge>
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-sm leading-snug">{ad.headline}</h4>
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{ad.bodyCopy}</p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" /> {ad.durationDays}d
                    </span>
                    <span className="flex items-center gap-1 text-success font-medium">
                      <TrendingUp className="h-3 w-3" /> {ad.estimatedEngagement}% eng.
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">CTA: {ad.cta}</Badge>
                    <Button
                      size="sm"
                      className="gap-1.5 gradient-brand text-white"
                      onClick={() => onAnalyzeAd(ad)}
                    >
                      <Sparkles className="h-3.5 w-3.5" /> AI Analysis
                    </Button>
                  </div>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </motion.div>
  );
}

function AIAnalysisModal({ ad, onClose }: { ad: AdCreative; onClose: () => void }) {
  const analysis: AIAnalysis = generateAIAnalysis(ad);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 md:p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        className="relative my-8 w-full max-w-4xl rounded-2xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between rounded-t-2xl border-b border-border bg-background/95 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <img src={ad.imageUrl} alt={ad.headline} className="h-12 w-12 rounded-lg object-cover" />
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-500" />
                <h2 className="font-display text-xl font-bold">AI Analysis</h2>
              </div>
              <p className="text-sm text-muted-foreground">{ad.competitorName} · {ad.platform} · {ad.format}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Ad Preview */}
          <Card className="overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="relative aspect-video md:aspect-auto">
                <img src={ad.imageUrl} alt={ad.headline} className="h-full w-full object-cover" />
              </div>
              <div className="p-5">
                <div className="flex gap-2">
                  <Badge variant="secondary">{ad.platform}</Badge>
                  <Badge variant="secondary">{ad.format}</Badge>
                  <Badge className="gradient-brand text-white">{ad.status}</Badge>
                </div>
                <h3 className="mt-3 font-semibold">{ad.headline}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{ad.bodyCopy}</p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium">
                  CTA: <span className="text-brand-500">{ad.cta}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Duration:</span> {ad.durationDays} days</div>
                  <div><span className="text-muted-foreground">Impressions:</span> {(ad.impressions / 1000000).toFixed(1)}M</div>
                  <div><span className="text-muted-foreground">Est. Engagement:</span> {ad.estimatedEngagement}%</div>
                  <div><span className="text-muted-foreground">Start:</span> {ad.startDate}</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <ScoreCard label="Success Score" value={analysis.successScore} max={100} icon={Target} color="brand" />
            <ScoreCard label="Performance Prediction" value={Math.round(analysis.performancePrediction * 10)} max={100} icon={TrendingUp} color="chart-2" />
            <ScoreCard label="Creativity Score" value={analysis.creativityScore} max={100} icon={Sparkles} color="chart-4" />
            <ScoreCard label="Sentiment Score" value={analysis.sentimentScore} max={100} icon={Heart} color="chart-3" />
          </div>

          {/* Analysis sections */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <AnalysisCard icon={Brain} title="Marketing Strategy" color="brand">
              {analysis.marketingStrategy}
            </AnalysisCard>
            <AnalysisCard icon={Heart} title="Emotional Trigger" color="chart-3">
              {analysis.emotionalTrigger}
            </AnalysisCard>
            <AnalysisCard icon={Eye} title="Copywriting Analysis" color="chart-2">
              {analysis.copywritingAnalysis}
            </AnalysisCard>
            <AnalysisCard icon={Target} title="Target Audience" color="chart-4">
              {analysis.targetAudience}
            </AnalysisCard>
            <AnalysisCard icon={Palette} title="Color Psychology" color="chart-5">
              {analysis.colorPsychology}
            </AnalysisCard>
            <AnalysisCard icon={Zap} title="CTA Analysis" color="warning">
              {analysis.ctaAnalysis}
            </AnalysisCard>
          </div>

          {/* Frameworks */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FrameworkCard title="AIDA Framework" items={[
              { label: 'Attention', value: analysis.aidaFramework.attention },
              { label: 'Interest', value: analysis.aidaFramework.interest },
              { label: 'Desire', value: analysis.aidaFramework.desire },
              { label: 'Action', value: analysis.aidaFramework.action },
            ]} />
            <FrameworkCard title="PAS Framework" items={[
              { label: 'Problem', value: analysis.pasFramework.problem },
              { label: 'Agitation', value: analysis.pasFramework.agitation },
              { label: 'Solution', value: analysis.pasFramework.solution },
            ]} />
          </div>

          {/* Buyer Intent & SEO */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <AnalysisCard icon={Target} title="Buyer Intent" color="success">
              {analysis.buyerIntent}
            </AnalysisCard>
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-brand-500" />
                <h3 className="font-semibold">SEO Keywords</h3>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {analysis.seoKeywords.map((kw) => (
                  <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                ))}
              </div>
            </Card>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <h3 className="font-semibold">Strengths</h3>
              </div>
              <ul className="mt-3 space-y-2">
                {analysis.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                    <span className="text-muted-foreground">{s}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <h3 className="font-semibold">Weaknesses</h3>
              </div>
              <ul className="mt-3 space-y-2">
                {analysis.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                    <span className="text-muted-foreground">{w}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Recommendations */}
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-chart-3" />
              <h3 className="font-semibold">AI Recommendations</h3>
            </div>
            <ul className="mt-3 space-y-3">
              {analysis.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-3 rounded-lg border border-border/60 p-3 hover:border-brand-500/30 transition-colors">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full gradient-brand text-xs font-bold text-white">{i + 1}</span>
                  <span className="text-sm text-muted-foreground">{r}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
}

type CompetitorAnalysisPayload = {
  competitorName: string;
  model: string;
  confidence: number;
  limitations: string[];
  sourceLabel: string;
  observedThrough?: string;
  result: {
    overview: { company: string; industry: string; website?: string; availableAdvertisingSignals: string[]; analyzedAds: number };
    creativeIntelligence: { dominantCreativeStyles: string[]; visualPatterns: string[]; formats: string[]; messagingPatterns: string[]; ctaPatterns: string[] };
    adCopyIntelligence: { commonHooks: string[]; messagingThemes: string[]; valuePropositions: string[]; emotionalTriggers: string[]; ctaStrategy: string };
    competitivePositioning: { positioningThemes: string[]; differentiators: string[]; strengths: string[]; weaknesses: string[]; potentialGaps: string[] };
    trendIntelligence: { emergingCreativePatterns: string[]; messagingTrends: string[]; repeatedCampaigns: string[]; recentAvailableSignals: string[] };
    strategicOpportunities: string[];
  };
};

function CompetitorAnalysisModal({ competitor, onClose }: { competitor: Competitor; onClose: () => void }) {
  const [analysis, setAnalysis] = useState<CompetitorAnalysisPayload | null>(null);
  const startedFor = useRef<string | null>(null);
  const [stageMessages, setStageMessages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const runAnalysis = async (force = false) => {
    setLoading(true);
    setError('');
    setAnalysis(null);
    setStageMessages([]);
    const since = new Date().toISOString();
    let active = true;
    const poll = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/intelligence/events?since=${encodeURIComponent(since)}`);
        const payload = await response.json();
        const events = (payload.data?.events ?? []) as Array<{ entityId?: string; message: string; type: string }>;
        const messages = events.filter((event) => event.entityId === competitor.id && (event.type === 'COMPETITOR_ANALYSIS_STARTED' || event.type === 'COMPETITOR_STAGE_COMPLETED')).map((event) => event.message).reverse();
        if (active && messages.length) setStageMessages(messages);
      } catch {
        // The analysis request remains the source of truth; polling failure is non-fatal.
      }
    }, 400);
    try {
      const response = await fetch('/api/intelligence/competitors/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitorId: competitor.id, force }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message || 'Competitor analysis failed.');
      if (active) setAnalysis(payload.data.analysis as CompetitorAnalysisPayload);
    } catch (requestError) {
      if (active) setError(requestError instanceof Error ? requestError.message : 'Competitor analysis failed.');
    } finally {
      active = false;
      window.clearInterval(poll);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startedFor.current === competitor.id) return;
    startedFor.current = competitor.id;
    void runAnalysis();
    return () => { /* request cancellation is handled by the server timeout */ };
  }, [competitor.id]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm md:p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 18 }}
        className="relative my-8 w-full max-w-5xl rounded-2xl border border-border bg-background shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between rounded-t-2xl border-b border-border bg-background/95 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-brand text-white"><Brain className="h-6 w-6" /></div>
            <div>
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand-500" /><h2 className="font-display text-xl font-bold">Competitor Intelligence</h2></div>
              <p className="text-sm text-muted-foreground">{competitor.name} · {competitor.industry}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 transition-colors hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-6 p-6">
          {loading && (
            <Card className="p-6">
              <div className="flex items-center gap-3"><div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" /><div><h3 className="font-semibold">Analyzing {competitor.name}</h3><p className="text-sm text-muted-foreground">The stages below reflect actual backend processing events.</p></div></div>
              <div className="mt-6 space-y-3">
                {[...stageMessages, 'Generating strategic recommendations…'].slice(0, 7).map((message, index) => (
                  <div key={`${message}-${index}`} className={cn('flex items-center gap-3 rounded-lg border p-3 text-sm', index < stageMessages.length ? 'border-success/30 bg-success/5 text-foreground' : 'border-border text-muted-foreground')}>
                    {index < stageMessages.length ? <CheckCircle2 className="h-4 w-4 text-success" /> : <div className="h-4 w-4 rounded-full border border-muted-foreground/40" />}
                    <span>{message}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {!loading && error && (
            <Card className="border-destructive/30 p-6">
              <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" /><div><h3 className="font-semibold">Analysis could not be completed</h3><p className="mt-1 text-sm text-muted-foreground">{error}</p><Button className="mt-4 gap-2" onClick={() => void runAnalysis(true)}><Sparkles className="h-4 w-4" /> Retry analysis</Button></div></div>
            </Card>
          )}

          {!loading && analysis && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge className="gradient-brand text-white">{analysis.model}</Badge>
                <Badge variant="secondary">{Math.round(analysis.confidence * 100)}% confidence</Badge>
                <Badge variant="outline">Source: {analysis.sourceLabel}</Badge>
                {analysis.observedThrough && <Badge variant="outline">Observed through {new Date(analysis.observedThrough).toLocaleDateString()}</Badge>}
              </div>

              <Card className="p-5">
                <div className="flex items-center gap-2"><Globe className="h-5 w-5 text-brand-500" /><h3 className="font-semibold">Competitor Overview</h3></div>
                <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-5">
                  <Metric label="Company" value={analysis.result.overview.company} />
                  <Metric label="Industry" value={analysis.result.overview.industry} />
                  <Metric label="Website" value={analysis.result.overview.website || 'Not available'} />
                  <Metric label="Analyzed ads" value={String(analysis.result.overview.analyzedAds)} />
                  <Metric label="Signals" value={String(analysis.result.overview.availableAdvertisingSignals.length)} />
                </div>
                <InsightList items={analysis.result.overview.availableAdvertisingSignals} className="mt-4" />
              </Card>

              <InsightSection title="Creative Intelligence" icon={Palette} groups={[
                ['Dominant creative styles', analysis.result.creativeIntelligence.dominantCreativeStyles],
                ['Visual patterns', analysis.result.creativeIntelligence.visualPatterns],
                ['Formats', analysis.result.creativeIntelligence.formats],
                ['Messaging patterns', analysis.result.creativeIntelligence.messagingPatterns],
                ['CTA patterns', analysis.result.creativeIntelligence.ctaPatterns],
              ]} />
              <InsightSection title="Ad Copy Intelligence" icon={Brain} groups={[
                ['Common hooks', analysis.result.adCopyIntelligence.commonHooks],
                ['Messaging themes', analysis.result.adCopyIntelligence.messagingThemes],
                ['Value propositions', analysis.result.adCopyIntelligence.valuePropositions],
                ['Emotional triggers', analysis.result.adCopyIntelligence.emotionalTriggers],
                ['CTA strategy', [analysis.result.adCopyIntelligence.ctaStrategy]],
              ]} />
              <InsightSection title="Competitive Positioning" icon={Target} groups={[
                ['Positioning themes', analysis.result.competitivePositioning.positioningThemes],
                ['Differentiators', analysis.result.competitivePositioning.differentiators],
                ['Strengths', analysis.result.competitivePositioning.strengths],
                ['Weaknesses', analysis.result.competitivePositioning.weaknesses],
                ['Potential gaps', analysis.result.competitivePositioning.potentialGaps],
              ]} />
              <InsightSection title="Trend Intelligence" icon={TrendingUp} groups={[
                ['Emerging creative patterns', analysis.result.trendIntelligence.emergingCreativePatterns],
                ['Messaging trends', analysis.result.trendIntelligence.messagingTrends],
                ['Repeated campaigns', analysis.result.trendIntelligence.repeatedCampaigns],
                ['Recent available signals', analysis.result.trendIntelligence.recentAvailableSignals],
              ]} />

              <Card className="p-5">
                <div className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-chart-3" /><h3 className="font-semibold">Strategic Opportunities</h3></div>
                <InsightList items={analysis.result.strategicOpportunities} numbered className="mt-4" />
              </Card>

              <Card className="border-border/60 p-5">
                <div className="flex items-center gap-2"><Eye className="h-5 w-5 text-muted-foreground" /><h3 className="font-semibold">Evidence and Limitations</h3></div>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">{analysis.limitations.map((item) => <li key={item}>• {item}</li>)}</ul>
              </Card>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><div className="truncate text-sm font-semibold" title={value}>{value}</div><div className="mt-1 text-xs text-muted-foreground">{label}</div></div>;
}

function InsightList({ items, numbered = false, className = '' }: { items: string[]; numbered?: boolean; className?: string }) {
  return <ul className={cn('space-y-2', className)}>{items.length ? items.map((item, index) => <li key={`${item}-${index}`} className="flex items-start gap-2 text-sm text-muted-foreground">{numbered ? <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full gradient-brand text-[10px] font-bold text-white">{index + 1}</span> : <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />}<span>{item}</span></li>) : <li className="text-sm text-muted-foreground">No supported signal was available in the indexed records.</li>}</ul>;
}

function InsightSection({ title, icon: Icon, groups }: { title: string; icon: React.ElementType; groups: Array<[string, string[]]> }) {
  return <Card className="p-5"><div className="flex items-center gap-2"><Icon className="h-5 w-5 text-brand-500" /><h3 className="font-semibold">{title}</h3></div><div className="mt-4 grid gap-4 md:grid-cols-2">{groups.map(([label, items]) => <div key={label} className="rounded-lg border border-border/60 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div><InsightList items={items} className="mt-2" /></div>)}</div></Card>;
}

const colorMap: Record<string, { text: string; bar: string }> = {
  brand: { text: 'text-brand-500', bar: 'gradient-brand' },
  'chart-2': { text: 'text-chart-2', bar: 'bg-chart-2' },
  'chart-3': { text: 'text-chart-3', bar: 'bg-chart-3' },
  'chart-4': { text: 'text-chart-4', bar: 'bg-chart-4' },
  'chart-5': { text: 'text-chart-5', bar: 'bg-chart-5' },
  warning: { text: 'text-warning', bar: 'bg-warning' },
  success: { text: 'text-success', bar: 'bg-success' },
};

function ScoreCard({ label, value, max, icon: Icon, color }: {
  label: string; value: number; max: number; icon: React.ElementType; color: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const c = colorMap[color] || colorMap.brand;
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <Icon className={cn('h-5 w-5', c.text)} />
        <span className="text-2xl font-bold tabular-nums">{value}</span>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn('h-full rounded-full', c.bar)}
        />
      </div>
    </Card>
  );
}

function AnalysisCard({ icon: Icon, title, children, color }: {
  icon: React.ElementType; title: string; children: React.ReactNode; color: string;
}) {
  const c = colorMap[color] || colorMap.brand;
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Icon className={cn('h-5 w-5', c.text)} />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{children}</p>
    </Card>
  );
}

function FrameworkCard({ title, items }: { title: string; items: { label: string; value: string }[] }) {
  return (
    <Card className="p-5">
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg border border-border/60 p-3">
            <div className="text-xs font-semibold text-brand-500">{item.label}</div>
            <p className="mt-1 text-sm text-muted-foreground">{item.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
