const DEPLOYMENTS_API_URL =
  "https://api.github.com/repos/atenni/two-dollar-synth/deployments?environment=github-pages&per_page=1";
const MAIN_COMMIT_API_URL =
  "https://api.github.com/repos/atenni/two-dollar-synth/commits/main";

export function shortenCommitHash(hash) {
  return hash?.trim().slice(0, 7) || "local";
}

export function shouldFetchDeployedHash(locationObj = globalThis.location) {
  return locationObj?.hostname === "atenni.github.io";
}

async function fetchJson(fetcher, url) {
  const response = await fetcher(url, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (!response.ok) {
    throw new Error(`GitHub API request failed: ${response.status}`);
  }

  return response.json();
}

export async function fetchDeployedCommitHash(fetcher = globalThis.fetch) {
  if (typeof fetcher !== "function") return "local";

  try {
    const deployments = await fetchJson(fetcher, DEPLOYMENTS_API_URL);
    const deploymentHash = shortenCommitHash(deployments?.[0]?.sha);
    if (deploymentHash !== "local") return deploymentHash;
  } catch {
    // Fall back to main when the deployments endpoint is unavailable.
  }

  try {
    const commit = await fetchJson(fetcher, MAIN_COMMIT_API_URL);
    return shortenCommitHash(commit?.sha);
  } catch {
    return "local";
  }
}

export async function renderCommitHash(
  root = document,
  fetcher = globalThis.fetch,
  locationObj = globalThis.location,
) {
  const target = root.querySelector("[data-commit-hash]");
  if (!target) return;

  if (!shouldFetchDeployedHash(locationObj)) {
    target.textContent = "local";
    return;
  }

  target.textContent = await fetchDeployedCommitHash(fetcher);
}
