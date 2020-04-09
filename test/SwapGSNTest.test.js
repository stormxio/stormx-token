
const {
  deployRelayHub,
  runRelayer,
  fundRecipient,
} = require('@openzeppelin/gsn-helpers');
const {GSNDevProvider} = require("@openzeppelin/gsn-provider");
const Web3 = require("web3");
const Constants = require("./Constants.js");
const Utils = require("./Utils.js");
const swapContract = Constants.SWAP_CONTRACT;
const OldToken = artifacts.require("StormToken");
const NewToken = artifacts.require("StormXToken");


contract("Token swap GSN test", async function(accounts) {
  const provider = Constants.PROVIDER;
  // 24 weeks of forced token migration open time
  const migrationTime = 24 * 7 * 24 *3600;
  let owner = accounts[0];
  let user = accounts[2];
  let reserve = accounts[4];

  let Recipient;
  let gsnDevProvider;
  let oldToken;
  let newToken;
  
  // Set up the testing environment using javascript
  beforeEach(async function () { 
    this.web3 = new Web3(provider);
    this.accounts = await this.web3.eth.getAccounts();
    user = this.accounts[5];
    reserve = this.accounts[4];

    await deployRelayHub(this.web3);
    await runRelayer(this.web3, { quiet: true});

    gsnDevProvider = new GSNDevProvider(provider, {
      ownerAddress: this.accounts[0],
      relayerAddress: this.accounts[1]
    });

    // deploy stormx contract as recipient
    Recipient = new this.web3.eth.Contract(swapContract.abi, null, { data: swapContract.bytecode });
    
    oldToken = await OldToken.new(owner, {from: owner});
    newToken = await NewToken.new(reserve, {from: owner});

    // mint some old tokens for token swap
    await oldToken.mintTokens(user, 100, {from: owner});
    await oldToken.mintTokens(owner, 60, {from: owner});

    this.recipient = await Recipient.deploy({arguments: [oldToken.address, newToken.address, reserve]}).send({ from: owner, gas: 0xfffffffff });
    
    await this.recipient.methods.setChargeFee(10).send({from: owner, useGSN: false});
    // Fund and register the recipient in the hub
    await fundRecipient(this.web3, { recipient: this.recipient.options.address});

    // Set provider for the recipient
    this.recipient.setProvider(gsnDevProvider);

    await newToken.initialize(this.recipient.options.address, {from: owner});

    // initialize swap and open token migration
    await oldToken.transferOwnership(this.recipient.options.address, {from: owner});
    await this.recipient.methods.initialize().send({from: owner, useGSN: false});

    assert.equal(await newToken.balanceOf(owner), 0);
    assert.equal(await newToken.balanceOf(user), 0);
    assert.equal(await oldToken.balanceOf(user), 100);

    await this.recipient.methods.convert(60).send({from: owner});

    // owner is charged for a fee after ``convert()`` is executed
    assert.equal(await newToken.balanceOf(reserve), 10);
  });

  it("revert if initialize is called twice", async function() {
    await Utils.assertTxFail(this.recipient.methods.initialize().send({from: owner}));
    // caller was not charged
    assert.equal(await newToken.balanceOf(owner), 50);
  });

  it("revert if transferring old token ownership without holding the ownership test", async function() {
    // transfer old token ownership out
    await this.recipient.methods.transferOldTokenOwnership(user).send({from: owner});
    assert.equal(await newToken.balanceOf(owner), 40);
    assert.equal(await newToken.balanceOf(reserve), 20);

    await oldToken.acceptOwnership({from: user});
    assert.equal(await oldToken.owner(), user); // user now holds the ownership

    // fails to transfer old token ownership
    await Utils.assertTxFail(this.recipient.methods.transferOldTokenOwnership(owner).send({from: owner}));
  });

  it("transfer old token ownership fails if not enough token balance test", async function() {
    await Utils.assertTxFail(this.recipient.methods.transferOldTokenOwnership(user).send({from: user}));
    assert.equal(await newToken.balanceOf(user), 0);
    assert.equal(await newToken.balanceOf(reserve), 10);
  });

  it("owner and only owner can transfer old token ownership test", async function() {
    await Utils.assertTxFail(this.recipient.methods.transferOldTokenOwnership(owner).send({from: user}));

    await this.recipient.methods.transferOldTokenOwnership(user).send({from: owner});
    assert.equal(await newToken.balanceOf(owner), 40);
    assert.equal(await newToken.balanceOf(reserve), 20);

    await oldToken.acceptOwnership({from: user});
    assert.equal(await oldToken.owner(), user); // user now holds the ownership
  });

  it("convert via GSN call fails if not enough old token balance of user test", async function() {
    await Utils.assertTxFail(this.recipient.methods.convert(10000).send({from: user}));
    
    // the user is not charged
    assert.equal(await oldToken.balanceOf(user), 100);
    assert.equal(await newToken.balanceOf(user), 0);
    assert.equal(await newToken.balanceOf(reserve), 10);
  });

  it("convert via GSN call fails if not enough unlocked new token balance of user even after conversion test", async function() {
    // parameter ``amount < chargeFee``, GSN call is rejected
    await Utils.assertGSNFail(this.recipient.methods.convert(5).send({from: user}));
    assert.equal(await oldToken.balanceOf(user), 100);
    assert.equal(await newToken.balanceOf(user), 0);
    assert.equal(await newToken.balanceOf(reserve), 10);
  });

  it("convert via GSN call succeeds with charging if have enough unlocked new token balance after conversion test", async function() {
    assert.equal(await oldToken.balanceOf(user), 100);

    // parameter ``amount >= chargeFee``, GSN call is accepted
    await this.recipient.methods.convert(85).send({from: user});
    // user is charged
    assert.equal(await newToken.balanceOf(reserve), 20);

    // lock all new tokens user has
    await newToken.lock(70, {from: user});
    assert.equal(await oldToken.balanceOf(user), 15);
    assert.equal(await newToken.balanceOf(reserve), 20);
    assert.equal(await newToken.balanceOf(user), 75);
    assert.equal(await newToken.unlockedBalanceOf(user), 5);

    // ``convert()`` is executed and user is charged for a fee
    await this.recipient.methods.convert(5).send({from: user});

    // assert proper balance
    assert.equal(await oldToken.balanceOf(user), 10);
    assert.equal(await newToken.balanceOf(user), 70);
    assert.equal(await newToken.balanceOf(reserve), 30);

    // user was charged for a conversion fee, no new tokens left
    assert.equal(await newToken.unlockedBalanceOf(user), 0);

    await Utils.assertGSNFail(this.recipient.methods.convert(5).send({from: user}));
    await this.recipient.methods.convert(10).send({from: user});
    assert.equal(await oldToken.balanceOf(user), 0);
    assert.equal(await newToken.balanceOf(user), 70);
    // user was charged for a conversion fee, no new tokens left
    assert.equal(await newToken.unlockedBalanceOf(user), 0);
    assert.equal(await newToken.balanceOf(reserve), 40);

  });

  it("convert via GSN call success test", async function() {
    assert.equal(await oldToken.balanceOf(user), 100);

    await this.recipient.methods.convert(50).send({from: user});
    assert.equal(await newToken.balanceOf(reserve), 20); 

    // user has enough unlocked token balance
    await this.recipient.methods.convert(20).send({from: user});
    // user is charged
    assert.equal(await newToken.balanceOf(reserve), 30); 

    // assert proper balance
    assert.equal(await oldToken.balanceOf(user), 30);
    assert.equal(await newToken.balanceOf(user), 50);  
  });

  it("revert if disabling token swap too early via GSN call test", async function() {
    await Utils.assertTxFail(this.recipient.methods.disableMigration(reserve).send({from: owner}));
    assert.equal(await newToken.balanceOf(reserve), 10);
    assert.equal(await newToken.balanceOf(owner), 50);
  });

  it("revert if invalid parameters provided in disabling token swap via GSN call test", async function() {
    // advance time by 24 weeks
    await Utils.progressTime(migrationTime);

    await Utils.assertTxFail(this.recipient.methods.disableMigration(Constants.ADDRESS_ZERO).send({from: owner}));
    assert.equal(await newToken.balanceOf(reserve), 10);
    assert.equal(await newToken.balanceOf(owner), 50);
  });

  it("owner and only owner can disable token swap via GSN call success test", async function() {
    let newReserve = accounts[7];
    // advance time by 24 weeks
    await Utils.progressTime(migrationTime);

    // user fails to disable token swap
    await Utils.assertTxFail(this.recipient.methods.disableMigration(reserve).send({from: user}));
    assert.isTrue(await this.recipient.methods.migrationOpen().call());

    // owner can disable token swap
    await this.recipient.methods.disableMigration(newReserve).send({from: owner});
    assert.isFalse(await this.recipient.methods.migrationOpen().call());
    // remaining tokens are sent to reserve
    assert.equal(await newToken.balanceOf(newReserve), 100);

    // owner was charged for the GSN call
    assert.equal(await newToken.balanceOf(owner), 40);
    assert.equal(await newToken.balanceOf(reserve), 20);
  });

  it("owner and only owner can set GSN charge test", async function() {
    await this.recipient.methods.convert(100).send({from: user, useGSN: false});
    // owner invokes a GSN call to set charge fee successfully
    await this.recipient.methods.setChargeFee(5).send({from: owner});
    // 10 tokens were charged
    assert.equal(await newToken.balanceOf(owner), 40);
    // reserve receives the charged fee
    assert.equal(await newToken.balanceOf(reserve), 20);

    // owner successfully sets GSN charge fee with GSN call
    assert.equal(await this.recipient.methods.chargeFee().call(), 5);

    // non-owner fails to set GSN charge fee
    await Utils.assertTxFail(this.recipient.methods.setChargeFee(10).send({from: user}));
    await Utils.assertTxFail(this.recipient.methods.setChargeFee(10).send({from: user, useGSN: false}));
    assert.equal(await newToken.balanceOf(user), 100);
    assert.equal(await this.recipient.methods.chargeFee().call(), 5);

    // owner can set charge fee directly
    await this.recipient.methods.setChargeFee(50).send({from: owner, useGSN: false});
    assert.equal(await this.recipient.methods.chargeFee().call(), 50);
    // not charged since no GSN call invoked
    assert.equal(await newToken.balanceOf(owner), 40);
    assert.equal(await newToken.balanceOf(reserve), 20);
  });

  it("reverts if invalid parameter provided in set stormx reserve address test", async function() {
    await Utils.assertTxFail(this.recipient.methods.setStormXReserve(Constants.ADDRESS_ZERO).send({from: owner, useGSN: false}));
    await Utils.assertTxFail(this.recipient.methods.setStormXReserve(Constants.ADDRESS_ZERO).send({from: owner}));
  });

  it("owner and only owner can set stormx reserve address test", async function() {
    let newReserve = accounts[7];

    await this.recipient.methods.convert(100).send({from: user, useGSN: false});

    // owner invokes a GSN call
    await this.recipient.methods.setChargeFee(15).send({from: owner});

    // 10 tokens were charged
    assert.equal(await newToken.balanceOf(owner), 40);
    // reserve receives the charged fee
    assert.equal(await newToken.balanceOf(reserve), 20);

    // owner sets stormx reserve address to newReserve via GSN call
    await this.recipient.methods.setStormXReserve(newReserve).send({from: owner});
    assert.equal(await this.recipient.methods.stormXReserve().call(), newReserve);
    // 15 tokens were charged
    assert.equal(await newToken.balanceOf(reserve), 35);
    assert.equal(await newToken.balanceOf(owner), 25);

    // owner invokes another GSN call
    await this.recipient.methods.setChargeFee(10).send({from: owner});
    assert.equal(await this.recipient.methods.chargeFee().call(), 10);
    // newReserve receives the charged fee
    assert.equal(await newToken.balanceOf(newReserve), 15);
    assert.equal(await newToken.balanceOf(reserve), 35);
    // 15 were charged
    assert.equal(await newToken.balanceOf(owner), 10);

    // owner can set stormx reserve address to newReserve directly
    await this.recipient.methods.setStormXReserve(reserve).send({from: owner, useGSN: false});
    assert.equal(await this.recipient.methods.stormXReserve().call(), reserve);
    // not charged since no GSN call invoked
    assert.equal(await newToken.balanceOf(owner), 10);

    // non-owner fails to set stormx reserve address
    await Utils.assertTxFail(this.recipient.methods.setStormXReserve(newReserve).send({from: user}));
    await Utils.assertTxFail(this.recipient.methods.setStormXReserve(newReserve).send({from: user, useGSN: false}));
    assert.equal(await newToken.balanceOf(user), 100);
    assert.equal(await this.recipient.methods.stormXReserve().call(), reserve);
  });
});
