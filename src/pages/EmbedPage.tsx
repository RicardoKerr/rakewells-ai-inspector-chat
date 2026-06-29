import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ChatWidget from '@/components/ChatWidget';
import type { Widget } from '@/types/widget';

export default function EmbedPage() {
  const { id } = useParams<{ id: string }>();
  const [widget, setWidget] = useState<Widget | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from('widgets').select('*').eq('id', id).eq('is_active', true).maybeSingle()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else if (!data) setError('Widget não encontrado ou inativo.');
        else setWidget(data as any);
      });
  }, [id]);

  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!widget) return <div className="p-6 text-sm text-gray-500">Carregando...</div>;

  return (
    <div className="w-screen h-screen">
      <ChatWidget embedded config={{
        id: widget.id,
        botName: widget.bot_name,
        headerTitle: widget.header_title,
        avatarUrl: widget.avatar_url || undefined,
        primaryColor: widget.primary_color,
        welcomeMessage: widget.welcome_message,
        webhookUrl: widget.webhook_url || undefined,
        features: widget.features,
      }} />
    </div>
  );
}