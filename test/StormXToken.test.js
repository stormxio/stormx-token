const StormX = artifacts.require("StormXToken");

contract("StormX token test", async function() {
  let stormX;

  beforeEach(async function(){
    stormX = await StormX.new();
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
});
