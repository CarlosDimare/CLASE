import React from 'react';
import { Rss, ExternalLink, RefreshCw } from 'lucide-react';
import { NewsItem } from '../types';

interface NewsFeedProps {
  news: NewsItem[];
  loading: boolean;
  error: boolean;
  onRefresh: () => void;
}

const NewsFeed: React.FC<NewsFeedProps> = ({ news, loading, error, onRefresh }) => {
  return (
    <div className="bg-neutral-900 border border-neutral-800 min-h-[500px]">
      <div className="bg-neutral-950 p-4 border-b border-neutral-800 flex justify-between items-center">
        <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
          <Rss className="w-5 h-5 text-red-600" /> Cables de Noticias
        </h3>
        <button onClick={onRefresh} disabled={loading} className="text-neutral-500 hover:text-white transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-0">
        {loading && (
          <div className="p-8 text-center text-neutral-500 font-mono animate-pulse">
            RECUPERANDO INFORMACIÓN DE MEDIOS SINDICALES...
          </div>
        )}

        {!loading && error && (
            <div className="p-8 text-center">
                <p className="text-red-500 font-bold mb-2">ERROR DE CONEXIÓN</p>
                <p className="text-neutral-500 text-sm mb-4">No se pudo conectar con los feeds RSS.</p>
                <div className="grid gap-2 max-w-sm mx-auto">
                   <p className="text-xs text-neutral-600">Verifique su conexión a internet.</p>
                </div>
            </div>
        )}

        {!loading && !error && (
          <div className="divide-y divide-neutral-800">
            {news.map((item, idx) => (
              <div key={idx} className="p-5 hover:bg-neutral-800/50 transition-colors group">
                <div className="flex justify-between items-start mb-2">
                  <span className="inline-block px-2 py-0.5 bg-red-900/30 text-red-400 border border-red-900/50 text-[10px] font-black uppercase tracking-wider">
                    {item.source}
                  </span>
                  <span className="text-neutral-600 text-xs font-mono">{item.pubDate.split(' ')[0]}</span>
                </div>
                <a href={item.link} target="_blank" rel="noreferrer" className="block">
                  <h4 className="text-white font-bold text-lg leading-tight uppercase mb-2 group-hover:text-red-500 transition-colors">
                    {item.title}
                  </h4>
                </a>
                <p className="text-neutral-400 text-sm leading-relaxed line-clamp-2 mb-3">
                  {item.description}
                </p>
                <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-neutral-500 hover:text-white uppercase tracking-wider">
                  Leer Nota Completa <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
            {news.length === 0 && !loading && (
                 <div className="p-8 text-center text-neutral-600 italic">No hay cables recientes disponibles.</div>
            )}
          </div>
        )}
      </div>

      {/* Static Links fallback/addition */}
      <div className="bg-neutral-950 p-4 border-t border-neutral-800">
        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">Fuentes Directas</h4>
        <div className="flex flex-wrap gap-3">
            <a href="https://www.infogremiales.com.ar/" target="_blank" rel="noreferrer" className="text-xs text-neutral-400 hover:text-red-500 uppercase font-bold flex items-center gap-1">InfoGremiales <ExternalLink className="w-3 h-3"/></a>
            <a href="http://www.infosindical.com.ar/" target="_blank" rel="noreferrer" className="text-xs text-neutral-400 hover:text-red-500 uppercase font-bold flex items-center gap-1">InfoSindical <ExternalLink className="w-3 h-3"/></a>
            <a href="http://www.conciliacionobligatoria.com/" target="_blank" rel="noreferrer" className="text-xs text-neutral-400 hover:text-red-500 uppercase font-bold flex items-center gap-1">Conciliación Obligatoria <ExternalLink className="w-3 h-3"/></a>
        </div>
      </div>
    </div>
  );
};

export default NewsFeed;