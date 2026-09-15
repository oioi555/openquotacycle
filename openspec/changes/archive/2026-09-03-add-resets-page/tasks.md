## 1. ナビ+ページ土台

- [x] 1.1 SideNavにResetsボタン(CalendarClock、Window Starter直上、aria-label="Resets")を追加し、`side-nav.test.tsx`で表示とactive状態を検証できる
- [x] 1.2 `src/pages/resets.tsx`新規作成(ヘッダ+QuotaResetTimeline再利用+空状態)し、単体レンダーテストで2セクション表示を検証できる
- [x] 1.3 AppContentに`activeView==="resets"`分岐を追加し、Resets選択時に新ページが表示されることをテストで検証できる
- [x] 1.4 Overviewから`<QuotaResetTimeline>`を除去し、`overview.test.tsx`でタイムライン非表示を検証できる

## 2. ページ用スタイル+レスポンシブ

- [x] 2.1 TimelineSectionをカード化(rounded-lg border bg-card、ヘッダに軸spanバッジ+行数)し、スナップショット/目視で検証できる
- [x] 2.2 TimelineRowをwide拡大(w-40/h-11/gutter w-14)+マーカーchip化(hit area拡大)し、既存tooltipテストが通ることで検証できる
- [x] 2.3 narrow時icon-only(`@[380px]`でラベル隠蔽+スペーサ連動縮小、title/tooltip維持)を実装し、コンテナ幅テストまたは目視でtick整合を含め検証できる

## 3. 仕上げ

- [x] 3.1 空状態カード(`No upcoming resets`)を追加し、データなしテストで検証できる
- [x] 3.2 `bun run test`(または`bunx vitest run`)と`openspec validate --change add-resets-page`が通ることで検証できる

## 4. レビュー指摘対応

- [x] 4.1 AppContentにResetsルートテスト+SideNavのResets activeテストを追加し、対象テストで検証できる
- [x] 4.2 narrow/wideの行grid+ticksミラーをクラスアサートで検証できる
- [x] 4.3 軸右端付近リセットのラベル表示(chevronなし)を5h/weeklyで検証できる
- [x] 4.4 wide既定+`@max-[379px]`上書きに反転し、ビルドCSSでフォールバック方向を実証+design更新できる
