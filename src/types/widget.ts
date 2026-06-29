export interface WidgetFeatures {
  voice: boolean;
  location: boolean;
  files: boolean;
  camera: boolean;
}

export interface Widget {
  id: string;
  name: string;
  bot_name: string;
  header_title: string;
  avatar_url: string | null;
  primary_color: string;
  welcome_message: string;
  webhook_url: string | null;
  knowledge_mode: string;
  system_prompt: string | null;
  features: WidgetFeatures;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}