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
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-expand-reveal my-8 w-[36rem] max-w-full overflow-hidden rounded-2xl border border-gold-dim bg-panel shadow-[0_0_60px_rgba(217,169,78,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题带 */}
        <div className="relative border-b border-gold-dim bg-gradient-to-r from-gold-500/15 via-transparent to-gold-500/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-mono text-sm tracking-[0.25em] text-gold-300">
                🧠 AI 引擎设置
              </h2>
              <p className="mt-1 text-[11px] text-neutral-500">
                为 4 名陪审员选择推理大脑 · 7 家主流大模型随时切换
              </p>
            </div>
            <button
              className="rounded-md border border-panel-edge px-2 py-1 text-xs text-neutral-500 transition hover:border-gold-500/40 hover:text-gold-300"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          <p className="mb-4 rounded-lg border border-gold-dim/50 bg-gold-500/5 px-3 py-2 text-[11px] leading-relaxed text-neutral-400">
            🔒 每位陪审员由 <span className="text-gold-300">独立 API 调用</span>{" "}
            盲审，互不可见对方输出；路线图：未来支持{" "}
            <span className="text-gold-300">每名陪审员选用不同模型</span>
            ，实现真正的多模型交叉盲审。
          </p>

          {/* 厂商选择 */}
          <label className="mb-2 block text-[11px] font-semibold tracking-wider text-neutral-500">
            选择模型厂商
          </label>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LLM_PROVIDERS.map((p) => {
              const activeSel = p.id === providerId;
              return (
                <button
                  key={p.id}
                  onClick={() => setProviderId(p.id)}
                  className={`group relative rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${
                    activeSel
                      ? "border-gold-500 bg-gradient-to-b from-gold-500/20 to-gold-500/5 shadow-[0_0_16px_rgba(217,169,78,0.25)]"
                      : "border-panel-edge bg-black/20 hover:-translate-y-0.5 hover:border-gold-500/40 hover:bg-black/40"
                  }`}
                >
                  {p.tag && (
                    <span className="absolute -top-1.5 right-2 rounded-full bg-gradient-to-r from-gold-500 to-gold-600 px-1.5 py-px text-[9px] font-bold text-black">
                      {p.tag}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-base transition-transform duration-200 ${
                        activeSel ? "scale-110" : "group-hover:scale-110"
                      }`}
                    >
                      {p.emoji}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        activeSel ? "text-gold-300" : "text-neutral-300"
                      }`}
                    >
                      {p.name}
                    </span>
                  </div>
                  <div className="mt-1 truncate font-mono text-[10px] text-neutral-500">
                    {p.model}
                  </div>
                  <div className="mt-0.5 truncate text-[10px] text-neutral-600">
                    {p.note}
                  </div>
                </button>
              );
            })}
          </div>

          {/* API Key 输入 */}
          <div className="flex items-end justify-between">
            <label className="mb-1.5 block text-[11px] font-semibold tracking-wider text-neutral-500">
              <span className="mr-1">{provider.emoji}</span>
              {provider.name} API KEY
            </label>
            <a
              href={provider.keyUrl}
              target="_blank"
              rel="noreferrer"
              className="mb-1.5 font-mono text-[10px] text-gold-500 underline transition hover:text-gold-300"
            >
              ↗ 获取 Key
            </a>
          </div>
          <div className="mb-2 flex gap-2">
            <input
              type={show ? "text" : "password"}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={provider.keyHint}
              className="min-w-0 flex-1 rounded-lg border border-panel-edge bg-black/40 px-3 py-2.5 font-mono text-xs text-neutral-200 outline-none transition focus:border-gold-500/60 focus:shadow-[0_0_12px_rgba(217,169,78,0.15)]"
            />
            <button
              className="rounded-lg border border-panel-edge px-3 text-xs text-neutral-500 transition hover:border-gold-500/40 hover:text-gold-300"
              onClick={() => setShow(!show)}
            >
              {show ? "🙈 隐藏" : "👁 显示"}
            </button>
          </div>

          <p className="mb-5 text-[11px] leading-relaxed text-neutral-600">
            🔒 Key 只保存在你的浏览器 localStorage，不进代码库、不上传任何服务器。
          </p>

          <div className="flex gap-2">
            <button
              className="flex-1 rounded-lg bg-gradient-to-r from-gold-500 to-gold-600 py-2.5 font-mono text-xs font-bold tracking-[0.15em] text-black transition hover:brightness-110 hover:shadow-[0_0_20px_rgba(217,169,78,0.3)]"
              onClick={save}
            >
              保存并启用真实引擎
            </button>
            <button
              className="rounded-lg border border-panel-edge px-4 py-2.5 font-mono text-xs text-neutral-400 transition hover:border-red-500/50 hover:text-red-400"
              onClick={() => {
                setKey("");
                setActiveConfig("", "");
                onSaved();
                onClose();
              }}
            >
              清除配置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
