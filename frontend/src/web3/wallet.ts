import { BrowserProvider, formatEther } from "ethers";

// ===== Monad Testnet 官方参数（已核实，2026-09）=====
export const MONAD_TESTNET = {
  chainId: "0x279f", // 10143
  chainName: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: ["https://testnet-rpc.monad.xyz"],
  blockExplorerUrls: ["https://testnet.monadscan.com"],
};
export const MONAD_CHAIN_ID_DEC = 10143;

// ===== EIP-1193 标准钱包 Provider 接口 =====
// MetaMask / OKX / Rabby / Bitget / TokenPocket / Coinbase 等均遵循此标准
export interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: never[]) => void) => void;
  removeListener?: (
    event: string,
    handler: (...args: never[]) => void
  ) => void;
}

// ===== EIP-6963：多钱包发现协议 =====
// 每个已安装的钱包会广播自己的信息（名称 + 图标 + provider）
export interface DiscoveredWallet {
  info: { uuid: string; name: string; icon: string };
  provider: Eip1193Provider;
}

let discovered: DiscoveredWallet[] = [];

// 启动发现：监听 3 秒内所有钱包的广播
export function startWalletDiscovery(): DiscoveredWallet[] {
  discovered = [];
  if (typeof window === "undefined") return discovered;

  window.addEventListener(
    "eip6963:announceProvider",
    ((event: CustomEvent) => {
      const detail = event.detail as DiscoveredWallet;
      if (detail?.info && detail?.provider) {
        // 同一钱包可能重复广播，去重
        if (!discovered.some((w) => w.info.uuid === detail.info.uuid)) {
          discovered.push(detail);
        }
      }
    }) as EventListener
  );
  window.dispatchEvent(new Event("eip6963:requestProvider"));

  // 兜底：不支持 EIP-6963 的旧钱包直接注入 window.ethereum
  const legacy = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
  if (legacy && discovered.length === 0) {
    discovered.push({
      info: {
        uuid: "legacy-injected",
        name: "Browser Wallet",
        icon: "",
      },
      provider: legacy,
    });
  }
  return discovered;
}

export function getDiscoveredWallets(): DiscoveredWallet[] {
  return discovered;
}

export function hasAnyWallet(): boolean {
  return (
    discovered.length > 0 ||
    !!(window as unknown as { ethereum?: Eip1193Provider }).ethereum
  );
}

export interface WalletState {
  address: string;
  chainOk: boolean;
  balance: string;
}

// 连接指定钱包：弹出授权窗口
export async function connectWallet(
  provider: Eip1193Provider
): Promise<WalletState> {
  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  if (!accounts || accounts.length === 0) {
    throw new Error("NO_ACCOUNTS");
  }
  const address = accounts[0];
  const [chainOk, balance] = await Promise.all([
    checkChain(provider),
    readBalance(provider, address),
  ]);
  return { address, chainOk, balance };
}

// 读取当前链 ID，判断是否 Monad Testnet
export async function checkChain(
  provider: Eip1193Provider
): Promise<boolean> {
  const chainId = (await provider.request({
    method: "eth_chainId",
  })) as string;
  return parseInt(chainId, 16) === MONAD_CHAIN_ID_DEC;
}

// 读取 MON 余额
export async function readBalance(
  provider: Eip1193Provider,
  address: string
): Promise<string> {
  const ethersProvider = new BrowserProvider(provider as never);
  const wei = await ethersProvider.getBalance(address);
  return parseFloat(formatEther(wei)).toFixed(2);
}

// 网络不对时：先尝试切换，钱包里没有 Monad 配置则引导添加网络
export async function switchToMonad(
  provider: Eip1193Provider
): Promise<boolean> {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: MONAD_TESTNET.chainId }],
    });
    return true;
  } catch (err) {
    const code = (err as { code?: number }).code;
    // 4902 = 钱包尚未添加该链
    if (code === 4902) {
      try {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [MONAD_TESTNET],
        });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

// 读取当前已授权的全部账号
export async function listAccounts(
  provider: Eip1193Provider
): Promise<string[]> {
  const accounts = (await provider.request({
    method: "eth_accounts",
  })) as string[];
  return accounts ?? [];
}

// 重新弹出钱包的账号选择界面（切换账号用）
// wallet_requestPermissions 会让钱包再次展示"选择账号"窗口
export async function requestAccountSwitch(
  provider: Eip1193Provider
): Promise<string[]> {
  await provider.request({
    method: "wallet_requestPermissions",
    params: [{ eth_accounts: {} }],
  });
  return listAccounts(provider);
}

// 用户切换账号 / 网络时刷新页面状态
export function watchWallet(
  provider: Eip1193Provider,
  onChange: () => void
) {
  provider.on?.("accountsChanged", onChange as never);
  provider.on?.("chainChanged", onChange as never);
}
