import { supabase } from "./supabaseClient.js";

export async function fetchCategories() {
  const { data, error } = await supabase
    .from("incident_categories")
    .select("id, name")
    .order("id", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createIncident({ category_id, description }) {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error("No autenticado.");

  const payload = {
    id: crypto.randomUUID(),
    category_id,
    created_by_user_id: user.id,
    occurred_at: new Date().toISOString(),
    description,
    status: "NEW",
    created_at: new Date().toISOString()
  };

  const { error } = await supabase.from("incidents").insert(payload);
  if (error) throw error;

  return true;
}

export async function fetchMyIncidents() {
  const { data, error } = await supabase
    .from("incidents")
    .select("id, status, description, created_at, occurred_at, incident_categories(name)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
