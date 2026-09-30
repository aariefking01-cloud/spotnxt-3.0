import { jsonError, jsonOk, requestIdFrom } from '@/lib/server/http';
import { getIntelligenceSummary } from '@/lib/server/intelligence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    return jsonOk(await getIntelligenceSummary(), requestId);
  } catch (error) {
    return jsonError(error, requestId);
  }
}
