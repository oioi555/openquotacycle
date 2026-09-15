## 1. プログレス1行化

- [x] 1.1 progress行を2段ハイブリッド(1行目ラベル+バー、2行目数値+リセット)にし、主数値・リセット・トグルが表示されることをテストで検証できる
- [x] 1.2 deficit/runsOut可視行を廃止しpaceドットtooltipに移動し、tooltip内容テストで検証できる

## 2. 余白締め+仕上げ

- [x] 2.1 カード余白締め(ヘッダtext-base、`py-2`、`space-y-2`)を適用し、スナップショット/目視で検証できる
- [x] 2.2 `provider-card.test.tsx`の構造アサートを更新し、`bunx vitest run`全体と`tsc --noEmit`と`openspec validate`が通ることで検証できる
