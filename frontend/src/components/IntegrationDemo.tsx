import type { Verdict } from "../types";

/**
 * 集成演示 · Kuru Exchange
 * 场景：Kuru 交易 Agent（部署于 Monad 主网，此处用模拟数据）
 * 在执行 swap 前调用 Agent Jury 风控中间件（部署于 Monad 测试网）。
 * 本页用于展示中间件本身：盲审全流程内容全部可见，不做任何隐藏。
 */

export const KURU_SCENARIO =
  "Kuru 交易 Agent 计划在 Kuru 交易所对未经验证的路由合约执行 Unlimited Approve（无限授权），随后以 500 USDC 买入 MON。是否允许执行该交易？";

interface IntegrationDemoProps {
  question: string;
  juryRunning: boolean;
  allCommitted: boolean;
  revealed: boolean;
  calculating: boolean;
  finalVerdict: Verdict | null;
  caseHash: string | null;
  onUseScenario: () => void;
}

const ROUTER_ADDRESS = "0x7aF3e91C4bD02A66fF4dE1c8A9023B7cD54d9bE2";
const MOCK_TX = "0x8c2fA19d4E7b6c3a09D5f8eB2a71C6d3E94f7B05";

function StepNode({
  index,
  title,
  desc,
  state,
}: {
  index: number;
  title: string;
  desc: string;
  state: "pending" | "active" | "done";
}) {
  return (
    <div
      className={`relative flex min-w-0 flex-1 flex-col items-center gap-2 rounded-xl border px-2 py-3 text-center transition-all duration-300 ${
        state === "done"
          ? "border-gold-500/60 bg-gold-500/10"
          : state === "active"
            ? "animate-pulse-gold border-gold-500 bg-gold-500/15"
            : "border-panel-edge bg-ink-2 opacity-60"
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold ${
          state === "done"
            ? "bg-gradient-to-b from-gold-400 to-gold-600 text-black"
            : state === "active"
              ? "border border-gold-400 text-gold-300"
              : "border border-panel-edge text-neutral-500"
        }`}
      >
        {state === "done" ? "✓" : index}
      </span>
      <div className="min-w-0">
        <p
          className={`text-[11px] font-bold leading-tight ${
            state === "pending" ? "text-neutral-400" : "text-gold-300"
          }`}
        >
          {title}
        </p>
        <p className="mt-1 text-[10px] leading-snug text-neutral-500">{desc}</p>
      </div>
    </div>
  );
}

export default function IntegrationDemo({
  question,
  juryRunning,
  allCommitted,
  revealed,
  calculating,
  finalVerdict,
  caseHash,
  onUseScenario,
}: IntegrationDemoProps) {
  const started = juryRunning || caseHash !== null;

  const steps: {
    title: string;
    desc: string;
    state: "pending" | "active" | "done";
  }[] = [
    {
      title: "① 发起风控审批",
      desc: "Kuru 交易 Agent 将待执行交易提交给 AgentJury SDK",
      state: started ? "done" : question.trim() ? "active" : "pending",
    },
    {
      title: "② 构建案件",
      desc: "SDK 生成案件哈希并拆分为 4 份盲审任务",
      state: caseHash ? "done" : started ? "active" : "pending",
    },
    {
      title: "③ 4 名陪审员独立盲审",
      desc: "互不可见 · 独立推理 · 承诺哈希密封",
      state: allCommitted ? "done" : juryRunning ? "active" : "pending",
    },
    {
      title: "④ 揭晓与共识计算",
      desc: "重算承诺校验 · 固定代码统计投票",
      state: revealed ? "done" : calculating || allCommitted ? "active" : "pending",
    },
    {
      title: "⑤ 裁决回调 Kuru",
      desc: "ALLOW 放行 / BLOCK 拦截 / REVIEW 转人工",
      state: revealed && finalVerdict != null ? "done" : revealed ? "active" : "pending",
    },
  ];

  // Kuru Agent 的模拟执行状态
  const agentStatus = !started
    ? { text: "⏸ 等待风控审批 — 交易执行已挂起", cls: "text-neutral-400" }
    : juryRunning || !revealed
      ? { text: "⏳ 风控审批进行中 — Agent 暂停交易，等待陪审团结论", cls: "text-gold-300" }
      : finalVerdict === 2
        ? { text: "🚫 已收到 BLOCK 回调 — 交易已取消", cls: "text-red-300" }
        : finalVerdict === 0
          ? { text: "✅ 已收到 ALLOW 回调 — 交易已放行执行", cls: "text-emerald-300" }
          : { text: "⚠️ 已收到 REVIEW 回调 — 交易挂起待人工审批", cls: "text-amber-300" };

  return (
    <section className="space-y-4">
      {/* 场景说明横幅 */}
      <div className="panel panel-glow relative overflow-hidden p-5">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400 to-transparent" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[11px] font-semibold tracking-[0.25em] text-gold-500">
                集成演示 · KURU EXCHANGE
              </span>
              <span className="rounded-full border border-panel-edge bg-ink-2 px-2 py-0.5 text-[10px] text-neutral-400">
                集成数据为模拟数据
              </span>
            </div>
            <h2 className="text-base font-semibold text-neutral-100">
              Kuru 交易 Agent 执行 swap 前，先经过 Agent Jury 风控中间件审批
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">
              Kuru Exchange 部署于 Monad 主网，Agent Jury 部署于 Monad
              测试网——中间件以「案件哈希 + 承诺」锚定裁决，宿主只接收最终裁决回调，跨网不影响集成演示。
              为展示中间件本身，本页 <b className="text-gold-300">盲审全流程内容全部可见</b>
              （推理日志、承诺哈希、揭晓校验、共识计算、上链锚定）；生产集成时宿主可选择只暴露 API。
            </p>
          </div>
          <button className="btn-gold shrink-0 px-5 py-2.5 text-xs" onClick={onUseScenario}>
            📋 一键载入 Kuru 集成场景
          </button>
        </div>

        {/* 架构连线示意 */}
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-panel-edge bg-ink-2 px-4 py-3 font-mono text-[11px]">
          <span className="rounded border border-gold-500/40 bg-gold-500/10 px-2 py-1 text-gold-300">
            Kuru 交易 Agent
          </span>
          <span className="text-neutral-500">Monad 主网（模拟）</span>
          <span className="text-gold-500">──风控审批请求──▶</span>
          <span className="rounded border border-gold-dim bg-panel px-2 py-1 text-gold-300">
            Agent Jury 中间件
          </span>
          <span className="text-neutral-500">Monad 测试网</span>
          <span className="text-gold-500">──裁决回调──▶</span>
          <span className="rounded border border-gold-500/40 bg-gold-500/10 px-2 py-1 text-gold-300">
            执行 / 拦截
          </span>
        </div>
      </div>

      {/* 5 步集成管线 */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {steps.map((s, i) => (
          <StepNode key={i} index={i + 1} title={s.title} desc={s.desc} state={s.state} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Kuru 宿主模拟面板 */}
        <div className="panel p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold-dim bg-ink-2 font-bold text-gold-300">
                K
              </span>
              <div>
                <p className="text-sm font-bold text-gold-300">Kuru Exchange · 交易 Agent</p>
                <p className="text-[10px] text-neutral-500">宿主应用 · Monad 主网（模拟数据）</p>
              </div>
            </div>
            <span className="rounded-md border border-panel-edge bg-ink-2 px-2 py-1 font-mono text-[10px] text-neutral-400">
              AGENT
            </span>
          </div>

          <div className="space-y-2 rounded-lg border border-panel-edge bg-ink-2 p-3 text-[11px]">
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500">交易指令</span>
              <span className="text-right text-neutral-200">卖出 500 USDC → 买入 MON</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500">路由合约</span>
              <span className="break-all text-right font-mono text-amber-300">
                {ROUTER_ADDRESS.slice(0, 12)}…（未验证）
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500">授权请求</span>
              <span className="text-right font-bold text-red-300">
                Unlimited Approve（无限授权）
              </span>
            </div>
            <div className="flex justify-between gap-2 border-t border-panel-edge pt-2">
              <span className="text-neutral-500">Agent 状态</span>
              <span className={`text-right font-bold ${agentStatus.cls}`}>{agentStatus.text}</span>
            </div>
          </div>

          <p className="mt-3 text-[10px] leading-relaxed text-neutral-600">
            集成方式：宿主在交易签名前调用 AgentJury.requestAudit(交易摘要)，等待回调后再决定执行。
            中间件不接触私钥、不触碰资产，只输出经过盲审共识的裁决。
          </p>
        </div>

        {/* 回调结果面板 */}
        <div className="panel p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-gold-300">裁决回调结果</p>
            <span className="rounded-md border border-panel-edge bg-ink-2 px-2 py-1 font-mono text-[10px] text-neutral-400">
              CALLBACK
            </span>
          </div>

          {!revealed || finalVerdict == null ? (
            <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-panel-edge bg-ink-2 text-center">
              <p className="text-xs text-neutral-500">等待盲审完成后揭晓回调</p>
              <p className="mt-1 text-[10px] text-neutral-600">
                在下方「案件输入」中载入 Kuru 场景并开始盲审
              </p>
            </div>
          ) : finalVerdict === 2 ? (
            <div className="animate-expand-reveal h-32 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
              <p className="font-mono text-sm font-bold tracking-wider text-red-300">
                🚫 BLOCK — 交易已拦截（模拟）
              </p>
              <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                Kuru Agent 已取消该笔交易：无限授权未执行，路由合约未获得任何额度，
                Agent 已转入人工复核队列并通知用户。
              </p>
            </div>
          ) : finalVerdict === 0 ? (
            <div className="animate-expand-reveal h-32 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <p className="font-mono text-sm font-bold tracking-wider text-emerald-300">
                ✅ ALLOW — 交易已放行（模拟）
              </p>
              <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                Kuru Agent 已按原始指令执行交易，模拟交易哈希：
                <span className="break-all font-mono text-emerald-300">{MOCK_TX.slice(0, 26)}…</span>
              </p>
            </div>
          ) : (
            <div className="animate-expand-reveal h-32 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="font-mono text-sm font-bold tracking-wider text-amber-300">
                ⚠️ REVIEW — 转交人工复核（模拟）
              </p>
              <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                陪审团存在实质性分歧，Kuru Agent 已挂起该交易，
                等待运营人员在控制台做出最终决定。
              </p>
            </div>
          )}

          <p className="mt-3 text-[10px] leading-relaxed text-neutral-600">
            回调只包含最终裁决与共识置信度；陪审员的独立观点与推理细节属于中间件内部数据，
            本页因演示需要完整展示在下方面板中。
          </p>
        </div>
      </div>
    </section>
  );
}
