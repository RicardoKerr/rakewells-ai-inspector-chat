
import React from 'react';
import { Message } from '@/types/chat';

interface MessageBubbleProps {
  message: Message;
  formatTime: (date: Date) => string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, formatTime }) => {
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
            )}
            <p className="text-sm">{message.text}</p>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {formatTime(message.timestamp)}
          </p>
        </div>
      </div>
    </div>
  );
};
