GRANT SELECT, INSERT, UPDATE, DELETE ON public.widgets TO authenticated;
GRANT ALL ON public.widgets TO service_role;

GRANT SELECT ON public.public_widgets TO anon;
GRANT SELECT ON public.public_widgets TO authenticated;
GRANT SELECT ON public.public_widgets TO service_role;