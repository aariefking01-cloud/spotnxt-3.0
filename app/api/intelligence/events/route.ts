import { jsonError, jsonOk, requestIdFrom } from '@/lib/server/http';
import { getIntelligenceEvents } from '@/lib/server/intelligence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    const since = new URL(request.url).searchParams.get('since') || undefined;
    return jsonOk({ events: await getIntelligenceEvents(since), checkedAt: new Date().toISOString() }, requestId);
  } catch (error) {
    return jsonError(error, requestId);
  }
}
