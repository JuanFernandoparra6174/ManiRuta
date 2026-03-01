import { supabase } from "./supabaseClient.js";

export async function fetchAllRoutes() {
    const { data, error } = await supabase
        .from('routes')
        .select('*, companies(name)')
        .order('code');
    if (error) throw error;
    return data || [];
}

export async function createRoute({ code, name, description, company_id }) {
    const { error } = await supabase.from('routes').insert([{
        id: crypto.randomUUID(),
        code, 
        name, 
        description, 
        company_id,
        status: 'ACTIVE'
    }]);
    if (error) throw error;
}

export async function deleteRoute(id) {
    const { error } = await supabase.from('routes').delete().eq('id', id);
    if (error) throw error;
}