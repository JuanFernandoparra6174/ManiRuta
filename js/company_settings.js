// js/company_settings.js
import { supabase } from "./supabaseClient.js";

export const COMPANY_STATUSES = ["ACTIVE", "INACTIVE"];

export async function fetchCompanyById(companyId) {
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, nit, phone, email, address, status, created_at, updated_at")
    .eq("id", companyId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateCompany(companyId, fields) {
  const payload = {
    ...fields,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("companies")
    .update(payload)
    .eq("id", companyId);

  if (error) throw error;
}
