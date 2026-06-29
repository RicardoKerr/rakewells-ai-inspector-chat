
# Plano: Humanito Builder — Plataforma de Criação de Widgets de Chatbot

Transformar o projeto atual (widget único hardcoded) em um **builder admin** que cria, configura e distribui múltiplos widgets de chatbot, cada um com URL/script próprio para incorporação em sites externos.

## Visão geral da arquitetura

```text
┌─────────────────────────────────────────────────────────┐
│  PAINEL ADMIN (autenticado)                             │
│  /login  /dashboard  /widgets  /widgets/:id  /analytics │
└────────────────┬────────────────────────────────────────┘
                 │ CRUD
                 ▼
┌─────────────────────────────────────────────────────────┐
│  LOVABLE CLOUD (Supabase)                               │
│  - tabela widgets (config visual, webhook, features)    │
│  - tabela knowledge_base (RAG/QnA por widget)           │
│  - tabela conversations + messages (analytics)          │
│  - tabela admins + user_roles                           │
│  - Edge Function: chat-proxy (recebe msg, busca config, │
│    chama webhook n8n / faz RAG, registra conversa)      │
└────────────────┬────────────────────────────────────────┘
                 │ público (sem auth)
                 ▼
┌─────────────────────────────────────────────────────────┐
│  RUNTIME PÚBLICO DO WIDGET                              │
│  /embed/:widgetId  → página standalone (iframe)         │
│  /widget.js?id=:widgetId → script flutuante injetável   │
└─────────────────────────────────────────────────────────┘
```

## Etapas de implementação

### 1. Ativar Lovable Cloud + Auth do Admin
- Habilitar Lovable Cloud (banco, auth, edge functions).
- Login por email/senha apenas para admin.
- Tabela `user_roles` com enum (`admin`) + função `has_role` (security definer).
- Primeiro usuário cadastrado vira admin (via trigger ou setup manual).
- Rotas protegidas: `/admin/*` exige sessão + role admin.

### 2. Modelagem de dados
- `widgets`: id, name, slug, bot_name, avatar_url, primary_color, header_title, welcome_message, webhook_url, features (jsonb: voice, location, files, camera), system_prompt, knowledge_mode (`webhook` | `rag` | `qna`), created_at.
- `knowledge_items`: id, widget_id, type (`qna` | `document` | `text`), question, answer, content, embedding (vector) — para RAG/QnA.
- `conversations`: id, widget_id, session_id, started_at, user_agent, referrer.
- `messages`: id, conversation_id, sender, content, type, created_at.
- RLS: admin vê tudo; runtime público lê apenas `widgets` (campos não-sensíveis) e insere em `conversations`/`messages` via edge function (service role).
- GRANTs explícitos para `authenticated` e `service_role`.

### 3. Painel Admin (builder)
- `/admin/dashboard`: lista de widgets com métricas resumo (conversas hoje, total).
- `/admin/widgets/new` e `/admin/widgets/:id/edit`: formulário com abas:
  - **Identidade**: nome, avatar (upload), cor primária, título do header, mensagem de boas-vindas.
  - **Inteligência**: modo (webhook n8n / RAG / QnA), URL do webhook OU base de conhecimento (editor de QnA + upload de documentos com embeddings via Lovable AI Gateway).
  - **Funcionalidades**: switches para voz, localização, arquivos, câmera.
  - **Embed**: gera e copia o snippet (script + iframe) com o ID do widget.
- `/admin/widgets/:id/analytics`: gráfico de conversas/dia, total de mensagens, sessões únicas, lista de conversas com replay.

### 4. Runtime público do widget
- Refatorar `ChatWidget` atual para receber config via props (não hardcoded).
- Rota `/embed/:widgetId`: renderiza o widget standalone (para iframe).
- Arquivo público `widget.js` (servido por edge function ou estático): script que injeta um iframe flutuante apontando para `/embed/:widgetId` no canto do site do cliente — resolve CORS e isolamento.
- Edge function `chat-proxy`: recebe `{widgetId, sessionId, message}`, carrega config do widget, roteia para webhook n8n OU executa RAG (embeddings + Lovable AI Gateway com Gemini), registra mensagem em `conversations`/`messages`, retorna resposta.

### 5. Knowledge Base / RAG / QnA
- QnA: matching simples por similaridade de embedding sobre `knowledge_items` tipo qna.
- RAG: upload de documento → chunking → embeddings (`google/gemini-embedding-001`) → pgvector → busca por similaridade → contexto no prompt → resposta via `google/gemini-3-flash-preview`.
- Modo webhook: mantém comportamento atual (encaminha para n8n).

### 6. Analytics
- Edge function registra cada mensagem com timestamp, session_id, user_agent.
- Página de analytics: total conversas, mensagens/dia (gráfico), top widgets, tempo médio de sessão, lista navegável de transcrições.

### 7. Migração do widget atual
- Index atual vira página de marketing/landing pública.
- Criar 1 widget seed no banco com a configuração atual (Humanito) para preservar funcionamento.

## Detalhes técnicos

- **Stack**: React + Vite (existente), Lovable Cloud (Supabase), Lovable AI Gateway para embeddings/LLM, pgvector para RAG.
- **Embed script**: gera `<script src="https://[app].lovable.app/widget.js" data-widget-id="abc123"></script>` que injeta iframe — funciona em qualquer site sem dor de CORS.
- **Iframe direto**: `<iframe src="https://[app].lovable.app/embed/abc123" />` para quem prefere controle total.
- **Segurança**: webhook URL, system_prompt e knowledge nunca expostos ao cliente; tudo passa pela edge function.
- **CORS**: edge function `chat-proxy` libera `*` (necessário para widgets em domínios de terceiros).

## Escopo desta entrega (incremental sugerido)

Como a mudança é grande, sugiro entregar em **3 fases**. Esta primeira fase cobre o essencial:

**Fase 1 (este plano)**: Cloud + auth admin + CRUD de widgets (identidade visual, webhook, features, welcome) + rota `/embed/:id` + script de embed + 1 widget seed migrado.

**Fase 2 (próximo plano)**: Knowledge base (RAG/QnA), embeddings, edge function de chat com fallback.

**Fase 3 (próximo plano)**: Dashboard de analytics com gráficos e replay de conversas.

Confirma que posso seguir com a **Fase 1** assim?
