# Design: shorten-quota-labels

## Context

- ラベルは各pluginの`plugin.js`(実行時出力)と`plugin.json`(マニフェスト・skeleton)の両方で定義され、一致が前提(`provider-card.tsx`はラベル照合でscope/非表示判定)。
- specで名称ピン留めは`cursor-usage-pools`(`Cursor Models`/`Other Models`)と`antigravity-quota`(`Claude Weekly`)のみ。他はdocs+code+tests。
- `hiddenOverviewProgressLines`はラベルキー永続化のため、旧名移行が必要(`sanitizeHiddenOverviewProgressLines`が受け口)。

## Goals / Non-Goals

- Goals: 7ラベル短縮+spec delta2件+docs4件+設定移行。意味・集計・リセット条件は不変。
- Non-Goals: text/badge行の変更なし。`Completions`/`API credits`(11字、収まる)は維持。

## Decisions

1. **短縮マッピングは前方一致・文脈内区別維持**: `Cursor`/`Other`、`Tool calls`、`Claude Wk`、`Spark Wk`、`Daily`/`Weekly`、`5h Limit`、`Free Calls`。
2. **設定移行はsanitize時に旧→新へ付け替え**: 新名既存時は旧名破棄(重複防止)。理由: 隠していた行の再表示はユーザ裏切りになるため。
3. **codex `Spark Weekly`はmanifest+実行時の両方で変更**: 実行時(`additional_rate_limits` の `shortName + " Wk"`)と`plugin.json`を揃えて変更(revision rev-47173acb 参照)。

## Risks / Trade-offs

- [外部連携(Local API等)がラベル参照] → `src`非テストコードに参照なしを確認済み。外部利用者は表示名変更として扱う。
- [docs breadcrumbs/choicesの旧名記載] → 履歴ログのため不変。

## Migration Plan

- 設定移行は読み込み時自動。ロールバック時は新名設定が旧版で無視されるのみ(表示に戻る、破壊なし)。

## Open Questions

- なし。


---

## Revisions

| 日期 | 类型 | 变更描述 | 原因 | 影响 API |
|------|------|----------|------|----------|
| 2026-09-03 | internal | design.md 決定3「codex Spark Weeklyはmanifestのみ変更(dead entry)」を修正: 実行時は実際に `Spark Weekly` を出力していた(旧テスト plugins/codex/plugin.test.js:959 が証明)ため、plugin.js:573 の実行時ラベルも `shortName + " Wk"` に変更し manifest と整合させた。js変更なしの前提は誤りだった。 | 実行時コードも変更しないと plugin.js/plugin.json のラベルが不一致になり、provider-card のラベル照合が壊れるため | - |
