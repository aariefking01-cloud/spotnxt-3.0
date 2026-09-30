import { jsonError, jsonOk, requestIdFrom } from '@/lib/server/http';
import { getLlmStatus } from '@/lib/server/llm';
import { providerStatus } from '@/lib/server/providers';
import { getSummary } from '@/lib/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    const summary = await getSummary();
    const provider = providerStatus();
    return jsonOk({
      status: provider.liveMode && !provider.liveDataReady ? 'degraded' : 'ok',
      service: 'spotnxt-intelligence-api',
      checkedAt: new Date().toISOString(),
      provider,
      llm: getLlmStatus(),
      persistence: { adapter: 'json-file', ads: summary.counts.totalAds, analyses: summary.counts.analyzedAds },
    }, requestId);
  } catch (error) {
    return jsonError(error, requestId);
  }
}
