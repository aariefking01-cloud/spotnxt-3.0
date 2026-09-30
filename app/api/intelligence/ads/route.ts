import { jsonError, jsonOk, readJson, requestIdFrom, requiredString } from '@/lib/server/http';
import { CanonicalAd } from '@/lib/server/domain';
import { ingestUploadedAd } from '@/lib/server/providers';
import { getState } from '@/lib/server/store';
import { adIntelligenceEngine } from '@/lib/server/ad-data-provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    const url = new URL(request.url);
    const params = url.searchParams;

    const query = params.get('query') || params.get('search') || undefined;
    const advertiserId = params.get('advertiserId') || undefined;
    const platform = params.get('platform') || undefined;
    const creativeType = params.get('creativeType') || undefined;
    const status = params.get('status') || undefined;
    const country = params.get('country') || undefined;
    const source = params.get('source') || undefined;
    const dataStatus = (params.get('dataStatus') || 'ALL') as 'ALL' | 'live' | 'historical' | 'demo';
    const hook = params.get('hook') || undefined;
    const offer = params.get('offer') || undefined;
    const minDurationDays = params.get('minDurationDays') ? parseInt(params.get('minDurationDays')!, 10) : undefined;
    const sort = (params.get('sort') || 'newest') as 'newest' | 'oldest' | 'duration' | 'longest_running' | 'advertiser' | 'relevance';
    const page = parseInt(params.get('page') || '1', 10);
    const pageSize = parseInt(params.get('pageSize') || params.get('limit') || '24', 10);
    const liveSync = params.get('liveSync') === 'true' || params.get('sync') === 'true';

    // Extract user token from headers or query params
    const tokenHeader = request.headers.get('x-meta-access-token');
    const authHeader = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const tokenParam = params.get('token') || params.get('accessToken');
    const accessToken = tokenHeader || tokenParam || authHeader || undefined;

    const searchResult = await adIntelligenceEngine.searchAds({
      query,
      advertiserId,
      platform,
      creativeType,
      status,
      country,
      source,
      dataStatus,
      hook,
      offer,
      minDurationDays,
      sort,
      page,
      pageSize,
      accessToken,
      liveSync,
    });

    const state = await getState();

    return jsonOk(
      {
        ads: searchResult.ads,
        pagination: searchResult.pagination,
        provider: searchResult.provider,
        sourceType: searchResult.sourceType,
        sourceLabel: searchResult.sourceLabel,
        totalInStore: state.ads.length,
        isConfigured: searchResult.isConfigured,
        liveRecordsReturned: searchResult.liveRecordsReturned ?? 0,
        diagnostic: searchResult.diagnostic,
      },
      requestId
    );
  } catch (error) {
    return jsonError(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    const body = await readJson(request);
    const ad = await ingestUploadedAd({
      advertiserName: requiredString(body, 'advertiserName'),
      headline: requiredString(body, 'headline'),
      primaryText: typeof body.primaryText === 'string' ? body.primaryText : '',
      cta: typeof body.cta === 'string' ? body.cta : 'Learn More',
      platform: (typeof body.platform === 'string' ? body.platform : 'Uploaded') as CanonicalAd['platform'],
      creativeType: (typeof body.creativeType === 'string' ? body.creativeType : 'Image') as CanonicalAd['creativeType'],
      mediaUrl: typeof body.mediaUrl === 'string' ? body.mediaUrl : undefined,
      landingPageUrl: typeof body.landingPageUrl === 'string' ? body.landingPageUrl : undefined,
    });
    return jsonOk({ ad }, requestId, 201);
  } catch (error) {
    return jsonError(error, requestId);
  }
}
