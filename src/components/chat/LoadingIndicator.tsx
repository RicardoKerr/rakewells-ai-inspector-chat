
import React from 'react';

export const LoadingIndicator: React.FC = () => {
  return (
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
  );
};
