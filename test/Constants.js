const path = require("path");
let STORMX_CONTRACT;

if (process.env.RUNNING_COVERAGE) {
  STORMX_CONTRACT = require(path.resolve(
    __dirname,
    "../.coverage_artifacts/contracts/StormXToken.json"
  ));
} else {
  STORMX_CONTRACT = require(path.resolve(__dirname, "../build/contracts/StormXToken.json"));
}


module.exports = {
  ADDRESS_ZERO: "0x0000000000000000000000000000000000000000",
  STORMX_CONTRACT
};
