import type { CaseData, JurorResult, Verdict } from "../types";

// ===== 多模型 LLM Provider（V2）=====
// 支持 DeepSeek / 智谱 GLM / 通义千问 / Kimi / OpenAI / Gemini / Grok，
// 配置（厂商 + Key）仅存浏览器 localStorage，不进代码库、不上传。
// 4 个陪审员 = 4 次完全独立的 API 调用：每次调用只接收 (role, caseData)，
// 接口层面保证盲审。

const STORAGE_KEY = "agent-jury-llm-config";
// 旧版单 Key 存储的迁移源
const LEGACY_KEY = "agent-jury-deepseek-key";

export interface LLMProviderInfo {
  id: string;
  name: string;
  emoji: string; // 厂商标识表情，用于卡片视觉区分
  model: string;
  endpoint: string;
  keyHint: string; // Key 前缀样式提示
  keyUrl: string; // 获取 Key 的地址
  note: string; // 特点说明
  tag?: string; // 推荐标记
}

export const LLM_PROVIDERS: LLMProviderInfo[] = [
  {
    id: "deepseek",
    name: "DeepSeek",
    emoji: "🐋",
    model: "deepseek-chat",
    endpoint: "https://api.deepseek.com/chat/completions",
    keyHint: "sk-...",
    keyUrl: "https://platform.deepseek.com/api_keys",
    note: "推荐 · 便宜 · 国内直连",
    tag: "推荐",
  },
  {
    id: "zhipu",
    name: "智谱 GLM",
    emoji: "🧩",
    model: "glm-4-flash",
    endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    keyHint: "xxxxxxxx.xxxxxxxx",
    keyUrl: "https://open.bigmodel.cn/usercenter/apikeys",
    note: "免费额度大",
  },
  {
    id: "qwen",
    name: "通义千问",
    emoji: "🌏",
    model: "qwen-plus",
    endpoint:
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    keyHint: "sk-...",
    keyUrl: "https://bailian.console.aliyun.com/?apiKey=1",
    note: "阿里云百炼",
  },
  {
    id: "moonshot",
    name: "Kimi",
    emoji: "🌙",
    model: "moonshot-v1-8k",
    endpoint: "https://api.moonshot.cn/v1/chat/completions",
    keyHint: "sk-...",
    keyUrl: "https://platform.moonshot.cn/console/api-keys",
    note: "长文本推理",
  },
  {
    id: "gemini",
    name: "Gemini",
    emoji: "♊",
    model: "gemini-2.0-flash",
    endpoint:
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    keyHint: "AIza...",
    keyUrl: "https://aistudio.google.com/apikey",
    note: "Google · 免费额度 · 需海外网络",
  },
  {
    id: "grok",
    name: "Grok",
    emoji: "🛰️",
    model: "grok-3-mini",
    endpoint: "https://api.x.ai/v1/chat/completions",
    keyHint: "xai-...",
    keyUrl: "https://console.x.ai",
    note: "xAI · 红队风格契合 · 需海外网络",
  },
  {
    id: "openai",
    name: "OpenAI",
    emoji: "🟢",
    model: "gpt-4o-mini",
    endpoint: "https://api.openai.com/v1/chat/completions",
    keyHint: "sk-...",
    keyUrl: "https://platform.openai.com/api-keys",
    note: "效果最强 · 需海外网络",
  },
];

export interface ActiveLLMConfig {
  providerId: string;
  apiKey: string;
}

/** 读取当前生效的模型配置（含厂商信息）；未配置返回 null */
export function getActiveConfig():
  | (ActiveLLMConfig & { provider: LLMProviderInfo })
  | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const cfg = JSON.parse(raw) as ActiveLLMConfig;
      const provider = LLM_PROVIDERS.find((p) => p.id === cfg.providerId);
      if (provider && cfg.apiKey) return { ...cfg, provider };
    }
    // 旧版迁移：只有 DeepSeek 单 Key → 视为已选 DeepSeek
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const provider = LLM_PROVIDERS.find((p) => p.id === "deepseek")!;
      return { providerId: provider.id, apiKey: legacy, provider };
    }
    return null;
  } catch {
    return null;
  }
}

export function setActiveConfig(providerId: string, apiKey: string): void {
  try {
    if (providerId && apiKey.trim()) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ providerId, apiKey: apiKey.trim() })
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage 不可用（隐私模式等）→ 忽略
  }
}

export function hasActiveKey(): boolean {
  return getActiveConfig() !== null;
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
  const verdict = Math.max(
    0,
    Math.min(2, Math.round(Number(obj.verdict) || 0))
  ) as Verdict;
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

/** 单次调用的模型参数 */
export interface LLMCallConfig {
  endpoint: string;
  model: string;
  apiKey: string;
}

/**
 * 真实 LLM 盲审：调用所选大模型独立裁决一个案件。
 * 失败（网络/CORS/超时/限流）时抛错，由调用方回退 Mock。
 */
export async function evaluateCaseLLM(
  role: string,
  caseData: CaseData,
  cfg: LLMCallConfig,
  onStep?: (step: string) => void
): Promise<JurorResult> {
  onStep?.(`连接 ${cfg.model} 推理引擎（${role}）…`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch(cfg.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: buildMessages(role, caseData),
        temperature: 0.8,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`LLM_HTTP_${res.status}`);
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
