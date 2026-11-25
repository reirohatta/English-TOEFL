import type { Metadata } from "next";
import { Card, ComingSoon } from "@/components/card";

export const metadata: Metadata = { title: "目標" };

export default function GoalsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">目標</h1>
      <Card>
        <p className="mb-2 text-sm">目標スコア・受験日・週の学習量を設定します。</p>
        <ComingSoon step="ステップ6" />
      </Card>
    </div>
  );
}
