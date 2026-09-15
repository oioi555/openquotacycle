## Why

Dashboard の next-reset ティーザーはカードではなく、週次が隠れ、Resets という名前も Timeline の実体とずれていた。実装はすでに Timeline カード / ページ / Customize まで入っている。事後 Change として、その契約を main スペックに載せる形に固定する。

## What Changes

- Dashboard の next-reset ティーザーを、プロバイダーカードと同型の Timeline カードに置き換える（5-hour / Weekly の最大2行、アイコン+残り時間、横一列、はみ出しはドラッグ）。
- ユーザー向け名称を Resets から Timeline にする。画面 id を `resets` から `timeline` に、ページを `resets.svelte` から `timeline.svelte` にリネームする。`customize:timeline` は Customize 子画面のまま。
- Customize 先頭に Timeline の独立スイッチを置き、L2 `customize:timeline` でカード行の表示を切り替える。Always Visible / On Demand の DnD は付けない。
- Timeline カードにプロバイダーと同型のコンテキストメニュー（Customize… / Hide Timeline）と共有ツールチップを付ける。
- Timeline ページは散布図のまま全 cadence を出し、ヘッダー Refresh は出さない。ページ下部に Customize と Window Starter の `ui-nav-row` を置く。
- ユーザー向け cadence 名は `5-hour` / `Weekly`。クォータラベル `Five-hour window` とロック間隔の `five hours` は変えない。
- 展開ボタンの無い Overview カードは、展開行の高さを予約せず上下パディングを揃える。
- Reset All は Timeline のカード行を両方表示に戻し、カード自体の表示 (`timelineCardVisible`) は触らない。

**Out of scope:** Timeline への Always Visible / On Demand。Cost 集約。`timelineCardVisible` のデフォルトを off にすること。capability 名 `quota-reset-timeline` のリネーム。

## Capabilities

### New Capabilities

- なし（既存 capability の要件変更）。

### Modified Capabilities

- `quota-reset-timeline`: ページタイトル Timeline、ヘッダー Refresh なし、ショートカット行、ラベル常時表示、散布図プロット、ユーザー向け `5-hour` ラベル。
- `ui-navigation`: `customize:timeline`、Options の Timeline、Dashboard Timeline カード、キーボード/戻る。
- `ui-surfaces`: Timeline の nav-row、カード独立表示、コンテキストメニュー、共有ツールチップ。
- `overview-metrics`: 展開なしカードは展開行高を予約せず、上下パディングを揃える。
- `customization-reset`: Reset All は Timeline 行を両方表示に戻し、カード表示は変えない。
- `window-starter`: ユーザー向けコピーを `5-hour` に揃え、Timeline からも入れる。

## Impact

- UI: `timeline-card.svelte`, `timeline-context-menu.svelte`, `customize-timeline.svelte`, `timeline.svelte`, `overview.svelte`, `customize.svelte`, `window-starter.svelte`, `app-shell.svelte`, `top-bar`, `provider-card.svelte`, `quota-reset-timeline/*`.
- 永続化: `settings.json` の `timelineCardVisible`（既定 true）と `timelineCardRows`（既定 both）。スキーマ破壊なし。画面 id はメモリ上の `Screen` だけなので設定マイグレーションは不要。
- 画面 id `timeline`。Customize 子は `customize:timeline`。内部 cadence id `five-hour` / `weekly` は据え置き。
- テスト: overview / timeline / customize / timeline-card / settings / top-bar / provider-card。
- Rust / plugin 契約は触らない。

## Preceding specification baseline

`unify-ui-surfaces` と `compact-progress-two-line` が直前の面契約。本 Change はそれらを上書きする。アーカイブすると main スペックが Timeline 契約になる。実装はすでに working tree にある。
