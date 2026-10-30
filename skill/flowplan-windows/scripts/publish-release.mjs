import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const token = process.env.GH_TOKEN;
const repo = process.env.GH_REPO || "kimducanh27-cpu/flowplan-windows";
const version = (process.env.VERSION || "").replace(/^v/, "");
const tag = process.env.TAG || (version ? `v${version}-win64` : "");
const dryRun = process.env.DRY_RUN === "1";

if (!version) {
  console.error("ERROR: set VERSION (e.g. 1.3.2)");
  process.exit(1);
}
if (!dryRun && !token) {
  console.error("ERROR: set GH_TOKEN");
  process.exit(1);
}

function winPath(input) {
  if (!input) return input;
  if (/^[A-Za-z]:[\\/]/.test(input)) return input;
  if (input.startsWith("/")) {
    return execFileSync("cygpath", ["-w", input], { encoding: "utf8" }).trim();
  }
  return path.resolve(input);
}

const zipPath = winPath(
  process.env.ZIP_PATH || `D:/FlowPlan/dist/FlowPlan-${version}-windows-x64.zip`,
);
const shaPath = winPath(process.env.SHA_PATH || `${zipPath}.sha256`);
const readmePath = winPath(
  process.env.README_PATH || path.join(path.dirname(zipPath), "README-repo.md"),
);
const licensePath = winPath(
  process.env.LICENSE_PATH || path.join(path.dirname(zipPath), "LICENSE"),
);
const releaseBodyPath = winPath(
  process.env.RELEASE_BODY_PATH || path.join(path.dirname(zipPath), "release-body.md"),
);

for (const [label, file] of [
  ["ZIP", zipPath],
  ["SHA", shaPath],
  ["README", readmePath],
  ["LICENSE", licensePath],
  ["RELEASE_BODY", releaseBodyPath],
]) {
  if (!fs.existsSync(file)) {
    console.error(`ERROR: ${label} not found: ${file}`);
    process.exit(1);
  }
}

const zipBuffer = fs.readFileSync(zipPath);
const localHash = crypto.createHash("sha256").update(zipBuffer).digest("hex");
const shaLine = fs.readFileSync(shaPath, "utf8").trim();
const expectedHash = shaLine.split(/\s+/)[0];
if (expectedHash !== localHash) {
  console.error(`ERROR: SHA file does not match zip (${expectedHash} != ${localHash})`);
  process.exit(1);
}

const zipName = path.basename(zipPath);
const vars = {
  VERSION: version,
  TAG: tag,
  ZIP_NAME: zipName,
  SHA256: localHash,
};
function render(text) {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(`{{${key}}}`).join(value);
  }
  return result;
}

const readme = render(fs.readFileSync(readmePath, "utf8"));
const license = fs.readFileSync(licensePath, "utf8");
const releaseBody = render(fs.readFileSync(releaseBodyPath, "utf8"));
const releaseName = `FlowPlan ${version} — Windows x64 (portable)`;

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        repo,
        tag,
        releaseName,
        zipPath,
        zipSize: zipBuffer.length,
        sha256: localHash,
        assets: [zipName, `${zipName}.sha256`],
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const apiBase = "https://api.github.com";
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "User-Agent": "flowplan-windows-skill",
};

async function request(url, options = {}, allow404 = false) {
  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (allow404 && res.status === 404) return null;
  if (!res.ok) {
    console.error(`HTTP ${res.status} ${url}`);
    console.error(JSON.stringify(data).slice(0, 500));
    throw new Error("GitHub API failed");
  }
  return data;
}

async function getContent(remotePath) {
  const data = await request(
    `${apiBase}/repos/${repo}/contents/${remotePath}`,
    {},
    true,
  );
  if (!data) return null;
  return {
    sha: data.sha,
    content: Buffer.from(data.content || "", "base64").toString("utf8"),
  };
}

async function putFile(remotePath, content, message) {
  const current = await getContent(remotePath);
  if (current && current.content === content) {
    console.log(`${remotePath}: unchanged`);
    return;
  }
  const payload = {
    message,
    content: Buffer.from(content, "utf8").toString("base64"),
    branch: "main",
  };
  if (current) payload.sha = current.sha;
  await request(`${apiBase}/repos/${repo}/contents/${remotePath}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  console.log(`${remotePath}: updated`);
}

await putFile("README.md", readme, `Update Windows build README for ${version}`);
await putFile("LICENSE", license, "Update MIT license");

let release = await request(
  `${apiBase}/repos/${repo}/releases/tags/${tag}`,
  {},
  true,
);
if (release) {
  console.log(`release: exists ${release.html_url}`);
  if (release.name !== releaseName || release.body !== releaseBody) {
    release = await request(`${apiBase}/repos/${repo}/releases/${release.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: releaseName, body: releaseBody }),
    });
    console.log("release: notes updated");
  }
} else {
  release = await request(`${apiBase}/repos/${repo}/releases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tag_name: tag,
      target_commitish: "main",
      name: releaseName,
      body: releaseBody,
      draft: false,
      prerelease: false,
    }),
  });
  console.log(`release: created ${release.html_url}`);
}

const desiredAssets = [
  { name: zipName, data: zipBuffer, type: "application/zip", sha: localHash },
  {
    name: `${zipName}.sha256`,
    data: fs.readFileSync(shaPath),
    type: "text/plain",
    sha: crypto
      .createHash("sha256")
      .update(fs.readFileSync(shaPath))
      .digest("hex"),
  },
];

let zipAsset = null;
const assets = await request(`${apiBase}/repos/${repo}/releases/${release.id}/assets`);
for (const desired of desiredAssets) {
  const existing = assets.find((asset) => asset.name === desired.name);
  if (existing) {
    const digest = (existing.digest || "").replace(/^sha256:/, "");
    if (digest && digest !== desired.sha) {
      console.warn(
        `WARNING: existing asset ${desired.name} has digest ${digest}, local ${desired.sha}. Not overwriting; delete/re-upload it explicitly.`,
      );
    } else {
      console.log(`asset: exists, skipped ${desired.name}`);
    }
    if (desired.name === zipName) zipAsset = existing;
    continue;
  }

  const res = await fetch(
    `https://uploads.github.com/repos/${repo}/releases/${release.id}/assets?name=${encodeURIComponent(desired.name)}`,
    {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": desired.type,
      },
      body: desired.data,
    },
  );
  const text = await res.text();
  let uploaded;
  try {
    uploaded = JSON.parse(text);
  } catch {
    uploaded = text;
  }
  if (!res.ok) {
    console.error("UPLOAD FAILED", res.status, JSON.stringify(uploaded).slice(0, 500));
    throw new Error("asset upload failed");
  }
  console.log(`asset: uploaded ${uploaded.name} (${uploaded.size} bytes)`);
  if (desired.name === zipName) zipAsset = uploaded;
}

if (!zipAsset) {
  zipAsset = (await request(`${apiBase}/repos/${repo}/releases/${release.id}/assets`)).find(
    (asset) => asset.name === zipName,
  );
}
if (!zipAsset) throw new Error("zip asset not found after upload");

let download = await fetch(zipAsset.browser_download_url);
if (!download.ok) {
  download = await fetch(zipAsset.url, {
    headers: { ...headers, Accept: "application/octet-stream" },
  });
}
if (!download.ok) throw new Error(`could not download asset for verification (${download.status})`);
const downloaded = Buffer.from(await download.arrayBuffer());
const downloadedHash = crypto.createHash("sha256").update(downloaded).digest("hex");
if (downloadedHash !== localHash) {
  throw new Error(`downloaded asset hash mismatch: ${downloadedHash} != ${localHash}`);
}

console.log(`release: ${release.html_url}`);
console.log(`download: ${zipAsset.browser_download_url}`);
console.log(`sha256: ${localHash} (verified from public download)`);
console.log("PUBLISH OK");
