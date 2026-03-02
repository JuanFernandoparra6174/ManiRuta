import { supabase } from "./supabaseClient.js";

export async function fetchActiveAlerts() {
    const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('status', 'ACTIVE') // Solo mostrar las que no han expirado
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
}