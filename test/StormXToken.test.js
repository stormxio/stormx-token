const StormX = artifacts.require("StormXToken");
const Utils = require("./Utils.js");
const Constants = require("./Constants.js");

contract("StormX token test", async function(accounts) {
  const owner = accounts[0];
  const reserve = accounts[1];
  const swapAddress = accounts[2];
  const user = accounts[3];

  let stormX;

  beforeEach(async function(){
    stormX = await StormX.new(swapAddress, reserve, {from: owner});
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
    await Utils.assertTxFail(StormX.new(Constants.ADDRESS_ZERO, reserve));
    await Utils.assertTxFail(StormX.new(swapAddress, Constants.ADDRESS_ZERO));
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
});
