export const WEBHOOK_URL = 'https://n8nwebhook.rakewells.com/webhook/8e138917-eba3-4eb4-8fef-384ed3e69bd8';

export interface WebhookMessageData {
  type: string;
  content: string;
  metadata: any;
}

export const sendToWebhook = async (sessionId: string, messageData: WebhookMessageData) => {
  console.log('Sending to webhook:', messageData);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos

  try {
    const response = await fetch(WEBHOOK_URL, {
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

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseText = await response.text();
    console.log('Raw response text:', responseText);

    if (!responseText || responseText.trim() === '') {
      console.error('Empty response received from server');
      throw new Error('EMPTY_RESPONSE');
    }

    let botResponse;
    try {
      botResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      if (!responseText.trim()) {
        throw new Error('EMPTY_RESPONSE');
      }
      throw new Error('INVALID_JSON');
    }

    console.log('Parsed bot response:', botResponse);
    
    let messageText = '';
    
    if (Array.isArray(botResponse)) {
      console.log('Response is array, length:', botResponse.length);
      if (botResponse.length > 0) {
        const firstItem = botResponse[0];
        console.log('First item:', firstItem);
        
        if (firstItem && typeof firstItem === 'object' && firstItem.text) {
          messageText = firstItem.text;
          console.log('Found text in first item:', messageText);
        } else {
          console.warn('First item does not have text property');
        }
      } else {
        console.warn('Response array is empty');
        throw new Error('EMPTY_RESPONSE');
      }
    } else if (botResponse && typeof botResponse === 'object') {
      if (botResponse.text) {
        messageText = botResponse.text;
        console.log('Found text in object response:', messageText);
      } else if (botResponse.content) {
        messageText = botResponse.content;
        console.log('Found content in object response:', messageText);
      }
    } else if (typeof botResponse === 'string') {
      messageText = botResponse;
      console.log('Response is plain string:', messageText);
    }

    if (!messageText || !messageText.trim()) {
      console.error('No valid message text found in response');
      throw new Error('EMPTY_RESPONSE');
    }

    return messageText;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};
