'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, Menu, ChevronDown, Database, Sparkles, Check, Globe } from 'lucide-react';
import { FormEvent, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { alertData } from '@/lib/data';
import { cn } from '@/lib/utils';
import { safeFetchJson } from '@/lib/client-fetch';

interface TopNavProps {
  onMobileMenu: () => void;
}

export function TopNav({ onMobileMenu }: TopNavProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [isDemo, setIsDemo] = useState(true);
  const [switchingMode, setSwitchingMode] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    safeFetchJson<{ isDemoMode: boolean }>('/api/intelligence/providers/mode')
      .then((payload) => {
        if (payload?.data && typeof payload.data.isDemoMode === 'boolean') {
          setIsDemo(payload.data.isDemoMode);
        }
      })
      .catch(() => {});
  }, []);

  const toggleMode = async (targetDemo: boolean) => {
    if (switchingMode) return;
    setSwitchingMode(true);
    try {
      const res = await safeFetchJson<{ isDemoMode: boolean }>('/api/intelligence/providers/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demoMode: targetDemo }),
      });
      if (res?.data && typeof res.data.isDemoMode === 'boolean') {
        setIsDemo(res.data.isDemoMode);
      }
      setModeOpen(false);
      window.dispatchEvent(new CustomEvent('spotnxt-mode-changed', { detail: { isDemo: targetDemo } }));
      router.refresh();
    } catch (err) {
      console.error('Mode toggle failed:', err);
    } finally {
      setSwitchingMode(false);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (modeRef.current && !modeRef.current.contains(e.target as Node)) setModeOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = search.trim();
    router.push(query ? `/dashboard/ad-library?search=${encodeURIComponent(query)}` : '/dashboard/ad-library');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-6">
      <button
        onClick={onMobileMenu}
        className="rounded-lg p-2 hover:bg-accent lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search */}
      <form onSubmit={submitSearch} className="relative flex-1 max-w-md">
        <button type="submit" aria-label="Search ads" className="absolute left-0 top-0 z-10 flex h-full w-10 items-center justify-center text-muted-foreground hover:text-foreground">
          <Search className="h-4 w-4" />
        </button>
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search competitors, ads, insights..."
          className="w-full rounded-lg border border-border bg-muted/50 py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 focus:bg-background focus:ring-2 focus:ring-brand-500/20"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border bg-background px-1.5 py-0.5 text-xs text-muted-foreground hidden md:block">
          ⌘K
        </kbd>
      </form>

      <div className="flex items-center gap-2">
        {/* Provider Mode Switcher */}
        <div ref={modeRef} className="relative">
          <button
            onClick={() => setModeOpen(!modeOpen)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors",
              isDemo
                ? "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            )}
            title="Switch between Demo Sample Intelligence and Live Meta Ad Library API"
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", isDemo ? "bg-amber-400" : "bg-emerald-400 animate-pulse")} />
            <span className="hidden sm:inline">{isDemo ? 'Demo Mode (Opt-in)' : 'Live Meta API'}</span>
            <span className="sm:hidden">{isDemo ? 'Demo' : 'Live'}</span>
            <ChevronDown className="h-3 w-3 opacity-70" />
          </button>

          <AnimatePresence>
            {modeOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-72 rounded-xl border border-border bg-popover p-3 shadow-xl z-50 text-xs"
              >
                <div className="font-semibold text-foreground mb-1 flex items-center justify-between">
                  <span>Data Source Mode</span>
                  <Badge variant="outline" className="text-[10px]">{isDemo ? 'Sample Data' : 'Live Graph API'}</Badge>
                </div>
                <p className="text-muted-foreground text-[11px] mb-3">
                  Select the provider environment. The AI intelligence pipeline operates identically across both modes.
                </p>

                <div className="space-y-1.5">
                  <button
                    onClick={() => toggleMode(true)}
                    disabled={switchingMode}
                    className={cn(
                      "w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors border",
                      isDemo
                        ? "border-amber-500/40 bg-amber-500/10 text-foreground"
                        : "border-transparent hover:bg-accent text-muted-foreground"
                    )}
                  >
                    <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium flex items-center justify-between">
                        <span>Demo Intelligence Mode</span>
                        {isDemo && <Check className="h-3 w-3 text-amber-400" />}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        High-fidelity, verified sample dataset with 200+ canonical ads across Nike, Adidas, Puma, Lululemon, Gymshark, Glossier & Duolingo.
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => toggleMode(false)}
                    disabled={switchingMode}
                    className={cn(
                      "w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors border",
                      !isDemo
                        ? "border-emerald-500/40 bg-emerald-500/10 text-foreground"
                        : "border-transparent hover:bg-accent text-muted-foreground"
                    )}
                  >
                    <Globe className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium flex items-center justify-between">
                        <span>Live Meta Ad Library Mode</span>
                        {!isDemo && <Check className="h-3 w-3 text-emerald-400" />}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Direct connection to Meta Graph API v21.0 ads archive endpoint using your server access token.
                      </div>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ThemeToggle />

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative rounded-lg p-2 transition-colors hover:bg-accent"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
          </button>
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-popover shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-border p-4">
                  <span className="font-semibold text-sm">Notifications</span>
                  <Badge variant="secondary" className="text-xs">6 new</Badge>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {alertData.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="flex gap-3 border-b border-border/50 p-3 last:border-0 hover:bg-accent/50 transition-colors cursor-pointer">
                      <div className={cn(
                        'mt-1 h-2 w-2 flex-shrink-0 rounded-full',
                        alert.severity === 'Critical' ? 'bg-destructive' :
                        alert.severity === 'High' ? 'bg-warning' :
                        alert.severity === 'Medium' ? 'bg-brand-500' : 'bg-success'
                      )} />
                      <div className="flex-1">
                        <p className="text-xs text-foreground">
                          <span className="font-semibold">{alert.competitor}</span> — {alert.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{alert.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 text-center">
                  <button className="text-xs font-medium text-brand-500 hover:underline">View all notifications</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-accent"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-brand text-xs font-bold text-white">
              JD
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
          </button>
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-popover shadow-xl"
              >
                <div className="border-b border-border p-4">
                  <div className="text-sm font-semibold">Jordan Doe</div>
                  <div className="text-xs text-muted-foreground">jordan@spotnxt.ai</div>
                </div>
                <div className="p-2">
                  {['Profile', 'Settings', 'Subscription', 'Billing'].map((item) => (
                    <button key={item} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-accent transition-colors">
                      {item}
                    </button>
                  ))}
                </div>
                <div className="border-t border-border p-2">
                  <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors">
                    Sign out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
