DROP VIEW IF EXISTS public.public_widgets;

CREATE VIEW public.public_widgets
WITH (security_invoker = on) AS
SELECT id, name, bot_name, header_title, avatar_url, primary_color,
       welcome_message, features, is_active,
       voice_auto_send, voice_reply_enabled, voice_name
FROM public.widgets
WHERE is_active = true;

GRANT SELECT ON public.public_widgets TO anon, authenticated;
GRANT ALL ON public.public_widgets TO service_role;

GRANT SELECT (id, name, bot_name, header_title, avatar_url, primary_color,
              welcome_message, features, is_active,
              voice_auto_send, voice_reply_enabled, voice_name) ON public.widgets TO anon;