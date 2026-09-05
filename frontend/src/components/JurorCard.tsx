import type { JurorState } from "../types";
import { VERDICT_LABEL, Verdict } from "../types";

const VERDICT_STYLE: Record<Verdict, string> = {
  [Verdict.ALLOW]: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  [Verdict.REVIEW]: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  [Verdict.BLOCK]: "border-red-500/40 bg-red-500/10 text-red-300",
};

const STATUS_LABEL: Record<string, string> = {
  IDLE: "IDLE",
  THINKING: "THINKING",
  COMMITTED: "COMMITTED",
  REVEALING: "REVEALING",
  VERIFIED: "VERIFIED",
  FAILED: "VERIFICATION FAILED",
};

export default function JurorCard({ juror }: { juror: JurorState }) {
  const { name, role, roleDetail, status, commitmentHash, result, verified } =
    juror;
  const thinkingLog = juror.thinkingLog ?? [];

  const isThinking = status === "THINKING";
  const isRevealing = status === "REVEALING";
  const revealed = !!result;
  const failed = status === "FAILED";

  return (
    <div
      className={`panel p-5 transition-all duration-300 ${
        isThinking ? "animate-pulse-gold border-gold-dim" : ""
      } ${revealed && verified ? "border-gold-dim/50" : ""}`}
    >
      {/* 头部：名称 + 状态 */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold tracking-wide text-gold-300">{name}</h3>
          <p className="text-[11px] text-neutral-500">{role}</p>
        </div>
        <span
          className={`rounded-md border px-2 py-1 text-[10px] font-mono tracking-wider ${
            failed
              ? "border-red-500/40 bg-red-500/10 text-red-300"
              : status === "VERIFIED"
                ? "border-gold-500/50 bg-gold-500/10 text-gold-300"
                : status === "IDLE"
                  ? "border-panel-edge bg-ink-2 text-neutral-500"
                  : "border-panel-edge bg-ink-2 text-neutral-300"
          }`}
        >
          {STATUS_LABEL[status]}
          {status === "COMMITTED" && " ✓"}
          {status === "VERIFIED" && " ✓"}
        </span>
      </div>

      {/* 职责 */}
      <p className="mb-4 text-[11px] leading-relaxed text-neutral-500">
        {roleDetail}
      </p>

      {/* 内容区：三种状态 */}
      {isThinking && (
        <div className="animate-expand-reveal rounded-lg border border-panel-edge bg-ink-2 p-3 font-mono text-[11px] leading-relaxed">
          <p className="mb-1 text-[10px] tracking-wider text-gold-600">
            REASONING LOG — 独立分析中，互不可见
          </p>
          <div className="max-h-24 space-y-1 overflow-hidden">
            {thinkingLog.slice(-4).map((line, i, arr) => (
              <p
                key={i}
                className={`animate-expand-reveal flex gap-2 ${
                  i === arr.length - 1 ? "text-gold-300" : "text-neutral-500"
                }`}
              >
                <span className="shrink-0 text-gold-700">›</span>
                {line}
              </p>
            ))}
            {thinkingLog.length === 0 && (
              <p className="text-neutral-600">等待输入案件上下文…</p>
            )}
          </div>
          <p className="mt-1 text-neutral-600">
            <span className="cursor-blink text-gold-400">▊</span>
          </p>
        </div>
      )}

      {/* Commit 阶段：只有承诺哈希，绝不显示观点 */}
      {(status === "COMMITTED" || isRevealing) && commitmentHash && (
        <div
          className={`rounded-lg border border-panel-edge bg-ink-2 p-3 ${
            isRevealing ? "opacity-40" : ""
          }`}
        >
          <p className="mb-1 text-[10px] tracking-wider text-neutral-500">
            COMMITMENT HASH
          </p>
          <p className="break-all font-mono text-[11px] text-gold-300">
            {commitmentHash.slice(0, 34)}...{commitmentHash.slice(-6)}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
            🔒 该 Agent 的结论已密封在此哈希中（防篡改承诺）。
            点击下方「🔓 REVEAL JURY」即可揭晓它的真实观点。
          </p>
          {isRevealing && (
            <p className="mt-2 text-[11px] text-neutral-400">
              Revealing salt & verdict<span className="dot-bounce">...</span>
            </p>
          )}
        </div>
      )}

      {/* Reveal 之后：完整观点 + 校验 */}
      {revealed && (
        <div className="animate-expand-reveal mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <span
              className={`rounded-md border px-3 py-1 font-mono text-sm font-bold tracking-wider ${
                VERDICT_STYLE[result.verdict]
              }`}
            >
              {VERDICT_LABEL[result.verdict]}
            </span>
            <span className="text-xs text-neutral-400">
              Confidence{" "}
              <span className="font-mono text-gold-300">
                {result.confidence}
              </span>
            </span>
          </div>

          <p className="text-xs leading-relaxed text-neutral-300">
            {result.summary}
          </p>

          <ul className="space-y-1">
            {result.reasons.map((r, i) => (
              <li
                key={i}
                className="flex gap-2 text-[11px] leading-relaxed text-neutral-500"
              >
                <span className="text-gold-600">›</span>
                {r}
              </li>
            ))}
          </ul>

          <div className="border-t border-panel-edge pt-2">
            {verified ? (
              <p className="font-mono text-[10px] tracking-wider text-emerald-400">
                COMMIT VERIFIED ✓
              </p>
            ) : (
              <p className="font-mono text-[10px] tracking-wider text-red-400">
                VERIFICATION FAILED ✗
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
