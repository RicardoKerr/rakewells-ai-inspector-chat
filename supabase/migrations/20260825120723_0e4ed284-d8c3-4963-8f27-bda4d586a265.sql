DROP POLICY IF EXISTS "Public read active widgets" ON public.widgets;

CREATE OR REPLACE VIEW public.public_widgets
WITH (security_invoker = off) AS
SELECT id, name, bot_name, header_title, avatar_url, primary_color,
       welcome_message, features, is_active
FROM public.widgets
WHERE is_active = true;

REVOKE ALL ON public.public_widgets FROM PUBLIC;
GRANT SELECT ON public.public_widgets TO anon, authenticated;
GRANT ALL ON public.public_widgets TO service_role;

REVOKE SELECT ON public.widgets FROM anon;

DROP POLICY IF EXISTS "Anyone insert conversations" ON public.conversations;
CREATE POLICY "Insert conversations for active widgets"
ON public.conversations FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.widgets w WHERE w.id = widget_id AND w.is_active = true)
  AND length(session_id) BETWEEN 1 AND 200
);

DROP POLICY IF EXISTS "Anyone insert messages" ON public.messages;
CREATE POLICY "Insert messages for existing conversations"
ON public.messages FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id)
  AND sender IN ('user','bot')
  AND length(content) <= 20000
);

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;