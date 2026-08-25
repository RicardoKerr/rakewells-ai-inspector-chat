import { useCallback, useEffect, useRef, useState } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const SAMPLE_RATE = 24000;

/** Splits text into chunks that stay well under the TTS input limit, preferring sentence breaks. */
export function chunkForTTS(text: string, maxWords = 200): string[] {
  const count = (s: string) => (s.match(/\S+/g) ?? []).length;
  const sentences = text.match(/[^.!?\n]+[.!?\n]*\s*/g) ?? [text];
  const chunks: string[] = [];
  let current = '';
  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = '';
  };
  for (const sentence of sentences) {
    if (count(sentence) > maxWords) {
      flush();
      const words = sentence.match(/\S+/g) ?? [];
      for (let i = 0; i < words.length; i += maxWords) chunks.push(words.slice(i, i + maxWords).join(' '));
      continue;
    }
    if (current && count(current) + count(sentence) > maxWords) flush();
    current += sentence;
  }
  flush();
  return chunks;
}

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const playheadRef = useRef(0);
  const runIdRef = useRef(0);

  const stop = useCallback(() => {
    runIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    sourcesRef.current.forEach((s) => { try { s.stop(); } catch { /* already stopped */ } });
    sourcesRef.current = [];
    playheadRef.current = 0;
    setIsSpeaking(false);
  }, []);

  useEffect(() => () => {
    stop();
    ctxRef.current?.close().catch(() => {});
  }, [stop]);

  const speak = useCallback(async (text: string, voice = 'alloy') => {
    const clean = (text || '').replace(/[*_#`>]/g, '').trim();
    if (!clean || isMuted) return;

    stop();
    const runId = ++runIdRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    setIsSpeaking(true);

    try {
      if (!ctxRef.current || ctxRef.current.state === 'closed') {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        ctxRef.current = new Ctx({ sampleRate: SAMPLE_RATE });
      }
      const ctx = ctxRef.current!;
      if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
      playheadRef.current = 0;
      let pending = new Uint8Array(0);

      const playChunk = (incoming: Uint8Array) => {
        if (runIdRef.current !== runId) return;
        const bytes = new Uint8Array(pending.length + incoming.length);
        bytes.set(pending);
        bytes.set(incoming, pending.length);
        const usable = bytes.length - (bytes.length % 2);
        pending = bytes.slice(usable);
        if (usable === 0) return;
        const samples = new Int16Array(bytes.buffer, 0, usable / 2);
        const floats = Float32Array.from(samples, (s) => s / 32768);
        const buffer = ctx.createBuffer(1, floats.length, SAMPLE_RATE);
        buffer.copyToChannel(floats, 0);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        if (playheadRef.current === 0) playheadRef.current = ctx.currentTime + 0.05;
        else playheadRef.current = Math.max(playheadRef.current, ctx.currentTime);
        source.start(playheadRef.current);
        playheadRef.current += buffer.duration;
        sourcesRef.current.push(source);
      };

      for (const part of chunkForTTS(clean)) {
        if (runIdRef.current !== runId) return;
        const res = await fetch(`${SUPABASE_URL}/functions/v1/widget-speak`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PUBLISHABLE_KEY}`, apikey: PUBLISHABLE_KEY },
          body: JSON.stringify({ text: part, voice }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const detail = await res.json().catch(() => null);
          throw new Error(detail?.error || `Falha na voz (${res.status})`);
        }
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffered = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffered += value;
          const lines = buffered.split('\n');
          buffered = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const payloadText = line.slice(5).trim();
            if (!payloadText || payloadText === '[DONE]') continue;
            let payload: any;
            try { payload = JSON.parse(payloadText); } catch { continue; }
            if (payload.type !== 'speech.audio.delta' || !payload.audio) continue;
            const binary = atob(payload.audio);
            const arr = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
            playChunk(arr);
          }
        }
      }

      // Let the scheduled audio finish before clearing the speaking state.
      const remaining = Math.max(0, playheadRef.current - (ctxRef.current?.currentTime ?? 0));
      window.setTimeout(() => {
        if (runIdRef.current === runId) setIsSpeaking(false);
      }, remaining * 1000 + 200);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('speak failed', err);
        if (runIdRef.current === runId) setIsSpeaking(false);
        throw err;
      }
      if (runIdRef.current === runId) setIsSpeaking(false);
    }
  }, [isMuted, stop]);

  const toggleMute = useCallback(() => {
    setIsMuted((m) => {
      if (!m) stop();
      return !m;
    });
  }, [stop]);

  return { speak, stop, isSpeaking, isMuted, toggleMute };
}
