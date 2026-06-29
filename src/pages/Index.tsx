import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center max-w-2xl mx-auto px-6">
        <h1 className="text-5xl font-bold text-gray-800 mb-6">
          Humanito Builder
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Construa widgets de chatbot personalizados e gere URLs / scripts prontos para incorporar em qualquer site.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Feature emoji="🎨" label="Personalize visual" />
          <Feature emoji="🔌" label="Conecte ao n8n / IA" />
          <Feature emoji="🧩" label="Embed via script ou iframe" />
          <Feature emoji="📊" label="Analytics (em breve)" />
        </div>
        <div className="flex gap-3 justify-center">
          <Link to="/admin"><Button size="lg">Acessar painel</Button></Link>
          <Link to="/auth"><Button size="lg" variant="outline">Entrar</Button></Link>
        </div>
      </div>
    </div>
  );
};

const Feature = ({ emoji, label }: { emoji: string; label: string }) => (
  <div className="bg-white p-4 rounded-lg shadow-md">
    <div className="text-3xl mb-2">{emoji}</div>
    <p className="text-sm font-medium">{label}</p>
  </div>
);

export default Index;
