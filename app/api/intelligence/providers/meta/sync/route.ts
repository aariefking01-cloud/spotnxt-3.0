import { NextResponse } from 'next/server';
import { executeMetaSync, getMetaConfig, validateMetaConnection } from '@/lib/server/meta-sync';
import { listSyncRuns, getLatestSyncRun, getState } from '@/lib/server/store';
import { syncSyncRunToSupabase } from '@/lib/server/db';
import { AppError, newRequestId } from '@/lib/server/domain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getRequestId(request: Request): string {
  return request.headers.get('x-request-id') || newRequestId();
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const config = getMetaConfig();
    const latestRun = await getLatestSyncRun();
    const history = await listSyncRuns(10);
    const state = await getState();
    const liveAds = state.ads.filter((a) => a.source === 'meta' || a.platform === 'Meta');

    return NextResponse.json(
      {
        ok: true,
        success: true,
        provider: 'meta',
        requestId,
        data: {
          configured: config.isConfigured,
          hasAccessToken: Boolean(config.accessToken),
          defaultCountry: config.defaultCountry,
          defaultActiveStatus: config.defaultActiveStatus,
          totalLiveAds: liveAds.length,
          totalAdvertisers: state.advertisers?.length || 0,
          latestSyncRun: latestRun || null,
          recentRuns: history,
        },
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': requestId,
        },
      }
    );
  } catch (error) {
    const appError = error instanceof AppError
      ? error
      : new AppError('META_STATUS_FAILED', error instanceof Error ? error.message : 'Failed to retrieve Meta status.', 500);

    return NextResponse.json(
      {
        ok: false,
        success: false,
        provider: 'meta',
        requestId,
        error: {
          code: appError.code,
          message: appError.message,
          details: appError.details,
        },
      },
      {
        status: appError.status,
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': requestId,
        },
      }
    );
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const body = (await request.json().catch(() => ({}))) as {
      accessToken?: string;
      queries?: string[];
      query?: string;
      country?: string;
      activeStatus?: 'ACTIVE' | 'ALL' | 'INACTIVE';
      maxPages?: number;
      maxRecords?: number;
      limitPerPage?: number;
    };

    const result = await executeMetaSync({
      accessToken: typeof body.accessToken === 'string' && body.accessToken.trim() ? body.accessToken.trim() : undefined,
      queries: Array.isArray(body.queries) ? body.queries : undefined,
      query: typeof body.query === 'string' ? body.query : undefined,
      country: typeof body.country === 'string' ? body.country : undefined,
      activeStatus: body.activeStatus,
      maxPages: typeof body.maxPages === 'number' ? body.maxPages : undefined,
      maxRecords: typeof body.maxRecords === 'number' ? body.maxRecords : undefined,
      limitPerPage: typeof body.limitPerPage === 'number' ? body.limitPerPage : undefined,
    });

    // Mirror sync run to Supabase if configured
    await syncSyncRunToSupabase(result.syncRun);

    const message = result.recordsFetched > 0
      ? `Successfully synchronized ${result.recordsFetched} live Meta ad${result.recordsFetched === 1 ? '' : 's'} across ${result.pagesFetched} page${result.pagesFetched === 1 ? '' : 's'} (${result.recordsInserted} new, ${result.recordsUpdated} updated, ${result.recordsSkipped} unchanged).`
      : `No Meta Ad Library records were returned for this query.`;

    return NextResponse.json(
      {
        ok: true,
        success: true,
        provider: 'meta',
        requestId,
        pagesFetched: result.pagesFetched,
        recordsFetched: result.recordsFetched,
        recordsInserted: result.recordsInserted,
        recordsUpdated: result.recordsUpdated,
        recordsSkipped: result.recordsSkipped,
        totalLiveInStore: result.totalLiveInStore,
        queriesExecuted: result.queriesExecuted,
        message,
        syncRun: result.syncRun,
        data: {
          message,
          pagesFetched: result.pagesFetched,
          recordsFetched: result.recordsFetched,
          recordsInserted: result.recordsInserted,
          recordsUpdated: result.recordsUpdated,
          recordsSkipped: result.recordsSkipped,
          totalLiveInStore: result.totalLiveInStore,
          syncRun: result.syncRun,
        },
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': requestId,
        },
      }
    );
  } catch (error) {
    const appError = error instanceof AppError
      ? error
      : new AppError('META_API_ERROR', error instanceof Error ? error.message : 'Meta Ad Library synchronization failed.', 500);

    return NextResponse.json(
      {
        ok: false,
        success: false,
        provider: 'meta',
        requestId,
        error: {
          code: appError.code,
          message: appError.message,
          details: appError.details,
        },
      },
      {
        status: appError.status || 500,
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': requestId,
        },
      }
    );
  }
}
