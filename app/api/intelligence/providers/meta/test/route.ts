import { NextResponse } from 'next/server';
import { jsonError, jsonOk, requestIdFrom } from '@/lib/server/http';
import { validateMetaConnection } from '@/lib/server/meta-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    const params = new URL(request.url).searchParams;
    const token = params.get('token') || undefined;
    const result = await validateMetaConnection(token);
    return jsonOk(result, requestId, 200);
  } catch (error) {
    return jsonError(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    const body = (await request.json().catch(() => ({}))) as { token?: string };
    const result = await validateMetaConnection(body.token);
    return jsonOk(result, requestId, 200);
  } catch (error) {
    return jsonError(error, requestId);
  }
}
