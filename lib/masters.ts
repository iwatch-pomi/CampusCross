import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Faculty, Field } from "./types";

export async function loadMasters(supabase: SupabaseClient) {
  const [{ data: faculties }, { data: fields }] = await Promise.all([
    supabase.from("faculties").select("*").order("sort_order"),
    supabase.from("fields").select("*").order("sort_order"),
  ]);
  const facultyList = (faculties ?? []) as Faculty[];
  const fieldList = (fields ?? []) as Field[];
  return {
    faculties: facultyList,
    fields: fieldList,
    facultyName: Object.fromEntries(facultyList.map((f) => [f.id, f.name])) as Record<string, string>,
    fieldLabel: Object.fromEntries(fieldList.map((f) => [f.code, f.label])) as Record<string, string>,
  };
}

export async function loadContact(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("profile_private")
    .select("university_email, contact_email, notify_by_email")
    .eq("user_id", userId)
    .single();
  return data ?? { university_email: "", contact_email: null, notify_by_email: true };
}
