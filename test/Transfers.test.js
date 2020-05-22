const STMX = artifacts.require("StormXToken");
const Transfers = artifacts.require("Transfers");
const Utils = require("./Utils.js");

contract("Transfers test", async function(accounts) {
  const owner = accounts[0];
  const reserve = accounts[1];
  const mockSwap = accounts[2];
  const user = accounts[3];
  const receiver = accounts[4];
  
  let stormX;
  let transfersContract;

  beforeEach(async function(){
    stormX = await STMX.new(reserve, {from: owner});
    transfersContract = await Transfers.new(stormX.address, {from: owner});

    // initialize
    await stormX.initialize(mockSwap, {from: owner});
    // mint some stormX tokens only for testing
    await stormX.mint(owner, 10000, {from: mockSwap});

    assert.equal(await stormX.balanceOf(owner), 10000);
  });

  it("transfersContract success test", async function() {
    await stormX.approve(transfersContract.address, 3, {from: owner});

    let recipients = [receiver, receiver, user];
    let values = [1, 1, 1];

    await transfersContract.transfers(recipients, values, {from: owner});
    assert.equal(await stormX.balanceOf(owner), 10000-3);
    assert.equal(await stormX.balanceOf(receiver), 2);
    assert.equal(await stormX.balanceOf(user), 1);
  });

  it("revert if any transfer fails test", async function() {
    let recipients = [receiver, receiver];
    let values = [1000, 1];
    await Utils.assertTxFail(transfersContract.transfers(recipients, values, {from: owner}));
  });
});

