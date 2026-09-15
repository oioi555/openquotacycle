import {
  addWindowStarterAttempt,
  getLatestAttemptForProvider,
  getLatestAttemptForWindow,
  getProviderLockRemainingMs,
  getWindowLockRemainingMs,
  isProviderLocked,
  isWindowLocked,
  loadWindowStarterAttempts,
  saveWindowStarterAttempts,
  type WindowStarterAttempt,
  type WindowStarterAttemptStatus,
} from "@/lib/window-starter";

class WindowStarterController {
  attempts = $state<WindowStarterAttempt[]>([]);

  setAttempts(attempts: WindowStarterAttempt[]): void {
    this.attempts = attempts;
  }

  /** Prepend and persist the attempt immediately (newest-first, bounded to 500). */
  async addAttempt(attempt: WindowStarterAttempt): Promise<void> {
    const next = addWindowStarterAttempt(this.attempts, attempt);
    this.attempts = next;
    await saveWindowStarterAttempts(next);
  }

  /** Patch an existing attempt in place and persist. */
  async updateAttempt(
    id: string,
    patch: Partial<Omit<WindowStarterAttempt, "id">>,
  ): Promise<void> {
    const next = this.attempts.map((attempt) =>
      attempt.id === id ? { ...attempt, ...patch } : attempt,
    );
    this.attempts = next;
    await saveWindowStarterAttempts(next);
  }

  /** Hydrate persisted attempts from the Window Starter store. */
  async loadAttempts(): Promise<void> {
    this.attempts = await loadWindowStarterAttempts();
  }

  resetState(): void {
    this.attempts = [];
  }

  async setAttemptStatus(id: string, status: WindowStarterAttemptStatus): Promise<void> {
    await this.updateAttempt(id, { status });
  }

  isWindowLocked(
    pluginId: string,
    windowLine: string,
    nowMs: number,
    firstDeclaredWindowLine?: string,
  ): boolean {
    return isWindowLocked(this.attempts, pluginId, windowLine, nowMs, firstDeclaredWindowLine);
  }

  getLatestAttemptForWindow(
    pluginId: string,
    windowLine: string,
    firstDeclaredWindowLine?: string,
  ): WindowStarterAttempt | null {
    return getLatestAttemptForWindow(
      this.attempts,
      pluginId,
      windowLine,
      firstDeclaredWindowLine,
    );
  }

  getWindowLockRemainingMs(
    pluginId: string,
    windowLine: string,
    nowMs: number,
    firstDeclaredWindowLine?: string,
  ): number | null {
    return getWindowLockRemainingMs(
      this.attempts,
      pluginId,
      windowLine,
      nowMs,
      firstDeclaredWindowLine,
    );
  }

  /** @deprecated Use window-keyed helpers. Maps to the plugin's first declared window. */
  isProviderLocked(providerId: string, nowMs: number): boolean {
    return isProviderLocked(this.attempts, providerId, nowMs);
  }

  /** @deprecated Use getLatestAttemptForWindow. */
  getLatestAttemptForProvider(providerId: string): WindowStarterAttempt | null {
    return getLatestAttemptForProvider(this.attempts, providerId);
  }

  /** @deprecated Use getWindowLockRemainingMs. */
  getProviderLockRemainingMs(providerId: string, nowMs: number): number | null {
    return getProviderLockRemainingMs(this.attempts, providerId, nowMs);
  }
}

export const windowStarterController = new WindowStarterController();
