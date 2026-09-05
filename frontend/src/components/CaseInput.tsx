interface CaseInputProps {
  question: string;
  onQuestionChange: (q: string) => void;
  onStartJury: () => void;
  juryRunning: boolean;
  revealed: boolean;
}

export default function CaseInput({
  question,
  onQuestionChange,
  onStartJury,
  juryRunning,
  revealed,
}: CaseInputProps) {
  return (
    <section className="panel panel-glow p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-[11px] font-semibold tracking-[0.25em] text-gold-500">
          01 / CASE INPUT
        </span>
        <div className="h-px flex-1 bg-panel-edge" />
      </div>

      <h2 className="mb-1 text-lg font-semibold text-neutral-200">
        提交你的问题，让 AI 陪审团盲审
      </h2>
      <p className="mb-4 text-xs text-neutral-500">
        4 名陪审员将完全隔离地独立判断 —— 任何人看不到别人的观点，直到全部提交承诺。
      </p>

      {/* 快捷按钮 */}
      <div className="mb-3 flex gap-2">
        <button
          className="btn-outline-gold px-3 py-1.5 text-xs"
          onClick={() =>
            onQuestionChange(
              "一个AI Agent准备对未知合约执行Unlimited Approve，是否应该允许？"
            )
          }
          disabled={juryRunning}
        >
          ⚠ Dangerous Case
        </button>
        <button
          className="btn-outline-gold px-3 py-1.5 text-xs"
          onClick={() =>
            onQuestionChange(
              "一个AI Agent准备向用户明确指定的地址转账0.01 MON，是否应该允许？"
            )
          }
          disabled={juryRunning}
        >
          ✓ Safe Case
        </button>
      </div>

      <textarea
        value={question}
        onChange={(e) => onQuestionChange(e.target.value)}
        disabled={juryRunning}
        rows={3}
        placeholder="输入需要 AI Jury 裁决的问题…"
        className="w-full resize-none rounded-lg border border-panel-edge bg-ink-2 p-4 text-sm text-neutral-200 outline-none transition-colors placeholder:text-neutral-600 focus:border-gold-600 disabled:opacity-60"
      />

      <div className="mt-4 flex items-center justify-between">
        <span className="text-[11px] text-neutral-600">
          {juryRunning
            ? "盲审进行中，请勿关闭页面…"
            : revealed
              ? "裁决已完成，输入新问题可重新开始"
              : "Start 后进入 Commit 阶段：只公布承诺哈希，不公布观点"}
        </span>
        <button
          className="btn-gold px-8 py-3 text-sm"
          onClick={onStartJury}
          disabled={juryRunning || question.trim().length === 0}
        >
          {juryRunning ? "JURY RUNNING..." : "⚖ START JURY"}
        </button>
      </div>
    </section>
  );
}
