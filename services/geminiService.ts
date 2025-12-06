import { GoogleGenAI } from "@google/genai";
import { SindicatoData, AccionGremial, AcuerdoParitario, NewsItem } from "../types";

// PROMPT PARA INVESTIGACIÓN INICIAL (SOLO INSTITUCIONAL + PARITARIAS)
const SYSTEM_INSTRUCTION_INIT = `
Eres un analista de inteligencia gremial. Tu objetivo es investigar y estructurar información estática sobre un sindicato.

DEBES devolver SOLAMENTE un objeto JSON válido.
NO incluyas markdown. Empieza directamente con "{".

OBJETIVOS DE BÚSQUEDA:
1. Nombre oficial y SIGLAS (Slug).
2. Comisión Directiva (Secretario General y adjuntos clave).
3. Datos de contacto (Sede, Web).
4. ÚLTIMA PARITARIA O ACUERDO SALARIAL VIGENTE.
5. IMPORTANTE: NO BUSQUES ACCIONES GREMIALES (Huelgas, marchas, etc). El campo "acciones" debe ir vacío.

La fecha actual es ${new Date().toISOString().split('T')[0]}.

ESTRUCTURA JSON REQUERIDA:
{
  "nombre": "Nombre Completo Sindicato",
  "slug": "siglas-minusculas",
  "comisionDirectiva": [
    { "nombre": "Nombre", "cargo": "Cargo" }
  ],
  "datosBasicos": {
    "sedePrincipal": "Dirección",
    "sitioWeb": "URL"
  },
  "acciones": {},
  "paritarias": {
    "UUID_GENERADO_1": {
      "periodo": "2024-2025",
      "porcentajeAumento": "Ej: 15%",
      "fechaFirma": "YYYY-MM-DD",
      "detalleTexto": "Descripción de tramos",
      "enlaceFuente": "URL OBLIGATORIA"
    }
  }
}
`;

// Helper to clean JSON
const cleanAndParseJson = (text: string): any => {
    let jsonString = text.trim();
    // Remove markdown code blocks
    jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    // Remove plain markdown code blocks if just ```
    jsonString = jsonString.replace(/```/g, '');
    
    // Find the first { (or [ for arrays) and last } (or ])
    const firstCurly = jsonString.indexOf('{');
    const firstSquare = jsonString.indexOf('[');
    
    let startIdx = -1;
    if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
        startIdx = firstCurly;
    } else if (firstSquare !== -1) {
        startIdx = firstSquare;
    }

    if (startIdx !== -1) {
        jsonString = jsonString.substring(startIdx);
        const lastCurly = jsonString.lastIndexOf('}');
        const lastSquare = jsonString.lastIndexOf(']');
        const endIdx = Math.max(lastCurly, lastSquare);
        if (endIdx !== -1) {
            jsonString = jsonString.substring(0, endIdx + 1);
        }
    }
    
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse JSON:", jsonString);
        throw new Error("La respuesta de la IA no es un JSON válido.");
    }
};

export const generarContenidoSindical = async (sindicatoNombre: string): Promise<SindicatoData> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found in environment variables");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const model = 'gemini-2.5-flash'; 
    
    const prompt = `Investiga al sindicato "${sindicatoNombre}". 
    1. Obtén su comisión directiva actualizada.
    2. Consigue la dirección de su sede central y sitio web.
    3. Busca su última paritaria salarial firmada (porcentajes y fecha).
    4. NO generes acciones gremiales, deja ese objeto vacío.
    Genera UUIDs aleatorios para las claves de paritarias.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_INIT,
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "{}";
    const data = cleanAndParseJson(text);
    
    if (!data.nombre || !data.slug) {
      throw new Error("La estructura generada está incompleta.");
    }

    return data;

  } catch (error) {
    console.error("Error generating union content:", error);
    throw error;
  }
};

export interface UrlAnalysisResult {
    sindicatoMatch: { nombre: string; slug: string };
    tipoDetectado: 'accion' | 'paritaria' | 'general';
    data: AccionGremial | AcuerdoParitario | SindicatoData;
}

export const analizarFuenteExterna = async (url: string): Promise<UrlAnalysisResult> => {
    if (!process.env.API_KEY) {
        throw new Error("API Key not found");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const systemPrompt = `
    Analiza el contenido del enlace proporcionado. Extrae información sindical estructurada.
    
    INSTRUCCIONES:
    1. Identifica el Sindicato. Normaliza el nombre y crea un slug.
    2. Determina si es ACCIÓN GREMIAL (medida de fuerza, asamblea, marcha) o PARITARIA.
    3. El campo "fuente" DEBE ser: "${url}".
    4. Fecha actual: ${new Date().toISOString().split('T')[0]}.
    
    FORMATO JSON:
    {
        "sindicatoMatch": { "nombre": "Nombre", "slug": "slug" },
        "tipoDetectado": "accion" | "paritaria",
        "data": { ... } // Estructura AccionGremial o AcuerdoParitario
    }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analiza este enlace: ${url}`,
            config: {
                systemInstruction: systemPrompt,
                tools: [{ googleSearch: {} }] 
            }
        });

        const text = response.text || "{}";
        const result = cleanAndParseJson(text);
        
        if (!result.sindicatoMatch || !result.data) {
             throw new Error("Datos no identificados.");
        }

        return result;

    } catch (error) {
        console.error("Error analyzing URL:", error);
        throw new Error("No se pudo analizar el enlace.");
    }
};

// --- PROCESAMIENTO MASIVO DE NOTICIAS (FEED) ---
export const analizarNoticiasMasivas = async (noticias: NewsItem[]): Promise<UrlAnalysisResult[]> => {
    if (!process.env.API_KEY) {
        throw new Error("API Key not found");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Limitamos a 20 noticias para contexto
    const cables = noticias.slice(0, 20).map((n, i) => `[ID_${i}] Fecha: ${n.pubDate} | Título: ${n.title} | Desc: ${n.description} | Link: ${n.link}`).join('\n\n');
    const today = new Date().toISOString().split('T')[0];

    const systemPrompt = `
    Eres un motor de inteligencia gremial. Procesas cables de noticias y detectas acciones concretas.
    Fecha de hoy: ${today}.

    INSTRUCCIONES CRÍTICAS:
    1. **FILTRADO:** Ignora noticias de opinión, política general o internas irrelevantes. Solo procesa: Paros, Movilizaciones, Asambleas, Acuerdos Salariales (Paritarias) o Denuncias graves.
    
    2. **DESDOBLAMIENTO TEMPORAL (ANUNCIO vs EJECUCIÓN):**
       - Si una noticia dice: "Gremio X anuncia Paro para el 9 de diciembre".
       - DEBES generar, si es posible, la ACCIÓN FUTURA.
       - Si la noticia es HOY anunciando algo FUTURO, prioriza la acción futura.
       - Si la noticia es sobre una marcha que YA ocurrió, regístrala con la fecha pasada.

    3. **FECHAS:** Calcula fechas relativas ("el próximo jueves") basándote en la fecha de la noticia o la fecha de hoy (${today}). NUNCA dejes fecha vacía.

    4. **FORMATO JSON (Array):**
    [
      {
        "sindicatoMatch": { "nombre": "Nombre", "slug": "slug" },
        "tipoDetectado": "accion" | "paritaria",
        "data": { 
           "titulo": "Título de la Acción (Ej: Paro Nacional 24hs)", 
           "tipo": "medida-fuerza" | "asamblea" | "movilizacion" | "reunion", 
           "fecha": "YYYY-MM-DD", 
           "lugar": "Ciudad / Lugar", 
           "fuente": "URL original", 
           "descripcion": "Resumen del evento."
        }
      }
    ]
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analiza estos cables y extrae acciones:\n${cables}`,
            config: {
                systemInstruction: systemPrompt,
                // No search tools needed, context is provided
            }
        });

        const text = response.text || "[]";
        const results = cleanAndParseJson(text);

        if (!Array.isArray(results)) {
            return [];
        }

        return results;

    } catch (error) {
        console.error("Error analyzing news batch:", error);
        throw new Error("Error al procesar cables.");
    }
};