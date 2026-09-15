## Why

Overview下部のリセットタイムラインはパネル幅不足で文字潰れし、可読性が低い。Window Starterのような独立ページに分離し、狭幅時はアイコン集約表示にすることで可読性と保守性を両立する。

## What Changes

- SideNav下部にResetsページを追加(Window Starterの直上に`CalendarClock`アイコン、`aria-label="Resets"`)。
- `activeView === "resets"`で新`ResetsPage`を描画し、既存`QuotaResetTimeline`をページ内に移動。
- Overviewからは`<QuotaResetTimeline>`を除去(**BREAKING**: Overview下部にタイムラインが出なくなる)。
- Resetsページ用に見た目を刷新: セクションのカード化、ヘッダ強化(軸spanバッジ+行数)、行高拡大、マーカーのチップ化、空状態(`No upcoming resets`)追加。
- 狭幅時(コンテナ約380px未満)はラベル列をアイコン集約化し、テキストは非表示にしてtrack幅を確保。識別は行`title`/マーカーツールチップで代替。
- データ源は現行通り`pluginStates`(useProbe)のみ。新規IPC/プローブ/永続化なし。

## Capabilities

### New Capabilities

- なし(既存capabilityの移設+表示変更のため)。

### Modified Capabilities

- `quota-reset-timeline`: Overviewフッター表示→Resets独立ページ表示への移設、狭幅時アイコン集約、ページ用スタイル(カード化/空状態)を要件変更。

## Impact

- 影響コード: `src/components/side-nav.tsx`、`src/components/app/app-content.tsx`、新規`src/pages/resets.tsx`、`src/pages/overview.tsx`(除去)、`src/components/quota-reset-timeline/*`(row/ticks/marker/sectionのスタイル+レスポンシブ)。
- 既存spec: `openspec/specs/quota-reset-timeline/spec.md`にdeltaで反映。`window-starter`specは不変。
- テスト: `overview.test.tsx`、`side-nav.test.tsx`、新規`resets.test.tsx`、`quota-reset-timeline.test.tsx`更新。
