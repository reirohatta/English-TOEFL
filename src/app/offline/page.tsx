import type { Metadata } from "next";

export const metadata: Metadata = { title: "オフライン" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-bold">オフラインです</h1>
      <p className="mt-3 text-sm text-muted">
        インターネットに接続されていないため、新しい問題は作れません。接続が戻ったら再読み込みしてください。
      </p>
    </main>
  );
}
