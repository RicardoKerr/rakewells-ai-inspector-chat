ALTER TABLE public.widgets
  ADD COLUMN IF NOT EXISTS voice_auto_send boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS voice_reply_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS voice_name text NOT NULL DEFAULT 'alloy';