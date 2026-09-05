import { useEffect, useState } from "react";
import { getDeepseekKey, setDeepseekKey } from "../jury/llmProvider";

interface Props {
  open: boolean;
  onClose: () => void;
  /** 保存后通知 App 重新检查是否进入真实 AI 模式 */
  onSaved: () => void;
}

/**
 * AI 设置面板：填入 DeepSeek API Key 后，4 名陪审员由真实大模型独立推理。
 * Key 仅存浏览器 localStorage，不进代码库、不上传任何服务器。
 */
export default function AiSettings({ open, onClose, onSaved }: Props) {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open) setKey(getDeepseekKey());
  }, [open]);

  if (!open) return null;

  const save = () => {
    setDeepseekKey(key);
    onSaved();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="animate-expand-reveal w-[26rem] max-w-full rounded-xl border border-gold-dim bg-panel p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-sm tracking-[0.2em] text-gold-400">
            🧠 AI ENGINE SETTINGS
          </h2>
          <button
            className="text-neutral-500 transition hover:text-gold-400"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <p className="mb-3 text-xs leading-relaxed text-neutral-400">
          填入 DeepSeek API Key 后，4 名陪审员将由{" "}
          <span className="text-gold-300">真实大模型独立盲审</span>（每案约
          0.01~0.05 元）。未配置时自动使用本地模拟数据。
        </p>

        <label className="mb-1.5 block text-[11px] font-semibold tracking-wider text-neutral-500">
          DEEPSEEK API KEY
        </label>
        <div className="mb-2 flex gap-2">
          <input
            type={show ? "text" : "password"}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-..."
            className="min-w-0 flex-1 rounded-lg border border-panel-edge bg-black/40 px-3 py-2 font-mono text-xs text-neutral-200 outline-none transition focus:border-gold-500/60"
          />
          <button
            className="rounded-lg border border-panel-edge px-2.5 text-xs text-neutral-500 transition hover:text-gold-400"
            onClick={() => setShow(!show)}
          >
            {show ? "隐藏" : "显示"}
          </button>
        </div>

        <p className="mb-4 text-[11px] leading-relaxed text-neutral-600">
          🔒 Key 只保存在你的浏览器 localStorage，不进代码库、不上传。
          获取地址：
          <a
            href="https://platform.deepseek.com/api_keys"
            target="_blank"
            rel="noreferrer"
            className="text-gold-400 underline hover:text-gold-300"
          >
            platform.deepseek.com/api_keys
          </a>
        </p>

        <div className="flex gap-2">
          <button
            className="flex-1 rounded-lg bg-gradient-to-r from-gold-500 to-gold-600 py-2 font-mono text-xs font-bold tracking-wider text-black transition hover:brightness-110"
            onClick={save}
          >
            SAVE & ENABLE
          </button>
          <button
            className="rounded-lg border border-panel-edge px-4 py-2 font-mono text-xs text-neutral-400 transition hover:border-red-500/50 hover:text-red-400"
            onClick={() => {
              setKey("");
              setDeepseekKey("");
              onSaved();
              onClose();
            }}
          >
            清除
          </button>
        </div>
      </div>
    </div>
  );
}
