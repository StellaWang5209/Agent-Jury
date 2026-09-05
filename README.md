# Agent Jury — AI Agent 盲审共识陪审团

> **Monad Blitz@惠州 黑客松参赛项目**
> 让每一个 AI 决策，都经得起陪审。

[![Live Demo](https://img.shields.io/badge/LIVE_DEMO-app.workbuddy.link-D9A94E)](https://128840e2f4b341a58f39bff9bb57b6d4.app.workbuddy.link)
[![Monad Testnet](https://img.shields.io/badge/CONTRACT-0x2986...eA9-836EF1)](https://testnet.monadscan.com/address/0x2986c8094771162F39AD991d6dc87490149BfeA9)

## 解决什么问题

当一个 AI Agent 集群做决策时，**从众效应在物理上瞬间发生**：一条错误意见可以在几秒内传染整个集群（锚定效应 / 从众效应 / 黑盒无追责）。让多个 AI "开会讨论" 并不能解决——它们共享同一模型先验，会一起错。

**Agent Jury 的答案：不让它们说话。**

4 个独立陪审 Agent 各自盲审同一个案件，**互相看不见彼此的结论**，结论加密密封后统一揭晓，最后按固定代码规则形成共识——从众在机制上不可能发生。

## 工作机制（Commit-Reveal 盲审）

```
提交案件 → 4 Agent 独立盲审 → keccak256 密封承诺(Commit) → 统一揭晓(Reveal) → 哈希验证 → 固定规则共识 → 链上锚定
```

**固定代码共识规则**（无人为干预，代码即法律）：

- BLOCK ≥ 3 票 → 最终 **BLOCK**
- ALLOW ≥ 3 票 → 最终 **ALLOW**
- 其余情况 → **REVIEW**
- 特例：Security Jury 以 ≥95% 置信度投 BLOCK，但共识为 ALLOW → 强制降级为 **REVIEW**（安全一票保留权）

4 个陪审员视角各不相同：**Security**（安全风险）/ **Intent**（意图与合规）/ **Economic**（经济影响）/ **Adversarial**（对抗性红队视角，专门找反方证据）。

## 实测演示

| 危险案例 → BLOCK | 安全案例 → ALLOW |
| --- | --- |
| 3 BLOCK + 1 REVIEW（Economic 持保留意见） | Adversarial 主动异议，共识仍为 ALLOW |
| ![危险案例](screenshots/demo-dangerous.png) | ![安全案例](screenshots/demo-safe.png) |

- **在线演示**：<https://128840e2f4b341a58f39bff9bb57b6d4.app.workbuddy.link>
- 未连接钱包也可完整体验盲审流程；连接 MetaMask/OKX/Rabby（EIP-6963 多钱包发现）后可将裁决锚定上链

## 为什么必须构建在 Monad 上

Agent 决策是机器速度：高频、小额、要求实时上链存证。

| 维度 | 以太坊主网 | Monad | 对 Agent Jury 的意义 |
| --- | --- | --- | --- |
| TPS | ~15 | 10,000 | 每个决策都可上链验证 |
| 出块/最终性 | 12s / 分钟级 | ~1s / 单时隙 | 裁决作为实时闸门不掉速 |
| 单笔费用 | $1–50 | <$0.01 | 每案 8+ 笔交易，免费模式账算得平 |
| 执行模型 | 串行 | 并行 EVM | 与 4 陪审员并行盲审哲学同构 |

> 不是我们选择了 Monad —— 是产品形态，只有 Monad 能承载。

## 生态定位：免费附加服务，信任中间件

Agent Jury 不做独立收费产品，而是作为**免费附加服务**嵌入 Agent 生态的宿主项目：

| 宿主 | 集成方式 |
| --- | --- |
| Agent 框架平台（ElizaOS / Virtuals 等） | 敏感操作前预检 Hook，`await jury.review(action)` 3 行代码接入 |
| Agent 钱包与金库 | 大额操作先过盲审，替代人工二次确认 |
| DeFi 策略 Agent | 调仓/清算前盲审风控，防 prompt injection 带偏策略 |
| Agent 市场与商店 | 上架审核打「盲审安全认证分」 |
| DAO 治理工具 | 提案预审 · 小额争议快速仲裁 |
| 自动支付 / DePIN | 自动执行高价操作前的二次风控 |

宿主白拿「盲审安全」差异化标签；Agent Jury 换回真实案例数据与默认装机量——**先把裁决公信力做成生态标准，才是终极护城河。**

## 快速开始

```bash
git clone https://github.com/StellaWang5209/Agent-Jury.git
cd Agent-Jury

# 前端
cd frontend && npm install && npm run dev   # http://localhost:5173

# 合约（需配置 contracts/.env，参见 .env.example）
cd ../contracts && npm install && npx hardhat test
```

## 链上部署（Monad Testnet）

| 项 | 值 |
| --- | --- |
| 合约 | `AgentJuryRegistry.sol` |
| 地址 | [`0x2986c8094771162F39AD991d6dc87490149BfeA9`](https://testnet.monadscan.com/address/0x2986c8094771162F39AD991d6dc87490149BfeA9) |
| Chain ID | 10143 |
| RPC URL | https://testnet-rpc.monad.xyz |
| Currency | MON |
| Explorer | https://testnet.monadscan.com |

合约功能：案件登记、4 个 commitment 存证、裁决锚定、`verifyFinalVerdict` 公开验证——任何第三方都可复算共识过程，全程可审计。

## 技术栈

- **前端**：React 18 + Vite + TypeScript + Tailwind CSS + ethers.js v6
- **合约**：Solidity + Hardhat（9 个测试全部通过）
- **钱包**：EIP-6963 多钱包发现 + EIP-1193 标准接口
- **加密**：keccak256 Commit-Reveal，同一案件结果可复现、可链上验证

## 路线图

- **V1（已完成，本仓库）**：4 Agent 盲审 + Commit-Reveal + 链上锚定 + 完整 DApp
- **V2**：Mock Provider 替换为真实 LLM 陪审员（Provider 接口已解耦）
- **V3**：仲裁 API / SDK，供宿主项目 3 行代码接入
- **V4**：去中心化仲裁市场 + 陪审员信誉体系

## 参赛信息

- **比赛**：Monad Blitz@惠州（2026）
- **演示**：https://128840e2f4b341a58f39bff9bb57b6d4.app.workbuddy.link
- **合约**：0x2986c8094771162F39AD991d6dc87490149BfeA9（Monad Testnet）
