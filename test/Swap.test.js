const StormX = artifacts.require("StormXToken");
const OldToken = artifacts.require("StormToken");
const Swap = artifacts.require("Swap");
const Utils = require("./Utils.js");
const Constants = require("./Constants.js");


contract("StormX token swap test", async function(accounts) {
  const owner = accounts[0];
  const user = accounts[1];
  const reserve = accounts[2];
  const newOwner = accounts[3];

  // set migration time as 24 weeks as required
  const migrationTime = 24 * 7 * 24 * 3600;

  let stormX;
  let oldToken;
  let swap;

  beforeEach(async function(){
    oldToken = await OldToken.new(owner, {from: owner});
    stormX = await StormX.new(reserve, {from:owner});
    swap = await Swap.new(oldToken.address, stormX.address, reserve, {from:owner});
    await stormX.initialize(swap.address, {from: owner});
    
    // transfer the ownership to contract swap and initialize it
    await oldToken.transferOwnership(swap.address, {from: owner});
    await swap.initialize({from: owner});
    assert.equal(await oldToken.owner(), swap.address);

    // mint some old tokens for testing
    await oldToken.mintTokens(user, 100, {from: owner});
  });

  it("revert if invalid parameters provided in constructor test", async function() {
    await Utils.assertTxFail(Swap.new(Constants.ADDRESS_ZERO, stormX.address, reserve));
    await Utils.assertTxFail(Swap.new(oldToken.address, Constants.ADDRESS_ZERO, reserve));
    await Utils.assertTxFail(Swap.new(oldToken.address, stormX.address, Constants.ADDRESS_ZERO));
  });

  it("revert if initialize twice test", async function() {
    await Utils.assertTxFail(swap.initialize({from: owner}));
  });

  it("revert if ownership is not transferred before initialize test", async function() {
    let testSwap = await Swap.new(oldToken.address, stormX.address, reserve, {from: owner});
    await Utils.assertTxFail(testSwap.initialize({from: owner}));
  });

  it("initialize success test", async function() {
    oldToken = await OldToken.new(owner, {from: owner});
    let testSwap = await Swap.new(oldToken.address, stormX.address, reserve, {from: owner});
    await oldToken.transferOwnership(testSwap.address, {from: owner});
    await testSwap.initialize({from: owner});

    // assert fields are initialized properly
    // and swap contract holds the ownership of the old token
    assert.equal(await oldToken.owner(), testSwap.address);
    assert.equal(await testSwap.oldToken(), oldToken.address);
    assert.equal(await testSwap.newToken(), stormX.address);  
    assert.isTrue(await testSwap.migrationOpen());
  });
  
  it("revert if transferring ownership without holding the ownership test", async function() {
    let testSwap = await Swap.new(oldToken.address, stormX.address, reserve, {from: owner});

    // test swap is not the owner yet
    assert.notEqual(await oldToken.owner(), testSwap.address);
    await Utils.assertTxFail(testSwap.transferOldTokenOwnership(newOwner, {from: owner}));
  });

  it("revert if transferring ownership not called by owner test", async function() {
    oldToken = await OldToken.new(owner, {from: owner});
    let testSwap = await Swap.new(oldToken.address, stormX.address, reserve, {from: owner});
    await oldToken.transferOwnership(testSwap.address, {from: owner});
    await testSwap.initialize({from: owner});

    // test swap becomes the owner
    assert.equal(await oldToken.owner(), testSwap.address);
    await Utils.assertTxFail(testSwap.transferOldTokenOwnership(newOwner, {from: user}));
  });

  it("swap contract owner transfers ownership success test", async function() {
    oldToken = await OldToken.new(owner, {from: owner});
    let testSwap = await Swap.new(oldToken.address, stormX.address, reserve, {from: owner});
    await oldToken.transferOwnership(testSwap.address, {from: owner});
    await testSwap.initialize({from: owner});

    assert.equal(await oldToken.owner(), testSwap.address);
    await testSwap.transferOldTokenOwnership(newOwner, {from: owner});

    // test swap still holds the ownership
    assert.equal(await oldToken.owner(), testSwap.address);
    // the new owner has to accept the ownership
    await oldToken.acceptOwnership({from: newOwner});
    assert.equal(await oldToken.owner(), newOwner);
  });


  it("revert if not enough balance in token swap test", async function() {
    await Utils.assertTxFail(swap.convert(1000, {from: user}));
  });

  it("token swap reverts when it is not available test", async function() {
    // advance time by 24 weeks
    await Utils.progressTime(migrationTime);
    
    // non-owner fails to close token migration
    await swap.disableMigration(reserve, {from: owner});
    await Utils.assertTxFail(swap.convert(30, {from: user}));
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

    // closing fails if the specified time period has not passed yet
    await Utils.assertTxFail(swap.disableMigration(reserve, {from: owner}));

    // advance time by 24 weeks
    await Utils.progressTime(migrationTime);
    
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
    await Utils.progressTime(migrationTime);
    await Utils.assertTxFail(swap.disableMigration(Constants.ADDRESS_ZERO, {from: owner}));
  });

  it("revert if closing token migration when token swap is not open test", async function() {
    oldToken = await OldToken.new(owner, {from: owner});
    stormX = await StormX.new(reserve, {from:owner});
    let testSwap = await Swap.new(oldToken.address, stormX.address, reserve, {from: owner});
    await stormX.initialize(testSwap.address, {from: owner});

    await oldToken.mintTokens(user, 100, {from: owner});
    await oldToken.transferOwnership(testSwap.address, {from: owner});
    assert.equal(await stormX.totalSupply(), 0);
    assert.equal(await oldToken.balanceOf(user), 100);
    
    // closing fails since token swap is not open yet
    await Utils.assertTxFail(testSwap.disableMigration(reserve, {from: owner}));
    // token swap is not available 
    await Utils.assertTxFail(testSwap.convert(50, {from: user}));

    // open token swap by initializing swap
    await testSwap.initialize({from: owner});
    assert.isTrue(await testSwap.migrationOpen());
    
    // advance time by 24 weeks
    await Utils.progressTime(migrationTime);

    // owner can close token swap 
    await testSwap.disableMigration(reserve, {from: owner});
    assert.equal(await stormX.balanceOf(reserve), 100);
    // token swap is no longer available 
    await Utils.assertTxFail(testSwap.convert(1, {from: user}));

    // closing fails since token swap is already closed
    await Utils.assertTxFail(testSwap.disableMigration(reserve, {from: owner}));
  });
});
