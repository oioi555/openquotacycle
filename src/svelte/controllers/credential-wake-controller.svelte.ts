import {
  ANTIGRAVITY_PLUGIN_ID,
  ANTIGRAVITY_WAKE_COOLDOWN_MS,
  ANTIGRAVITY_WAKE_STALE_REPROBE_LIMIT,
  credentialWakeProviders,
  needsCredentialWake,
  wakeSucceeded,
  type AntigravityWakeResult,
} from "@/lib/antigravity-wake";
import {
  credentialWakeAvailability,
  wakeAntigravityAgy,
  wakeCredential,
} from "../lib/backend";
import type { PluginState } from "./probe-controller.svelte";
import { probeController } from "./probe-controller.svelte";

type Slot = {
  autoWake: boolean;
  available: boolean;
  inFlight: Promise<void> | null;
  lastFailedAt: number | null;
  ignoreNextStale: boolean;
  waitingForProbe: boolean;
  staleReprobes: number;
};

function emptySlot(): Slot {
  return {
    autoWake: false,
    available: false,
    inFlight: null,
    lastFailedAt: null,
    ignoreNextStale: false,
    waitingForProbe: false,
    staleReprobes: 0,
  };
}

class CredentialWakeController {
  wakingById = $state<Record<string, boolean>>({});
  availableById = $state<Record<string, boolean>>({
    antigravity: false,
    grok: false,
  });

  get waking(): boolean {
    return this.wakingById[ANTIGRAVITY_PLUGIN_ID] === true;
  }

  private slots: Record<string, Slot> = {
    antigravity: emptySlot(),
    grok: emptySlot(),
  };

  isWaking(pluginId: string): boolean {
    return this.wakingById[pluginId] === true;
  }

  async init(): Promise<void> {
    try {
      this.availableById = await credentialWakeAvailability();
    } catch (error) {
      console.error("Failed to load credential wake availability:", error);
    }
  }

  syncInputs(opts: {
    autoWake: boolean;
    agyAvailable: boolean;
    grokAutoWake?: boolean;
    grokAvailable?: boolean;
  }): void {
    this.syncProvider(ANTIGRAVITY_PLUGIN_ID, opts.autoWake, opts.agyAvailable);
    this.syncProvider("grok", opts.grokAutoWake === true, opts.grokAvailable === true);
  }

  private syncProvider(pluginId: string, autoWake: boolean, available: boolean): void {
    const slot = this.slot(pluginId);
    const turnedOn = autoWake && !slot.autoWake;
    slot.autoWake = autoWake;
    slot.available = available;
    if (turnedOn && slot.available) {
      this.considerAutoWake(probeController.pluginStates[pluginId], pluginId);
    }
  }

  onProbeResult(state: PluginState | undefined, pluginId?: string): void {
    const id = pluginId && credentialWakeProviders[pluginId] ? pluginId : ANTIGRAVITY_PLUGIN_ID;
    if (!pluginId || credentialWakeProviders[pluginId]) {
      const slot = this.slot(id);
      if (slot.waitingForProbe && (!pluginId || pluginId === id)) {
        slot.waitingForProbe = false;
        this.setWaking(id, false);
        slot.staleReprobes = needsCredentialWake(id, state) ? slot.staleReprobes + 1 : 0;
      }
    }
    this.considerAutoWake(state, pluginId);
  }

  considerAutoWake(state: PluginState | undefined, pluginId?: string): void {
    const id = pluginId ?? ANTIGRAVITY_PLUGIN_ID;
    if (!credentialWakeProviders[id]) return;
    const slot = this.slot(id);
    if (!slot.autoWake || !slot.available) return;
    if (this.isWaking(id) || slot.inFlight) return;
    if (!needsCredentialWake(id, state)) {
      slot.ignoreNextStale = false;
      return;
    }
    if (slot.ignoreNextStale) {
      slot.ignoreNextStale = false;
      return;
    }
    if (slot.staleReprobes >= ANTIGRAVITY_WAKE_STALE_REPROBE_LIMIT) {
      slot.lastFailedAt = Date.now();
      slot.staleReprobes = 0;
      return;
    }
    void this.wakeAndReprobe(id);
  }

  wakeAndReprobe(pluginId: string = ANTIGRAVITY_PLUGIN_ID): Promise<void> {
    if (!credentialWakeProviders[pluginId]) return Promise.resolve();
    const slot = this.slot(pluginId);
    if (slot.inFlight) return slot.inFlight;
    if (this.isWaking(pluginId)) return Promise.resolve();
    slot.inFlight = this.run(pluginId).finally(() => {
      slot.inFlight = null;
    });
    return slot.inFlight;
  }

  private slot(pluginId: string): Slot {
    const existing = this.slots[pluginId];
    if (existing) return existing;
    const created = emptySlot();
    this.slots[pluginId] = created;
    return created;
  }

  private setWaking(pluginId: string, value: boolean): void {
    this.wakingById = { ...this.wakingById, [pluginId]: value };
  }

  private failedRecently(slot: Slot, now: number): boolean {
    if (slot.lastFailedAt === null) return false;
    return now - slot.lastFailedAt < ANTIGRAVITY_WAKE_COOLDOWN_MS;
  }

  private async invokeWake(pluginId: string): Promise<AntigravityWakeResult> {
    if (pluginId === ANTIGRAVITY_PLUGIN_ID) return wakeAntigravityAgy();
    return wakeCredential(pluginId);
  }

  private async run(pluginId: string): Promise<void> {
    const slot = this.slot(pluginId);
    const now = Date.now();
    if (!slot.available) return;
    if (this.failedRecently(slot, now)) return;

    this.setWaking(pluginId, true);
    try {
      const result = await this.invokeWake(pluginId);
      if (!wakeSucceeded(result.status)) {
        slot.lastFailedAt = Date.now();
        slot.staleReprobes = 0;
        return;
      }
      slot.lastFailedAt = null;
      slot.ignoreNextStale = true;
      slot.waitingForProbe = true;
      await probeController.startBatch([pluginId]);
    } catch (error) {
      slot.waitingForProbe = false;
      slot.lastFailedAt = Date.now();
      console.error(`Failed to wake ${pluginId}:`, error);
    } finally {
      if (!slot.waitingForProbe) this.setWaking(pluginId, false);
    }
  }

  resetForTests(): void {
    this.wakingById = {};
    this.availableById = { antigravity: false, grok: false };
    this.slots = {
      antigravity: emptySlot(),
      grok: emptySlot(),
    };
  }
}

export const credentialWakeController = new CredentialWakeController();
