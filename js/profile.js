import { supabase } from "./supabaseClient.js";

export async function getMyProfile() {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("id, username, email, phone, role_id, company_id, status")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return data;
}
