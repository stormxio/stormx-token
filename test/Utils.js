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
      );
    if (msg) {
      // assert error message if specified
      assert.isTrue(err.message.endsWith(msg));
    }
  }
  assert.isTrue(txFailed, msg);
}

async function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  assertTxFail,
  timeout
};
