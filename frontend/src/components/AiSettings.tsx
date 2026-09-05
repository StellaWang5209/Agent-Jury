import { useEffect, useState } from "react";
import {
  LLM_PROVIDERS,
  getActiveConfig,
  setActiveConfig,
} from "../jury/llmProvider";
import type { LLMProviderInfo } from "../jury/llmProvider";

interface Props {
  open: boolean;
  onClose: () => void;
  /** 保存后通知 App 重新检查是否进入真实 AI 模式 */
  onSaved: () => void;
}

/**
 * AI 引擎设置面板：选择大模型厂商 + 填入 API Key。
 * 配置仅存浏览器 localStorage，不进代码库、不上传任何服务器。
 */
export default function AiSettings({ open, onClose, onSaved }: Props) {
  const [providerId, setProviderId] = useState<string>("deepseek");
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!open) return;
    const active = getActiveConfig();
    setProviderId(active?.providerId ?? "deepseek");
    setKey(active?.apiKey ?? "");
  }, [open]);

  if (!open) return null;

  const provider: LLMProviderInfo =
    LLM_PROVIDERS.find((p) => p.id === providerId) ?? LLM_PROVIDERS[0];

  const save = () => {
    setActiveConfig(providerId, key);
    onSaved();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="animate-expand-reveal my-8 w-[32rem] max-w-full rounded-xl border border-gold-dim bg-panel p-6 shadow-2xl"
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
          选择驱动 4 名陪审员的大模型。每位陪审员由{" "}
          <span className="text-gold-300">独立 API 调用</span>
          盲审，互不可见对方输出。
        </p>

        {/* 厂商选择 */}
        <label className="mb-2 block text-[11px] font-semibold tracking-wider text-neutral-500">
          选择模型厂商
        </label>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LLM_PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setProviderId(p.id)}
              className={`rounded-lg border px-3 py-2 text-left transition ${
                p.id === providerId
                  ? "border-gold-500/70 bg-gold-500/10"
                  : "border-panel-edge bg-black/20 hover:border-gold-500/40"
              }`}
            >
              <div
                className={`text-xs font-bold ${
                  p.id === providerId ? "text-gold-300" : "text-neutral-300"
                }`}
              >
                {p.name}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-neutral-500">
                {p.model}
              </div>
              <div className="mt-0.5 text-[10px] text-neutral-600">
                {p.note}
              </div>
            </button>
          ))}
        </div>

        {/* API Key 输入 */}
        <label className="mb-1.5 block text-[11px] font-semibold tracking-wider text-neutral-500">
          {provider.name} API KEY
        </label>
        <div className="mb-2 flex gap-2">
          <input
            type={show ? "text" : "password"}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={provider.keyHint}
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
            href={provider.keyUrl}
            target="_blank"
            rel="noreferrer"
            className="text-gold-400 underline hover:text-gold-300"
          >
            {provider.keyUrl.replace("https://", "")}
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
              setActiveConfig("", "");
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
