import React from 'react';

export const LoadingIndicator: React.FC = () => {
  return (
    <div className="flex flex-col items-start space-y-2 p-3 w-fit max-w-[80%]">
      <div className="flex items-start space-x-2">
        <img
          src="/lovable-uploads/5e42413a-248c-43ce-8d29-c53b92e21588.png"
          alt="Inspetora"
          className="w-8 h-8 rounded-full object-cover mt-1"
        />
        <div>
          <div className="p-3 rounded-lg bg-gray-100 text-gray-800">
            <div className="flex space-x-2 items-center">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="text-sm text-gray-500">Pensando...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
