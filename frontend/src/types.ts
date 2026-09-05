// ===== Agent Jury 核心类型定义 =====

// verdict 编码与智能合约保持一致：0=ALLOW 1=REVIEW 2=BLOCK
export const Verdict = {
  ALLOW: 0,
  REVIEW: 1,
  BLOCK: 2,
} as const;
export type Verdict = (typeof Verdict)[keyof typeof Verdict];

export const VERDICT_LABEL: Record<Verdict, string> = {
  [Verdict.ALLOW]: "ALLOW",
  [Verdict.REVIEW]: "REVIEW",
  [Verdict.BLOCK]: "BLOCK",
};

// 陪审员生命周期状态
export type JurorStatus =
  | "IDLE"
  | "THINKING"
  | "COMMITTED"
  | "REVEALING"
  | "VERIFIED"
  | "FAILED";

// 一个陪审员的完整裁决（Reveal 之后才有内容）
export interface JurorResult {
  verdict: Verdict;
  confidence: number; // 0-100
  summary: string;
  reasons: string[];
}

// 页面上一个陪审员卡片的状态
export interface JurorState {
  id: number; // 0-3
  name: string;
  role: string;
  roleDetail: string;
  status: JurorStatus;
  commitmentHash: string | null; // Commit 阶段显示
  result: JurorResult | null; // Reveal 之后才有
  verified: boolean; // commitment 重算校验结果
  thinkingLog: string[]; // THINKING 阶段的实时推理过程
}

// 一位陪审员在共识区的意见摘要（Reveal 后展示）
export interface JurorVote {
  id: number;
  name: string;
  verdict: Verdict;
  confidence: number;
  summary: string;
  verified: boolean;
}

// 最终共识
export interface FinalConsensus {
  allowVotes: number;
  reviewVotes: number;
  blockVotes: number;
  finalVerdict: Verdict | null;
  consensusConfidence: number | null;
  caseHash: string | null;
  // 命中附加规则时的说明（如 Security 一票否决降级）
  overrideNote?: string;
  // 每位陪审员的意见（Reveal 后传入）
  votes?: JurorVote[];
}

// Mock / 未来 LLM Provider 的统一接口（真实接口设计，第四阶段实现 Mock 版本）
export interface CaseData {
  question: string;
  userAddress: string;
  timestamp: number;
}

export interface JuryProvider {
  evaluateCase(
    role: string,
    caseData: CaseData,
    onStep?: (step: string) => void
  ): Promise<JurorResult>;
}
