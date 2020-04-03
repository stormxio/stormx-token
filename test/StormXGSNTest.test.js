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
  const provider = Constants.PROVIDER;
  const owner = accounts[0];
  const mockSwap = accounts[1];
  const user = accounts[2];
  const spender = accounts[3];
  const reserve = accounts[4];
  const receiver = accounts[5];

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

    await this.recipient.methods.setChargeFee(10).send({from: owner, useGSN: false});
    // initialize and mint some new tokens for testing
    await this.recipient.methods.initialize(mockSwap).send({from: owner, useGSN: false});
    await this.recipient.methods.mint(user, 100).send({from: mockSwap, useGSN: false});
    assert.equal(await this.recipient.methods.balanceOf(user).call(), 100);
  });

  it("GSN call fails if not enough balance of user test", async function() {
    let poorUser = accounts[6];
    assert.equal(await this.recipient.methods.balanceOf(poorUser).call(), 0);
    await Utils.assertGSNFail(this.recipient.methods.balanceOf(poorUser).send({from: poorUser}));
  });

  // user is charged for a fee in this case
  // since the function call is valid before charging and the call is accepted
  // test that the user is charged before the function is executed, i.e. in ``preRelayedCall()``
  it("GSN transfer fails if not enough balance after being charged test -- case1", async function() {
    assert.equal(await this.recipient.methods.balanceOf(user).call(), 100);

    // maximum transfer amount is 90 in this case, since the user is charged for 10 tokens
    await Utils.assertTxFail(this.recipient.methods.transfer(receiver, 91).send({from: user}));


    // GSN relays the call successfully even though the executed function fails
    // Note: charging is not going through 
    // since user doesn't have enough token after the function call
    assert.equal(await this.recipient.methods.balanceOf(reserve).call(), 10);
    assert.equal(await this.recipient.methods.balanceOf(user).call(), 90);
    assert.equal(await this.recipient.methods.balanceOf(receiver).call(), 0);
  });

  // user is not charged for a fee
  // since as in current testing environment
  // the function call is not valid and so not accepted
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

  it("GSN transferFrom fails if not enough balance test", async function() {
    await this.recipient.methods.approve(spender, 1000).send({from: user});
    await Utils.assertTxFail(this.recipient.methods.transferFrom(user, receiver, 130).send({from: spender}));
  });

  it("GSN transferFrom success only with enough allowance test", async function() {
    await this.recipient.methods.mint(spender, 10).send({from: mockSwap, useGSN: false});
    await Utils.assertTxFail(this.recipient.methods.transferFrom(user, receiver, 10).send({from: spender}));
    
    // user approves
    await this.recipient.methods.approve(spender, 10).send({from: user});
    await this.recipient.methods.transferFrom(user, receiver, 10).send({from: spender});

    // 10 tokens were transferred and 10 tokens were charged, 80 tokens left
    assert.equal(await this.recipient.methods.balanceOf(user).call(), 80);

    // 10 tokens were transferred
    assert.equal(await this.recipient.methods.balanceOf(receiver).call(), 10);

    // 10 tokens were charged
    assert.equal(await this.recipient.methods.balanceOf(reserve).call(), 20);
  });

  it("GSN transfers success test", async function() {
    let recipients = [receiver, receiver, spender];
    let values = [1, 1, 8];

    await this.recipient.methods.transfers(recipients, values).send({from: user});
    // 10 tokens were transferred and 10 tokens were charged, 80 tokens left
    assert.equal(await this.recipient.methods.balanceOf(user).call(), 80);

    // 10 tokens were transferred
    assert.equal(await this.recipient.methods.balanceOf(receiver).call(), 2);
    assert.equal(await this.recipient.methods.balanceOf(spender).call(), 8);

    // 10 tokens were charged
    assert.equal(await this.recipient.methods.balanceOf(reserve).call(), 10);
  });

  it("GSN transfers fails if input lengths do not match in transfers test", async function() {
    let recipients = [receiver, receiver];
    let values = [1];
    await Utils.assertTxFail(this.recipient.methods.transfers(recipients, values).send({from: user}));

    // not charged
    assert.equal(await this.recipient.methods.balanceOf(reserve).call(), 0);
  });

  it("GSN transfers fails if any transfer fails test", async function() {
    let recipients = [receiver, receiver, spender];
    let values = [1, 1000, 8];

    await Utils.assertTxFail(this.recipient.methods.transfers(recipients, values).send({from: user}));

    assert.equal(await this.recipient.methods.balanceOf(user).call(), 100);
    assert.equal(await this.recipient.methods.balanceOf(receiver).call(), 0);
    assert.equal(await this.recipient.methods.balanceOf(spender).call(), 0);

    // not charged
    assert.equal(await this.recipient.methods.balanceOf(reserve).call(), 0);
  });

  it("owner and only owner can enable/disable GSN transfers via GSN test", async function() {
    let recipients = [receiver, receiver, spender];
    let values = [1, 1, 8];

    // user fails to disable transfers
    await Utils.assertTxFail(this.recipient.methods.enableTransfers(false).send({from: user}));
    await this.recipient.methods.transfers(recipients, values).send({from: user});
    assert.equal(await this.recipient.methods.balanceOf(user).call(), 80);
    assert.equal(await this.recipient.methods.balanceOf(receiver).call(), 2);
    assert.equal(await this.recipient.methods.balanceOf(spender).call(), 8);
    assert.equal(await this.recipient.methods.balanceOf(reserve).call(), 10);

    // owner can disable transfers
    await this.recipient.methods.mint(owner, 100).send({from: mockSwap, useGSN: false});
    await this.recipient.methods.enableTransfers(false).send({from: owner});
    await Utils.assertTxFail(this.recipient.methods.transfers(recipients, values).send({from: user}));

    assert.equal(await this.recipient.methods.balanceOf(user).call(), 80);
    assert.equal(await this.recipient.methods.balanceOf(receiver).call(), 2);
    assert.equal(await this.recipient.methods.balanceOf(spender).call(), 8);
    assert.equal(await this.recipient.methods.balanceOf(reserve).call(), 20);

    // user fails to enanble transfers
    await Utils.assertTxFail(this.recipient.methods.enableTransfers(false).send({from: user}));
    assert.isFalse(await this.recipient.methods.transfersEnabled().call());
    // owner can enable transfers
    await this.recipient.methods.enableTransfers(true).send({from: owner});
    assert.isTrue(await this.recipient.methods.transfersEnabled().call());
  });

  it("GSN transferFrom success if enough token balance after transaction test", async function() {
    assert.equal(await this.recipient.methods.balanceOf(spender).call(), 0);
    assert.equal(await this.recipient.methods.unlockedBalanceOf(spender).call(), 0);

    await this.recipient.methods.approve(spender, 1000).send({from: user});
    // GSN relayed call succeeds
    await this.recipient.methods.transferFrom(user, spender, 15).send({from: spender});
    assert.equal(await this.recipient.methods.balanceOf(spender).call(), 5);
    assert.equal(await this.recipient.methods.unlockedBalanceOf(spender).call(), 5);

    await this.recipient.methods.approve(spender, 1000).send({from: user});
    await this.recipient.methods.transferFrom(user, spender, 7).send({from: spender});
    assert.equal(await this.recipient.methods.balanceOf(spender).call(), 2);
    assert.equal(await this.recipient.methods.unlockedBalanceOf(spender).call(), 2);
  });
});
