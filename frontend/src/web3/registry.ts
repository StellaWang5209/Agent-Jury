import { BrowserProvider, Contract } from "ethers";
import contractConfig from "./contract-address.json";
import type { Eip1193Provider } from "./wallet";

export const CONTRACT_ADDRESS = contractConfig.contractAddress as string;
export const EXPLORER = "https://testnet.monadscan.com";

// AgentJuryRegistry 核心函数的 ABI（只声明前端用到的部分）
const REGISTRY_ABI = [
  "function recordJuryCase(bytes32 caseHash, bytes32[4] commitments, uint8[4] verdicts, uint8 finalVerdict) returns (uint256 caseId)",
  "function getCase(uint256 caseId) view returns (tuple(uint256 id, address creator, bytes32 caseHash, bytes32[4] commitments, uint8[4] verdicts, uint8 finalVerdict, uint256 timestamp))",
  "function caseCount() view returns (uint256)",
  "event JuryCaseRecorded(uint256 indexed caseId, address indexed creator, bytes32 caseHash, uint8 finalVerdict)",
];

export interface AnchorPayload {
  caseHash: string; // bytes32 hex
  commitments: [string, string, string, string]; // 4 个 commitmentHash
  verdicts: [number, number, number, number]; // 0=ALLOW 1=REVIEW 2=BLOCK
  finalVerdict: number;
}

/**
 * 把完整裁决证明提交到 Monad 测试网
 * 1. 用用户钱包签名并发送交易（MetaMask 会弹确认窗口）
 * 2. 等待交易被打包
 * 返回 { txHash, caseId }
 */
export async function anchorJuryCase(
  provider: Eip1193Provider,
  payload: AnchorPayload
): Promise<{ txHash: string; caseId: number }> {
  const signer = await new BrowserProvider(provider as never).getSigner();
  const registry = new Contract(CONTRACT_ADDRESS, REGISTRY_ABI, signer);

  const tx = await registry.recordJuryCase(
    payload.caseHash,
    payload.commitments,
    payload.verdicts,
    payload.finalVerdict
  );
  const receipt = await tx.wait(); // 等待链上确认
  if (!receipt || receipt.status !== 1) {
    throw new Error("TRANSACTION_FAILED");
  }

  // 从事件中取 caseId
  let caseId = 0;
  for (const log of receipt.logs) {
    try {
      const parsed = registry.interface.parseLog({
        topics: [...log.topics],
        data: log.data,
      });
      if (parsed && parsed.name === "JuryCaseRecorded") {
        caseId = Number(parsed.args.caseId);
        break;
      }
    } catch {
      // 非合约事件日志，跳过
    }
  }

  return { txHash: receipt.hash, caseId };
}
