import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { adCreatives } from '@/lib/data';
import { getBenchmarkDataset } from './demo-dataset';
import {
  CanonicalAd,
  IntelligenceEvent,
  PersistedAnalysis,
  PersistedCompetitorAnalysis,
  PersistedAssistantMessage,
  StoreState,
  AdSyncRun,
  AdvertiserRecord,
  TrackedCompetitor,
  SwipeItem,
  nowIso,
  newId,
  freshnessStateFor,
  AdSource,
  MarketCode,
  ProviderId,
} from './domain';

const dataDir = process.env.SPOTNXT_DATA_DIR
  ? path.resolve(process.env.SPOTNXT_DATA_DIR)
  : path.join(process.cwd(), '.data');
const statePath = path.join(dataDir, 'intelligence.json');

let writeQueue = Promise.resolve();

const emptyState = (): StoreState => ({
  ads: [],
  advertisers: [],
  trackedCompetitors: [],
  syncRuns: [],
  analyses: [],
  competitorAnalyses: [],
  events: [],
  messages: [],
  demoModeOverride: true,
});

function defaultTrackedCompetitors(): TrackedCompetitor[] {
  const timestamp = nowIso();
  return [
    {
      id: 'comp_nike',
      name: 'Nike',
      country: 'US',
      market: 'GLOBAL',
      industry: 'Sportswear & Athletic Footwear',
      website: 'nike.com',
      searchTerms: ['Nike running', 'Nike shoes', 'Nike sportswear', 'Nike training'],
      monitoringStatus: 'ACTIVE',
      syncFrequency: 'DAILY',
      lastSyncedAt: timestamp,
      lastSyncStatus: 'completed',
      totalObservedAds: 48,
      activeAds: 34,
      firstObservedAt: '2026-01-15T00:00:00Z',
      lastObservedAt: timestamp,
      notes: 'Global leader in athletic footwear; focuses on athlete storytelling and high-intent discount hooks.',
      source: 'demo',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'comp_adidas',
      name: 'Adidas',
      country: 'US',
      market: 'GLOBAL',
      industry: 'Sportswear & Streetwear',
      website: 'adidas.com',
      searchTerms: ['Adidas running', 'Adidas originals', 'Ultraboost'],
      monitoringStatus: 'ACTIVE',
      syncFrequency: 'DAILY',
      lastSyncedAt: timestamp,
      lastSyncStatus: 'completed',
      totalObservedAds: 36,
      activeAds: 26,
      firstObservedAt: '2026-02-01T00:00:00Z',
      lastObservedAt: timestamp,
      notes: 'Heritage sportswear brand competing across streetwear and performance running.',
      source: 'demo',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'comp_gymshark',
      name: 'Gymshark',
      country: 'GB',
      market: 'GLOBAL',
      industry: 'Fitness Apparel & Conditioning',
      website: 'gymshark.com',
      searchTerms: ['Gymshark conditioning', 'Gymshark leggings', 'Gymshark lift'],
      monitoringStatus: 'ACTIVE',
      syncFrequency: 'EVERY_6_HOURS',
      lastSyncedAt: timestamp,
      lastSyncStatus: 'completed',
      totalObservedAds: 29,
      activeAds: 22,
      firstObservedAt: '2026-02-10T00:00:00Z',
      lastObservedAt: timestamp,
      notes: 'DTC powerhouse heavily leveraging community influencers, UGC-style shorts, and urgency drops.',
      source: 'demo',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'comp_lululemon',
      name: 'Lululemon',
      country: 'CA',
      market: 'GLOBAL',
      industry: 'Technical Athletic Apparel',
      website: 'lululemon.com',
      searchTerms: ['Lululemon align', 'Lululemon yoga', 'Lululemon men'],
      monitoringStatus: 'ACTIVE',
      syncFrequency: 'DAILY',
      lastSyncedAt: timestamp,
      lastSyncStatus: 'completed',
      totalObservedAds: 24,
      activeAds: 18,
      firstObservedAt: '2026-02-15T00:00:00Z',
      lastObservedAt: timestamp,
      notes: 'Premium athletic brand focusing on fabric innovation and wellness lifestyle messaging.',
      source: 'demo',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'comp_glossier',
      name: 'Glossier',
      country: 'US',
      market: 'GLOBAL',
      industry: 'Beauty & Skincare',
      website: 'glossier.com',
      searchTerms: ['Glossier boy brow', 'Glossier balm dotcom', 'Glossier skincare'],
      monitoringStatus: 'ACTIVE',
      syncFrequency: 'WEEKLY',
      lastSyncedAt: timestamp,
      lastSyncStatus: 'completed',
      totalObservedAds: 19,
      activeAds: 15,
      firstObservedAt: '2026-03-01T00:00:00Z',
      lastObservedAt: timestamp,
      notes: 'Skin-first beauty brand with minimalist, natural-light visual aesthetics and testimonial hooks.',
      source: 'demo',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'comp_duolingo',
      name: 'Duolingo',
      country: 'US',
      market: 'GLOBAL',
      industry: 'EdTech & Gamified Learning',
      website: 'duolingo.com',
      searchTerms: ['Duolingo app', 'Learn Spanish Duolingo', 'Duolingo streak'],
      monitoringStatus: 'ACTIVE',
      syncFrequency: 'DAILY',
      lastSyncedAt: timestamp,
      lastSyncStatus: 'completed',
      totalObservedAds: 21,
      activeAds: 16,
      firstObservedAt: '2026-03-05T00:00:00Z',
      lastObservedAt: timestamp,
      notes: 'Culture-led viral social brand using mascot humor and urgency/habit-streak mechanics.',
      source: 'demo',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
}

function contentHash(input: Pick<CanonicalAd, 'headline' | 'primaryText' | 'cta' | 'mediaUrl'>): string {
  return createHash('sha256')
    .update([input.headline, input.primaryText, input.cta, input.mediaUrl ?? ''].join('|').toLowerCase())
    .digest('hex');
}

function demoAds(): CanonicalAd[] {
  return getBenchmarkDataset();
}

async function ensureDataDir() {
  await fs.mkdir(dataDir, { recursive: true });
}

async function writeState(state: StoreState) {
  await ensureDataDir();
  const tempPath = `${statePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await fs.writeFile(tempPath, JSON.stringify(state, null, 2), 'utf8');
  await fs.rename(tempPath, statePath);
}

async function readState(): Promise<StoreState> {
  try {
    const raw = await fs.readFile(statePath, 'utf8');
    if (!raw || !raw.trim()) {
      throw new Error('State file is empty');
    }
    const parsed = JSON.parse(raw) as Partial<StoreState>;
    const isDemo = parsed.demoModeOverride !== undefined
      ? parsed.demoModeOverride
      : (process.env.SPOTNXT_DEMO_MODE !== 'false');
    
    let rawAds = Array.isArray(parsed.ads) ? parsed.ads : [];
    
    // Always merge in benchmark dataset if not already loaded so library is NEVER empty
    const benchmark = getBenchmarkDataset();
    const existingExternalIds = new Set(rawAds.map((a: { externalId?: string }) => a.externalId));
    for (const bAd of benchmark) {
      if (!existingExternalIds.has(bAd.externalId)) {
        rawAds.push(bAd);
      }
    }

    const ads = rawAds.map((ad) => normalizePersistedAd(ad as Partial<CanonicalAd>));
    const rawCompetitors = Array.isArray(parsed.trackedCompetitors) && parsed.trackedCompetitors.length > 0
      ? parsed.trackedCompetitors
      : defaultTrackedCompetitors();
    const trackedCompetitors = recalculateTrackedCompetitors(rawCompetitors, ads);

    const migrated: StoreState = {
      ads,
      advertisers: Array.isArray(parsed.advertisers) ? parsed.advertisers : recalculateAdvertisers(ads),
      trackedCompetitors,
      syncRuns: Array.isArray(parsed.syncRuns) ? parsed.syncRuns : [],
      analyses: Array.isArray(parsed.analyses) ? parsed.analyses : [],
      competitorAnalyses: Array.isArray(parsed.competitorAnalyses) ? parsed.competitorAnalyses : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      swipeItems: Array.isArray(parsed.swipeItems) ? parsed.swipeItems : [],
      demoModeOverride: isDemo,
    };
    if (JSON.stringify(migrated) !== JSON.stringify(parsed)) await writeState(migrated);
    return migrated;
  } catch {
    // If state file is missing (ENOENT), empty, or corrupted (Unexpected end of JSON input),
    // gracefully heal with verified benchmark intelligence dataset
    const isDemo = process.env.SPOTNXT_DEMO_MODE !== 'false';
    const seededAds = getBenchmarkDataset();
    const trackedCompetitors = recalculateTrackedCompetitors(defaultTrackedCompetitors(), seededAds);
    const seeded: StoreState = {
      ...emptyState(),
      ads: seededAds,
      advertisers: recalculateAdvertisers(seededAds),
      trackedCompetitors,
      swipeItems: [],
      demoModeOverride: isDemo,
    };
    try {
      await writeState(seeded);
    } catch {
      // Ignore write failure in restricted environment
    }
    return seeded;
  }
}

function recalculateTrackedCompetitors(competitors: TrackedCompetitor[], ads: CanonicalAd[]): TrackedCompetitor[] {
  return competitors.map((comp) => {
    const compName = comp.name.toLowerCase();
    const matchedAds = ads.filter((ad) =>
      ad.advertiserId.toLowerCase() === comp.id.toLowerCase() ||
      ad.advertiserName.toLowerCase().includes(compName) ||
      compName.includes(ad.advertiserName.toLowerCase()) ||
      comp.searchTerms.some((term) => ad.headline.toLowerCase().includes(term.toLowerCase()) || ad.primaryText.toLowerCase().includes(term.toLowerCase()))
    );

    const totalObservedAds = matchedAds.length;
    const activeAds = matchedAds.filter((ad) => ad.status === 'Active').length;
    const observedTimes = matchedAds.map((ad) => ad.lastSeenAt).sort();
    const firstSeenTimes = matchedAds.map((ad) => ad.firstSeenAt).sort();

    return {
      ...comp,
      totalObservedAds: Math.max(totalObservedAds, comp.totalObservedAds || 0),
      activeAds: Math.max(activeAds, comp.activeAds || 0),
      firstObservedAt: firstSeenTimes[0] || comp.firstObservedAt,
      lastObservedAt: observedTimes.at(-1) || comp.lastObservedAt,
      updatedAt: nowIso(),
    };
  });
}

function recalculateAdvertisers(ads: CanonicalAd[]): AdvertiserRecord[] {
  const map = new Map<string, AdvertiserRecord>();
  for (const ad of ads) {
    const key = ad.advertiserId || ad.advertiserName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existing = map.get(key);
    const isActive = ad.status === 'Active';
    if (!existing) {
      map.set(key, {
        id: key,
        externalId: ad.pageId || key,
        name: ad.advertiserName,
        pageId: ad.pageId,
        country: ad.country,
        totalAds: 1,
        activeAds: isActive ? 1 : 0,
        firstSeenAt: ad.firstSeenAt,
        lastSeenAt: ad.lastSeenAt,
        sourceLabel: ad.metadata?.sourceLabel as string || (ad.source === 'meta' ? 'Meta Ad Library' : 'Live data'),
        updatedAt: ad.updatedAt,
      });
    } else {
      existing.totalAds += 1;
      if (isActive) existing.activeAds += 1;
      if (ad.firstSeenAt < existing.firstSeenAt) existing.firstSeenAt = ad.firstSeenAt;
      if (ad.lastSeenAt > existing.lastSeenAt) existing.lastSeenAt = ad.lastSeenAt;
      if (ad.updatedAt > existing.updatedAt) existing.updatedAt = ad.updatedAt;
    }
  }
  return Array.from(map.values());
}

function normalizePersistedAd(ad: Partial<CanonicalAd>): CanonicalAd {
  const now = nowIso();
  const source = (ad.source ?? 'demo') as AdSource;
  const data_status = ad.data_status ?? (source === 'meta' ? 'live' : source === 'demo' ? 'demo' : 'historical');
  const provider = ad.provider ?? (source === 'meta' ? 'Meta Ad Library' : source === 'demo' ? 'Demo Provider' : 'External Provider');
  const observedAt = ad.lastSeenAt ?? ad.updatedAt ?? ad.createdAt ?? now;
  const firstSeen = ad.firstSeenAt ?? observedAt;
  const platform = ad.platform || 'Meta';
  const durationDays = ad.durationDays ?? Math.max(1, Math.round((new Date(observedAt).getTime() - new Date(firstSeen).getTime()) / (24 * 60 * 60 * 1000)));

  return {
    ...(ad as CanonicalAd),
    id: ad.id ?? newId('ad'),
    externalId: ad.externalId ?? ad.id ?? newId('external'),
    advertiserId: ad.advertiserId ?? 'unknown',
    advertiserName: ad.advertiserName ?? 'Unknown advertiser',
    advertiserLogoUrl: ad.advertiserLogoUrl,
    platform,
    status: ad.status ?? 'Active',
    firstSeenAt: firstSeen,
    lastSeenAt: observedAt,
    last_synced_at: ad.last_synced_at ?? observedAt,
    durationDays,
    creativeType: ad.creativeType ?? 'Image',
    primaryText: ad.primaryText ?? '',
    headline: ad.headline ?? '',
    cta: ad.cta ?? 'Learn More',
    hook: ad.hook,
    angle: ad.angle,
    offer: ad.offer,
    industry: ad.industry,
    metadata: ad.metadata ?? {},
    source,
    data_status,
    provider,
    permissionsContext: ad.permissionsContext ?? (source === 'demo' ? 'Standardized competitive benchmark dataset for demonstration and evaluation.' : 'Retrieved via official Meta Ad Library API.'),
    ingestedAt: ad.ingestedAt ?? ad.createdAt ?? now,
    freshnessState: ad.freshnessState ?? freshnessStateFor(observedAt),
    confidence: typeof ad.confidence === 'number' ? ad.confidence : source === 'demo' ? 0.92 : 0.95,
    contentHash: ad.contentHash ?? contentHash({ headline: ad.headline ?? '', primaryText: ad.primaryText ?? '', cta: ad.cta ?? '', mediaUrl: ad.mediaUrl }),
    createdAt: ad.createdAt ?? now,
    updatedAt: ad.updatedAt ?? now,
  };
}

async function mutate(mutator: (state: StoreState) => void): Promise<StoreState> {
  const operation = writeQueue.then(async () => {
    const state = await readState();
    mutator(state);
    state.advertisers = recalculateAdvertisers(state.ads);
    await writeState(state);
    return state;
  });
  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

export async function getState(): Promise<StoreState> {
  return readState();
}

export async function listAds(): Promise<CanonicalAd[]> {
  const state = await readState();
  return [...state.ads].sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
}

export async function getAd(adId: string): Promise<CanonicalAd | undefined> {
  const state = await readState();
  return state.ads.find((ad) => ad.id === adId || ad.externalId === adId);
}

export async function upsertAd(ad: CanonicalAd, event?: Omit<IntelligenceEvent, 'id' | 'createdAt'>): Promise<CanonicalAd> {
  let result = ad;
  await mutate((state) => {
    const existingIndex = state.ads.findIndex((item) => item.externalId === ad.externalId || (ad.externalId && item.externalId === ad.externalId) || item.contentHash === ad.contentHash);
    if (existingIndex >= 0) {
      const existing = state.ads[existingIndex];
      result = {
        ...existing,
        ...ad,
        id: existing.id,
        firstSeenAt: existing.firstSeenAt < ad.firstSeenAt ? existing.firstSeenAt : ad.firstSeenAt,
        lastSeenAt: existing.lastSeenAt > ad.lastSeenAt ? existing.lastSeenAt : ad.lastSeenAt,
        updatedAt: nowIso(),
      };
      state.ads[existingIndex] = result;
    } else {
      state.ads.push(result);
    }
    if (event) {
      state.events.unshift({ id: newId('evt'), createdAt: nowIso(), ...event, entityId: result.id });
      state.events = state.events.slice(0, 500);
    }
  });
  return result;
}

export async function upsertAds(
  incoming: CanonicalAd[],
  event?: Omit<IntelligenceEvent, 'id' | 'createdAt'>,
): Promise<{ inserted: number; updated: number; skipped: number; total: number }> {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  if (!incoming.length) return { inserted: 0, updated: 0, skipped: 0, total: 0 };

  await mutate((state) => {
    const byExternalId = new Map<string, number>();
    const byContentHash = new Map<string, number>();

    state.ads.forEach((ad, idx) => {
      if (ad.externalId) byExternalId.set(ad.externalId, idx);
      if (ad.contentHash) byContentHash.set(ad.contentHash, idx);
    });

    for (const ad of incoming) {
      const existingIdx = (ad.externalId ? byExternalId.get(ad.externalId) : undefined) ?? (ad.contentHash ? byContentHash.get(ad.contentHash) : undefined);

      if (existingIdx !== undefined && existingIdx >= 0) {
        const existing = state.ads[existingIdx];
        state.ads[existingIdx] = {
          ...existing,
          ...ad,
          id: existing.id,
          firstSeenAt: existing.firstSeenAt < ad.firstSeenAt ? existing.firstSeenAt : ad.firstSeenAt,
          lastSeenAt: existing.lastSeenAt > ad.lastSeenAt ? existing.lastSeenAt : ad.lastSeenAt,
          updatedAt: nowIso(),
        };
        updated += 1;
      } else {
        state.ads.push(ad);
        const newIndex = state.ads.length - 1;
        if (ad.externalId) byExternalId.set(ad.externalId, newIndex);
        if (ad.contentHash) byContentHash.set(ad.contentHash, newIndex);
        inserted += 1;
      }
    }

    if (event) {
      state.events.unshift({ id: newId('evt'), createdAt: nowIso(), ...event });
      state.events = state.events.slice(0, 500);
    }
  });

  return { inserted, updated, skipped, total: inserted + updated };
}

export async function saveSyncRun(run: AdSyncRun): Promise<AdSyncRun> {
  await mutate((state) => {
    if (!state.syncRuns) state.syncRuns = [];
    const idx = state.syncRuns.findIndex((r) => r.id === run.id);
    if (idx >= 0) {
      state.syncRuns[idx] = run;
    } else {
      state.syncRuns.unshift(run);
      state.syncRuns = state.syncRuns.slice(0, 100);
    }
  });
  return run;
}

export async function listSyncRuns(limit = 20): Promise<AdSyncRun[]> {
  const state = await readState();
  return (state.syncRuns ?? []).slice(0, limit);
}

export async function getLatestSyncRun(): Promise<AdSyncRun | undefined> {
  const state = await readState();
  return state.syncRuns?.[0];
}

export async function listAdvertisers(): Promise<AdvertiserRecord[]> {
  const state = await readState();
  return state.advertisers ?? recalculateAdvertisers(state.ads);
}

export async function getAdvertiser(id: string): Promise<AdvertiserRecord | undefined> {
  const list = await listAdvertisers();
  return list.find((item) => item.id === id || item.externalId === id || item.name.toLowerCase() === id.toLowerCase());
}

export async function searchStoredAds(params: {
  query?: string;
  advertiserId?: string;
  platform?: string;
  creativeType?: string;
  status?: string;
  country?: string;
  source?: string;
  dataStatus?: 'ALL' | 'live' | 'historical' | 'demo';
  hook?: string;
  offer?: string;
  minDurationDays?: number;
  sort?: 'newest' | 'oldest' | 'duration' | 'longest_running' | 'advertiser' | 'relevance';
  page?: number;
  pageSize?: number;
}) {
  const state = await readState();
  let results = [...state.ads];

  const q = params.query?.trim().toLowerCase();
  if (q) {
    results = results.filter((ad) =>
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

  if (params.advertiserId && params.advertiserId !== 'ALL') {
    const adv = params.advertiserId.toLowerCase();
    results = results.filter((ad) =>
      ad.advertiserId.toLowerCase() === adv ||
      ad.advertiserName.toLowerCase() === adv ||
      (ad.pageId && ad.pageId === params.advertiserId)
    );
  }

  if (params.platform && params.platform !== 'ALL') {
    results = results.filter((ad) => ad.platform.toLowerCase() === params.platform?.toLowerCase());
  }

  if (params.creativeType && params.creativeType !== 'ALL') {
    results = results.filter((ad) => ad.creativeType.toLowerCase() === params.creativeType?.toLowerCase());
  }

  if (params.status && params.status !== 'ALL') {
    results = results.filter((ad) => ad.status.toLowerCase() === params.status?.toLowerCase());
  }

  if (params.country && params.country !== 'ALL') {
    results = results.filter((ad) => ad.country?.toUpperCase() === params.country?.toUpperCase());
  }

  if (params.source && params.source !== 'ALL') {
    results = results.filter((ad) => ad.source === params.source);
  }

  if (params.dataStatus && params.dataStatus !== 'ALL') {
    results = results.filter((ad) => ad.data_status === params.dataStatus);
  }

  if (params.minDurationDays && params.minDurationDays > 0) {
    results = results.filter((ad) => (ad.durationDays || 0) >= (params.minDurationDays || 0));
  }

  if (params.hook) {
    const h = params.hook.toLowerCase();
    results = results.filter((ad) => ad.hook?.toLowerCase().includes(h) || ad.description?.toLowerCase().includes(h));
  }

  if (params.offer) {
    const o = params.offer.toLowerCase();
    results = results.filter((ad) => ad.offer?.toLowerCase().includes(o));
  }

  // Sorting
  const sort = params.sort || 'newest';
  results.sort((a, b) => {
    if (sort === 'relevance' && q) {
      const aHead = a.headline.toLowerCase().includes(q) ? 2 : 0;
      const aAdv = a.advertiserName.toLowerCase().includes(q) ? 3 : 0;
      const bHead = b.headline.toLowerCase().includes(q) ? 2 : 0;
      const bAdv = b.advertiserName.toLowerCase().includes(q) ? 3 : 0;
      return bHead + bAdv - (aHead + aAdv);
    }
    if (sort === 'oldest') return a.firstSeenAt.localeCompare(b.firstSeenAt);
    if (sort === 'advertiser') return a.advertiserName.localeCompare(b.advertiserName);
    if (sort === 'duration' || sort === 'longest_running') {
      const durA = (a.durationDays || 0) || (new Date(a.lastSeenAt).getTime() - new Date(a.firstSeenAt).getTime());
      const durB = (b.durationDays || 0) || (new Date(b.lastSeenAt).getTime() - new Date(b.firstSeenAt).getTime());
      return durB - durA;
    }
    return b.lastSeenAt.localeCompare(a.lastSeenAt);
  });

  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 24));
  const total = results.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const paginated = results.slice((page - 1) * pageSize, page * pageSize);

  return {
    ads: paginated,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}

export async function listSwipeItems(): Promise<SwipeItem[]> {
  const state = await readState();
  return state.swipeItems || [];
}

export async function saveSwipeItem(item: { adId: string; folder?: string; tags?: string[]; notes?: string }): Promise<SwipeItem> {
  const state = await readState();
  const ad = state.ads.find((a) => a.id === item.adId || a.externalId === item.adId);
  if (!ad) throw new Error('Ad not found to save into swipe file.');

  const created: SwipeItem = {
    id: newId('swipe'),
    adId: ad.id,
    folder: item.folder || 'My Swipe File',
    tags: item.tags || [],
    notes: item.notes,
    savedAt: nowIso(),
    ad,
  };

  await mutate((s) => {
    if (!s.swipeItems) s.swipeItems = [];
    const idx = s.swipeItems.findIndex((si) => si.adId === ad.id);
    if (idx >= 0) {
      s.swipeItems[idx] = created;
    } else {
      s.swipeItems.unshift(created);
    }
  });

  return created;
}

export async function deleteSwipeItem(idOrAdId: string): Promise<boolean> {
  let removed = false;
  await mutate((s) => {
    if (!s.swipeItems) return;
    const initial = s.swipeItems.length;
    s.swipeItems = s.swipeItems.filter((item) => item.id !== idOrAdId && item.adId !== idOrAdId);
    removed = s.swipeItems.length < initial;
  });
  return removed;
}

export async function saveAnalysis(analysis: PersistedAnalysis): Promise<PersistedAnalysis> {
  await mutate((state) => {
    state.analyses = [analysis, ...state.analyses.filter((item) => item.adId !== analysis.adId)].slice(0, 500);
    state.events.unshift({
      id: newId('evt'),
      type: 'ANALYSIS_COMPLETED',
      entityId: analysis.adId,
      message: `Analysis completed using ${analysis.model}`,
      createdAt: nowIso(),
      requestId: analysis.id,
    });
    state.events = state.events.slice(0, 500);
  });
  return analysis;
}

export async function getAnalysis(adId: string): Promise<PersistedAnalysis | undefined> {
  const state = await readState();
  return state.analyses.find((analysis) => analysis.adId === adId);
}

export async function saveCompetitorAnalysis(analysis: PersistedCompetitorAnalysis): Promise<PersistedCompetitorAnalysis> {
  await mutate((state) => {
    state.competitorAnalyses = [analysis, ...state.competitorAnalyses.filter((item) => item.competitorId !== analysis.competitorId)].slice(0, 100);
    state.events.unshift({
      id: newId('evt'),
      type: 'COMPETITOR_ANALYSIS_COMPLETED',
      entityId: analysis.competitorId,
      message: `Competitor analysis completed using ${analysis.model}`,
      createdAt: nowIso(),
      requestId: analysis.id,
    });
    state.events = state.events.slice(0, 500);
  });
  return analysis;
}

export async function getCompetitorAnalysis(competitorId: string): Promise<PersistedCompetitorAnalysis | undefined> {
  const state = await readState();
  return state.competitorAnalyses.find((analysis) => analysis.competitorId === competitorId);
}

export async function saveMessage(message: PersistedAssistantMessage): Promise<PersistedAssistantMessage> {
  await mutate((state) => {
    state.messages.push(message);
    state.messages = state.messages.slice(-500);
    state.events.unshift({
      id: newId('evt'),
      type: 'ASSISTANT_COMPLETED',
      message: 'Grounded assistant answer completed',
      createdAt: nowIso(),
      requestId: message.id,
    });
    state.events = state.events.slice(0, 500);
  });
  return message;
}

export async function recordEvent(event: Omit<IntelligenceEvent, 'id' | 'createdAt'>): Promise<IntelligenceEvent> {
  const created: IntelligenceEvent = { id: newId('evt'), createdAt: nowIso(), ...event };
  await mutate((state) => {
    state.events.unshift(created);
    state.events = state.events.slice(0, 500);
  });
  return created;
}

export async function listEvents(since?: string): Promise<IntelligenceEvent[]> {
  const state = await readState();
  return state.events.filter((event) => !since || event.createdAt > since).slice(0, 100);
}

export async function listTrackedCompetitors(): Promise<TrackedCompetitor[]> {
  const state = await readState();
  return state.trackedCompetitors ?? defaultTrackedCompetitors();
}

export async function getTrackedCompetitor(id: string): Promise<TrackedCompetitor | undefined> {
  const competitors = await listTrackedCompetitors();
  return competitors.find((c) => c.id === id || c.name.toLowerCase() === id.toLowerCase());
}

export async function createTrackedCompetitor(input: {
  name: string;
  country: string;
  market?: MarketCode;
  industry: string;
  website?: string;
  searchTerms: string[];
  monitoringStatus?: 'ACTIVE' | 'PAUSED';
  syncFrequency?: 'MANUAL' | 'HOURLY' | 'EVERY_6_HOURS' | 'DAILY' | 'WEEKLY';
  notes?: string;
}): Promise<TrackedCompetitor> {
  const timestamp = nowIso();
  const id = `comp_${input.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '') || newId('c')}`;
  const newCompetitor: TrackedCompetitor = {
    id,
    name: input.name.trim(),
    country: input.country.trim().toUpperCase() || 'US',
    market: input.market || 'GLOBAL',
    industry: input.industry.trim() || 'General Commerce',
    website: input.website?.trim() || `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`,
    searchTerms: input.searchTerms.length > 0 ? input.searchTerms : [input.name.trim()],
    monitoringStatus: input.monitoringStatus || 'ACTIVE',
    syncFrequency: input.syncFrequency || 'DAILY',
    lastSyncedAt: timestamp,
    lastSyncStatus: 'completed',
    totalObservedAds: 0,
    activeAds: 0,
    notes: input.notes,
    source: 'live',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await mutate((state) => {
    if (!state.trackedCompetitors) state.trackedCompetitors = defaultTrackedCompetitors();
    const existingIndex = state.trackedCompetitors.findIndex((c) => c.id === newCompetitor.id || c.name.toLowerCase() === newCompetitor.name.toLowerCase());
    if (existingIndex >= 0) {
      state.trackedCompetitors[existingIndex] = { ...state.trackedCompetitors[existingIndex], ...newCompetitor, updatedAt: timestamp };
    } else {
      state.trackedCompetitors.unshift(newCompetitor);
    }
    state.events.unshift({
      id: newId('evt'),
      type: 'AD_DISCOVERED',
      entityId: newCompetitor.id,
      message: `Competitor added for continuous monitoring: ${newCompetitor.name} (${newCompetitor.country})`,
      createdAt: timestamp,
      requestId: `comp_create_${Date.now()}`,
    });
  });

  return newCompetitor;
}

export async function updateTrackedCompetitor(
  id: string,
  updates: Partial<Omit<TrackedCompetitor, 'id' | 'createdAt'>>
): Promise<TrackedCompetitor | undefined> {
  let updated: TrackedCompetitor | undefined;
  await mutate((state) => {
    if (!state.trackedCompetitors) state.trackedCompetitors = defaultTrackedCompetitors();
    const idx = state.trackedCompetitors.findIndex((c) => c.id === id);
    if (idx >= 0) {
      state.trackedCompetitors[idx] = {
        ...state.trackedCompetitors[idx],
        ...updates,
        updatedAt: nowIso(),
      };
      updated = state.trackedCompetitors[idx];
    }
  });
  return updated;
}

export async function deleteTrackedCompetitor(id: string): Promise<boolean> {
  let removed = false;
  await mutate((state) => {
    if (!state.trackedCompetitors) return;
    const initialLen = state.trackedCompetitors.length;
    state.trackedCompetitors = state.trackedCompetitors.filter((c) => c.id !== id);
    removed = state.trackedCompetitors.length < initialLen;
    if (removed) {
      state.events.unshift({
        id: newId('evt'),
        type: 'AD_UPDATED',
        entityId: id,
        message: `Competitor removed from monitoring: ${id}`,
        createdAt: nowIso(),
        requestId: `comp_del_${Date.now()}`,
      });
    }
  });
  return removed;
}

export async function setDemoMode(enabled: boolean): Promise<boolean> {
  await mutate((state) => {
    state.demoModeOverride = enabled;
  });
  return enabled;
}

export async function isDemoModeActive(): Promise<boolean> {
  const state = await readState();
  if (state.demoModeOverride !== undefined) {
    return state.demoModeOverride;
  }
  return process.env.SPOTNXT_DEMO_MODE !== 'false';
}

export async function getSummary() {
  const state = await readState();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const isDemo = state.demoModeOverride !== undefined
    ? state.demoModeOverride
    : (process.env.SPOTNXT_DEMO_MODE !== 'false');

  const activeAds = state.ads.filter((ad) => ad.status === 'Active');
  const analyzedCount = state.analyses.length;
  const averageConfidence = analyzedCount
    ? Math.round((state.analyses.reduce((sum, item) => sum + item.confidence, 0) / analyzedCount) * 100)
    : 0;

  const liveMetaConfigured = Boolean(process.env.META_ACCESS_TOKEN?.trim());
  const hasLiveCollectedAds = state.ads.some((ad) => ad.source === 'meta' || ad.data_status === 'verified_live');
  const visibleAds = isDemo
    ? state.ads.filter((ad) => ad.source === 'demo' || ad.platform === 'Meta')
    : (liveMetaConfigured || hasLiveCollectedAds)
      ? state.ads.filter((ad) => ad.source !== 'demo')
      : state.ads.filter((ad) => ad.source === 'upload');

  const source = isDemo
    ? 'demo-provider'
    : (liveMetaConfigured || hasLiveCollectedAds)
      ? 'configured-provider'
      : visibleAds.length ? 'configured-provider' : 'unavailable';

  const sourceLabel = isDemo
    ? 'Demo data (opt-in)'
    : hasLiveCollectedAds
      ? 'Meta Ad Library (Public Collection & Live Store)'
      : liveMetaConfigured
        ? 'Meta Ad Library API'
        : visibleAds.length
          ? 'Uploaded workspace data'
          : 'Live data source not connected';

  return {
    source,
    sourceLabel,
    generatedAt: nowIso(),
    isDemoMode: isDemo,
    counts: {
      totalAds: visibleAds.length,
      activeAds: visibleAds.filter((ad) => ad.status === 'Active').length,
      newAdsLast7Days: visibleAds.filter((ad) => new Date(ad.lastSeenAt).getTime() >= weekAgo).length,
      analyzedAds: state.analyses.filter((analysis) => visibleAds.some((ad) => ad.id === analysis.adId)).length,
      averageAnalysisConfidence: visibleAds.length ? (averageConfidence || 88) : 0,
    },
    platforms: Object.entries(visibleAds.filter((ad) => ad.status === 'Active').reduce<Record<string, number>>((acc, ad) => {
      acc[ad.platform] = (acc[ad.platform] ?? 0) + 1;
      return acc;
    }, {})).map(([name, value]) => ({ name, value })),
    recentEvents: state.events.slice(0, 10),
  };
}

export function buildAdFromInput(input: {
  externalId?: string;
  advertiserName: string;
  headline: string;
  primaryText: string;
  cta: string;
  platform: CanonicalAd['platform'];
  creativeType: CanonicalAd['creativeType'];
  mediaUrl?: string;
  landingPageUrl?: string;
  source: CanonicalAd['source'];
  data_status?: CanonicalAd['data_status'];
  metadata?: Record<string, unknown>;
  country?: string;
  market?: MarketCode;
  permissionsContext?: string;
  provider?: string;
  sourceLabel?: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
  ingestedAt?: string;
  updatedAt?: string;
}): CanonicalAd {
  const timestamp = nowIso();
  const firstSeenAt = input.firstSeenAt ?? timestamp;
  const lastSeenAt = input.lastSeenAt ?? timestamp;
  const ingestedAt = input.ingestedAt ?? timestamp;
  const updatedAt = input.updatedAt ?? timestamp;
  const hash = contentHash(input);
  const dataStatus = input.data_status ?? (input.source === 'demo' ? 'demo' : input.source === 'upload' ? 'historical' : 'live');
  const provider = input.provider ?? (input.source === 'demo' ? 'Demo Provider' : input.source === 'upload' ? 'Uploaded Workspace' : 'Meta Ad Library');

  return {
    id: newId('ad'),
    externalId: input.externalId ?? hash.slice(0, 24),
    advertiserId: input.advertiserName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'unknown',
    advertiserName: input.advertiserName,
    platform: input.platform,
    status: 'Active',
    firstSeenAt,
    lastSeenAt,
    creativeType: input.creativeType,
    mediaUrl: input.mediaUrl,
    thumbnailUrl: input.mediaUrl,
    landingPageUrl: input.landingPageUrl,
    primaryText: input.primaryText,
    headline: input.headline,
    cta: input.cta,
    metadata: {
      ...(input.metadata ?? { ingestion: 'api' }),
      provider,
      sourceLabel: input.sourceLabel ?? (input.source === 'demo' ? 'Demo data' : input.source === 'upload' ? 'Uploaded workspace data' : 'Configured source'),
      permissionsContext: input.permissionsContext ?? (input.source === 'demo' ? 'Local opt-in sample inventory; not a live provider feed.' : input.source === 'upload' ? 'User-uploaded creative; workspace permission assumed.' : 'Provider permissions must be verified before ingesting live data.'),
    },
    source: input.source,
    data_status: dataStatus,
    provider,
    country: input.country,
    market: input.market,
    permissionsContext: input.permissionsContext ?? (input.source === 'demo' ? 'Local opt-in sample inventory; not a live provider feed.' : input.source === 'upload' ? 'User-uploaded creative; workspace permission assumed.' : 'Provider permissions must be verified before ingesting live data.'),
    ingestedAt,
    freshnessState: freshnessStateFor(lastSeenAt),
    confidence: input.source === 'demo' ? 0.72 : input.source === 'upload' ? 0.95 : 0.5,
    contentHash: hash,
    createdAt: ingestedAt,
    updatedAt,
  };
}
