import { useCallback, useEffect, useRef, useState } from 'react';

const TARGET_RATE = 16000;

function encodeWav(chunks: Float32Array[], sourceRate: number): Blob {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }

  // Downsample to 16 kHz mono
  const ratio = sourceRate / TARGET_RATE;
  const outLength = ratio > 1 ? Math.floor(merged.length / ratio) : merged.length;
  const samples = new Int16Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const src = ratio > 1 ? merged[Math.floor(i * ratio)] : merged[i];
    const clamped = Math.max(-1, Math.min(1, src || 0));
    samples[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  const rate = ratio > 1 ? TARGET_RATE : sourceRate;
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (pos: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(pos + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  new Int16Array(buffer, 44).set(samples);

  return new Blob([buffer], { type: 'audio/wav' });
}

export const isRecordingSupported = () =>
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof window !== 'undefined' &&
  !!(window.AudioContext || (window as any).webkitAudioContext) &&
  (window.location.protocol === 'https:' || window.location.hostname === 'localhost');

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<number | null>(null);

  const teardown = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    nodeRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    const ctx = ctxRef.current;
    nodeRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    ctxRef.current = null;
    setIsRecording(false);
    setSeconds(0);
    return ctx;
  }, []);

  useEffect(() => () => { teardown()?.close().catch(() => {}); }, [teardown]);

  const start = useCallback(async () => {
    if (isRecording) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    streamRef.current = stream;
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new Ctx();
    ctxRef.current = ctx;
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
    const source = ctx.createMediaStreamSource(stream);
    const node = ctx.createScriptProcessor(4096, 1, 1);
    chunksRef.current = [];
    node.onaudioprocess = (e) => {
      chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };
    source.connect(node);
    node.connect(ctx.destination);
    sourceRef.current = source;
    nodeRef.current = node;
    setIsRecording(true);
    setSeconds(0);
    timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
  }, [isRecording]);

  /** Stops recording and returns the recorded WAV (or null when nothing usable was captured). */
  const stop = useCallback(async (): Promise<Blob | null> => {
    const rate = ctxRef.current?.sampleRate ?? TARGET_RATE;
    const ctx = teardown();
    await ctx?.close().catch(() => {});
    const chunks = chunksRef.current;
    chunksRef.current = [];
    if (!chunks.length) return null;
    const blob = encodeWav(chunks, rate);
    return blob.size < 2048 ? null : blob;
  }, [teardown]);

  const cancel = useCallback(async () => {
    const ctx = teardown();
    await ctx?.close().catch(() => {});
    chunksRef.current = [];
  }, [teardown]);

  return { isRecording, seconds, start, stop, cancel };
}
