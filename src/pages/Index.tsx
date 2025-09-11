
import ChatWidget from '@/components/ChatWidget';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center max-w-2xl mx-auto px-6">
        <h1 className="text-5xl font-bold text-gray-800 mb-6">
          Widget do Humanito, amigo da TV Humana
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Converse com Humanito por texto e voz
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-sm font-medium">Chat de Texto</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="text-3xl mb-2">🎤</div>
            <p className="text-sm font-medium">Comando de Voz</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="text-3xl mb-2">📍</div>
            <p className="text-sm font-medium">Localização</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="text-3xl mb-2">📎</div>
            <p className="text-sm font-medium">Envio de Arquivos</p>
          </div>
        </div>
        <p className="text-gray-500">
          Clique no ícone do chat no canto inferior direito para começar a conversar!
        </p>
      </div>
      
      <ChatWidget />
    </div>
  );
};

export default Index;
