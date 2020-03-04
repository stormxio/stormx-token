const StormX = artifacts.require("StormXToken");
const OldToken = artifacts.require("StormToken");
const Swap = artifacts.require("Swap");
const Utils = require("./Utils.js");
const Constants = require("./Constants.js");


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

    // transfer the ownership to contract swap and initialize it
    await oldToken.transferOwnership(swap.address, {from: owner});
    await swap.initialize(oldToken.address, stormX.address, {from: owner});
    assert.equal(await oldToken.owner(), swap.address);

    // mint some old tokens for testing
    await oldToken.mintTokens(user, 100, {from: owner});
  });

  it("revert if non-owner calls initialize test", async function() {
    let testSwap = await Swap.new({from: owner});
    await Utils.assertTxFail(testSwap.initialize(oldToken.address, stormX.address, {from: user}));
  });

  it("revert if invalid parameters passed to initialize test", async function() {
    let testSwap = await Swap.new({from: owner});
    oldToken = await OldToken.new(owner, {from: owner});
    await oldToken.transferOwnership(testSwap.address, {from: owner});
    await Utils.assertTxFail(testSwap.initialize(Constants.ADDRESS_ZERO, stormX.address, {from: owner}));
    await Utils.assertTxFail(testSwap.initialize(oldToken.address, Constants.ADDRESS_ZERO, {from: owner}));
  });

  it("revert if initialize twice test", async function() {
    await Utils.assertTxFail(swap.initialize(oldToken.address, stormX.address, {from: owner}));
  });

  it("revert if ownership is not transferred before initialize test", async function() {
    let testSwap = await Swap.new({from: owner});
    await Utils.assertTxFail(testSwap.initialize(oldToken.address, stormX.address, {from: owner}));
  });

  it("initialize success test", async function() {
    let testSwap = await Swap.new({from: owner});
    oldToken = await OldToken.new(owner, {from: owner});
    await oldToken.transferOwnership(testSwap.address, {from: owner});
    await testSwap.initialize(oldToken.address, stormX.address, {from: owner});

    // assert fields are initialized properly
    // and swap contract holds the ownership of the old token
    assert.equal(await oldToken.owner(), testSwap.address);
    assert.equal(await testSwap.oldToken(), oldToken.address);
    assert.equal(await testSwap.newToken(), stormX.address);  
    assert.isTrue(await testSwap.migrationOpen());
  });

  it("revert if not enough balance in token swap test", async function() {
    await Utils.assertTxFail(swap.convert(1000, {from: user}));
  });

  it("token swap reverts when it is not available test", async function() {
    // after some time period
    await Utils.timeout(11000);
    
    // non-owner fails to close token migration
    await swap.disableMigration(reserve, {from: owner});
    await Utils.assertTxFail(swap.convert(1, {from: user}));
  });

  it("token swap success test", async function() {
    assert.equal(await stormX.balanceOf(user), 0);
    assert.equal(await oldToken.balanceOf(user), 100);
    await swap.convert(50, {from: user});
    assert.equal(await stormX.balanceOf(user), 50);
    assert.equal(await oldToken.balanceOf(user), 50);
  });

  it("owner and only owner can close token migration after specified time period test", async function() {
    assert.equal(await stormX.balanceOf(user), 0);
    assert.equal(await oldToken.balanceOf(user), 100);

    // after some time period
    await Utils.timeout(11000);
    
    // non-owner fails to close token migration
    await Utils.assertTxFail(swap.disableMigration(reserve, {from: user}));

    // assert token swap still available 
    await swap.convert(50, {from: user});
    assert.equal(await stormX.balanceOf(user), 50);
    assert.equal(await oldToken.balanceOf(user), 50);

    // owner can close token migration
    await swap.disableMigration(reserve, {from: owner});
    // assert token swap not available 
    await Utils.assertTxFail(swap.convert(10, {from: user}));

    // assert remaining tokens are sent to stormXReserve
    assert.equal(await stormX.balanceOf(reserve), 50);
    assert.equal(await stormX.totalSupply(), 100);

  });

  it("revert if invalid reserve address is provided in disableMigration test", async function() {
    await Utils.timeout(11000);
    await Utils.assertTxFail(swap.disableMigration(Constants.ADDRESS_ZERO, {from: user}));
  });

  it("revert if closing token migration when token swap is not open test", async function() {
    let testSwap = await Swap.new({from: owner});
    oldToken = await OldToken.new(owner, {from: owner});
    stormX = await StormX.new(testSwap.address, reserve, {from:owner});
    await oldToken.mintTokens(user, 100, {from: owner});
    await oldToken.transferOwnership(testSwap.address, {from: owner});
    assert.equal(await stormX.totalSupply(), 0);
    assert.equal(await oldToken.balanceOf(user), 100);
    
    // closing fails since token swap is not open yet
    await Utils.assertTxFail(testSwap.disableMigration(reserve, {from: owner}));
    // token swap is not available 
    await Utils.assertTxFail(testSwap.convert(50, {from: user}));

    // opne token swap by initializing swap
    await testSwap.initialize(oldToken.address, stormX.address, {from: owner});
    assert.isTrue(await testSwap.migrationOpen());
    
    // after some time period
    await Utils.timeout(11000);

    // owner can close token swap 
    await testSwap.disableMigration(reserve, {from: owner});
    assert.equal(await stormX.balanceOf(reserve), 100);
    // token swap is no longer available 
    await Utils.assertTxFail(testSwap.convert(1, {from: user}));

    // closing fails since token swap is already closed
    await Utils.assertTxFail(testSwap.disableMigration(reserve, {from: owner}));
  });
});
