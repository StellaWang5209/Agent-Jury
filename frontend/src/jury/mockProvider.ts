import type { CaseData, JurorResult, JuryProvider } from "../types";

// ===== MockJuryProvider =====
// 第一版不接真实 LLM。接口与真实 AI Agent 完全一致：
// 以后只需要把 MockJuryProvider 换成 LLMJuryProvider（4 次完全独立调用）。
// 关键约束：每次 evaluateCase 只接收 (role, caseData)，不接收任何其他陪审员
// 的观点 —— 从接口层面保证盲审，杜绝从众/锚定/附和。

/** 危险信号关键词（中英文） */
const DANGEROUS_PATTERNS = [
  "unlimited approve",
  "无限授权",
  "无限批准",
  "unknown contract",
  "未知合约",
  "未经验证",
  "private key",
  "seed phrase",
  "助记词",
  "私钥",
  "setapprovalforall",
  "drain",
  "transferfrom",
];

/** 安全信号关键词 */
const SAFE_PATTERNS = [
  "明确指定",
  "明确指定地址",
  "specified address",
  "0.01",
  "小额转账",
  "白名单",
];

export interface CaseAnalysis {
  dangerous: boolean;
  safe: boolean;
  signals: string[];
}

export function analyzeCase(question: string): CaseAnalysis {
  const q = question.toLowerCase();
  const signals: string[] = [];

  const dangerous = DANGEROUS_PATTERNS.some((p) => {
    if (q.includes(p)) {
      signals.push(p);
      return true;
    }
    return false;
  });

  const safe = SAFE_PATTERNS.some((p) => q.includes(p));

  return { dangerous, safe, signals };
}

/**
 * 确定性抖动：根据案件文本为每个陪审员生成 ±jitterSpread 的置信度偏移。
 * 同一案件内每次运行结果稳定（可复现、可上链校验），
 * 不同案件之间数值不同 —— 让 4 个 Agent 的结论看起来各有独立判断。
 */
function jitter(seed: string, jurorId: number, spread = 3): number {
  let h = (jurorId + 1) * 2654435761;
  for (let i = 0; i < seed.length; i++) {
    h = ((h ^ seed.charCodeAt(i)) * 16777619) >>> 0;
  }
  return (h % (spread * 2 + 1)) - spread;
}

// ===== 每个角色的 Mock 裁决模板 =====
// 设计原则：4 个 Agent 从 4 个完全不同的专业视角独立得出结论，
// 置信度、结论、理由各不相同 —— 危险案件出现 3 BLOCK + 1 REVIEW 的分歧，
// 安全案件出现 3 ALLOW + 1 REVIEW 的异议，体现真实陪审团的独立判断。
type RoleResultBuilder = (a: CaseAnalysis, seed: string, jurorId: number) => JurorResult;

const ROLE_BUILDERS: Record<string, RoleResultBuilder> = {
  "Security Jury": (a, seed, jurorId) => {
    const dj = jitter(seed, jurorId);
    return a.dangerous
      ? {
          verdict: 2, // BLOCK
          confidence: 95 + dj,
          summary: "检测到严重安全漏洞：无限授权 + 未知合约，必须阻止",
          reasons: [
            `发现危险信号「${a.signals[0] ?? "unlimited approve"}」：授权额度不设上限`,
            "最小权限原则被违反 —— 实际任务不需要无限授权",
            "未知合约存在恶意转走用户全部代币的历史先例风险",
          ],
        }
      : {
          verdict: 0, // ALLOW
          confidence: 90 + dj,
          summary: "权限范围最小化，未检测到任何安全风险",
          reasons: [
            "目标地址由用户明确指定，非弹窗诱导获取",
            "操作不涉及任何超额授权或权限提升",
            "目标地址无已知风险标记与恶意交互记录",
          ],
        };
  },

  "Intent Jury": (a, seed, jurorId) => {
    const dj = jitter(seed, jurorId);
    return a.dangerous
      ? {
          verdict: 2, // BLOCK
          confidence: 82 + dj,
          summary: "操作严重偏离用户原始意图，属于隐式权限越权",
          reasons: [
            "用户描述的是常规任务，从未提到要授予永久权限",
            "操作把一次性授权悄悄升级成了无限期授权",
            "无法确认用户理解并同意无限授权的后果",
          ],
        }
      : {
          verdict: 0, // ALLOW
          confidence: 86 + dj,
          summary: "操作内容与用户描述的原始意图完全一致",
          reasons: [
            "执行的动作与用户指令逐项匹配",
            "金额与描述范围一致，没有额外动作",
            "未发现任何超出意图范围的隐藏操作",
          ],
        };
  },

  "Economic Jury": (a, seed, jurorId) => {
    const dj = jitter(seed, jurorId);
    return a.dangerous
      ? {
          verdict: 1, // REVIEW —— 经济视角持保留意见，体现分歧
          confidence: 71 + dj,
          summary: "潜在损失上限不可估量，建议先人工评估再定论",
          reasons: [
            "损失上限不是转账金额，而是钱包里的全部资产",
            "全部资产暴露风险已超出普通用户的合理承受范围",
            "风险收益比严重失衡：收益趋近于零，风险无限大",
          ],
        }
      : {
          verdict: 0, // ALLOW
          confidence: 92 + dj,
          summary: "金额极小，最坏情况损失完全可承受",
          reasons: [
            "0.01 MON 属于可忽略的小额操作",
            "潜在损失上限即转账金额本身，无杠杆敞口",
            "不存在任何后续费用或隐性成本",
          ],
        };
  },

  "Adversarial Jury": (a, seed, jurorId) => {
    const dj = jitter(seed, jurorId);
    return a.dangerous
      ? {
          verdict: 2, // BLOCK
          confidence: 88 + dj,
          summary: "最坏情况推演：恶意合约可随时清空钱包且不可逆",
          reasons: [
            "无限授权后攻击者可在任意时刻转走全部代币，无需再次确认",
            "一旦授权生效即无法单方面撤回，攻击不可逆",
            "结合钓鱼页面可实施静默的批量资产转移",
          ],
        }
      : {
          verdict: 1, // REVIEW —— 对抗视角提出合理异议，体现分歧
          confidence: 64 + dj,
          summary: "虽然最坏情况可控，仍建议先核实目标地址再执行",
          reasons: [
            "即使单笔损失有限，仍需确认目标地址确实属于预期收款人",
            "若目标地址拼写被篡改（地址投毒），转账将无法追回",
            "谨慎起见，加入白名单核对流程后再放行更稳妥",
          ],
        };
  },
};

// ===== 每个角色的实时推理步骤（THINKING 阶段逐条展示）=====
const ROLE_THINKING_STEPS: Record<string, string[]> = {
  "Security Jury": [
    "解析目标合约地址与调用方法签名…",
    "核对授权范围 vs 任务实际需要的最小权限…",
    "检查目标地址风险标签与历史交互记录…",
    "评估资金转移上限与撤回路径…",
  ],
  "Intent Jury": [
    "提取用户原始意图描述…",
    "比对：操作是否超出意图描述范围…",
    "检查是否存在隐式权限升级…",
    "生成意图一致性结论…",
  ],
  "Economic Jury": [
    "估算操作的金额敞口…",
    "计算最坏情况下的潜在损失…",
    "对照用户资产规模评估承受范围…",
    "生成经济风险结论…",
  ],
  "Adversarial Jury": [
    "假设目标合约完全恶意，推演攻击路径…",
    "寻找可组合的权限滥用向量…",
    "模拟最坏情况：用户损失是否可逆…",
    "汇总其他陪审员可能忽略的盲点…",
  ],
};

/** 获取某角色的推理步骤列表（供 UI 动画使用） */
export function getThinkingSteps(role: string): string[] {
  return ROLE_THINKING_STEPS[role] ?? ["独立分析案件…"];
}

/** 同步评估：立即返回裁决结果（Mock 无需真实推理耗时） */
const ROLE_INDEX: Record<string, number> = {
  "Security Jury": 0,
  "Intent Jury": 1,
  "Economic Jury": 2,
  "Adversarial Jury": 3,
};

export function evaluateCaseSync(role: string, caseData: CaseData): JurorResult {
  const builder = ROLE_BUILDERS[role];
  if (!builder) {
    throw new Error(`Unknown juror role: ${role}`);
  }
  const analysis = analyzeCase(caseData.question);
  // seed 取案件文本前 120 字，保证同一案件结果可复现
  return builder(analysis, caseData.question.slice(0, 120), ROLE_INDEX[role] ?? 0);
}

export class MockJuryProvider implements JuryProvider {
  /**
   * 异步接口保留给未来真实 LLM Provider（接口签名一致）。
   * Mock 场景下 App 直接使用 evaluateCaseSync + 单定时器动画，
   * 避免大量 setTimeout 被浏览器后台节流导致流程卡死。
   */
  async evaluateCase(
    role: string,
    caseData: CaseData,
    onStep?: (step: string) => void
  ): Promise<JurorResult> {
    const steps = getThinkingSteps(role);
    for (const step of steps) {
      await new Promise((r) => setTimeout(r, 400));
      onStep?.(step);
    }
    return evaluateCaseSync(role, caseData);
  }
}
