import React, { useState, useEffect } from 'react';
import PublicView from './components/PublicView';
import EditorView from './components/EditorView';
import EconomicTicker from './components/EconomicTicker';
import { ViewMode, SindicatoData, NewsItem } from './types';
import { Newspaper, PenTool, Radio, Loader2, AlertCircle, Server, Flame } from 'lucide-react';
import { fetchUnionsFromFirebase, saveUnionToFirebase, deleteUnionFromFirebase } from './services/firebaseService';

const SOURCES = [
  { name: 'InfoGremiales', url: 'https://www.infogremiales.com.ar/feed/' },
  { name: 'Sonido Gremial', url: 'https://sonidogremial.com.ar/feed/' },
  { name: 'Identidad Sindical', url: 'https://www.identidadsindical.ar/rss/' }
];

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>('editor');
  const [unions, setUnions] = useState<SindicatoData[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // News State
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState(false);

  // Load from Firebase on mount
  useEffect(() => {
    loadData();
    fetchNews(); 
  }, []);

  const loadData = async () => {
    setDbLoading(true);
    setDbError(null);
    try {
      const data = await fetchUnionsFromFirebase();
      setUnions(data);
    } catch (err: any) {
      setDbError(err.message || "Error conectando a Firebase RTDB");
    } finally {
      setDbLoading(false);
    }
  };

  const fetchNews = async () => {
    setNewsLoading(true);
    setNewsError(false);
    const allNews: NewsItem[] = [];

    try {
      const promises = SOURCES.map(async (source) => {
        try {
          const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}`);
          const data = await res.json();
          
          if (data.status === 'ok') {
            return data.items.map((item: any) => ({
              title: item.title,
              link: item.link,
              pubDate: item.pubDate,
              source: source.name,
              description: item.description?.replace(/<[^>]+>/g, '').substring(0, 150) + '...' || ''
            }));
          }
          return [];
        } catch (e) {
          console.warn(`Failed to fetch ${source.name}`, e);
          return [];
        }
      });

      const results = await Promise.all(promises);
      results.forEach(items => allNews.push(...items));
      allNews.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      setNews(allNews);

    } catch (err) {
      console.error("Error fetching news feed", err);
      setNewsError(true);
    } finally {
      setNewsLoading(false);
    }
  };

  const handleSaveUnion = async (data: SindicatoData) => {
    // Optimistic Update
    setUnions(prev => {
      const idx = prev.findIndex(u => u.slug === data.slug);
      if (idx >= 0) {
        const newUnions = [...prev];
        newUnions[idx] = data;
        return newUnions;
      }
      return [data, ...prev];
    });

    try {
      await saveUnionToFirebase(data);
      // alert(`Datos de ${data.nombre} guardados correctamente.`);
    } catch (err: any) {
      console.error("Save Error:", err);
      alert("Error al guardar en Firebase: " + err.message);
      loadData(); // Revert to server state on error
    }
  };

  const handleDeleteUnion = async (slug: string) => {
    if (confirm('¿Está seguro de eliminar este registro de la base de datos?')) {
      // Optimistic delete
      setUnions(prev => prev.filter(u => u.slug !== slug));

      try {
        await deleteUnionFromFirebase(slug);
      } catch (err: any) {
        console.error("Delete Error:", err);
        alert("Error al eliminar de Firebase: " + err.message);
        loadData(); // Revert
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-200">
      {/* Navbar */}
      <nav className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 font-black text-2xl text-white tracking-tighter uppercase">
            <div className="bg-red-700 text-white p-1.5 shadow-lg shadow-red-900/50">
              <Radio className="w-5 h-5" />
            </div>
            <span>S<span className="text-red-600">N</span></span>
          </div>
          
          <div className="flex bg-neutral-950 p-1 border border-neutral-800">
            <button
              onClick={() => setView('public')}
              className={`px-4 py-2 text-xs md:text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                view === 'public' ? 'bg-white text-neutral-900' : 'text-neutral-500 hover:text-white'
              }`}
            >
              <Newspaper className="w-4 h-4" /> <span className="hidden md:inline">Frente Público</span>
            </button>
            <button
              onClick={() => setView('editor')}
              className={`px-4 py-2 text-xs md:text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                view === 'editor' ? 'bg-red-600 text-white shadow-red-900/50 shadow-md' : 'text-neutral-500 hover:text-white'
              }`}
            >
              <PenTool className="w-4 h-4" /> <span className="hidden md:inline">Sala de Situación</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Economic Ticker */}
      <EconomicTicker />

      {/* Main Content */}
      <main className="flex-1 bg-neutral-950 relative flex flex-col">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
        
        {dbLoading && (
          <div className="flex items-center justify-center flex-1 h-96 text-neutral-500 gap-3 font-mono">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            CONECTANDO A FIREBASE...
          </div>
        )}

        {!dbLoading && dbError && (
          <div className="p-8 flex items-center justify-center flex-1">
             <div className="bg-red-900/20 border border-red-800 p-6 max-w-lg text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Error de Base de Datos</h3>
                <p className="text-neutral-400 mb-4 font-mono text-xs break-all">{dbError}</p>
                <button onClick={loadData} className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 text-sm font-bold uppercase">
                  Reintentar Conexión
                </button>
            </div>
          </div>
        )}
        
        {!dbLoading && !dbError && view === 'public' && (
          <PublicView 
            unions={unions} 
            news={news} 
            newsLoading={newsLoading} 
            newsError={newsError}
            onRefreshNews={fetchNews}
          />
        )}
        
        {!dbLoading && !dbError && view === 'editor' && (
          <EditorView 
            existingUnions={unions} 
            onSave={handleSaveUnion} 
            onDelete={handleDeleteUnion}
            news={news}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-neutral-900 border-t border-neutral-800 py-6 mt-auto">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-neutral-500 text-xs font-mono uppercase">
          <div className="flex flex-col md:flex-row gap-4 md:items-center">
            <div className="flex items-center gap-2 text-orange-500">
                <Flame className="w-3 h-3" />
                <span>ONLINE: FIREBASE RTDB</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-600">
                <Server className="w-3 h-3" />
                <span title="Firebase">project-306405...</span>
            </div>
          </div>
          <div className="mt-2 md:mt-0 flex gap-4 font-bold text-neutral-600">
             <span>Unidad</span>
             <span>Solidaridad</span>
             <span>Lucha</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;