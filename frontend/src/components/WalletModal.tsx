import type { DiscoveredWallet } from "../web3/wallet";

interface WalletModalProps {
  open: boolean;
  wallets: DiscoveredWallet[];
  onPick: (wallet: DiscoveredWallet) => void;
  onClose: () => void;
}

export default function WalletModal({
  open,
  wallets,
  onPick,
  onClose,
}: WalletModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-expand-reveal w-80 rounded-xl border border-gold-dim bg-panel p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-center font-mono text-sm tracking-[0.2em] text-gold-300">
          SELECT WALLET
        </h3>
        <p className="mb-4 text-center text-[11px] text-neutral-500">
          检测到 {wallets.length} 个钱包
        </p>

        <div className="space-y-2">
          {wallets.map((w) => (
            <button
              key={w.info.uuid}
              className="flex w-full items-center gap-3 rounded-lg border border-panel-edge bg-ink px-4 py-3 text-left text-sm text-neutral-200 transition hover:border-gold-500 hover:bg-gold-500/5"
              onClick={() => onPick(w)}
            >
              {w.info.icon ? (
                <img src={w.info.icon} alt="" className="h-7 w-7 rounded-md" />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-md border border-gold-dim text-gold-400">
                  💼
                </span>
              )}
              <span className="font-medium">{w.info.name}</span>
            </button>
          ))}
        </div>

        <button
          className="mt-4 w-full py-2 text-center text-[11px] text-neutral-500 transition hover:text-neutral-300"
          onClick={onClose}
        >
          取消
        </button>
      </div>
    </div>
  );
}
