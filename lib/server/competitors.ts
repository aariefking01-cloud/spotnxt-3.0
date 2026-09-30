import { competitors as demoCompetitors } from '@/lib/data';
import { CanonicalAd, CompetitorProfile, EvidenceItem, AdPlatform, CreativeType, freshnessLabelFor, freshnessStateFor } from './domain';

function sourceLabelForAds(ads: CanonicalAd[]) {
  if (ads.some((ad) => ad.source === 'meta')) return 'Meta Ads Library';
  if (ads.some((ad) => ad.source === 'external')) return 'Configured external source';
  if (ads.some((ad) => ad.source === 'upload')) return 'Uploaded workspace data';
  return 'Demo data (opt-in)';
}

function freshnessLabelForAds(ads: CanonicalAd[]) {
  if (!ads.length) return 'Freshness unavailable';
  return freshnessLabelFor(freshnessStateFor(ads.map((ad) => ad.lastSeenAt).sort().at(-1)));
}

function profileFromAds(ads: CanonicalAd[]): CompetitorProfile {
  const first = ads[0];
  const demo = first ? demoCompetitors.find((item) => item.id === first.advertiserId) : undefined;
  const platformCounts = new Map<AdPlatform, number>();
  const formatCounts = new Map<CreativeType, number>();
  for (const ad of ads) {
    platformCounts.set(ad.platform, (platformCounts.get(ad.platform) ?? 0) + 1);
    formatCounts.set(ad.creativeType, (formatCounts.get(ad.creativeType) ?? 0) + 1);
  }
  const lastSeen = ads.map((ad) => ad.lastSeenAt).sort().at(-1);
  const firstSeen = ads.map((ad) => ad.firstSeenAt).sort()[0];
  const freshnessState = freshnessStateFor(lastSeen);
  const permissionsContext = Array.from(new Set(ads.map((ad) => ad.permissionsContext).filter(Boolean))).join(' | ') || 'Permissions context unavailable from source.';
  return {
    id: first?.advertiserId ?? 'unknown',
    name: first?.advertiserName ?? 'Unknown company',
    industry: demo?.industry ?? 'Industry not available from source',
    website: demo?.website,
    adCount: ads.length,
    activeAds: ads.filter((ad) => ad.status === 'Active').length,
    platforms: Array.from(platformCounts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    formats: Array.from(formatCounts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    observedThrough: lastSeen,
    firstObservedAt: firstSeen,
    sourceLabel: sourceLabelForAds(ads),
    freshnessLabel: freshnessLabelForAds(ads),
    freshnessState,
    country: first?.country,
    market: first?.market,
    permissionsContext,
    ingestedAt: ads.map((ad) => ad.ingestedAt).sort()[0],
    updatedAt: ads.map((ad) => ad.updatedAt).sort().at(-1),
    evidenceAdIds: ads.map((ad) => ad.id),
  };
}

export function aggregateCompetitors(ads: CanonicalAd[]): CompetitorProfile[] {
  const grouped = new Map<string, CanonicalAd[]>();
  for (const ad of ads) {
    const group = grouped.get(ad.advertiserId) ?? [];
    group.push(ad);
    grouped.set(ad.advertiserId, group);
  }
  return Array.from(grouped.values())
    .map(profileFromAds)
    .sort((a, b) => b.adCount - a.adCount || a.name.localeCompare(b.name));
}

export function searchCompetitorProfiles(ads: CanonicalAd[], query: string) {
  const normalized = query.trim().toLowerCase();
  const profiles = aggregateCompetitors(ads);
  if (!normalized) return profiles;
  return profiles.filter((profile) => {
    const profileMatch = [profile.id, profile.name, profile.industry, profile.website].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalized));
    const adMatch = ads.some((ad) => ad.advertiserId === profile.id && [ad.headline, ad.primaryText, ad.platform, ad.cta].some((value) => value.toLowerCase().includes(normalized)));
    return profileMatch || adMatch;
  });
}

export function getCompetitorEvidence(ads: CanonicalAd[], competitorId: string): EvidenceItem[] {
  return ads
    .filter((ad) => ad.advertiserId === competitorId)
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))
    .slice(0, 24)
    .map((ad) => ({
      id: `ad_${ad.id}`,
      type: 'ad' as const,
      label: `${ad.advertiserName} · ${ad.headline}`,
      excerpt: JSON.stringify({
        id: ad.id,
        platform: ad.platform,
        creativeType: ad.creativeType,
        status: ad.status,
        headline: ad.headline,
        primaryText: ad.primaryText,
        cta: ad.cta,
        source: ad.source,
        sourceUrl: ad.sourceUrl,
        firstSeenAt: ad.firstSeenAt,
        lastSeenAt: ad.lastSeenAt,
        metadata: ad.metadata,
      }),
      sourceUrl: ad.sourceUrl || ad.mediaUrl,
      observedAt: ad.lastSeenAt,
    }));
}

export function getCompetitorAds(ads: CanonicalAd[], competitorId: string) {
  return ads.filter((ad) => ad.advertiserId === competitorId).sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
}

export function getCompetitorProfile(ads: CanonicalAd[], competitorId: string) {
  return aggregateCompetitors(getCompetitorAds(ads, competitorId))[0];
}
