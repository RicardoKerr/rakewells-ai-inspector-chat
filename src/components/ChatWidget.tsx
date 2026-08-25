import React, { useState, useRef, useEffect } from 'react';
import { X, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Message } from '@/types/chat';
import { sendToWebhook, WebhookMessageData, DEFAULT_WEBHOOK_URL } from '@/services/webhookService';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { LoadingIndicator } from '@/components/chat/LoadingIndicator';
import { ChatInput } from '@/components/chat/ChatInput';

const VOICE_SETTINGS_KEY = 'chatbot-voice-settings';

export interface ChatWidgetConfig {
  id?: string;
  botName?: string;
  headerTitle?: string;
  avatarUrl?: string;
  primaryColor?: string;
  welcomeMessage?: string;
  webhookUrl?: string;
  features?: { voice?: boolean; location?: boolean; files?: boolean; camera?: boolean };
}

interface ChatWidgetProps {
  config?: ChatWidgetConfig;
  embedded?: boolean;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ config = {}, embedded = false }) => {
  const {
    id: widgetId,
    headerTitle = 'Humanito | TV Humana',
    avatarUrl = '/lovable-uploads/87e012d2-0f3a-450f-bcc4-a004440bda96.png',
    primaryColor = '#2563eb',
    welcomeMessage = 'Olá! 😊 Estou aqui para ajudar com temas relacionados à inteligência artificial e tecnologia. O que você gostaria de saber ou discutir?',
    webhookUrl = DEFAULT_WEBHOOK_URL,
    features = { voice: true, location: true, files: true, camera: false },
  } = config;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { isListening, toggleListening } = useSpeechRecognition();

  // Initialize voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const storedVoiceName = localStorage.getItem(VOICE_SETTINGS_KEY);
      
      if (storedVoiceName) {
        const voice = voices.find(v => v.name === storedVoiceName);
        if (voice) {
          setSelectedVoice(voice);
          return;
        }
      }
      
      // Se não encontrou a voz salva, procura a Francisca
      const francisca = voices.find(voice => 
        voice.name.toLowerCase().includes('francisca') && 
        voice.lang.includes('pt')
      );
      
      if (francisca) {
        setSelectedVoice(francisca);
        localStorage.setItem(VOICE_SETTINGS_KEY, francisca.name);
      } else {
        // Se não encontrou Francisca, procura qualquer voz em português
        const ptVoice = voices.find(voice => voice.lang.includes('pt'));
        if (ptVoice) {
          setSelectedVoice(ptVoice);
          localStorage.setItem(VOICE_SETTINGS_KEY, ptVoice.name);
        }
      }
    };

    if ('speechSynthesis' in window) {
      // Carrega as vozes imediatamente se já estiverem disponíveis
      loadVoices();
      
      // Configura o evento para carregar quando as vozes estiverem disponíveis
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Initialize session
  useEffect(() => {
    const key = `chatbot-session-${config.id || 'default'}`;
    let storedSessionId = localStorage.getItem(key);
    if (!storedSessionId) {
      storedSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(key, storedSessionId);
    }
    setSessionId(storedSessionId);

    const welcomeMsg: Message = {
      id: `msg-${Date.now()}`,
      text: welcomeMessage,
      sender: 'bot',
      timestamp: new Date(),
      type: 'text',
    };
    setMessages([welcomeMsg]);
  }, [config.id, welcomeMessage]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendToWebhook = async (messageData: WebhookMessageData) => {
    try {
      setIsLoading(true);
      
      // Adiciona mensagem de aguarde
      const waitMessage: Message = {
        id: `wait-${Date.now()}`,
        text: "⌛ Aguarde um momento enquanto processo sua mensagem...",
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, waitMessage]);

      const responses = await sendToWebhook(sessionId, messageData, webhookUrl, widgetId && widgetId !== 'preview' ? widgetId : undefined);
      console.log('Webhook responses:', responses);
      if (!responses || responses.length === 0) {
        toast({
          title: 'Nenhuma resposta do webhook',
          description: 'O webhook não retornou dados.',
          variant: 'destructive',
        });
        // Remove mensagem de aguarde
        setMessages(prev => prev.filter(msg => msg.id !== waitMessage.id));
        setIsLoading(false);
        return;
      }
      
      // Remove a mensagem de aguarde
      setMessages(prev => prev.filter(msg => msg.id !== waitMessage.id));
      
      // Processa cada resposta do webhook
      for (const response of responses) {
        if ('text' in response) {
          const botMessage: Message = {
            id: `bot-${Date.now()}-${Math.random()}`,
            text: response.text,
            sender: 'bot',
            timestamp: new Date(),
            type: 'text'          };
          setMessages(prev => [...prev, botMessage]);
          
          // Texto será exibido apenas visualmente, sem síntese de voz
          // A voz virá apenas do áudio base64 do N8N se houver
        } else if ('audio' in response) {
          // Adiciona mensagem de áudio com os dados de áudio
          const audioMessage: Message = {
            id: `bot-${Date.now()}-${Math.random()}`,
            text: '🔊 Resposta por áudio',
            sender: 'bot',
            timestamp: new Date(),
            type: 'audio',
            audioData: response.audio // Armazena o áudio em base64
          };
          setMessages(prev => [...prev, audioMessage]);
          
          // Reproduz o áudio base64
          try {
            console.log("Reproduzindo áudio base64");
            const audio = new Audio(`data:audio/mp3;base64,${response.audio}`);
            audio.volume = 1.0;
            await audio.play();
          } catch (error) {
            console.error('Error playing audio:', error);
            toast({
              title: "Erro ao reproduzir áudio",
              description: "Não foi possível reproduzir o áudio recebido.",
              variant: "destructive",
            });
          }
        }
        // Delay entre respostas
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } catch (error) {
      console.error('Error sending to webhook:', error);
      
      let errorMessage = "Não foi possível enviar a mensagem. Tente novamente.";
      let errorDescription = "";
      
      if (error.name === 'AbortError') {
        errorMessage = "A solicitação está demorando mais que o esperado.";
        errorDescription = "Aguarde um momento e tente novamente.";
      } else if (error.message === 'EMPTY_RESPONSE') {
        errorMessage = "Desculpe, ocorreu um erro na comunicação.";
        errorDescription = "A resposta está vazia. Por favor, tente novamente em alguns instantes.";
      } else if (error.message === 'INVALID_JSON') {
        errorMessage = "Erro ao processar a resposta.";
        errorDescription = "Houve um problema técnico. Tente novamente.";
      }
      
      toast({
        title: errorMessage,
        description: errorDescription,
        variant: "destructive",
      });

      // Add error message to chat
      const errorChatMessage: Message = {
        id: `error-${Date.now()}`,
        text: "❌ " + errorMessage,
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorChatMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendTextMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    
    await handleSendToWebhook({
      type: 'text',
      content: inputText,
      metadata: null
    });

    setInputText('');
  };

  const shareLocation = () => {
    if (!('geolocation' in navigator)) {
      toast({
        title: "Recurso não suportado",
        description: "Seu navegador não suporta geolocalização.",
        variant: "destructive",
      });
      return;
    }

    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      toast({
        title: "Permissão não solicitada",
        description: "Por segurança, o navegador só permite acesso à localização em sites HTTPS ou localhost. Acesse o sistema por HTTPS para liberar a permissão.",
        variant: "destructive",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const locationMessage: Message = {
          id: `location-${Date.now()}`,
          text: `📍 Localização compartilhada: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          sender: 'user',
          timestamp: new Date(),
          type: 'location',
          location: { latitude, longitude }
        };
        setMessages(prev => [...prev, locationMessage]);
        await handleSendToWebhook({
          type: 'location',
          content: 'Usuário compartilhou localização',
          metadata: { latitude, longitude }
        });
      },
      (error) => {
        let description = "Não foi possível obter sua localização. Verifique as permissões do navegador.";
        if (error.code === 1) {
          description = "Permissão de localização negada. Clique no cadeado ao lado do endereço do site e permita o acesso à localização.";
        } else if (error.code === 2) {
          description = "Localização indisponível. Tente novamente em outro local ou rede.";
        } else if (error.code === 3) {
          description = "Tempo de espera excedido ao tentar obter localização.";
        }
        toast({
          title: "Erro de localização",
          description,
          variant: "destructive",
        });
      }
    );
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const handleToggleListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Recurso não suportado",
        description: "Seu navegador não suporta reconhecimento de voz.",
        variant: "destructive",
      });
      return;
    }
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      toast({
        title: "Permissão não solicitada",
        description: "Por segurança, o navegador só permite acesso ao microfone em sites HTTPS ou localhost. Acesse o sistema por HTTPS para liberar a permissão.",
        variant: "destructive",
      });
      return;
    }
    toggleListening((transcript: string) => {
      setInputText(transcript);
    });
  };
  if (embedded) {
    // Render always-open, fullscreen
    return (
      <div className="w-full h-full bg-white flex flex-col">
        <div className="text-white p-4 flex items-center space-x-3" style={{ backgroundColor: primaryColor }}>
          {avatarUrl && (
            <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
          )}
          <div>
            <h3 className="font-semibold">{headerTitle}</h3>
            <p className="text-xs opacity-90">Online</p>
          </div>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} formatTime={formatTime} avatarUrl={avatarUrl} />
            ))}
            {isLoading && <LoadingIndicator avatarUrl={avatarUrl} />}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        <ChatInput
          inputText={inputText}
          setInputText={setInputText}
          isListening={isListening}
          isLoading={isLoading}
          onSendMessage={sendTextMessage}
          onToggleListening={handleToggleListening}
          onShareLocation={shareLocation}
          onAddMessage={addMessage}
          onSendToWebhook={handleSendToWebhook}
          features={features}
        />
      </div>
    );
  }

  if (!isOpen) {
    return (      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-32 w-32 rounded-full p-0 shadow-lg border-2 border-white overflow-hidden"
          size="lg"
          variant="ghost"
        >
          <img
            src={avatarUrl}
            alt={headerTitle}
            className="w-full h-full object-cover"
          />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col">
      {/* Header */}
      <div className="text-white p-4 rounded-t-lg flex items-center justify-between" style={{ backgroundColor: primaryColor }}>
        <div className="flex items-center space-x-3">
          <img
            src={avatarUrl}
            alt={headerTitle}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <h3 className="font-semibold">{headerTitle}</h3>
            <p className="text-xs opacity-90">Online</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-black/10"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-black/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageBubble 
              key={message.id} 
              message={message} 
              formatTime={formatTime} 
              avatarUrl={avatarUrl}
            />
          ))}
          {isLoading && <LoadingIndicator avatarUrl={avatarUrl} />}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <ChatInput
        inputText={inputText}
        setInputText={setInputText}
        isListening={isListening}
        isLoading={isLoading}
        onSendMessage={sendTextMessage}
        onToggleListening={handleToggleListening}
        onShareLocation={shareLocation}
        onAddMessage={addMessage}
        onSendToWebhook={handleSendToWebhook}
        features={features}
      />
    </div>
  );
};

export default ChatWidget;
