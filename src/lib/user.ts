import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth-domain";

/** ログイン中のユーザーを返す。未ログイン・許可外ドメインならログイン画面へ。 */
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || !isAllowedEmail(user.email)) {
    redirect("/login");
  }
  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email!.split("@")[0];
  return { id: user.id, email: user.email!, name, supabase };
}
