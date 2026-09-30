import { NextResponse } from 'next/server';
import { searchStoredAds, getState } from '@/lib/server/store';
import { newRequestId } from '@/lib/server/domain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getRequestId(req: Request): string {
  return req.headers.get('x-request-id') || newRequestId();
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const url = new URL(request.url);
    const params = url.searchParams;

    const query = params.get('query') || params.get('search') || params.get('keyword') || undefined;
    const advertiserId = params.get('advertiserId') || params.get('pageId') || params.get('pageName') || undefined;
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

    const searchResult = await searchStoredAds({
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
    });

    const state = await getState();
    const liveCount = state.ads.filter((a) => a.source === 'meta' || a.data_status === 'verified_live' || a.data_status === 'live').length;

    return NextResponse.json(
      {
        ok: true,
        requestId,
        ads: searchResult.ads,
        pagination: searchResult.pagination,
        totalInStore: state.ads.length,
        totalLiveAds: liveCount,
        sourceLabel: liveCount > 0 ? 'Meta Ad Library (Public Collection & Live Store)' : 'SpotNxt Unified Store',
      },
      {
        status: 200,
        headers: { 'x-request-id': requestId },
      }
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to query ads.';
    return NextResponse.json(
      {
        ok: false,
        requestId,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
