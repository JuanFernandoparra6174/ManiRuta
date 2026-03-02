import { supabase } from "./supabaseClient.js";

export async function fetchAllRoutes() {
    // Traemos el nombre de la ruta, el sentido y el nombre de la empresa
    const { data, error } = await supabase
        .from('routes')
        .select('*, companies(name)')
        .eq('status', 'ACTIVE') 
        .order('name', { ascending: true }); // Ordenamos por nombre
    
    if (error) {
        console.error("Error en Supabase:", error);
        throw error;
    }
    return data || [];
}