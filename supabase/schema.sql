-- Spot NXT Meta Ad Library Database Schema
-- Compatible with Supabase / PostgreSQL

-- 1. Advertisers / Meta Pages table
CREATE TABLE IF NOT EXISTS advertisers (
  id TEXT PRIMARY KEY,
  external_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  page_id TEXT,
  industry TEXT,
  website TEXT,
  country TEXT,
  total_ads INTEGER DEFAULT 0,
  active_ads INTEGER DEFAULT 0,
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  source_label TEXT DEFAULT 'Meta Ad Library',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advertisers_name ON advertisers(name);
CREATE INDEX IF NOT EXISTS idx_advertisers_country ON advertisers(country);

-- 2. Canonical Ads table
CREATE TABLE IF NOT EXISTS ads (
  id TEXT PRIMARY KEY,
  external_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'meta-ad-library',
  advertiser_id TEXT REFERENCES advertisers(id) ON DELETE SET NULL,
  advertiser_name TEXT NOT NULL,
  page_id TEXT,
  page_name TEXT,
  platform TEXT NOT NULL DEFAULT 'Meta',
  country TEXT,
  market TEXT DEFAULT 'GLOBAL',
  status TEXT NOT NULL DEFAULT 'Active',
  creative_type TEXT NOT NULL DEFAULT 'Image',
  headline TEXT NOT NULL,
  primary_text TEXT NOT NULL,
  description TEXT,
  cta TEXT,
  destination TEXT,
  media_url TEXT,
  thumbnail_url TEXT,
  landing_page_url TEXT,
  source TEXT NOT NULL DEFAULT 'meta',
  source_url TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  permissions_context TEXT,
  confidence NUMERIC(4, 2) DEFAULT 0.95,
  content_hash TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  raw_provider_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ads_external_id ON ads(external_id);
CREATE INDEX IF NOT EXISTS idx_ads_advertiser_id ON ads(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_ads_platform ON ads(platform);
CREATE INDEX IF NOT EXISTS idx_ads_status ON ads(status);
CREATE INDEX IF NOT EXISTS idx_ads_country ON ads(country);
CREATE INDEX IF NOT EXISTS idx_ads_last_seen_at ON ads(last_seen_at DESC);

-- 3. Ad Creatives / Visual assets
CREATE TABLE IF NOT EXISTS ad_creatives (
  id TEXT PRIMARY KEY,
  ad_id TEXT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'Image',
  media_url TEXT,
  thumbnail_url TEXT,
  raw_dimensions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_creatives_ad_id ON ad_creatives(ad_id);

-- 4. Ad Snapshots (History of observations over time)
CREATE TABLE IF NOT EXISTS ad_snapshots (
  id TEXT PRIMARY KEY,
  ad_id TEXT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  snapshot_url TEXT NOT NULL,
  publisher_platforms JSONB DEFAULT '[]'::jsonb,
  observed_at TIMESTAMPTZ NOT NULL,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_snapshots_ad_id ON ad_snapshots(ad_id);

-- 5. Ad Sync Runs
CREATE TABLE IF NOT EXISTS ad_sync_runs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'meta-ad-library',
  query TEXT NOT NULL,
  country TEXT NOT NULL,
  active_status TEXT DEFAULT 'ALL',
  pages_fetched INTEGER DEFAULT 0,
  records_fetched INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_sync_runs_created_at ON ad_sync_runs(created_at DESC);
