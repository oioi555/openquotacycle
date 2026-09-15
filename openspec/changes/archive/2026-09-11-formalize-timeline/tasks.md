## 1. Persistence and navigation

- [x] 1.1 `timelineCardVisible` / `timelineCardRows` を settings に追加し、未設定はカード表示・両行表示になることを `settings.test.ts` で検証できる
- [x] 1.2 `customize:timeline` を予約スクリーンにし、`customizePluginId` が null、Back が Customize L1 になることを `app-ui-controller` テストで検証できる
- [x] 1.3 Options の Resets を Timeline にし、画面 id `timeline` に遷移することを `options-menu.test.ts` で検証できる

## 2. Dashboard Timeline card

- [x] 2.1 プロバイダーと同型の Timeline カード（ヘッダー外、`ui-card`、最大2行、アイコン+残り時間、ラベル列揃え）を `timeline-card.svelte` に実装し、`overview.test.ts` / `timeline-card.test.ts` で検証できる
- [x] 2.2 行のはみ出しはドラッグ横スクロール、折り返しなし、縦ホイールはページスクロールのまま、をカードテストまたは 320px 目視で検証できる
- [x] 2.3 コンテキストメニュー（Customize… / Hide Timeline）と共有ツールチップを付け、`timeline-context-menu.test.ts` とカードテストで検証できる
- [x] 2.4 展開なしカードは展開行高を予約せず `pt`/`pb` を揃え、`provider-card.test.ts` で `pb-2` 予約が無いことを検証できる

## 3. Timeline page

- [x] 3.1 セクション見出しを `5-hour resets` / `Weekly resets` にし、ヘッダー Refresh を出さず、hidden cadence でもセクションを出すことを `timeline.test.ts` / `top-bar.test.ts` で検証できる
- [x] 3.2 ページ下部に Customize (`customize:timeline`) と Window Starter の `ui-nav-row` を置き、空状態でも残ることを `timeline.test.ts` で検証できる
- [x] 3.3 散布図（ラベルなしドット、判定色 / muted gray、メーターレーン、グリッド）を既存 timeline テストで検証できる

## 4. Customize

- [x] 4.1 Customize L1 先頭に Timeline スイッチ+シェブロンを置き、プロバイダー DnD から独立していることを `customize.test.ts` で検証できる
- [x] 4.2 `customize-timeline.svelte` で `5-hour` / `Weekly` スイッチのみ（Always/On Demand なし）を出し、`customize-timeline.test.ts` で検証できる
- [x] 4.3 Reset All は両行表示に戻し `timelineCardVisible` は触らないことを `settings-controller.test.ts` で検証できる

## 5. Labels

- [x] 5.1 ユーザー向け cadence を `5-hour` に揃え、クォータラベルと `five hours` ロック文言は残すことを Window Starter / Timeline / README / `docs/window-starter.md` の該当文面で検証できる

## 6. Screen id rename

- [x] 6.1 画面 id を `resets` から `timeline` に、ページを `timeline.svelte` / `timeline.test.ts` にリネームし、Options / カード / Enter / tray の未知ペイロードが新しい id をピンすることをコントローラとページテストで検証できる
- [x] 6.2 `customize:timeline` は Customize 子のまま、`timeline` とは別画面であることを `app-ui-controller` / `plugin-views` テストで検証できる

## 7. Close

- [x] 7.1 `bun run test` と `openspec validate formalize-timeline --strict` が通る
