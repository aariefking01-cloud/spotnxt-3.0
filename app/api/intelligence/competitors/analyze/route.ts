import { NextResponse } from 'next/server';
import { analyzeCompetitor } from '@/lib/server/intelligence';
import { jsonError, jsonOk, readJson, requestIdFrom, requiredString } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    const body = await readJson(request);
    const competitorId = requiredString(body, 'competitorId');
    const force = body.force === true;
    return jsonOk(await analyzeCompetitor(competitorId, force), requestId);
  } catch (error) {
    return jsonError(error, requestId);
  }
}
