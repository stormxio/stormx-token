const StormX = artifacts.require("StormXToken");
const StormXGSNRecipient = artifacts.require("StormXGSNRecipient");
const {
  deployRelayHub,
  runRelayer,
  fundRecipient,
} = require('@openzeppelin/gsn-helpers');
const {GSNDevProvider} = require("@openzeppelin/gsn-provider");
const Web3 = require("web3");
const Constants = require("./Constants.js");
const Utils = require("./Utils.js");
const stormXGSNContract = Constants.STORMX_GSN_CONTRACT;


contract("StormX GSN recipient test", async function(accounts) {
  const owner = accounts[0];
  const user = accounts[1];
  
  let token;
  let reserve;
  let Recipient;
  let gsnDevProvider;

  beforeEach(async function (){
    this.web3 = new Web3("http://localhost:8545");
    this.accounts = await this.web3.eth.getAccounts();

    reserve = this.accounts[5];

    await deployRelayHub(this.web3);
    await runRelayer(this.web3, { quiet: true});

    gsnDevProvider = new GSNDevProvider("http://localhost:8545", {
      ownerAddress: this.accounts[0],
      relayerAddress: this.accounts[1]
    });

    token = await StormX.new(reserve, {from: owner});

    // deploy stormx contract as recipient
    Recipient = new this.web3.eth.Contract(stormXGSNContract.abi, null, { data: stormXGSNContract.bytecode });
    this.recipient = await Recipient.deploy({arguments: [token.address, reserve]}).send({ from: owner, gas: 5000000 });

    // Fund and register the recipient in the hub
    await fundRecipient(this.web3, { recipient: this.recipient.options.address});

    // Set provider for the recipient
    this.recipient.setProvider(gsnDevProvider);

    await token.addGSNRecipient(this.recipient.options.address, {from: owner});

    // mint some new tokens for testing
    await token.mint(user, 100, {from: owner});
    assert.equal(await token.balanceOf(user), 100);

    await token.mint(owner, 50, {from: owner});
    assert.equal(await token.balanceOf(owner), 50);
  });

  it("revert if invalid parameters provided in constructor test", async function() {
    await Utils.assertTxFail(StormXGSNRecipient.new(Constants.ADDRESS_ZERO, reserve));
    await Utils.assertTxFail(StormXGSNRecipient.new(token.address, Constants.ADDRESS_ZERO));
  });

  it("GSN call fails if not enough balance of caller test", async function() {
    let newReserve = accounts[7];
    await this.recipient.methods.setChargeFee(500).send({from: owner, useGSN: false});
    assert.equal(await this.recipient.methods.chargeFee().call(), 500);
    await Utils.assertGSNFail(this.recipient.methods.setStormXReserve(newReserve).send({from: owner}));
    
    assert.equal(await this.recipient.methods.stormXReserve().call(), reserve);
    assert.equal(await token.balanceOf(owner), 50);
    assert.equal(await token.balanceOf(reserve), 0);
  });

  it("owner and only owner can set GSN charge test", async function() {
    // owner invokes a GSN call to set charge fee successfully
    await this.recipient.methods.setChargeFee(5).send({from: owner});
    // 10 tokens were charged
    assert.equal(await token.balanceOf(owner), 40);
    // reserve receives the charged fee
    assert.equal(await token.balanceOf(reserve), 10);

    // owner successfully sets GSN charge fee with GSN call
    assert.equal(await this.recipient.methods.chargeFee().call(), 5);
    
    // non-owner fails to set GSN charge fee 
    await Utils.assertTxFail(this.recipient.methods.setChargeFee(10).send({from: user}));
    await Utils.assertTxFail(this.recipient.methods.setChargeFee(10).send({from: user, useGSN: false}));
    assert.equal(await token.balanceOf(user), 100);
    assert.equal(await this.recipient.methods.chargeFee().call(), 5);

    // owner can set charge fee directly
    await this.recipient.methods.setChargeFee(50).send({from: owner, useGSN: false});
    assert.equal(await this.recipient.methods.chargeFee().call(), 50);
    // not charged since no GSN call invoked
    assert.equal(await token.balanceOf(owner), 40);
    assert.equal(await token.balanceOf(reserve), 10);
  });

  it("reverts if invalid parameter provided in set stormx reserve address test", async function() {
    await Utils.assertTxFail(this.recipient.methods.setStormXReserve(Constants.ADDRESS_ZERO).send({from: owner, useGSN: false}));
    await Utils.assertTxFail(this.recipient.methods.setStormXReserve(Constants.ADDRESS_ZERO).send({from: owner}));
  });

  it("owner and only owner can set stormx reserve address test", async function() {
    let newReserve = accounts[7];

    // owner invokes a GSN call 
    await this.recipient.methods.setChargeFee(15).send({from: owner});
    
    // 10 tokens were charged
    assert.equal(await token.balanceOf(owner), 40);
    // reserve receives the charged fee
    assert.equal(await token.balanceOf(reserve), 10);

    // owner sets stormx reserve address to newReserve via GSN call
    await this.recipient.methods.setStormXReserve(newReserve).send({from: owner});
    assert.equal(await this.recipient.methods.stormXReserve().call(), newReserve);
    // 15 tokens were charged
    assert.equal(await token.balanceOf(reserve), 25);
    assert.equal(await token.balanceOf(owner), 25);

    // owner invokes another GSN call 
    await this.recipient.methods.setChargeFee(10).send({from: owner}); 
    assert.equal(await this.recipient.methods.chargeFee().call(), 10);
    // newReserve receives the charged fee
    assert.equal(await token.balanceOf(newReserve), 15);
    assert.equal(await token.balanceOf(reserve), 25);
    // 15 were charged
    assert.equal(await token.balanceOf(owner), 10);

    // owner can set stormx reserve address to newReserve directly
    await this.recipient.methods.setStormXReserve(reserve).send({from: owner, useGSN: false});
    assert.equal(await this.recipient.methods.stormXReserve().call(), reserve);
    // not charged since no GSN call invoked
    assert.equal(await token.balanceOf(owner), 10);

    // non-owner fails to set stormx reserve address
    await Utils.assertTxFail(this.recipient.methods.setStormXReserve(newReserve).send({from: user}));
    await Utils.assertTxFail(this.recipient.methods.setStormXReserve(newReserve).send({from: user, useGSN: false}));
    assert.equal(await token.balanceOf(user), 100);
    assert.equal(await this.recipient.methods.stormXReserve().call(), reserve);
  });
});
