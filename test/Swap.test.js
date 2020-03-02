const StormX = artifacts.require("StormXToken");
const OldToken = artifacts.require("StormToken");
const Swap = artifacts.require("Swap");
const Utils = require("./Utils.js");


contract("StormX token swap test", async function(accounts) {
  const owner = accounts[0];
  const user = accounts[1];
  const reserve = accounts[2];

  let stormX;
  let oldToken;
  let swap;

  beforeEach(async function(){
    oldToken = await OldToken.new(owner, {from: owner});
    swap = await Swap.new({from:owner});
    stormX = await StormX.new(swap.address, reserve, {from:owner});
    await swap.initialize(oldToken.address, stormX.address, {from: owner});

    // transfer the ownership to contract swap
    await oldToken.transferOwnership(swap.address, {from: owner});
    await swap.acceptOwnership();

    // mint some tokens for testing
    await oldToken.mintTokens(user, 100, {from: owner});
  });

  it("revert if initialize twice test", async function() {
    await Utils.assertTxFail(swap.initialize(oldToken.address, stormX.address, {from: owner}));
  });

  it("revert if non-owner calls initialize test", async function() {
    let testSwap = await Swap.new({from: owner});
    await Utils.assertTxFail(testSwap.initialize(oldToken.address, stormX.address, {from: user}));
  });

  it("revert if no enough balance in token swap test", async function() {
    await Utils.assertTxFail(swap.convert(1000, {from: user}));
  });

  it("token swap success test", async function() {
    assert.equal(await stormX.balanceOf(user), 0);
    assert.equal(await oldToken.balanceOf(user), 100);
    await swap.convert(50, {from: user});
    assert.equal(await stormX.balanceOf(user), 50);
    assert.equal(await oldToken.balanceOf(user), 50);
  });
});
