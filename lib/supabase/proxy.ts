import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/guidelines"];

/** セッション cookie を更新し、未ログインならログイン画面へ送る */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers ?? {}).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // createServerClient と getUser の間に処理を挟まないこと（セッションが切れる原因になる）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!user && !isPublic) {
    return redirectKeepingCookies(request, response, "/login");
  }
  // ログイン済みで紹介ページを開いたらホームへ。ただしページ遷移（ドキュメント要求）のときだけ。
  // プリフェッチや RSC の要求までリダイレクトすると、クライアントのルーターが遷移をくり返してしまう
  if (user && pathname === "/login" && isDocumentRequest(request)) {
    return redirectKeepingCookies(request, response, "/");
  }

  return response;
}

/** ブラウザのページ遷移（HTML の要求）か。fetch による RSC 要求やプリフェッチは false */
function isDocumentRequest(request: NextRequest): boolean {
  const dest = request.headers.get("sec-fetch-dest");
  if (dest) return dest === "document";
  return request.headers.get("accept")?.includes("text/html") ?? false;
}

function redirectKeepingCookies(request: NextRequest, from: NextResponse, path: string) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}
