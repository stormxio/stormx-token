pragma solidity 0.5.16;

import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract StormXToken is ERC20Detailed("Storm Token", "STORM", 18), ERC20 {
  string public standard;

  constructor() public {
    standard = "Storm Token v2.0";
  }
}
