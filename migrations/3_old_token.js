const OldToken = artifacts.require("StormToken");
const truffleConfig = require('../truffle.js');
const utils = require('./Utils.js');


module.exports = async function(deployer, network, accounts) {
  let result = await utils.canDeploy(network, 'StormToken');
  if (!result) {
    return;
  } // skip the deployment in development

  const networkConfig = truffleConfig.networks[network];
  const ownerAddress = networkConfig.account || accounts[0];

  deployer
    .then(async () => await deployer.deploy(OldToken, ownerAddress))
};
