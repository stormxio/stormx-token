pragma solidity 0.5.16;

import "@openzeppelin/contracts/GSN/GSNRecipient.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../interface/IStormXToken.sol";


contract StormXGSNRecipient is GSNRecipient, Ownable {

  using SafeMath for uint256;

  // Variables and constants for supporting GSN
  uint256 constant INSUFFICIENT_BALANCE = 11;
  uint256 public chargeFee;
  address public stormXReserve;

  // importing ``StormXToken.sol`` results in infinite loop
  // using only an interface
  IStormXToken public token;
  
  event StormXReserveSet(address newAddress);
  event ChargeFeeSet(uint256 newFee);

  /**
   * @param tokenAddress address of `StormXToken.sol`
   * @param reserve address that receives GSN charge fee
   */
  constructor(address tokenAddress, address reserve) public {
    require(tokenAddress != address(0), "Invalid token address");
    require(reserve != address(0), "Invalid reserve address");

    token = IStormXToken(tokenAddress);
    stormXReserve = reserve;
    // decimals of StormXToken is 18
    chargeFee = 10 * (10 ** 18);
  }

  /**
   * Note: the documentation is copied from
   * `openzeppelin-contracts/contracts/GSN/IRelayRecipient.sol`
   * @dev Called by {IRelayHub} to validate
   * if this recipient accepts being charged for a relayed call.
   * Note that the recipient will be charged regardless of the execution result of the relayed call
   * (i.e. if it reverts or not).
   *
   * The relay request was originated by `from` and will be served by `relay`.
   * `encodedFunction` is the relayed call calldata,
   * so its first four bytes are the function selector.
   * The relayed call will be forwarded `gasLimit` gas,
   * and the transaction executed with a gas price of at least `gasPrice`.
   * `relay`'s fee is `transactionFee`,
   * and the recipient will be charged at most `maxPossibleCharge` (in wei).
   * `nonce` is the sender's (`from`) nonce for replay attack protection in {IRelayHub},
   * and `approvalData` is a optional parameter that can be used to hold a signature
   * over all or some of the previous values.
   *
   * Returns a tuple, where the first value is used to indicate approval (0)
   * or rejection (custom non-zero error code, values 1 to 10 are reserved)
   * and the second one is data to be passed to the other {IRelayRecipient} functions.
   *
   * {acceptRelayedCall} is called with 50k gas: if it runs out during execution,
   * the request will be considered
   * rejected. A regular revert will also trigger a rejection.
   */
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
      (bool accept, bool chargeBefore) = _acceptRelayedCall(from, encodedFunction);
      if (accept) {
        return  _approveRelayedCall(abi.encode(from, chargeBefore));
      } else {
        return _rejectRelayedCall(INSUFFICIENT_BALANCE);
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

  /**
   * @dev Checks whether to accepte a GSN relayed call
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
    uint256 unlockedBalance = token.unlockedBalanceOf(from);
    if (unlockedBalance < chargeFee) {
      bytes4 selector = readBytes4(encodedFunction, 0);
      if (selector == bytes4(keccak256("convert(uint256)"))) {
        // unlocked token balance for the user if conversion succeeds
        uint256 amount = uint256(getParam(encodedFunction, 0)).add(unlockedBalance);
        if (amount >= chargeFee) {
          // we can charge this after the conversion
          chargeBefore = false;
          return (true, chargeBefore);
        } else {
          // if rejects the call, the value of chargeBefore does not matter
          return (false, chargeBefore);
        }
      } else {
        // if rejects the call, the value of chargeBefore does not matter
        return (false, chargeBefore);
      }
    } else {
      return (true, chargeBefore);
    }
  }

  function _preRelayedCall(bytes memory context) internal returns (bytes32) {
    (address user, bool chargeBefore) = abi.decode(context, (address, bool));
    // charge the user with specified amount of fee
    // if the user is not calling ``convert()``
    if (chargeBefore) {
      token.transferFrom(user, stormXReserve, chargeFee);
    }
    return "";
  }

  function _postRelayedCall(
    bytes memory context,
    bool success,
    uint256 actualCharge,
    bytes32 preRetVal
  ) internal {
    (address user, bool chargeBefore) = abi.decode(context, (address, bool));
    if (!chargeBefore) {
      token.transferFrom(user, stormXReserve, chargeFee);
    }
  }

  /**
   * @dev Reads a bytes4 value from a position in a byte array.
   * Note: for reference, see source code
   * https://etherscan.io/address/0xD216153c06E857cD7f72665E0aF1d7D82172F494#code
   * @param b Byte array containing a bytes4 value.
   * @param index Index in byte array of bytes4 value.
   * @return bytes4 value from byte array.
   */
  function readBytes4(
    bytes memory b,
    uint256 index
  ) internal
    pure
    returns (bytes4 result)
  {
    require(
      b.length >= index + 4,
      "GREATER_OR_EQUAL_TO_4_LENGTH_REQUIRED"
    );

    // Arrays are prefixed by a 32 byte length field
    index += 32;

    // Read the bytes4 from array memory
    assembly {
      result := mload(add(b, index))
      // Solidity does not require us to clean the trailing bytes.
      // We do it anyway
      result := and(result, 0xFFFFFFFF00000000000000000000000000000000000000000000000000000000)
    }
    return result;
  }

  /**
   * @dev Reads a bytes32 value from a position in a byte array.
   * Note: for reference, see source code
   * https://etherscan.io/address/0xD216153c06E857cD7f72665E0aF1d7D82172F494#code
   * @param b Byte array containing a bytes32 value.
   * @param index Index in byte array of bytes32 value.
   * @return bytes32 value from byte array.
   */
  function readBytes32(
    bytes memory b,
    uint256 index
  )
    internal
    pure
    returns (bytes32 result)
  {
    require(
      b.length >= index + 32,
      "GREATER_OR_EQUAL_TO_32_LENGTH_REQUIRED"
    );

    // Arrays are prefixed by a 256 bit length parameter
    index += 32;

    // Read the bytes32 from array memory
    assembly {
      result := mload(add(b, index))
    }
    return result;
  }
  
  /**
   * @dev Reads a uint256 value from a position in a byte array.
   * Note: for reference, see source code
   * https://etherscan.io/address/0xD216153c06E857cD7f72665E0aF1d7D82172F494#code
   * @param b Byte array containing a uint256 value.
   * @param index Index in byte array of uint256 value.
   * @return uint256 value from byte array.
   */
  function readUint256(
    bytes memory b,
    uint256 index
  ) internal
    pure
    returns (uint256 result)
  {
    result = uint256(readBytes32(b, index));
    return result;
  }

 /**
  * @dev extract parameter from encoded-function block.
  * Note: for reference, see source code
  * https://etherscan.io/address/0xD216153c06E857cD7f72665E0aF1d7D82172F494#code
  * https://solidity.readthedocs.io/en/develop/abi-spec.html#formal-specification-of-the-encoding
  * note that the type of the parameter must be static.
  * the return value should be casted to the right type.
  * @param msgData encoded calldata
  * @param index in byte array of bytes memory
  * @return the parameter extracted from call data
  */
  function getParam(bytes memory msgData, uint index) internal pure returns (uint) {
    return readUint256(msgData, 4 + index * 32);
  }
}
