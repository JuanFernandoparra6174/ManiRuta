import { supabase } from "./supabaseClient.js";
import { getMyProfile } from "./profile.js";

function roleToHome(roleId) {
  if (roleId === 1) return "/pages/home_passenger.html";
  if (roleId === 2) return "/pages/home_company.html";
  if (roleId === 3) return "/pages/home_admin.html";
  return "/pages/login.html";
}

export async function requireAuthAndRole(expectedRoleId = null) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "/pages/login.html";
    return;
  }

  const profile = await getMyProfile();
  if (!profile || profile.status !== "ACTIVE") {
    await supabase.auth.signOut();
    window.location.href = "/pages/login.html";
    return;
  }

  if (expectedRoleId && profile.role_id !== expectedRoleId) {
    window.location.href = roleToHome(profile.role_id);
    return;
  }

  return profile;
}

export async function redirectToRoleHome() {
  const profile = await getMyProfile();
  if (!profile) {
    window.location.href = "/pages/login.html";
    return;
  }
  window.location.href = roleToHome(profile.role_id);
}
