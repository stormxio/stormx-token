const StormX = artifacts.require("StormXToken");
const OldToken = artifacts.require("StormToken");
const Swap = artifacts.require("Swap");
const truffleConfig = require('../truffle.js');
const utils = require('./Utils.js');

module.exports = async function(deployer, network, accounts) {
  let result = await utils.canDeploy(network, 'Swap');
  if (!result) {
    return;
  } // skip the deployment in development

  const networkConfig = truffleConfig.networks[network];
  const ownerAddress = networkConfig.account || accounts[1];
  const reserveAddress = networkConfig.reserve || accounts[1];
  const stormXAddress = StormX.address;
  const oldTokenAddress = OldToken.address;
  const mintAmount = 10000 * (10 ** 18);

  deployer
    .then(async () => await deployer.deploy(Swap, oldTokenAddress, stormXAddress, reserveAddress))
    .then(async() => await utils.callMethod({
      network,
      artifact: StormX,
      contractName: 'StormXToken',
      methodName: 'initialize', // swap can now mint new tokens during token swap
      methodArgsFn: () => ([
        Swap.address,
      ]),
      sendArgs: {
          from: ownerAddress, 
          gasPrice: networkConfig.gasPrice,
          gas: networkConfig.gas
        }
      }))
    // mint some old tokens for testing before transferring out ownership
    .then(async() => await utils.callMethod({
      network,
      artifact: OldToken,
      contractName: 'StormToken',
      methodName: 'mintTokens',
      methodArgsFn: () => ([
        ownerAddress,
        mintAmount,
      ]),
      sendArgs: {
          from: ownerAddress,
          gasPrice: networkConfig.gasPrice,
          gas: networkConfig.gas
        }
      }))
      .then(async() => await utils.callMethod({
        network,
        artifact: OldToken,
        contractName: 'StormToken',
        methodName: 'disableTransfers',
        methodArgsFn: () => ([
          false,
        ]),
        sendArgs: {
            from: ownerAddress,
            gasPrice: networkConfig.gasPrice,
            gas: networkConfig.gas
          }
        }))
    .then(async() => await utils.callMethod({
      network,
      artifact: OldToken,
      contractName: 'StormToken',
      methodName: 'transferOwnership',
      methodArgsFn: () => ([
        Swap.address,
      ]),
      sendArgs: {
          from: ownerAddress,
          gasPrice: networkConfig.gasPrice,
          gas: networkConfig.gas
        }
      }))
    .then(async() => await utils.callMethod({
      network,
      artifact: Swap,
      contractName: 'Swap',
      methodName: 'initialize', // swap becomes owner of the old token contract
      methodArgsFn: () => ([
      ]),
      sendArgs: {
          from: ownerAddress, 
          gasPrice: networkConfig.gasPrice,
          gas: networkConfig.gas
        }
      }))
};

