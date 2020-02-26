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
      gas: 6712388
    }
  }
};
