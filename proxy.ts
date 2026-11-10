import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // 本番は正式なドメイン（APP_URL）だけで使う。*.vercel.app で開くとログインの cookie が別になり、
  // ドメインごとにログインし直すことになるため、正式なドメインへ転送する（プレビュー環境は対象外）
  const canonical = canonicalRedirect(request);
  if (canonical) return canonical;
  return updateSession(request);
}

function canonicalRedirect(request: NextRequest): NextResponse | null {
  if (process.env.VERCEL_ENV !== "production" || !process.env.APP_URL) return null;
  const target = new URL(process.env.APP_URL);
  const host = request.headers.get("host");
  if (!host || host === target.host || !host.endsWith(".vercel.app")) return null;
  const url = request.nextUrl.clone();
  url.protocol = target.protocol;
  url.host = target.host;
  url.port = "";
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
