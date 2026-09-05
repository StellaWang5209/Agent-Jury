import { ethers } from "ethers";
import type { CaseData, JurorResult } from "../types";

// ===== Commit-Reveal 哈希工具 =====
// 全部使用 ethers.js 标准 SolidityPackedKeccak256，与智能合约编码保持一致
// 不自己实现任何哈希算法

/** caseHash = keccak256(userAddress ++ question ++ timestamp) */
export function computeCaseHash(caseData: CaseData): string {
  return ethers.solidityPackedKeccak256(
    ["address", "string", "uint256"],
    [caseData.userAddress, caseData.question, BigInt(caseData.timestamp)]
  );
}

/** 每个陪审员独立随机 salt（32 字节） */
export function randomSalt(): string {
  return ethers.hexlify(ethers.randomBytes(32));
}

/** reasonHash = keccak256(summary ++ reasons) */
export function computeReasonHash(result: JurorResult): string {
  return ethers.solidityPackedKeccak256(
    ["string", "string[]"],
    [result.summary, result.reasons]
  );
}

/**
 * commitmentHash =
 * keccak256(caseHash ++ jurorId ++ verdict ++ confidence ++ reasonHash ++ salt)
 */
export function computeCommitmentHash(
  caseHash: string,
  jurorId: number,
  verdict: number,
  confidence: number,
  reasonHash: string,
  salt: string
): string {
  return ethers.solidityPackedKeccak256(
    ["bytes32", "uint8", "uint8", "uint8", "bytes32", "bytes32"],
    [caseHash, jurorId, verdict, confidence, reasonHash, salt]
  );
}

/**
 * Reveal 校验：重算 commitmentHash 并与 Commit 阶段的值比对
 * 一致 → VERIFIED，不一致 → VERIFICATION FAILED
 */
export function verifyCommitment(
  caseHash: string,
  jurorId: number,
  verdict: number,
  confidence: number,
  reasonHash: string,
  salt: string,
  commitmentHash: string
): boolean {
  return computeCommitmentHash(caseHash, jurorId, verdict, confidence, reasonHash, salt) === commitmentHash;
}
