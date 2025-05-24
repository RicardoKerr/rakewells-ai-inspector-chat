
import { Message } from '@/types/chat';

export const validateFile = (file: File): string | null => {
  if (file.size > 10 * 1024 * 1024) {
    return "O arquivo deve ter no máximo 10MB.";
  }
  return null;
};

export const createFileMessage = (file: File, type: 'file' | 'image' | 'camera'): Message => {
  const fileUrl = URL.createObjectURL(file);
  
  return {
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
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Remove data:mime;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
