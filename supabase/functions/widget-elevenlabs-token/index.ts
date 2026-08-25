import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      console.error("ELEVENLABS_API_KEY missing");
      return json({ error: "Integração de voz não configurada." }, 500);
    }

    const body = await req.json().catch(() => null);
    const widgetId = typeof body?.widgetId === "string" ? body.widgetId : null;
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!widgetId || !uuidRe.test(widgetId)) {
      return json({ error: "Requisição inválida." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: widget, error } = await supabase
      .from("widgets")
      .select("is_active, conversation_mode, elevenlabs_agent_id")
      .eq("id", widgetId)
      .maybeSingle();

    if (error) {
      console.error("widget lookup failed", error);
      return json({ error: "Erro interno." }, 500);
    }
    if (!widget || !widget.is_active) {
      return json({ error: "Widget indisponível." }, 404);
    }
    if (widget.conversation_mode !== "elevenlabs_agent") {
      return json({ error: "Este widget não usa agente de voz." }, 400);
    }
    const agentId = (widget.elevenlabs_agent_id ?? "").trim();
    if (!agentId) {
      return json({ error: "Agente de voz não configurado neste widget." }, 400);
    }

    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { "xi-api-key": apiKey } },
    );

    const text = await upstream.text();
    if (!upstream.ok) {
      console.error(`ElevenLabs token failed [${upstream.status}]: ${text}`);
      return json({ error: "Falha ao autorizar o agente de voz.", status: upstream.status, details: text }, upstream.status);
    }

    let parsed: { token?: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("ElevenLabs token: invalid JSON", text);
      return json({ error: "Resposta inválida do provedor de voz." }, 502);
    }
    if (!parsed.token) {
      console.error("ElevenLabs token: no token in response", text);
      return json({ error: "Provedor de voz não retornou token." }, 502);
    }

    return json({ token: parsed.token, agentId });
  } catch (e) {
    console.error("widget-elevenlabs-token error", e);
    return json({ error: "Erro interno." }, 500);
  }
});
