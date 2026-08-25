# Plano: Backend de conversação com ElevenLabs Conversational AI Agent

## Resumo
Substituir o fluxo atual de chat (webhook n8n + transcrição OpenAI + TTS OpenAI) por um agente de conversa completo do ElevenLabs. O widget passa a se conectar via WebRTC ao agente configurado no ElevenLabs; todo STT, LLM e TTS acontece no lado do ElevenLabs, e o widget exibe a transcrição do usuário e a resposta textual do agente.

## Escopo
1. Conectar a conta ElevenLabs ao projeto via Standard Connector.
2. Adicionar configuração por widget para armazenar o `elevenlabs_agent_id`.
3. Criar Edge Function `widget-elevenlabs-token` que gera token de conversação WebRTC usando a API key sincronizada.
4. Instalar e integrar o SDK React do ElevenLabs (`@elevenlabs/react`) no `ChatWidget`.
5. Adicionar modo de operação por widget: `webhook` (atual) ou `elevenlabs_agent`.
6. Atualizar o editor de widgets para configurar o agente ElevenLabs.
7. Atualizar a view `public_widgets` para expor as novas colunas sem expor dados sensíveis.
8. Testar end-to-end: geração de token, conexão WebRTC, transcrição, resposta e TTS.

## Detalhamento técnico

### 1. Conector ElevenLabs
- Usar `standard_connectors--connect` com `connector_id: "elevenlabs"`.
- Isso sincroniza `ELEVENLABS_API_KEY` no ambiente das Edge Functions.
- A API key é lida com `Deno.env.get("ELEVENLABS_API_KEY")` apenas no servidor.

### 2. Schema do banco
Adicionar à tabela `public.widgets`:
- `elevenlabs_agent_id` (TEXT, nullable) — ID do agente no ElevenLabs.
- `conversation_mode` (TEXT, NOT NULL DEFAULT 'webhook') — valores: `webhook`, `elevenlabs_agent`.

Atualizar a view `public_widgets` para incluir `conversation_mode` e `elevenlabs_agent_id` (não sensível, necessário para o embed saber qual modo usar).

### 3. Edge Function `widget-elevenlabs-token`
Criar `supabase/functions/widget-elevenlabs-token/index.ts`:
- Recebe `widgetId` via POST.
- Busca o widget no banco (usando service role) e valida `is_active` e `elevenlabs_agent_id`.
- Chama `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id={agentId}` com `xi-api-key`.
- Retorna `{ token }` para o cliente iniciar a sessão WebRTC.
- Configurar `verify_jwt = false` em `supabase/config.toml` para permitir acesso público.

### 4. Integração no frontend
- Instalar `npm install @elevenlabs/react`.
- Criar hook `src/hooks/useElevenLabsConversation.ts` que:
  - Recebe `widgetId`, `enabled`, `onTranscript`, `onAgentResponse`.
  - Chama a Edge Function para obter o token.
  - Usa `useConversation` do ElevenLabs com `connectionType: "webrtc"`.
  - Expõe `startSession`, `endSession`, `isSpeaking`, `status`, `sendUserMessage`.
- Refatorar `ChatWidget.tsx`:
  - Quando `conversation_mode === 'elevenlabs_agent'`, usar o hook do ElevenLabs.
  - Mostrar botão de "Iniciar conversa por voz" / "Encerrar".
  - Renderizar no histórico as mensagens do tipo `user_transcript` e `agent_response`.
  - Manter envio de texto possível via `sendUserMessage`.
  - Preservar visual (avatar, cor, título) e as funcionalidades de localização/arquivos como opcionais complementares.

### 5. Editor de widgets
Em `src/pages/WidgetEditor.tsx`:
- No campo "Modo", adicionar opção "ElevenLabs Conversational Agent".
- Quando selecionado, mostrar campo "ElevenLabs Agent ID".
- Ocultar campos de webhook_url/system_prompt quando irrelevantes.
- Ajustar a pré-visualização para respeitar o novo modo.

### 6. Segurança
- A API key do ElevenLabs nunca é exposta ao navegador.
- A Edge Function valida que o widget existe e está ativo antes de gerar o token.
- A view `public_widgets` continua sem expor `webhook_url`, `system_prompt` ou `elevenlabs_api_key`.

### 7. Testes
- Verificar geração de token chamando a Edge Function com `supabase--curl_edge_functions`.
- Verificar conexão WebRTC e eventos de transcrição/resposta no preview.
- Testar fallback: se o modo ElevenLabs estiver ativo mas `agent_id` estiver vazio, mostrar erro no widget.

## Notas
- Os recursos atuais de voz OpenAI (`widget-transcribe`, `widget-speak`, `voice_auto_send`, `voice_reply_enabled`, `voice_name`) podem permanecer como fallback quando o modo for `webhook`, mas não serão usados no modo `elevenlabs_agent`.
- A funcionalidade de localização e arquivos continua opcional; no modo ElevenLabs, textos/áudio são trocados via agente, e localização/arquivos ainda podem ser enviados como complemento quando implementados.
- Para o agente ElevenLabs funcionar, o agente deve ser criado e configurado previamente no dashboard do ElevenLabs, e seu `agent_id` copiado para o campo do widget.
