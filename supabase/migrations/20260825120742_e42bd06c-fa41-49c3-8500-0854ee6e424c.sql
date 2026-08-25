DROP VIEW IF EXISTS public.public_widgets;

CREATE VIEW public.public_widgets
WITH (security_invoker = on) AS
SELECT id, name, bot_name, header_title, avatar_url, primary_color,
       welcome_message, features, is_active
FROM public.widgets
WHERE is_active = true;

GRANT SELECT ON public.public_widgets TO anon, authenticated;

CREATE POLICY "Public read active widgets"
ON public.widgets FOR SELECT TO anon, authenticated
USING (is_active = true);

GRANT SELECT (id, name, bot_name, header_title, avatar_url, primary_color,
              welcome_message, features, is_active) ON public.widgets TO anon;