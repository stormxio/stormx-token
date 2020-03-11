const truffle = require('../truffle.js');
const path = require("path");
const web3 = require('web3');

async function canDeploy(network, contractName) {
  if (network === 'development') {
    return false;
  }

  if (truffle.deploy[contractName] === false) {
    console.log(`${contractName}: Skipping deployment: deploy.${contractName} is not set to the boolean true`);
    return false;
  }

  return true;

}

async function readAbi(network, contractName) {
  let contract = require(path.resolve(
    __dirname,
    `../build/contracts/${contractName}.json`
  ));
  return contract.abi;
}

async function callMethod({network, artifact, contractName, methodName, methodArgsFn, sendArgs}) {
  if (network === 'development'){
    console.log(`${contractName}: Skipping callMethod(...): network "${network}" is not eligible`);
    return;
  }
  
  const provider = truffle.networks[network].provider();

  let intervalHandle = null;
  return new Promise((resolve, reject) => {
    intervalHandle = setInterval(() => {
      new Promise(() => {
        if (provider.engine.currentBlock != null) {
          clearInterval(intervalHandle);
          resolve(null);
        }
      }).catch(reject);
    }, 1000);
  })
    .then(async () => {
      const web3Provider = new web3(provider);
      console.log('callMethod(...)');
      console.log('- network:', network);
      console.log('- contractName:', contractName);
      console.log('- methodName:', methodName);
      const methodArgs = await methodArgsFn();
      console.log('- methodArgs:', methodArgs);
      console.log('- sendArgs:', sendArgs);
      const contractAbi = await readAbi(network, contractName);
      const contractAddress = artifact.address;
      const contractInstance = new web3Provider.eth.Contract(contractAbi, contractAddress);

      return new Promise(resolve => {
        contractInstance.methods[methodName](...methodArgs)
          .send(sendArgs, function (err, hash) {
            if (err) {
              console.log(`${methodName}(...): transaction errored: "${err.message}"`);
              resolve(err);
            } else {
              console.log(`${methodName}(...): transaction sent, tx hash: "${hash}". You can track its status on Etherscan`);
            }
          }).on('receipt', function (receipt) {
            console.log(`${methodName}(...): transaction receipt. IMPORTANT: PERFORM ADDITIONAL CHECKS TO MAKE SURE THE TRANSACTION REMAINS ON THE MAIN CHAIN`, JSON.stringify(receipt));
            resolve(receipt);
          }).catch(function(err) {
            console.error(err);
          });
      });
    });
}

module.exports = {
  canDeploy,
  callMethod
};
