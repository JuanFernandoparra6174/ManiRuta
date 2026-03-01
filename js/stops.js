import { supabase } from "./supabaseClient.js";

export async function fetchStops() {
    const { data, error } = await supabase.from('stops').select('*').order('name');
    if (error) throw error;
    return data;
}

export async function createStop({ name, lat, lng, address, status = 'ACTIVE' }) {
    const { error } = await supabase.from('stops').insert([{ 
        id: crypto.randomUUID(), name, lat, lng, address, status 
    }]);
    if (error) throw error;
}

export async function deleteStop(id) {
    const { error } = await supabase.from('stops').delete().eq('id', id);
    if (error) throw error;
}