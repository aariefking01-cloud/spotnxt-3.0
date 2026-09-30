'use client';

import { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  Globe,
  Lock,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface TokenStatusResponse {
  configured: boolean;
  source: 'session_user_token' | 'server_environment' | 'not_configured';
  tokenMasked: string | null;
  status: 'connected' | 'unverified' | 'invalid_token' | 'restricted' | 'not_configured' | 'error';
  statusExplanation: string;
  identity: {
    userId: string;
    userName: string;
    appId: string;
    appName: string;
    expiresAt: string | null;
    scopes: string[];
  } | null;
  diagnostic: {
    httpStatus?: number;
    metaErrorCode?: number | null;
    metaErrorSubcode?: number | null;
    metaErrorMessage?: string | null;
    errorUserTitle?: string | null;
    errorUserMsg?: string | null;
    actionRequired?: string;
  } | null;
  totalLiveAds: number;
}

interface MetaTokenConnectorProps {
  onConnected?: () => void;
  className?: string;
  compact?: boolean;
}

export function MetaTokenConnector({ onConnected, className, compact = false }: MetaTokenConnectorProps) {
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingInitial, setCheckingInitial] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<TokenStatusResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<{
    code?: number | null;
    subcode?: number | null;
    actionRequired?: string;
    userTitle?: string;
  } | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [testQuery, setTestQuery] = useState('Nike');
  const [testCountry, setTestCountry] = useState('US');

  // Load current token status on mount
  const checkStatus = async () => {
    try {
      setCheckingInitial(true);
      const res = await fetch('/api/meta/token');
      const data = await res.json();
      if (data.ok && data.data) {
        setCurrentStatus(data.data);
      }
    } catch {
      // ignore network errors on passive status check
    } finally {
      setCheckingInitial(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setErrorMessage('Please enter a valid Meta Access Token.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setErrorDetails(null);
    setSuccessNotice(null);

    try {
      const res = await fetch('/api/meta/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenInput.trim(),
          autoSync: true,
          query: testQuery.trim() || 'Nike',
          country: testCountry,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        const err = json.error || {};
        const details = err.details || {};
        setErrorMessage(err.message || 'Failed to validate Meta Access Token.');
        setErrorDetails({
          code: details.metaCode,
          subcode: details.metaSubcode,
          actionRequired: details.actionRequired,
          userTitle: details.userTitle,
        });
        return;
      }

      setSuccessNotice(json.data?.message || 'Meta token verified and connected successfully!');
      setTokenInput('');
      await checkStatus();
      if (onConnected) {
        onConnected();
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Network error communicating with server.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect this Meta token?')) return;
    setLoading(true);
    try {
      await fetch('/api/meta/token', { method: 'DELETE' });
      setSuccessNotice('Meta token cleared.');
      setCurrentStatus(null);
      await checkStatus();
      if (onConnected) {
        onConnected();
      }
    } catch {
      setErrorMessage('Failed to disconnect token.');
    } finally {
      setLoading(false);
    }
  };

  const isConnected = currentStatus?.status === 'connected';
  const isUnverified = currentStatus?.status === 'unverified' || errorDetails?.code === 10 || errorDetails?.subcode === 2332002;
  const isExpired = currentStatus?.status === 'invalid_token' || errorDetails?.code === 190;

  return (
    <Card className={`overflow-hidden border-border/60 ${className || ''}`}>
      <div className="p-5 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isConnected
                ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                : 'bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20'
            }`}>
              {isConnected ? <ShieldCheck className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-semibold">Meta Ad Library Integration</h3>
                {isConnected && (
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[11px]">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Live Verified
                  </Badge>
                )}
                {!isConnected && currentStatus?.configured && (
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-[11px]">
                    <AlertCircle className="mr-1 h-3 w-3" /> Verification Needed
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connect your official Meta User or System User token to query real live advertisements from Meta Ad Library.
              </p>
            </div>
          </div>

          {currentStatus?.configured && (
            <div className="flex items-center gap-2 self-start sm:self-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={checkStatus}
                disabled={loading || checkingInitial}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={`mr-1 h-3.5 w-3.5 ${checkingInitial ? 'animate-spin' : ''}`} />
                Check Status
              </Button>
              {currentStatus.source === 'session_user_token' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="h-8 border-destructive/30 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Disconnect
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Connected Details Card */}
        {isConnected && currentStatus && (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <span className="text-muted-foreground block text-[11px]">Account Name</span>
                <span className="font-medium text-foreground">{currentStatus.identity?.userName || 'Authorized Developer'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Active Token</span>
                <span className="font-mono text-foreground">{currentStatus.tokenMasked || '••••••••'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Ad Library API</span>
                <span className="font-medium text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Authorized & Active
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Ingested Live Ads</span>
                <span className="font-medium text-foreground">{currentStatus.totalLiveAds} verified records</span>
              </div>
            </div>
          </div>
        )}

        {/* Success Notice */}
        {successNotice && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Error / Verification Callout */}
        {(errorMessage || (!isConnected && currentStatus?.diagnostic?.actionRequired)) && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <div className="font-semibold text-amber-300">
                  {errorDetails?.userTitle || (isUnverified ? 'Ad Library API Verification Required' : isExpired ? 'Token Expired or Invalid (Code 190)' : 'Meta Connection Notice')}
                </div>
                <p className="text-amber-200/90 leading-relaxed">
                  {errorMessage || currentStatus?.diagnostic?.metaErrorMessage || currentStatus?.statusExplanation}
                </p>

                {/* Specific Action Link for Identity Verification (Error 10 / Subcode 2332002) */}
                {isUnverified && (
                  <div className="mt-3 rounded-lg bg-background/50 border border-amber-500/20 p-3 space-y-2">
                    <p className="text-muted-foreground text-[11px]">
                      Meta requires developers to complete identity confirmation and agree to the Ad Library API Terms before granting commercial search access:
                    </p>
                    <a
                      href="https://www.facebook.com/ads/library/api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium text-brand-400 hover:text-brand-300 underline"
                    >
                      <span>Complete Verification at facebook.com/ads/library/api</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {/* Action Link for Expired/Invalid Token (Error 190) */}
                {isExpired && (
                  <div className="mt-3 rounded-lg bg-background/50 border border-amber-500/20 p-3 space-y-2">
                    <p className="text-muted-foreground text-[11px]">
                      Your User Access Token has expired or lacks permissions. Generate a fresh token in the Facebook Graph API Explorer:
                    </p>
                    <a
                      href="https://developers.facebook.com/tools/explorer/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium text-brand-400 hover:text-brand-300 underline"
                    >
                      <span>Open Facebook Graph API Explorer</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleConnect} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="metaTokenInput" className="text-xs font-medium">
                {isConnected ? 'Replace Meta Access Token' : 'Enter Meta Access Token'}
              </Label>
              <a
                href="https://developers.facebook.com/tools/explorer/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-brand-400 hover:underline"
              >
                <span>Get token from Meta</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                <Lock className="h-4 w-4" />
              </div>
              <Input
                id="metaTokenInput"
                type={showToken ? 'text' : 'password'}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder={currentStatus?.tokenMasked ? `Current: ${currentStatus.tokenMasked}` : 'EAAB... (paste User or System User token)'}
                className="pl-9 pr-10 font-mono text-xs h-10 bg-background/60"
                disabled={loading}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {!compact && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <Label className="text-[11px] text-muted-foreground">Initial Test Query</Label>
                <Input
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="e.g. Nike, Apple, Adidas"
                  className="h-8 text-xs mt-1"
                  disabled={loading}
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Country</Label>
                <select
                  value={testCountry}
                  onChange={(e) => setTestCountry(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1"
                  disabled={loading}
                >
                  <option value="US">United States (US)</option>
                  <option value="IN">India (IN)</option>
                  <option value="GB">United Kingdom (GB)</option>
                  <option value="CA">Canada (CA)</option>
                  <option value="AU">Australia (AU)</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Tokens remain strictly server-side. Never exposed in browser.</span>
            </div>

            <Button
              type="submit"
              disabled={loading || !tokenInput.trim()}
              className="gradient-brand text-white shadow-md text-xs h-9 px-4 font-medium"
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Validating with Meta...
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Validate & Connect Token
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}
