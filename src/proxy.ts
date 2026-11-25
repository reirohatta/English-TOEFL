import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // 静的ファイル・PWA 関連ファイルは除外
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|apple-icon.png|.*\\.(?:png|jpg|jpeg|svg|webp|ico|mp3|txt)$).*)",
  ],
};
