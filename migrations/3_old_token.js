const OldToken = artifacts.require("StormToken");
const truffleConfig = require('../truffle.js');

module.exports = function(deployer, network, accounts) {

    const networkConfig = truffleConfig.newtworks[network];
    const ownerAddress = networkConfig.owner || accounts[1];

    deployer.then(() => deployer.deploy(OldToken, ownerAddress))
};
