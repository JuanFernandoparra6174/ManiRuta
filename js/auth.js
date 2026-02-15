import { supabase } from "./supabaseClient.js";

const PASSENGER_ROLE_ID = 1; // 1 PASAJERO, 2 EMPRESA_BUSES, 3 SUPER_ADMIN

export async function signUpPassenger({ username, email, phone, password }) {
  // 1) Auth (Supabase hashea la contraseña)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username, phone } }
  });
  if (error) throw error;

  const authUser = data.user;
  if (!authUser) throw new Error("No se pudo crear el usuario (Auth).");

  // 2) Perfil en tu tabla users
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
  return authUser;
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
