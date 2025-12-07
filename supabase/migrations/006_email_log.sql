-- ============================================================================
-- Email Log Table
-- ============================================================================
--
-- PURPOSE:
-- Tracks all emails sent by the system for auditing and debugging.
-- Useful for troubleshooting email delivery issues and monitoring usage.
--
-- EMAIL TYPES:
-- - 'snapshot_saved': Normal snapshot save notification
-- - 'partial_sync': Warning when saving with <100% sync
-- - 'week_no_update': Alert when 7+ days without snapshot
-- - 'sync_failed': Error notification when Supabase sync fails
--
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_log (
  id SERIAL PRIMARY KEY,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Email classification
  email_type TEXT NOT NULL CHECK (
    email_type IN ('snapshot_saved', 'partial_sync', 'week_no_update', 'sync_failed')
  ),
  
  -- Email content
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_preview TEXT, -- First 200 chars for quick reference
  
  -- Delivery status
  success BOOLEAN NOT NULL,
  response_data JSONB, -- Full Resend API response
  error_message TEXT,
  
  -- Context
  related_snapshot_date DATE, -- If applicable
  metadata JSONB -- Additional context (player count, sync %, etc.)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_email_log_sent_at 
ON email_log(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_log_type 
ON email_log(email_type);

CREATE INDEX IF NOT EXISTS idx_email_log_success 
ON email_log(success);

-- ============================================================================
-- NO RLS - Service role access only
-- ============================================================================

REVOKE ALL ON email_log FROM anon, authenticated;

-- ============================================================================
-- Helper Queries
-- ============================================================================
--
-- View recent emails:
--   SELECT 
--     sent_at,
--     email_type,
--     subject,
--     success,
--     error_message
--   FROM email_log 
--   ORDER BY sent_at DESC 
--   LIMIT 20;
--
-- Check email delivery rate:
--   SELECT 
--     email_type,
--     COUNT(*) as total,
--     SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
--     ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
--   FROM email_log
--   GROUP BY email_type;
--
-- View failed emails:
--   SELECT * FROM email_log 
--   WHERE success = FALSE 
--   ORDER BY sent_at DESC;
--
-- Count emails sent today:
--   SELECT COUNT(*) FROM email_log 
--   WHERE sent_at >= CURRENT_DATE;
--
-- View emails for specific snapshot:
--   SELECT * FROM email_log 
--   WHERE related_snapshot_date = '2024-12-06';
--
-- ============================================================================
