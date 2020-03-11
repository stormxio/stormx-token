const HDWalletProvider = require("truffle-hdwallet-provider");

module.exports = {
  plugins: ["solidity-coverage"], 
  compilers:{
    solc: {
      version:"0.5.16",
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "istanbul",
    }
  },
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*", // Match any network id
      gas: 0xffffffffff,
      gasPrice: 1000000000
    },
    ropsten: {
      provider: function() {
        const credentials = require("./credentials.js");
        return new HDWalletProvider(credentials.mnemonic, `https://ropsten.infura.io/v3/${credentials.infura_apikey}`);
      },
      network_id: 3,
      gas: 6712388,
      gasPrice: 180000000000,
      account: "0xb6EE73c5417559ad633bd14a1DFF6eb7b1B4F932",
      reserve: "0xb6EE73c5417559ad633bd14a1DFF6eb7b1B4F932",
      skipDryRun: true,
    }
  }
};
