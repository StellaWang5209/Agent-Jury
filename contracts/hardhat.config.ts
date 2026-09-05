import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

// Monad Testnet 官方参数（来源: docs.monad.xyz / monskill, 2026-09 确认）
// Chain ID: 10143 | RPC: https://testnet-rpc.monad.xyz
// Explorer: https://testnet.monadscan.com | Faucet: https://testnet.monad.xyz
const MONAD_TESTNET_RPC = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    monadTestnet: {
      url: MONAD_TESTNET_RPC,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      chainId: 10143,
    },
  },
};

export default config;
