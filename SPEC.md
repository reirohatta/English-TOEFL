# reiro TOEFL Drill — 仕様書（Claude Code 向け）

社内（@reiro.co.jp）専用の TOEFL iBT 対策 Web アプリ。AI が毎回新しい問題を作り、採点し、目標スコアまでの進み具合を追う。

## 0. 決定事項

| 項目 | 決定 |
|---|---|
| 形態 | PWA（ホーム画面に追加して使う。スマホ優先、PC でも使える） |
| ログイン | Google ログイン、`@reiro.co.jp` のみ許可 |
| 基盤 | Next.js（App Router, TypeScript）＋ Vercel、Supabase（Postgres / Auth / Storage） |
| 問題生成・採点 | Claude API（サーバー側からのみ呼ぶ。キーはブラウザに出さない） |
| 音声 | 外部 API。読み上げ（TTS）とスピーキングの文字起こし（STT）。第一候補は OpenAI の TTS / 文字起こしモデル |
| 出題形式 | 2026年1月以降の新形式 TOEFL iBT に合わせる |
| 目標管理 | 目標スコア（合計・セクション別）＋受験日＋週の学習量 |

## 1. 出題範囲（新形式のタスク）

| セクション | タスク | アプリでの形式 |
|---|---|---|
| Reading | Complete the Words | 70〜90語の段落。10語の後半の文字を入力させる |
| Reading | Read in Daily Life | 掲示・メール・広告などの短文（60〜150語）＋4択3問 |
| Reading | Read an Academic Passage | 180〜250語のアカデミック文＋4択5問 |
| Listening | Listen and Choose a Response | 1文を聞き、最も自然な応答を4択から選ぶ（5問） |
| Listening | Listen to a Conversation | 2人の会話（8〜12ターン）＋4択2問 |
| Listening | Listen to an Announcement | キャンパスや職場のアナウンス＋4択2問 |
| Listening | Listen to an Academic Talk | 短い講義（200〜280語）＋4択4問 |
| Writing | Build a Sentence | 語句を並べ替えて返答文を作る（5問、ダミー語句1つ入り） |
| Writing | Write an Email | 状況と3つの要件を満たすメール（7分） |
| Writing | Write for an Academic Discussion | 教授の投稿と学生2人の意見に返信（10分） |
| Speaking | Listen and Repeat | 7文を聞いて繰り返す（文は短いものから長いものへ） |
| Speaking | Take an Interview | 4つの質問に各45秒で答える |

- 実装の前に ETS 公式の最新情報（https://www.ets.org/toefl/ibt/about/content/ ）で、タスク名・問題数・制限時間を確認し、差があれば公式に合わせる。
- **ETS 公式との照合状況（2026-11-25）**：開発環境から ets.org に接続できず、公式ページでの直接確認は未完了。公開情報（検索結果）では、上表の12タスク名はすべて一致。セクション時間の目安は Reading 約30分・Listening 約29分・Writing 約23分・Speaking 約8分、Write an Email 7分・Academic Discussion 10分（上表と一致）。Speaking は11問（Listen and Repeat 7 + Interview 4 と整合）。Writing は12問とする情報があり、本番の Build a Sentence は5問より多い（10問程度）可能性がある。順序は Reading → Listening → Writing → Speaking、Reading と Listening は途中で難易度が変わる適応型。**公式で確認できるまで上表の数値は変更しない。** 確認後、差があればここと上表を更新する。
- 難易度は3段階：易（band 3〜4 / CEFR B1）、標準（band 4〜5 / B2）、難（band 5〜6 / C1以上）。
- トピックは任意入力。空欄ならアプリ側でランダムに選ぶ（生物学、天文学、美術史、経済学、心理学、地質学、都市計画、言語学、環境科学、人類学、建築、マーケティング など）。

### 過去問の扱い
ETS は実際の本試験問題を公開していない。公式の練習問題にも著作権があるため、アプリには収録しない。代わりに以下の2つを用意する。
- **公式サンプル準拠モード**（切り替えスイッチ）：ETS が公開しているサンプル問題・練習テストの文体、長さ、設問の型、誤答選択肢の作り方に合わせて、内容は完全オリジナルで作る。
- 公式の無料練習テストへのリンクをホーム画面に置く。

## 2. 機能

### 2.1 認証
- Supabase Auth の Google プロバイダを使う。Google 側で `hd=reiro.co.jp` を指定する。
- サーバー側でもメールのドメインを確認する（middleware と、DB トリガーまたは Auth Hook の両方）。`@reiro.co.jp` 以外はログアウトさせる。
- 初回ログイン時に `profiles` の行を作る。

### 2.2 問題の生成
- `POST /api/generate` `{section, task, difficulty, topic?, officialStyle}` → Claude API で JSON の問題セットを作る → `items` に保存 → 返す。
- 問題を作るときは毎回ランダムな値を入れて、似た問題が続かないようにする。同じユーザーが直近に解いたトピックは避ける。
- 生成した JSON はスキーマ（zod）で検証する。失敗したら1回だけ作り直し、それでも失敗したらエラーを表示する。
- 待ち時間は数秒〜数十秒。スケルトン表示と「中止」ボタンを出す。ストリーミングは必須ではない。
- **先読み**：1セットを解いている間に、同じタスクの次のセットをバックグラウンドで1つ作っておく（`items.status = 'ready'`）。

### 2.3 リスニング音声（TTS）
- 問題を作ったらサーバー側でスクリプトを読み上げ、mp3 を Supabase Storage に保存する（`audio/{item_id}/{line}.mp3`）。再生するたびに作り直さない。
- 話者ごとに声を固定する（例：Woman / Man / Professor / Student / Announcer に別々の声）。
- 再生は1回のみ（本番どおり）。練習モードではもう一度聞ける。スクリプトは解答した後に表示する。
- iOS Safari ではユーザーが操作した後でないと音声を再生できない。最初の再生はボタンから行う。

### 2.4 スピーキング（録音と文字起こし）
- `MediaRecorder` で録音する（iOS Safari は `audio/mp4`、それ以外は `audio/webm`）。対応形式は `MediaRecorder.isTypeSupported` で判定する。
- `POST /api/transcribe` に音声を送って文字起こしする。音声ファイルは Storage に保存し、自分で再生できるようにする。
- Listen and Repeat：元の文と文字起こしを単語単位で比べ（LCS）、一致率と抜けた語・違った語を表示する。
- Interview：4問の文字起こしをまとめて Claude で採点する。
- 注意として、文字起こしからは発音や流暢さは分からない。採点は内容と語彙・文法をもとにした目安であることを画面に書く。録音の長さや無音の割合で、話す速さの目安だけは出す。

### 2.5 採点
- 選択式・穴埋め・並べ替え：クライアントで即時に採点する。各問に日本語の解説をつける。
- Writing（Email / Discussion）と Speaking（Interview）：`POST /api/score` で Claude が採点する。返す内容は band（1〜6、0.5刻み）、日本語の総評、良い点、改善点、修正例（最大5個、元の文→より良い文→理由）、高得点の模範解答。
- 採点結果は `attempts` に保存する。

### 2.6 目標と進捗
- **目標の設定**：目標スコア（合計とセクション別、1〜6 band。移行期間の 0〜120 換算も併せて表示）、受験日、週あたりの学習目標（分数とセット数）。
- **推定スコア**：セクションごとに直近の20回の結果から band を推定する（選択式は正答率を難易度で補正して band に換算、記述・スピーキングは AI 採点の band の平均）。データが5回未満なら「データ不足」と表示する。換算方法は `lib/estimate.ts` にまとめて、後で調整しやすくする。非公式の目安であることを画面に明記する。
- **ダッシュボード**：受験日までの残り日数、目標との差（セクション別）、推定スコアの推移グラフ、今週の学習量（目標に対する進み具合）、連続学習日数、苦手なタスクの上位3つ。
- **おすすめ**：目標との差が最も大きいセクションの、正答率が最も低いタスクを「次にやる1セット」として表示する。

### 2.7 復習
- 間違えた問題を一覧にする。もう一度解ける。
- 単語帳：解説に出てきた語や、ユーザーが保存した語をためる（任意）。

### 2.8 PWA
- `manifest.webmanifest`、アイコン、`display: standalone`、テーマカラーを設定する。
- Service Worker で画面の枠と、直近の音声・問題をキャッシュする。オフラインでは新しい問題を作れない旨を表示する。
- スマホ優先の UI。下部タブ（ホーム / 演習 / 復習 / 目標）を置く。

## 3. データモデル（Supabase）

```sql
profiles(id uuid pk = auth.users.id, email text, name text, created_at)
goals(user_id uuid pk, target_total numeric, target_reading numeric, target_listening numeric,
      target_writing numeric, target_speaking numeric, exam_date date,
      weekly_minutes int, weekly_sets int, updated_at)
items(id uuid pk, user_id uuid, section text, task text, difficulty text, topic text,
      official_style bool, payload jsonb, status text check (status in ('ready','served')),
      created_at)
attempts(id uuid pk, user_id uuid, item_id uuid, section text, task text, difficulty text,
         correct int, total int, band numeric null, response jsonb, feedback jsonb,
         duration_sec int, created_at)
mistakes(id uuid pk, user_id uuid, attempt_id uuid, item_id uuid, question_index int,
         resolved bool default false, created_at)
vocab(id uuid pk, user_id uuid, word text, meaning_ja text, example text, created_at)
```

- すべてのテーブルで RLS を有効にする。`user_id = auth.uid()` の行だけ読み書きできるようにする。
- Storage バケット `audio`（TTS、items の持ち主だけ読める）、`recordings`（録音、本人だけ読める）。

## 4. API（Next.js Route Handlers）

| ルート | 内容 |
|---|---|
| `POST /api/generate` | 問題を生成し、必要なら TTS も作る。`ready` の先読みがあればそれを返す |
| `POST /api/score` | Writing / Speaking を AI で採点する |
| `POST /api/transcribe` | 録音を文字起こしする |
| `POST /api/attempts` | 結果を保存し、間違えた問題を記録する |
| `GET /api/dashboard` | 推定スコア、学習量、おすすめを返す |

- 利用制限：1ユーザーあたり1日の生成と採点の回数に上限を置き、費用を抑える（初期値は生成60回・採点30回/日。環境変数で変えられるようにする）。

## 5. AI プロンプト（要点）

共通の指示（英語で渡す）：
> You are an expert TOEFL iBT item writer for the updated (2026) format. Create ONE wholly original practice set for the task below. Difficulty: {difficulty}. Topic: {topic}. Variation seed: {random}. Explanations must be in Japanese. Return ONLY JSON matching the schema.
> （公式サンプル準拠モードのとき）Model style, length, question stems and distractor logic closely on ETS's officially published TOEFL iBT sample questions, but never reproduce any real item.

タスクごとの JSON（zod スキーマにする）：
- `words`: `{title, text /* 10 words wrapped as [[word]], none in the first sentence */, notes_ja}`
  （アプリ側で語の前半 floor(n/2) 文字を見せ、残りを入力させる）
- `daily`: `{genre, title, text, questions:[{q, options[4], answer:0-3, explanation_ja}] /*3*/}`
- `academic`: 同じ形で `questions` を5問（語彙、事実、NOT/推論、修辞目的、要旨）
- `choose`: `{items:[{utterance, speaker:"female"|"male", options[4], answer, explanation_ja}] /*5*/}`
- `conversation` / `announcement` / `talk`: `{title, setting_ja, lines:[{speaker, text}], questions:[...]}`
- `build`: `{items:[{context, chunks:[正しい順], distractor, explanation_ja}] /*5*/}`
- `email`: `{situation, recipient, tasks[3], situation_ja}`
- `discussion`: `{course, professor:{name,text}, students:[{name,text},{name,text}], question_ja}`
- `repeat`: `{setting, setting_ja, sentences[7] /* 5→15 words */}`
- `interview`: `{topic, topic_ja, intro, questions[4] /* 体験→意見→抽象 */}`

採点：
- `writing`: `{band, summary_ja, strengths_ja[], improvements_ja[], corrections:[{original, better, why_ja}], model_answer}`
- `interview`: 上に加えて `per_question:[{comment_ja, better_answer}]`

モデルの使い分け：問題生成と記述の採点は標準クラス（Sonnet 系）、軽い処理は軽量クラス（Haiku 系）を使う。モデル ID は Anthropic のドキュメントで最新のものを確認し、環境変数で切り替えられるようにする。

## 6. 画面

1. ログイン
2. ホーム（ダッシュボード）：受験日までの残り日数、推定スコアと目標、今週の学習量、「次の1セット」ボタン
3. 演習：セクション → タスク → 難易度とトピック → 解答 → 結果と解説
4. 復習：間違えた問題、単語帳
5. 目標設定
6. 履歴：結果の一覧とグラフ

UI は日本語、問題文は英語。選択肢はマークシートのように A〜D の丸で表示する。各タスクに本番の目安時間のタイマーをつける（止めることもできる）。ライトとダークの両方に対応する。

## 7. 環境変数

```
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY / CLAUDE_MODEL_MAIN / CLAUDE_MODEL_FAST
OPENAI_API_KEY / TTS_MODEL / STT_MODEL
ALLOWED_EMAIL_DOMAIN=reiro.co.jp
DAILY_GENERATE_LIMIT=60 / DAILY_SCORE_LIMIT=30
```

## 8. 開発の順番

1. **土台**：Next.js、Supabase、Google ログイン（ドメイン制限）、RLS、PWA の枠、下部タブ
2. **Reading**：3タスクの生成、解答、採点、保存
3. **Listening**：TTS と Storage へのキャッシュ、4タスク
4. **Writing**：Build a Sentence と、AI 採点つきの2タスク
5. **Speaking**：録音、文字起こし、2タスク
6. **目標と進捗**：目標設定、推定スコア、ダッシュボード、おすすめ
7. **復習と仕上げ**：間違えた問題、単語帳、オフライン表示、利用制限、iPhone 実機での確認

各ステップの終わりに動作確認をする。特に音声の録音と再生は iPhone の Safari と、ホーム画面に追加した PWA の両方で確認する。
