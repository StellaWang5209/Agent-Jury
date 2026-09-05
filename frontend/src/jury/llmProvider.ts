import type { CaseData, JurorResult, Verdict } from "../types";

// ===== DeepSeek 真实 LLM Provider（V2）=====
// 4 个陪审员 = 4 次完全独立的 API 调用：
// 每次调用只接收 (role, caseData)，接口层面保证盲审。
// API Key 由用户在设置面板填入，仅存浏览器 localStorage，不进代码库。

const STORAGE_KEY = "agent-jury-deepseek-key";
const ENDPOINT = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";
const TIMEOUT_MS = 60000;

export function getDeepseekKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setDeepseekKey(key: string): void {
  try {
    if (key.trim()) localStorage.setItem(STORAGE_KEY, key.trim());
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage 不可用（隐私模式等）→ 忽略
  }
}

export function hasDeepseekKey(): boolean {
  return getDeepseekKey().length > 0;
}

/** 各角色专属视角提示词（盲审：互不可见） */
const ROLE_PROMPTS: Record<string, string> = {
  "Security Jury":
    "你的专属视角是【安全审计】：授权范围与最小权限原则、目标合约风险、私钥/助记词暴露、钓鱼与重入风险。",
  "Intent Jury":
    "你的专属视角是【意图一致性】：操作是否与用户原始指令匹配、是否存在隐式权限升级或越权、用户是否理解后果。",
  "Economic Jury":
    "你的专属视角是【经济风险】：金额敞口、最坏情况损失上限、风险收益比、用户资产承受范围。",
  "Adversarial Jury":
    "你的专属视角是【对抗性红队】：假设一切皆恶意，主动推演最坏攻击路径、寻找其他视角忽略的盲点，敢于提出异议。",
};

const SHARED_PROMPT = `你是 Agent Jury 陪审团的一名独立陪审员，正在盲审一个 AI Agent 即将执行的操作。
盲审规则：你只能依据案件描述独立判断，不知道也无法知道其他任何陪审员的观点。
Verdict 编码：0=ALLOW（允许执行）、1=REVIEW（转人工复核）、2=BLOCK（阻止执行）。
输出要求（只输出一个 JSON 对象，不要输出任何其他文字）：
{"verdict": 0或1或2, "confidence": 0到100的整数, "summary": "一句话结论（不超过40字）", "reasons": ["理由1（不超过40字）", "理由2（不超过40字）", "理由3（不超过40字）"]}`;

function buildMessages(role: string, caseData: CaseData) {
  return [
    { role: "system", content: SHARED_PROMPT },
    {
      role: "user",
      content: `${ROLE_PROMPTS[role] ?? "以独立中立的专业视角审视案件。"}\n\n案件描述：${caseData.question}\n\n发起者地址：${caseData.userAddress}\n\n请以你的专属视角独立裁决。`,
    },
  ];
}

function clampResult(raw: unknown): JurorResult {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const verdict = (Math.max(0, Math.min(2, Math.round(Number(obj.verdict) || 0)))) as Verdict;
  const confidence = Math.max(0, Math.min(100, Math.round(Number(obj.confidence) || 0)));
  const summary = String(obj.summary ?? "").slice(0, 80) || "已完成独立分析";
  const reasons = Array.isArray(obj.reasons)
    ? (obj.reasons as unknown[]).map((r) => String(r).slice(0, 80)).slice(0, 3)
    : [];
  return {
    verdict,
    confidence,
    summary,
    reasons:
      reasons.length >= 1
        ? reasons
        : ["基于案件描述独立评估", "结合角色专属视角权衡风险", "结论由模型独立推理得出"],
  };
}

/**
 * 真实 LLM 盲审：调用 DeepSeek 独立裁决一个案件。
 * 失败（网络/CORS/超时/限流）时抛错，由调用方回退 Mock。
 */
export async function evaluateCaseLLM(
  role: string,
  caseData: CaseData,
  apiKey: string,
  onStep?: (step: string) => void
): Promise<JurorResult> {
  onStep?.(`连接 DeepSeek 推理引擎（${role}）…`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: buildMessages(role, caseData),
        temperature: 0.8,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`DEEPSEEK_HTTP_${res.status}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    onStep?.("推理完成，生成加密承诺…");
    return clampResult(JSON.parse(content));
  } finally {
    clearTimeout(timeout);
  }
}
