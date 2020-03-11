const path = require("path");
let PROVIDER;
let STORMX_CONTRACT;
let SWAP_CONTRACT;
let STORMX_GSN_CONTRACT;


if (process.env.RUNNING_COVERAGE) {
  PROVIDER = "http://localhost:8545";

  STORMX_CONTRACT = require(path.resolve(
    __dirname,
    "../.coverage_artifacts/contracts/StormXToken.json"
  ));

  SWAP_CONTRACT = require(path.resolve(
    __dirname,
    "../.coverage_artifacts/contracts/Swap.json"
  ));

  STORMX_GSN_CONTRACT = require(path.resolve(
    __dirname,
    "../.coverage_artifacts/contracts/StormXGSNRecipient.json"
  ));
} else {
  PROVIDER = "http://localhost:8545";
  STORMX_CONTRACT = require(path.resolve(__dirname, "../build/contracts/StormXToken.json"));
  SWAP_CONTRACT = require(path.resolve(__dirname, "../build/contracts/Swap.json"));
  STORMX_GSN_CONTRACT = require(path.resolve(__dirname, "../build/contracts/StormXGSNRecipient.json"));
}


module.exports = {
  ADDRESS_ZERO: "0x0000000000000000000000000000000000000000",
  PROVIDER,
  STORMX_CONTRACT,
  SWAP_CONTRACT,
  STORMX_GSN_CONTRACT
};
