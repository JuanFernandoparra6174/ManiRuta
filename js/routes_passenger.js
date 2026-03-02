import { supabase } from "./supabaseClient.js";

export async function fetchAllRoutes() {
    // Probamos trayendo solo los datos básicos de la tabla routes
    const { data, error } = await supabase
        .from('routes')
        .select('*') 
        .order('code', { ascending: true });
    
    if (error) {
        console.error("Error detallado de Supabase:", error);
        throw error;
    }
    return data || [];
}