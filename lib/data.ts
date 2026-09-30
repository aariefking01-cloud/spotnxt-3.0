export type AdPlatform = 'Meta' | 'Uploaded';

export interface AdCreative {
  id: string;
  competitorId: string;
  competitorName: string;
  headline: string;
  bodyCopy: string;
  cta: string;
  platform: AdPlatform;
  format: 'Image' | 'Video' | 'Carousel' | 'Story' | 'Reel';
  imageUrl: string;
  startDate: string;
  durationDays: number;
  estimatedEngagement: number;
  impressions: number;
  status: 'Active' | 'Paused' | 'Ended';
  hookType: string;
  sentiment: 'Positive' | 'Neutral' | 'Urgent' | 'Aspirational';
  firstSeen: string;
  lastSeen: string;
}

export interface Competitor {
  id: string;
  name: string;
  logoUrl: string;
  industry: string;
  website: string;
  totalAds: number;
  activeCampaigns: number;
  estMonthlySpend: number;
  avgEngagement: number;
  aiScore: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  topPlatform: AdPlatform;
  creativeMix: { format: string; share: number }[];
  messagingThemes: string[];
  ctaPatterns: string[];
  strategicMomentum: number;
}

export interface AIAnalysis {
  visualElements?: string;
  headlineAndCopy?: string;
  productOrService?: string;
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
  brandPositioning?: string;
  creativeEffectiveness?: string;
  competitiveSignificance: string;
}

export interface IntelligenceEvent {
  id: number;
  competitor: string;
  event: string;
  timestamp: string;
  evidence: string;
  impact: 'Critical' | 'High' | 'Medium' | 'Low';
  confidence: number;
  recommendedAction: string;
  category: string;
}

export interface Recommendation {
  id: number;
  title: string;
  whyNow: string;
  evidence: string;
  expectedImpact: 'High' | 'Medium' | 'Low';
  confidence: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  effort: 'Low' | 'Medium' | 'High';
  suggestedNextStep: string;
  category: string;
}

export interface TrendData {
  id: number;
  name: string;
  momentum: number;
  growth: number;
  confidence: number;
  firstDetected: string;
  competitorsAdopting: number;
  strategicImplication: string;
  category: string;
}

export interface AlertData {
  id: number;
  title: string;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  competitor: string;
  timestamp: string;
  category: string;
}

export const competitors: Competitor[] = [
  {
    id: 'comp-1',
    name: 'NovaFit',
    logoUrl: 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=200',
    industry: 'Fitness & Wellness',
    website: 'novafit.com',
    totalAds: 342,
    activeCampaigns: 8,
    estMonthlySpend: 280000,
    avgEngagement: 9.4,
    aiScore: 88,
    trend: 'up',
    trendValue: 23.5,
    topPlatform: 'Meta',
    creativeMix: [{ format: 'Video', share: 48 }, { format: 'Image', share: 28 }, { format: 'Carousel', share: 16 }, { format: 'Reel', share: 8 }],
    messagingThemes: ['Transformation', 'Community', 'Science-backed'],
    ctaPatterns: ['Start Free Trial', 'Join Now', 'Get Started'],
    strategicMomentum: 82,
  },
  {
    id: 'comp-2',
    name: 'Lumiere',
    logoUrl: 'https://images.pexels.com/photos/3373736/pexels-photo-3373736.jpeg?auto=compress&cs=tinysrgb&w=200',
    industry: 'Beauty & Skincare',
    website: 'lumiere.co',
    totalAds: 218,
    activeCampaigns: 6,
    estMonthlySpend: 145000,
    avgEngagement: 11.8,
    aiScore: 91,
    trend: 'up',
    trendValue: 15.2,
    topPlatform: 'Meta',
    creativeMix: [{ format: 'Video', share: 35 }, { format: 'Image', share: 40 }, { format: 'Carousel', share: 20 }, { format: 'Story', share: 5 }],
    messagingThemes: ['Clean beauty', 'Dermatologist-approved', 'Glow'],
    ctaPatterns: ['Shop Now', 'Discover', 'Find Your Shade'],
    strategicMomentum: 78,
  },
  {
    id: 'comp-3',
    name: 'Driftwood',
    logoUrl: 'https://images.pexels.com/photos/2028967/pexels-photo-2028967.jpeg?auto=compress&cs=tinysrgb&w=200',
    industry: 'Travel & Hospitality',
    website: 'driftwood.studio',
    totalAds: 487,
    activeCampaigns: 12,
    estMonthlySpend: 420000,
    avgEngagement: 7.2,
    aiScore: 84,
    trend: 'stable',
    trendValue: 2.1,
    topPlatform: 'Meta',
    creativeMix: [{ format: 'Video', share: 52 }, { format: 'Image', share: 22 }, { format: 'Carousel', share: 18 }, { format: 'Reel', share: 8 }],
    messagingThemes: ['Escape', 'Authentic experience', 'Local hosts'],
    ctaPatterns: ['Book Now', 'Explore Stays', 'Start Searching'],
    strategicMomentum: 65,
  },
  {
    id: 'comp-4',
    name: 'Cadence',
    logoUrl: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=200',
    industry: 'Music & Audio',
    website: 'cadence.fm',
    totalAds: 156,
    activeCampaigns: 4,
    estMonthlySpend: 190000,
    avgEngagement: 10.1,
    aiScore: 89,
    trend: 'up',
    trendValue: 8.7,
    topPlatform: 'Meta',
    creativeMix: [{ format: 'Video', share: 65 }, { format: 'Image', share: 20 }, { format: 'Carousel', share: 10 }, { format: 'Story', share: 5 }],
    messagingThemes: ['Ad-free listening', 'Discovery', 'Offline mode'],
    ctaPatterns: ['Try Free', 'Listen Now', 'Get 3 Months Free'],
    strategicMomentum: 74,
  },
  {
    id: 'comp-5',
    name: 'FlowDesk',
    logoUrl: 'https://images.pexels.com/photos/7773298/pexels-photo-7773298.jpeg?auto=compress&cs=tinysrgb&w=200',
    industry: 'SaaS & Productivity',
    website: 'flowdesk.io',
    totalAds: 134,
    activeCampaigns: 5,
    estMonthlySpend: 85000,
    avgEngagement: 8.3,
    aiScore: 86,
    trend: 'up',
    trendValue: 12.4,
    topPlatform: 'Meta',
    creativeMix: [{ format: 'Video', share: 30 }, { format: 'Image', share: 45 }, { format: 'Carousel', share: 20 }, { format: 'Story', share: 5 }],
    messagingThemes: ['All-in-one', 'Replace chaos', 'Team alignment'],
    ctaPatterns: ['Get Started Free', 'Try FlowDesk', 'See How It Works'],
    strategicMomentum: 71,
  },
  {
    id: 'comp-6',
    name: 'Lingua',
    logoUrl: 'https://images.pexels.com/photos/4145190/pexels-photo-4145190.jpeg?auto=compress&cs=tinysrgb&w=200',
    industry: 'EdTech & Language',
    website: 'lingua.app',
    totalAds: 298,
    activeCampaigns: 9,
    estMonthlySpend: 120000,
    avgEngagement: 14.6,
    aiScore: 93,
    trend: 'up',
    trendValue: 28.9,
    topPlatform: 'Meta',
    creativeMix: [{ format: 'Video', share: 58 }, { format: 'Reel', share: 22 }, { format: 'Image', share: 12 }, { format: 'Carousel', share: 8 }],
    messagingThemes: ['Daily streaks', 'Gamified learning', 'Bite-sized'],
    ctaPatterns: ['Start Learning Free', 'Try Super Free', 'Join 500M+'],
    strategicMomentum: 88,
  },
];

export const adCreatives: AdCreative[] = [
  {
    id: 'ad-1',
    competitorId: 'comp-1',
    competitorName: 'NovaFit',
    headline: 'Your Transformation Starts Today — Not Monday',
    bodyCopy:
      'Stop waiting for the perfect moment. NovaFit members lose an average of 12lbs in their first 90 days with AI-personalized training plans. No gym required. Start your free 14-day trial.',
    cta: 'Start Free Trial',
    platform: 'Meta',
    format: 'Video',
    imageUrl: 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800',
    startDate: '2026-07-01',
    durationDays: 45,
    estimatedEngagement: 9.8,
    impressions: 2400000,
    status: 'Active',
    hookType: 'Pain point + social proof',
    sentiment: 'Aspirational',
    firstSeen: '2026-07-01',
    lastSeen: '2026-08-14',
  },
  {
    id: 'ad-2',
    competitorId: 'comp-1',
    competitorName: 'NovaFit',
    headline: 'The 12-Minute Workout That Replaces Your Gym',
    bodyCopy:
      'Backed by sports science. Built for busy professionals. NovaFit\'s AI coach adapts every session to your body, your goals, and your schedule. Try it free for 14 days.',
    cta: 'Get Started',
    platform: 'Meta',
    format: 'Reel',
    imageUrl: 'https://images.pexels.com/photos/1639729/pexels-photo-1639729.jpeg?auto=compress&cs=tinysrgb&w=800',
    startDate: '2026-06-15',
    durationDays: 60,
    estimatedEngagement: 8.4,
    impressions: 1800000,
    status: 'Active',
    hookType: 'Time-saving claim',
    sentiment: 'Positive',
    firstSeen: '2026-06-15',
    lastSeen: '2026-08-14',
  },
  {
    id: 'ad-3',
    competitorId: 'comp-2',
    competitorName: 'Lumiere',
    headline: 'Dermatologists Use This — Not What You\'d Expect',
    bodyCopy:
      '4 out of 5 dermatologists recommend Lumiere\'s Niacinamide Serum over prescription alternatives for uneven skin tone. Clean, vegan, and clinically proven. See results in 14 days.',
    cta: 'Shop Now',
    platform: 'Meta',
    format: 'Carousel',
    imageUrl: 'https://images.pexels.com/photos/3373736/pexels-photo-3373736.jpeg?auto=compress&cs=tinysrgb&w=800',
    startDate: '2026-07-10',
    durationDays: 35,
    estimatedEngagement: 12.4,
    impressions: 950000,
    status: 'Active',
    hookType: 'Authority + curiosity gap',
    sentiment: 'Positive',
    firstSeen: '2026-07-10',
    lastSeen: '2026-08-14',
  },
  {
    id: 'ad-4',
    competitorId: 'comp-2',
    competitorName: 'Lumiere',
    headline: 'The Serum That Sold Out 3 Times',
    bodyCopy:
      '33,000+ reviews. 4.9 average rating. The Glow Drops that everyone is talking about. Limited restock available now — before it sells out again.',
    cta: 'Get Yours',
    platform: 'Meta',
    format: 'Image',
    imageUrl: 'https://images.pexels.com/photos/2253833/pexels-photo-2253833.jpeg?auto=compress&cs=tinysrgb&w=800',
    startDate: '2026-05-20',
    durationDays: 90,
    estimatedEngagement: 11.2,
    impressions: 1200000,
    status: 'Active',
    hookType: 'Social proof + scarcity',
    sentiment: 'Urgent',
    firstSeen: '2026-05-20',
    lastSeen: '2026-08-14',
  },
  {
    id: 'ad-5',
    competitorId: 'comp-3',
    competitorName: 'Driftwood',
    headline: 'Stay Somewhere Worth Instagramming',
    bodyCopy:
      'Skip the hotel. Driftwood hosts unique stays in 190+ countries — from treehouses to beachfront villas. Flexible cancellation, instant booking. Your next escape starts here.',
    cta: 'Start Searching',
    platform: 'Meta',
    format: 'Video',
    imageUrl: 'https://images.pexels.com/photos/2028967/pexels-photo-2028967.jpeg?auto=compress&cs=tinysrgb&w=800',
    startDate: '2026-06-01',
    durationDays: 120,
    estimatedEngagement: 6.8,
    impressions: 5400000,
    status: 'Active',
    hookType: 'Lifestyle aspiration',
    sentiment: 'Aspirational',
    firstSeen: '2026-06-01',
    lastSeen: '2026-08-14',
  },
  {
    id: 'ad-6',
    competitorId: 'comp-3',
    competitorName: 'Driftwood',
    headline: 'Hosts Earn $1,240/Month on Average',
    bodyCopy:
      'Turn your spare room into passive income. Driftwood handles payments, guest verification, and $1M damage protection. List in under 10 minutes.',
    cta: 'Become a Host',
    platform: 'Meta',
    format: 'Video',
    imageUrl: 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800',
    startDate: '2026-03-15',
    durationDays: 180,
    estimatedEngagement: 5.9,
    impressions: 3100000,
    status: 'Active',
    hookType: 'Income claim',
    sentiment: 'Positive',
    firstSeen: '2026-03-15',
    lastSeen: '2026-08-14',
  },
  {
    id: 'ad-7',
    competitorId: 'comp-4',
    competitorName: 'Cadence',
    headline: '3 Months of Ad-Free Music — On Us',
    bodyCopy:
      '100M+ songs. Thousands of podcasts. Offline downloads. No ads, no interruptions. Start your 3-month free trial today. Cancel anytime.',
    cta: 'Try 3 Months Free',
    platform: 'Meta',
    format: 'Video',
    imageUrl: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=800',
    startDate: '2026-07-01',
    durationDays: 90,
    estimatedEngagement: 9.2,
    impressions: 2700000,
    status: 'Active',
    hookType: 'Free offer',
    sentiment: 'Positive',
    firstSeen: '2026-07-01',
    lastSeen: '2026-08-14',
  },
  {
    id: 'ad-8',
    competitorId: 'comp-4',
    competitorName: 'Cadence',
    headline: 'Your Year in Sound — Coming Soon',
    bodyCopy:
      'Your top artists, most-played songs, and minutes listened. Share your story. Wrapped 2026 drops December 1 — set your reminder now.',
    cta: 'Set Reminder',
    platform: 'Meta',
    format: 'Story',
    imageUrl: 'https://images.pexels.com/photos/1370548/pexels-photo-1370548.jpeg?auto=compress&cs=tinysrgb&w=800',
    startDate: '2026-08-01',
    durationDays: 15,
    estimatedEngagement: 13.8,
    impressions: 890000,
    status: 'Active',
    hookType: 'Anticipation + personalization',
    sentiment: 'Aspirational',
    firstSeen: '2026-08-01',
    lastSeen: '2026-08-14',
  },
  {
    id: 'ad-9',
    competitorId: 'comp-5',
    competitorName: 'FlowDesk',
    headline: 'Replace 5 Tools With One Workspace',
    bodyCopy:
      'Docs, projects, wikis, and databases — finally in one place. FlowDesk adapts to how your team actually works. Free for individuals. Teams from $8/user.',
    cta: 'Get Started Free',
    platform: 'Meta',
    format: 'Image',
    imageUrl: 'https://images.pexels.com/photos/7773298/pexels-photo-7773298.jpeg?auto=compress&cs=tinysrgb&w=800',
    startDate: '2026-06-20',
    durationDays: 75,
    estimatedEngagement: 7.6,
    impressions: 1400000,
    status: 'Active',
    hookType: 'Consolidation claim',
    sentiment: 'Positive',
    firstSeen: '2026-06-20',
    lastSeen: '2026-08-14',
  },
  {
    id: 'ad-10',
    competitorId: 'comp-5',
    competitorName: 'FlowDesk',
    headline: 'AI That Writes Your Meeting Notes',
    bodyCopy:
      'FlowDesk AI transcribes, summarizes, and assigns action items from your meetings automatically. Stop taking notes. Start doing the work. Try it free.',
    cta: 'Try FlowDesk AI',
    platform: 'Meta',
    format: 'Video',
    imageUrl: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=800',
    startDate: '2026-07-15',
    durationDays: 60,
    estimatedEngagement: 8.8,
    impressions: 1100000,
    status: 'Active',
    hookType: 'AI automation',
    sentiment: 'Positive',
    firstSeen: '2026-07-15',
    lastSeen: '2026-08-14',
  },
  {
    id: 'ad-12',
    competitorId: 'comp-6',
    competitorName: 'Lingua',
    headline: 'Go From Beginner to Fluent — 2 Weeks Free',
    bodyCopy:
      'Unlimited hearts, no ads, and AI-powered review sessions that adapt to your mistakes. Super Lingua makes fluency feel effortless. Cancel anytime.',
    cta: 'Try Super Free',
    platform: 'Meta',
    format: 'Video',
    imageUrl: 'https://images.pexels.com/photos/4145190/pexels-photo-4145190.jpeg?auto=compress&cs=tinysrgb&w=800',
    startDate: '2026-06-10',
    durationDays: 90,
    estimatedEngagement: 13.1,
    impressions: 1900000,
    status: 'Active',
    hookType: 'Progression + free trial',
    sentiment: 'Aspirational',
    firstSeen: '2026-06-10',
    lastSeen: '2026-08-14',
  },
];

export function generateAIAnalysis(ad: AdCreative): AIAnalysis {
  return {
    marketingStrategy: `${ad.competitorName} leverages a ${ad.format.toLowerCase()} format on ${ad.platform} to maximize reach among their core demographic. The campaign positions the product as an aspirational yet accessible choice, using social proof and urgency to drive conversion.`,
    emotionalTrigger:
      'Aspiration & Achievement — the creative taps into the audience\'s desire for self-improvement and belonging, creating an emotional bridge between the product and the user\'s identity.',
    copywritingAnalysis:
      'The headline uses a short, punchy structure with a clear value proposition. The body copy follows a benefit-first approach, leading with the outcome before features. The CTA is action-oriented and low-friction.',
    aidaFramework: {
      attention: `Bold headline "${ad.headline}" stops the scroll with a strong declarative statement.`,
      interest: 'Body copy introduces the product with relatable context and social proof.',
      desire: 'Benefit-driven language creates a vision of the improved self the user could become.',
      action: `Clear "${ad.cta}" CTA removes ambiguity and creates an immediate next step.`,
    },
    pasFramework: {
      problem: 'The audience feels stuck, overwhelmed, or underserved by existing options.',
      agitation: 'The copy amplifies the pain of inaction — missed opportunities and stagnation.',
      solution: `${ad.competitorName}'s product is positioned as the simple, proven path forward.`,
    },
    targetAudience:
      'Primary: Urban professionals aged 22-38, digitally native, brand-conscious. Secondary: Aspirational consumers aged 18-25 seeking entry into the category.',
    colorPsychology:
      'The palette uses high-contrast tones to convey energy and confidence. Warm accents create urgency while cool base tones establish trust and sophistication.',
    ctaAnalysis:
      `The "${ad.cta}" CTA scores 8.5/10. It uses action verbs, creates immediacy, and is positioned above the fold. Consider adding a secondary value-anchored CTA for retargeting.`,
    performancePrediction: ad.estimatedEngagement * 1.15,
    successScore: Math.round(ad.estimatedEngagement * 8 + 20),
    weaknesses: [
      'Headline could benefit from a specific number or data point to increase credibility.',
      'Body copy is feature-heavy in the second half — consider restructuring to lead with outcomes.',
      'No visible urgency mechanic (countdown, limited stock) to drive immediate action.',
      'Single CTA may miss users in the awareness stage — a "Learn More" secondary path could capture more intent.',
    ],
    strengths: [
      'Strong emotional resonance — the creative connects identity to product choice.',
      'Excellent platform-fit — the format and pacing match native content patterns.',
      'Clear value proposition communicated in under 3 seconds of viewing.',
      'Brand consistency maintained across headline, visual, and CTA tone.',
    ],
    recommendations: [
      'A/B test a urgency variant ("Today Only" / "Limited Drop") to measure lift on CTR.',
      'Add a customer review or rating element to boost social proof by an estimated 15%.',
      'Create a retargeting variant with a softer CTA for mid-funnel users.',
      'Test a short-form video adaptation for YouTube and Meta placements to expand reach without changing the core message.',
      'Introduce a carousel format to showcase multiple product angles in one ad unit.',
    ],
    sentimentScore: 84,
    creativityScore: 79,
    buyerIntent: 'High — the audience is in the consideration/decision stage, evidenced by the direct purchase CTA.',
    seoKeywords: [ad.competitorName.toLowerCase(), 'best', 'review', '2026', 'buy online', 'discount', 'free trial'],
    hookStrength: 82,
    visualStrategy: 'High-contrast product imagery with lifestyle context. Visual hierarchy leads the eye from headline to CTA in under 2 seconds.',
    competitiveSignificance: 'This creative represents a shift toward outcome-driven messaging in the competitive set. 3 of 6 tracked competitors have adopted similar patterns in the last 30 days.',
  };
}

export const dashboardStats = {
  activeAds: 1284,
  activeAdsChange: 18.4,
  competitorsMonitored: 6,
  newAdsThisWeek: 47,
  newAdsChange: 12.3,
  creativeShifts: 8,
  creativeShiftsChange: 33.3,
  trendMomentum: 72,
  trendMomentumChange: 5.2,
};

export const engagementTrend = [
  { month: 'Feb', ads: 820, engagement: 6.2, spend: 8.1, newAds: 12 },
  { month: 'Mar', ads: 940, engagement: 6.8, spend: 8.9, newAds: 18 },
  { month: 'Apr', ads: 1020, engagement: 7.1, spend: 9.4, newAds: 22 },
  { month: 'May', ads: 1100, engagement: 7.5, spend: 10.1, newAds: 28 },
  { month: 'Jun', ads: 1180, engagement: 8.0, spend: 11.2, newAds: 31 },
  { month: 'Jul', ads: 1240, engagement: 8.4, spend: 11.8, newAds: 39 },
  { month: 'Aug', ads: 1284, engagement: 8.7, spend: 12.4, newAds: 47 },
];

export const platformDistribution = [
  { name: 'Instagram', value: 48, color: 'hsl(var(--chart-1))' },
  { name: 'Facebook', value: 34, color: 'hsl(var(--chart-2))' },
  { name: 'Reels & Stories', value: 12, color: 'hsl(var(--chart-3))' },
  { name: 'Messenger & Audience', value: 6, color: 'hsl(var(--chart-5))' },
];

export const intelligenceFeed: IntelligenceEvent[] = [
  {
    id: 1,
    competitor: 'NovaFit',
    event: 'Video creative adoption increased 34% in the last 14 days',
    timestamp: '2 hours ago',
    evidence: 'NovaFit shifted from 35% video to 48% video format across 12 new creatives. Average engagement on video ads is 9.8% vs 6.2% for static.',
    impact: 'High',
    confidence: 92,
    recommendedAction: 'Test short-form UGC creative within the next campaign cycle.',
    category: 'Creative Shift',
  },
  {
    id: 2,
    competitor: 'Lumiere',
    event: 'Authority-based messaging pattern detected across 4 new ads',
    timestamp: '5 hours ago',
    evidence: 'Lumiere launched 4 creatives using "dermatologist recommended" and "clinically proven" claims. CTR on authority ads is 2.3x higher than their baseline.',
    impact: 'Medium',
    confidence: 87,
    recommendedAction: 'Evaluate whether authority messaging aligns with your brand voice and test a variant.',
    category: 'Messaging Shift',
  },
  {
    id: 3,
    competitor: 'Lingua',
    event: 'Short-form video volume increased 45% — highest in the tracked set',
    timestamp: '8 hours ago',
    evidence: 'Lingua launched a concentrated short-form video test in 7 days. The available Meta video signal is 13.1% engagement, above the current tracked-set average.',
    impact: 'High',
    confidence: 95,
    recommendedAction: 'Test short-form video variants across the approved Meta and YouTube surfaces with clear measurement.',
    category: 'Platform Shift',
  },
  {
    id: 4,
    competitor: 'Driftwood',
    event: 'Spend increased 22% week-over-week',
    timestamp: '1 day ago',
    evidence: 'Driftwood increased estimated monthly spend from $345K to $420K. New creatives focus on "unique stays" lifestyle positioning rather than price.',
    impact: 'Medium',
    confidence: 84,
    recommendedAction: 'Monitor for scaling signals — Driftwood may be preparing for a seasonal push.',
    category: 'Spend Signal',
  },
  {
    id: 5,
    competitor: 'FlowDesk',
    event: 'AI-feature messaging now present in 60% of active ads',
    timestamp: '2 days ago',
    evidence: 'FlowDesk shifted from "all-in-one workspace" to "AI that writes your meeting notes" as primary hook. This is a positioning evolution.',
    impact: 'Medium',
    confidence: 89,
    recommendedAction: 'Assess whether AI-feature messaging is becoming table stakes in your category.',
    category: 'Positioning Shift',
  },
  {
    id: 6,
    competitor: 'Cadence',
    event: 'New CTA pattern detected: "3 Months Free" replacing "1 Month Free"',
    timestamp: '3 days ago',
    evidence: 'Cadence extended their free trial offer from 1 to 3 months across all active ads. This signals an aggressive acquisition strategy.',
    impact: 'High',
    confidence: 91,
    recommendedAction: 'Review your trial length and acquisition economics against this competitive move.',
    category: 'Offer Shift',
  },
];

export const aiRecommendations: Recommendation[] = [
  {
    id: 1,
    title: 'Test competitor-style UGC hooks in your next campaign',
    whyNow: '4 of 6 tracked competitors increased UGC-style video usage in the last 14 days. NovaFit saw 34% lift in engagement after shifting to video.',
    evidence: 'NovaFit: +34% engagement on video. Lingua: 13.1% engagement on Meta video. The available tracked evidence supports testing more short-form video.',
    expectedImpact: 'High',
    confidence: 89,
    priority: 'High',
    effort: 'Medium',
    suggestedNextStep: 'Build experiment',
    category: 'Creative',
  },
  {
    id: 2,
    title: 'Expand short-form video across approved surfaces',
    whyNow: 'Short-form video activity is accelerating in the tracked set, while your current mix has room to test more video-led creative.',
    evidence: 'The available Meta video records show 13.1% engagement for Lingua and 9.8% for NovaFit; source coverage is limited to indexed records.',
    expectedImpact: 'High',
    confidence: 92,
    priority: 'Critical',
    effort: 'High',
    suggestedNextStep: 'Allocate budget',
    category: 'Platform',
  },
  {
    id: 3,
    title: 'Test authority-based messaging in your creatives',
    whyNow: 'Lumiere\'s authority ads ("dermatologist recommended") achieve 2.3x higher CTR than their baseline. This pattern is spreading.',
    evidence: 'Lumiere: 2.3x CTR on authority ads. 4 new creatives using this pattern in 7 days.',
    expectedImpact: 'Medium',
    confidence: 84,
    priority: 'Medium',
    effort: 'Low',
    suggestedNextStep: 'Draft copy variants',
    category: 'Messaging',
  },
  {
    id: 4,
    title: 'Review your trial offer against Cadence\'s 3-month extension',
    whyNow: 'Cadence extended their free trial from 1 to 3 months — an aggressive acquisition signal. This may pressure your conversion economics.',
    evidence: 'Cadence: 100% of active ads now offer "3 Months Free". Previous offer was "1 Month Free".',
    expectedImpact: 'Medium',
    confidence: 86,
    priority: 'Medium',
    effort: 'Low',
    suggestedNextStep: 'Review unit economics',
    category: 'Offer',
  },
  {
    id: 5,
    title: 'Incorporate AI-feature messaging if applicable to your product',
    whyNow: 'FlowDesk shifted 60% of active ads to AI-feature messaging. This is becoming a category expectation, not a differentiator.',
    evidence: 'FlowDesk: 60% of ads mention AI. NovaFit: 20% mention AI. Category average: 28%.',
    expectedImpact: 'Low',
    confidence: 78,
    priority: 'Low',
    effort: 'Medium',
    suggestedNextStep: 'Audit messaging',
    category: 'Positioning',
  },
];

export const trendData: TrendData[] = [
  {
    id: 1,
    name: 'UGC-Style Video',
    momentum: 87,
    growth: 34,
    confidence: 92,
    firstDetected: '14 days ago',
    competitorsAdopting: 4,
    strategicImplication: 'Short-form UGC is becoming the dominant creative format. Brands not adapting risk declining engagement.',
    category: 'Creative Format',
  },
  {
    id: 2,
    name: 'Authority-Based Messaging',
    momentum: 72,
    growth: 28,
    confidence: 87,
    firstDetected: '21 days ago',
    competitorsAdopting: 3,
    strategicImplication: 'Expert endorsements and clinical claims are driving higher CTR. Effective for trust-building categories.',
    category: 'Messaging',
  },
  {
    id: 3,
    name: 'Extended Free Trials',
    momentum: 64,
    growth: 50,
    confidence: 91,
    firstDetected: '7 days ago',
    competitorsAdopting: 2,
    strategicImplication: 'Longer trial periods signal aggressive acquisition strategies. May compress payback periods.',
    category: 'Offer',
  },
  {
    id: 4,
    name: 'AI-Feature Highlighting',
    momentum: 58,
    growth: 22,
    confidence: 84,
    firstDetected: '30 days ago',
    competitorsAdopting: 3,
    strategicImplication: 'AI is shifting from differentiator to table-stakes. Brands not mentioning AI may appear outdated.',
    category: 'Positioning',
  },
  {
    id: 5,
    name: 'Scarcity & Urgency CTAs',
    momentum: 45,
    growth: 15,
    confidence: 79,
    firstDetected: '10 days ago',
    competitorsAdopting: 2,
    strategicImplication: 'Limited-time offers and scarcity mechanics are driving immediate action. Use selectively to avoid fatigue.',
    category: 'CTA Pattern',
  },
  {
    id: 6,
    name: 'Short-Form Video Acceleration',
    momentum: 78,
    growth: 45,
    confidence: 88,
    firstDetected: '7 days ago',
    competitorsAdopting: 3,
    strategicImplication: 'Short-form video is accelerating in the indexed set. Test approved Meta and YouTube placements with evidence-based measurement.',
    category: 'Platform',
  },
];

export const alertData: AlertData[] = [
  {
    id: 1,
    title: 'NovaFit launched 12 new ads in 48 hours',
    description: 'Unusual volume spike detected. NovaFit typically launches 3-4 ads per week. This may indicate a campaign push or product launch.',
    severity: 'High',
    competitor: 'NovaFit',
    timestamp: '2 hours ago',
    category: 'Volume Spike',
  },
  {
    id: 2,
    title: 'Creative strategy changed for Lumiere',
    description: 'Lumiere shifted from product-focused to authority-focused messaging across all new creatives. This is a strategic positioning change.',
    severity: 'Medium',
    competitor: 'Lumiere',
    timestamp: '5 hours ago',
    category: 'Strategy Shift',
  },
  {
    id: 3,
    title: 'New CTA pattern detected: "3 Months Free"',
    description: 'Cadence has replaced "1 Month Free" with "3 Months Free" across 100% of active ads. This is an aggressive acquisition signal.',
    severity: 'High',
    competitor: 'Cadence',
    timestamp: '1 day ago',
    category: 'CTA Pattern',
  },
  {
    id: 4,
    title: 'Competitor activity accelerating: Lingua',
    description: 'Lingua\'s short-form video activity increased 45% week-over-week in the indexed sample. This is the highest growth rate in your tracked set.',
    severity: 'Critical',
    competitor: 'Lingua',
    timestamp: '1 day ago',
    category: 'Acceleration',
  },
  {
    id: 5,
    title: 'Emerging trend: UGC adoption',
    description: '4 of 6 tracked competitors increased UGC-style video usage. This trend has 92% confidence and is accelerating.',
    severity: 'Medium',
    competitor: 'Multiple',
    timestamp: '2 days ago',
    category: 'Trend',
  },
  {
    id: 6,
    title: 'Potential opportunity: short-form video underinvestment',
    description: 'Short-form video is underrepresented in the current mix. Test approved Meta and YouTube placements only when connected sources can measure the result.',
    severity: 'High',
    competitor: 'Market',
    timestamp: '3 days ago',
    category: 'Opportunity',
  },
];

export const topPerformingAds = [
  { id: 'ad-8', competitor: 'Cadence', headline: 'Your Year in Sound — Coming Soon', engagement: 13.8, platform: 'Meta' },
  { id: 'ad-12', competitor: 'Lingua', headline: 'Go From Beginner to Fluent', engagement: 13.1, platform: 'Meta' },
  { id: 'ad-3', competitor: 'Lumiere', headline: 'Dermatologists Use This', engagement: 12.4, platform: 'Meta' },
  { id: 'ad-4', competitor: 'Lumiere', headline: 'The Serum That Sold Out 3 Times', engagement: 11.2, platform: 'Meta' },
];

export const heatmapData = [
  { day: 'Mon', hours: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24] },
  { day: 'Tue', hours: [3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25] },
  { day: 'Wed', hours: [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26] },
  { day: 'Thu', hours: [5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27] },
  { day: 'Fri', hours: [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28] },
  { day: 'Sat', hours: [3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25] },
  { day: 'Sun', hours: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24] },
];

export const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Head of Growth',
    company: 'Lumen Labs',
    avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100',
    quote:
      'SpotNxt AI cut our competitive research time by 80%. The AI analysis spots creative patterns our team missed for months.',
  },
  {
    name: 'Marcus Rodriguez',
    role: 'CMO',
    company: 'Vertex Digital',
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100',
    quote:
      'We scaled our ad spend 4x using insights from SpotNxt. The success score predictions are within 5% of actual performance.',
  },
  {
    name: 'Priya Nair',
    role: 'Performance Marketing Lead',
    company: 'Bloom Agency',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100',
    quote:
      'The competitor ad library is a goldmine. We know exactly what our rivals are running, on which platforms, and how it performs — before they do.',
  },
];

export const faqs = [
  {
    question: 'How does SpotNxt AI track competitor ads?',
    answer:
      'We monitor approved sources across Meta Ad Library (Facebook, Instagram, Reels, Stories, Messenger, Audience Network) using official API endpoints. Each ad is labelled with permissions, provenance, and freshness.',
  },
  {
    question: 'How accurate is the AI analysis?',
    answer:
      'Our AI models are trained on 10M+ ad creatives and validated against actual campaign performance data. The success score has a 92% correlation with real-world engagement outcomes within a 5% margin.',
  },
  {
    question: 'Can I export reports for my team or clients?',
    answer:
      'Yes. Generate branded PDF reports with charts, insights, and AI recommendations in one click. Export raw data as CSV for deeper analysis or import into your BI tools.',
  },
  {
    question: 'How many competitors can I track?',
    answer:
      'The Starter plan includes 5 competitors, Growth includes 25, and Scale is unlimited. You can swap tracked competitors anytime — historical data is retained.',
  },
  {
    question: 'Do you offer a free trial?',
    answer:
      'Every plan includes a 14-day free trial with full access to all features. No credit card required to start. Cancel anytime.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'All data is encrypted in transit and at rest. We are SOC 2 Type II compliant and never share your tracked competitor list or analysis with third parties.',
  },
];

export const pricingPlans = [
  {
    name: 'Starter',
    price: 49,
    description: 'For solo marketers and small teams getting started with competitive intelligence.',
    features: ['5 competitors tracked', 'AI ad analysis (100/mo)', 'Basic dashboard', 'PDF reports', 'Email support'],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Growth',
    price: 149,
    description: 'For growing agencies and brands that need deeper competitive coverage.',
    features: [
      '25 competitors tracked',
      'Unlimited AI ad analysis',
      'Advanced analytics & charts',
      'Trend analysis & predictions',
      'CSV export',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Scale',
    price: 399,
    description: 'For enterprises managing multiple brands and large competitor sets.',
    features: [
      'Unlimited competitors',
      'Unlimited AI analysis',
      'Custom AI models',
      'API access',
      'Team collaboration',
      'Dedicated account manager',
      'SSO & SAML',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export const landingStats = [
  { value: '10K+', label: 'Ads Analyzed' },
  { value: '500+', label: 'Brands Tracked' },
  { value: '24/7', label: 'AI Intelligence' },
  { value: '92%', label: 'Prediction Accuracy' },
];

export const landingFeatures = [
  {
    icon: 'Eye',
    title: 'Creative Intelligence',
    description: 'Understand hooks, visuals, formats, and creative patterns across every competitor in your market.',
  },
  {
    icon: 'FileText',
    title: 'Copy Intelligence',
    description: 'Analyze headlines, primary text, CTAs, and messaging strategies to find what resonates with your audience.',
  },
  {
    icon: 'Users',
    title: 'Competitor Intelligence',
    description: 'Discover what competitors are promoting, how they position themselves, and when they shift strategy.',
  },
  {
    icon: 'TrendingUp',
    title: 'Trend Intelligence',
    description: 'Identify emerging creative and market trends before they peak. Know what to test before your competitors do.',
  },
  {
    icon: 'Sparkles',
    title: 'AI Recommendations',
    description: 'Turn analysis into clear, prioritized actions. Know exactly what to create, test, and launch next.',
  },
  {
    icon: 'Bell',
    title: 'Real-Time Alerts',
    description: 'Get notified the moment a competitor launches a new campaign, changes strategy, or increases spend.',
  },
];

export const landingProblems = [
  { title: 'Endless Competitor Research', description: 'Hours spent manually scrolling ad libraries, screenshotting creatives, and building spreadsheets.' },
  { title: 'Manual Ad Analysis', description: 'Subjective, inconsistent creative reviews that miss patterns invisible to the human eye.' },
  { title: 'Missed Creative Trends', description: 'By the time you notice a trend, your competitors have already captured the audience.' },
  { title: 'Unclear Messaging Strategies', description: 'No systematic way to understand why competitor messaging works or fails.' },
  { title: 'Wasted Testing Time', description: 'Testing creatives that could have been informed by competitive intelligence.' },
];

export const landingIntelligence = [
  {
    icon: 'Eye',
    title: 'Creative Intelligence',
    description: 'Understand hooks, visuals, formats and creative patterns across every competitor.',
  },
  {
    icon: 'FileText',
    title: 'Copy Intelligence',
    description: 'Analyze headlines, primary text, CTAs and messaging to find what resonates.',
  },
  {
    icon: 'Users',
    title: 'Competitor Intelligence',
    description: 'Discover what competitors are promoting and how they position themselves.',
  },
  {
    icon: 'TrendingUp',
    title: 'Trend Intelligence',
    description: 'Identify emerging creative and market trends before they peak.',
  },
  {
    icon: 'Sparkles',
    title: 'AI Recommendations',
    description: 'Turn analysis into clear, prioritized actions you can execute immediately.',
  },
];

export const landingRecommendations = [
  {
    title: 'Creative Opportunity',
    description: 'Your competitors are increasing short-form video usage by 34%. Test UGC-style video in your next campaign.',
    impact: 'High',
    confidence: 89,
  },
  {
    title: 'Messaging Gap',
    description: 'Competitors are underusing benefit-focused messaging. Authority-based claims are driving 2.3x higher CTR.',
    impact: 'Medium',
    confidence: 84,
  },
  {
    title: 'Platform Opportunity',
    description: 'Short-form video is underrepresented in the current mix. Test approved Meta and YouTube placements only when connected sources can measure the result.',
    impact: 'High',
    confidence: 92,
  },
];

export const aiAssistantSuggestions = [
  'What changed this week?',
  'Which competitor has the strongest creative strategy?',
  'Show emerging CTA patterns',
  'What should we test next?',
  'Which competitor is increasing video usage?',
  'Give me the biggest opportunity this week',
];
