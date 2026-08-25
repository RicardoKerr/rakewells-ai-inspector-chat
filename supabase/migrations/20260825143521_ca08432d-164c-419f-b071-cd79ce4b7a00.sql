INSERT INTO public.user_roles (user_id, role)
VALUES ('18354be3-b0b2-401e-a96a-acb0444c8e79', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;