const StormX = artifacts.require("StormXToken");
const Utils = require("./Utils.js");
const Constants = require("./Constants.js");

contract("StormX token rewarding test", async function(accounts) {
  const owner = accounts[0];
  const reserve = accounts[1];
  const mockSwap = accounts[2];
  const user = accounts[3];
  const rewardRole = accounts[4];

  let stormX;

  beforeEach(async function(){
    stormX = await StormX.new(reserve, {from: owner});

    // initialize
    await stormX.initialize(mockSwap, {from: owner});
    // mint some stormX tokens only for testing
    await stormX.mint(user, 100, {from: mockSwap});

    assert.equal(await stormX.balanceOf(user), 100);
  });

  it("owner and only owner can assign reward role test", async function() {
    // user fails to assign reward role
    await Utils.assertTxFail(stormX.assignRewardRole(rewardRole, {from: user}));
    assert.equal(await stormX.rewardRole(), Constants.ADDRESS_ZERO);

    // owner can assign reward role
    await stormX.assignRewardRole(rewardRole, {from: owner});
    assert.equal(await stormX.rewardRole(), rewardRole);
  });

  it("owner and rewardRole can reward users success test", async function() {
    // mint some tokens for owner and rewardRole
    await stormX.mint(owner, 10, {from: mockSwap});
    await stormX.mint(rewardRole, 10, {from: mockSwap});

    assert.equal(await stormX.lockedBalanceOf(user), 0);
    assert.equal(await stormX.balanceOf(user), 100);

    // owner successfully rewards users, and rewarded tokens are locked for users
    await stormX.reward(user, 1, {from: owner});

    // assert proper balance
    assert.equal(await stormX.balanceOf(owner), 9);
    assert.equal(await stormX.lockedBalanceOf(user), 1);
    assert.equal(await stormX.balanceOf(user), 101);

    // rewardRole successfully rewards users, and rewarded tokens are locked for users
    await stormX.assignRewardRole(rewardRole, {from: owner});
    await stormX.reward(user, 1, {from: rewardRole});

    // assert proper balance
    assert.equal(await stormX.balanceOf(rewardRole), 9);
    assert.equal(await stormX.lockedBalanceOf(user), 2);
    assert.equal(await stormX.balanceOf(user), 102);
  }); 

  it("revert when invalid parameter provided in reward() test", async function() {
    // mint 100 tokens for owner
    await stormX.mint(owner, 100, {from: mockSwap});
    await Utils.assertTxFail(stormX.reward(Constants.ADDRESS_ZERO, 10, {from: owner}));
  });   

  it("revert when not enough tokens to reward users test", async function() {
    // mint 100 tokens for owner
    await stormX.mint(owner, 100, {from: mockSwap});
    await Utils.assertTxFail(stormX.reward(rewardRole, 1000, {from: owner}));
  }); 

  it("users cannot invoke reward() test", async function() {
    await Utils.assertTxFail(stormX.reward(rewardRole, 1, {from: user}));
  });

  it("revert when input lenghts do not match in rewards() test", async function() {
    let users = [user];
    let values = [10, 5];
    await Utils.assertTxFail(stormX.rewards(users, values, {from: owner}));
  });

  it("owner and rewardRole can reward users in batch success test", async function() {
    let user1 = accounts[5];
    let user2 = accounts[6];
    let users = [user1, user2];
    let values = [10, 5];
    // mint some tokens for owner and rewardRole
    await stormX.mint(owner, 100, {from: mockSwap});
    await stormX.mint(rewardRole, 100, {from: mockSwap});

    assert.equal(await stormX.lockedBalanceOf(user1), 0);
    assert.equal(await stormX.balanceOf(user1), 0);
    assert.equal(await stormX.lockedBalanceOf(user2), 0);
    assert.equal(await stormX.balanceOf(user2), 0);

    // owner successfully rewards users in batch, and rewarded tokens are locked for users
    await stormX.rewards(users, values, {from: owner});

    // assert proper balance
    assert.equal(await stormX.balanceOf(owner), 85);
    assert.equal(await stormX.lockedBalanceOf(user1), 10);
    assert.equal(await stormX.balanceOf(user1), 10);
    assert.equal(await stormX.lockedBalanceOf(user2), 5);
    assert.equal(await stormX.balanceOf(user2), 5);

    // rewardRole successfully rewards users in batch, and rewarded tokens are locked for users
    await stormX.assignRewardRole(rewardRole, {from: owner});
    await stormX.rewards(users, values, {from: rewardRole});

    // assert proper balance
    assert.equal(await stormX.balanceOf(rewardRole), 85);
    assert.equal(await stormX.lockedBalanceOf(user1), 20);
    assert.equal(await stormX.balanceOf(user1), 20);
    assert.equal(await stormX.lockedBalanceOf(user2), 10);
    assert.equal(await stormX.balanceOf(user2), 10);
  });

  it("rewarding in batch fails if not enough balance of caller test", async function() {
    let user1 = accounts[5];
    let user2 = accounts[6];
    let users = [user1, user2];
    let values = [10, 5000];
    // mint some tokens for owner
    await stormX.mint(owner, 100, {from: mockSwap});

    await Utils.assertTxFail(stormX.rewards(users, values, {from: owner}));
    // assert proper balance
    assert.equal(await stormX.balanceOf(owner), 100);
    assert.equal(await stormX.lockedBalanceOf(user1), 0);
    assert.equal(await stormX.balanceOf(user1), 0);
    assert.equal(await stormX.lockedBalanceOf(user2), 0);
    assert.equal(await stormX.balanceOf(user2), 0);
  });

  it("setAutoStaking success test", async function() {
    await stormX.mint(user, 100, {from: mockSwap});

    await stormX.setAutoStaking(true, {from: user});  
    assert.equal(await stormX.autoStakingDisabled(user), false);

    await stormX.setAutoStaking(false, {from: user});  
    assert.equal(await stormX.autoStakingDisabled(user), true);
  });

  it("rewarded tokens will not be staked if auto-staking feature is disabled test", async function() {
    // mint some tokens for owner and rewardRole
    await stormX.mint(owner, 10, {from: mockSwap});
    await stormX.mint(rewardRole, 10, {from: mockSwap});

    // user disables auto-staking feature
    await stormX.setAutoStaking(false, {from: user});
    assert.equal(await stormX.autoStakingDisabled(user), true);

    assert.equal(await stormX.lockedBalanceOf(user), 0);
    assert.equal(await stormX.balanceOf(user), 100);

    // owner successfully reward users, and rewarded tokens are not locked for users
    await stormX.reward(user, 1, {from: owner});

    // assert proper balance
    assert.equal(await stormX.balanceOf(owner), 9);
    assert.equal(await stormX.lockedBalanceOf(user), 0);
    assert.equal(await stormX.balanceOf(user), 101);

    // user enables auto-staking feature
    await stormX.setAutoStaking(true, {from: user});
    assert.equal(await stormX.autoStakingDisabled(user), false);

    // rewardRole successfully rewards users, and rewarded tokens are locked for users
    await stormX.assignRewardRole(rewardRole, {from: owner});
    await stormX.reward(user, 1, {from: rewardRole});

    // assert proper balance
    assert.equal(await stormX.balanceOf(rewardRole), 9);
    assert.equal(await stormX.lockedBalanceOf(user), 1);
    assert.equal(await stormX.balanceOf(user), 102);
  });
});
