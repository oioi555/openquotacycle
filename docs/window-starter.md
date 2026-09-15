# Window Starter

Window Starter can begin an idle 5-hour subscription window so its reset countdown starts before the next interactive coding session. It is disabled by default.

Window Starter lives on the **Timeline** tab, under the reset plots. The global switch is a compact **Auto-start** card (label and `5-hour` copy inside, toggle inside the card). A window is started automatically only when that switch is on **and** the plugin's participation for that window is on.

Targets are grouped like Overview: one card per provider, in provider list order (declared windows stay in plugin order). Each card shows the current window status (window line and badge). When a window has a prior attempt, that row also shows the newest attempt's outcome icon and compact local `M/D HH:mm` clock — not the runner name. Expanding a card shows that provider's newest 5 start attempts. Collapsed log rows use an outcome icon, the runner label (tool name), and a compact local `M/D HH:mm` clock; on a multi-window card the log title is the window line, then the runner. Window, runner, and command stay in the expanded details. Status words are omitted. Right-click a window row to turn that window on or off, open Customize L2, or run the starter command now (after a confirmation). Choose the CLI harness on Customize L2 (`customize:<plugin>`). L2 also has an icon-only copy button for the selected command. The clipboard text already contains the starter prompt (shell-quoted), so it can be pasted into a terminal as-is.

Plugins declare a `windowStarter` capability. Bundled defaults:

- Claude, Codex, and Z.ai: participation on, first-party runner
- Antigravity: Session and Claude windows, both off; runner `agy`
- OpenCode Go: no capability (rolling session; omitted from this section)

Quotracker starts a window when the plugin is enabled, participation for that window is on, the declared 5-hour progress line is idle, the declared weekly line is not exhausted, and the selected runner is on `PATH`.

A five-hour window is idle only when its reset is expired or it has 0% usage with no reset time. A future `resetsAt` means the window is active—even when rounded `used` is 0%—so the Overview shows the countdown and a successful starter attempt can be confirmed from that reset time. Window Starter does not use `used > 0` as the started signal and does not retry because usage remains rounded to 0%.

Antigravity keeps its last successful reading as a display-only snapshot. After a PC boot with an expired token and no local server, the plugin shows that snapshot with a `Stale` chip; the starter may then classify the stale 5-hour line as idle and run `agy` once. `agy` silently refreshes its OS keyring token before that request, so the confirmation polls reach Cloud Code with the fresh keyring token and confirm the window without the Antigravity IDE.

Credential wake is a separate host command. Antigravity uses `agy -p /quota --print-timeout 1m`; Grok uses `grok models`. Neither is a Window Starter attempt, neither uses the `--model` pins below, and neither writes an activity record. Grok Build is not a catalog runner. See [Antigravity Credential Renewal](providers/antigravity.md#credential-renewal) and [Grok Credential Wake](providers/grok.md#credential-wake).

## Runners

The host owns executables and argv. The UI sends plugin id, runner id, window line, and prompt — never a free-form command or model field.

| Plugin | Allowed runners | Default |
|---|---|---|
| Claude | Claude Code only | `claude` |
| Codex | Codex, OpenCode, Hermes, Pi | `codex` |
| Z.ai | zcode, OpenCode, Hermes, Pi | `zcode` |
| Antigravity | `agy` only | `agy` |

Claude cannot be started through OpenCode, Hermes, or Pi (Anthropic forbids third-party clients). Z.ai cannot be started through Claude Code.

## Fixed commands

Quotracker invokes each executable directly without a shell:

```text
claude -p <prompt> --model claude-haiku-4-5 --tools "" --max-turns 1 --no-session-persistence
codex exec --ephemeral --skip-git-repo-check --sandbox read-only -m gpt-5.6-luna -c 'model_reasoning_effort="none"' <prompt>
opencode run <prompt> -m openai/gpt-5.6-luna
hermes -z <prompt> --provider openai-codex -m gpt-5.6-luna
pi -p <prompt> --model openai-codex/gpt-5.6-luna --no-session --no-tools --no-context-files --no-approve
zcode --prompt <prompt>
opencode run <prompt> -m zai-coding-plan/glm-5.3-flash
hermes -z <prompt> --provider zai -m glm-5.3-flash
pi -p <prompt> --model zai/glm-5.3-flash --no-session --no-tools --no-context-files --no-approve
agy -p <prompt> --model gemini-3.8-flash-low
agy -p <prompt> --model claude-sonnet-4-6
```

Pins that must not be swapped:

- OpenCode for Z.ai uses `zai-coding-plan/glm-5.3-flash`, not `opencode-go/`
- Pi for Z.ai uses `zai/glm-5.3-flash` (Coding Plan), not `opencode-go/` or `zai-api`
- Pi for Codex uses `openai-codex/gpt-5.6-luna`, not `openai/` (API billing)

Safety flags: no `--auto` (OpenCode), no `--yolo` (Hermes), no `--api-key` (Pi), no `--dangerously-skip-permissions` (`agy`).

The prompt is `Quotracker Window Starter request. Respond with only "OK".`. Quotracker does not pass credentials or account identifiers; each CLI uses its existing authentication. Native spawn substitutes the prompt as an argv string (no shell). The copy button and activity command use the same prompt, POSIX-quoted for paste.

## Safety and confirmation

- Automatic starts attempt a window at most once in five hours, including after a failed or unconfirmed attempt. The lock is `(plugin, window line)` so Antigravity Session and Claude are independent. A confirmed **Run now** on Timeline can still execute while the lock (or the global switch) would block auto-start; that attempt then holds the auto-start lock. After the CLI exits, another window can be started while the first is still waiting for quota confirmation.
- Only one CLI runs at a time.
- The model request is never retried automatically based on a rounded usage percentage.
- After one successful CLI invocation, Quotracker refreshes only that provider's quota for up to two minutes.
- A future 5-hour reset for that window confirms the attempt. Missing confirmation is recorded as `unconfirmed` without another model request.
- Routine quota probes and confirmation polls are not activity records.

## Billing routes

Window Starter cannot verify the CLI account before its first request. Confirm that each CLI is authenticated to the same subscription shown by Quotracker. In particular, Z.ai must use the Coding Plan rather than a standard API balance, and Codex purchased credits may be independent of the 5-hour allowance.

The store keeps the newest 500 actual CLI attempts with plugin, window, runner, timestamps, command metadata, reset confirmation, and bounded error details. Each Timeline card shows at most the newest 5 for that provider.

Per-provider reset and Reset All Customization restore participation, runner, and window picks to plugin defaults. They do not change the global Window Starter switch.
