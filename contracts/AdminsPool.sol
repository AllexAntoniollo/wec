// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "./PaymentPool.sol";

contract AdminsPool is PaymentPool {
    constructor() Ownable(msg.sender) {}
}
