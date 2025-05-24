
import React, { useRef } from 'react';
import { Send, Mic, MicOff, MapPin, Paperclip, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { validateFile, createFileMessage, fileToBase64 } from '@/utils/fileUpload';
import { Message } from '@/types/chat';
import { WebhookMessageData } from '@/services/webhookService';

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  isListening: boolean;
  isLoading: boolean;
  onSendMessage: () => void;
  onToggleListening: () => void;
  onShareLocation: () => void;
  onAddMessage: (message: Message) => void;
  onSendToWebhook: (data: WebhookMessageData) => Promise<void>;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  inputText,
  setInputText,
  isListening,
  isLoading,
  onSendMessage,
  onToggleListening,
  onShareLocation,
  onAddMessage,
  onSendToWebhook
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image' | 'camera') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      toast({
        title: "Arquivo muito grande",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    const fileMessage = createFileMessage(file, type);
    onAddMessage(fileMessage);

    try {
      const base64Data = await fileToBase64(file);
      
      await onSendToWebhook({
        type: type === 'camera' ? 'image' : type,
        content: `Arquivo enviado: ${file.name}`,
        metadata: {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          base64Data
        }
      });
    } catch (error) {
      console.error('Error processing file:', error);
    }

    event.target.value = '';
  };

  return (
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
          onClick={onShareLocation}
          className="text-gray-500 hover:text-gray-700"
        >
          <MapPin className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleListening}
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
          onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
          className="flex-1"
        />
        <Button onClick={onSendMessage} disabled={!inputText.trim() || isLoading}>
          <Send className="h-4 w-4" />
        </Button>
      </div>

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
