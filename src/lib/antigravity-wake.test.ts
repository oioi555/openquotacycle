import { describe, expect, it } from "vitest"
import type { PluginOutput } from "./plugin-types"
import {
  ANTIGRAVITY_PLUGIN_ID,
  ANTIGRAVITY_START_AGY_NOTICE,
  GROK_PLUGIN_ID,
  GROK_START_NOTICE,
  isAntigravityCredentialError,
  isAntigravityStale,
  isCredentialError,
  needsAntigravityWake,
  needsCredentialWake,
  shouldShowAntigravityStartAgy,
  shouldShowWakeAction,
  wakeSucceeded,
} from "./antigravity-wake"

const stale: PluginOutput = {
  providerId: ANTIGRAVITY_PLUGIN_ID,
  displayName: "Antigravity",
  iconUrl: "x",
  lines: [],
  statuses: [{ text: "Stale", tone: "warning" }],
}

describe("antigravity-wake helpers", () => {
  it("detects the credential error and Stale chip", () => {
    expect(isAntigravityCredentialError("Antigravity session expired. Start Antigravity or agy and try again.")).toBe(true)
    expect(isAntigravityCredentialError(ANTIGRAVITY_START_AGY_NOTICE)).toBe(true)
    expect(isAntigravityCredentialError("quota page down")).toBe(false)
    expect(isAntigravityStale(stale)).toBe(true)
    expect(isAntigravityStale({ ...stale, statuses: [] })).toBe(false)
    expect(needsAntigravityWake({ error: "Antigravity session expired. Start Antigravity or agy and try again.", data: null })).toBe(
      true,
    )
    expect(needsAntigravityWake({ error: null, data: stale })).toBe(true)
  })

  it("shows Start agy when agy is on PATH and wake is needed, including while auto is on", () => {
    expect(
      shouldShowAntigravityStartAgy({
        pluginId: ANTIGRAVITY_PLUGIN_ID,
        autoWake: false,
        agyAvailable: true,
        error: "Antigravity session expired. Start Antigravity or agy and try again.",
        data: null,
      }),
    ).toBe(true)
    expect(
      shouldShowAntigravityStartAgy({
        pluginId: ANTIGRAVITY_PLUGIN_ID,
        autoWake: true,
        agyAvailable: true,
        data: stale,
      }),
    ).toBe(true)
    expect(
      needsAntigravityWake({
        error: null,
        staleError: "Antigravity session expired. Start Antigravity or agy and try again.",
        data: stale,
      }),
    ).toBe(true)
    expect(
      shouldShowAntigravityStartAgy({
        pluginId: ANTIGRAVITY_PLUGIN_ID,
        autoWake: false,
        agyAvailable: false,
        data: stale,
      }),
    ).toBe(false)
  })

  it("treats spawned and already-running as wake success", () => {
    expect(wakeSucceeded("spawned")).toBe(true)
    expect(wakeSucceeded("alreadyRunning")).toBe(true)
    expect(wakeSucceeded("failed")).toBe(false)
    expect(wakeSucceeded("missing")).toBe(false)
  })
})

const grokStale: PluginOutput = {
  providerId: GROK_PLUGIN_ID,
  displayName: "Grok",
  iconUrl: "x",
  lines: [],
  statuses: [{ text: "Stale", tone: "warning" }],
}

describe("grok credential-wake helpers", () => {
  it("wakes only on the credential error, not a network Stale chip", () => {
    expect(isCredentialError(GROK_PLUGIN_ID, GROK_START_NOTICE)).toBe(true)
    expect(
      isCredentialError(GROK_PLUGIN_ID, "Usage request failed (HTTP 503). Try again later."),
    ).toBe(false)
    expect(
      needsCredentialWake(GROK_PLUGIN_ID, {
        error: GROK_START_NOTICE,
        data: null,
      }),
    ).toBe(true)
    expect(
      needsCredentialWake(GROK_PLUGIN_ID, {
        error: null,
        staleError: GROK_START_NOTICE,
        data: grokStale,
      }),
    ).toBe(true)
    expect(
      needsCredentialWake(GROK_PLUGIN_ID, {
        error: null,
        staleError: "Usage request failed. Check your connection.",
        data: grokStale,
      }),
    ).toBe(false)
    expect(
      shouldShowWakeAction({
        pluginId: GROK_PLUGIN_ID,
        available: true,
        data: grokStale,
      }),
    ).toBe(false)
    expect(
      shouldShowWakeAction({
        pluginId: GROK_PLUGIN_ID,
        available: true,
        error: GROK_START_NOTICE,
      }),
    ).toBe(true)
    expect(
      shouldShowWakeAction({
        pluginId: GROK_PLUGIN_ID,
        available: false,
        error: GROK_START_NOTICE,
      }),
    ).toBe(false)
  })
})
