import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchReleaseByTag } from "./use-changelog.svelte";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchReleaseByTag", () => {
  it("requests oioi555/openquotacycle releases", async () => {
    const fetchMock = vi.fn(async () => ({ status: 404, ok: false }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchReleaseByTag("v0.1.1");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/oioi555/openquotacycle/releases/tags/v0.1.1",
    );
  });
});
