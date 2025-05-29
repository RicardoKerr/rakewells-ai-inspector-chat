
import React, { useState } from 'react';
import { Message } from '@/types/chat';

interface MessageBubbleProps {
  message: Message;
  formatTime: (date: Date) => string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, formatTime }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  return (
    <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
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
            )}            {message.type === 'audio' ? (
              <div className="flex flex-col">
                <span className="text-sm mb-1">{isPlaying ? '🔊 Reproduzindo...' : '🔊 Resposta de áudio'}</span>
                <button 
                  onClick={() => {
                    if (message.audioData) {
                      setIsPlaying(true);
                      const audio = new Audio(`data:audio/mp3;base64,${message.audioData}`);
                      audio.volume = 1.0;
                      audio.onended = () => setIsPlaying(false);
                      audio.play()
                        .catch(err => {
                          console.error('Erro ao reproduzir áudio:', err);
                          setIsPlaying(false);
                        });
                    }
                  }}
                  disabled={isPlaying}
                  className={`${isPlaying ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white text-xs py-1 px-2 rounded flex items-center transition-colors`}
                >
                  <span className="mr-1">{isPlaying ? '🔄' : '▶️'}</span> 
                  {isPlaying ? 'Reproduzindo...' : 'Reproduzir novamente'}
                </button>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{message.text}</p>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {formatTime(message.timestamp)}
          </p>
        </div>
      </div>
    </div>
  );
};
