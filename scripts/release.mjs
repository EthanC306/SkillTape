// Cuts a Windows release that the installed app can actually see.
//
// `npm run release:win`. No dependencies beyond Node 18's global fetch — this
// runs beside electron-builder, which already owns the hard parts (packaging,
// signing-less NSIS, asset upload). What this adds is the part electron-builder
// deliberately leaves to you: making sure the release ends up *published*, with
// every asset present, and failing loudly when it can't.
//
// WHY THIS SCRIPT EXISTS AT ALL
//
// electron-updater resolves the latest version from releases.atom, and GitHub
// omits draft releases from that feed. So a draft release is, from the app's
// point of view, indistinguishable from no release. Every earlier attempt at
// shipping an update produced exactly that: a release page that looked correct
// while logged in, and an app that reported "No published versions on GitHub"
// forever.
//
// Worse, it is sticky. electron-publish's gitHubPublisher.js does:
//
//     if (release.draft) { return release }   // reuse it, never flip it
//
// so once a tag has a draft, re-running the build re-uploads into that same
// draft and nothing ever publishes it. Flipping `releaseType: release` in
// electron-builder.yml does NOT fix it — releaseType only applies when a
// release is *created*. The only fixes are: delete the draft, or bump the
// version. Preflight below checks for this by name and says which to do.
//
// The order of operations here is the point: upload into a draft (invisible),
// verify the assets, and only then PATCH draft:false. The atom feed therefore
// never advertises a release whose latest.yml points at a file that isn't
// there yet — an app checking mid-upload sees the previous version, not a
// broken download.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OWNER = "EthanC306";
const REPO = "SkillTape";
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

/** Abort with a named reason and no stack trace — a failed preflight is an
 *  expected outcome to be read, not an exception to be debugged. */
function fail(reason, fix) {
  console.error(`\n✗ release aborted: ${reason}`);
  if (fix) console.error(`  fix: ${fix}`);
  console.error("");
  process.exit(1);
}

function step(msg) {
  console.log(`\n▸ ${msg}`);
}

async function gh(pathname, init = {}) {
  const res = await fetch(`${API}${pathname}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    fail(
      `GitHub API ${init.method || "GET"} ${pathname} → ${res.status}`,
      res.status === 401 || res.status === 403
        ? "check GH_TOKEN's scopes: classic token needs `repo`, fine-grained needs Contents: Read and write"
        : body.slice(0, 400)
    );
  }
  return res.status === 204 ? null : res.json();
}

// ---------------------------------------------------------------------------
// 1. Preflight — every check that can be made before spending a build.
// ---------------------------------------------------------------------------

step("preflight");

if (!token) {
  fail(
    "neither GH_TOKEN nor GITHUB_TOKEN is set",
    "export GH_TOKEN=<a token with repo / Contents:RW scope>, then re-run"
  );
}

const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
const version = pkg.version;
const tag = `v${version}`;

// Deliberately strict: no prerelease/build suffixes. electron-updater compares
// these with semver, and a `1.0.2-beta.1` in this repo would only ever be a
// typo, not an intent — better to reject it than to ship an update the app
// silently refuses to see as newer.
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  fail(`package.json version "${version}" is not a plain x.y.z semver`, "edit package.json");
}

// Clean tree: the version in the built artifact comes from package.json, so a
// release built from a dirty tree is unreproducible by definition.
const dirty = execSync("git status --porcelain", { cwd: ROOT, encoding: "utf8" }).trim();
if (dirty) {
  fail(
    "git working tree is not clean",
    `commit or stash first:\n${dirty.split("\n").map((l) => `        ${l}`).join("\n")}`
  );
}

// The trap. Authenticated GET /releases lists drafts too — that's exactly why
// this check has to be authenticated, and why you can't see the problem with a
// plain curl. Match on tag_name, since a draft may have no git tag behind it.
const releases = await gh("/releases?per_page=100");
const existing = releases.find((r) => r.tag_name === tag);
if (existing) {
  fail(
    `a ${existing.draft ? "draft" : "published"} release already exists for ${tag}`,
    existing.draft
      ? `delete it at ${existing.html_url} — electron-publish reuses an existing draft and never publishes it, so this tag can't ship until the draft is gone. Or bump package.json's version.`
      : `bump package.json's version — ${tag} has already shipped (${existing.html_url})`
  );
}

// Must be strictly newer than what's live, or installed apps will ignore it.
const latestRes = await fetch(`${API}/releases/latest`, {
  headers: { accept: "application/vnd.github+json", authorization: `Bearer ${token}` },
});
if (latestRes.ok) {
  const latest = await latestRes.json();
  const published = String(latest.tag_name).replace(/^v/, "");
  if (compareSemver(version, published) <= 0) {
    fail(
      `package.json version ${version} is not greater than the published latest (${published})`,
      "bump package.json's version"
    );
  }
  console.log(`  published latest: ${published} → releasing ${version}`);
} else if (latestRes.status === 404) {
  console.log(`  no published release yet — ${version} will be the first`);
} else {
  fail(`GET /releases/latest → ${latestRes.status}`);
}

console.log("  ✓ token present, version valid and newer, no existing release for this tag, tree clean");

// ---------------------------------------------------------------------------
// 2. Build + upload into the draft.
// ---------------------------------------------------------------------------
//
// Delegates wholesale to the existing `electron:publish:win` script rather than
// re-implementing its steps. That script's `electron:clean-native` stage is
// load-bearing: it deletes any host-compiled native artifact so the bundled
// win32-x64 prebuilds win (see the long README note on bcrypt — getting this
// wrong produces an installer that packages fine and crashes on first login).
// Keeping one definition of the Windows build means this script can't drift
// away from it.

step(`building and uploading ${tag} (draft)`);
run("npm run electron:publish:win");

// ---------------------------------------------------------------------------
// 3. Verify assets on the draft before anyone can see it.
// ---------------------------------------------------------------------------

step("verifying release assets");

const after = await gh("/releases?per_page=100");
const draft = after.find((r) => r.tag_name === tag);
if (!draft) fail(`electron-builder did not create a release for ${tag}`);

const exeName = `SkillTape-Setup-${version}.exe`;
const required = ["latest.yml", exeName, `${exeName}.blockmap`];

for (const name of required) {
  const asset = draft.assets.find((a) => a.name === name);
  if (!asset) {
    fail(
      `asset "${name}" missing from the ${tag} draft`,
      `uploaded: ${draft.assets.map((a) => a.name).join(", ") || "(none)"}`
    );
  }
  if (!asset.size) fail(`asset "${name}" uploaded with size 0`);
  console.log(`  ✓ ${name} (${(asset.size / 1024 / 1024).toFixed(1)} MB)`);
}

// latest.yml is the file the installed app reads to decide what to download.
// If its `path:` disagrees with the actual asset name — the exact failure mode
// the space-free artifactName in electron-builder.yml was chosen to prevent —
// every client 404s on download while the release page looks perfectly fine.
// Assert it here, where it's one line, rather than discovering it on a user's
// machine.
const latestYmlAsset = draft.assets.find((a) => a.name === "latest.yml");
const latestYml = await (
  await fetch(latestYmlAsset.url, {
    headers: { accept: "application/octet-stream", authorization: `Bearer ${token}` },
  })
).text();
const declaredPath = /^path:\s*(.+)$/m.exec(latestYml)?.[1]?.trim();
if (declaredPath !== exeName) {
  fail(
    `latest.yml declares path: ${declaredPath ?? "(none)"} but the uploaded asset is ${exeName}`,
    "every client would 404 on download; check nsis.artifactName in electron-builder.yml"
  );
}
console.log(`  ✓ latest.yml path: matches the uploaded installer`);

// ---------------------------------------------------------------------------
// 4. Flip draft → published. This is the moment the release becomes real.
// ---------------------------------------------------------------------------

step("publishing (draft → release)");
const published = await gh(`/releases/${draft.id}`, {
  method: "PATCH",
  body: JSON.stringify({ draft: false }),
});

console.log(`\n✓ ${tag} published — ${published.html_url}`);
console.log("  installed apps will pick it up on their next check (launch, then every 6h).");
console.log("  confirm it is visible to the updater, not just to you:");
console.log(`    curl -s https://github.com/${OWNER}/${REPO}/releases.atom | grep -c '<entry'\n`);

// ---------------------------------------------------------------------------

function run(cmd) {
  console.log(`  $ ${cmd}`);
  try {
    execSync(cmd, { cwd: ROOT, stdio: "inherit" });
  } catch {
    fail(`\`${cmd}\` failed — see its output above`);
  }
}

function compareSemver(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] > pb[i] ? 1 : -1;
  }
  return 0;
}
