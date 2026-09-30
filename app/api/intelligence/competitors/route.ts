import { NextResponse } from 'next/server';
import { searchIntelligenceCompetitors } from '@/lib/server/intelligence';
import { jsonError, jsonOk, requestIdFrom } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    const params = new URL(request.url).searchParams;
    const query = params.get('q') ?? '';
    const market = params.get('market') || undefined;
    const country = params.get('country') || undefined;
    if (query.length > 120) return NextResponse.json({ ok: false, requestId, error: { code: 'QUERY_TOO_LONG', message: 'Search query must be 120 characters or fewer.' } }, { status: 400, headers: { 'x-request-id': requestId } });
    return jsonOk(await searchIntelligenceCompetitors(query, market, country), requestId);
  } catch (error) {
    return jsonError(error, requestId);
  }
}
