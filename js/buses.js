// js/buses.js
import { supabase } from "./supabaseClient.js";

export const BUS_STATUSES = ["ACTIVE", "MAINTENANCE", "INACTIVE"];

export async function fetchCompanyBuses(companyId) {
  let q = supabase
    .from("buses")
    .select("id, company_id, plate, internal_code, status, created_at, updated_at")
    .order("created_at", { ascending: false });

  // Si tienes company_id en el perfil, filtramos por seguridad + claridad
  if (companyId) q = q.eq("company_id", companyId);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function createBus({ company_id, plate, internal_code, status }) {
  const now = new Date().toISOString();

  const payload = {
    id: crypto.randomUUID(),
    company_id,
    plate,
    internal_code: internal_code || null,
    status,
    created_at: now,
    updated_at: now,
  };

  const { error } = await supabase.from("buses").insert([payload]);
  if (error) throw error;
}

export async function updateBus(id, companyId, fields) {
  const payload = {
    ...fields,
    updated_at: new Date().toISOString(),
  };

  let q = supabase.from("buses").update(payload).eq("id", id);
  if (companyId) q = q.eq("company_id", companyId);

  const { error } = await q;
  if (error) throw error;
}

export async function deleteBus(id, companyId) {
  let q = supabase.from("buses").delete().eq("id", id);
  if (companyId) q = q.eq("company_id", companyId);

  const { error } = await q;
  if (error) throw error;
}

export async function countCompanyBusesByStatus(companyId) {
  const countOne = async (status) => {
    let q = supabase
      .from("buses")
      .select("id", { count: "exact", head: true })
      .eq("status", status);

    if (companyId) q = q.eq("company_id", companyId);

    const { count, error } = await q;
    if (error) throw error;
    return count || 0;
  };

  const [active, maintenance, inactive] = await Promise.all([
    countOne("ACTIVE"),
    countOne("MAINTENANCE"),
    countOne("INACTIVE"),
  ]);

  return { active, maintenance, inactive, total: active + maintenance + inactive };
}
