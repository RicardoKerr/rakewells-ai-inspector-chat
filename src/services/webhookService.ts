export const DEFAULT_WEBHOOK_URL = 'https://n8nwebhook.rakewells.com/webhook/8e138917-eba3-4eb4-8fef-384ed3e69bd8';

export interface WebhookMessageData {
  type: string;
  content: string;
  metadata: any;
}

interface AudioResponse {
  audio: string;
}

interface TextResponse {
  text: string;
}

interface BotResponse {
  text?: string;
  content?: string;
  audio?: string;
}

export type WebhookResponse = (TextResponse | AudioResponse)[];

export const sendToWebhook = async (
  sessionId: string,
  messageData: WebhookMessageData,
  webhookUrl: string = DEFAULT_WEBHOOK_URL,
  widgetId?: string
): Promise<WebhookResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 segundos

  // Quando o widget está publicado, a chamada passa pelo backend, que guarda
  // o endereço do webhook em segredo (nunca exposto ao navegador).
  const useProxy = Boolean(widgetId);
  const endpoint = useProxy
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/widget-chat`
    : webhookUrl;

  try {
    const serverResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(useProxy ? { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } : {}),
      },
      body: JSON.stringify({
        ...(useProxy ? { widgetId } : {}),
        sessionId,
        type: messageData.type,
        content: messageData.content,
        metadata: messageData.metadata || null
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log('Response status:', serverResponse.status);
    console.log('Response headers:', serverResponse.headers);

    if (!serverResponse.ok) {
      throw new Error(`HTTP error! status: ${serverResponse.status}`);
    }

    const responseText = await serverResponse.text();
    console.log('Raw response text:', responseText);

    if (!responseText || responseText.trim() === '') {
      console.error('Empty response received from server');
      throw new Error('EMPTY_RESPONSE');
    }

    let responses: WebhookResponse = [];
    
    try {
      const parsed = JSON.parse(responseText);
      console.log('Parsed JSON:', parsed);
      
      if (Array.isArray(parsed)) {
        console.log('Response is array, length:', parsed.length);
        
        responses = parsed.map(item => {
          if ('audio' in item) {
            console.log('Found audio response');
            return { audio: item.audio };
          } else if ('text' in item) {
            console.log('Found text response:', item.text);
            return { text: item.text };
          } else if (typeof item === 'string') {
            console.log('Found string response:', item);
            return { text: item };
          }
          throw new Error('Invalid response item format');
        }).filter(item => item !== undefined) as WebhookResponse;
          } else if (parsed && typeof parsed === 'object') {
        // Verifica se é um objeto com múltiplas propriedades
        if ('audio' in parsed && 'text' in parsed) {
          // Se tem ambos, cria duas respostas separadas
          responses.push({ text: parsed.text });
          responses.push({ audio: parsed.audio });
        } else if ('audio' in parsed) {
          responses.push({ audio: parsed.audio });
        } else if ('text' in parsed) {
          responses.push({ text: parsed.text });
        } else if ('content' in parsed) {
          responses.push({ text: parsed.content });
        }
      } else if (typeof parsed === 'string') {
        responses.push({ text: parsed });
      }
      
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      if (!responseText.trim()) {
        throw new Error('EMPTY_RESPONSE');
      }
      throw new Error('INVALID_JSON');
    }

    if (responses.length === 0) {
      console.error('No valid responses found');
      throw new Error('EMPTY_RESPONSE');
    }

    console.log('Processed responses:', responses);
    return responses;
    
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};
