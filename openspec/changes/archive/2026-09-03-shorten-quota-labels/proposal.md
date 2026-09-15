## Why

コンパクト化したカードのラベル列は固定幅(`w-24`、約13字分)のため、`Cursor Models`(13字)や`Web Searches`(12字)等の長いラベルが潰れる。短縮して判読性と整列を両立する。

## What Changes

ラベル短縮(意味維持、前方一致で区別可能):

- cursor: `Cursor Models`→`Cursor`、`Other Models`→`Other`
- zai: `Web Searches`→`Tool calls`
- antigravity: `Claude Weekly`→`Claude Wk`
- codex: `Spark Weekly`→`Spark Wk`
- windsurf: `Daily quota`→`Daily`、`Weekly quota`→`Weekly`
- synthetic: `5h Rate Limit`→`5h Limit`、`Free Tool Calls`→`Free Calls`
- 対象外(13字以内に収まるか固定幅の影響外): `Completions`、`API credits`、text/badge行(`Extra usage spent`等は柔軟行のため維持)

各pluginの`plugin.js`+`plugin.json`+`plugin.test.js`、provider docs4件、spec2件を更新。既存ユーザの非表示設定(`hiddenOverviewProgressLines`、ラベルキー)に旧名→新名の移行を入れ、隠していた行が再表示されないようにする。

## Capabilities

### New Capabilities

- なし。

### Modified Capabilities

- `cursor-usage-pools`: `Cursor Models`/`Other Models`の名称変更。
- `antigravity-quota`: `Claude Weekly`の名称変更。

## Impact

- 影響コード: `plugins/{cursor,zai,antigravity,codex,windsurf,synthetic}/plugin.{js,json,test.js}`、`src/lib/settings.ts`(移行)、`docs/providers/{cursor,zai,antigravity,synthetic}.md`。
- spec delta2件。設定移行あり(旧ラベルで隠していた行の継続非表示)。IPC・プローブロジック変更なし。
