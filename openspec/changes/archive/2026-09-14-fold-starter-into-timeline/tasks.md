## 1. Spec surface

- [x] 1.1 Timeline 下部に Auto-start + プロバイダーカード。専用 `window-starter` スクリーンと Settings 行を削除
- [x] 1.2 カードは折りたたみ=ステータス、展開=そのプロバイダーの最新 5 件。Antigravity は 1 カード 2 ステータス行
- [x] 1.3 ステータス行にその窓の最新ログのアイコンと日付。展開ログのタイトルにランナー名（マルチ窓は `Window · runner`）

## 2. Navigation

- [x] 2.1 `FIXED_SCREENS` / rank / `backScreen` / `screenTitle` から `window-starter` を外す
- [x] 2.2 `app-content` は Timeline に Starter props を渡し、WS 分岐を消す

## 3. Finish

- [x] 3.1 window-starter / timeline / settings / app-ui / panel-controller テスト
- [x] 3.2 `docs/window-starter.md` を Timeline セクション前提に更新
- [x] 3.3 `bunx vitest run` 対象、`bunx svelte-check --threshold error`、`openspec validate fold-starter-into-timeline --strict`
