import type { Metadata } from "next";
import { Card, ComingSoon } from "@/components/card";
import { requireUser } from "@/lib/user";

export const metadata: Metadata = { title: "ホーム" };

export default async function HomePage() {
  const { name, supabase, id } = await requireUser();
  // RLS の確認用：自分の profiles 行だけが読める
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("email, name, created_at")
    .eq("id", id)
    .maybeSingle();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">こんにちは、{name} さん</h1>

      <Card title="受験日までの残り日数 / 推定スコア">
        <ComingSoon step="ステップ6（目標と進捗）" />
      </Card>

      <Card title="次の1セット">
        <ComingSoon step="ステップ2以降" />
      </Card>

      <Card title="アカウント（接続確認）">
        {error ? (
          <p className="text-sm text-danger">
            profiles を読めませんでした：{error.message}（マイグレーションが未適用の可能性があります）
          </p>
        ) : profile ? (
          <dl className="grid grid-cols-[6rem_1fr] gap-y-1 text-sm">
            <dt className="text-muted">メール</dt>
            <dd className="break-all">{profile.email}</dd>
            <dt className="text-muted">登録日</dt>
            <dd>{new Date(profile.created_at).toLocaleDateString("ja-JP")}</dd>
          </dl>
        ) : (
          <p className="text-sm text-danger">profiles の行が見つかりません（トリガーを確認してください）。</p>
        )}
      </Card>

      <Card title="公式の無料練習">
        <a
          href="https://www.ets.org/toefl/test-takers/ibt/prepare/practice-tests.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-brand underline-offset-2 hover:underline"
        >
          ETS 公式の無料練習テストを開く ↗
        </a>
      </Card>
    </div>
  );
}
