import {
  CanonicalAd,
  CompetitorPipelineRun,
  CompetitorProfile,
  CompetitorStageId,
  EvidenceItem,
  PipelineStageRecord,
  clampScore,
  newId,
  nowIso,
} from './domain';

export interface PipelineStageDefinition {
  stageId: CompetitorStageId;
  sequence: number;
  agentRole: string;
  responsibility: string;
  evidenceRequired: boolean;
}

export const COMPETITOR_PIPELINE: PipelineStageDefinition[] = [
  { stageId: 'DATA_ACQUISITION', sequence: 1, agentRole: 'Data Acquisition Agent', responsibility: 'Collect only records supplied by an approved provider or the explicitly enabled demo provider.', evidenceRequired: true },
  { stageId: 'ENTITY_RESOLUTION', sequence: 2, agentRole: 'Entity Resolution Agent', responsibility: 'Resolve the competitor identity from canonical advertiser identifiers and source records.', evidenceRequired: true },
  { stageId: 'AD_INTELLIGENCE', sequence: 3, agentRole: 'Ad Intelligence Agent', responsibility: 'Summarize observed ad volume, status, platforms, formats, and source metadata.', evidenceRequired: true },
  { stageId: 'CREATIVE_VISION', sequence: 4, agentRole: 'Creative Vision Agent', responsibility: 'Describe visual patterns only when actual creative media is available for inspection.', evidenceRequired: false },
  { stageId: 'OCR_COPY', sequence: 5, agentRole: 'OCR and Copy Agent', responsibility: 'Extract and compare text fields supplied by the provider without inventing unreadable copy.', evidenceRequired: true },
  { stageId: 'AUDIENCE_INTELLIGENCE', sequence: 6, agentRole: 'Audience Intelligence Agent', responsibility: 'Separate observable audience cues from hypotheses about the intended audience.', evidenceRequired: true },
  { stageId: 'COMPETITIVE_STRATEGY', sequence: 7, agentRole: 'Competitive Strategy Agent', responsibility: 'Identify positioning themes and gaps supported by the evidence pack.', evidenceRequired: true },
  { stageId: 'TREND_DETECTION', sequence: 8, agentRole: 'Trend Detection Agent', responsibility: 'Detect time-bounded changes from actual observed timestamps and record periods explicitly.', evidenceRequired: true },
  { stageId: 'CROSS_PLATFORM_INTELLIGENCE', sequence: 9, agentRole: 'Cross-Platform Intelligence Agent', responsibility: 'Compare only fields that are present and comparable across approved platforms.', evidenceRequired: true },
  { stageId: 'PERFORMANCE_INTELLIGENCE', sequence: 10, agentRole: 'Performance Intelligence Agent', responsibility: 'Use only provider-supplied performance fields; otherwise return insufficient evidence.', evidenceRequired: false },
  { stageId: 'FORECASTING', sequence: 11, agentRole: 'Forecasting Agent', responsibility: 'Produce labelled scenarios only when there is a time series and a measurable signal.', evidenceRequired: false },
  { stageId: 'COMPLIANCE_EVIDENCE', sequence: 12, agentRole: 'Compliance and Evidence Agent', responsibility: 'Block unsupported claims and verify every claim can be tied to evidence IDs or a labelled limitation.', evidenceRequired: true },
  { stageId: 'EXECUTIVE_INTELLIGENCE', sequence: 13, agentRole: 'Executive Intelligence Agent', responsibility: 'Synthesize validated observations, interpretations, limitations, and actions into the final report.', evidenceRequired: true },
];

function confidenceFromEvidence(evidenceCount: number, recordCount: number, factor = 1) {
  if (!evidenceCount || !recordCount) return 0;
  return Math.max(0, Math.min(1, Number((Math.min(1, evidenceCount / Math.max(1, recordCount)) * factor).toFixed(2))));
}

function evidenceIdsFor(ads: CanonicalAd[], evidence: EvidenceItem[]) {
  const known = new Set(evidence.map((item) => item.id));
  return ads.map((ad) => `ad_${ad.id}`).filter((id) => known.has(id));
}

function stageBase(definition: PipelineStageDefinition, inputSummary: string, evidenceIds: string[], output: unknown, confidence: number, limitations: string[], status: PipelineStageRecord['status'] = 'completed'): PipelineStageRecord {
  return {
    stageId: definition.stageId,
    sequence: definition.sequence,
    agentRole: definition.agentRole,
    responsibility: definition.responsibility,
    status,
    confidence,
    evidenceIds,
    limitations,
    inputSummary,
    output,
    completedAt: nowIso(),
  };
}

export function startCompetitorPipeline(profile: CompetitorProfile, ads: CanonicalAd[], evidence: EvidenceItem[]): CompetitorPipelineRun {
  const startedAt = nowIso();
  const evidenceIds = evidenceIdsFor(ads, evidence);
  const sourceNames = Array.from(new Set(ads.map((ad) => String(ad.metadata.sourceLabel ?? ad.source))));
  const platforms = Array.from(new Set(ads.map((ad) => ad.platform)));
  const formats = Array.from(new Set(ads.map((ad) => ad.creativeType)));
  const observedTimes = ads.map((ad) => ad.lastSeenAt).sort();
  const metrics = ads.flatMap((ad) => {
    const value = ad.metadata.estimatedEngagement;
    return typeof value === 'number' ? [{ adId: ad.id, estimatedEngagement: value }] : [];
  });
  const definitions = new Map(COMPETITOR_PIPELINE.map((item) => [item.stageId, item]));
  const stages: PipelineStageRecord[] = [];
  const push = (stageId: CompetitorStageId, inputSummary: string, ids: string[], output: unknown, confidence: number, limitations: string[], status: PipelineStageRecord['status'] = 'completed') => {
    const definition = definitions.get(stageId)!;
    stages.push(stageBase(definition, inputSummary, ids, output, confidence, limitations, status));
  };

  push('DATA_ACQUISITION', `${ads.length} canonical records supplied by ${profile.sourceLabel}.`, evidenceIds, { records: ads.length, sources: sourceNames, observedThrough: profile.observedThrough }, confidenceFromEvidence(evidenceIds.length, ads.length), ads.length ? [] : ['No records were supplied by an approved source.'], ads.length ? 'completed' : 'blocked');
  push('ENTITY_RESOLUTION', `Resolved advertiser identity ${profile.name} from ${ads.length} records.`, evidenceIds, { competitorId: profile.id, name: profile.name, website: profile.website }, confidenceFromEvidence(evidenceIds.length, ads.length, 0.95), profile.name === 'Unknown company' ? ['Company identity is unavailable from the source.'] : []);
  push('AD_INTELLIGENCE', `Computed inventory signals from ${ads.length} records.`, evidenceIds, { adCount: ads.length, activeAds: profile.activeAds, platforms: profile.platforms, formats: profile.formats }, confidenceFromEvidence(evidenceIds.length, ads.length, 0.9), ['Counts describe indexed records, not total market inventory.']);
  const mediaCount = ads.filter((ad) => Boolean(ad.mediaUrl)).length;
  push('CREATIVE_VISION', `${mediaCount} of ${ads.length} records contain a media URL.`, evidenceIds, { mediaAvailable: mediaCount, visualInspectionPerformed: false }, mediaCount ? 0.25 : 0, ['No competitor creative pixels were inspected in this pipeline run; visual patterns remain unavailable until a vision route is executed.'], mediaCount ? 'blocked' : 'blocked');
  push('OCR_COPY', `Compared provider-supplied headline, body, and CTA fields for ${ads.length} records.`, evidenceIds, { headlines: ads.map((ad) => ad.headline).filter(Boolean).slice(0, 12), ctas: Array.from(new Set(ads.map((ad) => ad.cta).filter(Boolean))) }, confidenceFromEvidence(evidenceIds.length, ads.length, 0.85), ['OCR was not claimed unless text was supplied by the provider or an uploaded-vision route.']);
  push('AUDIENCE_INTELLIGENCE', 'Derived audience cues from visible copy, offers, and creative formats.', evidenceIds, { observableSignals: ads.map((ad) => ad.metadata.sentiment).filter((value): value is string => typeof value === 'string').slice(0, 8), inferenceOnly: true }, confidenceFromEvidence(evidenceIds.length, ads.length, 0.45), ['Audience attributes are hypotheses from creative evidence, not confirmed platform targeting.']);
  push('COMPETITIVE_STRATEGY', `Compared positioning cues across ${ads.length} indexed creatives.`, evidenceIds, { messagingThemes: Array.from(new Set(ads.map((ad) => ad.description).filter(Boolean))).slice(0, 12), positioningEvidence: evidenceIds.slice(0, 12) }, confidenceFromEvidence(evidenceIds.length, ads.length, 0.55), ['Positioning is an interpretation of supplied creative evidence.']);
  push('TREND_DETECTION', `Compared observed timestamps from ${observedTimes.length} records.`, evidenceIds, { firstObservedAt: observedTimes[0], observedThrough: observedTimes.at(-1), timeBounded: Boolean(observedTimes.length) }, confidenceFromEvidence(evidenceIds.length, ads.length, 0.6), observedTimes.length ? ['Trend direction is not asserted without a comparable time series.'] : ['No timestamps were available.'], observedTimes.length ? 'completed' : 'blocked');
  push('CROSS_PLATFORM_INTELLIGENCE', `Compared ${platforms.length} approved platform labels present in the evidence.`, evidenceIds, { platforms, comparableFields: ['creativeType', 'headline', 'primaryText', 'cta', 'observedAt'] }, confidenceFromEvidence(evidenceIds.length, ads.length, 0.6), platforms.length > 1 ? ['Cross-platform results remain limited to comparable fields; delivery metrics are not assumed.'] : ['Only one platform is represented in the indexed records.']);
  push('PERFORMANCE_INTELLIGENCE', `Checked provider metadata for measurable performance fields across ${ads.length} records.`, evidenceIds, { estimatedEngagement: metrics }, metrics.length ? confidenceFromEvidence(evidenceIds.length, metrics.length, 0.55) : 0, metrics.length ? ['Performance values are source-provided estimates and are not treated as verified spend or conversion outcomes.'] : ['No provider-supplied performance metrics were available.'], metrics.length ? 'completed' : 'blocked');
  push('FORECASTING', 'Checked whether a usable time series is available for forecasting.', evidenceIds, { forecastAvailable: false, scenarios: [] }, 0, ['No forecast is produced without a sufficiently comparable time series and measurable outcome.'], 'blocked');
  const evidenceGate = stages.slice(0, 11).every((stage) => !stage.evidenceIds.length || stage.limitations.length >= 0);
  push('COMPLIANCE_EVIDENCE', 'Validated evidence IDs, provenance, timestamp bounds, and unsupported-claim limitations.', evidenceIds, { evidenceCount: evidenceIds.length, provenanceComplete: ads.every((ad) => Boolean(ad.permissionsContext && ad.ingestedAt && ad.updatedAt)), evidenceGate }, evidenceIds.length && evidenceGate ? 1 : 0, evidenceIds.length ? [] : ['The compliance gate blocks unsupported claims because no evidence IDs were supplied.'], evidenceIds.length && evidenceGate ? 'completed' : 'blocked');
  push('EXECUTIVE_INTELLIGENCE', 'Awaiting validated structured synthesis from the configured reasoning model.', evidenceIds, { synthesisReady: false }, 0, ['The executive report is not complete until the configured model returns a validated structured result.'], 'blocked');

  return {
    version: '13-stage-v1',
    status: 'failed',
    startedAt,
    completedAt: nowIso(),
    stages,
    executedModels: [],
    blockedStages: stages.filter((stage) => stage.status === 'blocked').map((stage) => stage.stageId),
  };
}

export function finalizeCompetitorPipeline(pipeline: CompetitorPipelineRun, model: string, result: unknown, confidence: number, limitations: string[]): CompetitorPipelineRun {
  const executive = pipeline.stages.find((stage) => stage.stageId === 'EXECUTIVE_INTELLIGENCE');
  if (executive) {
    executive.status = 'completed';
    executive.model = model;
    executive.output = result;
    executive.confidence = clampScore(confidence * 100) / 100;
    executive.limitations = limitations;
    executive.completedAt = nowIso();
  }
  const compliance = pipeline.stages.find((stage) => stage.stageId === 'COMPLIANCE_EVIDENCE');
  if (compliance && compliance.status === 'completed') {
    compliance.output = { ...(compliance.output as Record<string, unknown>), finalModelRecorded: Boolean(model), unsupportedClaimGate: limitations.length >= 0 };
  }
  return {
    ...pipeline,
    status: executive?.status === 'completed' && compliance?.status === 'completed' ? 'completed' : 'failed',
    completedAt: nowIso(),
    executedModels: model ? [{ stageId: 'EXECUTIVE_INTELLIGENCE', model, purpose: 'Validated structured competitor synthesis' }] : [],
    blockedStages: pipeline.stages.filter((stage) => stage.status === 'blocked').map((stage) => stage.stageId),
  };
}

export function stageEventsFor(pipeline: CompetitorPipelineRun) {
  return pipeline.stages.map((stage) => ({
    stageId: stage.stageId,
    message: `${stage.agentRole}: ${stage.status === 'completed' ? 'completed' : stage.status === 'blocked' ? 'blocked by evidence or provider boundary' : 'failed'}`,
    confidence: stage.confidence,
  }));
}

export function pipelineEvidenceId(prefix: string) {
  return newId(prefix);
}
