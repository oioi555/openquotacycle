## Context

3 タブ（Overview / Timeline / Settings）が本体。Starter は idle な 5-hour 窓を起こすアクチュエータで、将来は時刻指定でリセット波を揃える。今の専用ページはステータス監視向きで、Timeline と分断している。

## Goals / Non-Goals

**Goals:**
- Window Starter を Timeline 下部へ移す。
- プロバイダーカード（折りたたみ=ステータス、展開=ログ最大 5）にまとめて縮小する。
- 専用スクリーンと Settings 行を消す。

**Non-Goals:**
- 時刻指定スタート（`Start idle at HH:mm`）。
- 500 件永続化の変更。
- Customize L2 の runner / participation。
- Timeline プロットに Ready 行を描くこと。

## Decisions

- **入口は Timeline タブ。** Settings の WS nav-row は捨てる。3 タブ化で Settings に置いたのは暫定。
- **Auto-start は残す。** セクション先頭のコンパクトカード（ラベル + 短い `5-hour` 文 + Switch）。ヘッダー On/Off にはしない。
- **Antigravity は 1 カード。** 窓は独立のままなのでステータス行は 2 本。ログは plugin 単位で新しい 5 件。
- **コンテキストメニューは窓行。** 複数窓でも Session / Claude を個別に On/Off・Run now できる。
- **スクリーン削除。** `window-starter` を `FIXED_SCREENS` と rank から外す。Back 親も不要。
- **ログ行。** カード内なので複数窓では折りたたみタイトルを窓名にする。単窓はアイコン + 時刻。詳細に Window / Runner / Command。

## Risks / Trade-offs

- [Risk] Customize… から L2 に入ると Back は Customize 一覧（Settings タブ）→ Mitigation: 既存どおり。Timeline へ戻るのは Timeline タブ。
- [Risk] 500 件のうち 5 件しか見えない → Mitigation: ロック判定は全件。UI は直近だけ。

## Migration Plan

Frontend-only. 永続ストアはそのまま。Rollback = revert.

## Open Questions

なし。
