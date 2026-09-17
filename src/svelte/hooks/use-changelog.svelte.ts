export interface Release {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  published_at: string | null;
  html_url: string;
}

export async function fetchReleaseByTag(tag: string): Promise<Release | null> {
  const url = `https://api.github.com/repos/oioi555/openquotacycle/releases/tags/${encodeURIComponent(tag)}`;
  const res = await fetch(url);

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error("Failed to fetch releases");
  }

  const data = (await res.json()) as Release;
  return data;
}

class ChangelogController {
  releases = $state<Release[]>([]);
  loading = $state(false);
  error = $state<string | null>(null);

  private fetchToken = 0;

  async fetchForVersion(currentVersion: string): Promise<void> {
    const token = ++this.fetchToken;
    this.loading = true;
    this.releases = [];
    this.error = null;

    try {
      let release: Release | null = null;

      if (currentVersion.startsWith("v")) {
        release =
          (await fetchReleaseByTag(currentVersion)) ??
          (await fetchReleaseByTag(currentVersion.slice(1)));
      } else {
        release =
          (await fetchReleaseByTag(`v${currentVersion}`)) ??
          (await fetchReleaseByTag(currentVersion));
      }

      if (token !== this.fetchToken) return;
      this.releases = release ? [release] : [];
      this.error = null;
    } catch (err) {
      if (token !== this.fetchToken) return;
      this.error = err instanceof Error ? err.message : "Failed to fetch releases";
    } finally {
      if (token === this.fetchToken) {
        this.loading = false;
      }
    }
  }
}

export const changelogController = new ChangelogController();
