import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
    networks: {
      hardhat: {
        chainId: 1337,
        allowUnlimitedContractSize: true,
        initialBaseFeePerGas: 0
      },
      localhost: {
        url: 'http://127.0.0.1:8545/',
        chainId: 31337
      },
      // base: {
      //   url: 'https://mainnet.base.org', // https://base-mainnet.public.blastapi.io
      //   chainId: 8453,
      //   accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      //   gas: "auto", // gas limit
      //   gasPrice: 200000000, // 0.2 gwei
      // },
      // baseTestnet: {
      //   url: 'https://base-goerli.public.blastapi.io',
      //   chainId: 84531,
      //   accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      //   gas: "auto", // gas limit
      //   gasPrice: 1000000000, // 1 gwei
      // },
      // degen: { // DEGEN L3 Chain mainnet
      //   url: 'https://rpc.degen.tips',
      //   chainId: 666666666,
      //   accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      //   gas: "auto", // gas limit
      //   gasPrice: 25000000000, // 25 gwei
      // }
    },
  solidity: "0.8.24",
    etherscan: {
      apiKey: { // all possible key names here: https://gist.github.com/tempe-techie/95a3ad4e81b46c895928a0524fc2b7ac
        // base: process.env.BASESCAN_API_KEY,
        // baseTestnet: process.env.BASESCAN_API_KEY,
        degen: "randomstring",
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
        /* 
        {
          network: "base", // Blockscout
          chainId: 8453,
          urls: {
            apiURL: "https://base.blockscout.com/api",
            browserURL: "https://base.blockscout.com"
          }
        },
        */
        {
          network: "baseTestnet",
          chainId: 84531,
          urls: {
            apiURL: "https://base-goerli.blockscout.com/api", // "https://api-goerli.basescan.org/api",
            browserURL: "https://base-goerli.blockscout.com" // "https://goerli.basescan.org" 
          }
        },
        {
          network: "degen",
          chainId: 666666666,
          urls: {
            apiURL: "https://explorer.degen.tips/api",
            browserURL: "https://explorer.degen.tips"
          }
        },
      ]
  },
};

export default config;



// require("@nomiclabs/hardhat-waffle");
// require("@nomiclabs/hardhat-etherscan");
// require('@openzeppelin/hardhat-upgrades');
// require('dotenv').config();

// /**
//  * @type import('hardhat/config').HardhatUserConfig
//  */
// module.exports = {

//   etherscan: {
//     apiKey: { // all possible key names here: https://gist.github.com/tempe-techie/95a3ad4e81b46c895928a0524fc2b7ac
//       base: process.env.BASESCAN_API_KEY,
//       baseTestnet: process.env.BASESCAN_API_KEY,
//       degen: "randomstring",
//     },
//     customChains: [
//       {
//         network: "base", // BaseScan (Etherscan)
//         chainId: 8453,
//         urls: {
//           apiURL: "https://api.basescan.org/api",
//           browserURL: "https://basescan.org"
//         }
//       },
//       /* 
//       {
//         network: "base", // Blockscout
//         chainId: 8453,
//         urls: {
//           apiURL: "https://base.blockscout.com/api",
//           browserURL: "https://base.blockscout.com"
//         }
//       },
//       */
//       {
//         network: "baseTestnet",
//         chainId: 84531,
//         urls: {
//           apiURL: "https://base-goerli.blockscout.com/api", // "https://api-goerli.basescan.org/api",
//           browserURL: "https://base-goerli.blockscout.com" // "https://goerli.basescan.org" 
//         }
//       },
//       {
//         network: "degen",
//         chainId: 666666666,
//         urls: {
//           apiURL: "https://explorer.degen.tips/api",
//           browserURL: "https://explorer.degen.tips"
//         }
//       },
//     ]
//   },

//   solidity: {
//     version: "0.8.4",
//     settings: {
//       optimizer: {
//         enabled: true,
//         runs: 200
//       }
//     }
//   }
  
// };