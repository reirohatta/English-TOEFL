import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail } from "@/lib/auth-domain";

/** ログインなしで開けるパス */
const PUBLIC_PATHS = ["/login", "/auth/callback", "/offline"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/**
 * セッションを更新し、未ログインと許可外ドメインを弾く。
 * 許可外ドメインは signOut して /login?error=domain へ。
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
          Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    },
  );

  // getClaims() は JWT を検証する。createServerClient と getClaims の間に処理を挟まないこと。
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const email = typeof claims?.email === "string" ? claims.email : null;
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  const redirectTo = (path: string, search = "") => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = search;
    const res = NextResponse.redirect(url);
    // セッション更新・signOut で付いた Cookie を引き継ぐ
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (claims && !isAllowedEmail(email)) {
    await supabase.auth.signOut();
    if (isApi) {
      return NextResponse.json({ error: "forbidden_domain" }, { status: 403 });
    }
    return redirectTo("/login", "?error=domain");
  }

  if (!claims && !isPublic(pathname)) {
    if (isApi) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return redirectTo("/login");
  }

  if (claims && pathname === "/login") {
    return redirectTo("/");
  }

  return response;
}
