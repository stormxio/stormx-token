pragma solidity 0.5.16;

import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";


contract StormXToken is ERC20Mintable, ERC20Detailed("Storm Token", "STORM", 18), Ownable {   
  string public standard;

  address public stormXReserve;

  event StormXReserveSet(address newAddress);
  
  constructor(address swapAddress, address reserve) public {
    require(swapAddress != address(0), "Invalid swap address");
    require(reserve != address(0), "Invalid reserve address");
    addMinter(swapAddress);
    stormXReserve = reserve;
    standard = "Storm Token v2.0";
  }

  function setStormXReserve(address newReserve) public onlyOwner returns (bool) {
    require(newReserve != address(0), "Invalid reserve address");
    stormXReserve = newReserve;
    emit StormXReserveSet(newReserve);
    return true;
  }
}
