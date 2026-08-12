const REPO = "EthanC306/SkillTape";
const RELEASES_URL = `https://api.github.com/repos/${REPO}/releases/latest`;

const downloadBtn = document.getElementById("download-win");
const versionBadge = document.getElementById("version-badge");
const releaseStatus = document.getElementById("release-status");
const linuxLinks = document.getElementById("linux-links");

function formatBytes(bytes) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function findAsset(assets, pattern) {
  return assets.find((asset) => pattern.test(asset.name));
}

async function loadLatestRelease() {
  try {
    const response = await fetch(RELEASES_URL, {
      headers: { accept: "application/vnd.github+json" },
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }

    const release = await response.json();
    const version = String(release.tag_name || "").replace(/^v/, "");
    const assets = release.assets || [];

    const winAsset = findAsset(assets, /^SkillTape-Setup-.*\.exe$/i);
    const appImage = findAsset(assets, /\.AppImage$/i);
    const deb = findAsset(assets, /\.deb$/i);

    if (winAsset) {
      downloadBtn.href = winAsset.browser_download_url;
      downloadBtn.hidden = false;
      versionBadge.textContent = version ? `v${version}` : "";
      releaseStatus.textContent = `Latest release: ${release.name || release.tag_name}${
        winAsset.size ? ` · ${formatBytes(winAsset.size)}` : ""
      }`;
    } else {
      releaseStatus.textContent =
        "No Windows installer found on the latest release. Check All releases for downloads.";
    }

    const linuxParts = [];
    if (appImage) {
      linuxParts.push(
        `<a href="${appImage.browser_download_url}" rel="noopener">AppImage</a>`
      );
    }
    if (deb) {
      linuxParts.push(`<a href="${deb.browser_download_url}" rel="noopener">.deb</a>`);
    }

    if (linuxParts.length) {
      linuxLinks.hidden = false;
      linuxLinks.innerHTML = `Linux: ${linuxParts.join(" · ")}`;
    }
  } catch (error) {
    releaseStatus.textContent =
      "Could not load the latest release automatically. Use All releases to download.";
    console.error(error);
  }
}

loadLatestRelease();
