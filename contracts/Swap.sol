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

  event Initialized(address oldToken, address newToken);
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

  /**
   * @dev Initializes the old token and the new token to interact with 
   *      Accepts the ownership of the old token
   *      Important: the ownership of the old token should be transferred
   *      to this contract before calling this function
   * @param _oldToken address of the deployed old token
   * @param _newToken address of the deployed new token
   */
  function initialize(address _oldToken, address _newToken) public onlyOwner {
    require(!initialized, "cannot initialize twice");
    oldToken = StormToken(_oldToken);
    newToken = StormXToken(_newToken);
    oldToken.acceptOwnership();
    initialized = true;
    emit Initialized(_oldToken, _newToken);
  }

  /**
   * @dev Swaps certain amount of old tokens to new tokens for the user
   * @param amount specified amount of old tokens to swap
   * @return success status of the conversion
   */
  function convert(uint256 amount) public returns (bool) {
    // todo(Eeeva1227) SX-10: add GSN logic since convert should support GSN 
    address account = msg.sender;
    require(oldToken.balanceOf(account) >= amount, "No enough balance");
    
    // requires the ownership of original token contract
    oldToken.destroy(account, amount); 
    newToken.mint(account, amount);
    emit TokenConverted(account, amount);
    return true;
  }
}
