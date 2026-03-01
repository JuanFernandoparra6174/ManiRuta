import { supabase } from "./supabaseClient.js";

export async function fetchAllAlerts() {
    const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function createOperationalAlert({ title, message, type, severity }) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('alerts').insert([{
        id: crypto.randomUUID(),
        created_by_user_id: user.id,
        title,
        message,
        alert_type: type,
        severity: severity,
        status: 'ACTIVE',
        starts_at: new Date().toISOString(),
        created_at: new Date().toISOString()
    }]);
    if (error) throw error;
}