import { jsonError, jsonOk, readJson, requestIdFrom, requiredString } from '@/lib/server/http';
import { analyzeAd } from '@/lib/server/intelligence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    const body = await readJson(request);
    const adId = requiredString(body, 'adId');
    const force = body.force === true;
    const result = await analyzeAd(adId, force);
    return jsonOk(result, requestId);
  } catch (error) {
    return jsonError(error, requestId);
  }
}
