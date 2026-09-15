// jsdom setup for Svelte component tests and shared lib tests.
import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/svelte"
import { afterAll, afterEach } from "vitest"

afterEach(() => {
  cleanup()
})

// bits-ui dropdowns reset body scroll ~24ms after unmount. Wait so that
// cleanup still sees `document` before jsdom is torn down for the file.
afterAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 40))
})

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver
}

// jsdom lacks the Web Animations API; Svelte transitions call element.animate.
if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = (() => ({
    onfinish: null,
    cancel: () => {},
    finished: Promise.resolve(),
  })) as unknown as typeof Element.prototype.animate
}

// The contract test runs in the node environment (no DOM); guard DOM globals.
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}
