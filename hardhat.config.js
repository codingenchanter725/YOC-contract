require("@nomiclabs/hardhat-waffle");

require('@nomiclabs/hardhat-ethers');
require("@nomiclabs/hardhat-etherscan");
require("solidity-coverage");

require('dotenv').config();
const privateKey = process.env.privateKey;

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        url: "https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
        blockNumber: 8184637
      },
    },
    testnet: {
      url: "https://data-seed-prebsc-1-s3.binance.org:8545/",//"https://data-seed-prebsc-1-s1.binance.org:8545/",//"https://rpc-mumbai.maticvigil.com/",
      chainId: 97,//80001, //97,
      accounts: [privateKey]
    },
    goerli: {
      url: "https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
      chainId: 5,//80001, //97,
      accounts: [privateKey]
    },
    sepolia: {
      url: "https://rpc2.sepolia.org",
      chainId: 11155111,
      accounts: [privateKey]
    },
    mainnet: {
      url: "https://bsc-dataseed1.defibit.io/",//"https://polygon-rpc.com",
      chainId: 56,
      accounts: [privateKey]
    },
  },
  paths: {
    sources: "./contracts",
    artifacts: "./src/artifacts"
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://bscscan.com/
    // apiKey: "KK9WGHD5CUJXH2DEVJKV5M47VZDCE6N4WX"
    apiKey: "UCDP2TXWW1PPZFRAMTUQNS5KGFXPESH5RH" //bsc
  },
  solidity: {
    compilers: [
      {
        version: "0.8.10",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        }
      },
      {
        version: "0.8.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        }
      },
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        }
      },
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        }
      },
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        }
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        }
      },
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        }
      },
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }
};
