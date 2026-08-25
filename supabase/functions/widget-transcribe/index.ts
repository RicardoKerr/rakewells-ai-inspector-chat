const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED = ["audio/wav", "audio/wave", "audio/x-wav", "audio/mpeg", "audio/mp3", "audio/webm", "audio/mp4"];

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
    return json({ error: "Transcrição não configurada." }, 500);
  }

  try {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!form || !(file instanceof File)) {
      return json({ error: "Envie o áudio no campo 'file' (multipart/form-data)." }, 400);
    }
    if (file.size === 0 || file.size < 2048) {
      return json({ error: "Gravação vazia ou muito curta. Tente novamente." }, 400);
    }
    if (file.size > MAX_BYTES) {
      return json({ error: "Áudio muito grande. Grave um trecho mais curto." }, 400);
    }
    const mime = (file.type || "").split(";")[0].toLowerCase();
    if (mime && !ALLOWED.includes(mime)) {
      return json({ error: `Formato de áudio não suportado: ${mime}` }, 400);
    }

    const ext = mime === "audio/mp4" ? "mp4" : mime === "audio/webm" ? "webm"
      : mime === "audio/mpeg" || mime === "audio/mp3" ? "mp3" : "wav";

    const upstreamForm = new FormData();
    upstreamForm.append("model", "openai/gpt-4o-transcribe");
    upstreamForm.append("file", file, `recording.${ext}`);
    const language = form.get("language");
    if (typeof language === "string" && /^[a-z]{2}$/.test(language)) {
      upstreamForm.append("language", language);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstreamForm,
    });

    const raw = await response.text();
    if (!response.ok) {
      console.error(`transcription failed [${response.status}]: ${raw}`);
      let message = "Não foi possível transcrever o áudio.";
      if (response.status === 402) message = "Créditos de IA esgotados. Adicione créditos para usar a voz.";
      else if (response.status === 429) message = "Muitas requisições de voz. Aguarde alguns segundos.";
      else if (response.status === 403) message = "Uso de IA bloqueado nas configurações da workspace.";
      return json({ error: message, status: response.status, details: raw }, response.status);
    }

    let text = "";
    try {
      text = JSON.parse(raw)?.text ?? "";
    } catch {
      text = raw;
    }
    if (!text.trim()) return json({ error: "Não entendi o áudio. Tente falar novamente." }, 422);

    return json({ text: text.trim() });
  } catch (e) {
    console.error("widget-transcribe error", e);
    return json({ error: "Erro interno na transcrição." }, 500);
  }
});
