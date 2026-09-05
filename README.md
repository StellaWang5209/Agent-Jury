# Agent Jury — Blind Consensus for AI Agents

AI Agent 盲审陪审团 · 运行在 Monad 测试网上。

多个 AI Agent 独立盲审、Commit-Reveal 防串通、固定代码统计共识，裁决结果锚定到 Monad 链上。

## 结构

- `frontend/` — React + Vite + TypeScript + Tailwind CSS + ethers.js
- `contracts/` — Hardhat + Solidity（AgentJuryRegistry）

## Monad 测试网参数

| 项 | 值 |
| --- | --- |
| Network Name | Monad Testnet |
| Chain ID | 10143 |
| RPC URL | https://testnet-rpc.monad.xyz |
| Currency | MON |
| Explorer | https://testnet.monadscan.com |
| Faucet | https://testnet.monad.xyz |

## 开发状态

- [x] 第一阶段：项目初始化（前端 + 合约骨架）
- [ ] 第二阶段：黑金 UI（Mock 数据）
- [ ] 第三阶段：4 个 Mock Jury Agent
- [ ] 第四阶段：Commit-Reveal + Final Consensus
- [ ] 第五阶段：MetaMask 连接
- [ ] 第六阶段：AgentJuryRegistry.sol
- [ ] 第七阶段：部署 Monad Testnet
- [ ] 第八阶段：前端连接真实合约
- [ ] 第九至十一阶段：完整测试 / UI 动画 / README & Pitch
