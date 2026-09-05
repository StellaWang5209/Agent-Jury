import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * 部署 AgentJuryRegistry 到 Monad Testnet
 * 部署完成后把合约地址写入 frontend/src/web3/contract-address.json
 * 方便前端自动加载，不需要改代码。
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("==========================================");
  console.log("网络:", network.name, `(chainId ${network.config.chainId})`);
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(balance), "MON");
  console.log("==========================================");

  if (balance === 0n) {
    throw new Error("部署账户余额为 0，请先去 https://testnet.monad.xyz 领取测试 MON");
  }

  console.log("正在部署 AgentJuryRegistry...");
  const Factory = await ethers.getContractFactory("AgentJuryRegistry");
  const registry = await Factory.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("\n✅ 部署成功！");
  console.log("合约地址:", address);

  // 取部署交易哈希
  const deploymentTx = registry.deploymentTransaction();
  if (deploymentTx) {
    console.log("部署交易哈希:", deploymentTx.hash);
  }

  // 链上验证：发起一笔测试裁决记录
  console.log("\n正在写入一笔测试裁决（验证合约可用）...");
  const caseHash = ethers.id("Agent Jury deployment test case");
  const commitments = [
    ethers.id("commit-0"),
    ethers.id("commit-1"),
    ethers.id("commit-2"),
    ethers.id("commit-3"),
  ];
  const tx = await registry.recordJuryCase(
    caseHash,
    commitments,
    [2, 1, 1, 2], // BLOCK / REVIEW / REVIEW / BLOCK
    2 // finalVerdict = BLOCK
  );
  const receipt = await tx.wait();
  console.log("测试裁决交易哈希:", receipt?.hash);
  const stored = await registry.getCase(1);
  console.log("链上读取 caseId=1 finalVerdict =", stored.finalVerdict, "(2 = BLOCK ✓)");

  // 写入前端配置
  const configContent = JSON.stringify(
    {
      contractAddress: address,
      network: "Monad Testnet",
      chainId: 10143,
      deploymentTxHash: deploymentTx?.hash ?? "",
      deployedAt: new Date().toISOString(),
      explorer: "https://testnet.monadscan.com",
    },
    null,
    2
  );
  const outputPath = path.join(__dirname, "../../frontend/src/web3/contract-address.json");
  fs.writeFileSync(outputPath, configContent);
  console.log("\n已写入前端配置:", outputPath);
  console.log("==========================================");
  console.log("Explorer 查看:", `https://testnet.monadscan.com/address/${address}`);
  console.log("==========================================");
}

main().catch((error) => {
  console.error("\n❌ 部署失败:");
  console.error(error);
  process.exitCode = 1;
});
