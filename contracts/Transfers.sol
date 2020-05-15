pragma solidity 0.5.16;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";

contract Transfers is Ownable {

  address public token;

  constructor(address _token) public {
    token = _token;
  }

  function transfers(address[] memory _recipients, uint256[] memory _values) public onlyOwner returns (bool success) {
    require(_recipients.length == _values.length); // Check if input data is correct

    for (uint cnt = 0; cnt < _recipients.length; cnt++) {
      assert(ERC20(token).transferFrom(msg.sender, _recipients[cnt], _values[cnt]));
    }
    return true;
  }
}

