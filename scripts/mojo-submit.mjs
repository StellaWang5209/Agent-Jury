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
const existing = d.projects?.[0] ?? d.project ?? null;
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
  let putOk = false;
  for (let attempt = 1; attempt <= 4 && !putOk; attempt++) {
    try {
      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/png" },
        body: bin,
      });
      if (put.ok) {
        putOk = true;
        break;
      }
      console.log(`   S3 PUT attempt ${attempt} -> HTTP ${put.status}, retrying...`);
    } catch (e) {
      console.log(`   S3 PUT attempt ${attempt} -> ${e.cause?.code ?? e.message}, retrying...`);
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  if (!putOk) {
    console.error(`   S3 PUT failed for ${s.file} after 4 attempts`);
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
    "【问题】AI Agent 自主执行时代存在三重信任真空：①多 Agent 会商式风控存在从众/锚定效应，毫秒级传染，会一起错且一起自信地错；②链上操作不可逆，Unlimited Approve 被盗即终局，事后追责是验尸，签名前是唯一干预窗口；③黑盒决策无证据链无问责对象，机构资金因此不敢交给 Agent。【方案】Agent Jury = AI Agent 的盲审共识陪审团：4 个完全独立的陪审 Agent（安全/意图/经济/对抗视角）互不可见地盲审同一案件，各自生成 salt 提交 commitment 哈希密封结论，全部承诺后统一 Reveal 并重算哈希验证未被篡改；固定代码统计共识（≥3 票裁决，Security 高置信 BLOCK 触发降级复核）——AI 只有投票权没有定罪权，prompt injection 无从下手；最终结论与 4 个 commitment 锚定上链 Monad（AgentJuryRegistry，测试网合约 0x2986c8094771162F39AD991d6dc87490149BfeA9），成为可组合、可审计的信任原语。【四大创新】Commit-Reveal 盲审从信息层面物理隔离（非提示词恳求）；固定代码共识；裁决上链可组合可审计；多模型交叉盲审架构就绪（支持 DeepSeek/智谱GLM/通义千问/Kimi/Gemini/Grok/OpenAI 七家一键切换，最终形态为用户为 4 名陪审员各选不同大模型——当前黑客松版本为运行方便由单一大模型完成 4 个角色任务，Key 仅存用户本地浏览器）。【双演示】①独立演示台：输入任意案件跑完整盲审流程，危险案例实测 3 BLOCK+1 REVIEW、安全案例 ALLOW；②集成演示·Kuru Exchange：以 Monad 生态旗舰订单簿 DEX 为宿主，交易 Agent 签名前调用 requestAudit() 发起风控审批，5 步管线（发起审批→构建案件→盲审→揭晓共识→裁决回调）后执行/拦截/转人工。合理性：订单簿 DEX 的做市/套利本就由程序化 Agent 7×24 执行；签名前是唯一有效干预窗口；中间件不碰私钥不托管资产，宿主一行 review() 换一层独立风控，零侵入可插拔；模拟的只是宿主侧数据，中间件侧全程真实盲审+真实上链。【中间件定位】不碰私钥、不托管资产、不改交易结构，3 行代码接入，白拿 4 模型评审团与上链可查的安全标签；适用于 6 类宿主：DEX/交易 Agent（Kuru、KyberSwap）、借贷与永续（Aave、Perpl）、LST 与清算网络（aPriori、FastLane）、聚合器（Monorail）、Agent Hub 生态、以及任何签名前需要独立风控的协议——免费附加服务，换的是 Monad 生态风控标准。【为什么是 Monad】官方最新数据（monad.xyz）：10,000+ TPS、300ms 出块（主网实测 ~302ms）、600ms 最终性（MonadBFT 2 slot）、近零费用；主网已承载 $945M TVL、7.28 亿+ 笔交易、138+ 应用，Agent Hub 将 AI Agent 列为一级公民——盲审 4 次并发 LLM 调用 + Commit/Reveal 双笔上链在 1 秒内完成，Agent 的执行速度由 Monad 保证，Agent 的决策可信由 Agent Jury 保证。演示支持多钱包连接（EIP-6963），未连钱包也可完整体验盲审流程。",
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
