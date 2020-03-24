pragma solidity 0.5.16;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract IStormXToken is ERC20 {
  function unlockedBalanceOf(address account) public view returns (uint256);
}
