import { NextRequest } from 'next/server';
import { jsonError, jsonOk, requestIdFrom } from '@/lib/server/http';
import { executeSinglePageMetaTest, getMetaConfig } from '@/lib/server/meta-sync';
import { adIntelligenceEngine } from '@/lib/server/ad-data-provider';
import { getState } from '@/lib/server/store';
import { getLlmStatus } from '@/lib/server/llm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = requestIdFrom(request);
  try {
    const url = new URL(request.url);
    const tokenParam = url.searchParams.get('token') || undefined;
    const testQuery = url.searchParams.get('query') || 'Nike';
    const testCountry = url.searchParams.get('country') || 'US';

    const config = getMetaConfig();
    const state = await getState();
    const llmStatus = getLlmStatus();

    // Run single-page test against Meta API safely without exposing token
    const metaDiagnostic = await executeSinglePageMetaTest({
      token: tokenParam || config.accessToken,
      query: testQuery,
      country: testCountry,
    });

    const providers = await adIntelligenceEngine.getAllProvidersStatus();

    return jsonOk(
      {
        timestamp: new Date().toISOString(),
        environment: {
          hasEnvMetaToken: Boolean(config.accessToken),
          metaGraphUrl: config.graphUrl,
          demoModeActive: state.demoModeOverride ?? true,
          geminiConfigured: llmStatus.configured,
          llmModel: llmStatus.model,
          llmProvider: llmStatus.provider,
        },
        database: {
          totalAdsInStore: state.ads.length,
          liveAdsCount: state.ads.filter((a) => a.data_status === 'live').length,
          demoAdsCount: state.ads.filter((a) => a.data_status === 'demo').length,
          advertisersTracked: state.advertisers?.length || 0,
          competitorsMonitored: state.trackedCompetitors?.length || 0,
        },
        metaApiDiagnostic: metaDiagnostic,
        providers,
      },
      requestId
    );
  } catch (error) {
    return jsonError(error, requestId);
  }
}
