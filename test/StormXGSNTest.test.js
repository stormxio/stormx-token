const {
  deployRelayHub,
  runRelayer,
  fundRecipient,
} = require('@openzeppelin/gsn-helpers');
const {GSNDevProvider} = require("@openzeppelin/gsn-provider");
const Web3 = require("web3");
const Constants = require("./Constants.js");

const stormXContract = Constants.STORMX_CONTRACT;


contract.only("StormX token GSN test", async function(accounts) {
  const user = accounts[2];
  const swapAddress = accounts[3];
  const reserve = accounts[4];

  const chargeFee = 10;

  let Recipient;
  let gsnDevProvider;
  
  // Set up the testing environment using javascript
  beforeEach(async function () { 
    // using port 8555 to pass travis CI check and test-cov
    // if run ganache locally, should set the port to 8555
    // instead of using port 8545
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
    this.recipient = await Recipient.deploy({arguments: [swapAddress, reserve]}).send({ from: this.accounts[0], gas: 4000000 });

    // Fund and register the recipient in the hub
    await fundRecipient(this.web3, { recipient: this.recipient.options.address});

    // Set provider for the recipient
    this.recipient.setProvider(gsnDevProvider);

    // mint some new tokens for testing
    await this.recipient.methods.mint(user, 100).send({from: this.accounts[0], useGSN: false});
  });


  it("basic GSN success test", async function() {
    // _msgSender() of "_preRelayedCall" and "_postRelayedCall" are zero address as expected
    // since these two functions are called by relayHub
    // _msgData() is tesed by openzeppelin and not explicitly tested here
    // since it will not be used in implementation
    await this.recipient.methods.test().send({from: user}).then(
      function(res) {
        let event1 = res.events.Test[0].returnValues;
        assert.equal(event1.funcName, "_preRelayedCall");
        assert.equal(event1.sender, Constants.ADDRESS_ZERO);

        let event2 = res.events.Test[1].returnValues;
        assert.equal(event2.funcName, "Test");
        assert.equal(event2.sender, user);

        let event3 = res.events.Test[2].returnValues;
        assert.equal(event3.funcName, "_postRelayedCall");
        assert.equal(event3.sender, Constants.ADDRESS_ZERO);
      }
    ); 

    // assert user is charged
    assert.equal(await stormx.balanceOf(user), 90);
    assert.equal(await stormx.balanceOf(reserve), 10);
  });

  // // todo(Eeeva1227) SX-10: add logic for supporting GSN testing
  // it("transfer via GSN success test", async function() {
  //   await this.recipient.methods.mint(user, 20).send({from: accounts[0], useGSN: false});
  //   await this.recipient.methods.transfer(receiver, 10).send({from: user});
    
  //   // 10 tokens were transferred and 10 tokens were charged, none left
  //   this.recipient.methods.balanceOf(user).call({from: accounts[0]}).then(
  //     function(res) {}
  //   );
  //   this.recipient.methods.balanceOf(receiver).call({from: accounts[0]}).then(
  //     function(res) {}
  //   );

  //   this.recipient.methods.balanceOf(accounts[0]).call({from: accounts[0]}).then(
  //     function(res) {}
  //   );
  // });
});
