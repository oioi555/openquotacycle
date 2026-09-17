(function () {
  // Odd minutes throw so the dashboard notice / stale-while-revalidate path
  // can be inspected on demand. Even minutes return the 3-channel fixture.
  // This plugin is dev-only (not bundled).
  function probe(ctx) {
    if (new Date().getMinutes() % 2 === 1) {
      throw "Usage request failed (HTTP 429). Try again later."
    }

    var sessionMs = 5 * 60 * 60 * 1000
    var weekMs = 7 * 24 * 60 * 60 * 1000
    return {
      plan: "Pro",
      lines: [
        ctx.line.progress({
          label: "Session",
          used: 40,
          limit: 100,
          format: { kind: "percent" },
          resetsAt: new Date(Date.now() + sessionMs).toISOString(),
          periodDurationMs: sessionMs,
        }),
        ctx.line.progress({
          label: "Weekly",
          used: 25,
          limit: 100,
          format: { kind: "percent" },
          resetsAt: new Date(Date.now() + weekMs).toISOString(),
          periodDurationMs: weekMs,
        }),
        ctx.line.text({ label: "Extra Usage", value: "5 cap" }),
      ],
      statuses: [ctx.status.chip({ text: "Peak", tone: "danger" })],
    }
  }

  globalThis.__openquotacycle_plugin = { id: "mock", probe }
})()
