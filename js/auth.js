import { supabase } from "./supabaseClient.js";

// =============================
// SIGN UP PASAJERO
// =============================
export async function signUpPassenger({ username, email, phone, password }) {

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, phone }
    }
  });

  if (error) throw error;

  // Si session es null → necesita confirmar correo
  const needsEmailConfirm = !data.session;

  return {
    authUser: data.user,
    needsEmailConfirm
  };
}


// =============================
// LOGIN
// =============================
export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data.user;
}


// =============================
// LOGOUT
// =============================
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

