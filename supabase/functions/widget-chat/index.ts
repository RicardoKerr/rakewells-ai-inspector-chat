import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_WEBHOOK_URL =
  "https://n8nwebhook.rakewells.com/webhook/8e138917-eba3-4eb4-8fef-384ed3e69bd8";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    const widgetId = typeof body?.widgetId === "string" ? body.widgetId : null;
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.slice(0, 200) : null;
    const type = typeof body?.type === "string" ? body.type.slice(0, 40) : "text";
    const content = typeof body?.content === "string" ? body.content.slice(0, 20000) : "";
    const metadata = body?.metadata ?? null;

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!widgetId || !uuidRe.test(widgetId) || !sessionId || !content) {
      return new Response(JSON.stringify({ error: "Requisição inválida." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: widget, error } = await supabase
      .from("widgets")
      .select("webhook_url, is_active")
      .eq("id", widgetId)
      .maybeSingle();

    if (error) {
      console.error("widget lookup failed", error);
      return new Response(JSON.stringify({ error: "Erro interno." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!widget || !widget.is_active) {
      return new Response(JSON.stringify({ error: "Widget indisponível." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const target = widget.webhook_url || DEFAULT_WEBHOOK_URL;

    const upstream = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, type, content, metadata }),
      signal: AbortSignal.timeout(120000),
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      console.error("upstream error", upstream.status);
      return new Response(JSON.stringify({ error: "Falha ao contatar o assistente." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(text || "[]", {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("widget-chat error", e);
    return new Response(JSON.stringify({ error: "Erro interno." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
