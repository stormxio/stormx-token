const StormX = artifacts.require("StormXToken");


contract("StormX token test", async function() {
  let stormX;

  beforeEach(async function(){
    stormX = await StormX.new();
  });

  it("dummy test", async function() {
    assert.isTrue(await stormX.test());
  });
});
