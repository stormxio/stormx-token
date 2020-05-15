const Transfers = artifacts.require('Transfers');
const StormX = artifacts.require('StormXToken');
const truffleConfig = require('../truffle.js');
const utils = require('./Utils.js');


module.exports = function(deployer, network, accounts) {
  let result = utils.canDeploy(network, 'Transfers');
  if (!result) {
    return;
  } // skip the deployment in development

  deployer.then(() => deployer.deploy(Transfers, StormX.address))
};
