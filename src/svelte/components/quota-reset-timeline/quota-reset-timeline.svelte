<script lang="ts">
  import { darkModeController } from "../../hooks/use-dark-mode.svelte";
  import { NowTickerController } from "../../hooks/now-ticker.svelte";
  import type { PluginDisplayState } from "@/lib/plugin-types";
  import { FIVE_HOUR_AXIS_SPAN_MS, WEEKLY_AXIS_SPAN_MS } from "@/lib/quota-timeline/axis";
  import {
    selectQuotaTimelineRows,
    timelineSectionTitle,
    type QuotaTimelineKind,
  } from "@/lib/quota-timeline/select";
  import TimelineSection from "./timeline-section.svelte";
  import type { TimelineLabelMode } from "./reset-marker.svelte";

  /** Providers in the same order as the Overview cards. */
  let { plugins, now }: { plugins: PluginDisplayState[]; now?: number } = $props();

  const ticker = new NowTickerController();
  const nowMs = $derived(now ?? ticker.now);
  const isDark = $derived(darkModeController.isDark);

  $effect(() => {
    if (now !== undefined) {
      ticker.stop();
      return;
    }
    ticker.start({ intervalMs: 1000 });
    return () => ticker.stop();
  });

  interface TimelineSectionConfig {
    kind: QuotaTimelineKind;
    title: string;
    axisSpanMs: number;
    labelMode: TimelineLabelMode;
  }

  const SECTION_CONFIGS: TimelineSectionConfig[] = [
    {
      kind: "five-hour",
      title: timelineSectionTitle("five-hour"),
      axisSpanMs: FIVE_HOUR_AXIS_SPAN_MS,
      labelMode: "time",
    },
    {
      kind: "weekly",
      title: timelineSectionTitle("weekly"),
      axisSpanMs: WEEKLY_AXIS_SPAN_MS,
      labelMode: "month-day",
    },
  ];

  const sections = $derived(
    SECTION_CONFIGS.map((config) => ({
      config,
      rows: selectQuotaTimelineRows(plugins, config.kind),
    })).filter((section) => section.rows.length > 0),
  );
</script>

{#if sections.length > 0}
  <section aria-label="Quota reset timeline" class="@container flex flex-col gap-4">
    <div class="flex flex-col gap-4">
      {#each sections as section (section.config.kind)}
        <TimelineSection
          title={section.config.title}
          kind={section.config.kind}
          rows={section.rows}
          {nowMs}
          {isDark}
          axisSpanMs={section.config.axisSpanMs}
          labelMode={section.config.labelMode}
        />
      {/each}
    </div>
  </section>
{/if}
