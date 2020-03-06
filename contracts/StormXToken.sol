pragma solidity 0.5.16;

import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts/GSN/GSNRecipient.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";


contract StormXToken is          
  ERC20Mintable, 
  ERC20Detailed("Storm Token", "STORM", 18), 
  Ownable, 
  GSNRecipient {    

  using SafeMath for uint256;

  string public standard;
  bool public transfersEnabled;

  // Variables and constants for supporting GSN
  uint256 constant NO_ENOUGH_BALANCE = 11;
  uint256 public chargeFee;
  address public stormXReserve; 

  // Variables for staking feature
  mapping(address => uint256) public lockedBalanceOf;

  event TokenLocked(address indexed account, uint256 amount);
  event TokenUnlocked(address indexed account, uint256 amount);
  event TransfersEnabled(bool newStatus);

  // Testing that GSN is supported properly 
  event Test(string funcName, address indexed sender, bytes data);
  event StormXReserveSet(address newAddress);

  modifier transfersAllowed {
    require(transfersEnabled, "Transfers not available");
    _;
  }
  
  /**
   * @param swapAddress address of the deployed swap contract
   * @param reserve address of the StormX's reserve that receives
   * GSN charged fees and remaining tokens
   * after the token migration is closed
   */
  constructor(address swapAddress, address reserve) public {
    require(swapAddress != address(0), "Invalid swap address");
    require(reserve != address(0), "Invalid reserve address");
    addMinter(swapAddress);
    stormXReserve = reserve;
    standard = "Storm Token v2.0";
    chargeFee = 10;
    transfersEnabled = true;
  }

  function acceptRelayedCall(
    address relay,
    address from,
    bytes calldata encodedFunction,
    uint256 transactionFee,
    uint256 gasPrice,
    uint256 gasLimit,
    uint256 nonce,
    bytes calldata approvalData,
    uint256 maxPossibleCharge
  )
    external
    view
    returns (uint256, bytes memory) {

      // todo(Eeeva1227) SX-10: add logic for supporting GSN
      // if (balanceOf(from) < chargeFee) {
      //   return _rejectRelayedCall(NO_ENOUGH_BALANCE);
      // } else {
      //   return _approveRelayedCall();
      // }
      
      return _approveRelayedCall();
    }

  function test() public {
    emit Test("Test", _msgSender(), _msgData());
  }

  /**
   * @dev Sets the address of StormX's reserve
   * @param newReserve the new address of StormX's reserve
   * @return success status of the setting 
   */
  function setStormXReserve(address newReserve) public onlyOwner returns (bool) {
    require(newReserve != address(0), "Invalid reserve address");
    stormXReserve = newReserve;
    emit StormXReserveSet(newReserve);
    return true;
  }

  /**
   * @param account address of the user this function queries unlocked balance for
   * @return the amount of unlocked tokens of the given address
   *         i.e. the amount of manipulable tokens of the given address
   */
  function unlockedBalanceOf(address account) public view returns (uint256) {
    return balanceOf(account).sub(lockedBalanceOf[account]);
  }

  /**
   * @dev Locks specified amount of tokens for the user
   *      Locked tokens are not manipulable until being unlocked
   *      Locked tokens are still reported as owned by the user 
   *      when ``balanceOf()`` is called
   * @param amount specified amount of tokens to be locked
   * @return success status of the locking 
   */
  function lock(uint256 amount) public returns (bool) {
    address account = _msgSender();
    require(unlockedBalanceOf(account) >= amount, "Not enough unlocked tokens");
    lockedBalanceOf[account] = lockedBalanceOf[account].add(amount);
    emit TokenLocked(account, amount);
    return true;
  }

  /**
   * @dev Unlocks specified amount of tokens for the user
   *      Unlocked tokens are manipulable until being locked
   * @param amount specified amount of tokens to be unlocked
   * @return success status of the unlocking 
   */
  function unlock(uint256 amount) public returns (bool) {
    address account = _msgSender();
    require(lockedBalanceOf[account] >= amount, "Not enough locked tokens");
    lockedBalanceOf[account] = lockedBalanceOf[account].sub(amount);
    emit TokenUnlocked(account, amount);
    return true;
  }

  /**
   * @dev The only difference from standard ERC20 ``transferFrom()`` is that
   *     it only succeeds if the sender has enough unlocked tokens
   * @param sender address of the sender
   * @param recipient address of the recipient
   * @param amount specified amount of tokens to be transferred
   * @return success status of the transferring
   */
  function transferFrom(address sender, address recipient, uint256 amount) public returns (bool) {
    require(unlockedBalanceOf(sender) >= amount, "Not enough unlocked token balance of sender");
    return super.transferFrom(sender, recipient, amount);
  }

  /**
   * @dev The only difference from standard ERC20 ``transfer()`` is that
   *     it only succeeds if the user has enough unlocked tokens
   * @param recipient address of the recipient
   * @param amount specified amount of tokens to be transferred
   * @return success status of the transferring
   */
  function transfer(address recipient, uint256 amount) public returns (bool) {
    require(unlockedBalanceOf(_msgSender()) >= amount, "Not enough unlocked token balance");
    return super.transfer(recipient, amount);
  }

  /**
   * @dev Transfers tokens in batch
   * @param recipients an array of address of the recipient
   * @param values an array of specified amount of tokens to be transferred
   * @return success status of the batch transferring
   */
  function transfers(
    address[] memory recipients, 
    uint256[] memory values
  ) public transfersAllowed returns (bool) {
    require(recipients.length == values.length, "Input lengths do not match");
    
    for (uint256 i = 0; i < recipients.length; i++) {
      transfer(recipients[i], values[i]);
    }
    return true;
  }

  /**
   * @dev Enables the method ``transfers()`` if ``enable=true``, 
   * and disables ``transfers()`` otherwise
   * @param enable the expected new availability of the method ``transfers()``
   */
  function enableTransfers(bool enable) public onlyOwner returns (bool) {
    transfersEnabled = enable;
    emit TransfersEnabled(enable);
  }

  function _preRelayedCall(bytes memory context) internal returns (bytes32) {
    emit Test("_preRelayedCall", _msgSender(), _msgData());
  }

  function _postRelayedCall(
    bytes memory context, 
    bool success, 
    uint256 actualCharge, 
    bytes32 preRetVal
  ) internal {
    emit Test("_postRelayedCall", _msgSender(), _msgData());
  }
}
