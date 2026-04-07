import { supabase } from "./supabaseClient.js";
import { getMyProfile } from "./profile.js";

export async function getMyDriverProfile() {
  const profile = await getMyProfile();
  if (!profile) return null;

  const { data, error } = await supabase
    .from("drivers")
    .select("id, user_id, company_id, full_name, phone, license_no, status")
    .eq("user_id", profile.id)
    .single();

  if (error) throw error;

  return {
    ...data,
    user: profile
  };
}

export async function requireDriverSession() {
  const profile = await getMyProfile();
  if (!profile || profile.role_id !== 4) {
    window.location.href = "login.html";
    return null;
  }

  const driver = await getMyDriverProfile();
  if (!driver || driver.status !== "ACTIVE") {
    await supabase.auth.signOut();
    window.location.href = "login.html";
    return null;
  }

  return driver;
}
