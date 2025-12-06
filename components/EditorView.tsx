import React, { useState } from 'react';
import { generarContenidoSindical, analizarFuenteExterna, analizarNoticiasMasivas, UrlAnalysisResult } from '../services/geminiService';
import { SindicatoData, AccionGremial, AcuerdoParitario, NewsItem, ComisionMiembro } from '../types';
import { Bot, Loader2, Save, Trash2, Plus, Search, AlertTriangle, Link, FileJson, Radio, CheckCircle, XCircle, User, UserPlus, X } from 'lucide-react';

interface EditorViewProps {
  existingUnions: SindicatoData[];
  onSave: (data: SindicatoData) => void;
  onDelete: (slug: string) => void;
  news: NewsItem[];
}

// Fallback UUID generator for non-secure contexts
const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const EditorView: React.FC<EditorViewProps> = ({ existingUnions, onSave, onDelete, news }) => {
  // New Investigation State
  const [inputName, setInputName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // URL Analysis State
  const [inputUrl, setInputUrl] = useState('');
  const [analyzingUrl, setAnalyzingUrl] = useState(false);
  const [urlMessage, setUrlMessage] = useState<string | null>(null);

  // Batch News Processing State
  const [analyzingBatch, setAnalyzingBatch] = useState(false);
  const [batchResults, setBatchResults] = useState<UrlAnalysisResult[]>([]);

  // Editor State
  const [editableData, setEditableData] = useState<SindicatoData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Delete Modal State (Custom implementation to avoid window.confirm blocking)
  const [deleteTarget, setDeleteTarget] = useState<{slug: string, name: string} | null>(null);

  // 1. Generate full new data with AI
  const handleGenerate = async () => {
    if (!inputName.trim()) return;
    setLoading(true);
    setError(null);
    setEditableData(null); 
    setBatchResults([]); // Clear batch results

    try {
      const data = await generarContenidoSindical(inputName);
      setEditableData(data);
    } catch (err: any) {
      setError(err.message || "Error al conectar con el servicio de IA.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Analyze specific URL (The requested feature)
  const handleUrlAnalysis = async () => {
    if (!inputUrl.trim()) return;
    setAnalyzingUrl(true);
    setUrlMessage(null);
    setError(null);
    setBatchResults([]);

    try {
        const result: UrlAnalysisResult = await analizarFuenteExterna(inputUrl);
        mergeAndEdit(result);
    } catch (err: any) {
        setError(err.message || "No se pudo extraer información del enlace.");
    } finally {
        setAnalyzingUrl(false);
    }
  };

  // 3. Process All News Cables (The NEW requested feature)
  const handleProcessCables = async () => {
      if (news.length === 0) {
          setError("No hay cables de noticias cargados para analizar.");
          return;
      }
      setAnalyzingBatch(true);
      setError(null);
      setBatchResults([]);
      setEditableData(null); // Clear editor to show batch results

      try {
          const results = await analizarNoticiasMasivas(news);
          if (results.length === 0) {
              setUrlMessage("El análisis finalizó pero no se detectaron acciones sindicales relevantes en los cables recientes.");
          } else {
              setBatchResults(results);
          }
      } catch (err: any) {
          setError(err.message || "Error al procesar el lote de cables.");
      } finally {
          setAnalyzingBatch(false);
      }
  };

  const mergeAndEdit = (result: UrlAnalysisResult) => {
        // Find if union exists
        const existingIndex = existingUnions.findIndex(u => u.slug === result.sindicatoMatch.slug);
        let unionToEdit: SindicatoData;

        if (existingIndex >= 0) {
            // Use existing
            unionToEdit = JSON.parse(JSON.stringify(existingUnions[existingIndex]));
            setUrlMessage(`Sindicato detectado: ${unionToEdit.nombre}. Información extraída correctamente.`);
        } else {
            // Create minimal skeleton if not exists
            unionToEdit = {
                nombre: result.sindicatoMatch.nombre,
                slug: result.sindicatoMatch.slug,
                comisionDirectiva: [],
                datosBasicos: { sedePrincipal: "A completar", sitioWeb: "" },
                acciones: {},
                paritarias: {}
            };
            setUrlMessage(`Nuevo sindicato detectado: ${unionToEdit.nombre}. Registro creado.`);
        }

        // Merge Data
        const uuid = generateUUID();
        if (result.tipoDetectado === 'accion') {
            unionToEdit.acciones = unionToEdit.acciones || {};
            const accionData = result.data as AccionGremial;
            // Ensure source is set from the data provided by AI (which should map it from input)
            unionToEdit.acciones[uuid] = accionData;
        } else if (result.tipoDetectado === 'paritaria') {
            unionToEdit.paritarias = unionToEdit.paritarias || {};
            const paritariaData = result.data as AcuerdoParitario;
            unionToEdit.paritarias[uuid] = paritariaData;
        }

        setEditableData(unionToEdit);
        setInputUrl(''); // Clear input
  }

  // Handle accepting a suggestion from the batch list
  const handleAcceptSuggestion = (result: UrlAnalysisResult) => {
      mergeAndEdit(result);
      // Remove from suggestions list to avoid double adding
      setBatchResults(prev => prev.filter(r => r !== result));
  };

  const handleApprove = () => {
    if (editableData) {
      onSave(editableData);
      setEditableData(null); // Clear after save to return to "dashboard"
      setUrlMessage(null);
    }
  };

  // Borrar sindicato completo (Trigger Modal)
  const handleDeleteTrigger = (slug: string, name: string) => {
      setDeleteTarget({ slug, name });
  }

  const confirmDelete = () => {
      if (deleteTarget) {
          onDelete(deleteTarget.slug);
          // Si estábamos editando el que borramos, limpiar editor
          if (editableData && editableData.slug === deleteTarget.slug) {
              setEditableData(null);
          }
          setDeleteTarget(null);
      }
  }

  // Select an existing union to edit
  const handleSelectExisting = (union: SindicatoData) => {
    setEditableData(JSON.parse(JSON.stringify(union)));
    setBatchResults([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setError(null);
    setUrlMessage(null);
  };

  // Download DB as JSON (BASE.JSON)
  const handleDownloadDb = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(existingUnions, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "base.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  }

  // Helpers for editing nested state
  const updateField = (path: string, value: any) => {
    if (!editableData) return;
    const newData = { ...editableData };
    const parts = path.split('.');
    let current: any = newData;
    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
    setEditableData(newData);
  };

  // --- ACTIONS MANAGEMENT (SIN CONFIRMACIÓN PARA RAPIDEZ) ---
  const removeAccion = (e: React.MouseEvent, uuid: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editableData) return;
    // Eliminación directa del estado local (si te equivocas, no guardas)
    const newAcciones = { ...editableData.acciones };
    delete newAcciones[uuid];
    setEditableData({ ...editableData, acciones: newAcciones });
  };

  const addEmptyAccion = () => {
    if (!editableData) return;
    const uuid = generateUUID();
    const newAccion: AccionGremial = {
        titulo: "Nueva Acción",
        tipo: "reunion",
        fecha: new Date().toISOString().split('T')[0],
        lugar: "A definir",
        fuente: "",
        descripcion: ""
    };
    setEditableData({
        ...editableData,
        acciones: { ...editableData.acciones, [uuid]: newAccion }
    });
  };

  // --- PARITARIAS MANAGEMENT (SIN CONFIRMACIÓN) ---
  const removeParitaria = (e: React.MouseEvent, uuid: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editableData) return;
    const newParitarias = { ...editableData.paritarias };
    delete newParitarias[uuid];
    setEditableData({ ...editableData, paritarias: newParitarias });
  };

  const addEmptyParitaria = () => {
      if (!editableData) return;
      const uuid = generateUUID();
      const newParitaria: AcuerdoParitario = {
          periodo: new Date().getFullYear().toString(),
          porcentajeAumento: "0%",
          fechaFirma: new Date().toISOString().split('T')[0],
          detalleTexto: "",
          enlaceFuente: ""
      };
      setEditableData({
          ...editableData,
          paritarias: { ...editableData.paritarias, [uuid]: newParitaria}
      });
  }

  // --- COMISION DIRECTIVA MANAGEMENT (SIN CONFIRMACIÓN) ---
  const addMember = () => {
      if (!editableData) return;
      const newMember: ComisionMiembro = { nombre: '', cargo: '' };
      setEditableData({
          ...editableData,
          comisionDirectiva: [...(editableData.comisionDirectiva || []), newMember]
      });
  };

  const removeMember = (e: React.MouseEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      if (!editableData) return;
      const current = editableData.comisionDirectiva || [];
      const newMembers = [...current];
      newMembers.splice(index, 1);
      setEditableData({ ...editableData, comisionDirectiva: newMembers });
  };

  const updateMember = (index: number, field: keyof ComisionMiembro, value: string) => {
      if (!editableData) return;
      const newMembers = [...editableData.comisionDirectiva];
      newMembers[index] = { ...newMembers[index], [field]: value };
      setEditableData({ ...editableData, comisionDirectiva: newMembers });
  };

  const filteredUnions = existingUnions.filter(u => 
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.slug.includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-100px)] relative">
      
      {/* DELETE MODAL OVERLAY */}
      {deleteTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-neutral-900 border-2 border-red-600 p-6 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
                  <h3 className="text-xl font-black text-white uppercase mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-6 h-6 text-red-600" /> Confirmar Eliminación
                  </h3>
                  <p className="text-neutral-400 mb-6 text-sm">
                      ¿Está seguro de eliminar a <span className="text-white font-bold">{deleteTarget.name}</span>? 
                      <br/>Esta acción eliminará todos los datos de la base de datos permanentemente.
                  </p>
                  <div className="flex gap-3 justify-end">
                      <button 
                          type="button"
                          onClick={() => setDeleteTarget(null)}
                          className="px-4 py-2 bg-neutral-800 text-white font-bold uppercase text-xs hover:bg-neutral-700 transition-colors"
                      >
                          Cancelar
                      </button>
                      <button 
                          type="button"
                          onClick={confirmDelete}
                          className="px-4 py-2 bg-red-600 text-white font-bold uppercase text-xs hover:bg-red-700 shadow-lg shadow-red-900/50 transition-colors flex items-center gap-2"
                      >
                          <Trash2 className="w-3 h-3" /> Sí, Eliminar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Sidebar: Existing Database */}
      <aside className="w-full md:w-80 bg-neutral-900 border-r border-neutral-800 p-4 flex flex-col">
        <div className="mb-4">
            <h2 className="text-white font-black uppercase tracking-tighter mb-2 flex items-center gap-2">
                <Search className="w-4 h-4 text-red-600" /> Base de Datos
            </h2>
            <input 
                type="text" 
                placeholder="Buscar sindicato..." 
                className="w-full bg-neutral-950 border border-neutral-800 p-2 text-sm text-white focus:border-red-600 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
            {filteredUnions.map((union, idx) => (
                <div key={idx} className="bg-neutral-950 p-3 border border-neutral-800 hover:border-red-600 transition-colors group cursor-pointer" onClick={() => handleSelectExisting(union)}>
                    <div className="flex justify-between items-start">
                        <span className="text-red-600 font-bold text-xs uppercase tracking-wider">{union.slug}</span>
                        <div className="flex gap-2">
                             <button 
                                type="button"
                                onClick={(e) => { 
                                    e.preventDefault(); 
                                    e.stopPropagation(); 
                                    handleDeleteTrigger(union.slug, union.nombre);
                                }}
                                className="text-neutral-600 hover:text-red-500 p-1"
                                title="Eliminar Sindicato"
                             >
                                <Trash2 className="w-3 h-3" />
                             </button>
                        </div>
                    </div>
                    <h3 className="text-neutral-300 font-bold text-sm leading-tight mt-1 group-hover:text-white">{union.nombre}</h3>
                </div>
            ))}
            {filteredUnions.length === 0 && (
                <p className="text-neutral-600 text-xs text-center italic py-4">No hay registros.</p>
            )}
        </div>

        <button 
            type="button"
            onClick={handleDownloadDb}
            className="mt-auto w-full flex items-center justify-center gap-2 bg-green-900/50 hover:bg-green-800 text-green-300 text-xs font-bold py-3 uppercase border border-green-800 transition-all"
        >
            <FileJson className="w-4 h-4" /> DESCARGAR BASE.JSON
        </button>
      </aside>

      {/* Main Area */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        
        {/* Top Controls Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
            
            {/* 1. Full Investigation */}
            <div className="bg-neutral-900 p-6 border border-neutral-800 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-3xl group-hover:bg-red-600/10 transition-colors"></div>
                <h1 className="text-lg font-black text-white mb-4 flex items-center gap-2 uppercase tracking-tighter">
                    <Bot className="w-5 h-5 text-red-600" /> Investigar (Full)
                </h1>
                <div className="flex flex-col gap-3">
                    <input
                        type="text"
                        value={inputName}
                        onChange={(e) => setInputName(e.target.value)}
                        placeholder="Nombre Sindicato..."
                        className="w-full bg-neutral-950 px-4 py-2 border border-neutral-700 text-white placeholder-neutral-600 focus:border-red-600 focus:outline-none font-bold text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    />
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={loading || !inputName.trim()}
                        className="bg-red-700 text-white px-4 py-2 font-black uppercase tracking-wider hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-all text-xs h-10"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        {loading ? 'ANALIZANDO...' : 'GENERAR INFORME'}
                    </button>
                </div>
            </div>

            {/* 2. Quick Link Analysis */}
            <div className="bg-neutral-900 p-6 border border-neutral-800 shadow-xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl group-hover:bg-blue-600/10 transition-colors"></div>
                 <h1 className="text-lg font-black text-white mb-4 flex items-center gap-2 uppercase tracking-tighter">
                    <Link className="w-5 h-5 text-blue-500" /> Link Único
                </h1>
                <div className="flex flex-col gap-3">
                     <div className="relative">
                        <input
                            type="text"
                            value={inputUrl}
                            onChange={(e) => setInputUrl(e.target.value)}
                            placeholder="Pegar enlace..."
                            className="w-full bg-neutral-950 px-4 py-2 border border-neutral-700 text-white placeholder-neutral-600 focus:border-blue-500 focus:outline-none font-bold text-sm pr-10"
                            onKeyDown={(e) => e.key === 'Enter' && handleUrlAnalysis()}
                        />
                     </div>
                    <button
                        type="button"
                        onClick={handleUrlAnalysis}
                        disabled={analyzingUrl || !inputUrl.trim()}
                        className="bg-blue-700 text-white px-4 py-2 font-black uppercase tracking-wider hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-all text-xs h-10"
                    >
                        {analyzingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                        {analyzingUrl ? 'EXTRAYENDO...' : 'ANALIZAR'}
                    </button>
                </div>
            </div>

             {/* 3. Batch Cable Processing */}
             <div className="bg-neutral-900 p-6 border-l-4 border-l-purple-600 border border-neutral-800 shadow-xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 rounded-full blur-3xl group-hover:bg-purple-600/10 transition-colors"></div>
                 <h1 className="text-lg font-black text-white mb-4 flex items-center gap-2 uppercase tracking-tighter">
                    <Radio className="w-5 h-5 text-purple-500" /> Procesar Cables
                </h1>
                <div className="flex flex-col gap-3">
                    <p className="text-neutral-500 text-xs font-mono h-[34px] flex items-center">
                        {news.length} cables disponibles en feed.
                    </p>
                    <button
                        type="button"
                        onClick={handleProcessCables}
                        disabled={analyzingBatch || news.length === 0}
                        className="bg-purple-700 text-white px-4 py-2 font-black uppercase tracking-wider hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-all text-xs h-10 shadow-lg shadow-purple-900/20"
                    >
                        {analyzingBatch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                        {analyzingBatch ? 'PROCESANDO...' : 'ANALIZAR FEEDS'}
                    </button>
                </div>
            </div>
        </div>

        {/* Global Messages */}
        {error && (
            <div className="mb-6 bg-red-900/20 border border-red-900/50 p-4 flex items-center gap-3 text-red-200 text-sm">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                {error}
            </div>
        )}
        {urlMessage && (
             <div className="mb-6 bg-blue-900/20 border border-blue-900/50 p-4 flex items-center gap-3 text-blue-200 text-sm animate-in fade-in">
                <Bot className="w-5 h-5 text-blue-500" />
                {urlMessage}
            </div>
        )}

        {/* Signals Intelligence Results (Batch Analysis) */}
        {batchResults.length > 0 && !editableData && (
            <div className="animate-in slide-in-from-bottom-4 duration-500 mb-8">
                <h3 className="text-purple-400 font-bold uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
                    <Radio className="w-4 h-4" /> Señales Detectadas ({batchResults.length})
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                    {batchResults.map((result, idx) => (
                        <div key={idx} className="bg-neutral-900 border border-purple-900/30 p-4 hover:bg-purple-900/10 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-purple-400 font-black uppercase text-xs">{result.sindicatoMatch.slug}</span>
                                <span className="bg-purple-900/50 text-purple-200 text-[10px] px-2 py-0.5 rounded uppercase font-bold">
                                    {result.tipoDetectado === 'accion' ? (result.data as AccionGremial).tipo : 'PARITARIA'}
                                </span>
                            </div>
                            <h4 className="text-white font-bold text-sm mb-2">
                                {result.tipoDetectado === 'accion' ? (result.data as AccionGremial).titulo : `Acuerdo ${ (result.data as AcuerdoParitario).porcentajeAumento}`}
                            </h4>
                            <div className="flex gap-2 mt-4">
                                <button 
                                    type="button"
                                    onClick={() => handleAcceptSuggestion(result)}
                                    className="flex-1 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold py-2 uppercase flex items-center justify-center gap-2"
                                >
                                    <CheckCircle className="w-3 h-3" /> Procesar
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setBatchResults(prev => prev.filter((_, i) => i !== idx))}
                                    className="bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white px-3 py-2"
                                >
                                    <XCircle className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Editor Form */}
        {editableData ? (
             <div className="animate-in slide-in-from-bottom-4 duration-500 pb-20">
                <div className="flex items-center justify-between sticky top-0 z-40 bg-neutral-950/95 backdrop-blur-sm py-4 border-b border-neutral-800 mb-6">
                    <div>
                        <span className="text-red-500 text-xs font-bold uppercase tracking-widest">
                            {existingUnions.find(u => u.slug === editableData.slug) ? 'Editando Registro' : 'Nuevo Registro'}
                        </span>
                        <h2 className="text-2xl font-black text-white uppercase leading-none">{editableData.nombre}</h2>
                    </div>
                    <div className="flex gap-2">
                         {existingUnions.find(u => u.slug === editableData.slug) && (
                             <button
                                type="button"
                                onClick={() => handleDeleteTrigger(editableData.slug, editableData.nombre)}
                                className="bg-red-900/20 hover:bg-red-900/40 text-red-500 px-4 py-3 font-bold uppercase text-xs tracking-wider transition-all border border-red-900/30 flex items-center gap-2"
                             >
                                <Trash2 className="w-4 h-4" /> <span className="hidden lg:inline">Eliminar Sindicato</span>
                            </button>
                         )}
                        <button
                            type="button"
                            onClick={() => setEditableData(null)}
                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white px-4 py-3 font-bold uppercase text-xs tracking-wider transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleApprove}
                            className="bg-green-700 hover:bg-green-600 text-white px-6 py-3 font-bold uppercase shadow-lg shadow-green-900/20 flex items-center gap-2 text-sm tracking-wider transition-all"
                        >
                            <Save className="w-4 h-4" /> Guardar
                        </button>
                    </div>
                </div>

                <div className="grid gap-8">
                    {/* Sección 1: Datos Básicos */}
                    <div className="bg-neutral-900 p-6 border border-neutral-800">
                        <h3 className="text-neutral-500 font-bold uppercase text-xs mb-4 tracking-widest border-b border-neutral-800 pb-2">Información Institucional</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="label-helper">Nombre Sindicato</label>
                                <input className="input-dark" value={editableData.nombre} onChange={(e) => updateField('nombre', e.target.value)} />
                            </div>
                            <div>
                                <label className="label-helper">Slug (Identificador)</label>
                                <input className="input-dark" value={editableData.slug} onChange={(e) => updateField('slug', e.target.value)} />
                            </div>
                            <div>
                                <label className="label-helper">Sede</label>
                                <input className="input-dark" value={editableData.datosBasicos.sedePrincipal} onChange={(e) => updateField('datosBasicos.sedePrincipal', e.target.value)} />
                            </div>
                            <div>
                                <label className="label-helper">Web</label>
                                <input className="input-dark" value={editableData.datosBasicos.sitioWeb} onChange={(e) => updateField('datosBasicos.sitioWeb', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Sección 2: Comisión Directiva */}
                    <div className="bg-neutral-900 p-6 border border-neutral-800">
                         <div className="flex justify-between items-center border-b border-neutral-800 pb-2 mb-4">
                            <h3 className="text-blue-500 font-bold uppercase text-xs tracking-widest flex items-center gap-2">
                                <User className="w-4 h-4" /> Comisión Directiva
                            </h3>
                            <button type="button" onClick={addMember} className="text-xs bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1 uppercase font-bold flex items-center gap-1">
                                <UserPlus className="w-3 h-3" /> Agregar
                            </button>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            {editableData.comisionDirectiva?.map((miembro, idx) => (
                                <div key={idx} className="bg-neutral-950 p-3 border border-neutral-800 flex gap-2 items-end group">
                                    <div className="flex-1">
                                        <label className="label-helper">Nombre</label>
                                        <input 
                                            className="input-dark" 
                                            value={miembro.nombre} 
                                            onChange={(e) => updateMember(idx, 'nombre', e.target.value)} 
                                            placeholder="Nombre completo"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="label-helper">Cargo</label>
                                        <input 
                                            className="input-dark" 
                                            value={miembro.cargo} 
                                            onChange={(e) => updateMember(idx, 'cargo', e.target.value)} 
                                            placeholder="Cargo"
                                        />
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={(e) => removeMember(e, idx)}
                                        className="bg-neutral-800 hover:bg-red-900 text-neutral-500 hover:text-red-500 p-2 h-[38px] w-[38px] flex items-center justify-center transition-colors cursor-pointer z-10"
                                        title="Eliminar miembro"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {(!editableData.comisionDirectiva || editableData.comisionDirectiva.length === 0) && (
                                <div className="col-span-2 text-center py-4 text-neutral-600 text-sm italic">
                                    No hay miembros registrados en la comisión.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sección 3: Acciones Gremiales */}
                    <div className="bg-neutral-900 p-6 border border-neutral-800">
                        <div className="flex justify-between items-center border-b border-neutral-800 pb-2 mb-4">
                            <h3 className="text-red-500 font-bold uppercase text-xs tracking-widest">
                                Acciones Gremiales ({Object.keys(editableData.acciones).length})
                            </h3>
                            <button type="button" onClick={addEmptyAccion} className="text-xs bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1 uppercase font-bold flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Agregar
                            </button>
                        </div>

                        <div className="space-y-4">
                            {Object.entries(editableData.acciones).map(([uuid, accion]: [string, AccionGremial]) => (
                                <div key={uuid} className={`bg-neutral-900 p-4 border relative group ${accion.fecha >= new Date().toISOString().split('T')[0] ? 'border-l-4 border-l-red-600 border-y-neutral-800 border-r-neutral-800' : 'border-neutral-800'}`}>
                                     <button 
                                        type="button"
                                        onClick={(e) => removeAccion(e, uuid)} 
                                        className="absolute top-0 right-0 bg-neutral-800 text-neutral-500 hover:bg-red-700 hover:text-white p-2 transition-all z-20 cursor-pointer"
                                        title="Eliminar Acción"
                                     >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    
                                    <div className="grid md:grid-cols-12 gap-4 mt-2">
                                        <div className="md:col-span-8">
                                            <label className="label-helper">Título Acción</label>
                                            <input className="input-dark font-bold text-white" value={accion.titulo} onChange={(e) => updateField(`acciones.${uuid}.titulo`, e.target.value)} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="label-helper">Fecha</label>
                                            <input type="date" className="input-dark" value={accion.fecha} onChange={(e) => updateField(`acciones.${uuid}.fecha`, e.target.value)} />
                                        </div>
                                        
                                        <div className="md:col-span-2">
                                            <label className="label-helper">Tipo</label>
                                            <select className="input-dark uppercase" value={accion.tipo} onChange={(e) => updateField(`acciones.${uuid}.tipo`, e.target.value)}>
                                                <option value="medida-fuerza">Medida de Fuerza</option>
                                                <option value="movilizacion">Movilización</option>
                                                <option value="asamblea">Asamblea</option>
                                                <option value="reunion">Reunión</option>
                                                <option value="denuncia">Denuncia</option>
                                                <option value="otro">Otro</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-5">
                                            <label className="label-helper">Lugar</label>
                                            <input className="input-dark" value={accion.lugar} onChange={(e) => updateField(`acciones.${uuid}.lugar`, e.target.value)} />
                                        </div>
                                        <div className="md:col-span-7">
                                            <label className="label-helper">Fuente (Link)</label>
                                            <input className="input-dark text-blue-400 text-xs" value={accion.fuente} onChange={(e) => updateField(`acciones.${uuid}.fuente`, e.target.value)} />
                                        </div>
                                        
                                        <div className="md:col-span-12">
                                            <label className="label-helper">Descripción Breve</label>
                                            <textarea className="input-dark h-16 resize-none" value={accion.descripcion} onChange={(e) => updateField(`acciones.${uuid}.descripcion`, e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {Object.keys(editableData.acciones).length === 0 && <p className="text-neutral-500 italic text-sm p-4 text-center">Sin acciones registradas.</p>}
                        </div>
                    </div>

                    {/* Sección 4: Paritarias */}
                    <div className="bg-neutral-900 p-6 border border-neutral-800">
                        <div className="flex justify-between items-center border-b border-neutral-800 pb-2 mb-4">
                            <h3 className="text-green-600 font-bold uppercase text-xs tracking-widest">Paritarias (Salarios)</h3>
                            <button type="button" onClick={addEmptyParitaria} className="text-xs bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1 uppercase font-bold flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Agregar
                            </button>
                        </div>
                        <div className="space-y-4">
                             {Object.entries(editableData.paritarias).map(([uuid, paritaria]: [string, AcuerdoParitario]) => (
                                <div key={uuid} className="bg-neutral-950 p-4 border border-l-4 border-l-green-600 border-neutral-800 relative group">
                                     <button 
                                        type="button"
                                        onClick={(e) => removeParitaria(e, uuid)} 
                                        className="absolute top-0 right-0 bg-neutral-800 text-neutral-500 hover:bg-red-700 hover:text-white p-2 transition-all z-20 cursor-pointer"
                                        title="Eliminar Paritaria"
                                     >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <div className="grid md:grid-cols-3 gap-4 mt-2">
                                        <div>
                                            <label className="label-helper">Aumento %</label>
                                            <input className="input-dark text-green-400 font-bold" value={paritaria.porcentajeAumento} onChange={(e) => updateField(`paritarias.${uuid}.porcentajeAumento`, e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="label-helper">Periodo</label>
                                            <input className="input-dark" value={paritaria.periodo} onChange={(e) => updateField(`paritarias.${uuid}.periodo`, e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="label-helper">Fecha Firma</label>
                                            <input type="date" className="input-dark" value={paritaria.fechaFirma} onChange={(e) => updateField(`paritarias.${uuid}.fechaFirma`, e.target.value)} />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="label-helper">Detalle</label>
                                            <input className="input-dark" value={paritaria.detalleTexto} onChange={(e) => updateField(`paritarias.${uuid}.detalleTexto`, e.target.value)} />
                                        </div>
                                        <div className="md:col-span-3">
                                             <label className="label-helper">Fuente Oficial</label>
                                            <input className="input-dark text-blue-400 text-xs" value={paritaria.enlaceFuente} onChange={(e) => updateField(`paritarias.${uuid}.enlaceFuente`, e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                             ))}
                             {Object.keys(editableData.paritarias).length === 0 && <p className="text-neutral-500 italic text-sm p-4 text-center">Sin paritarias registradas.</p>}
                        </div>
                    </div>

                </div>
             </div>
        ) : (
            <div className="flex flex-col items-center justify-center h-64 text-neutral-600">
                <AlertTriangle className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm font-mono uppercase">Seleccione un sindicato de la base de datos o inicie una investigación.</p>
                <div className="flex gap-4 mt-6 opacity-50">
                     <div className="flex items-center gap-2 text-xs"><Bot className="w-4 h-4" /> Investigar</div>
                     <div className="flex items-center gap-2 text-xs"><Link className="w-4 h-4" /> Analizar Link</div>
                </div>
            </div>
        )}

      </div>
      <style>{`
        .label-helper {
          display: block;
          font-size: 0.65rem;
          color: #737373;
          margin-bottom: 0.25rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
        }
        .input-dark {
          background-color: #0a0a0a;
          border: 1px solid #262626;
          color: #e5e5e5;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          width: 100%;
          transition: all 0.2s;
        }
        .input-dark:focus {
          border-color: #dc2626;
          outline: none;
        }
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        ::-webkit-scrollbar-track {
            background: #171717; 
        }
        ::-webkit-scrollbar-thumb {
            background: #404040; 
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #525252; 
        }
      `}</style>
    </div>
  );
};

export default EditorView;