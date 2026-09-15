# Design: add-resets-page

## Context

- `QuotaResetTimeline`は`src/pages/overview.tsx:52`直埋めで、3列固定`[w-32|flex-1|w-12]`+`gap-2`。固定費約192pxが狭幅時の潰れ原因。
-  tickヘッダ(`hour-ticks.tsx`/`day-ticks.tsx`)と`timeline-row.tsx`は同一gridを手動ミラーしており、片方だけ変えるとズレる。
-  `@container`は`quota-reset-timeline.tsx:71`の`@container` + tickラベルの`hidden @[280px]:inline`で前例あり。拡張で対応可能。
-  データ源は`pluginStates`(useProbe)のみ。新規IPCなし。`ActiveView`はstring拡張可能。

## Goals / Non-Goals

- Goals: Resets独立ページ+SideNav隣接配置、ページ用カード化、狭幅アイコン集約、tick整合維持。
- Non-Goals: 軸ロジック(`axis.ts`/`select.ts`)変更なし、プローブ/永続化変更なし、Window Starter本体変更なし。

## Decisions

1. **新規`src/pages/resets.tsx`薄ラッパー + 既存`QuotaResetTimeline`再利用**
   - 理由: 軸/選択ロジックの重複を避ける。page variantは`className`拡張程度に留め、行ロジックは触らない。
   - 代替: Timelineをページ用に作り直し→却下(重複・spec二重管理)。
2. **SideNav配置: Window Starter直上、`CalendarClock`**
   - 理由: 起動フロー(リセット確認→Starter起動)の順序で並べ、既存`TimerReset`との視覚区別がつく。`aria-label="Resets"`。
   - 代替: 直下→却下(Starterが最下段グループ底にいた方が設定直前で自然、という判断もあり得るが、確認→起動の上→下フローを優先)。
3. **レスポンシブはcontainer queryの`@max-[379px]`二段階(レビュー反映で反転)**
   - wide(既定): ラベル`w-40`、行`h-11`、gutter`w-14`。narrow(`@max-[379px]`): ラベル`w-8`+テキスト`hidden`、tickスペーサ同値、gutter`w-8`。
   - 理由: パネル幅可変(Tauriパネルは狭い)に対応しつつメディアクエリ(画面幅)ではなく実コンテナ幅基準にする。380pxは固定費192px+track最低200pxの逆算。wide既定にしたのはcontainer query非対応環境のフォールバックをフルラベルにするため(`@max-[379px]:`は`@container not (width>=379px)`にコンパイルされ、非対応時は無視=wide表示。ビルドCSSで実証済み)。
   - 当初案の`sm:w-48`は意図的に不採用: コンテナ基準で十分で、viewport基準を混ぜると狭パネルで崩れるため。将来幅に余裕が出たら`@min-[560px]:w-48`等のコンテナ基準で追加検討。
   - 代替: メディアクエリ→却下(パネル内幅と画面幅が一致しない)。narrow既定→却下(非対応環境で常にicon-onlyになる)。
4. **マーカーはchip化+hit area拡大、tooltip文言不変**
   - 理由: 狭trackでも時刻判読性を保ち、既存specのtooltip要件をそのまま満たす。
5. **Overviewからは完全除去(併存なし)**
   - 理由: 二重表示は混乱・保守二重化のもと。ユーザ合意済み。

## Risks / Trade-offs

- [同一プロバイダ複数行がicon-onlyで区別不可] → 行`title`+マーカーツールチップで代替、specに明記。
- [tick/rowズレ] → spacer/gutterのclassを両ファイルで同一値にし、テストでアサート(クラス名一致の目視+スナップショット)。
- [`@container`未対応環境] → wide既定+`@max-`上書きのため非対応時はwide表示(フルラベル)になる。現行tickの`@container`+`@[280px]`実績あり。

## Migration Plan

- 破壊的表示変更のみ(Overview下部消滅)。ロールバックはrevertで即時。データ移行なし。
- デプロイ手順なし(通常リリースに含める)。

## Open Questions

- なし。ブレークポイント380pxは実装時に微調整可(specは「約380px」と幅持ち)。
