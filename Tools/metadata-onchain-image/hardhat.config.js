require("dotenv").config();
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200 // The 'runs' count can be adjusted based on how often you expect each part of your contract to be executed.
      },
      viaIR: true  // Enable the IR optimizer
    }
  },
  networks: {
    baseMainnet: {
      url: "https://mainnet.base.org", // Replace with actual Base mainnet RPC URL
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`], // Ensure your private key is safe and not exposed
      chainId: 8453,
    },
    baseSepolia: {
      url: "https://sepolia.base.org", // Replace with actual Base Sepolia RPC URL
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`], // Ensure your private key is safe and not exposed
      chainId: 84532, // Replace with actual Base Sepolia chain ID
    },
  },
  etherscan: {
    apiKey: process.env.BASESCAN_API_KEY, // Use your actual Basescan API key
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api", // Replace with the actual Basescan API URL
          browserURL: "https://basescan.org" // Replace with the actual Basescan explorer URL
        }
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api", // Replace with the actual Sepolia Basescan API URL
          browserURL: "https://sepolia.basescan.org" // Replace with the actual Sepolia Basescan explorer URL
        }
      }
    ]
  },
};
