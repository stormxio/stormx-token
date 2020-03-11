const StormX = artifacts.require("StormXToken");
const truffleConfig = require('../truffle.js');

module.exports = function(deployer, network, accounts) {

    const networkConfig = truffleConfig.newtworks[network];
    const reserveAddress = networkConfig.reserve || accounts[1];

    deployer.then(() => deployer.deploy(StormX, reserveAddress))
};
