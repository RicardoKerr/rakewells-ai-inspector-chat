ALTER TABLE public.widgets
  ADD COLUMN IF NOT EXISTS conversation_mode text NOT NULL DEFAULT 'webhook',
  ADD COLUMN IF NOT EXISTS elevenlabs_agent_id text;

ALTER TABLE public.widgets
  DROP CONSTRAINT IF EXISTS widgets_conversation_mode_check;
ALTER TABLE public.widgets
  ADD CONSTRAINT widgets_conversation_mode_check
  CHECK (conversation_mode IN ('webhook', 'elevenlabs_agent'));

DROP VIEW IF EXISTS public.public_widgets;
CREATE VIEW public.public_widgets
WITH (security_invoker = true) AS
SELECT id, name, bot_name, header_title, avatar_url, primary_color, welcome_message,
       knowledge_mode, features, is_active, voice_auto_send, voice_reply_enabled, voice_name,
       conversation_mode, elevenlabs_agent_id,
       created_at, updated_at
FROM public.widgets
WHERE is_active = true;

GRANT SELECT ON public.public_widgets TO anon, authenticated;