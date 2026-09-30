'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  Search,
  Eye,
  Trash2,
  FolderPlus,
  Tag,
  ExternalLink,
  Sparkles,
  Download,
  Folder,
  Play,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { safeFetchJson } from '@/lib/client-fetch';
import type { SwipeItem, CanonicalAd } from '@/lib/server/domain';
import { cn } from '@/lib/utils';

export default function SwipeFilePage() {
  const [items, setItems] = useState<SwipeItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [newFolderInput, setNewFolderInput] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [folders, setFolders] = useState<string[]>([
    'All',
    'My Swipe File',
    'High-Converting Hooks',
    'SaaS Free Trials',
    'Competitor Video Angles',
    'Holiday & Drops',
    'UGC Skincare',
  ]);

  const loadSwipeItems = async () => {
    setLoading(true);
    try {
      const res = await safeFetchJson<{ items: SwipeItem[] }>('/api/intelligence/swipe');
      if (res.data?.items) {
        setItems(res.data.items);
        const folderSet = new Set(folders);
        res.data.items.forEach((item) => {
          if (item.folder) folderSet.add(item.folder);
        });
        setFolders(Array.from(folderSet));
      }
    } catch (err) {
      console.error('Failed to load swipe file:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSwipeItems();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await safeFetchJson(`/api/intelligence/swipe?id=${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((item) => item.id !== id && item.adId !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderInput.trim()) return;
    const name = newFolderInput.trim();
    if (!folders.includes(name)) {
      setFolders([...folders, name]);
      setSelectedFolder(name);
    }
    setNewFolderInput('');
    setShowNewFolder(false);
  };

  const filtered = items.filter((item) => {
    const folderMatch = selectedFolder === 'All' || item.folder === selectedFolder;
    const searchMatch =
      !search.trim() ||
      item.ad.headline.toLowerCase().includes(search.toLowerCase()) ||
      item.ad.advertiserName.toLowerCase().includes(search.toLowerCase()) ||
      item.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
      (item.notes && item.notes.toLowerCase().includes(search.toLowerCase()));
    return folderMatch && searchMatch;
  });

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
            Swipe File & Creative Boards
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Save high-converting competitor ads, categorize winning hooks, and organize inspiration boards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNewFolder(!showNewFolder)}
            className="gap-1.5 text-xs"
          >
            <FolderPlus className="h-4 w-4" />
            New Board
          </Button>

          <Link href="/dashboard/ad-library">
            <Button size="sm" className="gradient-brand text-white text-xs gap-1.5">
              <Eye className="h-4 w-4" />
              Discover Creatives
            </Button>
          </Link>
        </div>
      </div>

      {/* ── New Folder Creator ── */}
      {showNewFolder && (
        <Card className="p-3 flex items-center gap-2 max-w-md">
          <Input
            placeholder="Board name (e.g. Q4 Black Friday Offers)"
            value={newFolderInput}
            onChange={(e) => setNewFolderInput(e.target.value)}
            className="h-8 text-xs"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
          <Button size="sm" onClick={handleCreateFolder} className="h-8 text-xs gradient-brand text-white shrink-0">
            Create
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowNewFolder(false)} className="h-8 text-xs shrink-0">
            Cancel
          </Button>
        </Card>
      )}

      {/* ── Boards / Folders Tabs ── */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3">
        {folders.map((folder) => {
          const count = folder === 'All' ? items.length : items.filter((i) => i.folder === folder).length;
          const isActive = selectedFolder === folder;

          return (
            <button
              key={folder}
              onClick={() => setSelectedFolder(folder)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-brand-500 text-white font-semibold shadow-sm'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Folder className="h-3.5 w-3.5" />
              {folder}
              <span className={cn('text-[10px] rounded px-1.5 py-0.2', isActive ? 'bg-white/20' : 'bg-background')}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Search Bar ── */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Filter saved ads by brand, headline, hook, or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-4 text-xs bg-background/60"
        />
      </div>

      {/* ── Items Grid ── */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">
          Loading your saved creative swipe file…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Bookmark className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-sm">No ads saved in this board yet</h3>
          <p className="max-w-md text-xs text-muted-foreground">
            Browse the Ad Library and click &quot;Save&quot; on any competitor creative to add it to your swipe boards.
          </p>
          <Link href="/dashboard/ad-library">
            <Button size="sm" className="gradient-brand text-white mt-2">
              Browse Ad Library
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <Card
              key={item.id}
              className="flex flex-col overflow-hidden border border-border/60 hover:border-brand-500/40 transition-all p-4 space-y-3"
            >
              <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black">
                {item.ad.mediaUrl ? (
                  <img src={item.ad.mediaUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-2 text-xs text-muted-foreground text-center">
                    {item.ad.headline}
                  </div>
                )}
                <Badge className="absolute top-2 left-2 bg-black/70 text-[10px] text-white">
                  {item.ad.creativeType}
                </Badge>
                {item.ad.creativeType === 'Video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Play className="h-4 w-4 fill-white text-white" />
                  </div>
                )}
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground truncate">{item.ad.advertiserName}</span>
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {item.folder}
                  </Badge>
                </div>
                <h4 className="font-semibold text-xs leading-snug truncate">{item.ad.headline}</h4>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{item.ad.primaryText}</p>
              </div>

              {item.notes && (
                <div className="rounded bg-muted/40 p-2 text-[11px] text-muted-foreground border border-border/40">
                  <span className="font-semibold text-foreground">Note:</span> {item.notes}
                </div>
              )}

              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((t, i) => (
                    <span key={i} className="rounded bg-accent/60 px-1.5 py-0.2 text-[10px] text-muted-foreground">
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-auto pt-2 border-t border-border flex items-center justify-between">
                <Link
                  href={`/dashboard/ad-library?search=${encodeURIComponent(item.ad.advertiserName)}`}
                  className="text-[11px] text-brand-400 hover:underline inline-flex items-center gap-1"
                >
                  View in Library <ExternalLink className="h-3 w-3" />
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(item.id)}
                  className="h-7 px-2 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
