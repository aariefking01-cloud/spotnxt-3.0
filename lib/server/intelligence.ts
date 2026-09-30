import {
  AppError,
  CompetitorComparisonResult,
  EvidenceItem,
  MarketCode,
  PersistedAnalysis,
  PersistedAssistantMessage,
  PersistedCompetitorAnalysis,
  newId,
  newRequestId,
  nowIso,
  freshnessLabelFor,
  freshnessStateFor,
} from './domain';
import { answerQuestionWithLLM, analyzeAdWithLLM, analyzeCompetitorWithLLM, PROMPT_VERSION } from './llm';
import { getAdProvider, providerStatus, ProviderQuery } from './providers';
import { finalizeCompetitorPipeline, stageEventsFor, startCompetitorPipeline } from './agent-pipeline';
import { getCompetitorAds, getCompetitorEvidence, getCompetitorProfile, searchCompetitorProfiles } from './competitors';
import { getAd, getAnalysis, getCompetitorAnalysis, getState, getSummary, listAds, listEvents, recordEvent, saveAnalysis, saveCompetitorAnalysis, saveMessage } from './store';

export async function getIntelligenceAds(mode?: string, query?: ProviderQuery) {
  const provider = getAdProvider(mode);
  const ads = await provider.list(query);
  const observedThrough = ads.map((ad) => ad.lastSeenAt).sort().at(-1);
  const freshnessState = freshnessStateFor(observedThrough);
  return {
    provider: provider.name,
    providerId: provider.providerId,
    mode: provider.mode,
    sourceLabel: provider.mode === 'demo' ? 'Demo data (opt-in)' : provider.name,
    freshnessState,
    freshnessLabel: freshnessLabelFor(freshnessState),
    observedThrough,
    market: query?.market,
    country: query?.country,
    ads,
  };
}

export async function searchIntelligenceCompetitors(query = '', market?: MarketCode, country?: string) {
  const allAds = await listAds();
  const ads = allAds.filter((ad) => (!market || ad.market === market || (market === 'GLOBAL' && !ad.market)) && (!country || ad.country?.toUpperCase() === country.toUpperCase()));
  const results = searchCompetitorProfiles(ads, query);
  const observedThrough = ads.map((ad) => ad.lastSeenAt).sort().at(-1);
  const freshnessState = freshnessStateFor(observedThrough);
  const hasLive = ads.some((ad) => ad.data_status === 'live');
  const sourceLabel = hasLive ? 'Live Meta Ad Library' : 'Verified Benchmark Dataset';
  return {
    query,
    market,
    country,
    total: results.length,
    sourceLabel,
    freshnessState,
    freshnessLabel: freshnessLabelFor(freshnessState),
    observedThrough,
    results,
  };
}

export async function compareCompetitors(competitorIds: string[]): Promise<CompetitorComparisonResult> {
  const ads = await listAds();
  const validIds = competitorIds.filter(Boolean);
  if (validIds.length < 2) {
    throw new AppError('INSUFFICIENT_COMPETITORS', 'At least two competitors are required for comparison.', 400);
  }

  const comparisonProfiles = validIds.map((id) => {
    const profile = getCompetitorProfile(ads, id);
    const compAds = getCompetitorAds(ads, id);
    const evidence = getCompetitorEvidence(ads, id);

    const formatMap = new Map<string, number>();
    compAds.forEach((ad) => {
      formatMap.set(ad.creativeType, (formatMap.get(ad.creativeType) || 0) + 1);
    });
    const topFormats = Array.from(formatMap.entries()).map(([format, count]) => ({
      format,
      count,
      percentage: compAds.length ? Math.round((count / compAds.length) * 100) : 0,
    })).sort((a, b) => b.count - a.count);

    const ctaMap = new Map<string, number>();
    compAds.forEach((ad) => {
      if (ad.cta) ctaMap.set(ad.cta, (ctaMap.get(ad.cta) || 0) + 1);
    });
    const topCtas = Array.from(ctaMap.entries()).map(([cta, count]) => ({ cta, count })).sort((a, b) => b.count - a.count);

    const dominantHooks = Array.from(new Set(compAds.map((ad) => ad.headline).filter(Boolean))).slice(0, 4);
    const messagingThemes = Array.from(new Set(compAds.map((ad) => ad.description || ad.primaryText.slice(0, 50)).filter(Boolean))).slice(0, 4);

    const offerTypes = Array.from(new Set(compAds.flatMap((ad) => {
      const text = `${ad.headline} ${ad.primaryText}`.toLowerCase();
      const offers: string[] = [];
      if (text.includes('free shipping')) offers.push('Free Shipping');
      if (text.includes('% off') || text.includes('discount') || text.includes('sale')) offers.push('Price Discount');
      if (text.includes('limited') || text.includes('exclusive')) offers.push('Limited Edition / Scarcity');
      if (text.includes('bundle') || text.includes('save $')) offers.push('Bundle Savings');
      if (text.includes('trial') || text.includes('try')) offers.push('Free Trial / Sampler');
      return offers;
    }))).slice(0, 4);

    const publishingVelocity = compAds.length > 30 ? 'High velocity (>30 observed creatives)' : compAds.length > 15 ? 'Moderate velocity (15–30 observed creatives)' : 'Targeted / low velocity (<15 observed creatives)';

    return {
      id,
      name: profile?.name || id,
      industry: profile?.industry || 'Industry not specified',
      country: profile?.country,
      adCount: compAds.length,
      activeAds: compAds.filter((a) => a.status === 'Active').length,
      topFormats,
      topCtas,
      dominantHooks,
      messagingThemes,
      offerTypes: offerTypes.length ? offerTypes : ['Direct product value'],
      publishingVelocity,
      evidence,
    };
  });

  const allFormats = Array.from(new Set(comparisonProfiles.flatMap((c) => c.topFormats.map((f) => f.format))));
  const formatComparison = allFormats.map((format) => {
    const countsByCompetitor: Record<string, number> = {};
    comparisonProfiles.forEach((c) => {
      const match = c.topFormats.find((f) => f.format === format);
      countsByCompetitor[c.name] = match ? match.count : 0;
    });
    return { format, countsByCompetitor };
  });

  const allCtas = Array.from(new Set(comparisonProfiles.flatMap((c) => c.topCtas.map((ct) => ct.cta)))).slice(0, 6);
  const ctaComparison = allCtas.map((cta) => {
    const countsByCompetitor: Record<string, number> = {};
    comparisonProfiles.forEach((c) => {
      const match = c.topCtas.find((ct) => ct.cta === cta);
      countsByCompetitor[c.name] = match ? match.count : 0;
    });
    return { cta, countsByCompetitor };
  });

  const strategicDifferences: string[] = [];
  const primaryA = comparisonProfiles[0];
  const primaryB = comparisonProfiles[1];
  if (primaryA && primaryB) {
    if (primaryA.topFormats[0]?.format !== primaryB.topFormats[0]?.format) {
      strategicDifferences.push(`${primaryA.name} leans primarily on ${primaryA.topFormats[0]?.format || 'Image'} creatives (${primaryA.topFormats[0]?.percentage || 0}%), whereas ${primaryB.name} emphasizes ${primaryB.topFormats[0]?.format || 'Video'} (${primaryB.topFormats[0]?.percentage || 0}%).`);
    }
    strategicDifferences.push(`${primaryA.name} observed with ${primaryA.activeAds} active campaigns vs ${primaryB.name} with ${primaryB.activeAds} active campaigns in the indexed dataset.`);
    if (primaryA.topCtas[0]?.cta && primaryB.topCtas[0]?.cta) {
      strategicDifferences.push(`Call-to-action distinction: ${primaryA.name} prefers "${primaryA.topCtas[0].cta}" while ${primaryB.name} prioritizes "${primaryB.topCtas[0].cta}".`);
    }
  }

  const observedOpportunities: string[] = [
    `Format whitespace: test creative formats underutilized by ${comparisonProfiles.map((c) => c.name).join(' and ')} in this market segment.`,
    `Hook differentiation: position directly against the dominant messaging patterns (${comparisonProfiles.map((c) => c.name).join(', ')} rely heavily on product-first and discount hooks).`,
    `Offer structure: explore urgency and bundle mechanisms if competitors are primarily using single-item discounts.`,
  ];

  const evidenceMap: Record<string, EvidenceItem[]> = {};
  comparisonProfiles.forEach((c) => {
    evidenceMap[c.id] = c.evidence;
  });

  return {
    competitors: comparisonProfiles.map(({ evidence, ...rest }) => rest),
    formatComparison,
    ctaComparison,
    strategicDifferences,
    observedOpportunities,
    evidenceMap,
    generatedAt: nowIso(),
  };
}

export async function analyzeCompetitor(competitorId: string, force = false) {
  const requestId = newRequestId();
  const ads = await listAds();
  const profile = getCompetitorProfile(ads, competitorId);
  if (!profile) throw new AppError('COMPETITOR_NOT_FOUND', `No indexed competitor was found for ${competitorId}.`, 404);
  if (!force) {
    const cached = await getCompetitorAnalysis(competitorId);
    if (cached && cached.promptVersion === PROMPT_VERSION) return { analysis: cached, cached: true, requestId };
  }
  const competitorAds = getCompetitorAds(ads, competitorId);
  const evidence = getCompetitorEvidence(ads, competitorId);
  if (!evidence.length) throw new AppError('NO_COMPETITOR_EVIDENCE', 'The selected competitor has no indexed advertising evidence.', 422);

  const pipeline = startCompetitorPipeline(profile, competitorAds, evidence);
  await recordEvent({ type: 'COMPETITOR_ANALYSIS_STARTED', entityId: competitorId, message: `Started 13-stage evidence-gated analysis for ${profile.name}`, requestId });
  for (const stage of stageEventsFor(pipeline)) {
    await recordEvent({ type: 'COMPETITOR_STAGE_COMPLETED', entityId: competitorId, message: `${stage.stageId}: ${stage.message} (${Math.round(stage.confidence * 100)}% confidence)`, requestId });
  }

  try {
    const result = await analyzeCompetitorWithLLM(profile, competitorAds, evidence);
    const completedPipeline = finalizeCompetitorPipeline(pipeline, result.model, result.result, result.confidence, result.limitations);
    await recordEvent({ type: 'COMPETITOR_STAGE_COMPLETED', entityId: competitorId, message: `EXECUTIVE_INTELLIGENCE: completed with ${result.model}; blocked stages: ${completedPipeline.blockedStages.length}`, requestId });
    const persisted: PersistedCompetitorAnalysis = {
      id: newId('competitor_analysis'),
      competitorId,
      competitorName: profile.name,
      result: {
        ...result.result,
        overview: { ...result.result.overview, company: result.result.overview.company || profile.name, analyzedAds: result.result.overview.analyzedAds || competitorAds.length },
      },
      evidence,
      model: result.model,
      promptVersion: PROMPT_VERSION,
      confidence: result.confidence,
      limitations: result.limitations,
      sourceLabel: profile.sourceLabel,
      observedThrough: profile.observedThrough,
      pipeline: completedPipeline,
      createdAt: nowIso(),
    };
    await saveCompetitorAnalysis(persisted);
    return { analysis: persisted, cached: false, requestId };
  } catch (error) {
    await recordEvent({ type: 'COMPETITOR_ANALYSIS_FAILED', entityId: competitorId, message: error instanceof Error ? error.message : 'Competitor analysis failed.', requestId });
    throw error;
  }
}

export async function analyzeAd(adId: string, force = false) {
  const requestId = newRequestId();
  const ad = await getAd(adId);
  if (!ad) throw new AppError('AD_NOT_FOUND', `No ad was found for id ${adId}.`, 404);
  if (!force) {
    const previous = await getAnalysis(ad.id);
    if (previous) return { analysis: previous, cached: true, requestId };
  }

  await recordEvent({ type: 'ANALYSIS_STARTED', entityId: ad.id, message: `Analysis started for ${ad.advertiserName}`, requestId });
  const allAds = await listAds();
  const related = allAds.filter((item) => item.advertiserId === ad.advertiserId && item.id !== ad.id);
  const result = await analyzeAdWithLLM(ad, related);
  const persisted: PersistedAnalysis = {
    id: newId('analysis'),
    adId: ad.id,
    result: result.result,
    evidence: [
      {
        id: `ad_${ad.id}`,
        type: 'ad',
        label: `${ad.advertiserName} creative`,
        excerpt: `${ad.headline} — ${ad.primaryText}`,
        sourceUrl: ad.sourceUrl || ad.mediaUrl,
        observedAt: ad.lastSeenAt,
      },
      ...related.slice(0, 4).map((item) => ({
        id: `ad_${item.id}`,
        type: 'ad' as const,
        label: `${item.advertiserName} related creative`,
        excerpt: `${item.headline} — ${item.primaryText}`,
        sourceUrl: item.sourceUrl || item.mediaUrl,
        observedAt: item.lastSeenAt,
      })),
    ],
    model: result.model,
    promptVersion: PROMPT_VERSION,
    confidence: result.confidence,
    limitations: result.limitations,
    visionAnalyzed: result.visionAnalyzed,
    createdAt: nowIso(),
  };
  await saveAnalysis(persisted);
  return { analysis: persisted, cached: false, requestId };
}

function buildEvidencePack(question: string): EvidenceItem[] {
  const normalized = question.toLowerCase();
  return [];
}

export async function answerQuestion(question: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = []) {
  const requestId = newRequestId();
  const state = await getState();
  if (!question.trim()) throw new AppError('INVALID_QUESTION', 'A non-empty question is required.', 400);
  const ads = state.ads;
  const analyses = state.analyses;
  const evidence: EvidenceItem[] = [
    ...ads.slice(0, 18).map((ad) => ({
      id: `ad_${ad.id}`,
      type: 'ad' as const,
      label: `${ad.advertiserName}: ${ad.headline}`,
      excerpt: `${ad.primaryText} CTA: ${ad.cta}. Platform: ${ad.platform}. Source: ${ad.source}.`,
      sourceUrl: ad.sourceUrl || ad.mediaUrl,
      observedAt: ad.lastSeenAt,
    })),
    ...analyses.slice(0, 12).map((analysis) => ({
      id: `analysis_${analysis.id}`,
      type: 'analysis' as const,
      label: `Analysis for ${analysis.adId}`,
      excerpt: `${analysis.result.marketingStrategy} Strengths: ${analysis.result.strengths.join('; ')} Recommendations: ${analysis.result.recommendations.join('; ')}`,
      observedAt: analysis.createdAt,
    })),
  ];
  if (!evidence.length) throw new AppError('NO_EVIDENCE', 'There is no indexed ad or analysis evidence to ground an answer.', 422);
  const response = await answerQuestionWithLLM(question, evidence, history.map((item) => ({ role: item.role === 'assistant' ? 'assistant' : 'user', content: item.content })));
  const message: PersistedAssistantMessage = {
    id: newId('msg'),
    conversationId: 'default',
    role: 'assistant',
    content: response.answer.content,
    answer: response.answer,
    createdAt: nowIso(),
  };
  await saveMessage(message);
  return { answer: response.answer, model: response.model, requestId, evidenceCount: evidence.length };
}

export async function getIntelligenceSummary() {
  return getSummary();
}

export async function getIntelligenceEvents(since?: string) {
  return listEvents(since);
}
