// require("@nomicfoundation/hardhat-toolbox");
// require("dotenv").config();

// module.exports = {
//   solidity: "0.8.24",
//   networks: {
//     sepolia: {
//       url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
//       accounts: [process.env.PRIVATE_KEY],
//     },
//   },
//   etherscan: {
//     apiKey: process.env.ETHERSCAN_API_KEY,
//   },
// };

require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.24",
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY],
    },
    ganache: {
      url: "http://127.0.0.1:8545", // Ganache default RPC URL
      chainId: 1337,               // Ganache default chain ID
      accounts: {
        mnemonic: "neither column lab outside worth barely analyst north neck vague shrug blossom", // Optional: Replace with Ganache mnemonic for consistency
        count: 10,                     // Number of accounts to generate
      },
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};