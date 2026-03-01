import { supabase } from "./supabaseClient.js";

export async function createAlert({ title, message, alert_type, severity, starts_at }) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('alerts').insert([{
        id: crypto.randomUUID(),
        created_by_user_id: user.id,
        title, message, alert_type, severity,
        starts_at,
        status: 'ACTIVE',
        created_at: new Date().toISOString()
    }]);
    if (error) throw error;
}