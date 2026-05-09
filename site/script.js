const revealElements = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -8% 0px",
    },
  );

  revealElements.forEach((element) => observer.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}

const metricElements = {
  githubStars: document.querySelector('[data-metric="github-stars"]'),
  marketplaceInstalls: document.querySelector('[data-metric="marketplace-installs"]'),
  openvsxDownloads: document.querySelector('[data-metric="openvsx-downloads"]'),
  marketplaceRating: document.querySelector('[data-metric="marketplace-rating"]'),
};

function formatCompactNumber(value) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function setMetric(element, value) {
  if (element) element.textContent = value;
}

async function loadGithubStars() {
  try {
    const response = await fetch("https://api.github.com/repos/guilhermec-costa/code-telescope");
    if (!response.ok) throw new Error("GitHub request failed");
    const data = await response.json();
    setMetric(metricElements.githubStars, formatCompactNumber(data.stargazers_count));
  } catch {
    setMetric(metricElements.githubStars, "GitHub");
  }
}

async function loadOpenVsxDownloads() {
  try {
    const response = await fetch("https://open-vsx.org/api/guichina/code-telescope/latest");
    if (!response.ok) throw new Error("Open VSX request failed");
    const data = await response.json();
    setMetric(metricElements.openvsxDownloads, formatCompactNumber(data.downloadCount));
  } catch {
    setMetric(metricElements.openvsxDownloads, "Open VSX");
  }
}

function getMarketplaceStatistic(statistics, name) {
  return statistics.find((item) => item.statisticName === name)?.value;
}

async function loadMarketplaceMetrics() {
  try {
    const response = await fetch(
      "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery?api-version=7.2-preview.1",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json;api-version=7.2-preview.1;excludeUrls=true",
          "X-Market-Client-Id": "code-telescope-site",
        },
        body: JSON.stringify({
          filters: [
            {
              criteria: [{ filterType: 7, value: "guichina.code-telescope" }],
              pageNumber: 1,
              pageSize: 1,
              sortBy: 0,
              sortOrder: 0,
            },
          ],
          assetTypes: [],
          flags: 914,
        }),
      },
    );

    if (!response.ok) throw new Error("Marketplace request failed");

    const data = await response.json();
    const extension = data.results?.[0]?.extensions?.[0];
    const statistics = extension?.statistics ?? [];

    const installs = getMarketplaceStatistic(statistics, "install");
    const averageRating = getMarketplaceStatistic(statistics, "averagerating");
    const ratingCount = getMarketplaceStatistic(statistics, "ratingcount");

    setMetric(
      metricElements.marketplaceInstalls,
      typeof installs === "number" ? formatCompactNumber(installs) : "Marketplace",
    );

    if (typeof averageRating === "number") {
      const suffix = typeof ratingCount === "number" ? ` (${formatCompactNumber(ratingCount)})` : "";
      setMetric(metricElements.marketplaceRating, `${averageRating.toFixed(1)}★${suffix}`);
    } else {
      setMetric(metricElements.marketplaceRating, "Marketplace");
    }
  } catch {
    setMetric(metricElements.marketplaceInstalls, "Marketplace");
    setMetric(metricElements.marketplaceRating, "Marketplace");
  }
}

loadGithubStars();
loadOpenVsxDownloads();
loadMarketplaceMetrics();
