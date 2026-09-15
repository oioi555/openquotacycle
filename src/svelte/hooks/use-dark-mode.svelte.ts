import type { ThemeMode } from "@/lib/settings";

/** Apply the theme preference to the document root (mirrors use-settings-theme). */
export function applyThemeMode(themeMode: ThemeMode): () => void {
  const root = document.documentElement;
  const apply = (dark: boolean) => {
    root.classList.toggle("dark", dark);
  };

  if (themeMode === "light") {
    apply(false);
    return () => {};
  }
  if (themeMode === "dark") {
    apply(true);
    return () => {};
  }

  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  apply(mq.matches);
  const handler = (e: MediaQueryListEvent) => apply(e.matches);
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

class DarkModeController {
  isDark = $state(
    typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );

  private observer: MutationObserver | null = null;

  /**
   * Tracks the actual `dark` class on documentElement, which respects the
   * theme setting (light/dark/system) rather than only the system preference.
   */
  observe(): () => void {
    if (typeof document === "undefined") return () => {};
    const root = document.documentElement;
    this.observer = new MutationObserver(() => {
      this.isDark = root.classList.contains("dark");
    });
    this.observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    this.isDark = root.classList.contains("dark");
    return () => {
      this.observer?.disconnect();
      this.observer = null;
    };
  }
}

export const darkModeController = new DarkModeController();
