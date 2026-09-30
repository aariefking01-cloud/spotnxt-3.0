import { adCreatives } from '@/lib/data';
import { AppError, CanonicalAd, MarketCode, ProviderId, nowIso } from './domain';
import { buildAdFromInput, getAd, listAds, upsertAd, getState, getLatestSyncRun } from './store';
import { executeMetaSync, getMetaConfig, getCachedTokenStatus } from './meta-sync';

export type ProviderConnectionStatus = 'enabled' | 'configured' | 'not_configured' | 'unverified' | 'error';

export interface ProviderQuery {
  query?: string;
  market?: MarketCode;
  country?: string;
}

export interface ProviderHealth {
  id: ProviderId;
  name: string;
  category: 'inventory' | 'business' | 'workspace';
  connectionStatus: ProviderConnectionStatus;
  credentialsConfigured: boolean;
  permissions: string;
  officialCapabilities: string[];
  supportedMarkets: string[];
  lastCheckedAt: string;
  lastSyncAt?: string;
  recordsSynced: number;
  error?: string;
  note: string;
}

export interface AdDataProvider {
  readonly name: string;
  readonly providerId: ProviderId;
  readonly mode: 'demo' | 'external' | 'upload';
  list(query?: ProviderQuery): Promise<CanonicalAd[]>;
  get(adId: string): Promise<CanonicalAd | undefined>;
}

class DemoAdProvider implements AdDataProvider {
  readonly name = 'DemoAdProvider';
  readonly providerId = 'demo' as const;
  readonly mode = 'demo' as const;

  async list(query?: ProviderQuery): Promise<CanonicalAd[]> {
    const ads = (await listAds()).filter((ad) => ad.source === 'demo');
    return filterByMarket(ads, query);
  }

  async get(adId: string): Promise<CanonicalAd | undefined> {
    const ad = await getAd(adId);
    return ad?.source === 'demo' ? ad : undefined;
  }
}

class UploadedAdProvider implements AdDataProvider {
  readonly name = 'UploadedAdProvider';
  readonly providerId = 'uploaded-workspace' as const;
  readonly mode = 'upload' as const;

  async list(query?: ProviderQuery): Promise<CanonicalAd[]> {
    const ads = (await listAds()).filter((ad) => ad.source === 'upload');
    return filterByMarket(ads, query);
  }

  async get(adId: string): Promise<CanonicalAd | undefined> {
    const ad = await getAd(adId);
    return ad?.source === 'upload' ? ad : undefined;
  }
}

class MetaAdLibraryProvider implements AdDataProvider {
  readonly name = 'Meta Ad Library';
  readonly providerId = 'meta-ad-library' as const;
  readonly mode = 'external' as const;

  async list(query?: ProviderQuery): Promise<CanonicalAd[]> {
    const config = getMetaConfig();
    if (!config.isConfigured || !config.accessToken) {
      throw new AppError('PROVIDER_NOT_CONFIGURED', 'Connect Meta Ad Library to enable live competitor inventory. Configure META_ACCESS_TOKEN in settings.', 503, { provider: this.providerId });
    }

    const state = await getState();
    let metaAds = state.ads.filter((ad) => ad.source === 'meta' || ad.platform === 'Meta');

    // If query term is requested and no ads match locally, run on-demand live sync safely
    const searchTerms = query?.query?.trim();
    if (searchTerms && searchTerms.length >= 2 && metaAds.length === 0) {
      const cachedTokenStatus = config.accessToken ? getCachedTokenStatus(config.accessToken) : null;
      if (!cachedTokenStatus || cachedTokenStatus.status === 'connected') {
        try {
          await executeMetaSync({ query: searchTerms, country: query?.country });
          const updatedState = await getState();
          metaAds = updatedState.ads.filter((ad) => ad.source === 'meta' || ad.platform === 'Meta');
        } catch {
          // Gracefully continue with available records
        }
      }
    }

    return filterByMarket(metaAds, query);
  }

  async get(adId: string): Promise<CanonicalAd | undefined> {
    const ad = await getAd(adId);
    return ad && (ad.source === 'meta' || ad.platform === 'Meta') ? ad : undefined;
  }
}

export const demoAdProvider = new DemoAdProvider();
export const uploadedAdProvider = new UploadedAdProvider();
export const metaAdLibraryProvider = new MetaAdLibraryProvider();

function filterByMarket(ads: CanonicalAd[], query?: ProviderQuery) {
  if (!query?.query && !query?.market && !query?.country) return ads;
  return ads.filter((ad) => {
    const queryMatch = !query?.query ||
      ad.headline.toLowerCase().includes(query.query.toLowerCase()) ||
      ad.primaryText.toLowerCase().includes(query.query.toLowerCase()) ||
      ad.advertiserName.toLowerCase().includes(query.query.toLowerCase()) ||
      ad.externalId === query.query;
    const marketMatch = !query?.market || ad.market === query.market || (query.market === 'GLOBAL' && !ad.market);
    const countryMatch = !query?.country || ad.country?.toUpperCase() === query.country.toUpperCase();
    return queryMatch && marketMatch && countryMatch;
  });
}

function health(input: Omit<ProviderHealth, 'lastCheckedAt'>): ProviderHealth {
  return { ...input, lastCheckedAt: nowIso() };
}

export async function getProviderStatusAsync() {
  const state = await getState();
  const demoEnabled = state.demoModeOverride !== undefined
    ? state.demoModeOverride
    : (process.env.SPOTNXT_DEMO_MODE !== 'false');
  const metaConfigured = Boolean(process.env.META_ACCESS_TOKEN?.trim());
  const metaAds = state.ads.filter((ad) => ad.source === 'meta' || ad.platform === 'Meta');
  const latestSync = await getLatestSyncRun();

  const providers: ProviderHealth[] = [
    health({
      id: 'meta-ad-library',
      name: 'Meta Ad Library',
      category: 'inventory',
      connectionStatus: metaConfigured ? (latestSync?.status === 'error' ? 'error' : 'configured') : 'not_configured',
      credentialsConfigured: metaConfigured,
      permissions: metaConfigured ? 'Authorized access token configured. Connected to Meta Graph API Archive.' : 'Requires META_ACCESS_TOKEN; use within Meta developer policies.',
      officialCapabilities: ['Official Meta Ad Library Archive queries with cursor-based pagination.', 'Real advertiser pages, creative copies, snapshot URLs, and delivery dates.'],
      supportedMarkets: ['US', 'IN', 'GB', 'CA', 'AU', 'GLOBAL'],
      lastSyncAt: latestSync?.completedAt,
      recordsSynced: metaAds.length,
      error: latestSync?.error,
      note: metaConfigured ? `Connected (${metaAds.length} live ads in database).` : 'Connect Meta Ad Library to enable live competitor inventory.',
    }),
    health({
      id: 'uploaded-workspace',
      name: 'Uploaded workspace data',
      category: 'workspace',
      connectionStatus: 'enabled',
      credentialsConfigured: true,
      permissions: 'User-uploaded files are processed within this workspace.',
      officialCapabilities: ['Upload and analyze creative files supplied by the workspace user.'],
      supportedMarkets: ['Any market supplied by the user'],
      recordsSynced: state.ads.filter((a) => a.source === 'upload').length,
      note: 'Available for creative analysis; it is not a competitor-ad source.',
    }),
    health({
      id: 'demo',
      name: 'Demo inventory',
      category: 'inventory',
      connectionStatus: demoEnabled ? 'enabled' : 'not_configured',
      credentialsConfigured: demoEnabled,
      permissions: 'Local sample data only; never presented as live market data.',
      officialCapabilities: ['Deterministic local sample inventory for development and demonstrations.'],
      supportedMarkets: ['GLOBAL'],
      recordsSynced: demoEnabled ? state.ads.filter((a) => a.source === 'demo').length : 0,
      note: demoEnabled ? 'Demo mode is enabled for interactive hackathon demonstration.' : 'Disabled. Switch mode to enable labelled local sample data.',
    }),
  ];

  const meta = providers.find((item) => item.id === 'meta-ad-library');
  const liveMode = !demoEnabled;
  const liveDataReady = Boolean(meta?.connectionStatus === 'configured' || metaAds.length > 0 || demoEnabled);

  return {
    demoEnabled,
    liveMode,
    liveDataReady,
    checkedAt: nowIso(),
    totalLiveAds: metaAds.length,
    lastSyncRun: latestSync,
    providers,
    note: liveMode && !liveDataReady
      ? 'Live data source not connected. Connect Meta Ad Library or trigger a live sync.'
      : demoEnabled
        ? 'Demo mode is active with verified sample intelligence.'
        : `Live Meta Ad Library provider active (${metaAds.length} live ads stored).`,
  };
}

export function providerStatus() {
  const demoEnabled = process.env.SPOTNXT_DEMO_MODE === 'true';
  const metaConfigured = Boolean(process.env.META_ACCESS_TOKEN?.trim());
  const liveDataReady = metaConfigured;

  return {
    demoEnabled,
    liveMode: !demoEnabled,
    liveDataReady,
    checkedAt: nowIso(),
    providers: [
      health({
        id: 'meta-ad-library',
        name: 'Meta Ad Library',
        category: 'inventory',
        connectionStatus: metaConfigured ? 'configured' : 'not_configured',
        credentialsConfigured: metaConfigured,
        permissions: metaConfigured ? 'Authorized access token configured.' : 'Requires META_ACCESS_TOKEN.',
        officialCapabilities: ['Live Meta Ad Library Archive queries.'],
        supportedMarkets: ['US', 'IN', 'GLOBAL'],
        recordsSynced: 0,
        note: metaConfigured ? 'Ready for live synchronization.' : 'Configure META_ACCESS_TOKEN in settings.',
      }),
    ],
    note: !metaConfigured && !demoEnabled
      ? 'Live data source not connected. Configure META_ACCESS_TOKEN.'
      : 'Provider configured.',
  };
}

export function getAdProvider(mode?: string): AdDataProvider {
  if (mode === 'upload') return uploadedAdProvider;
  if (mode === 'demo') {
    if (!isDemoModeEnabled()) {
      throw new AppError('DEMO_MODE_DISABLED', 'Demo mode is disabled. Set SPOTNXT_DEMO_MODE=true only when you explicitly want labelled sample data.', 503);
    }
    return demoAdProvider;
  }
  if (isDemoModeEnabled()) return demoAdProvider;
  if (providerStatus().liveDataReady) return metaAdLibraryProvider;
  throw new AppError('PROVIDER_NOT_CONFIGURED', 'Live data source not connected. Connect Meta Ad Library to enable this feature.', 503, { providers: providerStatus().providers });
}

export function isDemoModeEnabled() {
  return process.env.SPOTNXT_DEMO_MODE === 'true';
}

function normalizeMetaAd(row: Record<string, unknown>, country: string, market?: MarketCode): CanonicalAd {
  const bodies = Array.isArray(row.ad_creative_bodies) ? row.ad_creative_bodies.filter((item): item is string => typeof item === 'string') : [];
  const titles = Array.isArray(row.ad_creative_link_titles) ? row.ad_creative_link_titles.filter((item): item is string => typeof item === 'string') : [];
  const captions = Array.isArray(row.ad_creative_link_captions) ? row.ad_creative_link_captions.filter((item): item is string => typeof item === 'string') : [];
  const snapshotUrl = typeof row.ad_snapshot_url === 'string' ? row.ad_snapshot_url : undefined;
  const firstSeenAt = typeof row.ad_creation_time === 'string' ? row.ad_creation_time : typeof row.ad_delivery_start_time === 'string' ? row.ad_delivery_start_time : nowIso();
  const lastSeenAt = typeof row.ad_delivery_stop_time === 'string' ? row.ad_delivery_stop_time : typeof row.ad_delivery_start_time === 'string' ? row.ad_delivery_start_time : firstSeenAt;
  return buildAdFromInput({
    externalId: typeof row.id === 'string' ? row.id : undefined,
    advertiserName: typeof row.page_name === 'string' ? row.page_name : typeof row.page_id === 'string' ? `Meta page ${row.page_id}` : 'Meta advertiser',
    headline: titles[0] || captions[0] || 'Headline not provided by source',
    primaryText: bodies[0] || 'Primary text not provided by source',
    cta: 'Learn More',
    platform: 'Meta',
    creativeType: 'Image',
    mediaUrl: snapshotUrl,
    landingPageUrl: snapshotUrl,
    source: 'meta',
    provider: 'meta-ad-library',
    sourceLabel: 'Meta Ad Library',
    country,
    market: market || (country === 'IN' ? 'IN' : 'GLOBAL'),
    permissionsContext: 'Retrieved through the official Meta Ad Library API with the configured access token; field availability is provider-controlled.',
    firstSeenAt,
    lastSeenAt,
    metadata: {
      provider: 'meta-ad-library',
      sourceLabel: 'Meta Ad Library',
      metaAdId: row.id,
      pageId: row.page_id,
      pageName: row.page_name,
      adCreationTime: row.ad_creation_time,
      adDeliveryStartTime: row.ad_delivery_start_time,
      adDeliveryStopTime: row.ad_delivery_stop_time,
      country,
      market: market || (country === 'IN' ? 'IN' : 'GLOBAL'),
    },
  });
}

export async function ingestUploadedAd(input: {
  advertiserName: string;
  headline: string;
  primaryText: string;
  cta: string;
  platform: CanonicalAd['platform'];
  creativeType: CanonicalAd['creativeType'];
  mediaUrl?: string;
  landingPageUrl?: string;
  metadata?: Record<string, unknown>;
  country?: string;
  market?: MarketCode;
}): Promise<CanonicalAd> {
  if (!input.advertiserName.trim() || !input.headline.trim()) {
    throw new AppError('INVALID_AD', 'advertiserName and headline are required.', 400);
  }
  const ad = buildAdFromInput({
    ...input,
    source: 'upload',
    provider: 'uploaded-workspace',
    sourceLabel: 'Uploaded workspace data',
    permissionsContext: 'User-uploaded creative; workspace permission assumed for analysis.',
    metadata: input.metadata,
  });
  return upsertAd(ad, {
    type: 'AD_DISCOVERED',
    message: `Uploaded creative ingested for ${input.advertiserName}`,
    requestId: `ingest_${Date.now()}`,
  });
}

export function normalizeDemoCreative(ad: (typeof adCreatives)[number]): CanonicalAd {
  return buildAdFromInput({
    externalId: `demo_${ad.id}`,
    advertiserName: ad.competitorName,
    headline: ad.headline,
    primaryText: ad.bodyCopy,
    cta: ad.cta,
    platform: ad.platform,
    creativeType: ad.format,
    mediaUrl: ad.imageUrl,
    source: 'demo',
    provider: 'demo',
    sourceLabel: 'Demo data',
    country: 'US',
    market: 'GLOBAL',
    permissionsContext: 'Local opt-in sample inventory; not a live provider feed.',
  });
}
