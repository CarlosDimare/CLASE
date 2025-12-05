import { GoogleGenAI } from "@google/genai";
import { SindicatoData, AccionGremial, AcuerdoParitario, NewsItem } from "../types";

const SYSTEM_INSTRUCTION = `
Eres un analista de inteligencia gremial. Tu objetivo es investigar y estructurar información sobre un sindicato específico para una base de datos de acción sindical.

DEBES devolver SOLAMENTE un objeto JSON válido.
NO incluyas markdown (bloques de código \`\`\`json), ni texto introductorio como "Aquí está el JSON".
Empieza el mensaje directamente con la llave de apertura "{".

CAMBIOS IMPORTANTES EN LA BÚSQUEDA:
1. NO busques "noticias" genéricas. Busca "ACCIONES GREMIALES" específicas.
2. Una ACCIÓN es: una Huelga, Movilización, Asamblea, Reunión con autoridades, Denuncia pública o Comunicado oficial de conflicto.
3. Clasifica cada acción como "realizada" (pasada) o "programada" (futura).
4. Busca el ÚLTIMO acuerdo paritario firmado (Salarios).

El JSON debe seguir EXACTAMENTE esta estructura:

{
  "nombre": "Nombre Completo Sindicato",
  "slug": "acronimo-minusculas",
  "comisionDirectiva": [
    { "nombre": "Nombre", "cargo": "Cargo" }
  ],
  "datosBasicos": {
    "sedePrincipal": "Dirección",
    "sitioWeb": "URL"
  },
  "acciones": {
    "UUID_GENERADO_1": {
      "titulo": "Ej: Paro Nacional por 24hs",
      "tipo": "medida-fuerza", 
      "fecha": "YYYY-MM-DD",
      "lugar": "Ciudad o Dirección",
      "fuente": "URL OBLIGATORIA",
      "estado": "programada",
      "descripcion": "Breve descripción del motivo"
    },
    "UUID_GENERADO_2": {
      "titulo": "Ej: Acuerdo con Cámaras Empresariales",
      "tipo": "reunion",
      "fecha": "YYYY-MM-DD",
      "lugar": "Ministerio de Trabajo",
      "fuente": "URL OBLIGATORIA",
      "estado": "realizada",
      "descripcion": "Resumen del resultado"
    }
  },
  "paritarias": {
    "UUID_GENERADO_3": {
      "periodo": "2024-2025",
      "porcentajeAumento": "Ej: 15%",
      "fechaFirma": "YYYY-MM-DD",
      "detalleTexto": "Descripción de tramos",
      "enlaceFuente": "URL OBLIGATORIA"
    }
  }
}

Valores válidos para "tipo" de acción: "medida-fuerza", "asamblea", "reunion", "denuncia", "movilizacion", "otro".
`;

// Helper to clean JSON
const cleanAndParseJson = (text: string): any => {
    let jsonString = text.trim();
    // Remove markdown code blocks
    jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    // Remove plain markdown code blocks if just ```
    jsonString = jsonString.replace(/```/g, '');
    
    // Find the first { (or [ for arrays) and last } (or ])
    const firstOpen = jsonString.search(/[{[]/);
    const lastClose = jsonString.search(/[}\]]$/); // Simple search from end is tricky with regex, doing manual substring
    
    // Better simple extraction:
    const firstCurly = jsonString.indexOf('{');
    const firstSquare = jsonString.indexOf('[');
    
    let startIdx = -1;
    if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
        startIdx = firstCurly;
    } else if (firstSquare !== -1) {
        startIdx = firstSquare;
    }

    if (startIdx !== -1) {
         // Naive extraction till end, usually works if Gemini follows instruction
        jsonString = jsonString.substring(startIdx);
        // Clean trailing chars if any
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
    1. Obtén su comisión directiva y datos básicos.
    2. Busca sus últimas ACCIONES GREMIALES (conflictos, paros, asambleas) y PRÓXIMAS acciones. Mínimo 4 acciones en total.
    3. Busca su última paritaria firmada.
    Genera UUIDs aleatorios para las claves del objeto acciones y paritarias. Asegúrate de devolver JSON puro.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
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
    Analiza el contenido del enlace proporcionado. Tu tarea es extraer información sindical estructurada para actualizar la Base de Datos.
    
    INSTRUCCIONES:
    1. Identifica qué Sindicato es el protagonista. Normaliza el nombre y crea un slug (siglas minúsculas).
    2. Determina si el enlace habla de una ACCIÓN GREMIAL (huelga, marcha, reunión, estado de alerta), una PARITARIA (acuerdo salarial) o es info general.
    3. IMPORTANTE: El campo "fuente" o "enlaceFuente" DEBE ser exactamente: "${url}".
    
    FORMATO DE RESPUESTA JSON:
    
    {
        "sindicatoMatch": { "nombre": "Nombre Sindicato", "slug": "slug-sindicato" },
        "tipoDetectado": "accion" | "paritaria",
        "data": { ...OBJETO... }
    }

    Si es "accion", el objeto "data" debe tener esta estructura:
    {
       "titulo": "Título descriptivo de la acción",
       "tipo": "medida-fuerza" | "asamblea" | "reunion" | "denuncia" | "movilizacion" | "otro",
       "fecha": "YYYY-MM-DD",
       "lugar": "Lugar específico",
       "fuente": "${url}",
       "estado": "realizada" | "programada",
       "descripcion": "Resumen claro de 2 oraciones."
    }

    Si es "paritaria", el objeto "data" debe tener esta estructura:
    {
       "periodo": "Ej: 2024-2025",
       "porcentajeAumento": "Ej: 15% bimestral",
       "fechaFirma": "YYYY-MM-DD",
       "detalleTexto": "Detalle de los tramos y condiciones.",
       "enlaceFuente": "${url}"
    }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analiza este enlace y extrae los datos: ${url}`,
            config: {
                systemInstruction: systemPrompt,
                tools: [{ googleSearch: {} }] // Allows the model to 'read' the page content via search index if needed
            }
        });

        const text = response.text || "{}";
        const result = cleanAndParseJson(text);
        
        // Basic validation
        if (!result.sindicatoMatch || !result.data) {
             throw new Error("No se pudieron identificar los datos del sindicato en este enlace.");
        }

        return result;

    } catch (error) {
        console.error("Error analyzing URL:", error);
        throw new Error("No se pudo analizar el enlace. Verifique que sea accesible y contenga información sindical.");
    }
};

// Nueva función para procesar múltiples noticias
export const analizarNoticiasMasivas = async (noticias: NewsItem[]): Promise<UrlAnalysisResult[]> => {
    if (!process.env.API_KEY) {
        throw new Error("API Key not found");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Limitamos el contexto para no exceder tokens o confundir al modelo con ruido
    const cables = noticias.slice(0, 15).map((n, i) => `ID_${i}: ${n.title} - ${n.description} (Link: ${n.link})`).join('\n\n');

    const systemPrompt = `
    Eres un motor de inteligencia que procesa cables de noticias sindicales.
    Recibirás una lista de noticias.
    
    TU TAREA:
    1. Filtra las noticias irrelevantes o de opinión general. QUEDATE SOLO con las que informan sobre:
       - Medidas de fuerza concretas (Paros, Marchas).
       - Acuerdos Paritarios (Firmas salariales).
       - Elecciones sindicales o Conflictos graves.
    
    2. Para cada noticia RELEVANTE, genera un objeto estructurado igual al formato de "UrlAnalysisResult".
    3. Devuelve UN ARRAY JSON de estos objetos.
    
    FORMATO DE CADA ITEM DEL ARRAY:
    {
        "sindicatoMatch": { "nombre": "Nombre Sindicato", "slug": "slug-sindicato" },
        "tipoDetectado": "accion" | "paritaria",
        "data": { ...Datos de Acción o Paritaria... }
    }
    
    IMPORTANTE:
    - Asegúrate de asignar el LINK correcto de la noticia al campo "fuente" o "enlaceFuente".
    - Si la fecha no es explícita, usa la fecha actual o "A confirmar".
    - Si no encuentras ninguna relevante, devuelve un array vacío [].
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analiza estos cables:\n${cables}`,
            config: {
                systemInstruction: systemPrompt,
                // No necesitamos googleSearch aquí porque la info ya está en el texto del prompt (títulos y descripciones)
            }
        });

        const text = response.text || "[]";
        const results = cleanAndParseJson(text);

        if (!Array.isArray(results)) {
            console.warn("AI did not return an array", results);
            return [];
        }

        return results;

    } catch (error) {
        console.error("Error analyzing news batch:", error);
        throw new Error("Error al procesar el lote de noticias.");
    }
};