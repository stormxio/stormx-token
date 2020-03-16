
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
    // owner = this.accounts[0];
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
    await oldToken.mintTokens(owner, 100, {from: owner});



    this.recipient = await Recipient.deploy({arguments: [oldToken.address, newToken.address, reserve]}).send({ from: owner, gas: 0xfffffffffff });
    
    // Fund and register the recipient in the hub
    await fundRecipient(this.web3, { recipient: this.recipient.options.address});

    // Set provider for the recipient
    this.recipient.setProvider(gsnDevProvider);

    await newToken.addGSNRecipient(this.recipient.options.address, {from: owner});

    // initialize swap and open token migration
    await oldToken.transferOwnership(this.recipient.options.address, {from: owner});
    await this.recipient.methods.initialize().send({from: owner, useGSN: false});
    await newToken.initialize(this.recipient.options.address, {from: owner});
    // await newToken.mint(owner, 50, {from: owner});
    // await this.recipient.methods.convert(50).send({from: owner, useGSN: false});

    // assert.equal(await newToken.balanceOf(owner), 50);
    assert.equal(await newToken.balanceOf(user), 0);
    assert.equal(await oldToken.balanceOf(user), 100);

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
    assert.equal(await newToken.balanceOf(reserve), 10);

    await oldToken.acceptOwnership({from: user});
    assert.equal(await oldToken.owner(), user); // user now holds the ownership

    // fails to transfer old token ownership
    await Utils.assertTxFail(this.recipient.methods.transferOldTokenOwnership(owner).send({from: owner}));
  });

  it("transfer old token ownership fails if not enough token balance test", async function() {
    await Utils.assertTxFail(this.recipient.methods.transferOldTokenOwnership(user).send({from: user}));
    assert.equal(await newToken.balanceOf(user), 0);
    assert.equal(await newToken.balanceOf(reserve), 0);
  });

  it("owner and only owner can transfer old token ownership test", async function() {
    await Utils.assertTxFail(this.recipient.methods.transferOldTokenOwnership(owner).send({from: user}));

    await this.recipient.methods.transferOldTokenOwnership(user).send({from: owner});
    assert.equal(await newToken.balanceOf(owner), 40);
    assert.equal(await newToken.balanceOf(reserve), 10);

    await oldToken.acceptOwnership({from: user});
    assert.equal(await oldToken.owner(), user); // user now holds the ownership
  });

  it("convert via GSN call fails if not enough old token balance of user test", async function() {
    let poorUser = accounts[7];
    await oldToken.mintTokens(poorUser, 1, {from: owner});
    assert.equal(await oldToken.balanceOf(poorUser), 1);

    await Utils.assertGSNFail(this.recipient.methods.convert(1).send({from: poorUser}));
    
    assert.equal(await oldToken.balanceOf(poorUser), 1);
    assert.equal(await newToken.balanceOf(poorUser), 0);
    assert.equal(await newToken.balanceOf(reserve), 0);
  });

  it("convert via GSN call fails if not enough unlocked new token balance test", async function() {
    assert.equal(await oldToken.balanceOf(user), 100);

    await newToken.mint(user, 100, {from: owner});
    // lock all new tokens user has
    await newToken.lock(100, {from: user});
    assert.equal(await newToken.balanceOf(user), 100);
    assert.equal(await newToken.unlockedBalanceOf(user), 0);

    await Utils.assertGSNFail(this.recipient.methods.convert(50).send({from: user}));

    // assert proper balance
    assert.equal(await oldToken.balanceOf(user), 100);
    assert.equal(await newToken.balanceOf(user), 100);
    assert.equal(await newToken.balanceOf(reserve), 0);
  });

  it("convert via GSN call fails if not enough old token balance test", async function() {
    assert.equal(await oldToken.balanceOf(user), 100);
    await newToken.mint(user, 100, {from: owner});
    assert.equal(await newToken.balanceOf(user), 100);
    assert.equal(await newToken.unlockedBalanceOf(user), 100);

    await Utils.assertTxFail(this.recipient.methods.convert(150).send({from: user}));

    // assert proper balance
    assert.equal(await oldToken.balanceOf(user), 100);
    assert.equal(await newToken.balanceOf(user), 100);
    assert.equal(await newToken.balanceOf(reserve), 0);
  });

  it.only("convert via GSN call success test", async function() {
    console.log("test");
    assert.equal(await oldToken.balanceOf(user), 100);
    assert.equal(await oldToken.balanceOf(owner), 100);
    console.log("before");
    await this.recipient.methods.convert(50).send({from: owner, useGSN: false});
    // await newToken.mint(user, 100, {from: owner});
    console.log("after");
    await this.recipient.methods.convert(50).send({from: user});
    console.log("last");
    // assert proper balance
    assert.equal(await oldToken.balanceOf(user), 50);
    assert.equal(await newToken.balanceOf(user), 140);
    assert.equal(await newToken.balanceOf(reserve), 10);
    assert.isTrue(false);
  });

  it("revert if disabling token swap too early via GSN call test", async function() {
    await Utils.assertTxFail(this.recipient.methods.disableMigration(reserve).send({from: owner}));
    assert.equal(await newToken.balanceOf(reserve), 0);
    assert.equal(await newToken.balanceOf(owner), 50);
  });


  it("revert if invalid parameters provided in disabling token swap via GSN call test", async function() {
    // advance time by 24 weeks
    await Utils.progressTime(migrationTime);

    await Utils.assertTxFail(this.recipient.methods.disableMigration(Constants.ADDRESS_ZERO).send({from: owner}));
    assert.equal(await newToken.balanceOf(reserve), 0);
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
    assert.equal(await newToken.balanceOf(reserve), 10);
  });
});
