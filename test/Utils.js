async function assertTxFail(promise, msg) {
  let txFailed = false;
  try {
    const result = await promise;
    txFailed = parseInt(result.receipt.status) === 0;
  } catch (err) {
    txFailed =
      err.message.startsWith(
        "VM Exception while processing transaction: revert"
      ) ||
      err.message.startsWith(
        "Returned error: VM Exception while processing transaction: revert"
      ) ||
      err.message.startsWith(
        "Error: Returned error: VM Exception while processing transaction: revert"
      ) ||
      err.message.startsWith(
        "Transaction has been reverted by the EVM" 
      ) ||
      err.message.startsWith(
        "Error: Returned error: execution error: revert" 
      );
    if (msg) {
      // assert error message if specified
      assert.isTrue(err.message.endsWith(msg));
    }
  }
  assert.isTrue(txFailed, msg);
}

async function assertGSNFail(promise, msg) {
  let txFailed = false;
  try {
    const result = await promise;
    txFailed = parseInt(result.receipt.status) === 0;
  } catch (err) {
    txFailed =
      err.message.startsWith(
        "Error: Recipient canRelay call was rejected with error"
      );
    if (msg) {
      // assert error message if specified
      assert.isTrue(err.message.endsWith(msg));
    }
  }
  assert.isTrue(txFailed, msg);
}

const progressTime = (time) => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send({ // eslint-disable-line no-undef
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [time],
      id: new Date().getTime()
    }, (err, result) => {
      if (err) { 
        return reject(err); 
      }
      return resolve(result);
    });
  });
};

module.exports = {
  assertTxFail,
  assertGSNFail,
  progressTime
};
