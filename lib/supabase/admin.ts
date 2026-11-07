import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * service role の Supabase クライアント（RLS を無視する）。
 * 通知メールの宛先（相手の profile_private）を読む用途にだけ使う。
 * キーが未設定なら null を返す。
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
