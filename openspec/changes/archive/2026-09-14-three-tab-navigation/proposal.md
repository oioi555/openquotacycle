## Why

ナビが Options メニューに沈んでいて、Overview にワンタップで戻れない。承認済みの 3 タブ（Overview / Timeline / Settings）が本体。モックから自動更新の残りが抜けていたので、ヘッダー Refresh にコンパクトなカウントダウンを載せる（A案）。

## What Changes

- フッターは Overview | Timeline | Settings の 3 タブ。ネスト中も残る。Overview は常に 1 タップ。
- Help を廃止。Options を廃止。バージョン行はフッターから消す。
- About は Settings の一行（既存ダイアログを開く）。Customize / Window Starter は Settings から潜る。
- Timeline と Settings はルートタブ。戻るは無し。ネスト（Customize / Window Starter / Customize L2）だけ戻る。Settings タブは Settings 配下で点灯、Timeline カスタムは Timeline タブ。
- Timeline 下部の Customize / Window Starter 行を消す。カード編集はヘッダー右のスライダー。Customize 一覧の Settings 行も消す（親は Back と Settings タブ）。
- 自動更新の残りは Overview ヘッダー左に砂時計 + `4m` / `12s` / `Off`。Refresh は右のアイコンのみ。Window Starter は Back があるので Refresh にコンパクト `4m` / `Off`。文面は tooltip / aria。

## Capabilities

### New Capabilities

- なし。

### Modified Capabilities

- `ui-navigation`: 3 タブ、ルートタブの戻る無し、ネストの親、キーボード、Options/Help 廃止、About は Settings。
- `ui-surfaces`: Customize の Settings 行と Timeline のショートカット行を削除。Options トリガーの lift を削除。Settings に About 行。
- `usage-refresh`: カウントダウンはトップバー Refresh。コンパクトフェイス。
- `quota-reset-timeline`: Timeline はルートタブ。下部ショートカット無し。ヘッダーはスライダー。
- `window-starter`: 入口は Settings の行。Options と Timeline からは入らない。

## Impact

- `panel-footer.svelte`（タブ）、`options-menu.svelte` 削除
- `app-shell.svelte` / `top-bar.svelte` / `app-ui-controller` / `panel-controller`
- `settings.svelte`（About 行）、`timeline.svelte`（下部行削除）、`customize.svelte`（Settings 行削除）
- 既存のヘッダーカウントダウン実装は残す
- Rust / 設定キー / plugin 契約は無変更
