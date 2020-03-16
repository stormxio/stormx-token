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


contract("StormX token staking feature GSN test", async function(accounts) {
  const provider = Constants.PROVIDER;
  const owner = accounts[0];
  const mockSwap = accounts[1];
  const user = accounts[2];
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
    this.recipient = await Recipient.deploy({arguments: [reserve]}).send({ from: owner, gas: 50000000 });

    // Fund and register the recipient in the hub
    await fundRecipient(this.web3, { recipient: this.recipient.options.address});

    // Set provider for the recipient
    this.recipient.setProvider(gsnDevProvider);

    // initialize and mint some new tokens for testing
    await this.recipient.methods.initialize(mockSwap).send({from: owner, useGSN: false});
    await this.recipient.methods.mint(user, 100).send({from: mockSwap, useGSN: false});
    assert.equal(await this.recipient.methods.balanceOf(user).call(), 100);
  });

  it("GSN lock fails if not enough unlocked balance of user test", async function() {
    let poorUser = accounts[6];
    await this.recipient.methods.mint(poorUser, 20).send({from: mockSwap, useGSN: false});
    assert.equal(await this.recipient.methods.balanceOf(poorUser).call(), 20);
    await Utils.assertTxFail(this.recipient.methods.lock(100).send({from: poorUser}));
  });

  it("GSN lock success test", async function() {
    await this.recipient.methods.lock(50).send({from: user});
    assert.equal(await this.recipient.methods.balanceOf(user).call(), 90);
    assert.equal(await this.recipient.methods.lockedBalanceOf(user).call(), 50);
    assert.equal(await this.recipient.methods.balanceOf(reserve).call(), 10);
  });

  it("GSN unlock fails if not enough locked balance of user test", async function() {
    await this.recipient.methods.lock(50).send({from: user});
    await Utils.assertTxFail(this.recipient.methods.unlock(100).send({from: user}));
    assert.equal(await this.recipient.methods.balanceOf(user).call(), 90);
    assert.equal(await this.recipient.methods.lockedBalanceOf(user).call(), 50);
    assert.equal(await this.recipient.methods.balanceOf(reserve).call(), 10);
  });

  it("GSN unlock success test", async function() {
    await this.recipient.methods.lock(50).send({from: user});
    await this.recipient.methods.unlock(10).send({from: user});
    assert.equal(await this.recipient.methods.balanceOf(user).call(), 80);
    assert.equal(await this.recipient.methods.lockedBalanceOf(user).call(), 40);
    assert.equal(await this.recipient.methods.balanceOf(reserve).call(), 20);
  });
});     
