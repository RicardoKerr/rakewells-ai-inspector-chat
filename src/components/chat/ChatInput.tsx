
import React, { useRef } from 'react';
import { Send, Mic, Square, MapPin, Paperclip, Camera, Loader2, Volume2, VolumeX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { validateFile, createFileMessage, fileToBase64 } from '@/utils/fileUpload';
import { Message } from '@/types/chat';
import { WebhookMessageData } from '@/services/webhookService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface VoiceControls {
  supported: boolean;
  isRecording: boolean;
  seconds: number;
  isTranscribing: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
  replyEnabled: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
}

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  isLoading: boolean;
  onSendMessage: () => void;
  onShareLocation: () => void;
  onAddMessage: (message: Message) => void;
  onSendToWebhook: (data: WebhookMessageData) => Promise<void>;
  features?: { voice?: boolean; location?: boolean; files?: boolean; camera?: boolean };
  voice: VoiceControls;
}

function formatSeconds(total: number) {
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  inputText,
  setInputText,
  isLoading,
  onSendMessage,
  onShareLocation,
  onAddMessage,
  onSendToWebhook,
  features = { voice: true, location: true, files: true, camera: false },
  voice,
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

  const micButton = (
    <Button
      variant="ghost"
      size="sm"
      disabled={!voice.supported || voice.isTranscribing}
      onClick={voice.isRecording ? voice.onStopRecording : voice.onStartRecording}
      className={`${voice.isRecording ? 'text-red-500' : 'text-gray-500'} hover:text-gray-700 disabled:opacity-50`}
      aria-label={voice.isRecording ? 'Parar gravação' : 'Gravar mensagem de voz'}
    >
      {voice.isTranscribing ? <Loader2 className="h-4 w-4 animate-spin" />
        : voice.isRecording ? <Square className="h-4 w-4" />
        : <Mic className="h-4 w-4" />}
    </Button>
  );

  return (
    <div className="border-t border-gray-200 p-4">
      {voice.isRecording && (
        <div className="mb-2 flex items-center justify-between rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            Gravando... {formatSeconds(voice.seconds)}
          </span>
          <span className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={voice.onCancelRecording} className="text-red-700 hover:text-red-900">
              <X className="h-4 w-4 mr-1" />Cancelar
            </Button>
            <Button size="sm" onClick={voice.onStopRecording}>Enviar</Button>
          </span>
        </div>
      )}
      {voice.isTranscribing && (
        <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="h-3 w-3 animate-spin" /> Transcrevendo áudio...
        </div>
      )}

      <div className="flex items-center space-x-2 mb-2">
        {features.files && <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="text-gray-500 hover:text-gray-700"
        >
          <Paperclip className="h-4 w-4" />
        </Button>}
        {features.files && <Button
          variant="ghost"
          size="sm"
          onClick={() => imageInputRef.current?.click()}
          className="text-gray-500 hover:text-gray-700"
        >
          <Camera className="h-4 w-4" />
        </Button>}
        {features.camera && <Button
          variant="ghost"
          size="sm"
          onClick={() => cameraInputRef.current?.click()}
          className="text-gray-500 hover:text-gray-700"
        >
          📷
        </Button>}
        {features.location && <Button
          variant="ghost"
          size="sm"
          onClick={onShareLocation}
          className="text-gray-500 hover:text-gray-700"
        >
          <MapPin className="h-4 w-4" />
        </Button>}
        {features.voice && (
          voice.supported ? micButton : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild><span>{micButton}</span></TooltipTrigger>
                <TooltipContent>
                  Gravação de voz indisponível: o navegador não permite acesso ao microfone (é necessário HTTPS e suporte a gravação de áudio).
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        )}
        {features.voice && voice.replyEnabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={voice.onToggleMute}
            className="text-gray-500 hover:text-gray-700"
            aria-label={voice.isMuted ? 'Ativar voz do bot' : 'Silenciar voz do bot'}
          >
            {voice.isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        )}
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
