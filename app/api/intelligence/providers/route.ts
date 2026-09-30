import { jsonError, jsonOk, requestIdFrom } from '@/lib/server/http';
import { getProviderStatusAsync } from '@/lib/server/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    const status = await getProviderStatusAsync();
    return jsonOk(status, requestId);
  } catch (error) {
    return jsonError(error, requestId);
  }
}

