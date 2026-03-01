import { supabase } from "./supabaseClient.js";
import { getMyProfile } from "./profile.js";

function roleToHome(roleId) {
  // Como ya estás dentro de la carpeta /pages/, solo necesitas el nombre del archivo
  if (roleId === 1) return "home_passenger.html";
  if (roleId === 2) return "home_company.html";
  if (roleId === 3) return "home_admin.html";
  return "login.html";
}

export async function requireAuthAndRole(expectedRoleId = null) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    // CORREGIDO: Quitado "pages/"
    window.location.href = "login.html";
    return;
  }

  const profile = await getMyProfile();
  
  if (!profile || profile.status !== "ACTIVE") {
    await supabase.auth.signOut();
    // CORREGIDO: Quitado "pages/"
    window.location.href = "login.html";
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
    // CORREGIDO: Quitado "pages/"
    window.location.href = "login.html";
    return;
  }
  window.location.href = roleToHome(profile.role_id);
}

