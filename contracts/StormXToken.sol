pragma solidity 0.5.16;

import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./StormXGSNRecipient.sol";


contract StormXToken is
  StormXGSNRecipient,
  ERC20,
  ERC20Detailed("StormX", "STMX", 18) {

  using SafeMath for uint256;

  bool public transfersEnabled;
  bool public initialized = false;
  address public swap;

  // Variables for staking feature
  mapping(address => uint256) public lockedBalanceOf;

  event TokenLocked(address indexed account, uint256 amount);
  event TokenUnlocked(address indexed account, uint256 amount);
  event TransfersEnabled(bool newStatus);
  event SwapAddressAdded(address swap);

  modifier transfersAllowed {
    require(transfersEnabled, "Transfers not available");
    _;
  }

  /**
   * @param reserve address of the StormX's reserve that receives GSN charge fee
   * GSN charged fees and remaining tokens
   * after the token migration is closed
   */
  constructor(address reserve)
    // solhint-disable-next-line visibility-modifier-order
    StormXGSNRecipient(address(this), reserve) public {
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
   *     Note: this function is also used by every StormXGSNRecipient
   *           when charging.
   * @param sender address of the sender
   * @param recipient address of the recipient
   * @param amount specified amount of tokens to be transferred
   * @return success status of the transferring
   */
  function transferFrom(address sender, address recipient, uint256 amount) public returns (bool) {
    require(unlockedBalanceOf(sender) >= amount, "Not enough unlocked token balance of sender");
    // if the msg.sender is charging ``sender`` for a GSN fee
    // allowance does not apply
    // so that no user approval is required for GSN calls
    if (_msgSender() == address(this) || _msgSender() == swap) {
      _transfer(sender, recipient, amount);
      return true;
    } else {
      return super.transferFrom(sender, recipient, amount);
    }
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
   * @param recipients an array of recipient addresses
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
    return true;
  }

  function mint(address account, uint256 amount) public {
    require(initialized, "The contract is not initialized yet");
    require(_msgSender() == swap, "not authorized to mint");
    _mint(account, amount);
  }

  /**
   * @dev Initializes this contract
   *      Sets address ``swap`` as the only valid minter for this token
   *      Note: must be called before token migration opens in ``Swap.sol``
   * @param _swap address of the deployed contract ``Swap.sol``
   */
  function initialize(address _swap) public onlyOwner {
    require(!initialized, "cannot initialize twice");
    require(_swap != address(0), "invalid swap address");
    swap = _swap;
    transfersEnabled = true;
    emit TransfersEnabled(true);
    initialized = true;
    emit SwapAddressAdded(_swap);
  }

  /**
   * @dev Checks whether to accept a GSN relayed call
   * @param from the user originating the GSN relayed call
   * @param encodedFunction the function call to relay, including data
   * @return ``accept`` indicates whether to accept the relayed call
   *         ``chargeBefore`` indicates whether to charge before executing encoded function
   */
  function _acceptRelayedCall(
    address from,
    bytes memory encodedFunction
  ) internal view returns (bool accept, bool chargeBefore) {
    bool chargeBefore = true;
    uint256 unlockedBalance = unlockedBalanceOf(from);
    if (unlockedBalance < chargeFee) {
      // charge users after executing the encoded function
      chargeBefore = false;
      bytes4 selector = readBytes4(encodedFunction, 0);
      if (selector == bytes4(keccak256("unlock(uint256)"))) {
        // unlocked token balance for the user if transaction succeeds
        uint256 amount = uint256(getParam(encodedFunction, 0)).add(unlockedBalance);
        return (amount >= chargeFee, chargeBefore);
      } else if (selector == bytes4(keccak256("transferFrom(address,address,uint256)"))) {
        address sender = address(getParam(encodedFunction, 0));
        address recipient = address(getParam(encodedFunction, 1));
        uint256 amount = getParam(encodedFunction, 2);

        bool accept = recipient == from &&
          // `from` can have enough unlocked token balance after the transaction
          amount.add(unlockedBalance) >= chargeFee &&
          // check `transferFrom()` can be executed successfully
          unlockedBalanceOf(sender) >= amount &&
          allowance(sender, from) >= amount;
        return (accept, chargeBefore);
      } else {
        // if rejects the call, the value of chargeBefore does not matter
        return (false, chargeBefore);
      }
    } else {
      return (true, chargeBefore);
    }
  }
}
