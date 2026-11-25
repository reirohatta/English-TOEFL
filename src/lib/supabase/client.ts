import { createBrowserClient } from "@supabase/ssr";

/** ブラウザ用。anon（publishable）キーのみを使う。service role キーは絶対に使わない。 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
