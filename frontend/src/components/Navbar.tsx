import Logo from "./Logo";

interface NavbarProps {
  walletAddress: string | null;
  balance: string | null;
  chainOk: boolean;
  connecting: boolean;
  error: string | null;
  onConnect: () => void;
  onSwitchNetwork: () => void;
  onSwitchAccount: () => void;
}

export default function Navbar({
  walletAddress,
  balance,
  chainOk,
  connecting,
  error,
  onConnect,
  onSwitchNetwork,
  onSwitchAccount,
}: NavbarProps) {
  return (
    <nav className="sticky top-0 z-20 border-b border-panel-edge bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* 左侧：标题 */}
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <div>
            <h1 className="text-lg font-bold tracking-[0.18em] text-gold-300">
              AGENT JURY
            </h1>
            <p className="text-[11px] tracking-wider text-neutral-500">
              AI Agent 盲审共识中间件
            </p>
          </div>
        </div>

        {/* 右侧：网络 + 钱包 */}
        <div className="flex items-center gap-3 text-xs">
          {/* 网络状态 */}
          {walletAddress && (
            <div className="flex items-center gap-2 rounded-lg border border-panel-edge bg-panel px-3 py-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  chainOk ? "animate-pulse bg-emerald-400" : "bg-red-400"
                }`}
              />
              <span className={chainOk ? "text-neutral-400" : "text-red-400"}>
                {chainOk ? "Monad 测试网" : "网络不正确"}
              </span>
            </div>
          )}

          {walletAddress && !chainOk && (
            <button
              className="rounded-lg border border-red-500/50 px-4 py-2 font-semibold text-red-300 transition hover:bg-red-500/10"
              onClick={onSwitchNetwork}
            >
              切换到 Monad 测试网
            </button>
          )}

          {walletAddress ? (
            <div className="flex items-center gap-3 rounded-lg border border-gold-dim bg-panel px-3 py-2">
              <span className="font-mono text-gold-300">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
              <span className="text-neutral-500">{balance ?? "--"} MON</span>
              <button
                className="rounded border border-panel-edge px-1.5 py-0.5 text-[10px] text-neutral-400 transition hover:border-gold-500 hover:text-gold-300"
                title="切换账号"
                onClick={onSwitchAccount}
              >
                ⇄ 账号
              </button>
            </div>
          ) : (
            <button
              className="btn-gold px-4 py-2 text-xs"
              onClick={onConnect}
              disabled={connecting}
            >
              {connecting ? "连接中…" : "连接钱包"}
            </button>
          )}
        </div>
      </div>

      {/* 未安装 MetaMask 的提示条 */}
      {error && (
        <div className="border-t border-red-500/30 bg-red-500/10 px-6 py-2 text-center text-xs text-red-300">
          {error}
        </div>
      )}
    </nav>
  );
}
