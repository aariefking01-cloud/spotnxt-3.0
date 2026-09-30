'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Search,
  ExternalLink,
  Eye,
  TrendingUp,
  Layers,
  Sparkles,
  ArrowRight,
  Target,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  Plus,
  Radio,
  X,
  Play,
  Bookmark,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { safeFetchJson } from '@/lib/client-fetch';
import type { CanonicalAd } from '@/lib/server/domain';
import { cn } from '@/lib/utils';

interface BrandSummary {
  id: string;
  name: string;
  logoUrl?: string;
  industry: string;
  website?: string;
  country?: string;
  totalAds: number;
  activeAds: number;
  inactiveAds: number;
  firstSeenAt: string;
  lastSeenAt: string;
  formats: Record<string, number>;
  topCtas: Record<string, number>;
  hooks: string[];
  offers: string[];
  sampleAds: CanonicalAd[];
  isMonitored: boolean;
}

export default function BrandsPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<BrandSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'ads' | 'hooks' | 'timeline'>('overview');
  const [trackingLoading, setTrackingLoading] = useState<string | null>(null);

  const loadBrands = async () => {
    setLoading(true);
    try {
      const res = await safeFetchJson<{ brands: BrandSummary[] }>('/api/intelligence/brands');
      if (res.data?.brands) {
        setBrands(res.data.brands);
      }
    } catch (err) {
      console.error('Failed to load brands:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBrands();
  }, []);

  const toggleTracking = async (brand: BrandSummary) => {
    setTrackingLoading(brand.id);
    try {
      if (brand.isMonitored) {
        await safeFetchJson(`/api/intelligence/competitors/manage?id=${brand.id}`, { method: 'DELETE' });
      } else {
        await safeFetchJson('/api/intelligence/competitors/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: brand.name,
            country: brand.country || 'US',
            industry: brand.industry,
            website: brand.website,
            searchTerms: [brand.name],
          }),
        });
      }
      await loadBrands();
    } catch (err) {
      console.error('Failed to toggle tracking:', err);
    } finally {
      setTrackingLoading(null);
    }
  };

  const filtered = brands.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.industry.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
            Brand Intelligence Profiles
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Explore deep competitor advertising audits, creative format distributions, top hooks, and active campaigns.
          </p>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <Card className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search brand profiles (Nike, Adidas, Apple, Samsung, HubSpot...)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 text-xs bg-background/60"
          />
        </div>
      </Card>

      {/* ── Brands Grid ── */}
      {loading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center space-y-3 py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-500" />
          <p className="text-sm text-muted-foreground">Aggregating brand intelligence profiles…</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center space-y-2">
          <Building2 className="h-8 w-8 mx-auto text-muted-foreground" />
          <h3 className="font-semibold text-sm">No brand profiles found</h3>
          <p className="text-xs text-muted-foreground">Try clearing your search keyword.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((brand) => (
            <Card
              key={brand.id}
              className="flex flex-col overflow-hidden border border-border/60 hover:border-brand-500/40 transition-all p-5 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted border border-border">
                    {brand.logoUrl ? (
                      <img src={brand.logoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-bold text-sm bg-brand-500/20 text-brand-300">
                        {brand.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-base text-foreground truncate">{brand.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{brand.industry}</p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={brand.isMonitored ? 'secondary' : 'outline'}
                  onClick={() => toggleTracking(brand)}
                  disabled={trackingLoading === brand.id}
                  className="h-7 text-[11px] shrink-0 gap-1 border-brand-500/30"
                >
                  {brand.isMonitored ? 'Tracking' : '+ Track'}
                </Button>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/30 p-2.5 text-center text-xs">
                <div>
                  <div className="text-[10px] text-muted-foreground">Observed</div>
                  <div className="font-bold text-sm text-foreground">{brand.totalAds}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Active</div>
                  <div className="font-bold text-sm text-emerald-400">{brand.activeAds}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Formats</div>
                  <div className="font-bold text-sm text-foreground">{Object.keys(brand.formats).length}</div>
                </div>
              </div>

              {/* Creative preview thumbs */}
              {brand.sampleAds && brand.sampleAds.length > 0 && (
                <div className="flex gap-2 overflow-hidden">
                  {brand.sampleAds.slice(0, 3).map((ad) => (
                    <div
                      key={ad.id}
                      className="relative h-16 w-1/3 rounded-lg overflow-hidden bg-black shrink-0 border border-border/40"
                    >
                      {ad.mediaUrl && <img src={ad.mediaUrl} alt="" className="h-full w-full object-cover" />}
                      <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 py-0.2 text-[9px] text-white">
                        {ad.creativeType}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Hooks tags */}
              {brand.hooks && brand.hooks.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-semibold text-muted-foreground">Top Hooks</div>
                  <div className="flex flex-wrap gap-1">
                    {brand.hooks.slice(0, 2).map((h, i) => (
                      <span key={i} className="rounded bg-brand-500/[0.08] text-brand-300 px-1.5 py-0.5 text-[10px] truncate max-w-[200px]">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions footer */}
              <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  Active {brand.country || 'US'}
                </span>
                <Button
                  size="sm"
                  onClick={() => setSelectedBrand(brand)}
                  className="h-7 text-xs gradient-brand text-white gap-1"
                >
                  View Profile <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Brand Detail Modal (Item #12 & #48) ── */}
      {selectedBrand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
            <button
              onClick={() => setSelectedBrand(null)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-accent"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5 pr-10">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-2xl bg-muted border border-border shadow-sm">
                  {selectedBrand.logoUrl ? (
                    <img src={selectedBrand.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-bold text-lg bg-brand-500/20 text-brand-300">
                      {selectedBrand.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-2xl font-bold text-foreground">{selectedBrand.name}</h2>
                    <Badge variant="outline" className="text-xs">
                      {selectedBrand.country || 'Global'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedBrand.industry} · {selectedBrand.website}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => router.push(`/dashboard/ad-library?search=${encodeURIComponent(selectedBrand.name)}`)}
                  className="gradient-brand text-white text-xs gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Explore All Ads
                </Button>
              </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="rounded-xl border border-border p-3">
                <div className="text-xs text-muted-foreground">Observed Creatives</div>
                <div className="font-bold text-xl mt-1">{selectedBrand.totalAds}</div>
              </div>
              <div className="rounded-xl border border-border p-3">
                <div className="text-xs text-muted-foreground">Active Campaigns</div>
                <div className="font-bold text-xl mt-1 text-emerald-400">{selectedBrand.activeAds}</div>
              </div>
              <div className="rounded-xl border border-border p-3">
                <div className="text-xs text-muted-foreground">Top Format</div>
                <div className="font-bold text-xl mt-1 text-brand-400">
                  {Object.entries(selectedBrand.formats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Video'}
                </div>
              </div>
              <div className="rounded-xl border border-border p-3">
                <div className="text-xs text-muted-foreground">Primary CTA</div>
                <div className="font-bold text-xl mt-1 truncate">
                  {Object.entries(selectedBrand.topCtas).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Shop Now'}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border gap-4 text-xs font-semibold">
              {[
                { id: 'overview', label: 'Overview & Format Mix' },
                { id: 'hooks', label: 'Hooks & Offers' },
                { id: 'ads', label: `Sample Creatives (${selectedBrand.sampleAds?.length || 0})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    'pb-2 border-b-2 transition-colors',
                    activeTab === tab.id
                      ? 'border-brand-500 text-brand-400 font-bold'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-4 text-xs">
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <div className="font-semibold text-sm">Creative Format Allocation</div>
                  <div className="space-y-2">
                    {Object.entries(selectedBrand.formats).map(([format, count]) => {
                      const pct = Math.round((count / selectedBrand.totalAds) * 100);
                      return (
                        <div key={format} className="space-y-1">
                          <div className="flex justify-between">
                            <span>{format}</span>
                            <span className="font-semibold">{count} ads ({pct}%)</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div className="h-full gradient-brand rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-border p-4 space-y-3">
                  <div className="font-semibold text-sm">Call-to-Action (CTA) Distribution</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedBrand.topCtas).map(([cta, count]) => (
                      <span key={cta} className="rounded-lg bg-accent/60 px-3 py-1 font-medium">
                        &quot;{cta}&quot; — {count} ads
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Hooks & Offers */}
            {activeTab === 'hooks' && (
              <div className="space-y-4 text-xs">
                <div className="rounded-xl border border-border p-4 space-y-2">
                  <div className="font-semibold text-sm text-brand-400">Observed Copywriting Hooks</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {selectedBrand.hooks.map((h, i) => (
                      <div key={i} className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                        🎯 {h}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border p-4 space-y-2">
                  <div className="font-semibold text-sm text-amber-400">Campaign Offers & Incentives</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {selectedBrand.offers.map((o, i) => (
                      <div key={i} className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-2.5 text-amber-300">
                        🎁 {o}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Ads */}
            {activeTab === 'ads' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {selectedBrand.sampleAds?.map((ad) => (
                  <div key={ad.id} className="rounded-xl border border-border overflow-hidden bg-card text-xs">
                    <div className="relative aspect-video bg-black">
                      {ad.mediaUrl && <img src={ad.mediaUrl} alt="" className="h-full w-full object-cover" />}
                      <Badge className="absolute top-2 left-2 bg-black/70 text-[10px]">{ad.creativeType}</Badge>
                    </div>
                    <div className="p-3 space-y-1">
                      <div className="font-semibold line-clamp-1">{ad.headline}</div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{ad.primaryText}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
