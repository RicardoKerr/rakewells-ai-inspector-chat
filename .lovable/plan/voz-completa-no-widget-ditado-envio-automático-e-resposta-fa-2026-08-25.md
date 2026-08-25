# Voz completa no widget (ditado, envio automático e resposta falada)

Hoje o microfone usa a API de voz do próprio navegador: ele só transcreve a fala para a caixa de texto e depende de Chrome/Edge, HTTPS e permissão de microfone. Vamos trocar por uma pipeline de voz própria, com transcrição no servidor e resposta falada.

## O que muda para quem usa o widget

1. **Botão de microfone grava o áudio** (aparece um indicador "gravando" com contador e botão para parar/cancelar).
2. Ao parar, o áudio vai para o servidor, é **transcrito por IA** e aparece na conversa como mensagem do usuário.
3. Com "envio automático" ligado, a mensagem transcrita **é enviada na hora**; desligado, ela fica no campo de texto para revisão (modo ditado atual).
4. A resposta do bot pode ser **falada automaticamente** (voz gerada por IA), com botão de play/stop em cada mensagem e um botão para silenciar a voz.
5. Se o navegador não permitir gravação, o botão de microfone aparece **desativado com aviso explicativo** — sem erro surpresa no clique.

## Novas opções no editor do widget

Na seção "Funcionalidades", ao ligar Voz aparecem sub-opções:

- Modo da voz: **Ditado** (revisar antes de enviar) ou **Enviar automaticamente**.
- **Resposta falada do bot**: ligado/desligado.
- **Voz do bot**: seleção entre as vozes disponíveis.

Essas opções ficam salvas junto com o widget e valem para todos os embeds (iframe e script).

## Requisitos para funcionar no teste

- Página em HTTPS (a preview e o link publicado já são) e permissão de microfone concedida.
- Nos embeds, o iframe já pede `microphone` — nada a fazer no site do cliente.
- Para receber resposta do bot, o widget precisa de uma **URL de webhook preenchida** (no seu widget atual ela está vazia) ou o modo de conexão apropriado. A voz transcreve mesmo sem webhook, mas não haverá resposta.
- Transcrição e voz consomem créditos de IA da workspace.

## Detalhes técnicos

**Banco**
- Migração adicionando ao `widgets`: `voice_auto_send` (bool), `voice_reply_enabled` (bool), `voice_name` (text, default `alloy`). Sem novas tabelas nem mudança de políticas.

**Edge functions (novas, públicas como a `widget-chat`)**
- `widget-transcribe`: recebe áudio (multipart), valida tamanho/MIME, chama `POST https://ai.gateway.lovable.dev/v1/audio/transcriptions` com `openai/gpt-4o-transcribe` e devolve o texto. Erros do gateway (400/402/429) são repassados com status e mensagem.
- `widget-speak`: recebe texto + voz, chama `POST /v1/audio/speech` com `openai/gpt-4o-mini-tts`, `stream_format: "sse"`, `response_format: "pcm"` e repassa o stream sem bufferizar. Texto longo é dividido em blocos por frase.
- Sem timeouts artificiais nas chamadas ao gateway.

**Frontend**
- Novo hook `useVoiceRecorder`: captura PCM via Web Audio, codifica WAV 16 kHz mono, valida gravação vazia (evita 400) e não usa fatias de `MediaRecorder`.
- Novo hook `useSpeech`: toca o stream PCM via `AudioContext` (resume antes de agendar), com stop/mute.
- `useSpeechRecognition` (Web Speech API) é removido do fluxo; `ChatInput` passa a expor gravar/parar/cancelar e o estado desabilitado com tooltip quando `navigator.mediaDevices` não existe.
- `ChatWidget` orquestra: gravar → transcrever → (auto-send ou preencher input) → resposta do bot → falar se habilitado. Vale para os dois modos de render (flutuante e `embedded`).
- `WidgetEditor` ganha os novos campos e os inclui no save e na pré-visualização.
