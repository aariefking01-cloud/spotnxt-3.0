import { randomUUID } from 'crypto';

export type AdPlatform = 'Meta' | 'Instagram' | 'Facebook' | 'Audience Network' | 'Messenger' | 'Uploaded' | 'Other';
export type CreativeType = 'Image' | 'Video' | 'Carousel' | 'Story' | 'Reel';
export type AdStatus = 'Active' | 'Inactive' | 'Unknown' | 'Paused' | 'Ended';
export type AdSource = 'demo' | 'upload' | 'meta' | 'external';
export type AdSourceType = 'meta_live' | 'meta_api' | 'demo' | 'benchmark' | 'user_import' | 'generated' | 'unknown';
export type DataStatus = 'verified_live' | 'verified_external' | 'demo' | 'benchmark' | 'generated' | 'failed' | 'unavailable' | 'live' | 'historical';
export type FreshnessState = 'LIVE' | 'RECENT' | 'HISTORICAL' | 'UNAVAILABLE';
export type MarketCode = 'IN' | 'GLOBAL' | 'ASIA' | 'NORTH_AMERICA' | 'EUROPE' | 'LATAM' | 'MENA' | 'OTHER' | string;
export type ProviderId = 'demo' | 'uploaded-workspace' | 'meta-ad-library' | 'external';
export type CompetitorStageId = 'DATA_ACQUISITION' | 'ENTITY_RESOLUTION' | 'AD_INTELLIGENCE' | 'CREATIVE_VISION' | 'OCR_COPY' | 'AUDIENCE_INTELLIGENCE' | 'COMPETITIVE_STRATEGY' | 'TREND_DETECTION' | 'CROSS_PLATFORM_INTELLIGENCE' | 'PERFORMANCE_INTELLIGENCE' | 'FORECASTING' | 'COMPLIANCE_EVIDENCE' | 'EXECUTIVE_INTELLIGENCE';
export type PipelineStageStatus = 'completed' | 'blocked' | 'failed';

export interface PipelineStageRecord {
  stageId: CompetitorStageId;
  sequence: number;
  agentRole: string;
  responsibility: string;
  status: PipelineStageStatus;
  confidence: number;
  evidenceIds: string[];
  limitations: string[];
  model?: string;
  inputSummary: string;
  output: unknown;
  error?: string;
  completedAt: string;
}

export interface CompetitorPipelineRun {
  version: '13-stage-v1';
  status: 'completed' | 'failed';
  startedAt: string;
  completedAt: string;
  stages: PipelineStageRecord[];
  executedModels: Array<{ stageId: CompetitorStageId; model: string; purpose: string }>;
  blockedStages: CompetitorStageId[];
}

export interface ProvenanceMetadata {
  provider: ProviderId;
  sourceLabel: string;
  country?: string;
  market?: MarketCode;
  permissionsContext: string;
  ingestedAt: string;
  updatedAt: string;
  observedAt?: string;
}

export interface CompetitorProfile {
  id: string;
  name: string;
  industry: string;
  website?: string;
  adCount: number;
  activeAds: number;
  platforms: Array<{ name: AdPlatform; count: number }>;
  formats: Array<{ name: CreativeType; count: number }>;
  observedThrough?: string;
  firstObservedAt?: string;
  sourceLabel: string;
  freshnessLabel: string;
  freshnessState: FreshnessState;
  country?: string;
  market?: MarketCode;
  permissionsContext: string;
  ingestedAt?: string;
  updatedAt?: string;
  evidenceAdIds: string[];
}

export interface CompetitorAnalysisResult {
  overview: {
    company: string;
    industry: string;
    website?: string;
    availableAdvertisingSignals: string[];
    analyzedAds: number;
  };
  creativeIntelligence: {
    dominantCreativeStyles: string[];
    visualPatterns: string[];
    formats: string[];
    messagingPatterns: string[];
    ctaPatterns: string[];
  };
  adCopyIntelligence: {
    commonHooks: string[];
    messagingThemes: string[];
    valuePropositions: string[];
    emotionalTriggers: string[];
    ctaStrategy: string;
  };
  competitivePositioning: {
    positioningThemes: string[];
    differentiators: string[];
    strengths: string[];
    weaknesses: string[];
    potentialGaps: string[];
  };
  trendIntelligence: {
    emergingCreativePatterns: string[];
    messagingTrends: string[];
    repeatedCampaigns: string[];
    recentAvailableSignals: string[];
  };
  strategicOpportunities: string[];
}

export interface PersistedCompetitorAnalysis {
  id: string;
  competitorId: string;
  competitorName: string;
  result: CompetitorAnalysisResult;
  evidence: EvidenceItem[];
  model: string;
  promptVersion: string;
  confidence: number;
  limitations: string[];
  sourceLabel: string;
  observedThrough?: string;
  pipeline?: CompetitorPipelineRun;
  createdAt: string;
}

export interface AdObservation {
  id: string;
  adId: string;
  observedAt: string;
  type: 'DISCOVERED' | 'COPY_CHANGED' | 'CREATIVE_CHANGED' | 'STATUS_CHANGED' | 'SYNC_CONFIRMED' | 'NOT_OBSERVED';
  status: AdStatus;
  headline?: string;
  primaryText?: string;
  mediaUrl?: string;
  notes?: string;
}

export interface SwipeItem {
  id: string;
  adId: string;
  folder: string;
  tags: string[];
  notes?: string;
  savedAt: string;
  ad: CanonicalAd;
}

export interface CanonicalAd {
  id: string;
  externalId: string;
  advertiserId: string;
  advertiserName: string;
  advertiserLogoUrl?: string;
  pageId?: string;
  pageName?: string;
  platform: AdPlatform;
  status: AdStatus;
  firstSeenAt: string;
  lastSeenAt: string;
  last_synced_at?: string;
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  creativeType: CreativeType;
  mediaUrl?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  aspectRatio?: string;
  landingPageUrl?: string;
  primaryText: string;
  headline: string;
  description?: string;
  cta: string;
  destination?: string;
  hook?: string;
  angle?: string;
  offer?: string;
  industry?: string;
  metadata: Record<string, unknown>;
  source: AdSource;
  source_type?: AdSourceType;
  data_status: DataStatus;
  provider: string;
  sourceUrl?: string;
  country?: string;
  languages?: string[];
  market?: MarketCode;
  permissionsContext: string;
  ingestedAt: string;
  retrieved_at?: string;
  request_id?: string;
  api_version?: string;
  endpoint?: string;
  query?: string;
  freshnessState: FreshnessState;
  confidence: number;
  contentHash: string;
  observations?: AdObservation[];
  rawProviderData?: Record<string, unknown>;
  aiAnalysis?: Partial<AnalysisResult> & {
    hook?: string;
    angle?: string;
    offer?: string;
    problem?: string;
    promise?: string;
    benefits?: string[];
    tone?: string;
    visualStyle?: string;
    audienceSignals?: string[];
    confidence?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceItem {
  id: string;
  type: 'ad' | 'analysis' | 'trend' | 'recommendation';
  label: string;
  excerpt: string;
  sourceUrl?: string;
  observedAt?: string;
}

export interface AnalysisResult {
  visualElements: string;
  headlineAndCopy: string;
  productOrService: string;
  marketingStrategy: string;
  emotionalTrigger: string;
  copywritingAnalysis: string;
  aidaFramework: { attention: string; interest: string; desire: string; action: string };
  pasFramework: { problem: string; agitation: string; solution: string };
  targetAudience: string;
  colorPsychology: string;
  ctaAnalysis: string;
  performancePrediction: number;
  successScore: number;
  weaknesses: string[];
  strengths: string[];
  recommendations: string[];
  sentimentScore: number;
  creativityScore: number;
  buyerIntent: string;
  seoKeywords: string[];
  hookStrength: number;
  visualStrategy: string;
  brandPositioning: string;
  creativeEffectiveness: string;
  competitiveSignificance: string;
}

export interface PersistedAnalysis {
  id: string;
  adId: string;
  result: AnalysisResult;
  evidence: EvidenceItem[];
  model: string;
  promptVersion: string;
  confidence: number;
  limitations: string[];
  visionAnalyzed: boolean;
  createdAt: string;
}

export interface IntelligenceEvent {
  id: string;
  type:
    | 'AD_DISCOVERED'
    | 'AD_UPDATED'
    | 'ANALYSIS_STARTED'
    | 'ANALYSIS_COMPLETED'
    | 'ASSISTANT_COMPLETED'
    | 'RECOMMENDATION_CREATED'
    | 'COMPETITOR_ANALYSIS_STARTED'
    | 'COMPETITOR_STAGE_COMPLETED'
    | 'COMPETITOR_ANALYSIS_COMPLETED'
    | 'COMPETITOR_ANALYSIS_FAILED';
  entityId?: string;
  message: string;
  createdAt: string;
  requestId: string;
}

export interface AssistantAnswer {
  content: string;
  observation: string;
  evidence: string;
  interpretation: string;
  recommendation: string;
  confidence: number;
  citations: EvidenceItem[];
  limitations: string[];
}

export interface PersistedAssistantMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  answer?: AssistantAnswer;
  createdAt: string;
}

export interface MetaRawAdArchiveRow {
  id: string;
  ad_creation_time?: string;
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  page_id?: string;
  page_name?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_titles?: string[];
  ad_creative_link_captions?: string[];
  ad_creative_link_descriptions?: string[];
  ad_snapshot_url?: string;
  bylines?: string;
  currency?: string;
  demographic_distribution?: Array<{
    percentage?: string | number;
    age?: string;
    gender?: string;
  }>;
  delivery_by_region?: Array<{
    percentage?: string | number;
    region?: string;
  }>;
  impressions?: {
    lower_bound?: string | number;
    upper_bound?: string | number;
  };
  spend?: {
    lower_bound?: string | number;
    upper_bound?: string | number;
  };
  publisher_platforms?: string[];
  languages?: string[];
  target_ages?: string[];
  target_gender?: string;
  target_locations?: Array<{ name?: string; type?: string }>;
  [key: string]: unknown;
}

export interface AdSyncRun {
  id: string;
  provider: ProviderId;
  query: string;
  country: string;
  pagesFetched: number;
  recordsFetched: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  startedAt: string;
  completedAt: string;
  status: 'completed' | 'error' | 'partial';
  error?: string;
  cursor?: string;
  activeStatus?: string;
}

export interface AdvertiserRecord {
  id: string;
  externalId: string;
  name: string;
  pageId?: string;
  industry?: string;
  website?: string;
  country?: string;
  totalAds: number;
  activeAds: number;
  firstSeenAt: string;
  lastSeenAt: string;
  sourceLabel: string;
  updatedAt: string;
}

export interface AdSnapshotRecord {
  id: string;
  adId: string;
  externalId: string;
  snapshotUrl: string;
  publisherPlatforms: string[];
  observedAt: string;
  rawPayload: Record<string, unknown>;
}

export type MonitoringStatus = 'ACTIVE' | 'PAUSED';
export type SyncFrequency = 'MANUAL' | 'HOURLY' | 'EVERY_6_HOURS' | 'DAILY' | 'WEEKLY';

export interface TrackedCompetitor {
  id: string;
  name: string;
  country: string;
  market?: MarketCode;
  industry: string;
  website?: string;
  searchTerms: string[];
  monitoringStatus: MonitoringStatus;
  syncFrequency: SyncFrequency;
  lastSyncedAt?: string;
  lastSyncStatus?: 'completed' | 'failed' | 'in_progress' | 'pending' | 'needs_verification' | 'token_expired' | 'rate_limited';
  lastSyncError?: string;
  totalObservedAds: number;
  activeAds: number;
  firstObservedAt?: string;
  lastObservedAt?: string;
  notes?: string;
  source: 'live' | 'demo';
  createdAt: string;
  updatedAt: string;
}

export interface CompetitorComparisonResult {
  competitors: Array<{
    id: string;
    name: string;
    industry: string;
    country?: string;
    adCount: number;
    activeAds: number;
    topFormats: Array<{ format: string; count: number; percentage: number }>;
    topCtas: Array<{ cta: string; count: number }>;
    dominantHooks: string[];
    messagingThemes: string[];
    offerTypes: string[];
    publishingVelocity: string;
  }>;
  formatComparison: Array<{
    format: string;
    countsByCompetitor: Record<string, number>;
  }>;
  ctaComparison: Array<{
    cta: string;
    countsByCompetitor: Record<string, number>;
  }>;
  strategicDifferences: string[];
  observedOpportunities: string[];
  evidenceMap: Record<string, EvidenceItem[]>;
  generatedAt: string;
}

export interface StoreState {
  ads: CanonicalAd[];
  advertisers?: AdvertiserRecord[];
  trackedCompetitors?: TrackedCompetitor[];
  syncRuns?: AdSyncRun[];
  analyses: PersistedAnalysis[];
  competitorAnalyses: PersistedCompetitorAnalysis[];
  events: IntelligenceEvent[];
  messages: PersistedAssistantMessage[];
  swipeItems?: SwipeItem[];
  demoModeOverride?: boolean;
}

export const nowIso = () => new Date().toISOString();

export function freshnessStateFor(observedAt?: string, now = Date.now()): FreshnessState {
  if (!observedAt) return 'UNAVAILABLE';
  const timestamp = new Date(observedAt).getTime();
  if (!Number.isFinite(timestamp)) return 'UNAVAILABLE';
  const age = Math.max(0, now - timestamp);
  if (age <= 24 * 60 * 60 * 1000) return 'LIVE';
  if (age <= 7 * 24 * 60 * 60 * 1000) return 'RECENT';
  return 'HISTORICAL';
}

export function freshnessLabelFor(state: FreshnessState): string {
  switch (state) {
    case 'LIVE': return 'Live observation';
    case 'RECENT': return 'Recent observation';
    case 'HISTORICAL': return 'Historical observation';
    default: return 'Freshness unavailable';
  }
}
export const newRequestId = () => `req_${randomUUID()}`;
export const newId = (prefix: string) => `${prefix}_${randomUUID()}`;

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

export function clampScore(value: unknown, fallback = 0): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
}

export function normalizeStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
}
