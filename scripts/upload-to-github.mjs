// 通过 GitHub REST API（api.github.com）把本地仓库推送为单个 commit
// 用法: GITHUB_TOKEN=xxx node upload-to-github.mjs <owner> <repo> <branch>
// 仅使用 Git Data API：blob → tree → commit → ref，等价于一次 git push
import { readFileSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const [owner, repo, branch = "main"] = process.argv.slice(2);
const token = process.env.GITHUB_TOKEN;
if (!owner || !repo || !token) {
  console.error("Usage: GITHUB_TOKEN=xxx node upload-to-github.mjs <owner> <repo> [branch]");
  process.exit(1);
}

const ROOT = path.resolve(import.meta.dirname, "..");
const API = "https://api.github.com";

async function api(method, url, body, raw = false) {
  const res = await fetch(API + url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(raw ? { "Content-Type": "application/octet-stream" } : { "Content-Type": "application/json" }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    throw new Error(`${method} ${url} -> ${res.status}: ${typeof data === "string" ? data.slice(0, 300) : JSON.stringify(data).slice(0, 300)}`);
  }
  return data;
}

// 1. 列出 git 追踪的文件
const files = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" })
  .split("\n").filter(Boolean);
console.log(`Files to upload: ${files.length}`);

// 2. 创建 blobs（跳过超过 95MB 的文件）
const treeItems = [];
for (const f of files) {
  const full = path.join(ROOT, f);
  const size = statSync(full).size;
  if (size > 95 * 1024 * 1024) {
    console.error(`SKIP (too large): ${f}`);
    continue;
  }
  const content = readFileSync(full);
  const blob = await api("POST", `/repos/${owner}/${repo}/git/blobs`, {
    content: content.toString("base64"),
    encoding: "base64",
  });
  treeItems.push({ path: f.replaceAll("\\", "/"), mode: "100644", type: "blob", sha: blob.sha });
  console.log(`  blob ok: ${f} (${(size / 1024).toFixed(1)} KB)`);
}

// 3. 基于远程分支当前 HEAD（若仓库为空则无 parent）创建 tree + commit
let parentCommit = null;
try {
  const ref = await api("GET", `/repos/${owner}/${repo}/git/ref/heads/${branch}`);
  parentCommit = ref.object.sha;
  console.log(`Base commit: ${parentCommit}`);
} catch {
  console.log("Remote branch empty — creating orphan commit (fresh repo)");
}

const tree = await api("POST", `/repos/${owner}/${repo}/git/trees`, {
  ...(parentCommit ? { base_tree: parentCommit } : {}),
  tree: treeItems,
});
const commit = await api("POST", `/repos/${owner}/${repo}/git/commits`, {
  message: "feat: Agent Jury — Blind Consensus for AI Agents (Monad Testnet)\n\n4 independent AI juror agents (Security/Intent/Economic/Adversarial) run an isolated commit-reveal scheme; fixed-code consensus (>=3 votes) anchors verdicts on-chain via AgentJuryRegistry.",
  tree: tree.sha,
  ...(parentCommit ? { parents: [parentCommit] } : {}),
});

// 4. 更新分支引用（分支不存在则创建）
if (parentCommit) {
  await api("PATCH", `/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    sha: commit.sha,
    force: false,
  });
} else {
  await api("POST", `/repos/${owner}/${repo}/git/refs`, {
    ref: `refs/heads/${branch}`,
    sha: commit.sha,
  });
}

console.log(`\nDONE. Commit ${commit.sha} pushed to ${owner}/${repo}@${branch}`);
console.log(`Repo: https://github.com/${owner}/${repo}/commit/${commit.sha}`);
