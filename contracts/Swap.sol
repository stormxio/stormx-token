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
  uint256 public initializeTime;

  // Token migration should be open no shorter than 24 weeks,
  // which is roughly 6 months
  uint256 constant public MIGRATION_TIME = 24 weeks;

  event Initialized(address oldToken, address newToken);
  event MigrationOpen();
  event MigrationClosed();
  event MigrationLeftoverTransferred(address stormXReserve, uint256 amount);
  event TokenConverted(address indexed account, uint256 newToken);

  modifier canMigrate() {
    require(migrationOpen, "Token Migration not available");
    _;
  }

  constructor() public {      
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
    require(_oldToken != address(0), "Invalid old token address");
    require(_newToken != address(0), "Invalid new token address");
    require(!initialized, "cannot initialize twice");
    oldToken = StormToken(_oldToken);
    newToken = StormXToken(_newToken);
    oldToken.acceptOwnership();

    // open token migration when this contract is initialized
    migrationOpen = true;
    initializeTime = now;
    emit MigrationOpen();

    initialized = true;
    emit Initialized(_oldToken, _newToken);
  }

  /**
   * @dev Transfers the ownership of the old token to a new owner
   *      Reverts if current contract is not the owner yet
   *      Note: after this function is invoked, ``newOwner`` has to
   *      accept the ownership to become the actual owner by calling
   *      ``acceptOwnership()`` of the old token contract  
   * @param newOwner the expected new owner of the old token contract
   */
  function transferOldTokenOwnership(address newOwner) public onlyOwner {
    oldToken.transferOwnership(newOwner);
  }

  /**
   * @dev Swaps certain amount of old tokens to new tokens for the user
   * @param amount specified amount of old tokens to swap
   * @return success status of the conversion
   */
  function convert(uint256 amount) public canMigrate returns (bool) {
    // todo(Eeeva1227) SX-10: add GSN logic since convert should support GSN 
    address account = msg.sender;
    require(oldToken.balanceOf(account) >= amount, "Not enough balance");
    
    // requires the ownership of original token contract
    oldToken.destroy(account, amount); 
    newToken.mint(account, amount);
    emit TokenConverted(account, amount);
    return true;
  }

  /**
   * @dev Disables token migration successfully if it has already been MIGRATION_TIME
   *      since token migration opens, reverts otherwise
   * @param reserve the address that the remaining tokens are sent to 
   * @return success status
   */
  function disableMigration(address reserve) public onlyOwner canMigrate returns (bool) {
    require(reserve != address(0), "Invalid reserve address provided");
    require(now - initializeTime >= MIGRATION_TIME, "Not able to disable token migration yet");
    migrationOpen = false;
    emit MigrationClosed();
    mintAndTransfer(reserve);
    return true;
  }

  /**
   * @dev Called by ``disableMigration()`` 
   *      if token migration is closed successfully.
   *      Mint and transfer the remaining tokens to stormXReserve
   * @param reserve the address that the remaining tokens are sent to 
   * @return success status
   */
  function mintAndTransfer(address reserve) internal returns (bool) {
    uint256 amount = oldToken.totalSupply();
    newToken.mint(reserve, amount);
    emit MigrationLeftoverTransferred(reserve, amount);
    return true;
  }
}
