import { NextResponse } from 'next/server';
import { getAd, getState, getAnalysis } from '@/lib/server/store';
import { newRequestId } from '@/lib/server/domain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getRequestId(req: Request): string {
  return req.headers.get('x-request-id') || newRequestId();
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const requestId = getRequestId(request);
  const adId = params.id;
  try {
    const ad = await getAd(adId);
    if (!ad) {
      return NextResponse.json(
        {
          ok: false,
          requestId,
          error: `Ad "${adId}" not found.`,
        },
        { status: 404 }
      );
    }

    const state = await getState();
    const relatedAds = state.ads
      .filter((a) => a.id !== ad.id && (a.advertiserId === ad.advertiserId || a.creativeType === ad.creativeType))
      .slice(0, 6);

    const analysis = await getAnalysis(ad.id);

    return NextResponse.json(
      {
        ok: true,
        requestId,
        ad,
        observations: ad.observations || [],
        relatedAds,
        analysis: analysis?.result || ad.aiAnalysis || null,
      },
      { status: 200 }
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to retrieve ad detail.';
    return NextResponse.json(
      {
        ok: false,
        requestId,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
