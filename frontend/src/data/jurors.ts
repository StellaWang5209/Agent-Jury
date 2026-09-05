import type { JurorState } from "../types";

// ===== 4 个陪审员固定定义 =====
export const JURORS: JurorState[] = [
  {
    id: 0,
    name: "Security Jury",
    role: "安全陪审员",
    roleDetail: "合约权限 · 授权范围 · 资产安全 · 资金转移风险 · 目标地址风险",
    status: "IDLE",
    commitmentHash: null,
    result: null,
    verified: false,
    thinkingLog: [],
  },
  {
    id: 1,
    name: "Intent Jury",
    role: "意图陪审员",
    roleDetail: "AI Agent 准备执行的操作是否符合用户原始意图",
    status: "IDLE",
    commitmentHash: null,
    result: null,
    verified: false,
    thinkingLog: [],
  },
  {
    id: 2,
    name: "Economic Jury",
    role: "经济陪审员",
    roleDetail: "金额合理性 · 潜在损失 · 经济风险 · 用户承受范围",
    status: "IDLE",
    commitmentHash: null,
    result: null,
    verified: false,
    thinkingLog: [],
  },
  {
    id: 3,
    name: "Adversarial Jury",
    role: "对抗陪审员",
    roleDetail: "最坏情况 · 潜在攻击 · 权限滥用 · 异常行为 · 他人忽略的问题",
    status: "IDLE",
    commitmentHash: null,
    result: null,
    verified: false,
    thinkingLog: [],
  },
];

// ===== 两个固定 Demo Case =====
export const DEMO_CASES = {
  dangerous: {
    label: "Dangerous Case",
    question:
      "一个AI Agent准备对未知合约执行Unlimited Approve，是否应该允许？",
  },
  safe: {
    label: "Safe Case",
    question:
      "一个AI Agent准备向用户明确指定的地址转账0.01 MON，是否应该允许？",
  },
};
