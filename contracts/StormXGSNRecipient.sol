pragma solidity 0.5.16;

import "@openzeppelin/contracts/GSN/GSNRecipient.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "../interface/IStormXToken.sol";


contract StormXGSNRecipient is GSNRecipient, Ownable {

  // Variables and constants for supporting GSN
  uint256 constant INSUFFICIENT_BALANCE = 11;
  uint256 public chargeFee;
  address public stormXReserve; 

  // importing ``StormXToken.sol`` results in infinite loop
  // using only an interface
  IStormXToken public token;
  
  event StormXReserveSet(address newAddress);
  event ChargeFeeSet(uint256 newFee);

  constructor(address tokenAddress, address reserve) public {
    require(tokenAddress != address(0), "Invalid token address");
    require(reserve != address(0), "Invalid reserve address");

    token = IStormXToken(tokenAddress);
    stormXReserve = reserve;
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
      if (token.unlockedBalanceOf(from) < chargeFee) {
        return _rejectRelayedCall(INSUFFICIENT_BALANCE);
      } else {
        return _approveRelayedCall(abi.encode(from));
      }
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
   * @dev Sets the charge fee for GSN calls
   * @param newFee the new charge fee
   * @return success status of the setting 
   */
  function setChargeFee(uint256 newFee) public onlyOwner returns (bool) {
    chargeFee = newFee;
    emit ChargeFeeSet(newFee);
    return true;
  }
  
  function _preRelayedCall(bytes memory context) internal returns (bytes32) {
    address user = abi.decode(context, (address));
  
    // charge the user with specified amount of fee
    token.transferFrom(user, stormXReserve, chargeFee);
  }

  function _postRelayedCall(
    bytes memory context, 
    bool success, 
    uint256 actualCharge, 
    bytes32 preRetVal
  ) internal {}
}
