import type { Metadata } from "next";
import { Card, ComingSoon } from "@/components/card";

export const metadata: Metadata = { title: "演習" };

export default function PracticePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">演習</h1>
      <Card>
        <p className="mb-2 text-sm">セクション → タスク → 難易度とトピックを選んで解きます。</p>
        <ComingSoon step="ステップ2〜5" />
      </Card>
    </div>
  );
}
