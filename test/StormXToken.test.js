const StormX = artifacts.require("StormXToken");
const Utils = require("./Utils.js");
const Constants = require("./Constants.js");

contract("StormX token test", async function(accounts) {
  const owner = accounts[0];
  const reserve = accounts[1];
  const user = accounts[3];
  const receiver = accounts[4];

  let stormX;

  beforeEach(async function(){
    stormX = await StormX.new(reserve, {from: owner});

    // mint some stormX tokens for testing
    await stormX.mint(user, 100, {from: owner});
    assert.equal(await stormX.balanceOf(user), 100);
  });

  it("name test", async function() {
    assert.equal(await stormX.name(), "Storm Token");
  });

  it("symbol test", async function() {
    assert.equal(await stormX.symbol(), "STORM");
  });

  it("decimals test", async function() {
    assert.equal(await stormX.decimals(), 18);
  });

  it("standard test", async function() {
    assert.equal(await stormX.standard(), "Storm Token v2.0");
  });

  it("revert if invalid parameters provided in constructor test", async function() {
    await Utils.assertTxFail(StormX.new(Constants.ADDRESS_ZERO));
  });

  it("owner and only owner can set stormX reserve", async function() {
    let newReserve = accounts[5];
    assert.equal(await stormX.stormXReserve(), reserve);

    await stormX.setStormXReserve(newReserve, {from: owner});
    assert.equal(await stormX.stormXReserve(), newReserve);

    await Utils.assertTxFail(stormX.setStormXReserve(reserve, {from: user}));
    assert.equal(await stormX.stormXReserve(), newReserve);
  });

  it("revert when invalid address provided in set stormX reserve", async function() {
    await Utils.assertTxFail(stormX.setStormXReserve(Constants.ADDRESS_ZERO, {from: owner}));
  });

  it("read locked balance of user success test", async function() {
    // no locked tokens initially
    assert.equal(await stormX.lockedBalanceOf(user), 0);
    
    // lock certain amount of tokens
    await stormX.lock(30, {from: user});
 
    // assert locked token balance
    assert.equal(await stormX.lockedBalanceOf(user), 30);

    // assert total balance
    assert.equal(await stormX.balanceOf(user), 100);
  });

  it("read unlocked balance of user success test", async function() {
    // no locked tokens initially
    assert.equal(await stormX.lockedBalanceOf(user), 0);
    
    // lock certain amount of tokens
    await stormX.lock(30, {from: user});
 
    // assert unlocked token balance
    assert.equal(await stormX.unlockedBalanceOf(user), 70);

    // assert total balance
    assert.equal(await stormX.balanceOf(user), 100);
  });

  it("transfer reverts if not enough unlocked token test", async function() {
    // no locked tokens initially
    assert.equal(await stormX.lockedBalanceOf(user), 0);
    
    // lock certain amount of tokens
    await stormX.lock(90, {from: user});
 
    // assert unlocked token balance
    assert.equal(await stormX.unlockedBalanceOf(user), 10);

    await Utils.assertTxFail(stormX.transfer(receiver, 100, {from: user}));
    assert.equal(await stormX.balanceOf(user), 100);
  });

  it("transfer success test", async function() {
    // no locked tokens initially
    assert.equal(await stormX.lockedBalanceOf(user), 0);
    
    // lock certain amount of tokens
    await stormX.lock(90, {from: user});
 
    // assert unlocked token balance
    assert.equal(await stormX.unlockedBalanceOf(user), 10);

    await stormX.transfer(receiver, 5, {from: user});

    // assert proper total balance
    assert.equal(await stormX.balanceOf(user), 95);
    assert.equal(await stormX.balanceOf(receiver), 5);
 
    // assert proper unlocked balance
    assert.equal(await stormX.unlockedBalanceOf(receiver), 5);
    assert.equal(await stormX.unlockedBalanceOf(receiver), 5);
  });

  it("transferFrom reverts if not enough unlocked token test", async function() {
    // no locked tokens initially
    assert.equal(await stormX.lockedBalanceOf(user), 0);
    
    // lock certain amount of tokens
    await stormX.lock(90, {from: user});
 
    // assert unlocked token balance
    assert.equal(await stormX.unlockedBalanceOf(user), 10);

    await stormX.approve(user, 100, {from: user});
    await Utils.assertTxFail(stormX.transferFrom(user, receiver, 100, {from: user}));

    assert.equal(await stormX.balanceOf(user), 100);
  });

  it("transferFrom success test", async function() {
    // no locked tokens initially
    assert.equal(await stormX.lockedBalanceOf(user), 0);
    
    // lock certain amount of tokens
    await stormX.lock(90, {from: user});
 
    // assert unlocked token balance
    assert.equal(await stormX.unlockedBalanceOf(user), 10);
    await stormX.approve(user, 100, {from: user});
    await stormX.transferFrom(user, receiver, 5, {from: user});

    // assert that transferFrom only succeeds if sender is spender
    await Utils.assertTxFail(stormX.transferFrom(user, receiver, 5, {from: accounts[6]}));
    
    // assert proper total balance
    assert.equal(await stormX.balanceOf(user), 95);
    assert.equal(await stormX.balanceOf(receiver), 5);
 
    // assert proper unlocked balance
    assert.equal(await stormX.unlockedBalanceOf(receiver), 5);
    assert.equal(await stormX.unlockedBalanceOf(receiver), 5);
  });

  it("lock reverts if no enough unlocked token test", async function() {
    // no locked tokens initially
    assert.equal(await stormX.lockedBalanceOf(user), 0);
    assert.equal(await stormX.unlockedBalanceOf(user), 100);
    
    // locked amount exceeds unlocked balance of user
    await Utils.assertTxFail(stormX.lock(101, {from: user}));
 
    // assert proper balance
    assert.equal(await stormX.unlockedBalanceOf(user), 100);
    assert.equal(await stormX.lockedBalanceOf(user), 0);
    assert.equal(await stormX.balanceOf(user), 100);
  });

  it("lock success test", async function() {
    // no locked tokens initially
    assert.equal(await stormX.lockedBalanceOf(user), 0);
    assert.equal(await stormX.unlockedBalanceOf(user), 100);
    
    // lock certain amount of tokens for user
    await stormX.lock(100, {from: user});

    // token manipulation fails since all tokens are locked
    await Utils.assertTxFail(stormX.transfer(receiver, 10, {from: user}));
 
    // assert proper balance
    assert.equal(await stormX.unlockedBalanceOf(user), 0);
    assert.equal(await stormX.lockedBalanceOf(user), 100);
    assert.equal(await stormX.balanceOf(user), 100);
  });

  it("unlock reverts if no enough locked token test", async function() {
    // no locked tokens initially
    assert.equal(await stormX.lockedBalanceOf(user), 0);
    assert.equal(await stormX.unlockedBalanceOf(user), 100);
    
    // locked amount exceeds unlocked balance of user
    await Utils.assertTxFail(stormX.unlock(1, {from: user}));
 
    // assert proper balance
    assert.equal(await stormX.unlockedBalanceOf(user), 100);
    assert.equal(await stormX.lockedBalanceOf(user), 0);
    assert.equal(await stormX.balanceOf(user), 100);
  });

  it("unlock success test", async function() {
    // no locked tokens initially
    assert.equal(await stormX.lockedBalanceOf(user), 0);
    assert.equal(await stormX.unlockedBalanceOf(user), 100);
    
    // lock certain amount of tokens for user
    await stormX.lock(100, {from: user});
    // token manipulation fails since all tokens are locked
    await Utils.assertTxFail(stormX.transfer(receiver, 10, {from: user}));
    // unlock certain amount of tokens for token manipulation
    await stormX.unlock(20, {from: user});
    await stormX.transfer(receiver, 15, {from: user});
 
    // assert proper balance of user
    assert.equal(await stormX.unlockedBalanceOf(user), 5);
    assert.equal(await stormX.lockedBalanceOf(user), 80);
    assert.equal(await stormX.balanceOf(user), 85);

    // receiver receives the tokens
    assert.equal(await stormX.unlockedBalanceOf(receiver), 15);
    assert.equal(await stormX.lockedBalanceOf(receiver), 0);
    assert.equal(await stormX.balanceOf(receiver), 15);
  });

  it("revert if input lengths do not match in transfers test", async function() {
    let recipients = [receiver, receiver];
    let values = [1];
    await Utils.assertTxFail(stormX.transfers(recipients, values, {from: user}));
  });

  it("revert if transfers not available test", async function() {
    let recipients = [receiver, receiver];
    let values = [1, 1];
    await stormX.enableTransfers(false, {from: owner});
    await Utils.assertTxFail(stormX.transfers(recipients, values, {from: user}));
  });

  it("revert if any transfer fails test", async function() {
    let recipients = [receiver, receiver];
    let values = [1000, 1];
    await Utils.assertTxFail(stormX.transfers(recipients, values, {from: user}));
  });

  it("transfers success test", async function() {
    let recipients = [receiver, receiver, owner];
    let values = [1, 1, 1];

    await stormX.transfers(recipients, values, {from: user});
    assert.equal(await stormX.balanceOf(user), 97);
    assert.equal(await stormX.balanceOf(receiver), 2);
    assert.equal(await stormX.balanceOf(owner), 1);
  });

  it("owner and only owner can enable/disable transfers test", async function() {
    let recipients = [receiver, receiver];
    let values = [1, 1];

    // non-owner fails to disable transfers
    await Utils.assertTxFail(stormX.enableTransfers(false, {from: user}));
    await stormX.transfers(recipients, values, {from: user});
    assert.equal(await stormX.balanceOf(user), 98);
    assert.equal(await stormX.balanceOf(receiver), 2);

    // owner can disable transfers
    await stormX.enableTransfers(false, {from: owner});
    await Utils.assertTxFail(stormX.transfers(recipients, values, {from: user}));
    assert.equal(await stormX.balanceOf(user), 98);
    assert.equal(await stormX.balanceOf(receiver), 2);

    // non-owner fails to enable transfers
    await Utils.assertTxFail(stormX.enableTransfers(true, {from: user}));
    await Utils.assertTxFail(stormX.transfers(recipients, values, {from: user}));
    assert.equal(await stormX.balanceOf(user), 98);
    assert.equal(await stormX.balanceOf(receiver), 2);

    // owner can enable transfers
    await stormX.enableTransfers(true, {from: owner});
    await stormX.transfers(recipients, values, {from: user});
    assert.equal(await stormX.balanceOf(user), 96);
    assert.equal(await stormX.balanceOf(receiver), 4);
  });
});
