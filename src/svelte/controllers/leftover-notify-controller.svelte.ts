import {
  collectMeltingLeftoverLines,
  formatMeltingLeftoverNotification,
  meltingLeftoverSnapshotReady,
  nextMeltingLeftoverNotifications,
  type MeltingLeftoverPlugin,
} from "@/lib/leftover-notify";
import { showDesktopNotification } from "../lib/backend";

const TICK_MS = 30_000;

export type LeftoverNotifyInputs = {
  plugins: MeltingLeftoverPlugin[];
  remainingBandMs: number;
  notifyEnabled: boolean;
};

class LeftoverNotifyController {
  private inputs: LeftoverNotifyInputs = {
    plugins: [],
    remainingBandMs: 60 * 60_000,
    notifyEnabled: true,
  };
  private seen = new Set<string>();
  private seeded = false;
  private interval: ReturnType<typeof setInterval> | null = null;

  syncInputs(inputs: LeftoverNotifyInputs, nowMs: number = Date.now()): void {
    this.inputs = inputs;
    this.ensureTicker();
    this.evaluate(nowMs);
  }

  evaluate(nowMs: number): void {
    if (!meltingLeftoverSnapshotReady(this.inputs.plugins)) return;
    const current = collectMeltingLeftoverLines(
      this.inputs.plugins,
      nowMs,
      this.inputs.remainingBandMs,
    );
    const { nextKeys, notifications } = nextMeltingLeftoverNotifications(this.seen, current, {
      notifyEnabled: this.inputs.notifyEnabled,
      seeded: this.seeded,
    });
    this.seen = nextKeys;
    this.seeded = true;
    for (const line of notifications) {
      const { title, body } = formatMeltingLeftoverNotification(line);
      void showDesktopNotification(title, body).catch((error) => {
        console.error("Failed to show leftover notification:", error);
      });
    }
  }

  resetForTests(): void {
    this.seen = new Set();
    this.seeded = false;
    this.inputs = {
      plugins: [],
      remainingBandMs: 60 * 60_000,
      notifyEnabled: true,
    };
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private ensureTicker(): void {
    if (this.interval || typeof setInterval !== "function") return;
    this.interval = setInterval(() => this.evaluate(Date.now()), TICK_MS);
  }
}

export const leftoverNotifyController = new LeftoverNotifyController();
