## Why

Starter は 5-hour Timeline の制御面であって、専用ステータスページではない。3 タブ化のあと入口が Settings の一行に沈み、プロバイダー一覧と Activity 500 件が別リストのまま大きい。ログはプロバイダーカードに畳む。

## What Changes

- `window-starter` スクリーンを廃止する。Window Starter は Timeline のプロット（または empty state）の下に置く。
- Settings の Window Starter nav-row を消す。入口は Timeline タブ。
- フラットなプロバイダー行 + 全体 Activity をやめる。Overview と同じくプロバイダーごとにカード。折りたたみは現在ステータス（窓の最新ログのアイコンと日付を含む）、展開でそのプロバイダーの最新ログ最大 5 件（タイトルにランナー名）。
- Antigravity は Session / Claude を 1 カードにまとめ、ステータスは窓ごと、ログは混在の新しい 5 件。
- Auto-start スイッチはセクション先頭のコンパクトなカードに残す。
- コンテキストメニュー（On/Off、Customize…、Run now…）と確認ダイアログは残す。永続化 500 件はロック用に残し、UI はカードあたり 5 件。
- 時刻指定スタートはこの Change に含めない。

## Capabilities

### New Capabilities

- なし。

### Modified Capabilities

- `window-starter`: 専用ページを Timeline セクションへ。カード化、ログ 5 件、Settings 行なし。
- `ui-navigation`: スクリーン集合から `window-starter` を外す。ネスト・Back・Enter・Settings タブ点灯から外す。
- `ui-surfaces`: Settings の Window Starter nav-row を消す。
- `quota-reset-timeline`: Timeline の下に Window Starter セクション。
- `usage-refresh`: Window Starter 専用ヘッダーの countdown を消す（画面自体が無い）。

## Impact

- `timeline.svelte` / `window-starter.svelte` / `app-content.svelte`
- `app-ui-controller` / `panel-controller` / `plugin-views`
- `settings.svelte`（WS 行削除）
- `docs/window-starter.md`
- Rust / 設定キー / plugin 契約 / 500 件ストアは無変更
