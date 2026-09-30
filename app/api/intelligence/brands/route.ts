import { NextRequest } from 'next/server';
import { jsonError, jsonOk, requestIdFrom } from '@/lib/server/http';
import { getState } from '@/lib/server/store';
import { CanonicalAd } from '@/lib/server/domain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = requestIdFrom(request);
  try {
    const state = await getState();
    const ads = state.ads;

    // Group ads by advertiser
    const brandMap = new Map<string, {
      id: string;
      name: string;
      logoUrl?: string;
      industry: string;
      website?: string;
      country?: string;
      totalAds: number;
      activeAds: number;
      inactiveAds: number;
      firstSeenAt: string;
      lastSeenAt: string;
      formats: Record<string, number>;
      topCtas: Record<string, number>;
      hooks: string[];
      offers: string[];
      sampleAds: CanonicalAd[];
      isMonitored: boolean;
    }>();

    for (const ad of ads) {
      const key = ad.advertiserId || ad.advertiserName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const existing = brandMap.get(key);
      const isActive = ad.status === 'Active';
      const isInactive = ad.status === 'Inactive' || ad.status === 'Ended';
      const format = ad.creativeType || 'Image';
      const cta = ad.cta || 'Learn More';

      if (!existing) {
        const isMonitored = state.trackedCompetitors?.some(
          (c) => c.id === key || c.name.toLowerCase() === ad.advertiserName.toLowerCase()
        ) || false;

        brandMap.set(key, {
          id: key,
          name: ad.advertiserName,
          logoUrl: ad.advertiserLogoUrl,
          industry: ad.industry || 'Consumer Commerce',
          website: (ad.landingPageUrl ? new URL(ad.landingPageUrl).hostname.replace(/^www\./, '') : `${ad.advertiserName.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`),
          country: ad.country || 'US',
          totalAds: 1,
          activeAds: isActive ? 1 : 0,
          inactiveAds: isInactive ? 1 : 0,
          firstSeenAt: ad.firstSeenAt,
          lastSeenAt: ad.lastSeenAt,
          formats: { [format]: 1 },
          topCtas: { [cta]: 1 },
          hooks: ad.hook ? [ad.hook] : [],
          offers: ad.offer ? [ad.offer] : [],
          sampleAds: [ad],
          isMonitored,
        });
      } else {
        existing.totalAds += 1;
        if (isActive) existing.activeAds += 1;
        if (isInactive) existing.inactiveAds += 1;
        if (ad.firstSeenAt < existing.firstSeenAt) existing.firstSeenAt = ad.firstSeenAt;
        if (ad.lastSeenAt > existing.lastSeenAt) existing.lastSeenAt = ad.lastSeenAt;
        existing.formats[format] = (existing.formats[format] || 0) + 1;
        existing.topCtas[cta] = (existing.topCtas[cta] || 0) + 1;
        if (ad.hook && !existing.hooks.includes(ad.hook)) existing.hooks.push(ad.hook);
        if (ad.offer && !existing.offers.includes(ad.offer)) existing.offers.push(ad.offer);
        if (existing.sampleAds.length < 4) existing.sampleAds.push(ad);
        if (!existing.logoUrl && ad.advertiserLogoUrl) existing.logoUrl = ad.advertiserLogoUrl;
      }
    }

    const brands = Array.from(brandMap.values()).sort((a, b) => b.totalAds - a.totalAds);

    return jsonOk({ brands, total: brands.length }, requestId);
  } catch (error) {
    return jsonError(error, requestId);
  }
}
