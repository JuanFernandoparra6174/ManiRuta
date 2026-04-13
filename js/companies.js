import { supabase } from "./supabaseClient.js";

export async function fetchCompanies() {
    const { data, error } = await supabase.from('companies').select('*');
    if (error) throw error;
    return data;
}

export async function createCompany({ name, nit, phone, email, address }) {
    const { error } = await supabase.from('companies').insert([{
        id: crypto.randomUUID(),
        name, nit, phone, email, address,
        status: 'ACTIVE',
        created_at: new Date().toISOString()
    }]);
    if (error) throw error;
}
// Agrega esto al final de tu archivo js/companies.js

export async function createCompanyWithAccount({ name, nit, email, password }) {
    // 1. Generamos un ID único para la empresa
    const newCompanyId = crypto.randomUUID();

    // 2. Creamos la empresa en la tabla 'companies'
    const { error: compErr } = await supabase.from('companies').insert([{
        id: newCompanyId,
        name, 
        nit, 
        email,
        status: 'ACTIVE',
        created_at: new Date().toISOString()
    }]);

    if (compErr) throw new Error("Error al crear la empresa: " + compErr.message);

    // 3. Creamos el usuario de acceso en Supabase Auth
    const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: { 
                username: name.replace(/\s+/g, '').toLowerCase(), // Crea un username sin espacios
                phone: null
            }
        }
    });

    if (authErr) throw new Error("Error al crear el usuario: " + authErr.message);

    // 4. Vinculamos el usuario recién creado con el Rol de Empresa (2) y su company_id
    if (authData?.user) {
        const { error: updateErr } = await supabase
            .from('users')
            .update({ 
                role_id: 2, 
                company_id: newCompanyId 
            })
            .eq('id', authData.user.id);

        if (updateErr) console.error("Aviso: Revisa si el trigger de Supabase tardó en crear el usuario", updateErr);
    }

    return true;
}