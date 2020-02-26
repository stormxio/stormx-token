pragma solidity 0.5.16;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract StormXToken is ERC20 {

  // Public variables of the token
  string public standard;
  string public name;
  string public symbol;
  uint8 public decimals;

  constructor() public {
    standard = "Storm Token v2.0";
    name = "Storm Token";
    symbol = "STORM"; // token symbol
    decimals = 18;
  }
}
