const {
  deployRelayHub,
  runRelayer,
  fundRecipient,
} = require('@openzeppelin/gsn-helpers');
const {GSNDevProvider} = require("@openzeppelin/gsn-provider");
const Web3 = require("web3");
const Constants = require("./Constants.js");
const Utils = require("./Utils.js");
const stormXContract = Constants.STORMX_CONTRACT;


contract("StormX token GSN rewarding feature test", async function(accounts) {
  const provider = Constants.PROVIDER;
  const owner = accounts[0];
  const rewardRole = accounts[1];
  const user = accounts[2];
  const mockSwap = accounts[3];
  const reserve = accounts[4];

  let Recipient;
  let gsnDevProvider;
  
  // Set up the testing environment using javascript
  beforeEach(async function () { 
    this.web3 = new Web3(provider); 
    this.accounts = await this.web3.eth.getAccounts();

    await deployRelayHub(this.web3);
    await runRelayer(this.web3, { quiet: true});

    gsnDevProvider = new GSNDevProvider(provider, {
      ownerAddress: this.accounts[0],
      relayerAddress: this.accounts[1]
    });

    // deploy stormx contract as recipient
    Recipient = new this.web3.eth.Contract(stormXContract.abi, null, { data: stormXContract.bytecode });
    this.recipient = await Recipient.deploy({arguments: [reserve]}).send({ from: owner, gas: 0xfffffffff });

    // Fund and register the recipient in the hub
    await fundRecipient(this.web3, { recipient: this.recipient.options.address});

    // Set provider for the recipient
    this.recipient.setProvider(gsnDevProvider);

    await this.recipient.methods.setChargeFee(10).send({from: owner, useGSN: false});
    // initialize and mint some new tokens for testing
    await this.recipient.methods.initialize(mockSwap).send({from: owner, useGSN: false});
    await this.recipient.methods.mint(user, 100).send({from: mockSwap, useGSN: false});
    assert.equal(await this.recipient.methods.balanceOf(user).call(), 100);
  });

  it("owner and only owner can assign reward role via GSN test", async function() {
    // mint some tokens for testing
    await this.recipient.methods.mint(owner, 100).send({from: mockSwap, useGSN: false});
    await this.recipient.methods.mint(user, 100).send({from: mockSwap, useGSN: false});

    // user fails to assign reward role
    await Utils.assertTxFail(this.recipient.methods.assignRewardRole(rewardRole).send({from: user}));
    assert.equal(await this.recipient.methods.rewardRole().call(), Constants.ADDRESS_ZERO);
    
    // owner can assign reward role
    await this.recipient.methods.assignRewardRole(rewardRole).send({from: owner});
    assert.equal(await this.recipient.methods.rewardRole().call(), rewardRole);
  });

  it("owner and rewardRole can reward users via GSN success test", async function() {
    // mint some tokens for owner and rewardRole
    await this.recipient.methods.mint(owner, 20).send({from: mockSwap, useGSN: false});
    await this.recipient.methods.mint(rewardRole, 20).send({from: mockSwap, useGSN: false});

    assert.equal(await this.recipient.methods.lockedBalanceOf(user).call(), 0);
    assert.equal(await this.recipient.methods.balanceOf(user).call(), 100);

    // owner successfully rewards users, and rewarded tokens are locked for users
    await this.recipient.methods.reward(user, 1).send({from: owner});

    // assert proper balance
    assert.equal(await this.recipient.methods.balanceOf(reserve).call(), 10); // owner was charged
    assert.equal(await this.recipient.methods.balanceOf(owner).call(), 9);
    assert.equal(await this.recipient.methods.lockedBalanceOf(user).call(), 1);
    assert.equal(await this.recipient.methods.balanceOf(user).call(), 101);

    // rewardRole successfully rewards users, and rewarded tokens are locked for users
    await this.recipient.methods.assignRewardRole(rewardRole).send({from: owner, useGSN: false});
    await this.recipient.methods.reward(user, 1).send({from: rewardRole});

    // assert proper balance
    assert.equal(await this.recipient.methods.balanceOf(reserve).call(), 20); // rewardRole was charged
    assert.equal(await this.recipient.methods.balanceOf(rewardRole).call(), 9);
    assert.equal(await this.recipient.methods.lockedBalanceOf(user).call(), 2);
    assert.equal(await this.recipient.methods.balanceOf(user).call(), 102);
  });

  it("users cannot invoke reward() test", async function() {
    await Utils.assertTxFail(this.recipient.methods.reward(rewardRole, 1).send({from: user}));  
  });

  it("revert when invalid parameter provided in reward() test", async function() {
    // mint 100 tokens for owner
    await this.recipient.methods.mint(owner, 100).send({from: mockSwap, useGSN: false});
    await Utils.assertTxFail(this.recipient.methods.reward(Constants.ADDRESS_ZERO, 10).send({from: owner}));
  }); 

  it("revert when not enough tokens to reward users test", async function() {
    // mint 100 tokens for owner
    await this.recipient.methods.mint(owner, 100).send({from: mockSwap, useGSN: false});
    await Utils.assertTxFail(this.recipient.methods.reward(rewardRole, 1000).send({from: owner}));
  });

  it("revert when input lenghts do not match in rewards() via GSN test", async function() {
    let users = [user];
    let values = [10, 5];
    await this.recipient.methods.mint(owner, 100).send({from: mockSwap, useGSN: false});
    await Utils.assertTxFail(this.recipient.methods.rewards(users, values).send({from: owner}));  
  });

  it("owner and rewardRole can reward users in batch via GSN success test", async function() {
    let user1 = accounts[5];
    let user2 = accounts[6];
    let users = [user1, user2];
    let values = [10, 5];
    // mint some tokens for owner and rewardRole
    await this.recipient.methods.mint(owner, 100).send({from: mockSwap, useGSN: false});
    await this.recipient.methods.mint(rewardRole, 100).send({from: mockSwap, useGSN: false});

    assert.equal(await this.recipient.methods.lockedBalanceOf(user1).call(), 0);
    assert.equal(await this.recipient.methods.balanceOf(user1).call(), 0);
    assert.equal(await this.recipient.methods.lockedBalanceOf(user2).call(), 0);
    assert.equal(await this.recipient.methods.balanceOf(user2).call(), 0);

    // owner successfully rewards users in batch, and rewarded tokens are locked for users
    await this.recipient.methods.rewards(users, values).send({from: owner});

    // assert proper balance
    assert.equal(await this.recipient.methods.balanceOf(owner).call(), 75);
    assert.equal(await this.recipient.methods.balanceOf(reserve).call(), 10); // owner was charged
    assert.equal(await this.recipient.methods.lockedBalanceOf(user1).call(), 10);
    assert.equal(await this.recipient.methods.balanceOf(user1).call(), 10);
    assert.equal(await this.recipient.methods.lockedBalanceOf(user2).call(), 5);
    assert.equal(await this.recipient.methods.balanceOf(user2).call(), 5);

    // rewardRole successfully rewards users in batch, and rewarded tokens are locked for users
    await this.recipient.methods.assignRewardRole(rewardRole).send({from: owner, useGSN: false});
    await this.recipient.methods.rewards(users, values).send({from: rewardRole});

    // assert proper balance
    assert.equal(await this.recipient.methods.balanceOf(rewardRole).call(), 75);
    assert.equal(await this.recipient.methods.balanceOf(reserve).call(), 20); // rewardRole was charged
    assert.equal(await this.recipient.methods.lockedBalanceOf(user1).call(), 20);
    assert.equal(await this.recipient.methods.balanceOf(user1).call(), 20);
    assert.equal(await this.recipient.methods.lockedBalanceOf(user2).call(), 10);
    assert.equal(await this.recipient.methods.balanceOf(user2).call(), 10);
  });

  it("rewarding in batch via GSN fails if not enough balance of caller test", async function() {
    let user1 = accounts[5];
    let user2 = accounts[6];
    let users = [user1, user2];
    let values = [10, 5000];
    // mint some tokens for owner
    await this.recipient.methods.mint(owner, 100).send({from: mockSwap, useGSN: false});

    await Utils.assertTxFail(this.recipient.methods.rewards(users, values).send({from: owner}));
    // assert proper balance
    assert.equal(await this.recipient.methods.balanceOf(owner).call(), 100);
    assert.equal(await this.recipient.methods.lockedBalanceOf(user1).call(), 0);
    assert.equal(await this.recipient.methods.balanceOf(user1).call(), 0);
    assert.equal(await this.recipient.methods.lockedBalanceOf(user2).call(), 0);
    assert.equal(await this.recipient.methods.balanceOf(user2).call(), 0);
  });

  it("setAutoStaking via GSN success test", async function() {
    await this.recipient.methods.mint(user, 100).send({from: mockSwap, useGSN: false});

    await this.recipient.methods.setAutoStaking(true).send({from: user});  
    assert.equal(await this.recipient.methods.autoStakingDisabled(user).call(), false);

    await this.recipient.methods.setAutoStaking(false).send({from: user});  
    assert.equal(await this.recipient.methods.autoStakingDisabled(user).call(), true);
  });

  it("rewarded tokens will not be staked if auto-staking feature is disabled test", async function() {
    // mint some tokens for owner and rewardRole
    await this.recipient.methods.mint(owner, 20).send({from: mockSwap, useGSN: false});
    await this.recipient.methods.mint(rewardRole, 20).send({from: mockSwap, useGSN: false});

    // user disables auto-staking feature
    await this.recipient.methods.setAutoStaking(false).send({from: user, useGSN: false});  
    assert.equal(await this.recipient.methods.autoStakingDisabled(user).call(), true);
    assert.equal(await this.recipient.methods.balanceOf(user).call(), 100);
    assert.equal(await this.recipient.methods.lockedBalanceOf(user).call(), 0);

    // owner successfully rewards users, and rewarded tokens are not locked for users
    await this.recipient.methods.reward(user, 1).send({from: owner});

    // assert proper balance
    assert.equal(await this.recipient.methods.balanceOf(reserve).call(), 10); // owner was charged
    assert.equal(await this.recipient.methods.balanceOf(owner).call(), 9);
    assert.equal(await this.recipient.methods.lockedBalanceOf(user).call(), 0);
    assert.equal(await this.recipient.methods.balanceOf(user).call(), 101);

    // user enables auto-staking feature
    await this.recipient.methods.setAutoStaking(true).send({from: user, useGSN: false});
    assert.equal(await this.recipient.methods.autoStakingDisabled(user).call(), false);

    // rewardRole successfully rewards users, and rewarded tokens are locked for users
    await this.recipient.methods.assignRewardRole(rewardRole).send({from: owner, useGSN: false});
    await this.recipient.methods.reward(user, 1).send({from: rewardRole});

    // assert proper balance
    assert.equal(await this.recipient.methods.balanceOf(reserve).call(), 20); // rewardRole was charged
    assert.equal(await this.recipient.methods.balanceOf(rewardRole).call(), 9);
    assert.equal(await this.recipient.methods.lockedBalanceOf(user).call(), 1);
    assert.equal(await this.recipient.methods.balanceOf(user).call(), 102);
  });
});     
