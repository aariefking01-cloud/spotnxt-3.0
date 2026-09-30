import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CanonicalAd, AdSyncRun, AdvertiserRecord } from './domain';

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(url, key, {
      auth: { persistSession: false },
    });
  }
  return supabaseClient;
}

export async function syncAdsToSupabase(ads: CanonicalAd[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !ads.length) return;

  try {
    const formattedAds = ads.map((ad) => ({
      id: ad.id,
      external_id: ad.externalId,
      provider: ad.metadata?.provider || 'meta-ad-library',
      advertiser_id: ad.advertiserId,
      advertiser_name: ad.advertiserName,
      page_id: ad.pageId,
      page_name: ad.pageName,
      platform: ad.platform,
      country: ad.country,
      market: ad.market,
      status: ad.status,
      creative_type: ad.creativeType,
      headline: ad.headline,
      primary_text: ad.primaryText,
      description: ad.description,
      cta: ad.cta,
      destination: ad.destination,
      media_url: ad.mediaUrl,
      thumbnail_url: ad.thumbnailUrl,
      landing_page_url: ad.landingPageUrl,
      source: ad.source,
      source_url: ad.sourceUrl,
      first_seen_at: ad.firstSeenAt,
      last_seen_at: ad.lastSeenAt,
      start_date: ad.startDate,
      end_date: ad.endDate,
      permissions_context: ad.permissionsContext,
      confidence: ad.confidence,
      content_hash: ad.contentHash,
      metadata: ad.metadata,
      updated_at: ad.updatedAt,
    }));

    await supabase.from('ads').upsert(formattedAds, { onConflict: 'external_id' });
  } catch (err) {
    // Database sync error is logged but non-blocking for local resilient operation
    console.error('Supabase ad sync error:', err);
  }
}

export async function syncSyncRunToSupabase(run: AdSyncRun): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    await supabase.from('ad_sync_runs').upsert({
      id: run.id,
      provider: run.provider,
      query: run.query,
      country: run.country,
      active_status: run.activeStatus || 'ALL',
      pages_fetched: run.pagesFetched,
      records_fetched: run.recordsFetched,
      records_inserted: run.recordsInserted,
      records_updated: run.recordsUpdated,
      records_skipped: run.recordsSkipped,
      started_at: run.startedAt,
      completed_at: run.completedAt,
      status: run.status,
      error: run.error,
    });
  } catch (err) {
    console.error('Supabase sync run recording error:', err);
  }
}
