import { SindicatoData } from '../types';

const DB_URL = "https://project-306405745426850694-default-rtdb.firebaseio.com";
const SECRET = "DJ3tEkH1Erp4v0cPAGsGK4hbyekJumIvIMiUnX9h"; // Legacy secret for direct admin access
const AUTH = `?auth=${SECRET}`;

// Helper to ensure data integrity coming back from Firebase (which might drop empty arrays/objects)
const sanitizeUnionData = (u: any): SindicatoData => ({
    ...u,
    nombre: u.nombre || 'Sindicato Sin Nombre',
    slug: u.slug || 'sin-id',
    comisionDirectiva: u.comisionDirectiva || [],
    acciones: u.acciones || {},
    paritarias: u.paritarias || {},
    datosBasicos: u.datosBasicos || { sedePrincipal: 'Sin datos', sitioWeb: '' }
});

export const fetchUnionsFromFirebase = async (): Promise<SindicatoData[]> => {
    try {
        const response = await fetch(`${DB_URL}/sindicatos.json${AUTH}`);
        
        if (!response.ok) {
             throw new Error(`Firebase connection failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data) return [];
        
        // Firebase returns an object keyed by ID { slug: {data}, slug2: {data} }
        // We convert this to an array and sanitize
        return Object.values(data).map(sanitizeUnionData);
    } catch (error) {
        console.error("Firebase Fetch Error:", error);
        throw error;
    }
};

export const saveUnionToFirebase = async (data: SindicatoData) => {
    try {
        // Use PUT to /sindicatos/SLUG.json to update/create specifically that node
        const response = await fetch(`${DB_URL}/sindicatos/${data.slug}.json${AUTH}`, {
            method: 'PUT',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error("Failed to save to Firebase");
        }
        
        return await response.json();
    } catch (error) {
        console.error("Firebase Save Error:", error);
        throw error;
    }
};

export const deleteUnionFromFirebase = async (slug: string) => {
    try {
        const response = await fetch(`${DB_URL}/sindicatos/${slug}.json${AUTH}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error("Failed to delete from Firebase");
        }
        
        return true;
    } catch (error) {
        console.error("Firebase Delete Error:", error);
        throw error;
    }
};