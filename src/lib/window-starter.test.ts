import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  WINDOW_STARTER_LOCK_MS,
  WINDOW_STARTER_MAX_ATTEMPTS,
  addWindowStarterAttempt,
  getLatestAttemptForWindow,
  getWindowLockRemainingMs,
  isWindowLocked,
  loadWindowStarterAttempts,
  saveWindowStarterAttempts,
  type WindowStarterAttempt,
} from "@/lib/window-starter"

const storeState = new Map<string, unknown>()
const storeSaveMock = vi.fn()

vi.mock("@tauri-apps/plugin-store", () => ({
  LazyStore: class {
    async get<T>(key: string): Promise<T | null> {
      if (!storeState.has(key)) return undefined as T | null
      return storeState.get(key) as T | null
    }
    async set<T>(key: string, value: T): Promise<void> {
      storeState.set(key, value)
    }
    async save(): Promise<void> {
      storeSaveMock()
    }
  },
}))

const NOW_MS = Date.parse("2026-08-27T12:00:00.000Z")

function makeAttempt(overrides: Partial<WindowStarterAttempt> = {}): WindowStarterAttempt {
  return {
    id: "attempt-1",
    providerId: "zai",
    windowLine: "Session",
    runnerId: "zcode",
    startedAt: new Date(NOW_MS).toISOString(),
    status: "pending",
    ...overrides,
  }
}

function makeAttempts(count: number, providerId: string = "zai") {
  return Array.from({ length: count }, (_, index) =>
    makeAttempt({
      id: `attempt-${index}`,
      providerId,
      startedAt: new Date(NOW_MS - index * 60_000).toISOString(),
    })
  )
}

describe("window-starter attempts", () => {
  beforeEach(() => {
    storeState.clear()
    storeSaveMock.mockReset()
  })

  describe("addWindowStarterAttempt", () => {
    it("prepends the newest attempt", () => {
      const existing = makeAttempts(2)
      const next = addWindowStarterAttempt(existing, makeAttempt({ id: "newest" }))
      expect(next[0].id).toBe("newest")
      expect(next).toHaveLength(3)
    })

    it("retains only the newest 500 attempts", () => {
      const existing = makeAttempts(500)
      const next = addWindowStarterAttempt(existing, makeAttempt({ id: "newest" }))
      expect(next).toHaveLength(500)
      expect(next[0].id).toBe("newest")
      expect(next[499].id).toBe("attempt-498")
    })

    it("honors a custom max attempts limit", () => {
      const existing = makeAttempts(10)
      const next = addWindowStarterAttempt(existing, makeAttempt({ id: "newest" }), 3)
      expect(next).toHaveLength(3)
      expect(next[0].id).toBe("newest")
    })
  })

  describe("getLatestAttemptForWindow", () => {
    it("returns the newest attempt for a plugin window from a newest-first list", () => {
      const attempts = [
        makeAttempt({ id: "zai-newest", providerId: "zai", windowLine: "Session" }),
        makeAttempt({ id: "zai-older", providerId: "zai", windowLine: "Session" }),
        makeAttempt({ id: "claude-1", providerId: "claude", windowLine: "Session" }),
      ]
      expect(getLatestAttemptForWindow(attempts, "zai", "Session")?.id).toBe("zai-newest")
      expect(getLatestAttemptForWindow(attempts, "claude", "Session")?.id).toBe("claude-1")
    })

    it("returns null when the window has no attempts", () => {
      const attempts = [makeAttempt({ id: "claude-1", providerId: "claude" })]
      expect(getLatestAttemptForWindow(attempts, "zai", "Session")).toBeNull()
    })

    it("keeps Antigravity Session and Claude locks independent", () => {
      const attempts = [
        makeAttempt({
          id: "session-lock",
          providerId: "antigravity",
          windowLine: "Session",
          runnerId: "agy",
          startedAt: new Date(NOW_MS - 60_000).toISOString(),
        }),
      ]
      expect(isWindowLocked(attempts, "antigravity", "Session", NOW_MS)).toBe(true)
      expect(isWindowLocked(attempts, "antigravity", "Claude", NOW_MS)).toBe(false)
      expect(getLatestAttemptForWindow(attempts, "antigravity", "Claude")).toBeNull()
    })

    it("maps records missing windowLine to the plugin's first declared window", () => {
      const attempts = [
        makeAttempt({
          id: "legacy",
          providerId: "claude",
          windowLine: undefined,
          startedAt: new Date(NOW_MS - 60_000).toISOString(),
        }),
      ]
      expect(getLatestAttemptForWindow(attempts, "claude", "Session", "Session")?.id).toBe("legacy")
      expect(isWindowLocked(attempts, "claude", "Session", NOW_MS, "Session")).toBe(true)
      expect(isWindowLocked(attempts, "claude", "Weekly", NOW_MS, "Session")).toBe(false)
    })
  })

  describe("provider five-hour lock", () => {
    it("locks a window while its newest attempt is under five hours old", () => {
      const attempts = [
        makeAttempt({ id: "zai-1", providerId: "zai", startedAt: new Date(NOW_MS - 60_000).toISOString() }),
      ]
      expect(isWindowLocked(attempts, "zai", "Session", NOW_MS)).toBe(true)
      expect(getWindowLockRemainingMs(attempts, "zai", "Session", NOW_MS)).toBe(
        WINDOW_STARTER_LOCK_MS - 60_000
      )
    })

    it("unlocks a window exactly five hours after the attempt", () => {
      const attempts = [
        makeAttempt({ id: "zai-1", providerId: "zai", startedAt: new Date(NOW_MS - WINDOW_STARTER_LOCK_MS).toISOString() }),
      ]
      expect(isWindowLocked(attempts, "zai", "Session", NOW_MS)).toBe(false)
      expect(getWindowLockRemainingMs(attempts, "zai", "Session", NOW_MS)).toBeNull()
    })

    it("does not lock when there are no attempts", () => {
      expect(isWindowLocked([], "zai", "Session", NOW_MS)).toBe(false)
      expect(getWindowLockRemainingMs([], "zai", "Session", NOW_MS)).toBeNull()
    })

    it("does not lock on an unparseable attempt timestamp", () => {
      const attempts = [
        makeAttempt({ id: "zai-1", providerId: "zai", startedAt: "not-a-date" }),
      ]
      expect(isWindowLocked(attempts, "zai", "Session", NOW_MS)).toBe(false)
    })

    it("locks only the attempted window, not other plugins", () => {
      const attempts = [
        makeAttempt({ id: "zai-1", providerId: "zai", startedAt: new Date(NOW_MS - 60_000).toISOString() }),
      ]
      expect(isWindowLocked(attempts, "zai", "Session", NOW_MS)).toBe(true)
      expect(isWindowLocked(attempts, "codex", "Session", NOW_MS)).toBe(false)
    })
  })

  describe("persistence", () => {
    it("loads an empty list when nothing is stored", async () => {
      await expect(loadWindowStarterAttempts()).resolves.toEqual([])
    })

    it("saves and reloads attempts", async () => {
      const attempts = makeAttempts(2)
      await saveWindowStarterAttempts(attempts)
      await expect(loadWindowStarterAttempts()).resolves.toEqual(attempts)
      expect(storeSaveMock).toHaveBeenCalledTimes(1)
    })

    it("bounds saved attempts to the newest 500", async () => {
      const attempts = makeAttempts(600)
      await saveWindowStarterAttempts(attempts)
      const stored = storeState.get("attempts") as WindowStarterAttempt[]
      expect(stored).toHaveLength(WINDOW_STARTER_MAX_ATTEMPTS)
      expect(stored?.[0]?.id).toBe("attempt-0")
      expect(stored?.[499]?.id).toBe("attempt-499")
    })

    it("bounds loaded attempts to the newest 500", async () => {
      storeState.set("attempts", makeAttempts(600))
      const loaded = await loadWindowStarterAttempts()
      expect(loaded).toHaveLength(WINDOW_STARTER_MAX_ATTEMPTS)
    })

    it("drops invalid entries during load", async () => {
      storeState.set("attempts", [
        makeAttempt({ id: "valid-1" }),
        { id: "bad-provider", providerId: "", startedAt: new Date(NOW_MS).toISOString(), status: "pending" },
        { id: "bad-status", providerId: "zai", startedAt: new Date(NOW_MS).toISOString(), status: "running" },
        { id: "bad-date", providerId: "zai", startedAt: "nope", status: "pending" },
        { id: 42, providerId: "zai", startedAt: new Date(NOW_MS).toISOString(), status: "pending" },
        null,
        "junk",
      ])
      const loaded = await loadWindowStarterAttempts()
      expect(loaded).toHaveLength(1)
      expect(loaded[0].id).toBe("valid-1")
    })

    it("accepts any plugin id including Antigravity", async () => {
      storeState.set("attempts", [
        makeAttempt({ id: "agy-1", providerId: "antigravity", windowLine: "Claude", runnerId: "agy" }),
      ])
      const loaded = await loadWindowStarterAttempts()
      expect(loaded).toHaveLength(1)
      expect(loaded[0].providerId).toBe("antigravity")
      expect(loaded[0].windowLine).toBe("Claude")
    })

    it("falls back to an empty list for non-array stored values", async () => {
      storeState.set("attempts", "junk")
      await expect(loadWindowStarterAttempts()).resolves.toEqual([])
    })
  })
})
