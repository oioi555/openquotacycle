// Shared Svelte-UI view types (kept in plain .ts so both tsc and svelte-check
// can import them without going through the *.svelte module shim).

export type ProviderContextMenuAction = "reload" | "remove" | "customize";

export type SettingsWindowStarterWindow = {
  id: string;
  line: string;
  enabled: boolean;
};

export type SettingsWindowStarterConfig = {
  defaultRunner: string;
  allowedRunners: string[];
  runnerId: string;
  windows: SettingsWindowStarterWindow[];
};

export type SettingsPluginConfig = {
  id: string;
  name: string;
  enabled: boolean;
  iconUrl: string;
  brandColor?: string;
  overviewProgressBars: Array<{ label: string; checked: boolean }>;
  windowStarter?: SettingsWindowStarterConfig;
  antigravityAgyAutoWake?: boolean;
  grokAutoWake?: boolean;
};
