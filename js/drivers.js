// js/drivers.js
import { supabase } from "./supabaseClient.js";

export const DRIVER_STATUSES = ["ACTIVE", "INACTIVE"];
export const DRIVER_DOC_TYPES = ["CC", "CE", "PASSPORT"];

export async function fetchCompanyDrivers(companyId) {
  let q = supabase
    .from("drivers")
    .select("id, company_id, full_name, doc_type, doc_number, phone, license_no, status, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (companyId) q = q.eq("company_id", companyId);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function createDriver({ company_id, full_name, doc_type, doc_number, phone, license_no, status }) {
  const now = new Date().toISOString();

  const payload = {
    id: crypto.randomUUID(),
    company_id,
    full_name,
    doc_type,
    doc_number,
    phone: phone || null,
    license_no,
    status,
    created_at: now,
    updated_at: now,
  };

  const { error } = await supabase.from("drivers").insert([payload]);
  if (error) throw error;
}

export async function updateDriver(id, companyId, fields) {
  const payload = {
    ...fields,
    updated_at: new Date().toISOString(),
  };

  let q = supabase.from("drivers").update(payload).eq("id", id);
  if (companyId) q = q.eq("company_id", companyId);

  const { error } = await q;
  if (error) throw error;
}

export async function deleteDriver(id, companyId) {
  let q = supabase.from("drivers").delete().eq("id", id);
  if (companyId) q = q.eq("company_id", companyId);

  const { error } = await q;
  if (error) throw error;
}

export async function countCompanyDriversByStatus(companyId) {
  const countOne = async (status) => {
    let q = supabase
      .from("drivers")
      .select("id", { count: "exact", head: true })
      .eq("status", status);

    if (companyId) q = q.eq("company_id", companyId);

    const { count, error } = await q;
    if (error) throw error;
    return count || 0;
  };

  const [active, inactive] = await Promise.all([
    countOne("ACTIVE"),
    countOne("INACTIVE"),
  ]);

  return { active, inactive, total: active + inactive };
}
