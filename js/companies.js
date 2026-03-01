import { supabase } from "./supabaseClient.js";

export async function fetchCompanies() {
    const { data, error } = await supabase.from('companies').select('*');
    if (error) throw error;
    return data;
}

export async function createCompany({ name, nit, phone, email, address }) {
    const { error } = await supabase.from('companies').insert([{
        id: crypto.randomUUID(),
        name, nit, phone, email, address,
        status: 'ACTIVE',
        created_at: new Date().toISOString()
    }]);
    if (error) throw error;
}