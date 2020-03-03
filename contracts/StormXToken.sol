pragma solidity 0.5.16;

import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts/GSN/GSNRecipient.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";


contract StormXToken is 
  ERC20Mintable, 
  ERC20Detailed("Storm Token", "STORM", 18), 
  Ownable, 
  GSNRecipient {   
  string public standard;

  // Variables and constants for supporting GSN
  uint256 constant NO_ENOUGH_BALANCE = 11;
  uint256 public chargeFee;
  address public stormXReserve; 

  // Testing that GSN is supported properly 
  event Test(string funcName, address indexed sender, bytes data);
  event StormXReserveSet(address newAddress);
  
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
