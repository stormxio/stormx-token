const OldToken = artifacts.require("StormToken");
const truffleConfig = require('../truffle.js');

module.exports = function(deployer, network, accounts) {

  const networkConfig = truffleConfig.networks[network];
  const ownerAddress = networkConfig.account || accounts[0];

  deployer
    .then(() => deployer.deploy(OldToken, ownerAddress))
};
