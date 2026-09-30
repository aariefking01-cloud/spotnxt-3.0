import { spawn } from 'child_process';
import path from 'path';
import crypto from 'crypto';
import {
  CanonicalAd,
  AdObservation,
  AdStatus,
  CreativeType,
  AdPlatform,
  nowIso,
  newId,
  freshnessStateFor,
} from './domain';
import { upsertAds, getState, saveSyncRun, getAd as getStoreAd, saveAnalysis } from './store';
import { analyzeAdWithLLM } from './llm';

export interface AdCollectionRequest {
  competitor?: string;
  pageName?: string;
  keyword?: string;
  query?: string;
  country?: string;
  activeStatus?: 'ACTIVE' | 'ALL' | 'INACTIVE';
  mediaType?: 'ALL' | 'IMAGE' | 'VIDEO';
  maxAds?: number;
  cursor?: string;
  analyze?: boolean;
}

export interface AdCollectionResponse {
  success: boolean;
  status: 'LIVE' | 'NO_RESULTS' | 'UNAVAILABLE' | 'RATE_LIMITED' | 'ERROR';
  query: string;
  country: string;
  recordsFetched: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  duplicates: number;
  nextCursor?: string | null;
  durationMs: number;
  ads: CanonicalAd[];
  error?: string;
  diagnostic: {
    collectorEngine: string;
    runtime: string;
    message: string;
    actionRequired?: string;
    timestamp: string;
  };
}

export interface RawMetaAdRecord {
  id?: string;
  ad_archive_id?: string;
  archive_id?: string;
  ad_library_id?: string;
  page_id?: string;
  page_name?: string;
  page_profile_picture_url?: string;
  is_active?: boolean;
  ad_status?: string;
  start_date?: string | number;
  end_date?: string | number;
  creation_time?: string | number;
  delivery_start_time?: string | number;
  delivery_stop_time?: string | number;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  link_description?: string;
  link_url?: string;
  cta_text?: string;
  cta_type?: string;
  image_url?: string;
  images?: Array<string | { url?: string; original_image_url?: string; resized_image_url?: string }>;
  video_url?: string;
  video_hd_url?: string;
  video_sd_url?: string;
  videos?: Array<string | { video_hd_url?: string; video_sd_url?: string; video_preview_image_url?: string }>;
  thumbnail_url?: string;
  publisher_platforms?: string[];
  publisher_platform?: string[];
  publisherPlatforms?: string[];
  languages?: string[];
  impressions?: { lower_bound?: number; upper_bound?: number } | string;
  spend?: { lower_bound?: number; upper_bound?: number; currency?: string } | string;
  snapshot?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Normalizes raw collected ad nodes from MetaAdsCollector into Spotnxt CanonicalAd schema.
 */
export function normalizeCollectedAd(raw: RawMetaAdRecord, queryCountry = 'US'): CanonicalAd {
  const archiveId = String(
    raw.id ||
    raw.ad_archive_id ||
    raw.archive_id ||
    raw.ad_library_id ||
    (raw.snapshot && (raw.snapshot as Record<string, unknown>).id) ||
    newId('meta_ad')
  );

  const pageId = raw.page_id ? String(raw.page_id) : undefined;
  const pageName = raw.page_name || 'Advertiser';
  const advertiserId = pageId || pageName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // Determine active status
  let status: AdStatus = 'Active';
  if (raw.is_active === false || raw.ad_status === 'INACTIVE') {
    status = 'Inactive';
  } else if (raw.delivery_stop_time) {
    const stopMs = typeof raw.delivery_stop_time === 'number'
      ? raw.delivery_stop_time * (raw.delivery_stop_time < 10000000000 ? 1000 : 1)
      : new Date(String(raw.delivery_stop_time)).getTime();
    if (!isNaN(stopMs) && stopMs < Date.now()) {
      status = 'Inactive';
    }
  }

  // Format dates
  const now = nowIso();
  let startDate: string | undefined;
  if (raw.start_date || raw.delivery_start_time || raw.creation_time) {
    const rawVal = raw.delivery_start_time || raw.start_date || raw.creation_time;
    const ms = typeof rawVal === 'number' ? rawVal * (rawVal < 10000000000 ? 1000 : 1) : new Date(String(rawVal)).getTime();
    if (!isNaN(ms)) startDate = new Date(ms).toISOString();
  }

  let endDate: string | undefined;
  if (raw.end_date || raw.delivery_stop_time) {
    const rawVal = raw.delivery_stop_time || raw.end_date;
    const ms = typeof rawVal === 'number' ? rawVal * (rawVal < 10000000000 ? 1000 : 1) : new Date(String(rawVal)).getTime();
    if (!isNaN(ms)) endDate = new Date(ms).toISOString();
  }

  const firstSeenAt = startDate || now;
  const lastSeenAt = endDate || now;
  const durationDays = startDate
    ? Math.max(1, Math.round((new Date(lastSeenAt).getTime() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000)))
    : 1;

  // Creative assets
  let videoUrl: string | undefined;
  if (raw.video_hd_url || raw.video_sd_url || raw.video_url) {
    videoUrl = raw.video_hd_url || raw.video_sd_url || raw.video_url;
  } else if (Array.isArray(raw.videos) && raw.videos.length > 0) {
    const firstVid = raw.videos[0];
    if (typeof firstVid === 'string') videoUrl = firstVid;
    else if (typeof firstVid === 'object' && firstVid) {
      videoUrl = firstVid.video_hd_url || firstVid.video_sd_url;
    }
  }

  let imageUrl: string | undefined = raw.image_url;
  if (!imageUrl && Array.isArray(raw.images) && raw.images.length > 0) {
    const firstImg = raw.images[0];
    if (typeof firstImg === 'string') imageUrl = firstImg;
    else if (typeof firstImg === 'object' && firstImg) {
      imageUrl = firstImg.resized_image_url || firstImg.original_image_url || firstImg.url;
    }
  }

  let thumbnailUrl = raw.thumbnail_url;
  if (!thumbnailUrl && Array.isArray(raw.videos) && raw.videos.length > 0) {
    const firstVid = raw.videos[0];
    if (typeof firstVid === 'object' && firstVid?.video_preview_image_url) {
      thumbnailUrl = firstVid.video_preview_image_url;
    }
  }
  if (!thumbnailUrl) thumbnailUrl = imageUrl;

  const mediaUrl = videoUrl || imageUrl || thumbnailUrl;

  let creativeType: CreativeType = 'Image';
  if (videoUrl) creativeType = 'Video';
  else if (Array.isArray(raw.images) && raw.images.length > 1) creativeType = 'Carousel';

  // Copy & Text
  const primaryText = raw.body || raw.caption || raw.description || '';
  const headline = raw.title || (primaryText ? primaryText.slice(0, 80) : `${pageName} Campaign`);
  const description = raw.description || raw.caption || raw.link_description || '';
  const cta = raw.cta_text || raw.cta_type || 'Learn More';
  const landingPageUrl = raw.link_url || undefined;

  // Platforms
  const pubPlatforms = raw.publisher_platforms || raw.publisher_platform || raw.publisherPlatforms || [];
  let platform: AdPlatform = 'Meta';
  if (pubPlatforms.includes('instagram') && !pubPlatforms.includes('facebook')) {
    platform = 'Instagram';
  } else if (pubPlatforms.includes('facebook') && !pubPlatforms.includes('instagram')) {
    platform = 'Facebook';
  }

  // Content Hash for deterministic deduplication
  const hashSource = [headline, primaryText, cta, mediaUrl || ''].join('|').toLowerCase();
  const contentHash = crypto.createHash('sha256').update(hashSource).digest('hex');

  const snapshotUrl: string | undefined = typeof raw.snapshot_url === 'string'
    ? raw.snapshot_url
    : archiveId
      ? `https://www.facebook.com/ads/library/?id=${archiveId}`
      : undefined;

  return {
    id: `ad_meta_${archiveId}`,
    externalId: archiveId,
    advertiserId,
    advertiserName: pageName,
    advertiserLogoUrl: raw.page_profile_picture_url || undefined,
    pageId,
    pageName,
    platform,
    status,
    firstSeenAt,
    lastSeenAt,
    last_synced_at: now,
    startDate,
    endDate,
    durationDays,
    creativeType,
    mediaUrl,
    thumbnailUrl,
    videoUrl,
    landingPageUrl,
    primaryText,
    headline,
    description,
    cta,
    destination: landingPageUrl,
    industry: 'General Commerce',
    metadata: {
      collectorEngine: 'MetaAdsCollector',
      archiveId,
      spend: raw.spend,
      impressions: raw.impressions,
      publisherPlatforms: pubPlatforms,
      languages: raw.languages,
      country: queryCountry,
    },
    source: 'meta',
    source_type: 'meta_live',
    data_status: 'verified_live',
    provider: 'Meta Ad Library (Public Collection)',
    sourceUrl: snapshotUrl,
    country: queryCountry,
    languages: raw.languages,
    permissionsContext: 'Collected from public Meta Ad Library via MetaAdsCollector.',
    ingestedAt: now,
    freshnessState: freshnessStateFor(lastSeenAt),
    confidence: 0.95,
    contentHash,
    createdAt: now,
    updatedAt: now,
  };
}

class MetaAdsCollectorService {
  private scriptPath = path.join(process.cwd(), 'lib', 'server', 'collector', 'meta_ads_collector_runner.py');
  private lastStatus: 'LIVE' | 'NO_RESULTS' | 'UNAVAILABLE' | 'RATE_LIMITED' | 'ERROR' | 'IDLE' = 'IDLE';
  private lastError: string | null = null;
  private lastCollectionAt: string | null = null;
  private totalCollectedCount = 0;

  public getStatus() {
    return {
      status: this.lastStatus,
      lastError: this.lastError,
      lastCollectionAt: this.lastCollectionAt,
      totalCollectedCount: this.totalCollectedCount,
      runnerAvailable: true,
      engine: 'MetaAdsCollector (Reverse-Engineered GraphQL)',
    };
  }

  /**
   * Run the server-side Python collector runner.
   */
  public async collect(req: AdCollectionRequest): Promise<AdCollectionResponse> {
    const startTime = Date.now();
    const query = (req.query || req.keyword || req.competitor || req.pageName || '').trim();
    const country = (req.country || 'US').trim().toUpperCase();
    const activeStatus = req.activeStatus || 'ACTIVE';
    const mediaType = req.mediaType || 'ALL';
    const maxAds = Math.min(req.maxAds || 25, 50);

    const inputPayload = {
      query,
      country,
      activeStatus,
      mediaType,
      limit: maxAds,
      cursor: req.cursor,
    };

    let runnerOutput: {
      success?: boolean;
      status?: 'LIVE' | 'NO_RESULTS' | 'UNAVAILABLE' | 'RATE_LIMITED' | 'ERROR';
      ads?: RawMetaAdRecord[];
      next_cursor?: string | null;
      duration_ms?: number;
      error?: string;
      collector_engine?: string;
    } | null = null;

    let runError: string | null = null;

    try {
      runnerOutput = await new Promise((resolve, reject) => {
        const pyProcess = spawn('python3', [this.scriptPath, '--json', JSON.stringify(inputPayload)], {
          cwd: process.cwd(),
          env: { ...process.env, PYTHONUNBUFFERED: '1' },
          timeout: 45000,
        });

        let stdoutData = '';
        let stderrData = '';

        pyProcess.stdout.on('data', (chunk) => {
          stdoutData += chunk.toString();
        });

        pyProcess.stderr.on('data', (chunk) => {
          stderrData += chunk.toString();
        });

        pyProcess.on('error', (err) => {
          reject(new Error(`Failed to spawn Python collector runner: ${err.message}`));
        });

        pyProcess.on('close', (code) => {
          if (stderrData) {
            console.log('[MetaAdsCollector stderr]:', stderrData.trim());
          }
          if (code !== 0 && !stdoutData.trim()) {
            reject(new Error(`Collector process exited with code ${code}. Stderr: ${stderrData}`));
            return;
          }
          try {
            const parsed = JSON.parse(stdoutData.trim());
            resolve(parsed);
          } catch {
            reject(new Error(`Invalid JSON output from collector: ${stdoutData.slice(0, 300)}`));
          }
        });
      });
    } catch (err) {
      runError = err instanceof Error ? err.message : String(err);
      console.warn('[MetaAdsCollector] Execution note:', runError);
    }

    const durationMs = Date.now() - startTime;
    const rawAds = runnerOutput?.ads || [];
    const status = runnerOutput?.status || (runError ? 'UNAVAILABLE' : 'NO_RESULTS');
    const nextCursor = runnerOutput?.next_cursor || null;

    this.lastStatus = status;
    this.lastError = runnerOutput?.error || runError;
    this.lastCollectionAt = nowIso();

    // Normalize collected ads
    const normalizedAds = rawAds.map((ad) => normalizeCollectedAd(ad, country));

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    if (normalizedAds.length > 0) {
      const upsertResult = await upsertAds(normalizedAds, {
        type: 'AD_DISCOVERED',
        requestId: newId('req'),
        message: `Synchronized ${normalizedAds.length} live ads via MetaAdsCollector for "${query}".`,
      });
      inserted = upsertResult.inserted;
      updated = upsertResult.updated;
      skipped = upsertResult.skipped;
      this.totalCollectedCount += inserted;

      // Asynchronously trigger AI creative analysis for new ads if requested
      if (req.analyze !== false) {
        this.enqueueAiAnalysis(normalizedAds.slice(0, 3)).catch((err) => {
          console.warn('[MetaAdsCollector] AI background analysis error:', err);
        });
      }
    }

    // Save sync run record for provenance tracking
    await saveSyncRun({
      id: newId('sync'),
      provider: 'meta-ad-library',
      query,
      country,
      activeStatus,
      pagesFetched: rawAds.length > 0 ? 1 : 0,
      recordsFetched: rawAds.length,
      recordsInserted: inserted,
      recordsUpdated: updated,
      recordsSkipped: skipped,
      status: status === 'LIVE' ? 'completed' : 'error',
      startedAt: new Date(startTime).toISOString(),
      completedAt: nowIso(),
      error: this.lastError || undefined,
      cursor: nextCursor || undefined,
    });

    let actionRequired: string | undefined;
    let diagnosticMessage = '';

    if (status === 'LIVE') {
      diagnosticMessage = `Successfully collected ${rawAds.length} live ads from public Meta Ad Library for "${query}".`;
    } else if (status === 'RATE_LIMITED') {
      diagnosticMessage = 'Meta Ad Library GraphQL interface rate limit reached. Backing off automatically.';
      actionRequired = 'Wait a few moments before requesting more batches or rotate queries.';
    } else if (status === 'NO_RESULTS') {
      diagnosticMessage = `No active Meta Ad Library ads found for query "${query}" in country ${country}.`;
    } else {
      diagnosticMessage = this.lastError || 'Live collection endpoint encountered access challenge or network restriction.';
      actionRequired = 'Meta public GraphQL interface may require browser challenge completion or token authentication.';
    }

    return {
      success: status === 'LIVE',
      status,
      query,
      country,
      recordsFetched: rawAds.length,
      recordsInserted: inserted,
      recordsUpdated: updated,
      recordsSkipped: skipped,
      duplicates: updated + skipped,
      nextCursor,
      durationMs,
      ads: normalizedAds,
      error: this.lastError || undefined,
      diagnostic: {
        collectorEngine: 'MetaAdsCollector (Reverse-Engineered GraphQL API)',
        runtime: 'Node.js / Python 3.10',
        message: diagnosticMessage,
        actionRequired,
        timestamp: nowIso(),
      },
    };
  }

  /**
   * Triggers AdVision AI pipeline on collected ads in the background.
   */
  private async enqueueAiAnalysis(ads: CanonicalAd[]): Promise<void> {
    for (const ad of ads) {
      try {
        const analysis = await analyzeAdWithLLM(ad, []);
        await saveAnalysis({
          id: newId('ana'),
          adId: ad.id,
          result: analysis.result,
          evidence: [],
          model: analysis.model,
          promptVersion: 'spotnxt-intelligence-v6',
          confidence: analysis.confidence,
          limitations: analysis.limitations,
          visionAnalyzed: analysis.visionAnalyzed,
          createdAt: nowIso(),
        });
      } catch (err) {
        console.warn(`[MetaAdsCollector] Could not analyze ad ${ad.id}:`, err);
      }
    }
  }
}

export const metaAdsCollectorService = new MetaAdsCollectorService();
