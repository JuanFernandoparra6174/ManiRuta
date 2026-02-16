import { supabase } from "./supabaseClient.js";

const PASSENGER_ROLE_ID = 1; // 1 PASAJERO, 2 EMPRESA_BUSES, 3 SUPER_ADMIN

export async function signUpPassenger({ username, email, phone, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username, phone } }
  });
  if (error) throw error;

  // Si session es null, hay verificación por correo activada
  const needsEmailConfirm = !data.session;

  return { authUser: data.user, needsEmailConfirm };
}
  if (error) throw error;

  const authUser = data.user;
  if (!authUser) throw new Error("No se pudo crear el usuario en Auth.");

  // 2) Insertar perfil en tu tabla public.users
  const { error: insertErr } = await supabase.from("users").insert({
    id: authUser.id,
    username,
    email,
    phone: phone || null,
    password_hash: "managed_by_supabase_auth",
    role_id: PASSENGER_ROLE_ID,
    company_id: null,
    status: "ACTIVE",
    mfa_enabled: false,
    created_at: new Date().toISOString()
  });

  if (insertErr) throw insertErr;

  // Si session viene null, normalmente hay confirmación por correo activa
  const needsEmailConfirm = !data.session;

  return { authUser, needsEmailConfirm };
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

