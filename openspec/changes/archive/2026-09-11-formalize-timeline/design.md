## Context

See proposal.md Why. Timeline カード・ページ・Customize L2・5-hour コピーは working tree に入っている。この Change は事後の契約固定に、画面 id / ファイルの `timeline` リネームを含める。

## Goals / Non-Goals

**Goals:**
- Dashboard Timeline をプロバイダーカードと同型の第一級面にする。
- 表示の独立（カード on/off と cadence 行）を Window Starter 型の設定キーで持つ。
- Customize L2 を予約 id `timeline` で実装し、プラグイン詳細と混線させない。
- ユーザー向け cadence 名を `5-hour` に固定する。

**Non-Goals:**
- Timeline カードの展開 / Always Visible / On Demand。
- Cost 集約。散布図の軸定義（12h / 14d）の変更。
- capability 名 `quota-reset-timeline` や `resetsAt` フィールドのリネーム。

## Decisions

- **画面 id は `timeline`。** ページは `timeline.svelte`。トレイは `home` / `settings` しか出さないので、古い `resets` ペイロードは dashboard に落ちる。OpenSpec は MODIFIED でシナリオ名を落とせないので、旧シナリオ見出し（Resets / next-reset）は残し、WHEN/THEN の id を `timeline` にする。
- **`timeline` と `customize:timeline` は別画面。** 前者は Timeline ページ、後者は Customize L2。`CUSTOMIZE_TIMELINE_ID = "timeline"` は予約のまま。`customizePluginId("customize:timeline")` は null。戻る先は Customize L1。
- **設定キーは2つ。** `timelineCardVisible` 既定 true（Window Starter と同じ「グローバル面の on/off」）。`timelineCardRows` は `"five-hour" | "weekly"` の配列、既定両方、空配列は両方隠す。Reset All は行だけデフォルトに戻し、`timelineCardVisible` は触らない。
- **カード行の隠れは Dashboard だけ。** Timeline ページは hidden cadence でもセクションを出す。ティーザーではない。
- **はみ出しはドラッグ。** ホイール横スクロールは端でページ縦スクロールに連鎖したので捨てる。縦ホイールはページスクロールのまま。
- **展開なしカードは `pt-[15px] pb-[15px]`。** 展開行の高さは予約しない。展開ありは `pb-2` + chevron。Timeline カードは展開なし。
- **散布図はラベルなしドット。** 次リセットはメーター判定色、その次は muted gray。チップと右ガターは廃止。狭幅 icon-only も廃止し、ラベルは truncation + tooltip。
- **ユーザー向け `5-hour`。** カード行・セクション見出し・Window Starter 見出し/サブタイトル。クォータラベル `Five-hour window` とロック間隔 `five hours` はドメイン文言のまま。内部 id は `five-hour`。
- **Timeline ヘッダーに Refresh を出さない。** フッターの click-to-refresh は残す。タイトル中央のため TopBar はハンドラ無しなら 8×8 スペーサ。

## Risks / Trade-offs

- [Risk] 画面 id `timeline` と Customize 子 `customize:timeline` の取り違え → Mitigation: 固定画面は exact match、`customizePluginId` は `customize:` 接頭のみ。テストで両方の title が Timeline でも screen が異なることを固定。
- [Risk] `customize:timeline` をプラグイン詳細と誤る → Mitigation: 予約 id + `customizePluginId` が null。
- [Risk] Reset All でカードが消えたまま → Mitigation: `timelineCardVisible` をリセット対象から外す。行だけ両方表示に戻す。
- [Risk] ホイール横スクロールの再発 → Mitigation: 行はドラッグのみ。縦ホイールはページへ。

## Migration Plan

設定キーは additive。未設定は両方表示。ティーザー用の旧キーは無い。ロールバックは Change の revert。アーカイブ後に main スペックが Timeline 契約になる。

## Open Questions

なし。
