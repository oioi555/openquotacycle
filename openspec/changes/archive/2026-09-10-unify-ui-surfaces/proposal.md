## Why

`align-visual-with-openquota` は画面ごとの class 狩りで契約がズレ続け、終わらなくなったため廃棄した。見た目は OpenQuota に寄っているが、面の語彙が無く、半径・メーター・警告のたびに全画面を直している。今の寄せを一枚の契約に固定し、以後はトークンと面レシピだけを変える。

## What Changes

- トレイ / カード / メーター / 警告のトークンを `src/index.css` に揃え、未使用の shadcn トークン (sidebar / chart / page-accent) を落とす。
- 面レシピを 1 箇所に置く: `card`, `list`, `nav-row`, `notice`。画面はこれを使う。同じ面を utility のコピペで再定義しない。
- 現行の見た目を正とする: パネル半径 6px、メーター 2px、通常 fill はブランド緑、警告 / 臨界は黄 / 赤、plugin error は warning コールアウト。
- Customize L1 と Settings の相互 `nav-row` を正規のショートカットとして残す。
- Tailwind v4 と bits-ui は維持する。OpenQuota の 4 ファイル CSS へは置換しない。

**Out of scope:** Settings を OpenQuota の grouped row + SelectMenu に組み替えること。Cost 集約。古い visual spec のピクセル復元 (12px カード、5px 青メーター)。

## Capabilities

### New Capabilities
- `ui-surfaces`: トレイ上のカード面、メーターの色と太さ、警告コールアウト、画面間 nav-row の視覚契約。

### Modified Capabilities
- `ui-navigation`: Options は二次画面のカタログのまま。Customize ↔ Settings の nav-row を追加ショートカットとして認める (dashboard の Cost / Resets ティーザーと同型)。

## Impact

- `src/index.css` のトークンと `@utility` 面レシピ。
- 面クラスを直書きしている pages / components (`overview`, `settings`, `customize*`, `cost`, `resets`, `window-starter`, `provider-card`, `total-spend`, `plugin-error`, `alert`, `progress`, `timeline-section`)。
- class をピンしている vitest。Rust / 永続化 / plugin 契約は触らない。
- 廃棄済み `align-visual-with-openquota` の `dashboard-visual` は main に未同期。復元しない。
