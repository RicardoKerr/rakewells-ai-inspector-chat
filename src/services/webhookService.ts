export const WEBHOOK_URL = 'https://n8n.rakewells.com/webhook-test/8e138917-eba3-4eb4-8fef-384ed3e69bd8';

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

export const sendToWebhook = async (sessionId: string, messageData: WebhookMessageData): Promise<WebhookResponse> => {
  console.log('Sending to webhook:', messageData);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 segundos

  try {
    const serverResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
        if ('audio' in parsed) {
          responses.push({ audio: parsed.audio });
        }
        if ('text' in parsed) {
          responses.push({ text: parsed.text });
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
