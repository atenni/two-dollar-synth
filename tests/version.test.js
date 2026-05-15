import { describe, it, expect } from "vitest";
import {
  fetchDeployedCommitHash,
  renderCommitHash,
  shortenCommitHash,
  shouldFetchDeployedHash,
} from "../src/version.js";

function okJson(value) {
  return {
    ok: true,
    json: async () => value,
  };
}

describe("shortenCommitHash()", () => {
  it("returns the first seven characters of a commit hash", () => {
    expect(shortenCommitHash("abcdef1234567890")).toBe("abcdef1");
  });

  it("falls back to local when the hash is missing", () => {
    expect(shortenCommitHash(" ")).toBe("local");
  });
});

describe("shouldFetchDeployedHash()", () => {
  it("only fetches deployment metadata on the production GitHub Pages host", () => {
    expect(shouldFetchDeployedHash({ hostname: "atenni.github.io" })).toBe(
      true,
    );
    expect(shouldFetchDeployedHash({ hostname: "localhost" })).toBe(false);
  });
});

describe("fetchDeployedCommitHash()", () => {
  it("uses the latest GitHub Pages deployment SHA when available", async () => {
    const hash = await fetchDeployedCommitHash(async () =>
      okJson([{ sha: "1234567890abcdef" }]),
    );

    expect(hash).toBe("1234567");
  });

  it("falls back to the main branch commit when deployment metadata is empty", async () => {
    const responses = [okJson([]), okJson({ sha: "abcdef1234567890" })];
    const hash = await fetchDeployedCommitHash(async () => responses.shift());

    expect(hash).toBe("abcdef1");
  });

  it("falls back to local when GitHub metadata cannot be fetched", async () => {
    const hash = await fetchDeployedCommitHash(async () => ({
      ok: false,
      status: 500,
    }));

    expect(hash).toBe("local");
  });
});

describe("renderCommitHash()", () => {
  it("writes the fetched commit hash to the footer target on GitHub Pages", async () => {
    const root = document.createElement("div");
    root.innerHTML = "<code data-commit-hash>local</code>";

    await renderCommitHash(
      root,
      async () => okJson([{ sha: "abc123456789" }]),
      { hostname: "atenni.github.io" },
    );

    expect(root.querySelector("[data-commit-hash]").textContent).toBe(
      "abc1234",
    );
  });

  it("keeps local as the footer value outside the deployed host", async () => {
    const root = document.createElement("div");
    root.innerHTML = "<code data-commit-hash>abc1234</code>";

    await renderCommitHash(root, async () => okJson([]), {
      hostname: "localhost",
    });

    expect(root.querySelector("[data-commit-hash]").textContent).toBe("local");
  });

  it("does nothing when the footer target is missing", () => {
    const root = document.createElement("div");

    expect(() => renderCommitHash(root, "abc1234")).not.toThrow();
  });
});
