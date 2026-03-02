import { supabase } from "./supabaseClient.js";

export async function fetchAllRoutes() {
    const { data, error } = await supabase
        .from('routes')
        .select('*, companies(name)')
        // Cambiamos .order('code') por .order('name') porque 'code' no existe
        .order('name'); 
    if (error) throw error;
    return data || [];
}

export async function createRoute({ name, company_id, origin_id, end_id, direction }) {
    const { error } = await supabase.from('routes').insert([{
        id: crypto.randomUUID(),
        name,           // Existe en tu tabla
        company_id,     // Existe en tu tabla
        origin_stop_id: origin_id || null, // Existe en tu tabla
        end_stop_id: end_id || null,       // Existe en tu tabla
        direction: direction || 'IDA',     // Existe en tu tabla
        status: 'ACTIVE'                   // Existe en tu tabla
    }]);
    if (error) throw error;
}

export async function deleteRoute(id) {
    const { error } = await supabase.from('routes').delete().eq('id', id);
    if (error) throw error;
}