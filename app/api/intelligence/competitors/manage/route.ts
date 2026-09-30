import { NextRequest, NextResponse } from 'next/server';
import {
  listTrackedCompetitors,
  getTrackedCompetitor,
  createTrackedCompetitor,
  updateTrackedCompetitor,
  deleteTrackedCompetitor,
} from '@/lib/server/store';
import { executeMetaSync, getMetaConfig, getCachedTokenStatus } from '@/lib/server/meta-sync';
import { isDemoModeActive } from '@/lib/server/store';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const competitor = await getTrackedCompetitor(id);
      if (!competitor) {
        return NextResponse.json({ ok: false, error: { message: 'Competitor not found' } }, { status: 404 });
      }
      return NextResponse.json({ ok: true, data: competitor });
    }

    const competitors = await listTrackedCompetitors();
    return NextResponse.json({ ok: true, data: competitors });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: error instanceof Error ? error.message : 'Failed to retrieve competitors' } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, country, industry, website, searchTerms, monitoringStatus, syncFrequency, notes } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ ok: false, error: { message: 'Competitor name is required' } }, { status: 400 });
    }

    const created = await createTrackedCompetitor({
      name: name.trim(),
      country: country || 'US',
      industry: industry || 'General',
      website: website || '',
      searchTerms: Array.isArray(searchTerms) ? searchTerms.filter(Boolean) : [name.trim()],
      monitoringStatus: monitoringStatus || 'ACTIVE',
      syncFrequency: syncFrequency || 'DAILY',
      notes,
    });

    // If live Meta API is configured and demo mode is not forced, record status safely
    const isDemo = await isDemoModeActive();
    const metaConfig = getMetaConfig();
    if (!isDemo && metaConfig.isConfigured) {
      const cachedTokenStatus = metaConfig.accessToken ? getCachedTokenStatus(metaConfig.accessToken) : null;
      if (cachedTokenStatus && cachedTokenStatus.status === 'permission_denied') {
        await updateTrackedCompetitor(created.id, {
          lastSyncStatus: 'needs_verification',
          lastSyncError: 'Meta Ad Library access requires identity verification at facebook.com/ads/library/api. Operating with benchmark intelligence.',
        });
      } else if (cachedTokenStatus && cachedTokenStatus.status === 'invalid_token') {
        await updateTrackedCompetitor(created.id, {
          lastSyncStatus: 'token_expired',
          lastSyncError: 'Meta Access Token is expired or invalid. Operating with benchmark intelligence.',
        });
      } else if (cachedTokenStatus && cachedTokenStatus.status === 'connected') {
        const queryTerm = (created.searchTerms[0] || created.name).trim();
        if (queryTerm.length >= 2) {
          try {
            await executeMetaSync({
              query: queryTerm,
              country: created.country,
              limit: 15,
            });
            await updateTrackedCompetitor(created.id, {
              lastSyncStatus: 'completed',
              lastSyncedAt: new Date().toISOString(),
            });
          } catch (syncErr) {
            const errStr = syncErr instanceof Error ? syncErr.message : String(syncErr);
            const isVerif = errStr.includes('verification') || errStr.includes('Code 10') || errStr.includes('2332002');
            const isTokenExp = errStr.includes('Code 190') || errStr.includes('expired');
            await updateTrackedCompetitor(created.id, {
              lastSyncStatus: isVerif ? 'needs_verification' : isTokenExp ? 'token_expired' : 'failed',
              lastSyncError: errStr,
            });
          }
        }
      } else {
        await updateTrackedCompetitor(created.id, {
          lastSyncStatus: 'pending',
        });
      }
    }

    return NextResponse.json({ ok: true, data: created });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: error instanceof Error ? error.message : 'Failed to create competitor' } },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ ok: false, error: { message: 'Competitor ID is required' } }, { status: 400 });
    }

    const updated = await updateTrackedCompetitor(id, updates);
    if (!updated) {
      return NextResponse.json({ ok: false, error: { message: 'Competitor not found' } }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: error instanceof Error ? error.message : 'Failed to update competitor' } },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: false, error: { message: 'Competitor ID is required' } }, { status: 400 });
    }

    const removed = await deleteTrackedCompetitor(id);
    if (!removed) {
      return NextResponse.json({ ok: false, error: { message: 'Competitor not found or already deleted' } }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: { deleted: true, id } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: error instanceof Error ? error.message : 'Failed to delete competitor' } },
      { status: 500 }
    );
  }
}
