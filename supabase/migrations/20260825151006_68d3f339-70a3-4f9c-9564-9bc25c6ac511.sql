ALTER TABLE public.widgets
  ADD COLUMN IF NOT EXISTS voice_auto_send boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS voice_reply_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS voice_name text NOT NULL DEFAULT 'alloy';

DROP VIEW IF EXISTS public.public_widgets;
CREATE VIEW public.public_widgets
WITH (security_invoker = true) AS
SELECT id, name, bot_name, header_title, avatar_url, primary_color, welcome_message,
       knowledge_mode, features, is_active, voice_auto_send, voice_reply_enabled, voice_name,
       created_at, updated_at
FROM public.widgets
WHERE is_active = true;

GRANT SELECT ON public.public_widgets TO anon, authenticated;