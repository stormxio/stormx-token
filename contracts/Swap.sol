pragma solidity 0.5.16;

import "@openzeppelin/contracts/ownership/Ownable.sol";  
import "./StormXToken.sol";
import "../mock/OldStormXToken.sol"; 


contract Swap is Ownable {       

  StormToken public oldToken;
  StormXToken public newToken;
  bool public initialized;

  // Variables for supporing token swap
  bool public migrationOpen;

  event MigrationOpen();
  event MigrationClosed();
  event MigrationLeftoverTransferred(address stormXReserve, uint256 amount);
  event TokenConverted(address indexed account, uint256 newToken);


  // todo(Eeeva1227): SX-6: uncomment when support closing token swap
  // currently commented out for improving test coverage
  // modifier canMigrate() {
  //   require(migrationOpen, "Token Migration not available");
  //   _;
  // }

  constructor() public {
    migrationOpen = true;
    emit MigrationOpen();
  }

  function initialize(address _oldToken, address _newToken) public onlyOwner {
    require(!initialized, "cannot initialize twice");
    oldToken = StormToken(_oldToken);
    newToken = StormXToken(_newToken);
    initialized = true;
  }

  // For accepting the ownership of original token
  function acceptOwnership() public {
    oldToken.acceptOwnership();
  }

  function convert(uint256 amount) public returns (bool) {
    // convert does not support GSN
    // todo(Eeeva1227) SX-11: need modifications 
    // if supporting GSN is required for token swap
    address account = msg.sender;
    require(oldToken.balanceOf(account) >= amount, "No enough balance");
    
    // requires the ownership of original token contract
    oldToken.destroy(account, amount); 
    newToken.mint(account, amount);
    emit TokenConverted(account, amount);
    return true;
  }
}
