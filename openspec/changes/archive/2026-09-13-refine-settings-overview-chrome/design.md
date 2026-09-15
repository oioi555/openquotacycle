## Context

See proposal.md Why. Current Settings uses in-card titles + `ui-card-bordered` + Checkbox. Dashboard meters are 2px with a 2×6px pace tick (`progress.svelte`). Expand is the bottom chevron only. `danger` chips use `text-red-500`. Pressable hover is color (and sometimes opacity) only.

## Goals / Non-Goals

**Goals:**
- One Settings chrome matching Customize L2 / Window Starter Auto-start (title outside, card below).
- Meter 4px with a tick that overhangs enough to stay readable.
- Card-body click toggles expand without swallowing nested actions.
- Shared hover-lift recipe for pressable controls.

**Non-Goals:**
- Timeline 画面の 2px 軸トラックを 4px にすること。
- Off-Peak / `positive` の緑を濃くすること。
- Checkbox primitive の削除。
- Settings の list 面や Switch を浮かせること。
- 設定キー・Rust・plugin 契約。

## Decisions

- **Meter 4px, tick 2×12px, min-width 4px.** 4px は確認済み。Tick をバー比例の 8px（上下 2px はみ出し、現状と同じ）にはしない。バーを細くしたので tick はバーより大きくはみ出させる。12px / `top: -4px` で上下 4px。Alternative: 5px + 9px（旧 OpenQuota）— バーは 4px で固定したので却下。
- **Settings は OpenQuota と同じ grouped rows。** 見出し `px-1 pt-1` + `h2 text-sm font-semibold` の下に `ui-list`。複数選択は右端の compact menu（現行値表示、塗りつぶしセグメントなし）。boolean は行ラベル + Switch。Global Shortcut も General の1行。ウィットなサブタイトルは削除。下部は Timeline と同じ Customize と Window Starter の nav-row。
- **Start on Login は行の Switch。** 説明文は置かない（ラベルが意味を持つ）。Checkbox primitive は settings 以外未使用なので残す。
- **ダークの `--meter-fill` はライトと同じ式に戻す。** `#00e676` 55% × `--muted-foreground`。セグメント用に濃くした変更は、メニュー化で不要。Off-Peak の `positive` 緑は触らない。
- **Auto Refresh は 5 分と 15 分だけ。初期値 5 分。** Window Starter が同じプローブ周期を見るので 30/60 は長すぎる。保存済み 30/60 は default 5 に落とす。
- **Global Shortcut も同じ見出し。** `h2 text-sm font-semibold`。Wayland info tooltip はタイトル横。Escape の注記はカード下の機能説明として残す（セクションサブタイトルではない）。
- **Card click は `ui-card` の click、ネストは `closest`。** カードを `<button>` で包まない（中に reading / links / chevron がある）。`event.target.closest("button, a, [role='switch']")` なら return。シェブロンは今の `button` のまま残し、見た目と a11y のコントロールにする。ヘッダーは `ui-card` の外なので対象外。expand が無いカードは handler を付けない。
- **`danger` → `text-meter-critical`。** Peak 以外の danger chip も同じ（仕様は tone、ラベルではない）。`--red-500` はライトで明るすぎる。`--destructive` まで落とすのはバーより暗いので今回はやらない。`positive` は触らない。
- **Hover lift は `@utility ui-pressable`。** `hover:-translate-y-px` + 軽い shadow、`active:translate-y-0`、`motion-reduce:transform-none`。`buttonVariants` の base に足す（`link` は除外）。used/left、reset chip、画面間 `ui-nav-row`、compact outline chip（Settings menu / Record Shortcut / Customize L2 runner / Options）にも同じ utility。`ui-nav-row` 自体に `transition: background-color` を置かない（`ui-pressable` の transform を潰す）。プロバイダー `ui-card` 本体にも `ui-pressable` と `hover:bg-card-hover` を付ける。展開シェブロンは `w-full` の単独 lift を付けない。Switch と Settings の `ui-list` には付けない。
- **Timeline トラックはコード変更なし。** spec だけ「ダッシュボードと同じ高さ」を切る。

## Risks / Trade-offs

- [Risk] カード click が reading / reset と二重発火 → Mitigation: `closest` で除外。テストで nested click が expand しないことを固定。
- [Risk] 全 Button が 1px 浮いて Settings の segmented がガタつく → Mitigation: 移動は 1px。隣と重なるなら shadow だけに落とす（高さは変えない）。
- [Risk] 12px tick が隣の行に食い込む → Mitigation: 既存 `pb-2` のメーター行を維持。足りなければ行間だけ足す。
- [Risk] tests が `h-[2px]` / `h-[6px]` / `text-red-500` / `role=checkbox` をピン留め → Mitigation: 同じタスクで更新。

## Migration Plan

Frontend-only. Rollback = revert. 永続化なし。

## Open Questions

なし。
