pragma solidity 0.5.16;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/GSN/GSNRecipient.sol";


contract StormXToken is ERC20, GSNRecipient {  

  // Variables and constants for supporting GSN
  uint256 constant NO_ENOUGH_BALANCE = 11;
  uint256 public chargeFee;
  address public stormXReserve; 

  constructor() public { 
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
      if (balanceOf(from) < chargeFee) {
        return _rejectRelayedCall(NO_ENOUGH_BALANCE);
      } else {
        // Requires user's approval
        transferFrom(from, stormXReserve, chargeFee);
        return _approveRelayedCall();
      }
    }

  function test() public pure returns (bool) {
    return true;
  }  
}
