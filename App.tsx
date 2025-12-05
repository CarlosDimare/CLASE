import React, { useState, useEffect } from 'react';
import PublicView from './components/PublicView';
import EconomicTicker from './components/EconomicTicker';
import DateTimeTemp from './components/DateTimeTemp';
import { SindicatoData, NewsItem } from './types';
import { Radio, Loader2, AlertCircle } from 'lucide-react';
import { fetchUnionsFromFirebase } from './services/firebaseService';

const SOURCES = [
  { name: 'InfoGremiales', url: 'https://www.infogremiales.com.ar/feed/' },
  { name: 'Sonido Gremial', url: 'https://sonidogremial.com.ar/feed/' },
  { name: 'Identidad Sindical', url: 'https://www.identidadsindical.ar/rss/' }
];

const App: React.FC = () => {
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

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-200">
      {/* Navbar */}
      <nav className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 font-black text-2xl text-white tracking-tighter uppercase">
              <div className="bg-red-700 text-white p-1.5 shadow-lg shadow-red-900/50">
                <Radio className="w-5 h-5" />
              </div>
              <span>S<span className="text-red-600">N</span></span>
            </div>
            
            {/* Fecha, Hora y Temperatura */}
            <DateTimeTemp />
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
        
        {!dbLoading && !dbError && (
          <PublicView 
            unions={unions} 
            news={news} 
            newsLoading={newsLoading} 
            newsError={newsError}
            onRefreshNews={fetchNews}
          />
        )}
      </main>
    </div>
  );
};

export default App;