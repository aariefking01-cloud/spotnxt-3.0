import { NextResponse } from 'next/server';
import { AppError, newRequestId } from './domain';

export function requestIdFrom(request: Request): string {
  return request.headers.get('x-request-id') || newRequestId();
}

export function jsonOk<T>(data: T, requestId: string, status = 200) {
  return NextResponse.json({ ok: true, requestId, data }, { status, headers: { 'x-request-id': requestId } });
}

export function jsonError(error: unknown, requestId: string, fallbackStatus = 500) {
  const appError = error instanceof AppError
    ? error
    : new AppError(
        typeof (error as { code?: string })?.code === 'string' ? (error as { code: string }).code : 'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'An unexpected server error occurred.',
        fallbackStatus
      );
  if (!(error instanceof AppError)) console.error(`[${requestId}]`, error);
  return NextResponse.json(
    {
      ok: false,
      requestId,
      error: { code: appError.code, message: appError.message, details: appError.details },
    },
    { status: appError.status, headers: { 'x-request-id': requestId } },
  );
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('body is not an object');
    return body as Record<string, unknown>;
  } catch {
    throw new AppError('INVALID_JSON', 'Request body must be a valid JSON object.', 400);
  }
}

export function requiredString(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== 'string' || !value.trim()) throw new AppError('VALIDATION_ERROR', `${field} is required.`, 400, { field });
  return value.trim();
}
