# ポートフォリオサイト制作 要件定義書

## 1. 概要

ポち(aegisfleet)がこれまでに開発したプロジェクトを一覧化し、その技術力や実績をアピールするためのポートフォリオサイトを制作する。制作したサイトはGitHub Pagesで公開する。

## 2. 目的

- 自身のスキルセットと開発経験を分かりやすく提示する。
- 各プロジェクトへのアクセスを容易にする。

## 3. ターゲットユーザー

- 同じ技術分野に興味を持つ開発者

## 4. サイト構成と機能要件

### 4.1. 全体の構成

- **トップページ (index.html):** 自己紹介、スキル概要、主要プロジェクトへのリンクを掲載する。
- **プロジェクト一覧:** トップページ内に、掲載する全プロジェクトをカード形式などで表示する。

### 4.2. 掲載コンテンツ

#### 4.2.1. 自己紹介セクション

- 名前: ポち(aegisfleet)
- プロフィール概要
- SNSアカウントへのリンク
  - GitHub
    - <https://github.com/aegisfleet>
  - X (旧Twitter)
    - <https://x.com/aegisfleet>
  - Note
    - <https://note.com/aegisfleet>
  - Instagram
    - <https://www.instagram.com/aegisfleet>

#### 4.2.2. プロジェクト紹介セクション

以下のプロジェクトを掲載対象とする。各プロジェクトについて、最低限以下の情報を表示する。

- **プロジェクト名** Webサイトがあればタイトルをクリックするとそのサイトに遷移
- **概要説明:** プロジェクトが何をするものかを簡潔に説明。
- **実装で工夫している点:** 特に注力した技術的なポイントや工夫。
- **技術スタック:** 使用している主要な言語やライブラリ。
- **GitHubリポジトリへのリンク**

**掲載プロジェクト一覧:**

- share-deepresearch
  - <https://aegisfleet.github.io/share-deepresearch/>
- live-stream-summarizer
  - <https://aegisfleet.github.io/live-stream-summarizer/>
- mermaid-editor-genai
  - <https://mermaid-editor-genai.vercel.app/>
- svg-editor-genai
  - <https://svg-editor-genai.vercel.app/>
- voicevox2video
- github-trending-to-bluesky
  - <https://bsky.app/profile/dailygithubtrends.bsky.social>
- qiita-trending-to-bluesky
  - <https://bsky.app/profile/dailyqiitatrends.bsky.social>
- zenn-trending-to-bluesky
  - <https://bsky.app/profile/dailyzenntrends.bsky.social>
- genai-trending-to-bluesky
  - <https://bsky.app/profile/dailygenaitrends.bsky.social>
- hugging-face-trending-to-bluesky
  - <https://bsky.app/profile/huggingfacetrends.bsky.social>
- markets-trending-to-bluesky
  - <https://bsky.app/profile/dailymarkettrends.bsky.social>

## 5. デザイン・UI/UX要件

- **デザインコンセプト:** シンプルかつモダンで見やすいデザインを採用する。
- **カラースキーム:** ダークグレーとオレンジを基調とした配色。
- **レスポンシブ対応:** PC、タブレット、スマートフォンなど、異なるデバイスでの閲覧に最適化されたレイアウトにする。
- **UI:** 直感的に操作できるよう、分かりやすいナビゲーションを設置する。
- **アクセシビリティ:** リンクやボタンは十分なサイズを確保し、視覚的に明確にする。

## 6. 非機能要件

- **使用技術:**
  - HTML5
  - CSS3 (BootstrapなどのCSSフレームワークの利用を検討)
  - JavaScript (動的な要素を追加する場合)
- **ホスティング:** GitHub Pages (`aegisfleet.github.io`)
- **パフォーマンス:** 画像やリソースを最適化し、高速なページ読み込みを実現する。
- **メンテナンス性:** プロジェクトの追加や情報の更新が容易な構造にする。
