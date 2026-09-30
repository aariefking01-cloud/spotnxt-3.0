import { NextResponse } from 'next/server';
import { jsonOk, jsonError, requestIdFrom } from '@/lib/server/http';
import { AppError } from '@/lib/server/domain';
import {
  getMetaConfig,
  setDynamicMetaToken,
  clearDynamicMetaToken,
  getDynamicMetaToken,
  executeMetaSync,
  validateMetaConnection,
  clearTokenVerificationCache,
} from '@/lib/server/meta-sync';
import { MetaCapabilityService } from '@/lib/server/meta-capability';
import { getState } from '@/lib/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function maskToken(token?: string | null): string | null {
  if (!token) return null;
  const trimmed = token.trim();
  if (trimmed.length <= 10) return '***';
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

/**
 * GET /api/meta/token
 * Returns current token configuration status without exposing raw secrets
 */
export async function GET(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    const config = getMetaConfig();
    const dynamicToken = getDynamicMetaToken();
    const envToken = process.env.META_ACCESS_TOKEN?.trim();

    const capabilities = await MetaCapabilityService.detectCapabilities(false);
    const state = await getState();
    const liveAds = state.ads.filter((a) => a.data_status === 'live' || a.source === 'meta');

    return jsonOk(
      {
        configured: config.isConfigured,
        source: dynamicToken ? 'session_user_token' : envToken ? 'server_environment' : 'not_configured',
        tokenMasked: maskToken(config.accessToken),
        status: capabilities.status,
        statusExplanation: capabilities.statusExplanation,
        identity: capabilities.tokenIdentity || null,
        adAccounts: capabilities.adAccounts || [],
        diagnostic: capabilities.diagnostic || null,
        totalLiveAds: liveAds.length,
        checkedAt: capabilities.checkedAt,
      },
      requestId,
      200
    );
  } catch (error) {
    return jsonError(error, requestId);
  }
}

/**
 * POST /api/meta/token
 * Validates, checks capabilities, and optionally executes verified live sync
 */
export async function POST(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    const body = (await request.json().catch(() => ({}))) as {
      token?: string;
      autoSync?: boolean;
      query?: string;
      country?: string;
    };

    const token = typeof body.token === 'string' ? body.token.trim() : '';

    if (!token) {
      throw new AppError(
        'META_TOKEN_REQUIRED',
        'Meta Access Token is required. Please paste your User, Page, or System User token.',
        400
      );
    }

    // Step 1: Inspect token identity & validate basic connectivity with Meta
    const identityCheck = await MetaCapabilityService.inspectTokenIdentity(token);

    if (!identityCheck.authenticated) {
      const err = identityCheck.error || {};
      const metaCode = Number(err.code) || 190;
      const metaMsg = typeof err.message === 'string' ? err.message : 'Meta Access Token is invalid or expired.';
      const action = metaCode === 190
        ? 'Generate a fresh User Access Token at https://developers.facebook.com/tools/explorer/'
        : 'Verify the token in Facebook Graph API Explorer.';

      throw new AppError('META_TOKEN_INVALID', metaMsg, 401, {
        metaCode,
        metaError: err,
        actionRequired: action,
        tokenMasked: maskToken(token),
      });
    }

    // Step 2: Check required Ad Library permissions & capabilities
    const adLibraryCheck = await MetaCapabilityService.testAdLibraryAccess(token);

    if (!adLibraryCheck.adLibraryAuthorized) {
      const diag = adLibraryCheck.diagnostic;
      const isUnverified = diag.metaErrorCode === 10 || diag.metaErrorSubcode === 2332002;

      const errorMessage = diag.errorUserMsg || diag.metaErrorMessage ||
        (isUnverified
          ? 'Ad Library API access requires developer identity verification at facebook.com/ads/library/api'
          : 'Meta Ad Library API permission denied for this token');

      // Do NOT set as active token if authorization failed
      throw new AppError(
        isUnverified ? 'META_VERIFICATION_REQUIRED' : 'META_PERMISSION_DENIED',
        errorMessage,
        403,
        {
          metaCode: diag.metaErrorCode,
          metaSubcode: diag.metaErrorSubcode,
          metaType: diag.metaErrorType,
          userTitle: diag.errorUserTitle || 'Ad Library Access Required',
          userMessage: diag.errorUserMsg || errorMessage,
          actionRequired: diag.actionRequired || 'Complete identity verification and agree to terms at https://www.facebook.com/ads/library/api',
          identity: identityCheck.identity,
          adAccounts: identityCheck.adAccounts,
          tokenMasked: maskToken(token),
        }
      );
    }

    // Step 3: Token is valid and Ad Library is authorized! Save to dynamic runtime store
    setDynamicMetaToken(token);
    MetaCapabilityService.clearCache();

    // Step 4: Perform initial live sync to fetch verified ads and validate response schema
    let syncResult = null;
    const shouldSync = body.autoSync !== false;
    const searchQuery = body.query?.trim() || 'Nike';
    const country = (body.country?.trim() || 'US').toUpperCase();

    if (shouldSync && searchQuery.length >= 2) {
      try {
        syncResult = await executeMetaSync({
          accessToken: token,
          query: searchQuery,
          country,
          limit: 15,
        });
      } catch (syncErr) {
        // If initial sync had an issue, keep the token registered but report sync notice
        syncResult = {
          syncFailed: true,
          error: syncErr instanceof Error ? syncErr.message : String(syncErr),
        };
      }
    }

    const state = await getState();
    const liveAds = state.ads.filter((a) => a.data_status === 'live' || a.source === 'meta');

    return jsonOk(
      {
        success: true,
        connected: true,
        status: 'connected',
        tokenMasked: maskToken(token),
        identity: identityCheck.identity,
        adAccounts: identityCheck.adAccounts,
        adLibraryAuthorized: true,
        commercialAdsSupported: adLibraryCheck.commercialAdsSupported,
        syncResult,
        totalLiveAdsInStore: liveAds.length,
        message: syncResult && 'recordsFetched' in syncResult && (syncResult as { recordsFetched: number }).recordsFetched > 0
          ? `Meta Access Token verified! Successfully ingested ${(syncResult as { recordsFetched: number }).recordsFetched} live ads from Meta Ad Library.`
          : 'Meta Access Token verified and connected successfully!',
      },
      requestId,
      200
    );
  } catch (error) {
    return jsonError(error, requestId);
  }
}

/**
 * DELETE /api/meta/token
 * Clears the active dynamic session token
 */
export async function DELETE(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    clearDynamicMetaToken();
    MetaCapabilityService.clearCache();
    clearTokenVerificationCache();

    return jsonOk(
      {
        success: true,
        disconnected: true,
        message: 'Meta Access Token cleared. System returned to default state.',
      },
      requestId,
      200
    );
  } catch (error) {
    return jsonError(error, requestId);
  }
}
