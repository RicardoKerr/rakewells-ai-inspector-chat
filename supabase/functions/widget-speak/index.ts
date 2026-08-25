const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VOICES = ["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.error("LOVABLE_API_KEY missing");
    return json({ error: "Voz não configurada." }, 500);
  }

  try {
    const body = await req.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const voice = typeof body?.voice === "string" && VOICES.includes(body.voice) ? body.voice : "alloy";
    if (!text) return json({ error: "Texto obrigatório." }, 400);
    // Chunking is handled client-side; keep a hard safety bound per request.
    const input = text.slice(0, 3000);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini-tts",
        input,
        voice,
        stream_format: "sse",
        response_format: "pcm",
      }),
    });

    if (!response.ok || !response.body) {
      const raw = await response.text().catch(() => "");
      console.error(`tts failed [${response.status}]: ${raw}`);
      let message = "Não foi possível gerar a voz.";
      if (response.status === 402) message = "Créditos de IA esgotados. Adicione créditos para usar a voz.";
      else if (response.status === 429) message = "Muitas requisições de voz. Aguarde alguns segundos.";
      else if (response.status === 403) message = "Uso de IA bloqueado nas configurações da workspace.";
      return json({ error: message, status: response.status, details: raw }, response.status);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("widget-speak error", e);
    return json({ error: "Erro interno na geração de voz." }, 500);
  }
});
