## Context

承認モック: フッター 3 タブ、Help なし、About は Settings の行、Customize / Window Starter は Settings 配下、Timeline はルート。モックに自動更新カウントダウンが無かったので A案を足す。カウントダウン自体は `header-auto-refresh-countdown` で既に実装済み。この Change がそれを吸収する。

## Goals / Non-Goals

**Goals:**
- Overview / Timeline / Settings をルートタブにする。
- Options と Help を消す。
- About の入口を Settings の一行にする。
- ネスト中もフッターを残し、Overview へ 1 タップ。
- 自動更新カウントダウンは Overview ヘッダー左（砂時計 + `4m` / `Off`）。Refresh は右のアイコン。Window Starter は Back があるので Refresh にコンパクトフェイス。

**Non-Goals:**
- About 本文を Settings にインライン展開すること（行タップで既存ダイアログ）。
- トレイメニューの About。
- 履歴スタック（rank collapse のまま）。
- タブの中身を bits-ui Tabs にすること。

## Decisions

- **タブはルートへ飛ぶ。** Overview → `dashboard`、Timeline → `timeline`、Settings → `settings`。ネスト中に同じタブを押すとそのルートへ戻る。
- **点灯は親タブ。** `customize:*`（timeline 以外）と `window-starter` は Settings。`customize:timeline` は Timeline（ヘッダーのスライダーが主入口）。
- **戻る。** `customize:<plugin>` → `customize` → `settings`。`window-starter` → `settings`。`customize:timeline` → `timeline`。ルートでは Back も Esc も動かない。
- **Enter。** dashboard → Customize（既存のパワーキー）。ルートタブでは no-op。ネストは back。
- **Ctrl+,。** 既存の Settings トグル。タブで Settings に入ったときも origin を記録。
- **About。** Settings の nav-row（タイトル Quotracker、字幕 `vX · Changelog & credits`）。タップで既存 About ダイアログ。Help は出さない。
- **カウントダウン。** Refresh がある画面だけ。Overview は左に砂時計 + `4m` / `Off`、右は Refresh アイコン。Window Starter は左が Back なので Refresh に `4m` / `Off`。Timeline の右はスライダー、Settings の右は Reset。

## Risks / Trade-offs

- [Risk] Customize 一覧から Timeline 詳細を開くと Back が Timeline タブへ行く → Mitigation: 主入口は Timeline ヘッダー。Customize の行は表示スイッチ用に残す。
- [Risk] smoke が Options / Settings の Back をピン留め → Mitigation: 同じタスクで更新。

## Migration Plan

Frontend-only. Rollback = revert. 永続化なし。

## Open Questions

なし。
