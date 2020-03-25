const StormX = artifacts.require("StormXToken");
const truffleConfig = require('../truffle.js');
const utils = require('./Utils.js');


module.exports = function(deployer, network, accounts) {
  let result = utils.canDeploy(network, 'StormXToken');
  if (!result) {
    return;
  } // skip the deployment in development

  const networkConfig = truffleConfig.networks[network];
  const reserveAddress = networkConfig.reserve || accounts[1];

  deployer.then(() => deployer.deploy(StormX, reserveAddress))
};
