require("@nomiclabs/hardhat-waffle");

const privateKey = "1fe52b4091ce2cc541e9a18407b49744d8200ba4431fa416088bbd27529941ba";

require('@nomiclabs/hardhat-ethers');
require("@nomiclabs/hardhat-etherscan");
require("solidity-coverage");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        url: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
        blockNumber: 15766491
      },
    },
    testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",//"https://data-seed-prebsc-1-s1.binance.org:8545/",//"https://rpc-mumbai.maticvigil.com/",
      chainId: 97,//80001, //97,
      accounts: [privateKey]
    },
    goerli: {
      url: "https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
      chainId: 5,//80001, //97,
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
    apiKey: "NTEEC2JSF6MYS4YFNHHA3Y8CRXIRP5R1HB"
  },
  solidity: {
    version: "0.8.7",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }
};
