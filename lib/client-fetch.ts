/**
 * Safe client-side fetch helper for SpotNxt AI.
 * Guarantees that HTML error pages are never blindly parsed as JSON.
 * Always returns formatted JSON data or throws a descriptive error.
 */

export interface ApiResponse<T = unknown> {
  ok?: boolean;
  success?: boolean;
  provider?: string;
  requestId?: string;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
    metaError?: {
      code?: number;
      subcode?: number;
      userTitle?: string;
      userMsg?: string;
    };
  };
  [key: string]: unknown;
}

export async function safeFetchJson<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options?.headers || {}),
      },
    });
  } catch (netErr) {
    throw new Error(
      `Network connection failure to ${url}: ${
        netErr instanceof Error ? netErr.message : 'Unable to connect to server'
      }`
    );
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!isJson) {
    const rawText = await response.text().catch(() => '');
    const cleanSnippet = rawText
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300);

    throw new Error(
      `Server returned non-JSON response (${response.status} ${response.statusText}): ${
        cleanSnippet || 'Empty or invalid HTML response.'
      }`
    );
  }

  let rawText = '';
  try {
    rawText = await response.text();
  } catch (textErr) {
    throw new Error(
      `Failed to read response body (${response.status}): ${
        textErr instanceof Error ? textErr.message : 'Unknown read error'
      }`
    );
  }

  if (!rawText || !rawText.trim()) {
    if (response.ok) {
      return { ok: true, data: undefined as unknown as T };
    }
    throw new Error(`Server returned empty response with status ${response.status}`);
  }

  let payload: ApiResponse<T>;
  try {
    payload = JSON.parse(rawText) as ApiResponse<T>;
  } catch (jsonErr) {
    throw new Error(
      `Failed to parse JSON response (${response.status}): ${
        jsonErr instanceof Error ? jsonErr.message : 'Invalid JSON format'
      }`
    );
  }

  if (!response.ok || payload.ok === false || payload.success === false) {
    const errMessage =
      payload.error?.message ||
      (typeof payload.data === 'string' ? payload.data : null) ||
      `Request failed with HTTP status ${response.status} (${response.statusText})`;

    const error = new Error(errMessage) as Error & {
      code?: string;
      details?: unknown;
      status?: number;
      metaError?: unknown;
    };
    error.code = payload.error?.code;
    error.details = payload.error?.details;
    error.status = response.status;
    error.metaError = payload.error?.metaError;
    throw error;
  }

  return payload;
}
