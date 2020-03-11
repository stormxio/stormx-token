const StormX = artifacts.require("StormXToken");
const OldToken = artifacts.require("StormToken");
const Swap = artifacts.require("Swap");
const truffleConfig = require('../truffle.js');

module.exports = function(deployer, network, accounts) {

    const networkConfig = truffleConfig.newtworks[network];
    const reserveAddress = networkConfig.reserve || accounts[1];
    const stormXAddress = networkConfig.stormXAddress || Stormx.address;
    const oldTokenAddress = networkConfig.oldTokenAddress || OldToken.address;

    deployer.then(() => deployer.deploy(Swap, stormXAddress, oldTokenAddress, reserveAddress))
};
