## Why

Settings はタイトルをカード内に置き、チェックボックスとウィットなサブタイトルが残っていて、先に揃えた Customize / Window Starter とズレている。Overview はライトテーマで 2px メーターと Peak ラベルが沈み、展開はシェブロン以外押せない。押せるコントロールは色が変わるだけで、押せる感じが出ない。

## What Changes

- Settings を OpenQuota と同じ grouped rows にする。見出しは `text-sm font-semibold`。複数選択は右端の compact menu。Start on Login は行の Switch。ウィットなサブタイトルは消す。Settings のヘッダー右はデフォルトへリセット。Auto Refresh は 5/15 分のみ、初期値 5 分。
- Overview の展開可能なプロバイダーカードは、`ui-card` 面クリックでもトグルする。シェブロンは今まで通り出す。入れ子の操作（used/left、reset chip、wake、quick links）は展開を発火しない。ヘッダー行は対象外。
- ダッシュボードの verdict meter を 4px にする。ペース tick はバーからはみ出して見える長さ（2×12px）にする。塗り最小幅も 4px。Timeline 画面の軸トラックは 2px のまま。
- `danger` のステータス chip（Peak など）はメーターの critical 色を使う。
- 押せるボタンはホバーで色だけでなく浮く（わずかな translate + shadow）。used/left と reset chip も同じ。画面間 nav-row と compact outline chip（Settings menu、Record Shortcut、Customize L2 runner、Options）も同じ。プロバイダーの `ui-card` 本体も浮き、ホバーでカード全体の背景が変わる。展開シェブロンは単独で浮けない（細い帯だけ反応するのを防ぐ）。Switch と Settings の list 面は浮けない。`prefers-reduced-motion` では移動しない。
- Settings 下部は Timeline と同じく Customize と Window Starter の nav-row。

## Capabilities

### New Capabilities

- なし。

### Modified Capabilities

- `ui-surfaces`: Settings の grouped rows と compact menu。Settings ヘッダーは Reset settings。Settings に Window Starter nav-row。メーター 4px と 12px pace tick。押せるボタン・nav-row・compact chip のホバー浮き。プロバイダーカード本体のホバー浮きと全面背景。two-row フェイスのメーター高を 4px に更新。
- `ui-navigation`: Settings から Customize と Window Starter へ行ける。
- `window-starter`: Settings の shortcut row も入口。字幕は `Start idle 5-hour windows`。
- `usage-refresh`: Auto Refresh は 5/15 分、初期値 5 分。30/60 の保存値は default へ落とす。
- `overview-metrics`: 展開可能カードは `ui-card` 面クリックでもトグル。シェブロンは残す。
- `provider-status`: `danger` chip は `--meter-critical`（メーター赤と同じ）。
- `quota-reset-timeline`: 軸トラックは 2px のまま。ダッシュボードメーター高とは独立。

## Impact

- `src/svelte/pages/settings.svelte` と `settings.test.ts`、`timeline.svelte`、`customize.svelte`、`global-shortcut-section.svelte`、`settings-select.svelte`、`options-menu.svelte`、`customize-provider.svelte`
- `src/svelte/components/app-shell.svelte`、`settings-controller.svelte.ts`
- `src/svelte/components/ui/progress.svelte`、`ui.test.ts`、`skeleton-lines.svelte`
- `src/svelte/components/provider-card.svelte`、`provider-card.test.ts`
- `src/svelte/components/ui/button.svelte` とテキスト操作のホバー
- `src/index.css`（共有 lift utility）
- `src/svelte/components/metric-line-progress.svelte`
- `src/lib/settings.ts`（Auto Refresh 5/15、default 5）
- Rust / 設定キー / plugin 契約は無変更
