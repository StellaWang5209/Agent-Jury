// Mojo 参赛提交流程：验证绑定 → 查重 → 上传截图 → 创建/更新项目
// 用法: node mojo-submit.mjs
import { readFileSync } from "node:fs";
import path from "node:path";

const { agentSecret } = JSON.parse(
  readFileSync(path.join(process.env.USERPROFILE, ".workbuddy", "mojo_agent.json"), "utf8")
);
const API = "https://mojo.devnads.com";
const EVENT_ID = 16;
const H = { Authorization: `Bearer ${agentSecret}`, "Content-Type": "application/json" };

async function call(method, url, body, extraHeaders = {}) {
  const res = await fetch(API + url, {
    method,
    headers: { ...H, ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

// 1. 验证绑定
const me = await call("GET", "/api/agent/me");
const agent = me.data?.data?.agent;
console.log("1) /me:", me.status, "status=", agent?.status, "user=", me.data?.data?.claimedUser?.name ?? "n/a");
if (me.status !== 200 || agent?.status !== "claimed") {
  console.error("绑定未完成，停止。", JSON.stringify(me.data).slice(0, 300));
  process.exit(1);
}

// 2. 查重
const proj = await call("GET", `/api/agent/projects?eventId=${EVENT_ID}`);
console.log("2) projects:", proj.status, JSON.stringify(proj.data).slice(0, 500));
const d = proj.data?.data ?? {};
const existing = d.projects?.[0];
console.log("   event:", proj.data?.data?.event?.name ?? proj.data?.data?.event?.title ?? "n/a");

// 3. 上传截图（申请 → 直传 → 确认）
const SHOTS = [
  { file: "demo-dangerous.png", dir: "screenshots" },
  { file: "demo-safe.png", dir: "screenshots" },
];
const screenshots = [];
for (const s of SHOTS) {
  const full = path.resolve(import.meta.dirname, "..", s.dir, s.file);
  const bin = readFileSync(full);
  const apply = await call("POST", "/api/agent/uploads", {
    filename: s.file,
    contentType: "image/png",
    size: bin.length,
  });
  if (apply.status !== 200 && apply.status !== 201) {
    console.error(`   upload apply failed for ${s.file}:`, apply.status, JSON.stringify(apply.data).slice(0, 300));
    process.exit(1);
  }
  const { uuid, uploadUrl, path: p } = apply.data.data;
  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/png" },
    body: bin,
  });
  if (!put.ok) {
    console.error(`   S3 PUT failed for ${s.file}:`, put.status);
    process.exit(1);
  }
  const confirm = await call("POST", "/api/agent/uploads/confirm", { uuid });
  if (confirm.status !== 200 && confirm.status !== 201) {
    console.error(`   confirm failed for ${s.file}:`, confirm.status, JSON.stringify(confirm.data).slice(0, 300));
    process.exit(1);
  }
  console.log(`3) screenshot ok: ${s.file} (${(bin.length / 1024).toFixed(0)} KB) uuid=${uuid.slice(0, 8)}...`);
  screenshots.push({ uuid, path: p });
}

const payload = {
  name: "Agent Jury — AI Agent 盲审共识陪审团",
  description:
    "解决 AI Agent 群体从众/锚定问题：4 个完全独立的陪审 Agent（安全/意图/经济/对抗视角）在互不可见的环境下盲审同一案件，各自生成 salt 并提交 commitment 哈希密封结论；全部承诺后统一 Reveal，重算哈希验证未被篡改；固定代码统计共识（≥3 票裁决，Security 高置信 BLOCK 触发降级复核），最终结论与 4 个 commitment 锚定上链 Monad Testnet（AgentJuryRegistry，合约 0x2986c8094771162F39AD991d6dc87490149BfeA9）。支持多钱包连接（EIP-6963），未连钱包也可完整体验盲审流程。",
  url: "https://128840e2f4b341a58f39bff9bb57b6d4.app.workbuddy.link",
  eventId: EVENT_ID,
  meta: {
    github: "https://github.com/StellaWang5209/Agent-Jury",
    screenshots,
  },
};

// 4. 创建或更新
if (existing) {
  const upd = await call("PATCH", `/api/agent/projects/${existing.id}`, payload);
  console.log("4) PATCH update:", upd.status, JSON.stringify(upd.data).slice(0, 400));
} else {
  const created = await call("POST", "/api/agent/projects", payload);
  console.log("4) POST create:", created.status);
  if (created.status === 409) {
    console.log("   已有项目 409:", JSON.stringify(created.data));
  } else if (created.status === 400) {
    console.log("   校验失败 fieldErrors:", JSON.stringify(created.data).slice(0, 600));
  } else {
    console.log("   项目已提交，进入 pending 审核:", JSON.stringify(created.data).slice(0, 400));
  }
}
