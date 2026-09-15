# Design: compact-provider-cards

## Context

- `src/components/provider-card.tsx`のprogress行は4段(ラベル+paceドット / バー / 主数値+リセット / 欠損+枯渇)で約80px。Overview・詳細とも同コンポーネント(`scopeFilter`違いのみ)。
- pace情報の計算ロジック(`pace-status.ts`/`pace-tooltip.ts`)は維持し、表示位置だけ変える。
- 既存specはvisibility条件のみ規定。レイアウト不問のため`skip_specs: true`。

## Goals / Non-Goals

- Goals: progress行を約40pxの2段に。全プロバイダ+Overview/詳細に適用。欠番情報はtooltipに退避(欠落なし)。
- Non-Goals: text/badge行の変更なし。データ・設定・永続化の変更なし。折りたたみ等の新ギミックなし。

## Decisions

1. **2段ハイブリッド(単一行案から変更。レビュー指摘反映)**
    - 1行目 `[ラベル+paceドット(w-24固定) | Progress flex-1 h-1.5]`、2行目 `[主数値 | リセット]`(`justify-between` — 主数値を左、リセットを右端に寄せて文字数差を右端で吸収。バーの始端・終端は1行目で固定されるため行の整列には影響しない)。
   - 理由: リセット文字列は`Resets soon`(11字)〜`Resets tomorrow at 2:00 PM`(25字)とバラつき、単一行flexではバー始端・終端とも揃わない。ラベル列固定+バーflex-1で始端整列、2行目右寄せで文字数差を吸収。固定幅カラム案(`w-44`級)は最長25字+locale依存でバーが痩せるため却下。
   - 代替(単一行+数値結合`72% · Resets in 2h`)→却下(同上+トグル当たり判定が曖昧)。
2. **deficit/runsOutはpaceドットのtooltipに移動**(以下当初通り)
   - 理由: pace由来の派生情報であり、出所が一貫する。`PaceIndicator`の`detailText`下に2行まで追加。
   - 代替: リセットtooltipに移動→却下(リセットtooltipは時刻系、pace系と混ざる)。
3. **余白締めは最小限: ヘッダ`text-lg→text-base`、ヘッダ下`mb-2→mb-1.5`、`py-3→py-2`、行間`space-y-4→space-y-2`**
   - 理由: 行1行化が主効果。詰めすぎるとタップ/判読性を損なう。

## Risks / Trade-offs

- [ラベルtruncateでquota区別がつきにくい] → `title`属性でフル表示、Resetsページで全体像は確認可能。
- [tooltip化でdeficitが見えにくくなる] → paceドット自体は常時表示(色で異常通知)なので気づきは維持。
- [既存テストの構造アサート破損] → `provider-card.test.tsx`のdeficit/runsOut可視アサートをtooltipアサートに更新。

## Migration Plan

- 表示変更のみ。ロールバックはrevert。データ移行なし。

## Open Questions

- なし。
