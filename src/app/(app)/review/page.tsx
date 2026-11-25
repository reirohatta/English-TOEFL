import type { Metadata } from "next";
import { Card, ComingSoon } from "@/components/card";

export const metadata: Metadata = { title: "復習" };

export default function ReviewPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">復習</h1>
      <Card>
        <p className="mb-2 text-sm">間違えた問題と単語帳をここで見直します。</p>
        <ComingSoon step="ステップ7" />
      </Card>
    </div>
  );
}
