import { NextResponse } from 'next/server';
import { metaAdsCollectorService, AdCollectionRequest } from '@/lib/server/meta-ads-collector';
import { newRequestId } from '@/lib/server/domain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getRequestId(req: Request): string {
  return req.headers.get('x-request-id') || newRequestId();
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const status = metaAdsCollectorService.getStatus();
  return NextResponse.json(
    {
      ok: true,
      requestId,
      collector: status,
    },
    { status: 200 }
  );
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const body = (await request.json().catch(() => ({}))) as AdCollectionRequest;

    const result = await metaAdsCollectorService.collect({
      competitor: body.competitor,
      pageName: body.pageName,
      keyword: body.keyword,
      query: body.query,
      country: body.country,
      activeStatus: body.activeStatus,
      mediaType: body.mediaType,
      maxAds: body.maxAds,
      cursor: body.cursor,
      analyze: body.analyze,
    });

    return NextResponse.json(
      {
        ok: result.success || result.status === 'NO_RESULTS',
        requestId,
        success: result.success,
        status: result.status,
        query: result.query,
        country: result.country,
        recordsFetched: result.recordsFetched,
        recordsInserted: result.recordsInserted,
        recordsUpdated: result.recordsUpdated,
        recordsSkipped: result.recordsSkipped,
        duplicates: result.duplicates,
        nextCursor: result.nextCursor,
        durationMs: result.durationMs,
        ads: result.ads,
        diagnostic: result.diagnostic,
        error: result.error,
      },
      {
        status: result.status === 'ERROR' ? 500 : 200,
        headers: { 'x-request-id': requestId },
      }
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Meta Ads Collection failed.';
    return NextResponse.json(
      {
        ok: false,
        requestId,
        success: false,
        status: 'ERROR',
        error: errorMsg,
        diagnostic: {
          collectorEngine: 'MetaAdsCollector',
          runtime: 'Node.js',
          message: errorMsg,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
