import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, MapPin, Paperclip, Camera, X, Minimize2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'audio' | 'location' | 'file' | 'image';
  fileData?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    fileUrl?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
  };
}

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  
  const { toast } = useToast();

  const WEBHOOK_URL = 'https://n8nwebhook.rakewells.com/webhook/8e138917-eba3-4eb4-8fef-384ed3e69bd8';

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

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'pt-BR';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast({
          title: "Erro no reconhecimento de voz",
          description: "Não foi possível capturar o áudio. Tente novamente.",
          variant: "destructive",
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [toast]);

  const sendToWebhook = async (messageData: any) => {
    try {
      setIsLoading(true);
      console.log('Sending to webhook:', messageData);

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          type: messageData.type,
          content: messageData.content,
          metadata: messageData.metadata || null
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Wait for response (up to 30 seconds as specified)
      const botResponse = await response.json();
      console.log('Bot response:', botResponse);

      // Process bot response
      if (Array.isArray(botResponse) && botResponse.length > 0 && botResponse[0].text) {
        const botMessage: Message = {
          id: `bot-${Date.now()}`,
          text: botResponse[0].text,
          sender: 'bot',
          timestamp: new Date(),
          type: 'text'
        };
        
        setMessages(prev => [...prev, botMessage]);
        
        // Text-to-speech for bot response
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(botResponse[0].text);
          utterance.lang = 'pt-BR';
          utterance.rate = 0.9;
          speechSynthesis.speak(utterance);
        }
      }
    } catch (error) {
      console.error('Error sending to webhook:', error);
      toast({
        title: "Erro de comunicação",
        description: "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive",
      });
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
    
    await sendToWebhook({
      type: 'text',
      content: inputText,
      metadata: null
    });

    setInputText('');
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Recurso não suportado",
        description: "Seu navegador não suporta reconhecimento de voz.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
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
        
        await sendToWebhook({
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image' | 'camera') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    const fileUrl = URL.createObjectURL(file);
    
    const fileMessage: Message = {
      id: `file-${Date.now()}`,
      text: `📎 ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
      sender: 'user',
      timestamp: new Date(),
      type: type === 'camera' ? 'image' : type,
      fileData: {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileUrl
      }
    };

    setMessages(prev => [...prev, fileMessage]);

    // Convert file to base64 for webhook
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      
      await sendToWebhook({
        type: type === 'camera' ? 'image' : type,
        content: `Arquivo enviado: ${file.name}`,
        metadata: {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          base64Data: base64Data.split(',')[1] // Remove data:mime;base64, prefix
        }
      });
    };
    reader.readAsDataURL(file);

    // Reset input
    event.target.value = '';
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="flex items-start space-x-2 max-w-[80%]">
                {message.sender === 'bot' && (
                  <img
                    src="/lovable-uploads/31655c24-36e9-474c-b93e-6e29607b51cb.png"
                    alt="Inspetora"
                    className="w-8 h-8 rounded-full object-cover mt-1"
                  />
                )}
                <div>
                  <div
                    className={`p-3 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {message.type === 'image' && message.fileData?.fileUrl && (
                      <img
                        src={message.fileData.fileUrl}
                        alt={message.fileData.fileName}
                        className="max-w-full h-auto rounded mb-2"
                      />
                    )}
                    <p className="text-sm">{message.text}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-2">
                <img
                  src="/lovable-uploads/31655c24-36e9-474c-b93e-6e29607b51cb.png"
                  alt="Inspetora"
                  className="w-8 h-8 rounded-full object-cover mt-1"
                />
                <div className="bg-gray-100 p-3 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-500 hover:text-gray-700"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => imageInputRef.current?.click()}
            className="text-gray-500 hover:text-gray-700"
          >
            <Camera className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => cameraInputRef.current?.click()}
            className="text-gray-500 hover:text-gray-700"
          >
            📷
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={shareLocation}
            className="text-gray-500 hover:text-gray-700"
          >
            <MapPin className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleListening}
            className={`${isListening ? 'text-red-500' : 'text-gray-500'} hover:text-gray-700`}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        </div>
        
        <div className="flex space-x-2">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Digite sua mensagem..."
            onKeyPress={(e) => e.key === 'Enter' && sendTextMessage()}
            className="flex-1"
          />
          <Button onClick={sendTextMessage} disabled={!inputText.trim() || isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.docx,.doc"
        onChange={(e) => handleFileUpload(e, 'file')}
        className="hidden"
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileUpload(e, 'image')}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileUpload(e, 'camera')}
        className="hidden"
      />
    </div>
  );
};

export default ChatWidget;
