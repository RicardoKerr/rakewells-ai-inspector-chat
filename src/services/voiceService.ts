const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/** Sends a recorded WAV blob to the transcription backend and returns the recognized text. */
export async function transcribeAudio(blob: Blob, language = 'pt'): Promise<string> {
  const form = new FormData();
  form.append('file', blob, 'recording.wav');
  form.append('language', language);

  const res = await fetch(`${SUPABASE_URL}/functions/v1/widget-transcribe`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PUBLISHABLE_KEY}`, apikey: PUBLISHABLE_KEY },
    body: form,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Falha na transcrição (${res.status})`);
  const text = (data?.text || '').trim();
  if (!text) throw new Error('Não entendi o áudio. Tente novamente.');
  return text;
}
