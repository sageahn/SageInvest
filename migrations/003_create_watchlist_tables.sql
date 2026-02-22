-- Watchlist Tables
-- SPEC-WATCHLIST-001: 관심 종목 관리

-- Watchlist Groups (for future use, 2nd milestone)
CREATE TABLE IF NOT EXISTS watchlist_groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  ordering INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Watchlist Items
CREATE TABLE IF NOT EXISTS watchlist_items (
  id SERIAL PRIMARY KEY,
  stock_code TEXT NOT NULL,              -- 종목코드 (6자리)
  stock_name TEXT NOT NULL,              -- 종목명
  group_id INTEGER REFERENCES watchlist_groups(id) ON DELETE SET NULL, -- 그룹 ID (향후 확장용)
  ordering INTEGER NOT NULL DEFAULT 0,   -- 정렬 순서
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(stock_code)                     -- 종목당 하나만 등록 가능
);

-- Recently Viewed Stocks
CREATE TABLE IF NOT EXISTS recently_viewed (
  id SERIAL PRIMARY KEY,
  stock_code TEXT NOT NULL,              -- 종목코드 (6자리)
  stock_name TEXT NOT NULL,              -- 종목명
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(stock_code)                     -- 종목당 하나만 유지
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_watchlist_items_ordering ON watchlist_items(ordering);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_group_id ON watchlist_items(group_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_stock_code ON watchlist_items(stock_code);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_viewed_at ON recently_viewed(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_stock_code ON recently_viewed(stock_code);

-- Trigger for updated_at on watchlist_groups
CREATE TRIGGER update_watchlist_groups_updated_at BEFORE UPDATE ON watchlist_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old recently viewed entries (keep last 50)
CREATE OR REPLACE FUNCTION cleanup_recently_viewed()
RETURNS void AS $$
BEGIN
  DELETE FROM recently_viewed
  WHERE id NOT IN (
    SELECT id FROM recently_viewed
    ORDER BY viewed_at DESC
    LIMIT 50
  );
END;
$$ language 'plpgsql';

-- Trigger to auto-cleanup after insert
CREATE OR REPLACE FUNCTION trigger_cleanup_recently_viewed()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM cleanup_recently_viewed();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER cleanup_recently_viewed_trigger AFTER INSERT ON recently_viewed
    FOR EACH STATEMENT EXECUTE FUNCTION trigger_cleanup_recently_viewed();
