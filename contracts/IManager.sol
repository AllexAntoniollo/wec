// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

interface IManager {
    function incrementBalance(uint256 amount, address tokenContract) external;
}
