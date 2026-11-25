import Link from "next/link";
import { BottomTabs } from "@/components/bottom-tabs";
import { requireUser } from "@/lib/user";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className="sticky top-0 z-10 border-b border-line bg-background/90 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-4">
          <Link href="/" className="font-bold tracking-tight">
            reiro TOEFL Drill
          </Link>
          <form action="/auth/signout" method="post" className="flex items-center gap-3">
            <span className="hidden text-xs text-muted sm:inline">{user.email}</span>
            <button type="submit" className="text-xs text-muted underline-offset-2 hover:underline">
              ログアウト
            </button>
          </form>
        </div>
      </header>
      <main
        className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4"
        style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}
      >
        {children}
      </main>
      <BottomTabs />
    </div>
  );
}
