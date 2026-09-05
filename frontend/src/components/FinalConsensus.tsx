import type { FinalConsensus as FinalConsensusData, JurorVote } from "../types";
import { VERDICT_LABEL, Verdict } from "../types";

interface FinalConsensusProps {
  data: FinalConsensusData | null;
  allCommitted: boolean;
  calculating: boolean;
  anchored: boolean;
  anchoring: boolean;
  txHash: string | null;
  contractAddress: string | null;
  onCommitToMonad: () => void;
}

const FINAL_STYLE: Record<Verdict, string> = {
  [Verdict.ALLOW]: "text-emerald-300 border-emerald-500/40",
  [Verdict.REVIEW]: "text-amber-300 border-amber-500/40",
  [Verdict.BLOCK]: "text-red-300 border-red-500/40",
};

const VOTE_BADGE_STYLE: Record<Verdict, string> = {
  [Verdict.ALLOW]: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  [Verdict.REVIEW]: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  [Verdict.BLOCK]: "border-red-500/40 bg-red-500/10 text-red-300",
};

function shortHash(h: string | null) {
  if (!h) return "--";
  return h.length > 18 ? `${h.slice(0, 10)}...${h.slice(-8)}` : h;
}

/** 说人话的最终结论：明确告诉用户最终决定是什么、为什么 */
function buildConclusion(data: FinalConsensusData): {
  headline: string;
  detail: string;
} {
  const { finalVerdict, allowVotes, reviewVotes, blockVotes } = data;
  if (finalVerdict === Verdict.BLOCK) {
    return {
      headline: "🚫 结论：阻止执行该操作（BLOCK）",
      detail: `${blockVotes} 名陪审员投出 BLOCK，达到 ≥3 票共识阈值。该操作存在不可逆的资产风险，执行代理不应继续。`,
    };
  }
  if (finalVerdict === Verdict.ALLOW) {
    return {
      headline: "✅ 结论：允许执行该操作（ALLOW）",
      detail: `${allowVotes} 名陪审员投出 ALLOW，达到 ≥3 票共识阈值。${
        reviewVotes > 0
          ? `虽然有 ${reviewVotes} 名陪审员提出保留意见，但固定代码共识仍判定操作安全可执行。`
          : "4 名陪审员一致认定操作安全可执行。"
      }`,
    };
  }
  return {
    headline: "⚠️ 结论：转交人工复核（REVIEW）",
    detail:
      "支持 BLOCK 或 ALLOW 的票数均未达到 3 票阈值，陪审团存在实质性分歧。按固定规则降级为 REVIEW，由人工做出最终决定。",
  };
}

export default function FinalConsensus({
  data,
  allCommitted,
  calculating,
  anchored,
  anchoring,
  txHash,
  contractAddress,
  onCommitToMonad,
}: FinalConsensusProps) {
  const hasVotes = data && (data.allowVotes + data.reviewVotes + data.blockVotes > 0);
  const votes: JurorVote[] = hasVotes ? (data!.votes ?? []) : [];
  const conclusion = hasVotes ? buildConclusion(data!) : null;

  return (
    <section className="panel panel-glow p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-[11px] font-semibold tracking-[0.25em] text-gold-500">
          03 / 最终共识
        </span>
        <div className="h-px flex-1 bg-panel-edge" />
      </div>

      {/* 票数 */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {(
          [
            ["ALLOW", Verdict.ALLOW],
            ["REVIEW", Verdict.REVIEW],
            ["BLOCK", Verdict.BLOCK],
          ] as const
        ).map(([label, v]) => (
          <div
            key={label}
            className="rounded-lg border border-panel-edge bg-ink-2 p-4 text-center"
          >
            <p className="mb-1 text-[10px] tracking-[0.2em] text-neutral-500">
              {label}
            </p>
            <p className="font-mono text-3xl font-bold text-neutral-200">
              {hasVotes ? [data!.allowVotes, data!.reviewVotes, data!.blockVotes][v] : "--"}
            </p>
          </div>
        ))}
      </div>

      {/* 最终裁决 */}
      <div className="mb-4 flex flex-col items-center rounded-lg border border-gold-dim/40 bg-gradient-to-b from-gold-500/5 to-transparent p-6">
        <p className="mb-2 text-[10px] tracking-[0.3em] text-neutral-500">
          最终裁决 · 固定代码统计，非 AI 决定
        </p>
        {data?.finalVerdict != null ? (
          <span
            className={`animate-expand-reveal rounded-xl border-2 px-10 py-4 font-mono text-4xl font-bold tracking-widest ${
              FINAL_STYLE[data.finalVerdict]
            }`}
          >
            {VERDICT_LABEL[data.finalVerdict]}
          </span>
        ) : calculating ? (
          <span className="animate-pulse font-mono text-2xl tracking-[0.3em] text-gold-300">
            共识计算中
            <span className="dot-bounce">...</span>
          </span>
        ) : (
          <span className="font-mono text-3xl text-neutral-700">— — —</span>
        )}
      </div>

      {/* 说人话的最终结论 */}
      {conclusion && data?.finalVerdict != null && (
        <div
          className={`animate-expand-reveal mb-6 rounded-lg border p-4 ${
            data.finalVerdict === Verdict.BLOCK
              ? "border-red-500/30 bg-red-500/5"
              : data.finalVerdict === Verdict.ALLOW
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-amber-500/30 bg-amber-500/5"
          }`}
        >
          <p className="mb-1.5 text-[10px] tracking-[0.25em] text-neutral-500">
            CONCLUSION · 最终结论
          </p>
          <p className="mb-1.5 text-base font-bold text-neutral-100">
            {conclusion.headline}
          </p>
          <p className="text-xs leading-relaxed text-neutral-400">
            {conclusion.detail}
          </p>
          {data.overrideNote && (
            <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-300">
              ⚖️ {data.overrideNote}
            </p>
          )}
        </div>
      )}

      {/* 陪审员意见一览 */}
      {votes.length > 0 && (
        <div className="mb-6">
          <p className="mb-2 text-[10px] tracking-[0.25em] text-neutral-500">
            陪审员意见一览
          </p>
          <div className="space-y-2">
            {votes.map((vote) => (
              <div
                key={vote.id}
                className="animate-expand-reveal flex items-start gap-3 rounded-lg border border-panel-edge bg-ink-2 p-3"
              >
                <span
                  className={`mt-0.5 shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider ${
                    VOTE_BADGE_STYLE[vote.verdict]
                  }`}
                >
                  {VERDICT_LABEL[vote.verdict]}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] text-gold-300">
                    {vote.name}
                    <span className="ml-2 font-mono text-neutral-500">
                      {vote.confidence}%
                    </span>
                    {vote.verified && (
                      <span className="ml-2 text-[10px] text-emerald-400">
                        ✓ VERIFIED
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-400">
                    {vote.summary}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 共识规则说明 */}
      <div className="mb-6 rounded-lg border border-panel-edge bg-ink-2 p-3">
        <p className="text-[10px] leading-relaxed tracking-wider text-neutral-500">
          共识规则（固定代码，任何一方无法操纵）：BLOCK ≥ 3 票 → BLOCK · ALLOW
          ≥ 3 票 → ALLOW · 否则 → REVIEW
        </p>
      </div>

      {/* 元信息 */}
      <div className="mb-6 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg border border-panel-edge bg-ink-2 p-3">
          <p className="mb-1 text-[10px] tracking-wider text-neutral-500">
            共识置信度
          </p>
          <p className="font-mono text-neutral-200">
            {data?.consensusConfidence != null
              ? `${data.consensusConfidence}%`
              : "--"}
          </p>
        </div>
        <div className="rounded-lg border border-panel-edge bg-ink-2 p-3">
          <p className="mb-1 text-[10px] tracking-wider text-neutral-500">
            案件哈希
          </p>
          <p className="break-all font-mono text-neutral-200">
            {shortHash(data?.caseHash ?? null)}
          </p>
        </div>
      </div>

      {/* Monad 上链区 */}
      <div className="rounded-lg border border-panel-edge bg-ink-2 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] tracking-[0.2em] text-neutral-500">
            MONAD 上链状态
          </p>
          <span
            className={`font-mono text-[11px] tracking-wider ${
              anchored
                ? "text-emerald-400"
                : anchoring
                  ? "animate-pulse text-gold-300"
                  : "text-neutral-600"
            }`}
          >
            {anchored
              ? "已锚定 Monad ✓"
              : anchoring
                ? "正在锚定上链…"
                : "未上链"}
          </span>
        </div>

        {txHash && (
          <div className="mb-3 space-y-1 rounded-md border border-panel-edge p-2 font-mono text-[10px] text-neutral-400">
            <p>
              交易:{" "}
              <a
                className="text-gold-300 underline decoration-gold-dim"
                href={`https://testnet.monadscan.com/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {shortHash(txHash)}
              </a>
            </p>
            <p>
              合约:{" "}
              <a
                className="text-gold-300 underline decoration-gold-dim"
                href={`https://testnet.monadscan.com/address/${contractAddress}`}
                target="_blank"
                rel="noreferrer"
              >
                {shortHash(contractAddress)}
              </a>
            </p>
          </div>
        )}

        <button
          className="btn-gold w-full py-3 text-sm"
          onClick={onCommitToMonad}
          disabled={data?.finalVerdict == null || anchoring || anchored}
        >
          {anchored
            ? "已锚定上链 ✓"
            : anchoring
              ? "上链中…"
              : "⛓ 将裁决锚定到 Monad"}
        </button>
      </div>

      {!allCommitted && (
        <p className="mt-3 text-center text-[11px] text-neutral-600">
          等待全部 4 名陪审员完成盲审后解锁共识计算
        </p>
      )}
    </section>
  );
}
