import type { Metadata } from "next";
import { LoginButton } from "./login-button";

export const metadata: Metadata = { title: "ログイン" };

const ERRORS: Record<string, string> = {
  domain: "@reiro.co.jp のアカウントでのみログインできます。別のアカウントでログインしてください。",
  auth: "ログインに失敗しました。もう一度お試しください。",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center px-6 py-12">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-2xl font-bold text-white">
          T
        </div>
        <h1 className="text-2xl font-bold">reiro TOEFL Drill</h1>
        <p className="mt-2 text-sm text-muted">
          AI が毎回新しい問題を作る、社内向けの TOEFL iBT 対策アプリ
        </p>
      </div>

      {message && (
        <p role="alert" className="mb-4 w-full rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          {message}
        </p>
      )}

      <LoginButton />

      <p className="mt-6 text-center text-xs text-muted">
        @reiro.co.jp のアカウントのみ利用できます
      </p>
    </main>
  );
}
