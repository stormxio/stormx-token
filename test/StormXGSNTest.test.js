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


contract("StormX token GSN test", async function(accounts) {
  const owner = accounts[0];
  const user = accounts[2];
  const reserve = accounts[4];
  const receiver = accounts[5];

  let Recipient;
  let gsnDevProvider;
  
  // Set up the testing environment using javascript
  beforeEach(async function () { 
    // using port 8555 to pass travis CI check and test-cov
    // if run ganache locally, should set the port to 8545
    // instead of using port 8555
    this.web3 = new Web3("http://localhost:8545");
    this.accounts = await this.web3.eth.getAccounts();

    await deployRelayHub(this.web3);
    await runRelayer(this.web3, { quiet: true});

    gsnDevProvider = new GSNDevProvider("http://localhost:8545", {
      ownerAddress: this.accounts[0],
      relayerAddress: this.accounts[1]
    });

    // deploy stormx contract as recipient
    Recipient = new this.web3.eth.Contract(stormXContract.abi, null, { data: stormXContract.bytecode });
    this.recipient = await Recipient.deploy({arguments: [reserve]}).send({ from: owner, gas: 5000000 });

    // Fund and register the recipient in the hub
    await fundRecipient(this.web3, { recipient: this.recipient.options.address});

    // Set provider for the recipient
    this.recipient.setProvider(gsnDevProvider);

    // mint some new tokens for testing
    await this.recipient.methods.mint(user, 100).send({from: owner, useGSN: false});
    assert.equal(await this.recipient.methods.balanceOf(user).call(), 100);
  });

  it("GSN call fails if not enough balance of user test", async function() {
    let poorUser = accounts[5];
    assert.equal(await this.recipient.methods.balanceOf(poorUser).call(), 0);
    await Utils.assertGSNFail(this.recipient.methods.balanceOf(poorUser).send({from: poorUser}));
  });

  // todo(Eeeva1227) SX-24: further research is needed to figure out 
  //                        why there is a difference between case1 and case2
  // user is charged for a fee in this case
  it("GSN transfer fails if not enough balance after being charged test -- case1", async function() {
    assert.equal(await this.recipient.methods.balanceOf(user).call(), 100);

    // maximum transfer amount is 90 in this case, since the user is charged for 10 tokens
    await Utils.assertTxFail(this.recipient.methods.transfer(receiver, 91).send({from: user}));

    // GSN relays the call successfully even though the executed function fails
    // assert charging succeeds
    assert.equal(await this.recipient.methods.balanceOf(reserve).call(), 10);
    assert.equal(await this.recipient.methods.balanceOf(user).call(), 90);
    assert.equal(await this.recipient.methods.balanceOf(receiver).call(), 0);
  });

  // user is not charged for a fee
  it("GSN transfer fails if not enough balance after being charged test -- case2", async function() {
    assert.equal(await this.recipient.methods.balanceOf(user).call(), 100);

    // maximum transfer amount is 90 in this case, since the user is charged for 10 tokens
    await Utils.assertTxFail(this.recipient.methods.transfer(receiver, 111).send({from: user}));

    // charging fails in case 2
    assert.equal(await this.recipient.methods.balanceOf(reserve).call(), 0);
    assert.equal(await this.recipient.methods.balanceOf(user).call(), 100);
    assert.equal(await this.recipient.methods.balanceOf(receiver).call(), 0);
  });

  it("GSN transfer success test", async function() {
    await this.recipient.methods.transfer(receiver, 10).send({from: user});
    
    // 10 tokens were transferred and 10 tokens were charged, 80 tokens left
    assert.equal(await this.recipient.methods.balanceOf(user).call(), 80);

    // 10 tokens were transferred
    assert.equal(await this.recipient.methods.balanceOf(receiver).call(), 10);

    // 10 tokens were charged
    assert.equal(await this.recipient.methods.balanceOf(reserve).call(), 10);
  });

  it("owner and only owner can set GSN charge test", async function() {
    // user invokes a GSN call
    await this.recipient.methods.balanceOf(user).send({from: user});
    
    // 10 tokens were charged
    assert.equal(await this.recipient.methods.balanceOf(user).call(), 90);

    // owner successfully sets GSN charge fee with GSN call
    await this.recipient.methods.mint(owner, 130).send({from: owner, useGSN: false});
    await this.recipient.methods.setChargeFee(30).send({from: owner});
    assert.equal(await this.recipient.methods.chargeFee().call(), 30);

    // owner successfully sets GSN charge fee directly
    await this.recipient.methods.setChargeFee(20).send({from: owner, useGSN: false});
    assert.equal(await this.recipient.methods.chargeFee().call(), 20);

    // non-owner fails to set GSN charge fee
    await Utils.assertTxFail(this.recipient.methods.setChargeFee(10).send({from: user}));
    await Utils.assertTxFail(this.recipient.methods.setChargeFee(10).send({from: user, useGSN: false}));
    assert.equal(await this.recipient.methods.chargeFee().call(), 20);
  });
});
