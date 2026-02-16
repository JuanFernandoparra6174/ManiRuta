import { supabase } from "./supabaseClient.js";

export async function fetchMyCompanyDrivers() {
  const { data, error } = await supabase
    .from("drivers")
    .select("id, full_name, doc_type, doc_number, phone, license_no, status, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
