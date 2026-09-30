import { MetaCapabilityService } from '@/lib/server/meta-capability';
import { jsonOk, jsonError, requestIdFrom } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';
    const capability = await MetaCapabilityService.detectCapabilities(forceRefresh);
    return jsonOk(capability, requestId);
  } catch (err) {
    return jsonError(err, requestId);
  }
}
