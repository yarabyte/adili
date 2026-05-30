-- Analytics maison (web + business + IA)
-- npm run db:analytics

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_category TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  cabinet_id UUID REFERENCES cabinets(id) ON DELETE SET NULL,
  url TEXT,
  path TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  user_agent TEXT,
  browser TEXT,
  browser_version TEXT,
  os TEXT,
  device_type TEXT,
  screen_resolution TEXT,
  ip_anonymized TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  properties JSONB NOT NULL DEFAULT '{}',
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created ON analytics_events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_category_created ON analytics_events(event_category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_cabinet ON analytics_events(cabinet_id, created_at DESC) WHERE cabinet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor ON analytics_events(visitor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_path ON analytics_events(path) WHERE event_name = 'page_view';

CREATE TABLE IF NOT EXISTS analytics_sessions (
  id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  entry_page TEXT NOT NULL,
  entry_referrer TEXT,
  entry_utm_source TEXT,
  entry_utm_medium TEXT,
  entry_utm_campaign TEXT,
  exit_page TEXT,
  page_views_count INTEGER NOT NULL DEFAULT 0,
  events_count INTEGER NOT NULL DEFAULT 0,
  country TEXT,
  city TEXT,
  device_type TEXT,
  browser TEXT,
  is_bounce BOOLEAN NOT NULL DEFAULT FALSE,
  is_converted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_visitor ON analytics_sessions(visitor_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_user ON analytics_sessions(user_id, started_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_active ON analytics_sessions(started_at DESC) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_dates ON analytics_sessions(started_at DESC);

CREATE TABLE IF NOT EXISTS analytics_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Materialized views (rafraîchies via cron)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_kpis AS
SELECT
  DATE_TRUNC('day', created_at AT TIME ZONE 'Africa/Douala') AS day,
  COUNT(DISTINCT visitor_id) AS unique_visitors,
  COUNT(DISTINCT session_id) AS sessions,
  COUNT(*) FILTER (WHERE event_name = 'page_view') AS page_views,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS active_users,
  COUNT(*) FILTER (WHERE event_name = 'signup_completed') AS signups,
  COUNT(*) FILTER (WHERE event_name = 'subscription_created') AS new_subscriptions,
  COUNT(*) FILTER (WHERE event_name = 'ai_call' AND properties->>'success' = 'true') AS ai_calls_success,
  COALESCE(SUM((properties->>'amount_fcfa')::BIGINT) FILTER (WHERE event_name = 'payment_completed'), 0) AS revenue_fcfa
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_kpis_day ON mv_daily_kpis(day);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_pages AS
SELECT
  path,
  COUNT(*) AS views,
  COUNT(DISTINCT visitor_id) AS unique_visitors,
  AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) AS avg_duration_ms,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS views_7d
FROM analytics_events
WHERE event_name = 'page_view'
  AND path IS NOT NULL
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY path;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_top_pages_path ON mv_top_pages(path);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_traffic_sources AS
SELECT
  COALESCE(
    utm_source,
    CASE
      WHEN referrer IS NULL OR referrer = '' THEN 'direct'
      WHEN referrer ILIKE '%google%' THEN 'google'
      WHEN referrer ILIKE '%linkedin%' THEN 'linkedin'
      WHEN referrer ILIKE '%whatsapp%' OR referrer ILIKE '%wa.me%' THEN 'whatsapp'
      WHEN referrer ILIKE '%facebook%' OR referrer ILIKE '%fb.me%' THEN 'facebook'
      ELSE 'other_referral'
    END
  ) AS source,
  COUNT(DISTINCT visitor_id) AS visitors,
  COUNT(DISTINCT session_id) AS sessions,
  COUNT(*) FILTER (WHERE event_name = 'signup_completed') AS conversions
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_traffic_sources_source ON mv_traffic_sources(source);

INSERT INTO analytics_funnels (name, description, steps)
VALUES
  (
    'signup_funnel',
    'Landing → tarifs → inscription',
    '[
      {"name": "Landing", "event_name": "page_view", "path": "/"},
      {"name": "Tarifs", "event_name": "page_view", "path": "/tarifs"},
      {"name": "Inscription", "event_name": "page_view", "path": "/inscription"},
      {"name": "Compte créé", "event_name": "signup_completed"}
    ]'::jsonb
  ),
  (
    'beta_funnel',
    'Avocats pionniers → candidature beta',
    '[
      {"name": "Page beta", "event_name": "page_view", "path": "/avocats-pionniers"},
      {"name": "Candidature", "event_name": "beta_application_submitted"},
      {"name": "Acceptée", "event_name": "beta_application_accepted"}
    ]'::jsonb
  )
ON CONFLICT (name) DO NOTHING;
