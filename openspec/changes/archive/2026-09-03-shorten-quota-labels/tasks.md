## 1. プラグイン本体

- [x] 1.1 cursor(plugin.js/json/test): `Cursor Models`→`Cursor`、`Other Models`→`Other`にし、pluginテストで検証できる
- [x] 1.2 zai(plugin.js/json/test): `Web Searches`→`Tool calls`にし、pluginテストで検証できる
- [x] 1.3 antigravity(plugin.js/json/test): `Claude Weekly`→`Claude Wk`にし、pluginテストで検証できる
- [x] 1.4 codex(manifestのみ)/windsurf/syntheticの短縮(`Spark Wk`、`Daily`/`Weekly`、`5h Limit`/`Free Calls`)をし、各pluginテストで検証できる

## 2. 設定移行+docs+仕上げ

- [x] 2.1 `sanitizeHiddenOverviewProgressLines`に旧→新マッピング移行を入れ、新旧テストで検証できる
- [x] 2.2 provider docs4件(cursor/zai/antigravity/synthetic)のラベル表記を更新し、目視で検証できる
- [x] 2.3 pluginテスト全体+`bunx vitest run`+`tsc --noEmit`+`openspec validate`が通ることで検証できる
