
export interface ComisionMiembro {
  nombre: string;
  cargo: string;
}

export interface DatosBasicos {
  sedePrincipal: string;
  sitioWeb: string;
}

// Nueva estructura unificada para acciones (pasadas y futuras)
export interface AccionGremial {
  titulo: string;
  tipo: "medida-fuerza" | "asamblea" | "reunion" | "denuncia" | "movilizacion" | "otro";
  fecha: string; // YYYY-MM-DD
  lugar: string;
  fuente: string; // Link obligatorio
  // estado eliminado: se calcula dinámicamente según la fecha
  descripcion: string;
}

export interface AcuerdoParitario {
  periodo: string;
  porcentajeAumento: string;
  fechaFirma: string;
  detalleTexto: string;
  enlaceFuente: string;
}

export interface SindicatoData {
  nombre: string;
  slug: string;
  comisionDirectiva: ComisionMiembro[];
  datosBasicos: DatosBasicos;
  acciones: Record<string, AccionGremial>; // Reemplaza a noticias y accionesProximas
  paritarias: Record<string, AcuerdoParitario>; // Renombrado de acuerdosParitarios a paritarias para simplificar, pero mantendremos la logica
}

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description: string;
  content?: string;
}

export type ViewMode = 'public' | 'editor';
