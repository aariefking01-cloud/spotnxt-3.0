import { getMetaConfig, setCachedTokenStatus } from './meta-sync';

export interface MetaTokenIdentity {
  isValid: boolean;
  appId?: string;
  application?: string;
  userId?: string;
  userName?: string;
  scopes: string[];
  expiresAt?: number;
  dataAccessExpiresAt?: number;
  issuedAt?: number;
}

export interface MetaAdAccountInfo {
  id: string;
  name: string;
  accountStatus: number;
  currency: string;
  amountSpent?: string;
}

export interface MetaDiagnosticInfo {
  httpStatus: number;
  metaErrorCode: number | null;
  metaErrorSubcode: number | null;
  metaErrorType: string | null;
  metaErrorMessage: string | null;
  errorUserTitle: string | null;
  errorUserMsg: string | null;
  fbtraceId: string | null;
  endpoint: string;
  apiVersion: string;
  actionRequired: string | null;
}

export interface MetaCapabilityStatus {
  configured: boolean;
  tokenConfigured: boolean;
  authenticated: boolean;
  apiReachable: boolean;
  adLibraryAuthorized: boolean;
  commercialAdsSupported: boolean;
  politicalAdsSupported: boolean;
  euUkAdsSupported: boolean;
  status: 'connected' | 'unverified' | 'restricted' | 'invalid_token' | 'not_configured' | 'network_error';
  statusExplanation: string;
  apiVersion: string;
  graphUrl: string;
  tokenIdentity?: MetaTokenIdentity;
  adAccounts?: MetaAdAccountInfo[];
  diagnostic?: MetaDiagnosticInfo;
  checkedAt: string;
}

export interface ProviderCapabilityMatrix {
  meta: MetaCapabilityStatus;
  demo: {
    configured: boolean;
    status: 'available';
    mode: 'benchmark';
    recordsAvailable: number;
    description: string;
  };
  userImport: {
    configured: boolean;
    status: 'available';
    supportedFormats: string[];
  };
  checkedAt: string;
}

let cachedCapabilities: MetaCapabilityStatus | null = null;
let lastCapabilityCheck = 0;
const CAPABILITY_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache

export class MetaCapabilityService {
  /**
   * Safe server fetch that never throws unhandled errors and captures exact headers/trace IDs
   */
  private static async safeGraphFetch(url: string): Promise<{
    ok: boolean;
    status: number;
    contentType: string;
    payload: Record<string, unknown>;
  }> {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const contentType = response.headers.get('content-type') || '';
      let payload: Record<string, unknown> = {};
      if (contentType.includes('application/json')) {
        try {
          payload = (await response.json()) as Record<string, unknown>;
        } catch {
          payload = {};
        }
      } else {
        const text = await response.text().catch(() => '');
        payload = { rawText: text.slice(0, 500) };
      }
      return { ok: response.ok, status: response.status, contentType, payload };
    } catch (networkErr) {
      return {
        ok: false,
        status: 502,
        contentType: 'text/plain',
        payload: { error: { message: networkErr instanceof Error ? networkErr.message : 'Network failure to graph.facebook.com' } },
      };
    }
  }

  /**
   * Validates token identity and scopes via /debug_token and /me
   */
  public static async inspectTokenIdentity(token: string): Promise<{
    authenticated: boolean;
    identity?: MetaTokenIdentity;
    adAccounts?: MetaAdAccountInfo[];
    error?: Record<string, unknown>;
  }> {
    if (!token) return { authenticated: false };

    try {
      // 1. Debug token
      const debugRes = await this.safeGraphFetch(
        `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`
      );

      const debugData = (debugRes.payload?.data as Record<string, unknown>) || {};
      const errObj = (debugRes.payload?.error as Record<string, unknown>) || (debugData.error as Record<string, unknown>) || undefined;
      const isValid = Boolean(debugData.is_valid);
      const scopes = Array.isArray(debugData.scopes) ? (debugData.scopes as string[]) : [];
      const appId = typeof debugData.app_id === 'string' ? debugData.app_id : undefined;
      const application = typeof debugData.application === 'string' ? debugData.application : undefined;
      const userId = typeof debugData.user_id === 'string' ? debugData.user_id : undefined;
      const expiresAt = typeof debugData.expires_at === 'number' ? debugData.expires_at : undefined;
      const dataAccessExpiresAt = typeof debugData.data_access_expires_at === 'number' ? debugData.data_access_expires_at : undefined;

      // 2. Fetch User Name
      let userName: string | undefined;
      const meRes = await this.safeGraphFetch(`https://graph.facebook.com/v21.0/me?access_token=${encodeURIComponent(token)}`);
      if (meRes.ok && meRes.payload?.name) {
        userName = String(meRes.payload.name);
      }

      // 3. Fetch linked Ad Accounts
      const adAccounts: MetaAdAccountInfo[] = [];
      const adAccountsRes = await this.safeGraphFetch(
        `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status,currency,amount_spent&access_token=${encodeURIComponent(token)}`
      );
      if (adAccountsRes.ok && Array.isArray(adAccountsRes.payload?.data)) {
        for (const item of adAccountsRes.payload.data as Array<Record<string, unknown>>) {
          if (item.id) {
            adAccounts.push({
              id: String(item.id),
              name: String(item.name || item.id),
              accountStatus: Number(item.account_status) || 1,
              currency: String(item.currency || 'USD'),
              amountSpent: item.amount_spent ? String(item.amount_spent) : undefined,
            });
          }
        }
      }

      return {
        authenticated: isValid,
        identity: {
          isValid,
          appId,
          application,
          userId,
          userName,
          scopes,
          expiresAt,
          dataAccessExpiresAt,
        },
        adAccounts,
        error: !isValid ? errObj : undefined,
      };
    } catch (networkErr) {
      return {
        authenticated: false,
        error: { message: networkErr instanceof Error ? networkErr.message : 'Failed to reach Meta Graph API' },
      };
    }
  }

  /**
   * Tests actual Ad Library API capability for public competitor searches
   */
  public static async testAdLibraryAccess(token: string): Promise<{
    adLibraryAuthorized: boolean;
    commercialAdsSupported: boolean;
    politicalAdsSupported: boolean;
    euUkAdsSupported: boolean;
    diagnostic: MetaDiagnosticInfo;
  }> {
    const config = getMetaConfig();
    const endpoint = config.graphUrl;
    const apiVersionMatch = config.graphUrl.match(/\/(v\d+\.\d+)\//);
    const apiVersion = apiVersionMatch ? apiVersionMatch[1] : 'v21.0';

    // Test query for standard commercial ads in US
    const testUrl = `https://graph.facebook.com/${apiVersion}/ads_archive?search_terms=Nike&ad_reached_countries=[%22US%22]&ad_type=ALL&limit=2&access_token=${encodeURIComponent(token)}`;
    const testRes = await this.safeGraphFetch(testUrl);

    const errObj = (testRes.payload?.error as Record<string, unknown>) || {};
    const metaErrorCode = typeof errObj.code === 'number' ? errObj.code : Number(errObj.code) || null;
    const metaErrorSubcode = typeof errObj.error_subcode === 'number' ? errObj.error_subcode : Number(errObj.error_subcode) || null;
    const metaErrorType = typeof errObj.type === 'string' ? errObj.type : null;
    const metaErrorMessage = typeof errObj.message === 'string' ? errObj.message : null;
    const errorUserTitle = typeof errObj.error_user_title === 'string' ? errObj.error_user_title : null;
    const errorUserMsg = typeof errObj.error_user_msg === 'string' ? errObj.error_user_msg : null;
    const fbtraceId = typeof errObj.fbtrace_id === 'string' ? errObj.fbtrace_id : null;

    let actionRequired: string | null = null;
    if (metaErrorCode === 190) {
      actionRequired = 'Generate a fresh User Access Token at https://developers.facebook.com/tools/explorer/';
      setCachedTokenStatus(token, {
        status: 'invalid_token',
        metaCode: 190,
        metaSubcode: metaErrorSubcode || undefined,
        metaMessage: errorUserMsg || metaErrorMessage || 'Meta Access Token is invalid or expired',
        actionRequired,
        realAdsReturned: 0,
      });
    } else if (metaErrorCode === 10 || metaErrorCode === 200 || metaErrorCode === 294 || metaErrorSubcode === 2332002) {
      actionRequired = 'Complete identity verification and agree to the Ad Library API Terms at https://www.facebook.com/ads/library/api';
      setCachedTokenStatus(token, {
        status: 'permission_denied',
        metaCode: metaErrorCode || undefined,
        metaSubcode: metaErrorSubcode || 2332002,
        metaMessage: errorUserMsg || metaErrorMessage || 'Ad Library access requires identity verification at facebook.com/ads/library/api',
        actionRequired,
        realAdsReturned: 0,
      });
    }

    const isAuthorized = testRes.ok && Array.isArray(testRes.payload?.data);
    if (isAuthorized) {
      const dataArr = testRes.payload.data as unknown[];
      setCachedTokenStatus(token, {
        status: 'connected',
        realAdsReturned: dataArr.length,
      });
    }

    return {
      adLibraryAuthorized: isAuthorized,
      commercialAdsSupported: isAuthorized,
      politicalAdsSupported: isAuthorized,
      euUkAdsSupported: isAuthorized,
      diagnostic: {
        httpStatus: testRes.status,
        metaErrorCode,
        metaErrorSubcode,
        metaErrorType,
        metaErrorMessage,
        errorUserTitle,
        errorUserMsg,
        fbtraceId,
        endpoint,
        apiVersion,
        actionRequired,
      },
    };
  }

  public static clearCache(): void {
    cachedCapabilities = null;
    lastCapabilityCheck = 0;
  }

  /**
   * Main capability resolution method
   */
  public static async detectCapabilities(forceRefresh = false): Promise<MetaCapabilityStatus> {
    const now = Date.now();
    if (!forceRefresh && cachedCapabilities && now - lastCapabilityCheck < CAPABILITY_CACHE_TTL_MS) {
      return cachedCapabilities;
    }

    const config = getMetaConfig();
    const token = config.accessToken;

    if (!token) {
      const status: MetaCapabilityStatus = {
        configured: false,
        tokenConfigured: false,
        authenticated: false,
        apiReachable: true,
        adLibraryAuthorized: false,
        commercialAdsSupported: false,
        politicalAdsSupported: false,
        euUkAdsSupported: false,
        status: 'not_configured',
        statusExplanation: 'No Meta Access Token configured in environment secrets or workspace settings.',
        apiVersion: 'v21.0',
        graphUrl: config.graphUrl,
        checkedAt: new Date().toISOString(),
      };
      cachedCapabilities = status;
      lastCapabilityCheck = now;
      return status;
    }

    // 1. Inspect Token Identity
    const tokenCheck = await this.inspectTokenIdentity(token);

    if (!tokenCheck.authenticated) {
      const status: MetaCapabilityStatus = {
        configured: true,
        tokenConfigured: true,
        authenticated: false,
        apiReachable: true,
        adLibraryAuthorized: false,
        commercialAdsSupported: false,
        politicalAdsSupported: false,
        euUkAdsSupported: false,
        status: 'invalid_token',
        statusExplanation: 'Configured Meta Access Token is invalid or has expired (Code 190).',
        apiVersion: 'v21.0',
        graphUrl: config.graphUrl,
        tokenIdentity: tokenCheck.identity,
        diagnostic: {
          httpStatus: 401,
          metaErrorCode: 190,
          metaErrorSubcode: null,
          metaErrorType: 'OAuthException',
          metaErrorMessage: 'Invalid OAuth access token.',
          errorUserTitle: 'Token Expired or Invalid',
          errorUserMsg: 'Generate a new User Access Token from Facebook Developer Portal.',
          fbtraceId: null,
          endpoint: config.graphUrl,
          apiVersion: 'v21.0',
          actionRequired: 'Generate a fresh User Access Token at https://developers.facebook.com/tools/explorer/',
        },
        checkedAt: new Date().toISOString(),
      };
      cachedCapabilities = status;
      lastCapabilityCheck = now;
      return status;
    }

    // 2. Test Ad Library Access
    const adLibraryCheck = await this.testAdLibraryAccess(token);

    let finalStatus: MetaCapabilityStatus['status'] = 'connected';
    let statusExplanation = 'Meta Ad Library API connection verified with authorized access token.';

    if (!adLibraryCheck.adLibraryAuthorized) {
      if (adLibraryCheck.diagnostic.metaErrorCode === 10 || adLibraryCheck.diagnostic.metaErrorSubcode === 2332002) {
        finalStatus = 'unverified';
        statusExplanation = `Meta User Token is valid for ${tokenCheck.identity?.userName || 'account'}, but Ad Library API requires identity confirmation at facebook.com/ads/library/api.`;
      } else {
        finalStatus = 'restricted';
        statusExplanation = adLibraryCheck.diagnostic.metaErrorMessage || 'Meta API access is restricted for the requested Ad Library endpoint.';
      }
    }

    const capabilityStatus: MetaCapabilityStatus = {
      configured: true,
      tokenConfigured: true,
      authenticated: true,
      apiReachable: true,
      adLibraryAuthorized: adLibraryCheck.adLibraryAuthorized,
      commercialAdsSupported: adLibraryCheck.commercialAdsSupported,
      politicalAdsSupported: adLibraryCheck.politicalAdsSupported,
      euUkAdsSupported: adLibraryCheck.euUkAdsSupported,
      status: finalStatus,
      statusExplanation,
      apiVersion: adLibraryCheck.diagnostic.apiVersion,
      graphUrl: config.graphUrl,
      tokenIdentity: tokenCheck.identity,
      adAccounts: tokenCheck.adAccounts,
      diagnostic: adLibraryCheck.diagnostic,
      checkedAt: new Date().toISOString(),
    };

    cachedCapabilities = capabilityStatus;
    lastCapabilityCheck = now;
    return capabilityStatus;
  }
}
