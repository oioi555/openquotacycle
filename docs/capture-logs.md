# How to Capture Logs

Use this when OpenQuotaCycle is not working and you need logs.

- Audience: anyone debugging a local install
- Platform: Linux
- Time: about 2 minutes

There is no in-app Debug Level. Dev builds log at Trace. Release builds log at Error.

## 1) Reproduce the issue once

1. Do the action that fails.
2. Wait for the failure.
3. Stop after 1–2 attempts.

## 2) Open the log file

```text
~/.local/share/io.github.oioi555.openquotacycle/logs/openquotacycle.log
```

If `XDG_DATA_HOME` is set, logs are under `$XDG_DATA_HOME/io.github.oioi555.openquotacycle/logs/`.

Rotated files look like `openquotacycle.log.1`.

## 3) What to send with the log

```text
What I expected:
What happened instead:
When it happened (local time + timezone):
Which provider was affected (Codex / Claude / Cursor / etc.):
OpenQuotaCycle version:
```

Logs are redacted for common secrets. Review them before sharing.
