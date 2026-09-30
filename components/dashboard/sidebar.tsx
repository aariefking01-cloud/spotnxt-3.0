'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Eye, Search, FileText, TrendingUp, Bookmark,
  Bell, User, Settings, CreditCard, Shield, X, ChevronLeft,
  Sparkles, Target, Brain, Users, Building2,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';

const navSections = [
  {
    title: 'INTELLIGENCE',
    items: [
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Ad Library', href: '/dashboard/ad-library', icon: Eye },
      { label: 'Brand Profiles', href: '/dashboard/brands', icon: Building2 },
      { label: 'Competitors', href: '/dashboard/competitors', icon: Search },
      { label: 'Creative Analyzer', href: '/dashboard/analyzer', icon: Sparkles },
      { label: 'Trends', href: '/dashboard/trends', icon: TrendingUp },
    ],
  },
  {
    title: 'ACTION',
    items: [
      { label: 'Recommendations', href: '/dashboard/recommendations', icon: Target },
      { label: 'Reports', href: '/dashboard/reports', icon: FileText },
      { label: 'Alerts', href: '/dashboard/notifications', icon: Bell },
    ],
  },
  {
    title: 'WORKSPACE',
    items: [
      { label: 'Swipe File', href: '/dashboard/saved', icon: Bookmark },
      { label: 'AI Assistant', href: '/dashboard/assistant', icon: Brain },
      { label: 'Team', href: '/dashboard/profile', icon: Users },
      { label: 'Settings', href: '/dashboard/settings', icon: Settings },
      { label: 'Subscription', href: '/dashboard/subscription', icon: CreditCard },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => Boolean(pathname && (pathname === href || (href !== '/dashboard' && pathname.startsWith(href))));

  const renderLink = (item: { label: string; href: string; icon: React.ElementType }) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch={false}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
          active
            ? 'bg-brand-500/10 text-brand-400'
            : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground',
          collapsed && 'justify-center'
        )}
      >
        {active && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full gradient-brand"
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
        )}
        <item.icon className={cn('h-[18px] w-[18px] flex-shrink-0', active && 'text-brand-400')} />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  };

  const renderSection = (section: { title: string; items: typeof navSections[0]['items'] }) => (
    <div key={section.title} className="space-y-1">
      {!collapsed && (
        <div className="px-3 pb-1 pt-3 text-[10px] font-semibold tracking-wider text-muted-foreground/50">
          {section.title}
        </div>
      )}
      {collapsed && <div className="mx-3 my-2 border-t border-white/[0.04]" />}
      {section.items.map(renderLink)}
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 256 }}
        className="fixed left-0 top-0 z-50 hidden h-screen flex-col border-r border-white/[0.04] bg-card/40 backdrop-blur-xl lg:flex"
      >
        <div className={cn('flex h-16 items-center border-b border-white/[0.04] px-4', collapsed && 'justify-center')}>
          <Logo showText={!collapsed} />
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {navSections.map(renderSection)}
          <div className="space-y-1">
            {!collapsed && (
              <div className="px-3 pb-1 pt-3 text-[10px] font-semibold tracking-wider text-muted-foreground/50">
                ADMIN
              </div>
            )}
            {collapsed && <div className="mx-3 my-2 border-t border-white/[0.04]" />}
            <Link
              href="/dashboard/admin"
              prefetch={false}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive('/dashboard/admin')
                  ? 'bg-brand-500/10 text-brand-400'
                  : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground',
                collapsed && 'justify-center'
              )}
            >
              <Shield className="h-[18px] w-[18px] flex-shrink-0" />
              {!collapsed && <span>Admin Panel</span>}
            </Link>
          </div>
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.06] bg-background shadow-md transition-colors hover:bg-accent"
        >
          <ChevronLeft className={cn('h-3.5 w-3.5 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </motion.aside>

      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-white/[0.04] bg-card backdrop-blur-xl lg:hidden"
          >
            <div className="flex h-16 items-center justify-between border-b border-white/[0.04] px-4">
              <Logo />
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 hover:bg-white/[0.04]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3">
              {navSections.map(renderSection)}
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
