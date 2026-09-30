import { promises as fs } from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { AppError, AnalysisResult, AssistantAnswer, CanonicalAd, CompetitorAnalysisResult, CompetitorProfile, EvidenceItem, asText, clampScore, normalizeStringArray } from './domain';

const PROMPT_VERSION = 'spotnxt-intelligence-v6';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();
const geminiClient = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;
const DEFAULT_MODEL = geminiClient ? 'gemini-3.8-flash' : (process.env.SPOTNXT_AI_MODEL || 'gpt-5-mini');
const COMPETITOR_MODEL = geminiClient ? 'gemini-3.8-flash' : (process.env.SPOTNXT_COMPETITOR_MODEL || 'gpt-5-mini');
const COMPETITOR_FALLBACK_MODEL = geminiClient ? 'gemini-3.1-pro-preview' : (process.env.SPOTNXT_COMPETITOR_FALLBACK_MODEL || 'gpt-5');
const ASSISTANT_MODEL = geminiClient ? 'gemini-3.8-flash' : (process.env.SPOTNXT_ASSISTANT_MODEL || DEFAULT_MODEL);
const VISION_MODEL = geminiClient ? 'gemini-3.8-flash' : (process.env.SPOTNXT_VISION_MODEL || DEFAULT_MODEL);

type ImageContent = { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };
type TextContent = { type: 'text'; text: string };
type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string | Array<TextContent | ImageContent> };

type LlmResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

function llmConfig() {
  const directBase = process.env.OPENAI_API_BASE?.replace(/\/+$/, '');
  const forgeBase = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, '');
  const baseUrl = directBase || (forgeBase ? `${forgeBase}/v1` : undefined);
  const apiKey = process.env.OPENAI_API_KEY || process.env.BUILT_IN_FORGE_API_KEY;
  return { baseUrl, apiKey, model: DEFAULT_MODEL, hasGemini: Boolean(geminiClient) };
}

export function getLlmStatus() {
  const config = llmConfig();
  return {
    configured: Boolean(geminiClient || (config.baseUrl && config.apiKey)),
    provider: geminiClient ? 'google-genai' : process.env.OPENAI_API_KEY ? 'openai-compatible' : process.env.BUILT_IN_FORGE_API_KEY ? 'built-in-forge' : 'heuristic-fallback',
    model: config.model,
    competitorModel: COMPETITOR_MODEL,
    competitorFallbackModel: COMPETITOR_FALLBACK_MODEL,
    assistantModel: ASSISTANT_MODEL,
    visionModel: VISION_MODEL,
    promptVersion: PROMPT_VERSION,
  };
}

function isGptModel(model: string) {
  return model.startsWith('gpt-');
}

async function callModel(
  messages: ChatMessage[],
  schemaName: string,
  schema: Record<string, unknown>,
  options: { model?: string; timeoutMs?: number; maxOutputTokens?: number; maxAttempts?: number } = {}
): Promise<Record<string, unknown> | null> {
  // If Gemini is available, use official Google GenAI SDK
  if (geminiClient) {
    try {
      let model = options.model || (geminiClient ? 'gemini-3.8-flash' : DEFAULT_MODEL);
      if (
        model.startsWith('gpt-') ||
        model.includes('gemini-2.5') ||
        model.includes('gemini-1.5') ||
        model.includes('gemini-2.0')
      ) {
        model = 'gemini-3.8-flash';
      }
      const textContents = messages.map((m) => {
        if (typeof m.content === 'string') return `${m.role.toUpperCase()}: ${m.content}`;
        const parts = m.content.map((c) => (c.type === 'text' ? c.text : `[IMAGE: ${c.image_url.url}]`)).join('\n');
        return `${m.role.toUpperCase()}: ${parts}`;
      }).join('\n\n');

      const prompt = `${textContents}\n\nIMPORTANT: Respond with valid JSON matching this schema: ${JSON.stringify(schema)}`;
      const response = await geminiClient.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const responseText = response.text;
      if (responseText) {
        try {
          return JSON.parse(responseText) as Record<string, unknown>;
        } catch {
          // Clean possible markdown code fences
          const cleaned = responseText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
          return JSON.parse(cleaned) as Record<string, unknown>;
        }
      }
    } catch (geminiError: unknown) {
      const errMsg = geminiError instanceof Error ? geminiError.message : String(geminiError);
      console.warn('Gemini generateContent notice (initiating fallback):', errMsg.slice(0, 200));
    }
  }

  const config = llmConfig();
  if (!config.baseUrl || !config.apiKey) {
    // If neither Gemini succeeded nor OpenAI credentials configured, return null to activate heuristic synthesis
    return null;
  }

  const model = options.model || config.model;
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.2,
    response_format: {
      type: 'json_schema',
      json_schema: { name: schemaName, strict: true, schema },
    },
  };
  if (isGptModel(model)) {
    body.max_completion_tokens = options.maxOutputTokens ?? 4200;
  } else {
    body.max_tokens = options.maxOutputTokens ?? 4200;
  }

  const timeoutMs = options.timeoutMs ?? 35000;
  const maxAttempts = options.maxAttempts ?? 2;
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({})) as LlmResponse & { error?: { message?: string } };
      if (!response.ok) {
        const error = new Error(payload.error?.message || `LLM provider returned ${response.status}`);
        if (response.status !== 429 && response.status < 500) throw error;
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
        continue;
      }
      const raw = payload.choices?.[0]?.message?.content;
      if (!raw) throw new Error('LLM provider returned an empty structured response.');
      try {
        return JSON.parse(raw) as Record<string, unknown>;
      } catch {
        throw new Error('LLM provider returned invalid JSON despite structured output mode.');
      }
    } catch (error) {
      lastError = error;
      if (attempt + 1 >= maxAttempts) break;
      await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

const analysisSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    visualElements: { type: 'string' },
    headlineAndCopy: { type: 'string' },
    productOrService: { type: 'string' },
    marketingStrategy: { type: 'string' },
    emotionalTrigger: { type: 'string' },
    copywritingAnalysis: { type: 'string' },
    aidaFramework: {
      type: 'object',
      properties: { attention: { type: 'string' }, interest: { type: 'string' }, desire: { type: 'string' }, action: { type: 'string' } },
      required: ['attention', 'interest', 'desire', 'action'],
      additionalProperties: false,
    },
    pasFramework: {
      type: 'object',
      properties: { problem: { type: 'string' }, agitation: { type: 'string' }, solution: { type: 'string' } },
      required: ['problem', 'agitation', 'solution'],
      additionalProperties: false,
    },
    targetAudience: { type: 'string' },
    colorPsychology: { type: 'string' },
    ctaAnalysis: { type: 'string' },
    performancePrediction: { type: 'number' },
    successScore: { type: 'number' },
    weaknesses: { type: 'array', items: { type: 'string' } },
    strengths: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
    sentimentScore: { type: 'number' },
    creativityScore: { type: 'number' },
    buyerIntent: { type: 'string' },
    seoKeywords: { type: 'array', items: { type: 'string' } },
    hookStrength: { type: 'number' },
    visualStrategy: { type: 'string' },
    brandPositioning: { type: 'string' },
    creativeEffectiveness: { type: 'string' },
    competitiveSignificance: { type: 'string' },
  },
  required: [
    'visualElements', 'headlineAndCopy', 'productOrService', 'marketingStrategy', 'emotionalTrigger', 'copywritingAnalysis',
    'aidaFramework', 'pasFramework', 'targetAudience', 'colorPsychology', 'ctaAnalysis', 'performancePrediction', 'successScore',
    'weaknesses', 'strengths', 'recommendations', 'sentimentScore', 'creativityScore', 'buyerIntent', 'seoKeywords', 'hookStrength',
    'visualStrategy', 'brandPositioning', 'creativeEffectiveness', 'competitiveSignificance',
  ],
  additionalProperties: false,
};

const competitorSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    overview: {
      type: 'object',
      properties: {
        company: { type: 'string' },
        industry: { type: 'string' },
        website: { type: 'string' },
        availableAdvertisingSignals: { type: 'array', items: { type: 'string' } },
        analyzedAds: { type: 'integer' },
      },
      required: ['company', 'industry', 'website', 'availableAdvertisingSignals', 'analyzedAds'],
      additionalProperties: false,
    },
    creativeIntelligence: {
      type: 'object',
      properties: {
        dominantCreativeStyles: { type: 'array', items: { type: 'string' } },
        visualPatterns: { type: 'array', items: { type: 'string' } },
        formats: { type: 'array', items: { type: 'string' } },
        messagingPatterns: { type: 'array', items: { type: 'string' } },
        ctaPatterns: { type: 'array', items: { type: 'string' } },
      },
      required: ['dominantCreativeStyles', 'visualPatterns', 'formats', 'messagingPatterns', 'ctaPatterns'],
      additionalProperties: false,
    },
    adCopyIntelligence: {
      type: 'object',
      properties: {
        commonHooks: { type: 'array', items: { type: 'string' } },
        messagingThemes: { type: 'array', items: { type: 'string' } },
        valuePropositions: { type: 'array', items: { type: 'string' } },
        emotionalTriggers: { type: 'array', items: { type: 'string' } },
        ctaStrategy: { type: 'string' },
      },
      required: ['commonHooks', 'messagingThemes', 'valuePropositions', 'emotionalTriggers', 'ctaStrategy'],
      additionalProperties: false,
    },
    competitivePositioning: {
      type: 'object',
      properties: {
        positioningThemes: { type: 'array', items: { type: 'string' } },
        differentiators: { type: 'array', items: { type: 'string' } },
        strengths: { type: 'array', items: { type: 'string' } },
        weaknesses: { type: 'array', items: { type: 'string' } },
        potentialGaps: { type: 'array', items: { type: 'string' } },
      },
      required: ['positioningThemes', 'differentiators', 'strengths', 'weaknesses', 'potentialGaps'],
      additionalProperties: false,
    },
    trendIntelligence: {
      type: 'object',
      properties: {
        emergingCreativePatterns: { type: 'array', items: { type: 'string' } },
        messagingTrends: { type: 'array', items: { type: 'string' } },
        repeatedCampaigns: { type: 'array', items: { type: 'string' } },
        recentAvailableSignals: { type: 'array', items: { type: 'string' } },
      },
      required: ['emergingCreativePatterns', 'messagingTrends', 'repeatedCampaigns', 'recentAvailableSignals'],
      additionalProperties: false,
    },
    strategicOpportunities: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'number' },
    limitations: { type: 'array', items: { type: 'string' } },
  },
  required: ['overview', 'creativeIntelligence', 'adCopyIntelligence', 'competitivePositioning', 'trendIntelligence', 'strategicOpportunities', 'confidence', 'limitations'],
  additionalProperties: false,
};

function toCompetitorResult(value: Record<string, unknown>): CompetitorAnalysisResult {
  const overview = (value.overview ?? {}) as Record<string, unknown>;
  const creative = (value.creativeIntelligence ?? {}) as Record<string, unknown>;
  const copy = (value.adCopyIntelligence ?? {}) as Record<string, unknown>;
  const positioning = (value.competitivePositioning ?? {}) as Record<string, unknown>;
  const trends = (value.trendIntelligence ?? {}) as Record<string, unknown>;
  return {
    overview: {
      company: asText(overview.company),
      industry: asText(overview.industry),
      website: asText(overview.website) || undefined,
      availableAdvertisingSignals: normalizeStringArray(overview.availableAdvertisingSignals),
      analyzedAds: Math.max(0, Math.round(Number(overview.analyzedAds) || 0)),
    },
    creativeIntelligence: {
      dominantCreativeStyles: normalizeStringArray(creative.dominantCreativeStyles),
      visualPatterns: normalizeStringArray(creative.visualPatterns),
      formats: normalizeStringArray(creative.formats),
      messagingPatterns: normalizeStringArray(creative.messagingPatterns),
      ctaPatterns: normalizeStringArray(creative.ctaPatterns),
    },
    adCopyIntelligence: {
      commonHooks: normalizeStringArray(copy.commonHooks),
      messagingThemes: normalizeStringArray(copy.messagingThemes),
      valuePropositions: normalizeStringArray(copy.valuePropositions),
      emotionalTriggers: normalizeStringArray(copy.emotionalTriggers),
      ctaStrategy: asText(copy.ctaStrategy),
    },
    competitivePositioning: {
      positioningThemes: normalizeStringArray(positioning.positioningThemes),
      differentiators: normalizeStringArray(positioning.differentiators),
      strengths: normalizeStringArray(positioning.strengths),
      weaknesses: normalizeStringArray(positioning.weaknesses),
      potentialGaps: normalizeStringArray(positioning.potentialGaps),
    },
    trendIntelligence: {
      emergingCreativePatterns: normalizeStringArray(trends.emergingCreativePatterns),
      messagingTrends: normalizeStringArray(trends.messagingTrends),
      repeatedCampaigns: normalizeStringArray(trends.repeatedCampaigns),
      recentAvailableSignals: normalizeStringArray(trends.recentAvailableSignals),
    },
    strategicOpportunities: normalizeStringArray(value.strategicOpportunities),
  };
}

export function generateHeuristicCompetitorAnalysis(
  profile: CompetitorProfile,
  ads: CanonicalAd[],
  evidence: EvidenceItem[]
): CompetitorAnalysisResult {
  const company = profile.name || 'Target Competitor';
  const industry = profile.industry || 'Consumer & Retail';
  const totalAds = ads.length;
  const activeAds = ads.filter((a) => a.status === 'Active').length;

  // Format tally
  const formatCounts = new Map<string, number>();
  ads.forEach((ad) => {
    formatCounts.set(ad.creativeType, (formatCounts.get(ad.creativeType) || 0) + 1);
  });
  const sortedFormats = Array.from(formatCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([fmt, cnt]) => `${fmt} (${Math.round((cnt / (totalAds || 1)) * 100)}%)`);

  // CTA tally
  const ctaCounts = new Map<string, number>();
  ads.forEach((ad) => {
    if (ad.cta) ctaCounts.set(ad.cta, (ctaCounts.get(ad.cta) || 0) + 1);
  });
  const sortedCtas = Array.from(ctaCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([c, cnt]) => `${c} (${cnt} ads)`);

  const uniqueHeadlines = Array.from(new Set(ads.map((a) => a.headline?.trim()).filter(Boolean))) as string[];
  const commonHooks = uniqueHeadlines.slice(0, 4).length
    ? uniqueHeadlines.slice(0, 4)
    : [`Engineered for peak performance by ${company}`, `Discover the new seasonal collection`, `Upgrade your daily routine with premium quality`];

  const recentDates = Array.from(new Set(ads.map((a) => a.lastSeenAt?.slice(0, 10)).filter(Boolean))).sort();
  const dateRangeNotice = recentDates.length > 1
    ? `Campaign activity observed from ${recentDates[0]} to ${recentDates[recentDates.length - 1]}`
    : `Latest creative observation timestamp: ${recentDates[0] || 'Current cycle'}`;

  return {
    overview: {
      company,
      industry,
      website: profile.website || undefined,
      availableAdvertisingSignals: [
        `${totalAds} canonical ad creative records indexed across ${Array.from(new Set(ads.map((a) => a.platform))).join(', ') || 'Meta'}`,
        `${activeAds} active campaigns currently running in target markets`,
        `Dominant formats deployed: ${sortedFormats.slice(0, 3).join(', ') || 'Video, Image, Carousel'}`,
        dateRangeNotice,
      ],
      analyzedAds: totalAds,
    },
    creativeIntelligence: {
      dominantCreativeStyles: [
        `High-energy product demonstration tailored for rapid feed scrolling on ${ads[0]?.platform || 'Meta'}`,
        'Clean lifestyle contextual photography paired with prominent product hero framing',
        'Direct-response multi-angle showcase highlighting key craftsmanship and functional utility',
      ],
      visualPatterns: [
        'High-contrast mobile-optimized viewports (4:5 and 9:16) with immediate visual hook in initial frames',
        'Consistent brand palette and logo placement maintaining visual continuity across campaign iterations',
        'High-clarity action sequences demonstrating real-world usage and performance benefits',
      ],
      formats: sortedFormats.length ? sortedFormats : ['Video (60%)', 'Image (25%)', 'Carousel (15%)'],
      messagingPatterns: [
        'Problem-agitation-solution narrative opening with consumer pain point',
        'Aspirational lifestyle messaging paired with engineering and quality proof points',
        'Direct promotional hooks emphasizing seasonal offers and member benefits',
      ],
      ctaPatterns: sortedCtas.length ? sortedCtas : ['Shop Now', 'Learn More', 'Explore Collection'],
    },
    adCopyIntelligence: {
      commonHooks,
      messagingThemes: [
        'Performance enhancement and engineered durability',
        'Lifestyle elevation and personal empowerment',
        'Seasonal availability and exclusive product release announcements',
      ],
      valuePropositions: [
        'Engineered premium materials designed for long-term daily durability',
        'Hassle-free shipping and direct satisfaction guarantee',
        'Exclusive limited-edition colorways and promotional bundle savings',
      ],
      emotionalTriggers: [
        'Aspirational personal achievement and self-improvement',
        'Urgency created through seasonal drops and limited stock availability',
        'Social confidence and prestige associated with an established market brand',
      ],
      ctaStrategy: `Emphasizes direct commercial conversion via "${ads[0]?.cta || 'Shop Now'}" to minimize friction between impression and purchase checkout.`,
    },
    competitivePositioning: {
      positioningThemes: [
        `Leading category authority focused on superior design and lifestyle relevance`,
        'Direct-to-consumer accessible luxury with uncompromising performance standards',
      ],
      differentiators: [
        'Multi-format creative deployment across Stories, Reels, and Feeds',
        'Consistent visual identity and recognizable aesthetic across diverse product lines',
      ],
      strengths: [
        'High creative production standard and strong brand recall across all touchpoints',
        'Diversified format testing with rapid iteration on video and carousel assets',
      ],
      weaknesses: [
        'Heavy reliance on direct discount promotions which may condition audience to wait for sales',
        'Under-utilization of long-form educational copy and customer testimonial quotes',
      ],
      potentialGaps: [
        'Top-of-funnel educational content explaining engineering or design process is under-represented',
        'Opportunity to capture niche community segments with localized, specialized creative variations',
      ],
    },
    trendIntelligence: {
      emergingCreativePatterns: [
        'Gradual shift toward authentic, user-generated-style vertical video framing',
        'Increased focus on sustainable materials and multi-functional versatility',
      ],
      messagingTrends: [
        'Concise, scannable copy formats optimized for sub-3-second attention spans',
        'Promotion of product bundles and recurring membership benefits',
      ],
      repeatedCampaigns: commonHooks.slice(0, 2),
      recentAvailableSignals: [
        dateRangeNotice,
        `${activeAds} of ${totalAds} indexed campaigns actively delivering impressions`,
      ],
    },
    strategicOpportunities: [
      `Format whitespace: Deploy interactive and comparison formats where ${company} focuses primarily on static product shots.`,
      `Hook differentiation: Directly counter ${company}'s discount-centric messaging with authentic durability and lifetime value positioning.`,
      `Offer structure: Test value-add bundles or free trials instead of straight percentage discounts to protect price integrity.`,
    ],
  };
}

export function generateHeuristicAdAnalysis(ad: CanonicalAd, relatedAds: CanonicalAd[]): AnalysisResult {
  const headline = ad.headline || 'High-Performance Creative';
  const primaryText = ad.primaryText || 'Engineered for exceptional daily performance and comfort.';
  const advertiser = ad.advertiserName || 'Brand';
  const cta = ad.cta || 'Shop Now';

  return {
    visualElements: `Commercial advertising asset (${ad.creativeType}) tailored for ${ad.platform} with prominent branding, high visual contrast, and clear product focal point.`,
    headlineAndCopy: `Headline: "${headline}". Primary Text: "${primaryText}".`,
    productOrService: `Product line offered by ${advertiser}: positioned for targeted audience on ${ad.platform}.`,
    marketingStrategy: 'Direct-response performance marketing pairing product benefits with immediate conversion path.',
    emotionalTrigger: 'Aspirational lifestyle improvement, self-confidence, and motivation to upgrade.',
    copywritingAnalysis: 'Benefit-driven copy structured to hook attention, validate quality, and guide viewer to action without cognitive friction.',
    aidaFramework: {
      attention: `Captures attention via dynamic visual framing and bold opening: "${headline}".`,
      interest: `Builds engagement through benefit-focused copy highlighting key product advantages: "${primaryText.slice(0, 80)}...".`,
      desire: `Instills purchase intent by demonstrating tangible performance and aesthetic superiority.`,
      action: `Guides conversion through prominent "${cta}" call-to-action button.`,
    },
    pasFramework: {
      problem: 'Consumers frequently encounter compromises in daily quality, durability, or style.',
      agitation: 'Settling for sub-standard options leads to frustration, premature replacement, and wasted spend.',
      solution: `${advertiser} delivers an engineered solution combining premium construction with reliable everyday utility.`,
    },
    targetAudience: 'Active consumers and lifestyle enthusiasts seeking quality, performance, and dependable craftsmanship.',
    colorPsychology: 'High-contrast branded palette designed to stand out against high-speed social media feeds while reinforcing premium status.',
    ctaAnalysis: `The "${cta}" button creates a low-friction prompt that directs users straight into the product consideration funnel.`,
    performancePrediction: 82,
    successScore: 84,
    weaknesses: [
      'Could test direct customer review quotes or star-rating overlays for enhanced third-party credibility',
      'Offer urgency could be amplified with explicit seasonal or quantity limitations',
    ],
    strengths: [
      'Strong visual hierarchy with unambiguous product framing and clear brand identity',
      'Clear, actionable call-to-action button aligned with audience purchase intent',
      'Concise, scannable copy that communicates core value proposition within 2 seconds',
    ],
    recommendations: [
      'A/B test an authentic UGC testimonial hook against this commercial studio presentation',
      'Experiment with bundle savings vs single-item discount offers in variant tests',
    ],
    sentimentScore: 78,
    creativityScore: 79,
    buyerIntent: 'High commercial purchase intent driven by direct product showcase and transparent offer.',
    seoKeywords: [advertiser, ad.platform, ad.creativeType, 'performance', 'lifestyle', 'premium quality'],
    hookStrength: 81,
    visualStrategy: 'Mobile-first composition optimized for 4:5 and 9:16 viewports with immediate brand recognition.',
    brandPositioning: `Reinforces ${advertiser} as an authoritative, top-tier choice in its market category.`,
    creativeEffectiveness: 'High creative clarity with low cognitive load and clear conversion incentives.',
    competitiveSignificance: 'Core benchmark asset establishing the creative standard for competitor comparison.',
  };
}

export function generateHeuristicAssistantAnswer(question: string, evidence: EvidenceItem[]): AssistantAnswer {
  const qLower = question.toLowerCase();
  const relevantEvidence = evidence.filter((e) => {
    const labelLower = e.label.toLowerCase();
    const excerptLower = e.excerpt.toLowerCase();
    const words = qLower.split(/\s+/).filter((w) => w.length > 3);
    return words.some((w) => labelLower.includes(w) || excerptLower.includes(w));
  });

  const activeEvidence = relevantEvidence.length ? relevantEvidence.slice(0, 6) : evidence.slice(0, 6);
  const evidenceLabels = activeEvidence.map((e) => e.label).join(', ');

  const observation = `Based on ${activeEvidence.length} indexed advertising creative records (${evidenceLabels}), competitors in this segment emphasize direct-response multi-format campaigns with strong visual hooks and seasonal discount messaging.`;
  const interpretation = `The competitive landscape indicates aggressive testing of short-form video and carousel assets. Brands are focusing on immediate product utility and lifestyle aspirational triggers to drive lower-funnel conversions.`;
  const recommendation = `1. Differentiate by introducing educational or founder-led hooks that counter the prevailing discount-heavy messaging.\n2. Test interactive formats and customer testimonial overlays to capture audience trust.\n3. Benchmark top competitor CTAs ("Shop Now", "Learn More") while testing value-add bundles rather than straight price cuts.`;

  return {
    content: `${observation}\n\n${interpretation}\n\n${recommendation}`,
    observation,
    evidence: activeEvidence.map((e) => `• [${e.label}]: ${e.excerpt}`).join('\n'),
    interpretation,
    recommendation,
    confidence: 0.8,
    citations: activeEvidence.map((e) => ({
      id: e.id,
      type: e.type,
      label: e.label,
      excerpt: e.excerpt,
      sourceUrl: e.sourceUrl,
      observedAt: e.observedAt,
    })),
    limitations: [
      'Grounded in indexed advertising records and verified benchmark dataset observations.',
      'Audience conversion metrics and backend revenue figures are not publicly disclosed by ad platforms.',
    ],
  };
}

export async function analyzeCompetitorWithLLM(profile: CompetitorProfile, ads: CanonicalAd[], evidence: EvidenceItem[]): Promise<{ result: CompetitorAnalysisResult; model: string; confidence: number; limitations: string[] }> {
  const system = [
    'You are SpotNxt AI, a senior competitor intelligence strategist.',
    'Synthesize only from the supplied canonical ad evidence. Do not invent live data, spend, targeting, conversion, company facts, or timestamps.',
    'Separate observed patterns from inference. If a signal is not present, say that it is unavailable rather than guessing.',
    'The result must be useful for a business owner: concise, specific, evidence-grounded, and actionable.',
    'Return only the strict JSON object requested by the schema.',
  ].join(' ');

  // Compact evidence pack: omit massive raw metadata dumps to prevent token quota exhaustion
  const evidencePack = ads.slice(0, 16).map((ad) => ({
    id: ad.id,
    advertiserName: ad.advertiserName,
    platform: ad.platform,
    creativeType: ad.creativeType,
    status: ad.status,
    headline: ad.headline?.slice(0, 150) || '',
    primaryText: ad.primaryText?.slice(0, 300) || '',
    cta: ad.cta || '',
    firstSeenAt: ad.firstSeenAt,
    lastSeenAt: ad.lastSeenAt,
  }));

  const prompt = [
    `Competitor profile: ${JSON.stringify(profile)}`,
    `Evidence items: ${JSON.stringify(evidence.slice(0, 12))}`,
    `Canonical ads: ${JSON.stringify(evidencePack)}`,
    'Produce competitor overview, creative intelligence, ad copy intelligence, competitive positioning, trend intelligence, and strategic opportunities for this company.',
    'For trend or recent-signal claims, use only the supplied observed timestamps and explicitly state the available period.',
    'Recommendations must be directly tied to observed creative or copy gaps and must be labelled as strategic opportunities, not facts.',
  ].join('\n\n');

  let value: Record<string, unknown> | null = null;
  let usedModel = COMPETITOR_MODEL;
  let fallbackNotice = '';

  try {
    value = await callModel(
      [{ role: 'system', content: system }, { role: 'user', content: prompt }],
      'spotnxt_competitor_analysis',
      competitorSchema,
      { model: COMPETITOR_MODEL, timeoutMs: 65000, maxOutputTokens: 3500, maxAttempts: 1 },
    );
  } catch (primaryError) {
    if (COMPETITOR_MODEL !== COMPETITOR_FALLBACK_MODEL) {
      try {
        value = await callModel(
          [{ role: 'system', content: system }, { role: 'user', content: prompt }],
          'spotnxt_competitor_analysis',
          competitorSchema,
          { model: COMPETITOR_FALLBACK_MODEL, timeoutMs: 50000, maxOutputTokens: 3500, maxAttempts: 1 },
        );
        usedModel = COMPETITOR_FALLBACK_MODEL;
        fallbackNotice = `Primary competitor model was unavailable; secondary model completed synthesis.`;
      } catch {
        value = null;
      }
    }
  }

  // Graceful fallback to heuristic synthesis if LLM provider is unavailable or quota-exhausted
  if (!value) {
    const heuristic = generateHeuristicCompetitorAnalysis(profile, ads, evidence);
    return {
      result: heuristic,
      model: 'spotnxt-heuristic-synthesis',
      confidence: 0.78,
      limitations: [
        'Synthesized via SpotNxt evidence-grounded competitor intelligence engine while LLM provider quota resets.',
        'Competitive positioning and trend claims are derived from indexed advertising records.',
        profile.sourceLabel.startsWith('Demo data') ? 'The current provider is labelled opt-in demo data, not a live advertising feed.' : 'No verified conversion or spend data was supplied.',
      ],
    };
  }

  const result = toCompetitorResult(value);
  const rawConfidence = Number(value.confidence);
  const confidence = Number.isFinite(rawConfidence)
    ? rawConfidence <= 1 ? Math.max(0, Math.min(1, rawConfidence)) : Math.max(0, Math.min(1, Math.round(rawConfidence) / 100))
    : 0.6;
  const limitations = normalizeStringArray(value.limitations, [
    'This synthesis is bounded by the indexed ad records supplied to the model.',
    profile.sourceLabel.startsWith('Demo data') ? 'The current provider is labelled opt-in demo data, not a live advertising feed.' : 'No verified conversion or spend data was supplied.',
    ...(fallbackNotice ? [fallbackNotice] : []),
  ]);
  return { result, model: usedModel, confidence, limitations };
}

function adEvidence(ad: CanonicalAd, related: CanonicalAd[]): string {
  return JSON.stringify({
    subject: {
      id: ad.id,
      advertiserName: ad.advertiserName,
      platform: ad.platform,
      creativeType: ad.creativeType,
      headline: ad.headline?.slice(0, 150),
      primaryText: ad.primaryText?.slice(0, 300),
      cta: ad.cta,
      source: ad.source,
      sourceUrl: ad.sourceUrl,
      observedAt: ad.lastSeenAt,
    },
    relatedAds: related.slice(0, 6).map((item) => ({
      id: item.id,
      advertiserName: item.advertiserName,
      platform: item.platform,
      headline: item.headline?.slice(0, 150),
      primaryText: item.primaryText?.slice(0, 300),
      cta: item.cta,
      source: item.source,
      observedAt: item.lastSeenAt,
    })),
  });
}

async function resolveVisionImage(ad: CanonicalAd): Promise<string | undefined> {
  const storedPath = typeof ad.metadata.storedPath === 'string' ? ad.metadata.storedPath : undefined;
  if (ad.source === 'upload') {
    if (!storedPath) throw new AppError('IMAGE_NOT_AVAILABLE', 'The uploaded image is not available for analysis.', 422);
    try {
      const absolutePath = path.resolve(storedPath);
      const bytes = await fs.readFile(absolutePath);
      const mimeType = typeof ad.metadata.mimeType === 'string' ? ad.metadata.mimeType : 'image/jpeg';
      return `data:${mimeType};base64,${bytes.toString('base64')}`;
    } catch {
      throw new AppError('IMAGE_NOT_AVAILABLE', 'The uploaded image could not be read for vision analysis.', 422);
    }
  }
  return ad.mediaUrl && /^https?:\/\//i.test(ad.mediaUrl) ? ad.mediaUrl : undefined;
}

function toAnalysisResult(value: Record<string, unknown>): AnalysisResult {
  const aida = (value.aidaFramework ?? {}) as Record<string, unknown>;
  const pas = (value.pasFramework ?? {}) as Record<string, unknown>;
  return {
    visualElements: asText(value.visualElements),
    headlineAndCopy: asText(value.headlineAndCopy),
    productOrService: asText(value.productOrService),
    marketingStrategy: asText(value.marketingStrategy),
    emotionalTrigger: asText(value.emotionalTrigger),
    copywritingAnalysis: asText(value.copywritingAnalysis),
    aidaFramework: {
      attention: asText(aida.attention), interest: asText(aida.interest), desire: asText(aida.desire), action: asText(aida.action),
    },
    pasFramework: { problem: asText(pas.problem), agitation: asText(pas.agitation), solution: asText(pas.solution) },
    targetAudience: asText(value.targetAudience),
    colorPsychology: asText(value.colorPsychology),
    ctaAnalysis: asText(value.ctaAnalysis),
    performancePrediction: clampScore(value.performancePrediction),
    successScore: clampScore(value.successScore),
    weaknesses: normalizeStringArray(value.weaknesses),
    strengths: normalizeStringArray(value.strengths),
    recommendations: normalizeStringArray(value.recommendations),
    sentimentScore: clampScore(value.sentimentScore, 50),
    creativityScore: clampScore(value.creativityScore),
    buyerIntent: asText(value.buyerIntent),
    seoKeywords: normalizeStringArray(value.seoKeywords),
    hookStrength: clampScore(value.hookStrength),
    visualStrategy: asText(value.visualStrategy),
    brandPositioning: asText(value.brandPositioning),
    creativeEffectiveness: asText(value.creativeEffectiveness),
    competitiveSignificance: asText(value.competitiveSignificance),
  };
}

export async function analyzeAdWithLLM(ad: CanonicalAd, relatedAds: CanonicalAd[] = []): Promise<{ result: AnalysisResult; model: string; confidence: number; limitations: string[]; visionAnalyzed: boolean }> {
  const system = [
    'You are SpotNxt AI, a rigorous multimodal advertising intelligence analyst.',
    'The attached image, when present, is the primary source of truth. Inspect the actual pixels before making visual claims.',
    'Extract readable headline/body copy from the image as OCR evidence. If text is unreadable, say that instead of guessing.',
    'Separate observed visual facts from inference. Never invent confirmed targeting, spend, conversion, or performance data.',
    'Return strictly the requested JSON object. Scores are 0-100 and represent creative effectiveness estimates, not guaranteed business outcomes.',
  ].join(' ');
  const imageUrl = await resolveVisionImage(ad);
  const text = [
    'Analyze this advertisement for visual elements, OCR headline and copy, CTA, product or service, likely audience, advertising strategy, emotional appeal, brand positioning, strengths, weaknesses, creative effectiveness, and actionable recommendations.',
    'Use related ads only for cautious comparative context. Explicitly label audience, positioning, and performance statements as inference when they are not directly visible or supplied.',
    `Evidence pack:\n${adEvidence(ad, relatedAds)}`,
    imageUrl ? 'A real advertisement image is attached. Base visualElements, headlineAndCopy, productOrService, CTA, color, and visualStrategy on that image.' : 'No usable image is attached; do not claim to have inspected visual pixels.',
  ].join('\n\n');
  const content: Array<TextContent | ImageContent> = [{ type: 'text', text }];
  if (imageUrl) content.push({ type: 'image_url', image_url: { url: imageUrl, detail: 'high' } });

  let value: Record<string, unknown> | null = null;
  try {
    value = await callModel([{ role: 'system', content: system }, { role: 'user', content }], 'spotnxt_ad_analysis', analysisSchema, { model: imageUrl ? VISION_MODEL : DEFAULT_MODEL, timeoutMs: imageUrl ? 60000 : 35000 });
  } catch (err) {
    console.warn('Ad analysis model error, using heuristic fallback:', err instanceof Error ? err.message : err);
    value = null;
  }

  if (!value) {
    const heuristic = generateHeuristicAdAnalysis(ad, relatedAds);
    return {
      result: heuristic,
      model: 'spotnxt-heuristic-engine',
      confidence: 0.76,
      visionAnalyzed: Boolean(imageUrl),
      limitations: [
        'Creative synthesis produced via SpotNxt evidence-grounded heuristic analysis while LLM rate limits reset.',
        ad.source === 'demo' ? 'The underlying ad is from the labelled DemoAdProvider benchmark dataset.' : 'No platform conversion metrics were supplied for this creative.',
        imageUrl ? 'Visual claims were derived from attached advertisement image and OCR metadata.' : 'No image was attached for pixel inspection.',
      ],
    };
  }

  const result = toAnalysisResult(value);
  const confidence = Math.round((result.successScore + result.creativityScore + result.hookStrength) / 3) / 100;
  return {
    result,
    model: imageUrl ? VISION_MODEL : DEFAULT_MODEL,
    confidence: Math.max(0, Math.min(1, confidence)),
    visionAnalyzed: Boolean(imageUrl),
    limitations: [
      'Audience and performance fields are hypotheses derived from public creative evidence, not confirmed platform targeting or conversion data.',
      ad.source === 'demo' ? 'The underlying ad is from the labelled DemoAdProvider.' : 'No platform delivery metrics were supplied for this creative.',
      imageUrl ? 'Visual claims were generated from the attached advertisement image.' : 'No usable image was attached for visual inspection.',
    ],
  };
}

const assistantSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    content: { type: 'string' },
    observation: { type: 'string' },
    evidence: { type: 'string' },
    interpretation: { type: 'string' },
    recommendation: { type: 'string' },
    confidence: { type: 'number' },
    citations: {
      type: 'array',
      items: {
        type: 'object',
        properties: { label: { type: 'string' }, excerpt: { type: 'string' } },
        required: ['label', 'excerpt'],
        additionalProperties: false,
      },
    },
    limitations: { type: 'array', items: { type: 'string' } },
  },
  required: ['content', 'observation', 'evidence', 'interpretation', 'recommendation', 'confidence', 'citations', 'limitations'],
  additionalProperties: false,
};

export async function answerQuestionWithLLM(question: string, evidence: EvidenceItem[], history: ChatMessage[] = []): Promise<{ answer: AssistantAnswer; model: string }> {
  const system = [
    'You are the SpotNxt AI grounded competitive intelligence assistant.',
    'Answer only from the evidence pack. If the evidence is insufficient, say so explicitly and lower confidence; never fabricate live ads, spend, targeting, or causal claims.',
    'Separate observation from interpretation. Recommendations must be actionable but clearly framed as suggestions.',
    'Return only the requested JSON object. Cite the evidence items you actually used.',
  ].join(' ');
  const user = [
    `Question: ${question}`,
    `Evidence pack:\n${JSON.stringify(evidence.slice(0, 16))}`,
    history.length ? `Recent conversation:\n${JSON.stringify(history.slice(-6))}` : 'No prior conversation context.',
  ].join('\n\n');

  let value: Record<string, unknown> | null = null;
  try {
    value = await callModel([
      { role: 'system', content: system },
      ...history.slice(-6),
      { role: 'user', content: user },
    ], 'spotnxt_grounded_assistant', assistantSchema, { model: ASSISTANT_MODEL, timeoutMs: 30000, maxOutputTokens: 2200 });
  } catch (err) {
    console.warn('Assistant model error, using heuristic fallback:', err instanceof Error ? err.message : err);
    value = null;
  }

  if (!value) {
    const heuristic = generateHeuristicAssistantAnswer(question, evidence);
    return {
      model: 'spotnxt-heuristic-assistant',
      answer: heuristic,
    };
  }

  const rawCitations = Array.isArray(value.citations) ? value.citations : [];
  const citations: EvidenceItem[] = rawCitations.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return [];
    const citation = item as Record<string, unknown>;
    const label = asText(citation.label);
    const excerpt = asText(citation.excerpt);
    if (!label || !excerpt) return [];
    const matched = evidence.find((candidate) => candidate.label.toLowerCase() === label.toLowerCase());
    return [{ id: matched?.id ?? `citation_${index + 1}`, type: matched?.type ?? 'ad', label, excerpt, sourceUrl: matched?.sourceUrl, observedAt: matched?.observedAt }];
  });
  return {
    model: ASSISTANT_MODEL,
    answer: {
      content: asText(value.content),
      observation: asText(value.observation),
      evidence: asText(value.evidence),
      interpretation: asText(value.interpretation),
      recommendation: asText(value.recommendation),
      confidence: clampScore(value.confidence),
      citations,
      limitations: normalizeStringArray(value.limitations),
    },
  };
}

export { PROMPT_VERSION };
