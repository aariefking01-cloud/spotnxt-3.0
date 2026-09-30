import { NextRequest } from 'next/server';
import { jsonError, jsonOk, requestIdFrom } from '@/lib/server/http';
import { adIntelligenceEngine } from '@/lib/server/ad-data-provider';
import { getState } from '@/lib/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = requestIdFrom(request);
  try {
    const adId = params.id;
    const ad = await adIntelligenceEngine.getAd(adId);

    if (!ad) {
      return jsonError(new Error(`Ad not found: ${adId}`), requestId, 404);
    }

    const state = await getState();

    // Find similar or related ads from the same brand or industry
    const relatedAds = state.ads
      .filter((a) => a.id !== ad.id && (a.advertiserId === ad.advertiserId || (ad.industry && a.industry === ad.industry)))
      .slice(0, 6);

    const history = await adIntelligenceEngine.getHistoricalAds(ad.id);

    return jsonOk(
      {
        ad,
        observations: history.length > 0 ? history : ad.observations || [],
        relatedAds,
        rawProviderData: ad.rawProviderData || ad.metadata || {},
      },
      requestId
    );
  } catch (error) {
    return jsonError(error, requestId);
  }
}
