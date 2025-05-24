import React, { useState, useRef, useEffect } from 'react';
import { X, Minimize2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Message } from '@/types/chat';
import { sendToWebhook, WebhookMessageData } from '@/services/webhookService';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { LoadingIndicator } from '@/components/chat/LoadingIndicator';
import { ChatInput } from '@/components/chat/ChatInput';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { isListening, toggleListening } = useSpeechRecognition();

  // Initialize session
  useEffect(() => {
    let storedSessionId = localStorage.getItem('chatbot-session-id');
    if (!storedSessionId) {
      storedSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('chatbot-session-id', storedSessionId);
    }
    setSessionId(storedSessionId);

    // Add welcome message
    const welcomeMessage: Message = {
      id: `msg-${Date.now()}`,
      text: 'Olá! 😊 Estou aqui para ajudar com temas relacionados à inteligência artificial e tecnologia. O que você gostaria de saber ou discutir?',
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    };
    setMessages([welcomeMessage]);
  }, []);

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

      const messageText = await sendToWebhook(sessionId, messageData);
      
      // Remove a mensagem de aguarde
      setMessages(prev => prev.filter(msg => msg.id !== waitMessage.id));
      
      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        text: messageText,
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, botMessage]);
      
      // Text-to-speech for bot response
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(messageText);
        utterance.lang = 'pt-BR';
        utterance.rate = 0.9;
        speechSynthesis.speak(utterance);
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

  const handleToggleListening = () => {
    toggleListening((transcript: string) => {
      setInputText(transcript);
    });
  };

  const shareLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Recurso não suportado",
        description: "Seu navegador não suporta geolocalização.",
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
        console.error('Geolocation error:', error);
        toast({
          title: "Erro de localização",
          description: "Não foi possível obter sua localização. Verifique as permissões.",
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

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-16 w-16 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
          size="lg"
        >
          <MessageCircle className="h-8 w-8 text-white" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src="/lovable-uploads/31655c24-36e9-474c-b93e-6e29607b51cb.png"
            alt="Inspetora"
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <h3 className="font-semibold">Inspetora | PRF</h3>
            <p className="text-xs opacity-90">Online</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-blue-700"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-blue-700"
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
            />
          ))}
          {isLoading && <LoadingIndicator />}
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
      />
    </div>
  );
};

export default ChatWidget;
