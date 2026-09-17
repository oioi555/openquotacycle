# Window Starter

Starts an idle 5-hour quota window with one CLI request so the reset countdown is already running before the next coding session. Off by default.

It lives on the **Timeline** tab, under the reset plots. There is no separate Window Starter page and no global Activity list.

## Controls

**Auto-start** is the compact card at the top of the section (label, `5-hour` copy, toggle). Automatic starts need that switch on **and** participation on for that window.

Pick the CLI on Customize L2 (`customize:<plugin>`). L2 has an icon-only copy button; the clipboard text already includes the starter prompt (shell-quoted) for pasting into a terminal.

Right-click a window row to turn that window on or off, open Customize L2, or **Run now** (after a confirmation). Run now can fire while Auto-start is off; that attempt then holds the auto-start lock.

Per-provider reset and Reset All Customization restore participation, runner, and window picks to plugin defaults. They do not change Auto-start.

## Cards

Targets are grouped like Overview: one card per provider, in provider list order (declared windows stay in plugin order). Antigravity is one card with Session and Claude status rows.

Collapsed: window line and badge. If that window has an attempt, the row also shows the newest outcome icon and local `M/D HH:mm` — not the runner name.

Expanded: that provider's newest **5** start attempts. Log rows use an outcome icon, the runner label, and `M/D HH:mm`. On a multi-window card the log title is the window line, then the runner. Window, runner, and command stay in the expanded details. Status words are omitted.

## When it starts

A start needs all of: plugin enabled, participation on for that window, the declared 5-hour progress line idle, the declared weekly line not exhausted, and the selected runner on `PATH`.

Idle means the reset is expired, or usage is 0% with no reset time. A future `resetsAt` is Active even when rounded `used` is 0%. Overview then shows the countdown, and a successful start is confirmed from that reset. Window Starter does not treat `used > 0` as the started signal and does not retry because usage stayed rounded to 0%.

After a boot with an expired Antigravity token and no local server, the plugin may show a `Stale` snapshot. The starter can classify that stale 5-hour line as idle and run `agy` once. `agy` refreshes its OS keyring token first, so confirmation polls hit Cloud Code without the IDE.

Credential wake is a different host command (Antigravity `agy -p /quota --print-timeout 1m`, Grok `grok models`). It is not a Window Starter attempt, does not use the pins below, and does not write a start log. Grok Build is not a catalog runner. See [Antigravity Credential Renewal](providers/antigravity.md#credential-renewal) and [Grok Credential Wake](providers/grok.md#credential-wake).

## Plugins

A plugin only appears here when its manifest declares `windowStarter`. Bundled defaults:

- Claude, Codex, Z.ai: participation on, first-party runner
- Antigravity: Session and Claude windows, both off; runner `agy`
- OpenCode Go: no capability (rolling session; omitted)

## Runners

The host owns executables and argv. The UI sends plugin id, runner id, window line, and prompt — never a free-form command or model field.

| Plugin | Allowed runners | Default |
|---|---|---|
| Claude | Claude Code only | `claude` |
| Codex | Codex, OpenCode, Hermes, Pi | `codex` |
| Z.ai | zcode, OpenCode, Hermes, Pi | `zcode` |
| Antigravity | `agy` only | `agy` |

Claude cannot be started through OpenCode, Hermes, or Pi (Anthropic forbids third-party clients). Z.ai cannot be started through Claude Code.

## Commands

OpenQuotaCycle invokes each executable directly, no shell:

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

Do not swap these pins:

- OpenCode for Z.ai: `zai-coding-plan/glm-5.3-flash`, not `opencode-go/`
- Pi for Z.ai: `zai/glm-5.3-flash` (Coding Plan), not `opencode-go/` or `zai-api`
- Pi for Codex: `openai-codex/gpt-5.6-luna`, not `openai/` (API billing)

Safety flags: no `--auto` (OpenCode), no `--yolo` (Hermes), no `--api-key` (Pi), no `--dangerously-skip-permissions` (`agy`).

The prompt is `OpenQuotaCycle Window Starter request. Respond with only "OK".`. No credentials or account ids. Native spawn puts the prompt in argv. Copy button and log command use the same prompt, POSIX-quoted for paste.

## After a start

- Auto-start tries a window at most once in five hours, including after a failed or unconfirmed attempt. The lock is `(plugin, window line)`, so Antigravity Session and Claude are independent. A confirmed Run now can still execute while the lock (or Auto-start off) would block auto-start; that attempt then holds the lock. After the CLI exits, another window can start while the first is still waiting for quota confirmation.
- Only one CLI runs at a time.
- The model request is never retried from a rounded usage percentage.
- After one successful CLI, OpenQuotaCycle refreshes only that provider's quota for up to two minutes.
- A future 5-hour reset for that window confirms the attempt. Missing confirmation is `unconfirmed` with no second model request.
- Quota probes and confirmation polls are not start logs.

Window Starter cannot check the CLI account before the first request. Use the same subscription OpenQuotaCycle shows. Z.ai must be Coding Plan, not a standard API balance. Codex purchased credits may be independent of the 5-hour allowance.
