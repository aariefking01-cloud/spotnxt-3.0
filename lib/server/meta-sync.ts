import { AppError, CanonicalAd, AdSyncRun, MetaRawAdArchiveRow, newId, nowIso, freshnessStateFor } from './domain';
import { saveSyncRun, upsertAds, getState } from './store';

export interface MetaSyncOptions {
  accessToken?: string;
  queries?: string[];
  query?: string;
  country?: string;
  activeStatus?: 'ACTIVE' | 'ALL' | 'INACTIVE';
  adType?: string;
  maxPages?: number;
  maxRecords?: number;
  limitPerPage?: number;
  limit?: number;
}

export interface MetaSyncResult {
  success: boolean;
  provider: 'meta';
  syncRun: AdSyncRun;
  pagesFetched: number;
  recordsFetched: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  totalLiveInStore: number;
  queriesExecuted: string[];
}

export interface MetaConnectionValidation {
  valid: boolean;
  status: 'connected' | 'invalid_token' | 'permission_denied' | 'rate_limited' | 'network_error' | 'not_configured' | 'error';
  message: string;
  metaCode?: number;
  metaSubcode?: number;
  userTitle?: string;
  userMsg?: string;
  actionRequired?: string;
  httpStatus?: number;
  metaErrorType?: string;
  realAdsReturned?: number;
  diagnostic?: MetaSinglePageDiagnosticResult;
}

export interface MetaSinglePageDiagnosticResult {
  httpStatus: number;
  metaErrorCode: number | null;
  metaErrorSubcode: number | null;
  metaErrorType: string | null;
  metaErrorMessage: string | null;
  liveRequestSuccessful: 'YES' | 'NO';
  realAdsReturned: number;
  pagination: 'NOT TESTED YET';
  tokenExposedToFrontend: 'NO';
  mockDataUsed: 'NO';
  endpoint: string;
  apiVersion: string;
  parametersSent: Record<string, string>;
  actionRequired?: string;
}

let dynamicMetaToken: string | null = null;

export function setDynamicMetaToken(token: string | null) {
  dynamicMetaToken = token ? token.trim() : null;
  clearTokenVerificationCache();
}

export function getDynamicMetaToken(): string | null {
  return dynamicMetaToken;
}

export function clearDynamicMetaToken() {
  dynamicMetaToken = null;
  clearTokenVerificationCache();
}

export function getMetaConfig() {
  const accessToken = dynamicMetaToken || process.env.META_ACCESS_TOKEN?.trim();
  const graphUrl = process.env.META_GRAPH_API_URL?.trim() || 'https://graph.facebook.com/v21.0/ads_archive';
  const defaultSearchTerms = process.env.META_SEARCH_TERMS?.trim();
  const defaultCountry = process.env.META_REACHED_COUNTRY?.trim() || 'US';
  const defaultActiveStatus = (process.env.META_AD_ACTIVE_STATUS?.trim() || 'ALL') as 'ACTIVE' | 'ALL' | 'INACTIVE';
  const maxPages = Number(process.env.META_AD_LIBRARY_MAX_PAGES) || 10;
  const maxRecords = Number(process.env.META_AD_LIBRARY_MAX_RECORDS) || 500;
  const limitPerPage = Number(process.env.META_AD_LIBRARY_PAGE_SIZE || process.env.META_AD_LIBRARY_LIMIT) || 25;
  const fields = process.env.META_AD_LIBRARY_FIELDS?.trim() ||
    'id,page_id,page_name,ad_creation_time,ad_delivery_start_time,ad_delivery_stop_time,ad_creative_bodies,ad_creative_link_titles,ad_creative_link_captions,ad_creative_link_descriptions,ad_snapshot_url,publisher_platforms,languages';

  return {
    isConfigured: Boolean(accessToken),
    isDynamic: Boolean(dynamicMetaToken),
    accessToken,
    graphUrl,
    defaultSearchTerms,
    defaultCountry,
    defaultActiveStatus,
    maxPages,
    maxRecords,
    limitPerPage,
    fields,
  };
}

export function normalizeMetaAdArchiveRow(row: MetaRawAdArchiveRow, country: string, queryTerm: string): CanonicalAd {
  const bodies = Array.isArray(row.ad_creative_bodies)
    ? row.ad_creative_bodies.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
  const titles = Array.isArray(row.ad_creative_link_titles)
    ? row.ad_creative_link_titles.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
  const captions = Array.isArray(row.ad_creative_link_captions)
    ? row.ad_creative_link_captions.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
  const descriptions = Array.isArray(row.ad_creative_link_descriptions)
    ? row.ad_creative_link_descriptions.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

  const headline = titles[0] || captions[0] || descriptions[0] || (row.page_name ? `${row.page_name} Ad` : 'Meta Advertisement');
  const primaryText = bodies[0] || captions[0] || descriptions[0] || 'Ad creative content available in Meta Ad Library snapshot.';
  const cta = captions[0] || 'Learn More';
  const snapshotUrl = typeof row.ad_snapshot_url === 'string' ? row.ad_snapshot_url : undefined;

  const firstSeenAt = typeof row.ad_creation_time === 'string'
    ? row.ad_creation_time
    : typeof row.ad_delivery_start_time === 'string'
    ? row.ad_delivery_start_time
    : nowIso();

  const lastSeenAt = typeof row.ad_delivery_stop_time === 'string'
    ? row.ad_delivery_stop_time
    : typeof row.ad_delivery_start_time === 'string'
    ? row.ad_delivery_start_time
    : firstSeenAt;

  const isEnded = Boolean(row.ad_delivery_stop_time && new Date(row.ad_delivery_stop_time).getTime() < Date.now());
  const status = isEnded ? 'Ended' : 'Active';

  let creativeType: CanonicalAd['creativeType'] = 'Image';
  const platforms = Array.isArray(row.publisher_platforms) ? row.publisher_platforms : [];
  if (platforms.some((p) => typeof p === 'string' && (p.toLowerCase().includes('reel') || p.toLowerCase().includes('story')))) {
    creativeType = 'Story';
  } else if (titles.length > 1 || bodies.length > 1) {
    creativeType = 'Carousel';
  }

  const advertiserName = row.page_name || (row.page_id ? `Meta Page ${row.page_id}` : queryTerm || 'Meta Advertiser');
  const advertiserId = (row.page_id || advertiserName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'unknown-advertiser';

  const metadata: Record<string, unknown> = {
    provider: 'meta-ad-library',
    sourceLabel: 'Meta Ad Library',
    metaAdId: row.id,
    pageId: row.page_id,
    pageName: row.page_name,
    adCreationTime: row.ad_creation_time,
    adDeliveryStartTime: row.ad_delivery_start_time,
    adDeliveryStopTime: row.ad_delivery_stop_time,
    queryTerm,
    country,
    publisherPlatforms: row.publisher_platforms,
    languages: row.languages,
    currency: row.currency,
    bylines: row.bylines,
    demographicDistribution: row.demographic_distribution,
    deliveryByRegion: row.delivery_by_region,
    rawSpend: row.spend,
    rawImpressions: row.impressions,
    targetAges: row.target_ages,
    targetGender: row.target_gender,
    targetLocations: row.target_locations,
  };

  const id = `meta_${row.id}`;
  const now = nowIso();

  const durationDays = typeof row.ad_delivery_start_time === 'string'
    ? Math.max(1, Math.round((Date.now() - new Date(row.ad_delivery_start_time).getTime()) / (24 * 60 * 60 * 1000)))
    : 1;

  return {
    id,
    externalId: String(row.id),
    advertiserId,
    advertiserName,
    pageId: row.page_id,
    pageName: row.page_name,
    platform: 'Meta',
    status,
    firstSeenAt,
    lastSeenAt,
    last_synced_at: now,
    startDate: typeof row.ad_delivery_start_time === 'string' ? row.ad_delivery_start_time : undefined,
    endDate: typeof row.ad_delivery_stop_time === 'string' ? row.ad_delivery_stop_time : undefined,
    durationDays,
    creativeType,
    mediaUrl: snapshotUrl,
    thumbnailUrl: snapshotUrl,
    landingPageUrl: snapshotUrl,
    primaryText,
    headline,
    description: descriptions[0] || undefined,
    cta,
    destination: snapshotUrl,
    metadata,
    source: 'meta',
    data_status: 'live',
    provider: 'Meta Ad Library',
    sourceUrl: snapshotUrl,
    country: country.toUpperCase(),
    market: country.toUpperCase() === 'IN' ? 'IN' : 'GLOBAL',
    permissionsContext: 'Retrieved via official Meta Ad Library API with authorized token; no metrics fabricated.',
    ingestedAt: now,
    freshnessState: freshnessStateFor(lastSeenAt),
    confidence: 0.95,
    contentHash: `meta_hash_${row.id}`,
    rawProviderData: row as Record<string, unknown>,
    observations: [
      {
        id: `obs_${row.id}_1`,
        adId: id,
        observedAt: now,
        type: 'DISCOVERED',
        status,
        headline,
        primaryText,
        mediaUrl: snapshotUrl,
        notes: `Observed via live Meta Ad Library query for "${queryTerm}" in ${country}.`,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

interface TokenVerificationCacheEntry {
  status: 'connected' | 'permission_denied' | 'invalid_token' | 'rate_limited' | 'error';
  checkedAt: number;
  metaCode?: number;
  metaSubcode?: number;
  metaMessage?: string;
  actionRequired?: string;
  realAdsReturned?: number;
}

const tokenVerificationCache = new Map<string, TokenVerificationCacheEntry>();
const TOKEN_CONNECTED_TTL_MS = 30 * 60 * 1000; // 30 minutes cache for verified working tokens
const TOKEN_DENIED_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours cache for unverified/expired tokens (until user updates token)

export function getCachedTokenStatus(token: string): TokenVerificationCacheEntry | null {
  const cached = tokenVerificationCache.get(token);
  if (!cached) return null;
  const ttl = cached.status === 'connected' ? TOKEN_CONNECTED_TTL_MS : TOKEN_DENIED_TTL_MS;
  if (Date.now() - cached.checkedAt > ttl) {
    tokenVerificationCache.delete(token);
    return null;
  }
  return cached;
}

export function setCachedTokenStatus(token: string, entry: Omit<TokenVerificationCacheEntry, 'checkedAt'>) {
  tokenVerificationCache.set(token, { ...entry, checkedAt: Date.now() });
}

export function clearTokenVerificationCache() {
  tokenVerificationCache.clear();
}

/**
 * Safe server-side fetch with retry and non-secret diagnostic logging
 */
async function fetchWithRetry(
  url: string,
  logContext: { endpoint: string; query?: string; country?: string; page: number },
  maxRetries = 2
): Promise<{ response: Response; payload: Record<string, unknown> }> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    try {
      const startTime = Date.now();
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      const durationMs = Date.now() - startTime;
      const contentType = response.headers.get('content-type') || '';
      let payload: Record<string, unknown> = {};

      if (contentType.includes('application/json')) {
        try {
          payload = (await response.json()) as Record<string, unknown>;
        } catch {
          payload = {};
        }
      } else {
        const text = await response.text().catch(() => '');
        payload = { rawText: text };
      }

      if (payload.error) {
        const errObj = payload.error as Record<string, unknown>;
        const code = Number(errObj.code) || 0;
        const subcode = Number(errObj.error_subcode) || 0;
        const msg = typeof errObj.message === 'string' ? errObj.message : '';
        const userMsg = typeof errObj.error_user_msg === 'string' ? errObj.error_user_msg : '';

        const token = new URL(url).searchParams.get('access_token');
        if (token) {
          if (code === 10 || code === 200 || code === 294 || subcode === 2332002) {
            setCachedTokenStatus(token, {
              status: 'permission_denied',
              metaCode: code,
              metaSubcode: subcode,
              metaMessage: userMsg || msg || 'Application does not have permission for this action',
              actionRequired: 'Complete identity verification and agree to the Ad Library API Terms at https://www.facebook.com/ads/library/api',
              realAdsReturned: 0,
            });
          } else if (code === 190) {
            setCachedTokenStatus(token, {
              status: 'invalid_token',
              metaCode: code,
              metaSubcode: subcode,
              metaMessage: userMsg || msg || 'Meta Access Token is invalid or expired',
              actionRequired: 'Generate a fresh User Access Token at https://developers.facebook.com/tools/explorer/',
              realAdsReturned: 0,
            });
          }
        }
      }

      if (response.status === 429) {
        attempt += 1;
        if (attempt <= maxRetries) {
          const waitMs = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }
      }

      return { response, payload };
    } catch (err) {
      lastError = err;
      attempt += 1;
      if (attempt <= maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
    }
  }

  throw new AppError(
    'META_NETWORK_ERROR',
    lastError instanceof Error ? lastError.message : 'Failed to communicate with Meta Graph API.',
    502
  );
}

/**
 * Executes a single-page live test against the official Meta Ad Library API.
 * Never exposes the access token, uses minimal valid parameters, and captures exact diagnostics.
 */
export async function executeSinglePageMetaTest(options?: {
  token?: string;
  query?: string;
  country?: string;
  skipCache?: boolean;
}): Promise<MetaSinglePageDiagnosticResult> {
  const config = getMetaConfig();
  const token = options?.token?.trim() || config.accessToken;
  const query = options?.query?.trim() || 'Nike';
  const country = (options?.country?.trim() || 'US').toUpperCase();
  const validCountry = country === 'ALL' || country === 'GLOBAL' ? 'US' : country;

  const url = new URL(config.graphUrl);
  // Match the API version from graphUrl
  const apiVersionMatch = config.graphUrl.match(/\/(v\d+\.\d+)\//);
  const apiVersion = apiVersionMatch ? apiVersionMatch[1] : 'v21.0';

  const parametersSent: Record<string, string> = {
    search_terms: query,
    ad_reached_countries: JSON.stringify([validCountry]),
    ad_active_status: 'ALL',
    ad_type: 'ALL',
    fields: 'id,page_id,page_name,ad_creation_time,ad_delivery_start_time,ad_delivery_stop_time,ad_creative_bodies,ad_creative_link_titles,ad_creative_link_captions,ad_creative_link_descriptions,ad_snapshot_url,publisher_platforms,languages',
    limit: '5',
  };

  if (!token) {
    return {
      httpStatus: 400,
      metaErrorCode: null,
      metaErrorSubcode: null,
      metaErrorType: 'ConfigurationError',
      metaErrorMessage: 'No Meta Access Token provided or configured.',
      liveRequestSuccessful: 'NO',
      realAdsReturned: 0,
      pagination: 'NOT TESTED YET',
      tokenExposedToFrontend: 'NO',
      mockDataUsed: 'NO',
      endpoint: config.graphUrl,
      apiVersion,
      parametersSent,
      actionRequired: 'Provide a Meta User Access Token.',
    };
  }

  // Check cache unless explicitly skipped
  if (!options?.skipCache) {
    const cached = getCachedTokenStatus(token);
    if (cached) {
      if (cached.status === 'permission_denied') {
        return {
          httpStatus: 400,
          metaErrorCode: cached.metaCode || 10,
          metaErrorSubcode: cached.metaSubcode || 2332002,
          metaErrorType: 'OAuthException',
          metaErrorMessage: cached.metaMessage || 'Application does not have permission for this action',
          liveRequestSuccessful: 'NO',
          realAdsReturned: 0,
          pagination: 'NOT TESTED YET',
          tokenExposedToFrontend: 'NO',
          mockDataUsed: 'NO',
          endpoint: config.graphUrl,
          apiVersion,
          parametersSent,
          actionRequired: cached.actionRequired,
        };
      }
      if (cached.status === 'invalid_token') {
        return {
          httpStatus: 400,
          metaErrorCode: 190,
          metaErrorSubcode: cached.metaSubcode || null,
          metaErrorType: 'OAuthException',
          metaErrorMessage: cached.metaMessage || 'Meta Access Token is invalid or expired',
          liveRequestSuccessful: 'NO',
          realAdsReturned: 0,
          pagination: 'NOT TESTED YET',
          tokenExposedToFrontend: 'NO',
          mockDataUsed: 'NO',
          endpoint: config.graphUrl,
          apiVersion,
          parametersSent,
          actionRequired: cached.actionRequired,
        };
      }
    }
  }

  // Set parameters on URL with token server-side only
  for (const [key, value] of Object.entries(parametersSent)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set('access_token', token);

  try {
    const { response, payload } = await fetchWithRetry(url.toString(), {
      endpoint: 'ads_archive_single_page_test',
      query,
      country: validCountry,
      page: 1,
    }, 1);

    if (response.ok && Array.isArray(payload.data)) {
      setCachedTokenStatus(token, {
        status: 'connected',
        realAdsReturned: payload.data.length,
      });
      return {
        httpStatus: response.status,
        metaErrorCode: null,
        metaErrorSubcode: null,
        metaErrorType: null,
        metaErrorMessage: null,
        liveRequestSuccessful: 'YES',
        realAdsReturned: payload.data.length,
        pagination: 'NOT TESTED YET',
        tokenExposedToFrontend: 'NO',
        mockDataUsed: 'NO',
        endpoint: config.graphUrl,
        apiVersion,
        parametersSent,
      };
    }

    const errorObj = (payload.error as Record<string, unknown>) || {};
    const metaCode = typeof errorObj.code === 'number' ? errorObj.code : Number(errorObj.code) || null;
    const metaSubcode = typeof errorObj.error_subcode === 'number' ? errorObj.error_subcode : Number(errorObj.error_subcode) || null;
    const metaType = typeof errorObj.type === 'string' ? errorObj.type : 'OAuthException';
    const metaMsg = typeof errorObj.message === 'string' ? errorObj.message : `HTTP ${response.status}`;

    let actionRequired: string | undefined;
    if (metaCode === 190) {
      actionRequired = 'Generate a fresh User Access Token at https://developers.facebook.com/tools/explorer/';
      setCachedTokenStatus(token, {
        status: 'invalid_token',
        metaCode: 190,
        metaSubcode: metaSubcode || undefined,
        metaMessage: metaMsg,
        actionRequired,
        realAdsReturned: 0,
      });
    } else if (metaCode === 10 || metaCode === 200 || metaCode === 294 || metaSubcode === 2332002) {
      actionRequired = 'Complete identity verification and agree to the Ad Library API Terms at https://www.facebook.com/ads/library/api';
      setCachedTokenStatus(token, {
        status: 'permission_denied',
        metaCode: metaCode || undefined,
        metaSubcode: metaSubcode || 2332002,
        metaMessage: metaMsg,
        actionRequired,
        realAdsReturned: 0,
      });
    }

    return {
      httpStatus: response.status,
      metaErrorCode: metaCode,
      metaErrorSubcode: metaSubcode,
      metaErrorType: metaType,
      metaErrorMessage: metaMsg,
      liveRequestSuccessful: 'NO',
      realAdsReturned: 0,
      pagination: 'NOT TESTED YET',
      tokenExposedToFrontend: 'NO',
      mockDataUsed: 'NO',
      endpoint: config.graphUrl,
      apiVersion,
      parametersSent,
      actionRequired,
    };
  } catch (err) {
    return {
      httpStatus: 502,
      metaErrorCode: null,
      metaErrorSubcode: null,
      metaErrorType: 'NetworkError',
      metaErrorMessage: err instanceof Error ? err.message : 'Failed to reach Meta Graph API.',
      liveRequestSuccessful: 'NO',
      realAdsReturned: 0,
      pagination: 'NOT TESTED YET',
      tokenExposedToFrontend: 'NO',
      mockDataUsed: 'NO',
      endpoint: config.graphUrl,
      apiVersion,
      parametersSent,
      actionRequired: 'Check network connectivity to graph.facebook.com.',
    };
  }
}

/**
 * Validates whether a token has active permission to query Meta Ad Library
 */
export async function validateMetaConnection(customToken?: string, forceCheck = false): Promise<MetaConnectionValidation> {
  const diag = await executeSinglePageMetaTest({ token: customToken, skipCache: forceCheck });

  if (diag.liveRequestSuccessful === 'YES') {
    return {
      valid: true,
      status: 'connected',
      message: `Meta Ad Library API connection verified successfully (${diag.realAdsReturned} ads returned in single-page test).`,
      httpStatus: diag.httpStatus,
      realAdsReturned: diag.realAdsReturned,
      diagnostic: diag,
    };
  }

  if (diag.metaErrorCode === 190) {
    return {
      valid: false,
      status: 'invalid_token',
      message: `Meta Access Token is invalid or expired (Code 190): ${diag.metaErrorMessage}`,
      metaCode: 190,
      metaSubcode: diag.metaErrorSubcode || undefined,
      httpStatus: diag.httpStatus,
      metaErrorType: diag.metaErrorType || 'OAuthException',
      actionRequired: diag.actionRequired,
      diagnostic: diag,
    };
  }

  if (diag.metaErrorCode === 10 || diag.metaErrorCode === 200 || diag.metaErrorCode === 294 || diag.metaErrorSubcode === 2332002) {
    return {
      valid: false,
      status: 'permission_denied',
      message: `Meta Ad Library access required (Code ${diag.metaErrorCode}${diag.metaErrorSubcode ? `, subcode ${diag.metaErrorSubcode}` : ''}): ${diag.metaErrorMessage}`,
      metaCode: diag.metaErrorCode || 10,
      metaSubcode: diag.metaErrorSubcode || undefined,
      httpStatus: diag.httpStatus,
      metaErrorType: diag.metaErrorType || 'OAuthException',
      userTitle: 'Ad Library Verification Needed',
      userMsg: "To access the API, you'll need to follow the steps at facebook.com/ads/library/api.",
      actionRequired: diag.actionRequired,
      diagnostic: diag,
    };
  }

  return {
    valid: false,
    status: diag.metaErrorCode ? 'error' : 'network_error',
    message: diag.metaErrorMessage || 'Failed to communicate with Meta Graph API.',
    metaCode: diag.metaErrorCode || undefined,
    metaSubcode: diag.metaErrorSubcode || undefined,
    httpStatus: diag.httpStatus,
    metaErrorType: diag.metaErrorType || undefined,
    actionRequired: diag.actionRequired,
    diagnostic: diag,
  };
}

export async function executeMetaSync(options: MetaSyncOptions = {}): Promise<MetaSyncResult> {
  const config = getMetaConfig();
  const effectiveToken = options.accessToken?.trim() || config.accessToken;

  if (!effectiveToken) {
    throw new AppError(
      'META_NOT_CONFIGURED',
      'Meta Ad Library is not configured. Provide your Meta Access Token in the sync dialog or set META_ACCESS_TOKEN in your environment secrets.',
      400,
      { requiredEnv: ['META_ACCESS_TOKEN'] }
    );
  }

  // Pre-check verification status from cache to avoid redundant failing requests
  const cachedStatus = getCachedTokenStatus(effectiveToken);
  if (cachedStatus && (cachedStatus.status === 'permission_denied' || cachedStatus.status === 'invalid_token')) {
    const isDenied = cachedStatus.status === 'permission_denied';
    const errText = isDenied
      ? `Meta Ad Library access required (Code ${cachedStatus.metaCode || 10}): ${cachedStatus.metaMessage || 'Application does not have permission for this action'}. Complete identity verification at facebook.com/ads/library/api.`
      : `Meta Access Token is invalid or expired (Code 190): ${cachedStatus.metaMessage || 'Token expired'}.`;

    const cachedRun: AdSyncRun = {
      id: newId('sync'),
      provider: 'meta-ad-library',
      query: options.query || options.queries?.join(', ') || 'live-sync',
      country: (options.country || config.defaultCountry).toUpperCase(),
      pagesFetched: 0,
      recordsFetched: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      startedAt: nowIso(),
      completedAt: nowIso(),
      status: 'error',
      error: errText,
      activeStatus: options.activeStatus || config.defaultActiveStatus,
    };
    await saveSyncRun(cachedRun);

    if (isDenied) {
      throw new AppError('META_VERIFICATION_REQUIRED', errText, 403, {
        syncRun: cachedRun,
        metaCode: cachedStatus.metaCode || 10,
        metaSubcode: cachedStatus.metaSubcode,
        isVerificationRequired: true,
        actionRequired: cachedStatus.actionRequired || 'Complete identity verification and agree to the terms at https://www.facebook.com/ads/library/api',
      });
    } else {
      throw new AppError('META_TOKEN_EXPIRED', errText, 401, {
        syncRun: cachedRun,
        metaCode: 190,
        isTokenExpired: true,
        actionRequired: cachedStatus.actionRequired || 'Generate a fresh User Access Token at https://developers.facebook.com/tools/explorer/',
      });
    }
  }

  // Determine queries
  let queryList: string[] = [];
  if (options.queries && options.queries.length > 0) {
    queryList = options.queries.filter((q) => q.trim().length > 0);
  } else if (options.query && options.query.trim().length > 0) {
    queryList = [options.query.trim()];
  } else if (config.defaultSearchTerms) {
    queryList = config.defaultSearchTerms.split(',').map((q) => q.trim()).filter(Boolean);
  }

  if (!queryList.length) {
    throw new AppError(
      'META_QUERY_REQUIRED',
      'At least one search brand or keyword query is required to sync Meta Ad Library ads.',
      400
    );
  }

  for (const q of queryList) {
    if (q.trim().length < 2) {
      throw new AppError(
        'META_QUERY_TOO_SHORT',
        `Search query "${q}" is too short. Meta Ad Library requires at least 2 characters for search terms.`,
        400
      );
    }
  }

  let country = (options.country || config.defaultCountry).toUpperCase();
  if (country === 'ALL' || country === 'GLOBAL') {
    country = 'ALL';
  }

  const targetCountries = (country === 'ALL' || country === 'GLOBAL')
    ? ['US', 'IN', 'GB', 'CA', 'AU']
    : [country];

  const activeStatus = options.activeStatus || config.defaultActiveStatus;
  const maxPages = options.maxPages || config.maxPages;
  const maxRecords = options.maxRecords || config.maxRecords;
  const limitPerPage = options.limitPerPage || options.limit || config.limitPerPage;

  const runId = newId('sync');
  const startedAt = nowIso();

  let totalPagesFetched = 0;
  let totalRecordsFetched = 0;
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let syncStatus: 'completed' | 'error' | 'partial' = 'completed';
  let syncError: string | undefined;
  let metaErrorPayload: Record<string, unknown> | undefined;

  const syncRun: AdSyncRun = {
    id: runId,
    provider: 'meta-ad-library',
    query: queryList.join(', '),
    country,
    pagesFetched: 0,
    recordsFetched: 0,
    recordsInserted: 0,
    recordsUpdated: 0,
    recordsSkipped: 0,
    startedAt,
    completedAt: startedAt,
    status: 'partial',
    activeStatus,
  };

  await saveSyncRun(syncRun);

  for (const queryTerm of queryList) {
    let pagesForThisQuery = 0;
    let nextUrl: string | null = null;
    let afterCursor: string | null = null;

    while (pagesForThisQuery < maxPages && totalRecordsFetched < maxRecords) {
      pagesForThisQuery += 1;
      totalPagesFetched += 1;

      let requestUrl: string;

      if (nextUrl) {
        requestUrl = nextUrl;
      } else {
        const params = new URLSearchParams({
          search_terms: queryTerm,
          ad_reached_countries: JSON.stringify(targetCountries),
          ad_active_status: activeStatus,
          ad_type: 'ALL',
          fields: config.fields,
          limit: String(limitPerPage),
          access_token: effectiveToken,
        });
        if (afterCursor) {
          params.set('after', afterCursor);
        }
        requestUrl = `${config.graphUrl}?${params.toString()}`;
      }

      try {
        const { response, payload } = await fetchWithRetry(requestUrl, {
          endpoint: 'ads_archive',
          query: queryTerm,
          country,
          page: totalPagesFetched,
        });

        if (!response.ok) {
          const errorObj = (payload.error as Record<string, unknown>) || {};
          metaErrorPayload = errorObj;
          const metaMsg = typeof errorObj.message === 'string' ? errorObj.message : `Meta API error (${response.status})`;
          const code = Number(errorObj.code) || response.status;
          const subcode = Number(errorObj.error_subcode) || 0;
          const userMsg = typeof errorObj.error_user_msg === 'string' ? errorObj.error_user_msg : '';

          if (code === 190) {
            syncError = `Meta Access Token is invalid or expired (Code 190): ${metaMsg}`;
            syncStatus = 'error';
            metaErrorPayload = {
              ...errorObj,
              code: 190,
              isTokenExpired: true,
              actionRequired: 'Generate a fresh User Access Token at https://developers.facebook.com/tools/explorer/',
            };
            break;
          } else if (code === 10 || code === 200 || code === 294 || subcode === 2332002) {
            syncError = `Meta Ad Library access required (Code ${code}${subcode ? `, subcode ${subcode}` : ''}): ${userMsg || metaMsg}. Complete Ad Library verification at https://facebook.com/ads/library/api`;
            syncStatus = 'error';
            metaErrorPayload = {
              ...errorObj,
              isVerificationRequired: true,
              actionRequired: 'Complete identity verification and agree to Ad Library API terms at https://www.facebook.com/ads/library/api',
            };
            break;
          } else if (response.status === 429 || code === 17 || code === 32 || code === 613) {
            syncError = `Meta API Rate Limit hit (${code}): ${metaMsg}`;
            syncStatus = 'partial';
            break;
          } else {
            syncError = `Meta Ad Library request failed (${response.status}, code ${code}${subcode ? `, subcode ${subcode}` : ''}): ${userMsg || metaMsg}`;
            syncStatus = 'error';
            break;
          }
        }

        const rawRows = Array.isArray(payload.data) ? (payload.data as MetaRawAdArchiveRow[]) : [];
        if (!rawRows.length) {
          // No ads returned for this query or reached end of pagination
          break;
        }

        const canonicalAds = rawRows.map((row) => normalizeMetaAdArchiveRow(row, country, queryTerm));
        totalRecordsFetched += canonicalAds.length;

        // Upsert to storage
        const upsertRes = await upsertAds(canonicalAds, {
          type: 'AD_DISCOVERED',
          message: `Synced ${canonicalAds.length} live ads for "${queryTerm}" from Meta Ad Library (Country: ${country})`,
          requestId: runId,
        });

        totalInserted += upsertRes.inserted;
        totalUpdated += upsertRes.updated;
        totalSkipped += upsertRes.skipped;

        // Check pagination
        const paging = payload.paging as { cursors?: { after?: string; before?: string }; next?: string } | undefined;
        if (paging?.next && typeof paging.next === 'string') {
          nextUrl = paging.next;
        } else if (paging?.cursors?.after) {
          afterCursor = paging.cursors.after;
          nextUrl = null;
        } else {
          // No further pages available
          break;
        }
      } catch (reqErr) {
        syncError = reqErr instanceof Error ? reqErr.message : 'Unknown Meta network error';
        syncStatus = 'error';
        break;
      }
    }

    if (syncStatus === 'error') {
      break;
    }
  }

  const completedAt = nowIso();
  const isFinalError = syncStatus === 'error' && totalRecordsFetched === 0;

  const finalRun: AdSyncRun = {
    ...syncRun,
    pagesFetched: totalPagesFetched,
    recordsFetched: totalRecordsFetched,
    recordsInserted: totalInserted,
    recordsUpdated: totalUpdated,
    recordsSkipped: totalSkipped,
    completedAt,
    status: isFinalError ? 'error' : 'completed',
    error: syncError,
  };

  await saveSyncRun(finalRun);

  if (isFinalError) {
    const isTokenExpired = Boolean(metaErrorPayload?.isTokenExpired) || syncError?.includes('Code 190');
    const isVerificationReq = Boolean(metaErrorPayload?.isVerificationRequired);

    if (isTokenExpired) {
      throw new AppError(
        'META_TOKEN_EXPIRED',
        syncError || 'Meta Access Token is invalid or has expired (Meta Error Code 190).',
        401,
        {
          syncRun: finalRun,
          metaError: metaErrorPayload,
          metaCode: 190,
          actionRequired: 'Generate a new User Access Token from Facebook Graph API Explorer (https://developers.facebook.com/tools/explorer/) and provide it in the sync drawer.',
        }
      );
    }

    if (isVerificationReq) {
      throw new AppError(
        'META_VERIFICATION_REQUIRED',
        syncError || 'Meta Ad Library API access verification required.',
        403,
        {
          syncRun: finalRun,
          metaError: metaErrorPayload,
          actionRequired: 'Complete identity verification and agree to the terms at https://www.facebook.com/ads/library/api',
        }
      );
    }

    throw new AppError('META_SYNC_FAILED', syncError || 'Meta sync failed to retrieve any records.', 502, {
      syncRun: finalRun,
      metaError: metaErrorPayload,
    });
  }

  const state = await getState();

  return {
    success: true,
    provider: 'meta',
    syncRun: finalRun,
    pagesFetched: totalPagesFetched,
    recordsFetched: totalRecordsFetched,
    recordsInserted: totalInserted,
    recordsUpdated: totalUpdated,
    recordsSkipped: totalSkipped,
    totalLiveInStore: state.ads.length,
    queriesExecuted: queryList,
  };
}
