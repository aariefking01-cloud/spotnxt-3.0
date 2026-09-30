import { NextResponse } from 'next/server';
import { MetaCapabilityService, ProviderCapabilityMatrix } from '@/lib/server/meta-capability';
import { getState } from '@/lib/server/store';
import { jsonOk, jsonError, requestIdFrom } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    const metaCapability = await MetaCapabilityService.detectCapabilities(forceRefresh);
    const state = await getState();

    const matrix: ProviderCapabilityMatrix = {
      meta: metaCapability,
      demo: {
        configured: true,
        status: 'available',
        mode: 'benchmark',
        recordsAvailable: state.ads.filter((a) => a.data_status === 'demo' || a.data_status === 'benchmark' || a.source === 'demo').length || 21,
        description: 'Standardized competitive benchmark dataset for demonstration and evaluation.',
      },
      userImport: {
        configured: true,
        status: 'available',
        supportedFormats: ['image/jpeg', 'image/png', 'image/webp', 'application/json', 'text/csv'],
      },
      checkedAt: new Date().toISOString(),
    };

    return jsonOk(matrix, requestId);
  } catch (err) {
    return jsonError(err, requestId);
  }
}
