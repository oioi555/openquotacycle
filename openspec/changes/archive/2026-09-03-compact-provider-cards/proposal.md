## Why

プロバイダカードが縦に長く(1プログレス約80px: ラベル+バー+数値+欠損行)、全プロバイダを見るのにスクロールが必須。設定の表示省略を使っても縦長さは解消しない。プログレス行を2段約40pxに詰め、バー整列を保ったまま見渡せるようにする。

## What Changes

- プログレス行を2段ハイブリッド化(単一行案はリセット文字列長のバラつきでバーがガタつくため不採用)。
- 1行目: `[ラベル+paceドット(w-24固定 truncate) | バー(flex-1, thin)]` — バー全行フル幅で完全整列。
- 2行目: `[主数値 | リセット countdown]`右寄せ — 文字数差は右寄せが吸収。
- 1プログレス約80px→約40px。Overview・詳細の両方に適用。
- 欠損(deficit)/枯渇(runsOut)行を廃止し、同情報をpaceドットのツールチップに移動(情報は欠落させない)。
- リセット表示切替(relative/absoluteトグル)は右端カウントダウンのボタンとして維持。
- カード余白を締める: ヘッダ`text-lg→text-base`、`py-3→py-2`、行間`space-y-4→space-y-2`。text/badge行は現状維持。
- paceマーカー・ツールチップ・表示モード等のロジック変更なし。

## Capabilities

### New Capabilities

- なし(レイアウト変更のみ。表示すべき情報・visibility条件は不変のため)。

### Modified Capabilities

- なし(既存specはvisibilityとデータ条件のみを規定し、行レイアウトを規定しないため。`skip_specs: true`とする)。

## Impact

- 影響コード: `src/components/provider-card.tsx`のみ(予定)+`provider-card.test.tsx`の構造アサート更新。
- spec変更なし。設定・永続化・IPC変更なし。
