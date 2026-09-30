import { NextRequest } from 'next/server';
import { jsonError, jsonOk, requestIdFrom } from '@/lib/server/http';
import { getState } from '@/lib/server/store';
import { adIntelligenceEngine } from '@/lib/server/ad-data-provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = requestIdFrom(request);
  try {
    const brandId = params.id;
    const state = await getState();

    const brandAds = await adIntelligenceEngine.getBrandAds(brandId);
    if (!brandAds.length) {
      return jsonError(new Error(`Brand not found: ${brandId}`), requestId, 404);
    }

    const firstAd = brandAds[0];
    const brandName = firstAd.advertiserName;

    // Compute format distribution percentages
    const formatCounts: Record<string, number> = {};
    const ctaCounts: Record<string, number> = {};
    const hooksSet = new Set<string>();
    const offersSet = new Set<string>();

    let activeCount = 0;
    let inactiveCount = 0;
    let unknownCount = 0;

    for (const ad of brandAds) {
      const f = ad.creativeType || 'Image';
      formatCounts[f] = (formatCounts[f] || 0) + 1;
      const c = ad.cta || 'Learn More';
      ctaCounts[c] = (ctaCounts[c] || 0) + 1;
      if (ad.hook) hooksSet.add(ad.hook);
      if (ad.offer) offersSet.add(ad.offer);

      if (ad.status === 'Active') activeCount += 1;
      else if (ad.status === 'Inactive' || ad.status === 'Ended') inactiveCount += 1;
      else unknownCount += 1;
    }

    const total = brandAds.length;
    const formatBreakdown = Object.entries(formatCounts).map(([format, count]) => ({
      format,
      count,
      percentage: Math.round((count / total) * 100),
    }));

    const topCtas = Object.entries(ctaCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([cta, count]) => ({ cta, count }));

    const isMonitored = state.trackedCompetitors?.some(
      (c) => c.id === brandId || c.name.toLowerCase() === brandName.toLowerCase()
    ) || false;

    // Timeline of launches
    const timeline = brandAds
      .map((ad) => ({
        id: ad.id,
        date: ad.firstSeenAt,
        headline: ad.headline,
        format: ad.creativeType,
        status: ad.status,
        mediaUrl: ad.mediaUrl,
        hook: ad.hook,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return jsonOk(
      {
        brand: {
          id: brandId,
          name: brandName,
          logoUrl: firstAd.advertiserLogoUrl,
          industry: firstAd.industry || 'Consumer Commerce',
          website: firstAd.landingPageUrl ? new URL(firstAd.landingPageUrl).hostname.replace(/^www\./, '') : `${brandName.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`,
          country: firstAd.country || 'US',
          totalAds: total,
          activeAds: activeCount,
          inactiveAds: inactiveCount,
          unknownAds: unknownCount,
          formatBreakdown,
          topCtas,
          topHooks: Array.from(hooksSet),
          topOffers: Array.from(offersSet),
          isMonitored,
          timeline,
          ads: brandAds,
        },
      },
      requestId
    );
  } catch (error) {
    return jsonError(error, requestId);
  }
}
