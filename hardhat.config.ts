import dotenv from "dotenv";

import { HardhatUserConfig } from "hardhat/config";
import type { HttpNetworkUserConfig } from "hardhat/types";
import "@nomicfoundation/hardhat-toolbox";

dotenv.config();
const { PRIVATE_KEY, MNEMONIC } = process.env;

const DEFAULT_MNEMONIC = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

const sharedNetworkConfig: HttpNetworkUserConfig = {};
if (PRIVATE_KEY) {
  sharedNetworkConfig.accounts = [PRIVATE_KEY];
} else {
  sharedNetworkConfig.accounts = {
      mnemonic: MNEMONIC || DEFAULT_MNEMONIC,
  };
}

const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
    networks: {
      hardhat: {
        chainId: 1337,
        allowUnlimitedContractSize: true,
        initialBaseFeePerGas: 0
      },
      base: {
        ...sharedNetworkConfig,
        url: 'https://mainnet.base.org', // https://base-mainnet.public.blastapi.io
        chainId: 8453,
        // gas: "auto", // gas limit
        gasPrice: 1000000000, // 1 gwei
      },
      baseTestnet: {
        ...sharedNetworkConfig,
        url: 'https://sepolia.base.org',
        chainId: 84532,
        gas: "auto", // gas limit
        gasPrice: 1000000000, // 1 gwei
      }
    },
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
    etherscan: {
      apiKey: { // all possible key names here: https://gist.github.com/tempe-techie/95a3ad4e81b46c895928a0524fc2b7ac
        base: BASESCAN_API_KEY,
        baseTestnet: BASESCAN_API_KEY
      },
      customChains: [
        {
          network: "base", // BaseScan (Etherscan)
          chainId: 8453,
          urls: {
            apiURL: "https://api.basescan.org/api",
            browserURL: "https://basescan.org"
          }
        },
        {
          network: "baseTestnet",
          chainId: 84532,
          urls: {
            apiURL: "https://api-sepolia.basescan.org/api",
            browserURL: "https://sepolia.basescan.org/"
          }
        }
      ]
  },
};

export default config;
