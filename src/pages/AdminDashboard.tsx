import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, ExternalLink, LogOut } from 'lucide-react';
import type { Widget } from '@/types/widget';

export default function AdminDashboard() {
  const { user, isAdmin, loading } = useAuth();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [busy, setBusy] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => { if (user && isAdmin) load(); }, [user, isAdmin]);

  async function load() {
    setBusy(true);
    const { data, error } = await supabase.from('widgets').select('*').order('created_at', { ascending: false });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else setWidgets((data || []) as any);
    setBusy(false);
  }

  async function remove(id: string) {
    if (!confirm('Excluir este widget?')) return;
    const { error } = await supabase.from('widgets').delete().eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else load();
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/auth');
  }

  if (loading) return <div className="p-8">Carregando...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <div className="p-8">Acesso restrito a administradores.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Humanito Builder</h1>
            <p className="text-sm text-gray-500">Construtor de widgets de chatbot</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/admin/widgets/new')}><Plus className="h-4 w-4 mr-2" />Novo widget</Button>
            <Button variant="outline" onClick={signOut}><LogOut className="h-4 w-4 mr-2" />Sair</Button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        {busy ? (
          <p>Carregando widgets...</p>
        ) : widgets.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center border-2 border-dashed">
            <p className="text-gray-500 mb-4">Você ainda não criou nenhum widget.</p>
            <Button onClick={() => navigate('/admin/widgets/new')}><Plus className="h-4 w-4 mr-2" />Criar primeiro widget</Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {widgets.map((w) => (
              <div key={w.id} className="bg-white rounded-lg shadow-sm border p-5">
                <div className="flex items-start gap-3 mb-3">
                  {w.avatar_url && <img src={w.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{w.name}</h3>
                    <p className="text-xs text-gray-500 truncate">{w.bot_name}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${w.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {w.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="flex gap-2 mt-4">
                  <Link to={`/admin/widgets/${w.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full"><Edit className="h-3 w-3 mr-1" />Editar</Button>
                  </Link>
                  <a href={`/embed/${w.id}`} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm"><ExternalLink className="h-3 w-3" /></Button>
                  </a>
                  <Button variant="outline" size="sm" onClick={() => remove(w.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}