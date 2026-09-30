import { CanonicalAd, AdObservation, ProviderId, MarketCode, nowIso } from './domain';
import { getBenchmarkDataset } from './demo-dataset';
import { getState, upsertAds, listAds, getAd as getStoreAd } from './store';
import { executeMetaSync, getMetaConfig, validateMetaConnection, getCachedTokenStatus } from './meta-sync';
import { metaAdsCollectorService } from './meta-ads-collector';

export interface AdSearchQuery {
  query?: string;
  advertiserId?: string;
  platform?: string;
  country?: string;
  status?: string;
  creativeType?: string;
  source?: string;
  dataStatus?: 'ALL' | 'live' | 'historical' | 'demo';
  hook?: string;
  offer?: string;
  minDurationDays?: number;
  sort?: 'newest' | 'oldest' | 'duration' | 'advertiser' | 'relevance' | 'longest_running';
  page?: number;
  pageSize?: number;
  accessToken?: string;
  liveSync?: boolean;
}

export interface AdSearchResult {
  ads: CanonicalAd[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  provider: string;
  sourceType: 'meta' | 'external' | 'demo';
  sourceLabel: string;
  isConfigured: boolean;
  liveRecordsReturned?: number;
  diagnostic?: {
    status: string;
    message: string;
    actionRequired?: string;
    tokenSource: 'environment' | 'user-supplied' | 'none';
  };
}

export interface ProviderCapabilities {
  supportsLiveSearch: boolean;
  supportsHistoricalLookback: boolean;
  supportedPlatforms: string[];
  supportedCountries: string[];
  supportedCreativeTypes: string[];
  maxPageSize: number;
  rateLimitNote: string;
}

export interface ProviderHealth {
  id: string;
  name: string;
  category: 'inventory' | 'business' | 'workspace';
  connectionStatus: 'enabled' | 'configured' | 'not_configured' | 'unverified' | 'error';
  credentialsConfigured: boolean;
  permissions: string;
  officialCapabilities: string[];
  supportedMarkets: string[];
  lastCheckedAt: string;
  lastSyncAt?: string;
  recordsSynced: number;
  error?: string;
  actionRequired?: string;
  note: string;
}

export interface AdDataProvider {
  readonly id: string;
  readonly name: string;
  readonly sourceType: 'meta' | 'external' | 'demo';
  searchAds(query: AdSearchQuery): Promise<AdSearchResult>;
  getAd(adId: string): Promise<CanonicalAd | undefined>;
  getBrandAds(brandIdOrName: string, query?: Partial<AdSearchQuery>): Promise<CanonicalAd[]>;
  getHistoricalAds(adId: string): Promise<AdObservation[]>;
  getProviderStatus(): Promise<ProviderHealth>;
  getCapabilities(): ProviderCapabilities;
}

/**
 * DemoAdProvider
 * Serves rich, real-world benchmark advertising intelligence for top brands
 * (Nike, Adidas, Apple, Samsung, Coca-Cola, HubSpot, Shopify, Glossier, Gymshark, etc.)
 * Strictly labeled data_status: 'demo', source: 'demo', provider: 'Demo Provider'.
 */
export class DemoAdProvider implements AdDataProvider {
  readonly id = 'demo-provider';
  readonly name = 'Demo Provider';
  readonly sourceType = 'demo' as const;

  private getDataset(): CanonicalAd[] {
    return getBenchmarkDataset();
  }

  async searchAds(query: AdSearchQuery): Promise<AdSearchResult> {
    let all = this.getDataset();
    all = filterAds(all, query);
    const sorted = sortAds(all, query.sort || 'newest', query.query);
    const paginated = paginateAds(sorted, query.page || 1, query.pageSize || 24);

    return {
      ads: paginated.items,
      pagination: paginated.pagination,
      provider: this.name,
      sourceType: this.sourceType,
      sourceLabel: 'Demo Provider (High-Fidelity Benchmark Data)',
      isConfigured: true,
      diagnostic: {
        status: 'active',
        message: 'Serving high-fidelity competitive advertising benchmark dataset.',
        tokenSource: 'none',
      },
    };
  }

  async getAd(adId: string): Promise<CanonicalAd | undefined> {
    const list = this.getDataset();
    return list.find((a) => a.id === adId || a.externalId === adId);
  }

  async getBrandAds(brandIdOrName: string): Promise<CanonicalAd[]> {
    const lower = brandIdOrName.toLowerCase();
    return this.getDataset().filter(
      (a) =>
        a.advertiserId.toLowerCase() === lower ||
        a.advertiserName.toLowerCase().includes(lower) ||
        lower.includes(a.advertiserName.toLowerCase())
    );
  }

  async getHistoricalAds(adId: string): Promise<AdObservation[]> {
    const ad = await this.getAd(adId);
    return ad?.observations || [];
  }

  async getProviderStatus(): Promise<ProviderHealth> {
    const dataset = this.getDataset();
    return {
      id: this.id,
      name: this.name,
      category: 'inventory',
      connectionStatus: 'enabled',
      credentialsConfigured: true,
      permissions: 'High-fidelity benchmark dataset covering global brands (Nike, Adidas, Apple, etc.) for evaluation.',
      officialCapabilities: [
        'Deterministic, rich real-world competitor creative assets.',
        'Hook, angle, offer, and emotional trigger metadata.',
        'Multi-format support (Video, Carousel, Image, Reel, Story).',
      ],
      supportedMarkets: ['US', 'IN', 'GB', 'CA', 'AU', 'GLOBAL'],
      lastCheckedAt: nowIso(),
      recordsSynced: dataset.length,
      note: 'Demo mode active with real brand benchmarks.',
    };
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsLiveSearch: false,
      supportsHistoricalLookback: true,
      supportedPlatforms: ['Meta', 'Instagram', 'Facebook'],
      supportedCountries: ['US', 'IN', 'GB', 'CA', 'AU'],
      supportedCreativeTypes: ['Video', 'Image', 'Carousel', 'Story', 'Reel'],
      maxPageSize: 100,
      rateLimitNote: 'No rate limits on internal benchmark dataset.',
    };
  }
}

/**
 * MetaAdLibraryProvider
 * Connects directly to the official Meta Graph API v21.0/v22.0 ads_archive endpoint.
 * Normalizes live records, stores them, and labels them data_status: 'live', source: 'meta', provider: 'Meta Ad Library'.
 */
export class MetaAdLibraryProvider implements AdDataProvider {
  readonly id = 'meta-ad-library';
  readonly name = 'Meta Ad Library';
  readonly sourceType = 'meta' as const;

  async searchAds(query: AdSearchQuery): Promise<AdSearchResult> {
    const config = getMetaConfig();
    const effectiveToken = query.accessToken?.trim() || config.accessToken;
    const isConfigured = Boolean(effectiveToken);

    let syncErrorMsg: string | undefined;
    let actionRequired: string | undefined;
    let diagnosticStatus = isConfigured ? 'connected' : 'not_configured';

    const cachedTokenStatus = effectiveToken ? getCachedTokenStatus(effectiveToken) : null;
    if (cachedTokenStatus) {
      if (cachedTokenStatus.status === 'permission_denied') {
        diagnosticStatus = 'unverified';
        syncErrorMsg = 'Meta Ad Library requires identity verification at facebook.com/ads/library/api.';
        actionRequired = cachedTokenStatus.actionRequired || 'Complete identity verification at facebook.com/ads/library/api';
      } else if (cachedTokenStatus.status === 'invalid_token') {
        diagnosticStatus = 'token_expired';
        syncErrorMsg = 'Meta Access Token is expired or invalid.';
        actionRequired = cachedTokenStatus.actionRequired || 'Generate a fresh User Access Token at https://developers.facebook.com/tools/explorer/';
      }
    }

    // Attempt live synchronization if query explicitly asked for liveSync AND query is at least 2 chars
    if (query.liveSync && query.query?.trim() && query.query.trim().length >= 2) {
      if (isConfigured && (!cachedTokenStatus || cachedTokenStatus.status === 'connected')) {
        try {
          await executeMetaSync({
            accessToken: effectiveToken,
            query: query.query.trim(),
            country: query.country && query.country !== 'ALL' ? query.country : 'US',
            activeStatus: query.status === 'ACTIVE' ? 'ACTIVE' : query.status === 'INACTIVE' ? 'INACTIVE' : 'ALL',
            maxPages: 2,
            limitPerPage: Math.min(25, query.pageSize || 24),
          });
        } catch (err) {
          syncErrorMsg = err instanceof Error ? err.message : 'Meta API communication error.';
          if (err && typeof err === 'object' && 'details' in err) {
            const details = (err as { details?: { actionRequired?: string; isVerificationRequired?: boolean } }).details;
            if (details?.actionRequired) actionRequired = details.actionRequired;
            if (details?.isVerificationRequired) diagnosticStatus = 'unverified';
          }
        }
      } else {
        // Run MetaAdsCollector automated public collection
        try {
          const collectRes = await metaAdsCollectorService.collect({
            query: query.query.trim(),
            country: query.country && query.country !== 'ALL' ? query.country : 'US',
            activeStatus: query.status === 'ACTIVE' ? 'ACTIVE' : query.status === 'INACTIVE' ? 'INACTIVE' : 'ALL',
            maxAds: Math.min(25, query.pageSize || 24),
            analyze: true,
          });
          if (collectRes.status === 'LIVE') {
            syncErrorMsg = '';
            diagnosticStatus = 'connected';
          } else if (collectRes.status === 'RATE_LIMITED') {
            syncErrorMsg = 'Meta Ad Library rate limit encountered.';
            actionRequired = 'Backing off automatically. Please retry shortly.';
          } else if (collectRes.status === 'UNAVAILABLE' || collectRes.status === 'ERROR') {
            syncErrorMsg = collectRes.error || 'Public Meta Ad Library collection endpoint unavailable.';
            actionRequired = collectRes.diagnostic.actionRequired;
          }
        } catch (err) {
          syncErrorMsg = err instanceof Error ? err.message : 'Collector execution failed.';
        }
      }
    }

    // Retrieve live stored ads matching this search
    const state = await getState();
    let liveAds = state.ads.filter(
      (a) => a.source === 'meta' || a.data_status === 'live' || a.data_status === 'verified_live'
    );
    liveAds = filterAds(liveAds, query);
    const sorted = sortAds(liveAds, query.sort || 'newest', query.query);
    const paginated = paginateAds(sorted, query.page || 1, query.pageSize || 24);

    return {
      ads: paginated.items,
      pagination: paginated.pagination,
      provider: this.name,
      sourceType: this.sourceType,
      sourceLabel: 'Meta Ad Library (Public Collection & Official API)',
      isConfigured: isConfigured || Boolean(state.ads.some((a) => a.source === 'meta' || a.data_status === 'verified_live')),
      liveRecordsReturned: paginated.items.length,
      diagnostic: {
        status: syncErrorMsg ? (diagnosticStatus === 'connected' ? 'sync_error' : diagnosticStatus) : diagnosticStatus,
        message: syncErrorMsg || (isConfigured ? 'Connected to Meta Graph API.' : 'Meta Ad Library public collection engine ready.'),
        actionRequired: actionRequired || (!isConfigured ? 'Run collection or configure Meta User Access Token.' : undefined),
        tokenSource: query.accessToken?.trim() ? 'user-supplied' : config.accessToken ? 'environment' : 'none',
      },
    };
  }

  async getAd(adId: string): Promise<CanonicalAd | undefined> {
    const state = await getState();
    return state.ads.find(
      (a) =>
        (a.source === 'meta' || a.data_status === 'live' || a.data_status === 'verified_live') &&
        (a.id === adId || a.externalId === adId)
    );
  }

  async getBrandAds(brandIdOrName: string): Promise<CanonicalAd[]> {
    const state = await getState();
    const lower = brandIdOrName.toLowerCase();
    return state.ads.filter(
      (a) =>
        (a.source === 'meta' || a.data_status === 'live' || a.data_status === 'verified_live') &&
        (a.advertiserId.toLowerCase() === lower || a.advertiserName.toLowerCase().includes(lower) || lower.includes(a.advertiserName.toLowerCase()))
    );
  }

  async getHistoricalAds(adId: string): Promise<AdObservation[]> {
    const ad = await this.getAd(adId);
    return ad?.observations || [];
  }

  async getProviderStatus(): Promise<ProviderHealth> {
    const config = getMetaConfig();
    const state = await getState();
    const metaAds = state.ads.filter((a) => a.source === 'meta' || a.data_status === 'live');

    let connectionStatus: ProviderHealth['connectionStatus'] = 'not_configured';
    let error: string | undefined;
    let actionRequired: string | undefined;

    if (config.isConfigured) {
      try {
        const val = await validateMetaConnection(config.accessToken);
        if (val.valid) {
          connectionStatus = 'configured';
        } else {
          connectionStatus = val.status === 'invalid_token' ? 'error' : 'unverified';
          error = val.message;
          actionRequired = val.actionRequired;
        }
      } catch (err) {
        connectionStatus = 'error';
        error = err instanceof Error ? err.message : 'Failed to reach Meta API';
      }
    }

    return {
      id: this.id,
      name: this.name,
      category: 'inventory',
      connectionStatus,
      credentialsConfigured: config.isConfigured,
      permissions: config.isConfigured ? 'Meta Access Token configured.' : 'Requires META_ACCESS_TOKEN or client user access token.',
      officialCapabilities: [
        'Official Meta Ad Library archive queries with cursor-based pagination.',
        'Real-time advertiser pages, creative copies, snapshot URLs, and delivery dates.',
      ],
      supportedMarkets: ['US', 'IN', 'GB', 'CA', 'AU', 'GLOBAL'],
      lastCheckedAt: nowIso(),
      recordsSynced: metaAds.length,
      error,
      actionRequired,
      note: config.isConfigured ? `Connected (${metaAds.length} live ads in database).` : 'Provide your Meta User Access Token to query live ads.',
    };
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsLiveSearch: true,
      supportsHistoricalLookback: true,
      supportedPlatforms: ['Meta', 'Instagram', 'Facebook', 'Audience Network', 'Messenger'],
      supportedCountries: ['US', 'IN', 'GB', 'CA', 'AU'],
      supportedCreativeTypes: ['Video', 'Image', 'Carousel', 'Story', 'Reel'],
      maxPageSize: 100,
      rateLimitNote: 'Meta Graph API standard rate limit: 200 calls/hour per app user.',
    };
  }
}

/**
 * ExternalAdProvider
 * Extensible provider for secondary 3P advertising intelligence APIs (e.g. Foreplay, Panoramata, BrandTotal).
 */
export class ExternalAdProvider implements AdDataProvider {
  readonly id = 'external-provider';
  readonly name = 'External Ad Intelligence';
  readonly sourceType = 'external' as const;

  async searchAds(query: AdSearchQuery): Promise<AdSearchResult> {
    const state = await getState();
    let externalAds = state.ads.filter((a) => a.source === 'external');
    externalAds = filterAds(externalAds, query);
    const sorted = sortAds(externalAds, query.sort || 'newest', query.query);
    const paginated = paginateAds(sorted, query.page || 1, query.pageSize || 24);

    return {
      ads: paginated.items,
      pagination: paginated.pagination,
      provider: this.name,
      sourceType: this.sourceType,
      sourceLabel: 'External Ad Intelligence Provider',
      isConfigured: false,
      diagnostic: {
        status: 'standby',
        message: 'Secondary external provider interface available for licensed partner APIs.',
        tokenSource: 'none',
      },
    };
  }

  async getAd(adId: string): Promise<CanonicalAd | undefined> {
    const state = await getState();
    return state.ads.find((a) => a.source === 'external' && (a.id === adId || a.externalId === adId));
  }

  async getBrandAds(brandIdOrName: string): Promise<CanonicalAd[]> {
    const state = await getState();
    const lower = brandIdOrName.toLowerCase();
    return state.ads.filter(
      (a) =>
        a.source === 'external' &&
        (a.advertiserId.toLowerCase() === lower || a.advertiserName.toLowerCase().includes(lower))
    );
  }

  async getHistoricalAds(adId: string): Promise<AdObservation[]> {
    const ad = await this.getAd(adId);
    return ad?.observations || [];
  }

  async getProviderStatus(): Promise<ProviderHealth> {
    return {
      id: this.id,
      name: this.name,
      category: 'inventory',
      connectionStatus: 'not_configured',
      credentialsConfigured: false,
      permissions: 'Ready for third-party commercial ad dataset integration.',
      officialCapabilities: ['Cross-platform creative ingestion and historical timeline storage.'],
      supportedMarkets: ['GLOBAL'],
      lastCheckedAt: nowIso(),
      recordsSynced: 0,
      note: 'Configure custom external provider in environment settings.',
    };
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsLiveSearch: true,
      supportsHistoricalLookback: true,
      supportedPlatforms: ['Meta', 'Instagram', 'TikTok', 'YouTube', 'LinkedIn'],
      supportedCountries: ['US', 'IN', 'GB', 'CA', 'AU'],
      supportedCreativeTypes: ['Video', 'Image', 'Carousel', 'Story', 'Reel'],
      maxPageSize: 100,
      rateLimitNote: 'Depends on external commercial partner license.',
    };
  }
}

/**
 * CompositeAdIntelligenceEngine
 * The Unified Ad Intelligence Engine.
 * Implements the Provider Abstraction:
 * Queries live providers first when credentials are available;
 * Automatically surfaces the rich benchmark dataset when live provider returns no matches or is unconfigured;
 * NEVER returns an empty library without clear diagnosis;
 * NEVER fakes live data; preserves full provenance labels (LIVE DATA vs DEMO DATA vs HISTORICAL DATA).
 */
export class CompositeAdIntelligenceEngine {
  private metaProvider = new MetaAdLibraryProvider();
  private demoProvider = new DemoAdProvider();
  private externalProvider = new ExternalAdProvider();

  async searchAds(query: AdSearchQuery): Promise<AdSearchResult> {
    const metaConfig = getMetaConfig();
    const effectiveToken = query.accessToken?.trim() || metaConfig.accessToken;
    const dataStatusFilter = query.dataStatus || 'ALL';

    // 1. If user explicitly requests DEMO data only:
    if (dataStatusFilter === 'demo') {
      return this.demoProvider.searchAds(query);
    }

    // 2. If user requested liveSync OR provided a Meta token OR server has Meta configured:
    let liveResult: AdSearchResult | undefined;
    if (effectiveToken || query.liveSync) {
      liveResult = await this.metaProvider.searchAds(query);
      if (liveResult.ads.length > 0 || dataStatusFilter === 'live') {
        return liveResult;
      }
    }

    // 3. Check local database for previously stored live ads or uploaded ads
    const state = await getState();
    let allStored = state.ads;

    // Filter by data_status if requested
    if (dataStatusFilter === 'live') {
      allStored = allStored.filter((a) => a.data_status === 'live' || a.data_status === 'verified_live' || a.source === 'meta');
    } else if (dataStatusFilter === 'historical') {
      allStored = allStored.filter((a) => a.data_status === 'historical');
    }

    const filteredStored = filterAds(allStored, query);

    // If we have matching ads in store, return them
    if (filteredStored.length > 0) {
      const sorted = sortAds(filteredStored, query.sort || 'newest', query.query);
      const paginated = paginateAds(sorted, query.page || 1, query.pageSize || 24);
      const hasLive = paginated.items.some((a) => a.data_status === 'live' || a.data_status === 'verified_live' || a.source === 'meta');
      const hasDemo = paginated.items.some((a) => a.data_status === 'demo');

      return {
        ads: paginated.items,
        pagination: paginated.pagination,
        provider: hasLive && !hasDemo ? 'Meta Ad Library' : !hasLive && hasDemo ? 'Demo Provider' : 'SpotNxt Unified Ad Store',
        sourceType: hasLive ? 'meta' : 'demo',
        sourceLabel: hasLive && !hasDemo ? 'Meta Ad Library (Public Collection & Live Store)' : hasDemo && !hasLive ? 'Demo Provider (Benchmark Data)' : 'Live + Benchmark Data',
        isConfigured: Boolean(effectiveToken || hasLive),
        liveRecordsReturned: paginated.items.filter((a) => a.data_status === 'live' || a.data_status === 'verified_live' || a.source === 'meta').length,
        diagnostic: liveResult?.diagnostic,
      };
    }

    // 4. Fallback: If no live ads matched, query Demo Provider so the library is NEVER EMPTY
    const demoResult = await this.demoProvider.searchAds(query);

    return {
      ads: demoResult.ads,
      pagination: demoResult.pagination,
      provider: demoResult.provider,
      sourceType: 'demo',
      sourceLabel: effectiveToken
        ? 'Live search returned 0 records; displaying verified benchmark dataset'
        : 'Demo Provider (Benchmark Data — connect Meta for live queries)',
      isConfigured: Boolean(effectiveToken),
      liveRecordsReturned: 0,
      diagnostic: {
        status: effectiveToken ? 'no_live_matches' : 'unconfigured_fallback',
        message: effectiveToken
          ? `Meta Ad Library returned 0 live ads for "${query.query || ''}". Displaying verified benchmark intelligence.`
          : 'Meta Access Token not provided. Displaying verified benchmark intelligence.',
        actionRequired: liveResult?.diagnostic?.actionRequired || (!effectiveToken ? 'Input your Meta User Access Token to stream live ad inventory.' : undefined),
        tokenSource: query.accessToken?.trim() ? 'user-supplied' : metaConfig.accessToken ? 'environment' : 'none',
      },
    };
  }

  async getAd(adId: string): Promise<CanonicalAd | undefined> {
    const fromStore = await getStoreAd(adId);
    if (fromStore) return fromStore;
    return this.demoProvider.getAd(adId);
  }

  async getBrandAds(brandIdOrName: string, query?: Partial<AdSearchQuery>): Promise<CanonicalAd[]> {
    const state = await getState();
    const lower = brandIdOrName.toLowerCase();
    const matched = state.ads.filter(
      (a) =>
        a.advertiserId.toLowerCase() === lower ||
        a.advertiserName.toLowerCase().includes(lower) ||
        lower.includes(a.advertiserName.toLowerCase())
    );
    if (matched.length > 0) {
      return query ? filterAds(matched, query) : matched;
    }
    return this.demoProvider.getBrandAds(brandIdOrName);
  }

  async getHistoricalAds(adId: string): Promise<AdObservation[]> {
    const fromStore = await getStoreAd(adId);
    if (fromStore?.observations && fromStore.observations.length > 0) {
      return fromStore.observations;
    }
    return this.demoProvider.getHistoricalAds(adId);
  }

  async getAllProvidersStatus(): Promise<ProviderHealth[]> {
    const [metaHealth, demoHealth, externalHealth] = await Promise.all([
      this.metaProvider.getProviderStatus(),
      this.demoProvider.getProviderStatus(),
      this.externalProvider.getProviderStatus(),
    ]);
    return [metaHealth, demoHealth, externalHealth];
  }
}

export const adIntelligenceEngine = new CompositeAdIntelligenceEngine();

// Helper filtering function
function filterAds(ads: CanonicalAd[], query: AdSearchQuery): CanonicalAd[] {
  let results = [...ads];

  const q = query.query?.trim().toLowerCase();
  if (q) {
    results = results.filter(
      (ad) =>
        ad.headline.toLowerCase().includes(q) ||
        ad.primaryText.toLowerCase().includes(q) ||
        ad.advertiserName.toLowerCase().includes(q) ||
        (ad.pageName && ad.pageName.toLowerCase().includes(q)) ||
        (ad.hook && ad.hook.toLowerCase().includes(q)) ||
        (ad.angle && ad.angle.toLowerCase().includes(q)) ||
        (ad.offer && ad.offer.toLowerCase().includes(q)) ||
        (ad.industry && ad.industry.toLowerCase().includes(q)) ||
        ad.externalId.toLowerCase().includes(q)
    );
  }

  if (query.advertiserId && query.advertiserId !== 'ALL') {
    const adv = query.advertiserId.toLowerCase();
    results = results.filter(
      (ad) =>
        ad.advertiserId.toLowerCase() === adv ||
        ad.advertiserName.toLowerCase() === adv ||
        (ad.pageId && ad.pageId === query.advertiserId)
    );
  }

  if (query.platform && query.platform !== 'ALL') {
    results = results.filter((ad) => ad.platform.toLowerCase() === query.platform?.toLowerCase());
  }

  if (query.creativeType && query.creativeType !== 'ALL') {
    results = results.filter((ad) => ad.creativeType.toLowerCase() === query.creativeType?.toLowerCase());
  }

  if (query.status && query.status !== 'ALL') {
    results = results.filter((ad) => ad.status.toLowerCase() === query.status?.toLowerCase());
  }

  if (query.country && query.country !== 'ALL') {
    results = results.filter((ad) => ad.country?.toUpperCase() === query.country?.toUpperCase());
  }

  if (query.source && query.source !== 'ALL') {
    results = results.filter((ad) => ad.source === query.source);
  }

  if (query.dataStatus && query.dataStatus !== 'ALL') {
    results = results.filter((ad) => ad.data_status === query.dataStatus);
  }

  if (query.minDurationDays && query.minDurationDays > 0) {
    results = results.filter((ad) => (ad.durationDays || 0) >= (query.minDurationDays || 0));
  }

  if (query.hook) {
    const h = query.hook.toLowerCase();
    results = results.filter((ad) => ad.hook?.toLowerCase().includes(h) || ad.description?.toLowerCase().includes(h));
  }

  if (query.offer) {
    const o = query.offer.toLowerCase();
    results = results.filter((ad) => ad.offer?.toLowerCase().includes(o));
  }

  return results;
}

// Helper sorting function
function sortAds(ads: CanonicalAd[], sort: string, searchKeyword?: string): CanonicalAd[] {
  const list = [...ads];
  const q = searchKeyword?.toLowerCase();

  return list.sort((a, b) => {
    if (sort === 'relevance' && q) {
      const aHead = a.headline.toLowerCase().includes(q) ? 2 : 0;
      const aAdv = a.advertiserName.toLowerCase().includes(q) ? 3 : 0;
      const bHead = b.headline.toLowerCase().includes(q) ? 2 : 0;
      const bAdv = b.advertiserName.toLowerCase().includes(q) ? 3 : 0;
      return bHead + bAdv - (aHead + aAdv);
    }
    if (sort === 'oldest') {
      return a.firstSeenAt.localeCompare(b.firstSeenAt);
    }
    if (sort === 'duration' || sort === 'longest_running') {
      const durA = (a.durationDays || 0) || (new Date(a.lastSeenAt).getTime() - new Date(a.firstSeenAt).getTime());
      const durB = (b.durationDays || 0) || (new Date(b.lastSeenAt).getTime() - new Date(b.firstSeenAt).getTime());
      return durB - durA;
    }
    if (sort === 'advertiser') {
      return a.advertiserName.localeCompare(b.advertiserName);
    }
    // Default newest
    return b.lastSeenAt.localeCompare(a.lastSeenAt);
  });
}

// Helper pagination function
function paginateAds(ads: CanonicalAd[], page: number, pageSize: number) {
  const p = Math.max(1, page);
  const size = Math.min(100, Math.max(1, pageSize));
  const total = ads.length;
  const totalPages = Math.ceil(total / size) || 1;
  const start = (p - 1) * size;
  const items = ads.slice(start, start + size);

  return {
    items,
    pagination: {
      page: p,
      pageSize: size,
      total,
      totalPages,
    },
  };
}
