import { useCallback, useRef, useState } from 'react';
import { useConversation } from '@elevenlabs/react';
import { supabase } from '@/integrations/supabase/client';

export interface AgentEvent {
  role: 'user' | 'agent';
  text: string;
}

interface Options {
  widgetId?: string;
  onEvent: (event: AgentEvent) => void;
  onError: (message: string) => void;
}

export function useElevenLabsAgent({ widgetId, onEvent, onError }: Options) {
  const [isConnecting, setIsConnecting] = useState(false);
  const eventRef = useRef(onEvent);
  eventRef.current = onEvent;
  const errorRef = useRef(onError);
  errorRef.current = onError;

  const conversation = useConversation({
    onMessage: (message: any) => {
      const type = message?.type;
      if (type === 'user_transcript') {
        const text = message.user_transcription_event?.user_transcript;
        if (text) eventRef.current({ role: 'user', text });
      } else if (type === 'agent_response') {
        const text = message.agent_response_event?.agent_response;
        if (text) eventRef.current({ role: 'agent', text });
      } else if (type === 'agent_response_correction') {
        const text = message.agent_response_correction_event?.corrected_agent_response;
        if (text) eventRef.current({ role: 'agent', text });
      } else if (typeof message?.message === 'string') {
        // Fallback shape used by some SDK versions
        eventRef.current({ role: message.source === 'user' ? 'user' : 'agent', text: message.message });
      }
    },
    onError: (err: any) => {
      errorRef.current(typeof err === 'string' ? err : err?.message || 'Erro na conversa por voz.');
    },
  });

  const start = useCallback(async () => {
    if (!widgetId || widgetId === 'preview') {
      errorRef.current('Salve o widget antes de testar o agente de voz.');
      return;
    }
    setIsConnecting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data, error } = await supabase.functions.invoke('widget-elevenlabs-token', {
        body: { widgetId },
      });
      if (error) {
        let details = error.message;
        const ctx = (error as any).context;
        if (ctx?.text) {
          try {
            const parsed = JSON.parse(await ctx.text());
            details = parsed.error || details;
          } catch { /* keep default */ }
        }
        throw new Error(details);
      }
      if (!data?.token) throw new Error(data?.error || 'Não foi possível obter o token do agente.');

      await conversation.startSession({
        conversationToken: data.token,
        connectionType: 'webrtc',
      });
    } catch (err: any) {
      errorRef.current(
        err?.name === 'NotAllowedError'
          ? 'Permissão de microfone negada. Libere o acesso nas configurações do site.'
          : err?.message || 'Não foi possível iniciar a conversa por voz.',
      );
    } finally {
      setIsConnecting(false);
    }
  }, [widgetId, conversation]);

  const stop = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch { /* ignore */ }
  }, [conversation]);

  const sendText = useCallback((text: string) => {
    try {
      conversation.sendUserMessage(text);
      return true;
    } catch {
      return false;
    }
  }, [conversation]);

  return {
    start,
    stop,
    sendText,
    isConnecting,
    status: conversation.status,
    isConnected: conversation.status === 'connected',
    isSpeaking: conversation.isSpeaking,
  };
}
