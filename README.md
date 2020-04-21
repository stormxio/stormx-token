# stormx-token

## addresses of deployed contract on ropsten network
``StormXToken``: 0x9d1d1699D2F10b84C5A76782990bBd5bF1415437 (the new token)

``StormToken``:  0x2704FFda70fe764177C87b38Bf2A1557d2B31B13 (the old token)

``Swap``: 0xc23dc78BdF24bE35518E0573a3c0fcE59916a12a



## Executive Summary
StormX currently operates an ERC20 token deployed on Ethereum mainnet address ``0xd0a4b8946cb52f0661273bfbc6fd0e0c75fc6433``.​ The token contract includes features for privileged access that allow StormX to mint new tokens for and remove tokens from arbitrary accounts. The StormX team sought to develop a new ERC20 token smart contract that will not include the aforementioned functions. Additionally, the token should include a new feature for locking tokens (so-called “staking”). The StormX team sought to reward users who choose to hold and lock their tokens with tokens from their own reserves.

This document provides information about the developed solution.

## Assumptions
| #   | Assumption|
|-----|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| A1  | The new token will become the owner of the original token smart contract so that it can call the owner-only functions in the original token smart contract. |
| A2  | After tokens are locked, users alway have to manually unlock the locked tokens if they want to manipulate these tokens.                                                               |
| A3  | The privileged access (function ``destroy()``) can be used for migration.                                         |
| A4  | StormX will embed support for staking and unstaking into their Chrome plugin.                                                       |

## Non-requirements
| #   | Non-requirements|
|-----|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| N1  | StormX will have an off-chain job sending tokens accumulated as interest to users' accounts based on the locked balance. The implementation will not support reward beyond reading the locked token balance of users. |
| N2  | After migration is closed, existing StormX tokens will not be destroyed for users who do not wish to migrate.                                                             |
| N3  | The token swap website does not need to provide functionality for staking and unstaking.                                    |

## Requirements
The following requirements were gathered and agreed upon before the development:

### Standard ERC20 interface
| #     | Requirement                                                                                                              |
|-------|--------------------------------------------------------------------------------------------------------------------------|
| R1-1  | Supports the standard ERC20 interface and include methods.                                                               |
| R1-2  | Supports two standard ERC20 events Transfer and Approval .                                                               |
| R1-3  | The name of the new token is “StormX“.                                                                                   |
| R1-4  | The symbol of the new token is “STMX“.                                                                                   |
| R1-5  | The decimals of the new token remains the same.                                                                          |
| R1-6  | The new token supports a function transfers()for batch transfer of tokens.                                               |
| R1-7  | The signature of function transfers() is identical with the signature of the function transfers() in the original token. |
| R1-8  | The function transfers() is available to everyone.                                                                       |
| R1-9  | The function transfers() is available only when transfers is not disabled.                                               |
| R1-10 | The function enableTransfers() is only available to StormX.                                                              |
| R1-11 | The new token contract is ownable.                                                                                       |
| R1-12 | StormX is the owner of the new token contract.                                                                           |

### MetaTransaction supported via GSN
| #    | Requirement                                                                                                                                                           |
|------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| R2-1 | The new token smart contract is GSN-capable and is able to receive transactions from GSN.                                                                             |
| R2-2 | Each accepted meta transactions via GSN charges the user a certain amount of StormX tokens. The default charge fee is 10 StormX (unless changed by StormX; see R2-3). |
| R2-3 | The fee for GSN network is settable by StormX.                                                                                                                        |
| R2-4 | Fees charged for transactions relayed by GNS are sent to an Ethereum address.                                                                                         |
| R2-5 | StormX can change the address for collecting fees for GSN at any point.                                                                                               |
| R2-6 | Users can send meta transactions via GSN and the relayed call should be accepted as long as the users have enough token balance.                                      |
| R2-7 | The new token smart contract also supports receiving transaction directly.                                                                                            |
| R2-8 | The meta transaction call via GSN is rejected with the error code INSUFFICIENT_BALANCE if the user does not have enough balance.                                      |

### Security Emphasis
| #    | Requirement                                                                                                                |
|------|----------------------------------------------------------------------------------------------------------------------------|
| R3-1 | The token contract includes methods increaseAllowance() and decreaseAllowance() to mitigate allowance double-spend exploit |
| R3-2 | The token is not pausable.                                                                                                 |
| R3-3 | The privileged access in the form of functions ​destroy()​ and ​issue()​ is removed.                                           |


### Token Migration
| #      | Requirement                                                                                                                                                                                                                           |
|--------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| R4-1   | The token swap contract allows for a token swap from old StormX token to the new one.                                                                                                                                                 |
| R4-2   | The conversion guarantees that the total supply of the new token match exactly with that of the original token.                                                                                                                       |
| R4-3   | The swap is possible for at least 6 months. Then, StormX can stop it. After stopping the swap, the rest of the tokens should be minted and sent to StormX’s reserve, so the total supply will reach the original StormX total supply. |
| R4-4   | Users do not need to provide approvals for the tokens to migrate.                                                                                                                                                                     |

### Staking Feature
| #    | Requirement                                                                              |
|------|------------------------------------------------------------------------------------------|
| R5-1 | Users can lock and unlock their tokens                                                   |
| R5-2 | Users cannot manipulate locked tokens by any means.                                      |
| R5-3 | Locked tokens are still reported as owned by the user when method ``balanceOf()`` is called. |
| R5-4 | Users can transfer their tokens after unlocking them.                                    |
| R5-5 | Anyone can read the locked token balance of a user.                                      |

### Token Swap Website Requirements
| #     | Requirement                                                                                            |
|-------|--------------------------------------------------------------------------------------------------------|
| R6-1  | The website is to be hosted on Heroku as its own app with (sub-)domain swap.stormx.io.                 |
| R6-2  | The website must allow for swapping old StormX token to the new StormX token.                          |
| R6-3  | The visual look of the website must respect branding guide of StormX with UX similar to kyberswap.com. |
| R6-4  | The website must support TrustWallet.                                                                  |
| R6-5  | The website must support Ledger.                                                                       |
| R6-6  | The website must support interaction by uploading keystore, entering private key, or mnemonic.         |
| R6-7  | The website must support submitting transactions to GSN network.                                       |
| R6-8  | The website must support submitting transactions directly to the swap smart contract.                  |
| R6-9  | The website must be covered by unit and e2e tests.                                                     |
| R6-10 | The website should visualize if the swap phase is still open or not (see R4-3 for context).            |

(See also the N3 for the website non-requirements.)

## Technical Executions
Quantstamp developed the contracts according to the requirements using Solidity and Javascript for testing. This section outlines the technical solution.

### StormXGSNRecipient

This contract is an ownable contract for supporting GSN relayed calls and charging users for accepted GSN calls. Both ``StormXToken`` and ``Swap`` inherit from this contract. For every accepted GSN relayed call, the user will be charged for a specified amount of StormXTokens, i.e.``chargeFee``, and the charged tokens will be transferred to the specified address ``stormXReserve``.  If the user does not have enough unlocked token balance, the GSN relayed call will be rejected and the user will not be charged at all.

The function ``acceptRelayedCall()`` implemented in ``StormXGSNRecipient.sol`` decides whether to accept a relayed call from GSN or not. As per current implementation, if the user has no less than specified charge fee ``chargeFee``, the relayed call will be accepted and the user will be charged the specified fee.

Only the contract owner can call the methods ``setChargeFee(uint256 newFee)`` and ``setStormXReserve(address newReserve)`` to set ``chargeFee`` and ``stormXReserve`` respectively. If ``chargeFee`` and ``stormXReserve`` are set successfully, events ``ChargeFeeSet(uint256 newFee)`` and ``StormXReserveSet(address newAddress)`` will be emitted respectively.

#### Charging

For any contract inheriting from this contract, it will try to charge users for every GSN relayed call.
1. This contract accepts the GSN relayed call if the user has enough unlocked token balance and will charge user before the called function is executed.

2. If the user does not have enough unlocked token balance and is calling the function ``Swap.convert(uint256 amount)`` or `StormXToken.unlock(uint256 amount)`, this contract accepts the GSN relayed call only if they will have enough unlocked new token balance after the function is executed, i.e. ``amount + StormXToken.unlockedBalanceOf(user) >= chargeFee``. After `convert()` or `unlock()` is executed successfully, the user will be charged for the fee.

3. If the user does not have enough unlocked token balance and is calling the function `StormXToken.transferFrom(address sender, address recipient, uint256 amount)`, this contract accepts the GSN relayed call only if they will have enough unlocked new token balance after the function is executed, i.e. ``amount + StormXToken.unlockedBalanceOf(user) >= chargeFee``, `recipient == user`, and the transfering can be executed successfully (See UC1.6 for more details).
After `transferFrom()` is executed successfully, the user will be charged for the fee.

4. If none of the previous is satisfied, rejects the relayed call.

#### Gas Station Network (GSN) Support

The existing token smart contract is only able to receive transactions directly. The new token smart contract and the swap contract is GSN-capable and can receive transactions from GSN, as well as they will be callable directly by users. Each accepted meta transaction via GSN will charge the user a certain amount of StormX tokens (see requirement R2-2), with the default value being 10 StormX tokens. A setter for this value is provided so that StormX can change it at any point.

In the future, for any contract that needs to support GSN and charge users in the new StormXToken, it can simply inherit from ``StormXGSNRecipient``. However, for these recipients to successfully charge users, users' approvals are required before charging.

#### Centralization of power
The contract `StormXGSNRecipient.sol` uses ownable pattern and has a state variable `owner` to designate the address with special privileges. In this contract, owner and only owner has the privileged access to set `chargeFee` and `stormXReserve` arbitrarily.

Note: `StormXToken.sol` and `Swap.sol` both inherit from this contract and are using ownable pattern. Some functions are only available to the contract owner, and users should be aware of those owner-only functions stated in sections `StormXToken` and `Swap`.

#### Transaction order dependencies
There exist transaction order dependencies between ``setChargeFee()`` and functions that read ``chargeFee``. One possible case that users should be aware of is that ``chargeFee`` is increased after it is read and before the meta transaction is executed. In this case, the meta transaction may fail if the user does not have enough unlocked token balance against the new ``chargeFee``.

### StormXToken

StormXToken is the new token contract implemented for StormX. It supports standard ERC20 interface, transferring in batch, staking feature and GSN relayed calls.

#### Standard ERC20 interface

StormXToken is in compliance with ERC20 as described in ​eip-20.md​. This token contract is ownable and mintable.

#### Allowance Double-Spend Exploit
Allowance double-spend exploit is mitigated in this contract with functions `increaseAllowance()` and `decreaseAllowance()`.

However, community agreement on an ERC standard that would protect against this exploit is still pending. Users should be aware of this exploit when interacting with this contract.

#### Mint
The function ``mint()`` is overriden in this contract to prevent contract owner from minting tokens arbitrarily.
There is only one valid minter which should be set by the function ``StormXToken.initialize(address swap) public onlyOwner``.
This function ``StormXToken.initialize()`` can only be called once and is only available to contract owner. After this function is invoked, ``swap`` will be the only address that can call function ``mint()``.

Note: to support token migration, ``StormXToken.initialize()`` must be called before any ``Swap.convert()`` function call is executed.

#### Transferring in batch

Anyone can call the method ``transfers()`` to perform multiple transferring in a single function call when transfers is allowed.

```
function transfers(
    address[] memory recipients, 
    uint256[] memory values
  ) public transfersAllowed returns (bool)
```

Only contract owner can enable/disable the method ``transfers()`` by invoking the method ``enableTransfers(bool enable)``. It enables method ``transfers()``for batch transfers if ``enable=true``, and disables ``transfers() `` otherwise. The event ``TransfersEnabled(bool newStatus)`` is emitted.

### Staking Feature

The new token includes a staking feature and StormX will reward users for any staked tokens they have.

This feature comprises the following sections.

#### Lock

By invoking the function ``lock()``, users can lock any amount of new StormX tokens as long as they have enough unlocked token balance. Locked tokens can not be manipulable by any means. Once the specified amount of tokens are locked successfully, an interest start to be accumulated and calculated off-chain by StormX (see N1). The locked token balance of users can be read via read methods (see section Read Methods). While the users are not able to perform any operations on locked tokens, these locked tokens are still reported as owned by the users when method ``balanceOf()`` is called.

#### Unlock

By invoking the function ``unlock()``, users are able to unlock any amount of locked new StormX tokens they have, and are able to perform any operations on their unlocked tokens as desired. Once the specified amount of tokens becomes unlocked, those tokens will no longer accumulate interest.

#### Read Methods

Anyone can call read methods to retrieve the different kinds of balance.

 1. ``lockedBalanceOf(address account)`` returns the amount of locked tokens account holds

 2. ``unlockedBalanceOf(address account)`` returns the amount of unlock tokens account holds

 3. ``balanceOf(address account)`` returns the total amount of tokens account holds, i.e the sum of locked and unlocked tokens 

#### Reward
Contract owner and a specific role `rewardRole` can invoke the function `reward(address recipient, uint256 amount) public onlyAuthorized` to reward a user with specified amount of tokens, or they can invoke the function `rewards(address[] memory recipients, uint256[] memory values)` to reward multiple users at one time.

Contract owner can assign the specific role `rewardRole` to any address by invoking the function `assignRewardRole(address account) public onlyOwner`. This function emits an event `RewardRoleAssigned(address rewardRole)` when `rewardRole` is assigned successfully.

##### Auto-staking
By default, all rewarded tokens will be automatically staked for users when `reward()` or `rewards()` is invoked. Users can disable the auto-staking feature by invoking the function `setAutoStaking(bool enabled)` with `enabled` being `false`. If users want to enable this feature, invoke `setAutoStaking(bool enabled)` with `enabled` being `true`. If auto-staking feature is disabled, rewarded tokens will not be staked for users.

#### GSN relayed calls

StormXToken contract inherits from ``StormXGSNRecipient`` (see StormXGSNRecipient section for more details) and is able to receive GSN relayed calls from GSN relay hub. For references, see [1,2].

By inheriting from ``StormXGSNRecipient``, the contract can charge users in StormX tokens for any accepted GSN relayed calls , and the charged tokens will be transferred to the specified StormX’s reserve address (see Charging section under StormXGSNRecipient).

As per current implementation, only `StormXToken.sol` and `Swap.sol` can charge users for a fee without users' explicit approval. In the future, any contract that inherits from ``StormXGSNRecipient`` and is deployed at address ``recipient``, it can charge user successfully only if the user invokes ``StormXToken.approve(recipient, chargeFee)`` before the GSN relayed call.

### Swap

This smart contract supports the token migration and guarantees that the total supply of the new token will be at most the total supply of the original token (the token supply will in fact be equal to the original token supply after token migration is closed; see R4-3)

#### Token Migration

To open token migration, ownership of the old token contract should be transferred to this contract. The contract owner should call the function ``initialize()`` to accept the old token contract ownership and record the initialized time to guarantee the token swap can last at least 24 weeks.

Anyone can call the method ``convert(uint256 amount)`` to convert a specified amount of original StormX tokens to the new token with exchange rate 1:1 as long as the user has enough unlocked token balance.

The migration uses the privileged access of the original token to dispose of the amount being migrated, and token minting for the new StormX token. Therefore, the user does not need to issue approvals for the tokens undergoing migration.

The new token is compliant with the principles of decentralization, i.e., it is the choice of a user to convert their original tokens to the new tokens. StormX is not able to force or deny such a conversion for any account.

#### Close Token Migration

The token migration can be stopped by StormX only after 24 weeks from initialization. Only the contract owner can call the function ``disableMigration(address reserve)`` to stop token swap, which will mint remaining tokens and send them to the address ``reserve``. 

If token migration is closed successfully, the events ``MigrationClosed()`` and ``MigrationLeftoverTransferred(stormXReserve, amount)`` will be emitted to indicate the success.

#### Transfer Ownership

This contract requires the ownership of the old token contract during token migration and it supports an owner-only method to transfer the old token ownership to a desired new owner.

The contract owner can call the method ``transferOldTokenOwnership(address newOwner)`` to transfer the old token contract ownership to ``newOwner``, and ``newOwner`` has to accept the ownership explicitly by calling the function ``acceptOwnership()`` in old token contract to accept the ownership.

Important: This token is prevented from being initialized twice. Therefore, once the old token ownership is transferred out to a new owner, this swap contract will never be able to accept the old token ownership again and ``convert(uint256 amount)`` will never be able to be invoked. 

### Deployment Instructions

The following order is strictly required when deploying relevant contracts and setting up initializations (the Ethereum account used by StormX team will be referred to as StormXAdmin).

1. StormXAdmin deploys ``StormXToken``, passing the address of StormX’s reserve. StormXAdmin becomes the owner of the contract and StormX’s reserve will receive all charged fees of GSN relayed calls.

   - verify that StormXAdmin is the owner of ``StormXToken`` contract.

2. StormXAdmin deploys ``Swap``, passing the address of ``StormToken``(the old token contract), ``StormXToken`` and StormX’s reserve. StormXAdmin becomes the owner of ``Swap`` and StormX’s reserve will receive all charged fees of GSN relayed calls.

   - verify that StormXAdmin is the owner of ``Swap`` contract.

3. StormXAdmin invokes the function ``StormXToken.initialize(Swap.address)`` for `Swap.sol` to mint new tokens during token swap and charge users for GSN relayed call

   - verify that the state variable ``swap`` is set to ``Swap.address`` properly in ``StormXToken.sol``

4. StormXAdmin invokes the functions ``StormToken.transferOwnership(Swap.address)`` and ``Swap.initialize()`` sequentially so that ``Swap`` can destroy old tokens for users during token swap.

   - verify that ``Swap`` contract is the owner of the old token contract.

### Non-Trivial Use-Cases

All use cases are considered using GSN. If the user calls functions directly for UC1.1-UC1.5, steps 1-3 will be skipped.

#### UC1.1 User locks some amount of new StormX tokens via GSN

1. The user calls the function ``lock(amount)`` with signed signature to GSN.

2. The new token smart contract accepts the relayed call from GSN and executes ``lock(amount)`` if the user has enough unlocked new StormX token balance, i.e. no less than specified ``chargeFee``, and rejects otherwise.

3. The user is charged by the specified amount ``chargeFee`` of new StormX tokens, and the charged tokens are transferred to StormX’s reserve ``stormXReserve``.

4. The function checks whether the ``_msgSender()``(i.e the original caller) has this amount of unlocked new StormX tokens, and reverts if not.

5. The function increases lockedBalance of the original caller by ``amount``.

6. The function emits the event ``TokenLocked(userAddress, amount)`` to indicate the success of staking.

7. The function returns true.

#### UC1.2 User unlocks some amount of new StormX tokens via GSN

1. The user calls the function ``unlock(amount)`` with signed signature to GSN.

2. The contract accepts the relayed call from GSN and executes ``unlock(amount)`` if the user has enough unlocked new StormX token balance or ``amount + StormXToken.unlockedBalanceOf(user) >= chargeFee``.

3. The StormXToken contract charges the user by ``chargeFee`` if the user has enough unlocked token balance right now, and the charged tokens are transferred to StormX’s reserve ``stormXReserve``. Otherwise, the charging will be in step 8 if the transaction succeeds.

4. The function checks whether the ``_msgSender()``(i.e the original caller) has this amount locked StormX tokens, and reverts if not.

5. The function decreases lockedBalance of the original caller by ``amount``.

6. The function emits the event ``TokenUnlocked(userAddress, amount)`` to indicate the success of unstaking.

7. The function returns true.

8. The user is charged by the specified amount ``chargeFee`` of new StormX tokens if the user was not charged previously, and the charged tokens are transferred to StormX’s reserve ``stormXReserve``.

#### UC1.3 User converts original tokens to new StormX token via GSN call

1. The user calls the function ``convert(amount)`` with signed signature to GSN.

2. The Swap contract accepts the relayed call from GSN and executes ``convert(amount)`` if the user has enough unlocked new StormX token balance or ``amount + StormXToken.unlockedBalanceOf(user) >= chargeFee``.

3. The contract charges the user by ``chargeFee`` if the user has enough unlocked token balance right now, and the charged tokens are transferred to StormX’s reserve ``stormXReserve``. Otherwise, the charging will be in step 8 if the transaction succeeds.

4. The function checks whether the ``_msgSender()``(i.e the original caller) has this amount of original StormX tokens, and reverts if not.

5. The function calls the function ``destroys(userAddress, amount)`` of original StormX tokens from the user and mints amount of new StormX tokens for the user.

6. The event ``TokenConverted(userAddress, amount)`` is emitted to indicate the success of conversion.

7. The function returns true.

8. The user is charged by the specified amount ``chargeFee`` of new StormX tokens if the user was not charged previously, and the charged tokens are transferred to StormX’s reserve ``stormXReserve``.

#### UC1.4 StormX admin closes token migration and collects all the rest of original tokens via GSN

1. StormX admin calls the function ``disableMigration(address reserve)`` with signed signature to GSN.

2. The Swap contract accepts the relayed call from GSN and executes ``disableMigration(address reserve)`` if StormX admin has enough unlocked new StormX token balance, i.e. no less than specified ``chargeFee``, and rejects otherwise.

3. StormX admin is charged by the specified amount ``chargeFee`` of new StormX tokens, and the charged tokens are transferred to StormX’s reserve ``stormXReserve``.

4. This function checks the timestamp and reverts if it has not been 24 weeks from the token migration initialization. 

5. The function also reverts if token migration is not open yet or it is already closed.

6. This function then sets ``migrationOpen`` to false, emits the event ``MigrationClosed()`` .

7. This function mints the remaining tokens and transfers them to the address ``reserve``. 

8. The event ``MigrationLeftoverTransferred(stormX, amount)`` is emitted.

9. This function returns true.

#### UC1.5 The user calls transfers() via GSN

1. The user calls the function ``transfers(address[] _recipients, uint256[] _values)`` with signed signature to GSN.

2. The new token smart contract accepts the relayed call from GSN and executes ``transfers(address[] _recipients, uint256[] _values)`` if the user has enough unlocked balance, i.e. no less than specified ``chargeFee``, and rejects otherwise.

3. The user is charged by the specified amount ``chargeFee`` of new StormX tokens, and the charged tokens are transferred to StormX’s reserve ``stormXReserve``.

4. The function checks whether ``transfers()`` is allowed, and reverts if not.

5. The function checks whether the lengths of ``_recipients`` and ``_values`` match, and reverts if not.

6. If all checks pass, transfer  ``_values`` to ``_recipients`` respectively by invoking the function ``transfer()`` multiple times.

#### UC1.6 The user calls transferFrom() via GSN

1. The user calls the function ``transferFrom(address sender, address recipient, uint256 amount)`` with signed signature to GSN.

2. The contract accepts the relayed call from GSN and executes ``transferFrom()`` if the user has enough unlocked new StormX token balance, i.e ``StormXToken.unlockedBalanceOf(user) >= chargeFee``.

3. Otherwise, it checks the following to make sure the user can have enough unlocked StormX tokens after `transferFrom()` is executed successfully.
   1. ``amount + StormXToken.unlockedBalanceOf(user) >= chargeFee``
   2. ``recipient == user``
   3. ``StormXToken.unlockedBalanceOf(sender) >= amount``
   4. ``StormXToken.allowance(sender, user) >= amount``

4. The StormXToken contract charges the user by ``chargeFee`` if the user has enough unlocked token balance right now, and the charged tokens are transferred to StormX’s reserve ``stormXReserve``. Otherwise, the charging will be in step 5 if the transaction succeeds.

4. The standard ERC20 `transferFrom()` function is invoked in `StormXToken.sol`.

5. The user is charged by the specified amount ``chargeFee`` of new StormX tokens if the user was not charged previously, and the charged tokens are transferred to StormX’s reserve ``stormXReserve``.

#### UC1.7 The user sends a meta transaction to GSN and this token contract accepts the relayed call from GSN

1. User sends a function with signed data to GSN relayHub.

2. ``acceptRelayedCall()`` in the new token contract is called by some relayer in GSN relayHub

```
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
        returns (uint256, bytes memory);
```

3. The new token contract then checks whether ``unlockedBalanceOf[from] >= chargeFee`` .

4. Accepts the relayed call originated by the user from if the above returns true, transfers the user’s balance with amount chargeFee to ``stormXReserve``.

5. If the user is calling ``Swap.convert(uint256 amount)`` and ``amount + StormXToken.unlockedBalanceOf(user) >= chargeFee``, accepts the call and charge the user after ``convert()`` is executed successfully.

6. If the user is calling ``StormXToken.unlock(uint256 amount)`` and ``amount + StormXToken.unlockedBalanceOf(user) >= chargeFee``, accepts the call and charge the user after ``unlock()`` is executed successfully.

7. If the user is calling ``StormXToken.transferFrom(address sender, address recipient, uint256 amount)``, the function checks the following and charge the user after ``transferFrom()`` is executed successfully.
   1. ``amount + StormXToken.unlockedBalanceOf(user) >= chargeFee``
   2. ``recipient == user``
   3. ``StormXToken.unlockedBalanceOf(sender) >= amount``
   4. ``StormXToken.allowance(sender, user) >= amount``

8. Rejects the call with ``errorcode`` otherwise.


#### UC1.7 Send transactions via GSN

1. The user signs the data ``{relayerAddress, userAddress, GSNRecipientAddress, encodedFunction, transactionFee, gasPrice, gasLimit ,nonce, relayHubAddress}``

    1. ``relayerAddress`` Address of the relayer that the user wants to send request to. The relayer must have already been registered in GSN for the request to succeed

    2. ``userAddress`` Address of the user who signs the data and wants to send the meta transaction via GSN

    3. ``GSNRecipientAddress`` The target contract, i.e. the address of the new token contract

    4. ``encodedFunction`` The function call to relay

    5. ``transactionFee`` The fee(%) the relay takes over the actual gas cost

    6. ``gasPrice`` The gas price that the user is willing to pay

    7. ``gasLimit`` The limit the user wants to put on the transaction

    8. ``nonce`` The target relayer’s nonce for avoiding replay attack

    9. ``relayHubAddress`` Address of the relayHub

2. The user sends the data and the signature to a registered relayer

3. The registered relayer sends the transaction for the user.

#### UC1.8 Reward a user
1. An address `account` invokes the function `reward(address recipient, uint256 amount) public onlyAuthorized` to reward a user.

2. The function checks whether `account` matches contract owner address or `rewardRole` address. If neither matches, the function reverts.

3. Checks whether `recipient` is address zero. If `recipient==address(0)`, the function reverts.

4. The function transfers `amount` tokens to the address `recipient`.

5. If auto-staking feature is disabled for the address `recipient`, the function returns.

5. Else, stake all rewarded tokens for `recipient`.

### References

1. Interacting with RelayHub: https://docs.openzeppelin.com/gsn-provider/0.1/interacting-with-relayhub

2. Source code of RelayHub: https://etherscan.io/address/0xD216153c06E857cD7f72665E0aF1d7D82172F494#code

3. ERC20: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md 

4. GSN: https://docs.openzeppelin.com/contracts/2.x/api/gsn

5. To write a GSN-callable contract: https://docs.openzeppelin.com/contracts/2.x/gsn

6. Source code of the original StormX token: https://etherscan.io/address/0xd0a4b8946cb52f0661273bfbc6fd0e0c75fc6433#code

