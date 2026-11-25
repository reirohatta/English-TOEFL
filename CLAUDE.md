# reiro TOEFL Drill

社内（@reiro.co.jp）専用の TOEFL iBT 対策 PWA。AI（Claude API）が毎回新しい問題を作って採点し、目標スコアまでの進み具合を追う。詳しい仕様は `SPEC.md`。

@AGENTS.md

## 守るルール（必須）

1. **API キーはサーバー側のみ。** `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `SUPABASE_SERVICE_ROLE_KEY` は Route Handler・Server Component など、サーバーで動くコードからだけ読む。`NEXT_PUBLIC_` を付けない。キーを使うモジュールには `import "server-only"` を書く。
2. **すべてのテーブルで RLS を有効にする。** 新しいテーブルを作るときは同じマイグレーションで `enable row level security` と `user_id = auth.uid()` のポリシーを書く。Storage も本人（または items の持ち主）だけ読めるポリシーにする。
3. **@reiro.co.jp 以外は拒否する。** Google ログインで `hd=reiro.co.jp` を指定したうえで、サーバー側でも必ず確認する（`src/proxy.ts`、`/auth/callback`、DB トリガー `handle_new_user`）。ドメイン判定は `src/lib/auth-domain.ts` の `isAllowedEmail` を使う。

その他:
- UI は日本語、問題文は英語。AI への指示は英語、解説は日本語で返させる。
- Claude が作った JSON は必ず zod で検証する（失敗したら1回だけ作り直す）。
- 推定スコアの換算は `src/lib/estimate.ts` に集約する（ステップ6）。非公式の目安と画面に書く。
- 実装は `SPEC.md` の「8. 開発の順番」に沿って1ステップずつ進め、各ステップの終わりで止めて確認方法を伝える。

## 技術スタック

- Next.js 16（App Router, TypeScript, Turbopack）+ React 19 + Tailwind CSS v4 → Vercel にデプロイ
- Supabase（Postgres / Auth の Google プロバイダ / Storage）。`@supabase/ssr` で Cookie セッション
- Claude API（問題生成・採点。メイン = Sonnet 系、軽量 = Haiku 系。モデル ID は環境変数）
- OpenAI（TTS / 文字起こし）
- PWA: `src/app/manifest.ts` + `public/sw.js`

### Next.js 16 の注意
- **Middleware は `proxy` に改名された。** ファイルは `src/proxy.ts`（`export function proxy`）。
- `cacheComponents` は**使っていない**（認証で Cookie を読む画面が中心のため、通常の動的レンダリングにしている）。
- 型ヘルパー `PageProps<"/path">` / `LayoutProps<"/path">` はグローバルに使える（`next build` / `next dev` で生成）。
- 書く前に `node_modules/next/dist/docs/` の該当ガイドを読むこと。

## ディレクトリ構成

```
src/
  proxy.ts                 # セッション更新・未ログイン/許可外ドメインの遮断
  app/
    layout.tsx             # ルート（lang=ja、viewport、SW 登録）
    manifest.ts            # PWA マニフェスト
    login/                 # ログイン画面（Google）
    auth/callback/route.ts # OAuth 戻り先。code→セッション、ドメイン確認
    auth/signout/route.ts  # POST でログアウト
    offline/               # オフライン画面（SW のフォールバック）
    (app)/                 # ログイン後の画面（ヘッダー + 下部タブ）
      page.tsx             # ホーム（ダッシュボード）
      practice/ review/ goals/
    api/                   # Route Handlers（ステップ2以降: generate / score / transcribe / attempts / dashboard）
  components/              # bottom-tabs, card, sw-register など
  lib/
    auth-domain.ts         # ALLOWED_EMAIL_DOMAIN と isAllowedEmail
    user.ts                # requireUser()（Server 用）
    supabase/              # client.ts（ブラウザ）/ server.ts（サーバー）/ proxy.ts
supabase/migrations/       # SQL（テーブル・RLS・トリガー・Storage）
public/                    # sw.js、icons/
scripts/generate-icons.cjs # アイコン PNG の生成（Playwright）
```

## コマンド

```bash
npm install          # 依存関係
npm run dev          # 開発サーバー http://localhost:3000
npm run build        # 本番ビルド（型チェック込み）
npm run start        # 本番サーバー（Service Worker は本番ビルドでのみ登録）
npm run lint         # ESLint
npx tsc --noEmit     # 型チェックのみ
node scripts/generate-icons.cjs   # アイコン再生成
```

DB の変更は `supabase/migrations/` に連番の SQL を追加し、Supabase の SQL Editor か `supabase db push` で適用する。

## 環境変数

`.env.example` をコピーして `.env.local` を作る。一覧は `SPEC.md` の「7. 環境変数」。`NEXT_PUBLIC_` が付くのは Supabase の URL / anon キーと、ログインボタン用の `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN` だけ。
