const StormX = artifacts.require("StormXToken");
const OldToken = artifacts.require("StormToken");
const Swap = artifacts.require("Swap");
const truffleConfig = require('../truffle.js');
const utils = require('./Utils.js');

module.exports = function(deployer, network, accounts) {

    const networkConfig = truffleConfig.networks[network];
    const ownerAddress = networkConfig.account || accounts[1];
    const reserveAddress = networkConfig.reserve || accounts[1];
    const stormXAddress = networkConfig.stormXAddress || StormX.address;
    const oldTokenAddress = networkConfig.oldTokenAddress || OldToken.address;

  deployer
    .then(() => deployer.deploy(Swap, oldTokenAddress, stormXAddress, reserveAddress))
    .then(async() => await utils.callMethod({
      network,
      artifact: StormX,
      contractName: 'StormXToken',
      methodName: 'addMinter', // swap can now mint new tokens during token swap
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
      artifact: StormX,
      contractName: 'StormXToken',
      methodName: 'addGSNRecipient', // swap can charge users for GSN fees
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
