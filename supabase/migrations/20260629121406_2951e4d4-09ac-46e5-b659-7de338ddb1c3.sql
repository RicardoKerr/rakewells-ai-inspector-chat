
-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users see own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- First user becomes admin automatically
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Widgets table
CREATE TABLE public.widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bot_name TEXT NOT NULL DEFAULT 'Assistente',
  header_title TEXT NOT NULL DEFAULT 'Chat',
  avatar_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#2563eb',
  welcome_message TEXT NOT NULL DEFAULT 'Olá! Como posso ajudar?',
  webhook_url TEXT,
  knowledge_mode TEXT NOT NULL DEFAULT 'webhook',
  system_prompt TEXT,
  features JSONB NOT NULL DEFAULT '{"voice":true,"location":true,"files":true,"camera":false}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.widgets TO authenticated;
GRANT SELECT ON public.widgets TO anon;
GRANT ALL ON public.widgets TO service_role;
ALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage widgets" ON public.widgets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public read active widgets" ON public.widgets
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Conversations
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES public.widgets(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  user_agent TEXT,
  referrer TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT INSERT ON public.conversations TO anon;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read conversations" ON public.conversations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone insert conversations" ON public.conversations
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  content TEXT NOT NULL,
  msg_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT INSERT ON public.messages TO anon;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read messages" ON public.messages
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone insert messages" ON public.messages
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_widgets_updated_at BEFORE UPDATE ON public.widgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the existing Humanito widget
INSERT INTO public.widgets (id, name, bot_name, header_title, avatar_url, welcome_message, webhook_url, knowledge_mode, features)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Humanito - TV Humana',
  'Humanito',
  'Humanito | TV Humana',
  '/lovable-uploads/87e012d2-0f3a-450f-bcc4-a004440bda96.png',
  'Olá! 😊 Estou aqui para ajudar com temas relacionados à inteligência artificial e tecnologia. O que você gostaria de saber ou discutir?',
  'https://n8nwebhook.rakewells.com/webhook/8e138917-eba3-4eb4-8fef-384ed3e69bd8',
  'webhook',
  '{"voice":true,"location":true,"files":true,"camera":false}'::jsonb
);
