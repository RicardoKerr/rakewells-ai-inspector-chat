
export interface Message {
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
  audioData?: string; // Armazena o áudio em base64
}
