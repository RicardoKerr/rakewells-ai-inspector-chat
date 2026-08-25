import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Copy, Upload, Image as ImageIcon } from 'lucide-react';
import ChatWidget from '@/components/ChatWidget';
import type { Widget } from '@/types/widget';

const DEFAULTS: Partial<Widget> = {
  name: '',
  bot_name: 'Assistente',
  header_title: 'Chat',
  avatar_url: '',
  primary_color: '#2563eb',
  welcome_message: 'Olá! Como posso ajudar?',
  webhook_url: '',
  knowledge_mode: 'webhook',
  system_prompt: '',
  conversation_mode: 'webhook',
  elevenlabs_agent_id: '',
  features: { voice: true, location: true, files: true, camera: false },
  voice_auto_send: true,
  voice_reply_enabled: true,
  voice_name: 'alloy',
  is_active: true,
};

export default function WidgetEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState<any>(DEFAULTS);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function onAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Arquivo inválido', description: 'Escolha uma imagem.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await resizeToDataUrl(file, 256);
      set('avatar_url', dataUrl);
      toast({ title: 'Imagem carregada', description: 'Clique em Salvar para aplicar.' });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }


  useEffect(() => {
    if (!isNew && user && isAdmin) load();
  }, [id, user, isAdmin]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('widgets').select('*').eq('id', id).maybeSingle();
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else if (data) setForm(data);
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    try {
      const payload = { ...form, created_by: user?.id };
      if (isNew) {
        const { data, error } = await supabase.from('widgets').insert(payload).select().single();
        if (error) throw error;
        toast({ title: 'Widget criado' });
        navigate(`/admin/widgets/${data.id}`);
      } else {
        const { error } = await supabase.from('widgets').update(payload).eq('id', id);
        if (error) throw error;
        toast({ title: 'Salvo' });
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  function set<K extends string>(k: K, v: any) {
    setForm((f: any) => ({ ...f, [k]: v }));
  }
  function setFeature(k: string, v: boolean) {
    setForm((f: any) => ({ ...f, features: { ...f.features, [k]: v } }));
  }

  if (authLoading) return <div className="p-8">Carregando...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <div className="p-8">Acesso restrito.</div>;
  if (loading) return <div className="p-8">Carregando widget...</div>;

  const origin = window.location.origin;
  const embedUrl = `${origin}/embed/${id}`;
  const iframeCode = `<iframe src="${embedUrl}" style="border:0;width:400px;height:600px" allow="microphone;geolocation"></iframe>`;
  const scriptCode = `<script src="${origin}/widget.js" data-widget-id="${id}"></script>`;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
            <h1 className="text-xl font-bold">{isNew ? 'Novo widget' : 'Editar widget'}</h1>
          </div>
          <Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Section title="Identidade">
            <Field label="Nome interno"><Input value={form.name || ''} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Nome do bot"><Input value={form.bot_name || ''} onChange={(e) => set('bot_name', e.target.value)} /></Field>
            <Field label="Título do header"><Input value={form.header_title || ''} onChange={(e) => set('header_title', e.target.value)} /></Field>
            <Field label="Avatar do bot">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-muted overflow-hidden flex items-center justify-center border shrink-0">
                  {form.avatar_url ? (
                    <img src={form.avatar_url} alt="Avatar do bot" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input id="avatar-file" type="file" accept="image/*" className="hidden" onChange={onAvatarFile} />
                  <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => document.getElementById('avatar-file')?.click()}>
                    <Upload className="h-4 w-4 mr-2" />{uploading ? 'Enviando...' : 'Enviar imagem'}
                  </Button>
                  {form.avatar_url && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => set('avatar_url', '')}>Remover</Button>
                  )}
                </div>
              </div>
            </Field>
            <Field label="Ou cole uma URL do avatar"><Input value={form.avatar_url?.startsWith('data:') ? '' : (form.avatar_url || '')} onChange={(e) => set('avatar_url', e.target.value)} placeholder="https://... ou /lovable-uploads/..." /></Field>

            <Field label="Cor primária"><Input type="color" value={form.primary_color || '#2563eb'} onChange={(e) => set('primary_color', e.target.value)} /></Field>
            <Field label="Mensagem de boas-vindas"><Textarea rows={3} value={form.welcome_message || ''} onChange={(e) => set('welcome_message', e.target.value)} /></Field>
          </Section>

          <Section title="Conexão com IA">
            <Field label="Backend de conversa">
              <select className="w-full border rounded h-10 px-3" value={form.conversation_mode || 'webhook'} onChange={(e) => set('conversation_mode', e.target.value)}>
                <option value="webhook">Webhook (n8n / API) + voz OpenAI</option>
                <option value="elevenlabs_agent">Agente de conversa ElevenLabs (voz completa)</option>
              </select>
            </Field>

            {form.conversation_mode === 'elevenlabs_agent' ? (
              <>
                <Field label="ElevenLabs Agent ID">
                  <Input value={form.elevenlabs_agent_id || ''} onChange={(e) => set('elevenlabs_agent_id', e.target.value)} placeholder="agent_xxxxxxxxxxxxxxxx" />
                </Field>
                <p className="text-xs text-gray-500">
                  Crie o agente no painel do ElevenLabs (Conversational AI), copie o Agent ID e cole acima.
                  Todo o pipeline de voz (escuta, LLM e fala) roda no ElevenLabs; o widget apenas exibe as transcrições.
                </p>
              </>
            ) : (
              <>
                <Field label="Modo de conhecimento">
                  <select className="w-full border rounded h-10 px-3" value={form.knowledge_mode} onChange={(e) => set('knowledge_mode', e.target.value)}>
                    <option value="webhook">Webhook (n8n / API)</option>
                    <option value="rag" disabled>RAG / Base de conhecimento (em breve)</option>
                    <option value="qna" disabled>Q&A (em breve)</option>
                  </select>
                </Field>
                <Field label="URL do webhook"><Input value={form.webhook_url || ''} onChange={(e) => set('webhook_url', e.target.value)} placeholder="https://..." /></Field>
                <Field label="System prompt (opcional)"><Textarea rows={3} value={form.system_prompt || ''} onChange={(e) => set('system_prompt', e.target.value)} /></Field>
              </>
            )}
          </Section>

          <Section title="Funcionalidades">
            {(['voice','location','files','camera'] as const).map((k) => (
              <div key={k} className="flex items-center justify-between py-2">
                <Label className="capitalize">{ {voice:'Voz',location:'Localização',files:'Arquivos',camera:'Câmera'}[k] }</Label>
                <Switch checked={!!form.features?.[k]} onCheckedChange={(v) => setFeature(k, v)} />
              </div>
            ))}
            {form.features?.voice && (
              <div className="pt-3 mt-2 border-t space-y-3">
                <p className="text-xs text-gray-500">
                  A voz usa transcrição no servidor: o visitante grava, o áudio é transcrito e enviado ao bot.
                  Requer HTTPS e permissão de microfone no navegador.
                </p>
                <div className="flex items-center justify-between">
                  <Label>Enviar automaticamente após falar</Label>
                  <Switch checked={!!form.voice_auto_send} onCheckedChange={(v) => set('voice_auto_send', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Resposta falada do bot</Label>
                  <Switch checked={!!form.voice_reply_enabled} onCheckedChange={(v) => set('voice_reply_enabled', v)} />
                </div>
                {form.voice_reply_enabled && (
                  <Field label="Voz do bot">
                    <select className="w-full border rounded h-10 px-3" value={form.voice_name || 'alloy'} onChange={(e) => set('voice_name', e.target.value)}>
                      {['alloy','echo','fable','onyx','nova','shimmer'].map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t mt-2">
              <Label>Widget ativo</Label>
              <Switch checked={!!form.is_active} onCheckedChange={(v) => set('is_active', v)} />
            </div>
          </Section>

          {!isNew && (
            <Section title="Distribuir">
              <Label className="text-xs text-gray-500">Iframe (mais isolado)</Label>
              <CodeBox value={iframeCode} />
              <Label className="text-xs text-gray-500 mt-3 block">Script flutuante (recomendado)</Label>
              <CodeBox value={scriptCode} />
              <Label className="text-xs text-gray-500 mt-3 block">URL direta</Label>
              <CodeBox value={embedUrl} />
            </Section>
          )}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <h3 className="text-sm font-semibold mb-2 text-gray-500">Pré-visualização</h3>
          <div className="w-full h-[600px] border rounded-lg overflow-hidden shadow-sm bg-white">
            <ChatWidget embedded config={{
              id: id || 'preview',
              botName: form.bot_name,
              headerTitle: form.header_title,
              avatarUrl: form.avatar_url,
              primaryColor: form.primary_color,
              welcomeMessage: form.welcome_message,
              webhookUrl: form.webhook_url,
              features: form.features,
              voiceAutoSend: form.voice_auto_send,
              voiceReplyEnabled: form.voice_reply_enabled,
              voiceName: form.voice_name,
            }} />
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border p-5 space-y-3">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-sm">{label}</Label>{children}</div>;
}
function CodeBox({ value }: { value: string }) {
  const { toast } = useToast();
  return (
    <div className="relative">
      <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap break-all">{value}</pre>
      <Button size="sm" variant="secondary" className="absolute top-2 right-2"
        onClick={() => { navigator.clipboard.writeText(value); toast({ title: 'Copiado!' }); }}>
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}
async function resizeToDataUrl(file: File, max: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível processar a imagem.');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL('image/webp', 0.9);
}
