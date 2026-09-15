import { describe, expect, it } from "vitest"
import type { MetricLine, PluginMeta, PluginOutput, WindowStarterCapability } from "@/lib/plugin-types"
import type { PluginSettings } from "@/lib/settings"
import {
  FIVE_HOUR_MS,
  attemptsForStarterCard,
  classifyWindowStarterProviders,
  createWindowStarterPrompt,
  formatWindowStarterClock,
  getWindowStarterCommand,
  groupWindowStarterCards,
  latestAttemptForStarterWindow,
  quoteWindowStarterPrompt,
  starterLogTitle,
  WINDOW_STARTER_CARD_LOG_LIMIT,
  windowStarterRowKey,
} from "@/lib/window-starter-state"
import type { WindowStarterAttempt } from "@/lib/window-starter"

const NOW = Date.parse("2026-08-27T10:20:00.000Z")

const CLAUDE_STARTER: WindowStarterCapability = {
  enabledByDefault: true,
  defaultRunner: "claude",
  allowedRunners: ["claude"],
  windows: [{ id: "session", line: "Session", weeklyLine: "Weekly" }],
}

const ZAI_STARTER: WindowStarterCapability = {
  enabledByDefault: true,
  defaultRunner: "zcode",
  allowedRunners: ["zcode", "opencode", "hermes", "pi"],
  windows: [{ id: "session", line: "Session", weeklyLine: "Weekly" }],
}

const ANTIGRAVITY_STARTER: WindowStarterCapability = {
  enabledByDefault: false,
  defaultRunner: "agy",
  allowedRunners: ["agy"],
  windows: [
    { id: "session", line: "Session", weeklyLine: "Weekly", enabledByDefault: false },
    { id: "claude", line: "Claude", weeklyLine: "Claude Wk", enabledByDefault: false },
  ],
}

function meta(
  id: string,
  name: string,
  windowStarter?: WindowStarterCapability,
): PluginMeta {
  return { id, name, iconUrl: `${id}.svg`, brandColor: "#000", lines: [], windowStarter }
}

const settings: PluginSettings = { order: ["claude", "codex", "zai", "antigravity", "opencode-go"], disabled: [] }

function progress(overrides: Partial<Extract<MetricLine, { type: "progress" }>> = {}): MetricLine {
  return {
    type: "progress",
    label: "Session",
    used: 0,
    limit: 100,
    format: { kind: "percent" },
    periodDurationMs: FIVE_HOUR_MS,
    ...overrides,
  }
}

function pluginState(lines: MetricLine[]): { data: PluginOutput } {
  return {
    data: {
      providerId: "claude",
      displayName: "Claude",
      iconUrl: "",
      lines,
    },
  }
}

function classifyClaude(
  state: { data: PluginOutput } | undefined,
  options: {
    disabled?: boolean
    cli?: boolean
    attempts?: WindowStarterAttempt[]
    participation?: boolean
  } = {},
) {
  const pluginSettings: PluginSettings = options.disabled
    ? { ...settings, disabled: ["claude"] }
    : options.participation === false
      ? { ...settings, windowStarterByPlugin: { claude: { enabled: false } } }
      : settings
  return classifyWindowStarterProviders({
    pluginSettings,
    pluginMetas: [meta("claude", "Claude", CLAUDE_STARTER)],
    pluginStates: state ? { claude: state } : {},
    cliStatuses: {
      claude: { id: "claude", executable: "claude", available: options.cli ?? true },
    },
    attempts: options.attempts ?? [],
    runningKey: null,
    nowMs: NOW,
  })[0]
}

describe("classifyWindowStarterProviders", () => {
  it("marks a zero-use Claude window without a reset as ready", () => {
    expect(classifyClaude(pluginState([progress()])).status).toBe("ready")
  })

  it("marks an expired reset as ready", () => {
    expect(classifyClaude(pluginState([progress({ used: 40, resetsAt: "2026-08-27T10:19:59Z" })])).status)
      .toBe("ready")
  })

  it("marks a future reset as active", () => {
    const provider = classifyClaude(pluginState([progress({ resetsAt: "2026-08-27T15:20:00Z" })]))
    expect(provider.status).toBe("active")
    expect(provider.resetsAt).toBe("2026-08-27T15:20:00Z")
  })

  it("keeps zero-use future-reset windows active for Claude and Antigravity", () => {
    const resetsAt = "2026-08-27T15:20:00Z"
    const views = classifyWindowStarterProviders({
      pluginSettings: {
        ...settings,
        order: ["claude", "antigravity"],
        windowStarterByPlugin: {
          antigravity: {
            windows: { session: { enabled: true }, claude: { enabled: true } },
          },
        },
      },
      pluginMetas: [
        meta("claude", "Claude", CLAUDE_STARTER),
        meta("antigravity", "Antigravity", ANTIGRAVITY_STARTER),
      ],
      pluginStates: {
        claude: pluginState([
          progress({ resetsAt }),
          progress({ label: "Weekly", periodDurationMs: 7 * 24 * 60 * 60 * 1000 }),
        ]),
        antigravity: pluginState([
          progress({ resetsAt }),
          progress({ label: "Claude", resetsAt }),
          progress({ label: "Weekly", periodDurationMs: 7 * 24 * 60 * 60 * 1000 }),
          progress({ label: "Claude Wk", periodDurationMs: 7 * 24 * 60 * 60 * 1000 }),
        ]),
      },
      cliStatuses: {
        claude: { id: "claude", executable: "claude", available: true },
        agy: { id: "agy", executable: "agy", available: true },
      },
      attempts: [],
      runningKey: null,
      nowMs: NOW,
    })

    for (const [pluginId, windowLine] of [
      ["claude", "Session"],
      ["antigravity", "Session"],
      ["antigravity", "Claude"],
    ] as const) {
      expect(views.find((view) => view.pluginId === pluginId && view.windowLine === windowLine)).toMatchObject({
        status: "active",
        resetsAt,
      })
    }
  })

  it("rejects incomplete or non-five-hour quota data", () => {
    expect(classifyClaude(pluginState([])).status).toBe("unknown")
    expect(classifyClaude(pluginState([progress({ periodDurationMs: 60_000 })])).status).toBe("unknown")
  })

  it("reports disabled, loading, missing CLI, and participation-off states", () => {
    expect(classifyClaude(pluginState([progress()]), { disabled: true }).status).toBe("disabled")
    expect(classifyClaude({ ...pluginState([]), loading: true }).status).toBe("loading")
    expect(classifyClaude(pluginState([progress()]), { cli: false }).status).toBe("cli-missing")
    expect(classifyClaude(pluginState([progress()]), { participation: false }).status).toBe("off")
  })

  it("blocks exhausted weekly quota via the declared weekly line", () => {
    const weekly = progress({ label: "Weekly", used: 100, periodDurationMs: 7 * 24 * 60 * 60 * 1000 })
    expect(classifyClaude(pluginState([progress(), weekly])).status).toBe("weekly-exhausted")
  })

  it("does not treat an unrelated label containing weekly as exhaustion", () => {
    const other = progress({ label: "Biweekly", used: 100, periodDurationMs: 7 * 24 * 60 * 60 * 1000 })
    expect(classifyClaude(pluginState([progress(), other])).status).toBe("ready")
  })

  it("locks a window for five hours after any attempt", () => {
    const attempt: WindowStarterAttempt = {
      id: "attempt",
      providerId: "claude",
      windowLine: "Session",
      startedAt: new Date(NOW - 60_000).toISOString(),
      status: "failed",
    }
    expect(classifyClaude(pluginState([progress()]), { attempts: [attempt] }).status).toBe("locked")
  })

  it("omits OpenCode Go when the capability is absent", () => {
    const views = classifyWindowStarterProviders({
      pluginSettings: settings,
      pluginMetas: [
        meta("claude", "Claude", CLAUDE_STARTER),
        meta("opencode-go", "OpenCode Go"),
      ],
      pluginStates: {},
      cliStatuses: {},
      attempts: [],
      runningKey: null,
      nowMs: NOW,
    })
    expect(views.map((view) => view.pluginId)).toEqual(["claude"])
  })

  it("lists windows in provider-list order, then declared window order", () => {
    const views = classifyWindowStarterProviders({
      pluginSettings: { order: ["antigravity", "claude", "opencode-go"], disabled: [] },
      pluginMetas: [
        meta("claude", "Claude", CLAUDE_STARTER),
        meta("opencode-go", "OpenCode Go"),
        meta("antigravity", "Antigravity", ANTIGRAVITY_STARTER),
      ],
      pluginStates: {},
      cliStatuses: {},
      attempts: [],
      runningKey: null,
      nowMs: NOW,
    })
    expect(views.map((view) => `${view.pluginId}:${view.windowLine}`)).toEqual([
      "antigravity:Session",
      "antigravity:Claude",
      "claude:Session",
    ])
    expect(views.filter((view) => view.pluginId === "antigravity").every((view) => !view.participationEnabled)).toBe(
      true,
    )
    expect(views.find((view) => view.pluginId === "claude")?.participationEnabled).toBe(true)
  })

  it("keeps Antigravity windows default-off even when agy is on PATH", () => {
    const views = classifyWindowStarterProviders({
      pluginSettings: settings,
      pluginMetas: [meta("antigravity", "Antigravity", ANTIGRAVITY_STARTER)],
      pluginStates: {
        antigravity: pluginState([
          progress(),
          progress({ label: "Claude" }),
        ]),
      },
      cliStatuses: { agy: { id: "agy", executable: "agy", available: true } },
      attempts: [],
      runningKey: null,
      nowMs: NOW,
    })
    expect(views).toHaveLength(2)
    expect(views.map((view) => view.windowLine)).toEqual(["Session", "Claude"])
    expect(views.every((view) => view.status === "off")).toBe(true)
  })

  it("can start Antigravity Claude while Session is locked", () => {
    const views = classifyWindowStarterProviders({
      pluginSettings: {
        ...settings,
        windowStarterByPlugin: {
          antigravity: {
            windows: { session: { enabled: true }, claude: { enabled: true } },
          },
        },
      },
      pluginMetas: [meta("antigravity", "Antigravity", ANTIGRAVITY_STARTER)],
      pluginStates: {
        antigravity: pluginState([
          progress(),
          progress({ label: "Claude" }),
        ]),
      },
      cliStatuses: { agy: { id: "agy", executable: "agy", available: true } },
      attempts: [
        {
          id: "session",
          providerId: "antigravity",
          windowLine: "Session",
          startedAt: new Date(NOW - 60_000).toISOString(),
          status: "failed",
        },
      ],
      runningKey: null,
      nowMs: NOW,
    })
    expect(views.find((view) => view.windowLine === "Session")?.status).toBe("locked")
    expect(views.find((view) => view.windowLine === "Claude")?.status).toBe("ready")
  })

  it("reports cli-missing on the selected runner, not the plugin id", () => {
    const views = classifyWindowStarterProviders({
      pluginSettings: {
        ...settings,
        windowStarterByPlugin: { zai: { runnerId: "opencode" } },
      },
      pluginMetas: [meta("zai", "Z.ai", ZAI_STARTER)],
      pluginStates: { zai: pluginState([progress()]) },
      cliStatuses: {
        zcode: { id: "zcode", executable: "zcode", available: true },
        opencode: { id: "opencode", executable: "opencode", available: false },
      },
      attempts: [],
      runningKey: null,
      nowMs: NOW,
    })
    expect(views[0].runnerId).toBe("opencode")
    expect(views[0].status).toBe("cli-missing")
  })

  it("ignores a stored runner id outside allowedRunners", () => {
    const views = classifyWindowStarterProviders({
      pluginSettings: {
        ...settings,
        windowStarterByPlugin: { zai: { runnerId: "claude" } },
      },
      pluginMetas: [meta("zai", "Z.ai", ZAI_STARTER)],
      pluginStates: { zai: pluginState([progress()]) },
      cliStatuses: {
        zcode: { id: "zcode", executable: "zcode", available: true },
      },
      attempts: [],
      runningKey: null,
      nowMs: NOW,
    })
    expect(views[0].runnerId).toBe("zcode")
    expect(views[0].status).toBe("ready")
  })
})

describe("formatWindowStarterClock", () => {
  it("formats a local M/D HH:mm clock", () => {
    expect(formatWindowStarterClock(new Date(2026, 8, 11, 0, 0).toISOString())).toBe("9/11 00:00")
  })
})

describe("createWindowStarterPrompt", () => {
  it("asks for only OK in a fixed English sentence", () => {
    expect(createWindowStarterPrompt()).toBe(
      'Quotracker Window Starter request. Respond with only "OK".',
    )
  })
})

describe("getWindowStarterCommand", () => {
  it("mirrors the native pin table", () => {
    expect(getWindowStarterCommand("claude", "claude", "session")).toContain("claude-haiku-4-5")
    expect(getWindowStarterCommand("zai", "zcode", "session")).toBe(
      "zcode --prompt <prompt>",
    )
    expect(getWindowStarterCommand("zai", "opencode", "session")).toContain("zai-coding-plan/glm-5.3-flash")
    expect(getWindowStarterCommand("zai", "opencode", "session")).not.toContain("opencode-go/")
    expect(getWindowStarterCommand("zai", "pi", "session")).toContain("zai/glm-5.3-flash")
    expect(getWindowStarterCommand("codex", "pi", "session")).toContain("openai-codex/gpt-5.6-luna")
    expect(getWindowStarterCommand("codex", "pi", "session")).not.toContain("openai/gpt-5.6-luna")
    expect(getWindowStarterCommand("antigravity", "agy", "session")).toContain("gemini-3.8-flash-low")
    expect(getWindowStarterCommand("antigravity", "agy", "session")).not.toContain(
      "--dangerously-skip-permissions",
    )
  })

  it("embeds a shell-quoted prompt for terminal paste", () => {
    const prompt = createWindowStarterPrompt()
    const command = getWindowStarterCommand("antigravity", "agy", "session", prompt)
    expect(command).toBe(
      `agy -p ${quoteWindowStarterPrompt(prompt)} --model gemini-3.8-flash-low`,
    )
    expect(command).toContain('"OK"')
    expect(command).not.toContain("<prompt>")
  })

  it("POSIX-quotes apostrophes in the prompt", () => {
    expect(quoteWindowStarterPrompt("it's OK")).toBe("'it'\\''s OK'")
  })
})

describe("classifyWindowStarterProviders running vs off", () => {
  it("shows Starting on a manual-run window even when participation is off", () => {
    const views = classifyWindowStarterProviders({
      pluginSettings: settings,
      pluginMetas: [meta("antigravity", "Antigravity", ANTIGRAVITY_STARTER)],
      pluginStates: {},
      cliStatuses: {
        agy: { id: "agy", executable: "agy", available: true },
      },
      attempts: [],
      runningKey: "antigravity:Session",
      nowMs: NOW,
    })
    const session = views.find((view) => view.windowLine === "Session")
    const claude = views.find((view) => view.windowLine === "Claude")
    expect(session?.status).toBe("running")
    expect(claude?.status).toBe("off")
  })
})

describe("classifyWindowStarterProviders icon metadata", () => {
  it("attaches plugin iconUrl and brandColor when metas are provided", () => {
    const view = classifyWindowStarterProviders({
      pluginSettings: settings,
      pluginMetas: [
        {
          id: "claude",
          name: "Claude",
          iconUrl: "http://localhost/claude.svg",
          brandColor: "#d97757",
          lines: [],
          windowStarter: CLAUDE_STARTER,
        },
      ],
      pluginStates: {},
      cliStatuses: {},
      attempts: [],
      runningKey: null,
      nowMs: NOW,
    })

    const claude = view.find((provider) => provider.pluginId === "claude")
    expect(claude?.iconUrl).toBe("http://localhost/claude.svg")
    expect(claude?.brandColor).toBe("#d97757")
    expect(windowStarterRowKey("claude", "Session")).toBe("claude:Session")
  })
})

describe("groupWindowStarterCards", () => {
  it("keeps provider order and folds multiple windows onto one card", () => {
    const cards = groupWindowStarterCards([
      {
        pluginId: "antigravity",
        windowId: "session",
        windowLine: "Session",
        runnerId: "agy",
        name: "Antigravity",
        executable: "agy",
        cliAvailable: true,
        participationEnabled: false,
        status: "off",
      },
      {
        pluginId: "antigravity",
        windowId: "claude",
        windowLine: "Claude",
        runnerId: "agy",
        name: "Antigravity",
        executable: "agy",
        cliAvailable: true,
        participationEnabled: false,
        status: "off",
      },
      {
        pluginId: "claude",
        windowId: "session",
        windowLine: "Session",
        runnerId: "claude",
        name: "Claude",
        executable: "claude",
        cliAvailable: true,
        participationEnabled: true,
        status: "ready",
      },
    ])

    expect(cards.map((card) => card.pluginId)).toEqual(["antigravity", "claude"])
    expect(cards[0]?.windows.map((window) => window.windowLine)).toEqual(["Session", "Claude"])
    expect(cards[1]?.windows).toHaveLength(1)
  })
})

describe("attemptsForStarterCard", () => {
  it("returns the newest five attempts for that plugin", () => {
    const attempts: WindowStarterAttempt[] = Array.from({ length: 7 }, (_, index) => ({
      id: `a${index}`,
      providerId: index === 0 ? "codex" : "claude",
      windowLine: "Session",
      startedAt: `2026-09-0${index + 1}T00:00:00.000Z`,
      status: "confirmed" as const,
    }))

    const shown = attemptsForStarterCard(attempts, "claude")
    expect(WINDOW_STARTER_CARD_LOG_LIMIT).toBe(5)
    expect(shown.map((attempt) => attempt.id)).toEqual(["a1", "a2", "a3", "a4", "a5"])
    expect(shown.some((attempt) => attempt.providerId === "codex")).toBe(false)
  })
})

describe("latestAttemptForStarterWindow", () => {
  it("picks the newest attempt for that window, not array order", () => {
    const attempts: WindowStarterAttempt[] = [
      {
        id: "old",
        providerId: "antigravity",
        windowLine: "Session",
        startedAt: "2026-09-13T12:00:00.000Z",
        status: "confirmed",
      },
      {
        id: "new-claude",
        providerId: "antigravity",
        windowLine: "Claude",
        startedAt: "2026-09-14T09:00:00.000Z",
        status: "failed",
      },
      {
        id: "new-session",
        providerId: "antigravity",
        windowLine: "Session",
        startedAt: "2026-09-14T08:07:00.000Z",
        status: "confirmed",
      },
      {
        id: "other",
        providerId: "claude",
        windowLine: "Session",
        startedAt: "2026-09-14T10:00:00.000Z",
        status: "confirmed",
      },
    ]

    expect(latestAttemptForStarterWindow(attempts, "antigravity", "Session")?.id).toBe("new-session")
    expect(latestAttemptForStarterWindow(attempts, "antigravity", "Claude")?.id).toBe("new-claude")
    expect(latestAttemptForStarterWindow(attempts, "claude", "Session")?.id).toBe("other")
    expect(latestAttemptForStarterWindow(attempts, "codex", "Session")).toBeUndefined()
  })
})

describe("starterLogTitle", () => {
  it("uses the runner label, and prefixes the window on multi-window cards", () => {
    expect(starterLogTitle({ windowLine: "Session", runnerId: "claude" }, false)).toBe("Claude Code")
    expect(starterLogTitle({ windowLine: "Session", runnerId: "agy" }, true)).toBe("Session · agy")
    expect(starterLogTitle({ windowLine: "Claude", runnerId: "agy" }, true)).toBe("Claude · agy")
    expect(starterLogTitle({ windowLine: "Session" }, false)).toBe("")
  })
})
