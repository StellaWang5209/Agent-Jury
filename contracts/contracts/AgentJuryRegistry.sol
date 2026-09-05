// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AgentJuryRegistry
 * @notice AI Agent 盲审陪审团裁决证明登记合约（Monad Testnet）
 * @dev 合约不运行 AI、不管理用户资产，只负责把链下完成的
 *      Commit-Reveal 盲审结果作为证明锚定上链。
 *
 * verdict 编码（与前端 types.ts 一致）：
 *   0 = ALLOW
 *   1 = REVIEW
 *   2 = BLOCK
 */
contract AgentJuryRegistry {
    // ============ 数据结构 ============

    struct JuryCase {
        uint256 id;             // 案件编号
        address creator;        // 发起裁决的钱包地址
        bytes32 caseHash;       // keccak256(userAddress ++ question ++ timestamp)
        bytes32[4] commitments; // 4 名陪审员的 commitmentHash
        uint8[4] verdicts;      // 4 名陪审员的最终投票（Reveal 后的明文）
        uint8 finalVerdict;     // 固定代码统计出的最终裁决
        uint256 timestamp;      // 记录时间
    }

    // ============ 状态变量 ============

    uint256 public caseCount;
    mapping(uint256 => JuryCase) public cases;

    address public owner;

    // ============ 事件 ============

    event JuryCaseRecorded(
        uint256 indexed caseId,
        address indexed creator,
        bytes32 caseHash,
        uint8 finalVerdict
    );

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ============ 修饰符 ============

    modifier validVerdict(uint8 v) {
        require(v <= 2, "Invalid verdict encoding");
        _;
    }

    // ============ 构造 ============

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ============ 核心函数 ============

    /**
     * @notice 记录一次完整盲审裁决证明
     * @param caseHash      案件哈希 keccak256(user ++ question ++ timestamp)
     * @param commitments   4 名陪审员 Commit 阶段提交的 commitmentHash
     * @param verdicts      4 名陪审员 Reveal 后的投票（0/1/2）
     * @param finalVerdict  固定代码统计的最终裁决（0/1/2）
     * @return caseId 案件编号
     */
    function recordJuryCase(
        bytes32 caseHash,
        bytes32[4] calldata commitments,
        uint8[4] calldata verdicts,
        uint8 finalVerdict
    ) external validVerdict(finalVerdict) returns (uint256 caseId) {
        for (uint256 i = 0; i < 4; i++) {
            require(verdicts[i] <= 2, "Invalid juror verdict");
            require(commitments[i] != bytes32(0), "Empty commitment");
        }

        caseId = ++caseCount;
        cases[caseId] = JuryCase({
            id: caseId,
            creator: msg.sender,
            caseHash: caseHash,
            commitments: commitments,
            verdicts: verdicts,
            finalVerdict: finalVerdict,
            timestamp: block.timestamp
        });

        emit JuryCaseRecorded(caseId, msg.sender, caseHash, finalVerdict);
    }

    // ============ 查询函数 ============

    function getCase(uint256 caseId)
        external
        view
        returns (JuryCase memory)
    {
        require(caseId >= 1 && caseId <= caseCount, "Case not found");
        return cases[caseId];
    }

    /**
     * @notice 链上复核固定投票规则，验证 finalVerdict 是否合法
     * @dev 与前端一致：BLOCK>=3 -> BLOCK；ALLOW>=3 -> ALLOW；否则 REVIEW
     *      Security Jury(index 0) 投 BLOCK 且投票为 uint8(2)，
     *      confidence 不上链，保底规则由前端在 Reveal 时执行。
     */
    function verifyFinalVerdict(uint256 caseId)
        external
        view
        returns (bool)
    {
        require(caseId >= 1 && caseId <= caseCount, "Case not found");
        uint8[4] memory vs = cases[caseId].verdicts;
        uint256 allow;
        uint256 block_;
        for (uint256 i = 0; i < 4; i++) {
            if (vs[i] == 0) allow++;
            else if (vs[i] == 2) block_++;
        }
        uint8 expected;
        if (block_ >= 3) expected = 2;
        else if (allow >= 3) expected = 0;
        else expected = 1;
        return cases[caseId].finalVerdict == expected;
    }

    // ============ 管理 ============

    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "Only owner");
        require(newOwner != address(0), "Zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
