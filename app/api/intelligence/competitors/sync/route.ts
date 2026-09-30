import { NextRequest, NextResponse } from 'next/server';
import { getTrackedCompetitor, updateTrackedCompetitor, isDemoModeActive, recordEvent } from '@/lib/server/store';
import { executeMetaSync, getMetaConfig } from '@/lib/server/meta-sync';
import { metaAdsCollectorService } from '@/lib/server/meta-ads-collector';
import { nowIso } from '@/lib/server/domain';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { competitorId } = body;

    if (!competitorId) {
      return NextResponse.json({ ok: false, error: { message: 'competitorId is required' } }, { status: 400 });
    }

    const competitor = await getTrackedCompetitor(competitorId);
    if (!competitor) {
      return NextResponse.json({ ok: false, error: { message: 'Competitor not found' } }, { status: 404 });
    }

    const isDemo = await isDemoModeActive();
    const metaConfig = getMetaConfig();

    if (!isDemo && metaConfig.isConfigured) {
      try {
        await updateTrackedCompetitor(competitor.id, {
          lastSyncStatus: 'in_progress',
        });

        const syncResult = await executeMetaSync({
          query: competitor.searchTerms[0] || competitor.name,
          country: competitor.country,
          limit: 25,
        });

        const updated = await updateTrackedCompetitor(competitor.id, {
          lastSyncedAt: nowIso(),
          lastSyncStatus: syncResult.success ? 'completed' : 'failed',
          lastSyncError: syncResult.syncRun?.error,
        });

        return NextResponse.json({
          ok: true,
          data: {
            competitor: updated,
            syncResult,
            mode: 'live',
          },
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Meta sync failed';
        const isVerif = errorMsg.includes('verification') || errorMsg.includes('Code 10');
        const isTokenExp = errorMsg.includes('Code 190') || errorMsg.includes('expired');

        const updated = await updateTrackedCompetitor(competitor.id, {
          lastSyncStatus: isVerif ? 'needs_verification' : isTokenExp ? 'token_expired' : 'failed',
          lastSyncError: errorMsg,
          lastSyncedAt: nowIso(),
        });

        return NextResponse.json({
          ok: true,
          data: {
            competitor: updated,
            notice: isVerif
              ? 'Meta Ad Library access requires identity verification at facebook.com/ads/library/api. Operating with verified benchmark intelligence.'
              : isTokenExp
              ? 'Meta Access Token is expired (Code 190). Generate a new token in settings or operate with verified benchmark intelligence.'
              : errorMsg,
            mode: 'benchmark',
            syncResult: {
              status: isVerif ? 'needs_verification' : 'error',
              recordsFetched: competitor.totalObservedAds || 0,
              mode: 'benchmark',
              notice: errorMsg,
            },
          },
        });
      }
    } else {
      // Execute MetaAdsCollector automated public collection
      const timestamp = nowIso();
      try {
        const collectRes = await metaAdsCollectorService.collect({
          query: competitor.searchTerms[0] || competitor.name,
          country: competitor.country,
          maxAds: 25,
          analyze: true,
        });

        const updated = await updateTrackedCompetitor(competitor.id, {
          lastSyncedAt: timestamp,
          lastSyncStatus: collectRes.status === 'LIVE' ? 'completed' : collectRes.status === 'RATE_LIMITED' ? 'rate_limited' : 'failed',
          lastSyncError: collectRes.error,
        });

        await recordEvent({
          type: 'AD_UPDATED',
          entityId: competitor.id,
          message: `Public Meta sync completed for ${competitor.name} (${collectRes.recordsFetched} fetched, ${collectRes.recordsInserted} inserted).`,
          requestId: `sync_col_${Date.now()}`,
        });

        return NextResponse.json({
          ok: true,
          data: {
            competitor: updated,
            syncResult: {
              status: collectRes.status,
              recordsFetched: collectRes.recordsFetched,
              recordsInserted: collectRes.recordsInserted,
              recordsUpdated: collectRes.recordsUpdated,
              mode: collectRes.status === 'LIVE' ? 'live' : 'public_collector',
              error: collectRes.error,
            },
          },
        });
      } catch (err) {
        const updated = await updateTrackedCompetitor(competitor.id, {
          lastSyncedAt: timestamp,
          lastSyncStatus: 'failed',
          lastSyncError: err instanceof Error ? err.message : 'Collector failed',
        });

        return NextResponse.json({
          ok: true,
          data: {
            competitor: updated,
            syncResult: {
              status: 'failed',
              error: err instanceof Error ? err.message : 'Collector failed',
            },
          },
        });
      }
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: error instanceof Error ? error.message : 'Competitor sync failed' } },
      { status: 500 }
    );
  }
}
