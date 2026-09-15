## Why

Timeline はリセット時刻の散布図で、残量はホバーしないと読めない。ラベルに % を置くと 320px で名前が切れ、鬱陶しい。ドットの色はペース判定であり残量ではない。

## What Changes

- next リセットプロットを小さい円グラフ（リング）にする。塗り%と判定トーンは Overview メーターと同じ（Show Usage As に従う）。
- later プロットは将来期間なのでミュートな丸のまま。
- ラベル列の used/left 読みは出さない。正確な数字は next ツールチップ（Overview バー + 読み）。
- レーンは 4px。塗りつぶしてメーター化はしない。

## Capabilities

### New Capabilities

- なし。

### Modified Capabilities

- `quota-reset-timeline`: next プロットが現在クォータのリング。next ツールチップに Overview メーター。

## Impact

- `timeline-row.svelte` / `reset-marker.svelte`
- `quota-reset-timeline.test.ts`
- プロット軸・Starter・Settings は無変更
